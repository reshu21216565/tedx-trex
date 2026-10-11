import { describe, it, expect, beforeEach } from 'vitest';
import { generateSecureToken, hashTokenSync, isInvalidEmail } from '../lib/crypto';
import {
  prepareImportPreview,
  executeIdempotentImport,
  suggestColumnMappings,
} from '../lib/spreadsheet';
import { performAtomicCheckIn, sandboxStore } from '../lib/supabase';
import { SAMPLE_TEDX_LEDGER_DATA } from '../lib/sampleData';
import type { Ticket, ColumnMapping } from '../types';

describe('1. Cryptographic Token Generation & Security', () => {
  it('generates unique tokens with zero collisions across 1,000 generations', () => {
    const tokens = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      const token = generateSecureToken();
      expect(token).toMatch(/^tedx_tok_[0-9a-f]{32}$/);
      tokens.add(token);
    }

    expect(tokens.size).toBe(count);
  });

  it('produces consistent deterministic token hashes', () => {
    const token = 'tedx_tok_4f8b2c1a9e3d7a6b5c4d3e2f1a0b9c8d';
    const hash1 = hashTokenSync(token);
    const hash2 = hashTokenSync(token);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBeGreaterThan(0);
  });

  it('ensures QR payload contains only the random token and zero attendee PII', () => {
    const token = generateSecureToken();
    const sensitiveName = 'Dr. Marcus Vance';
    const sensitiveEmail = 'marcus.vance@neurotech.org';

    // Verify token does not leak PII
    expect(token).not.toContain(sensitiveName);
    expect(token).not.toContain(sensitiveEmail);
    expect(token).not.toContain('@');
  });
});

describe('2. Email Validation & Preservation Rules', () => {
  it('correctly accepts valid email addresses', () => {
    expect(isInvalidEmail('marcus.vance@neurotech.org')).toBe(false);
    expect(isInvalidEmail('attendee@gmail.com')).toBe(false);
    expect(isInvalidEmail('student@university.edu.in')).toBe(false);
  });

  it('flags malformed or missing emails without destroying the raw data', () => {
    // Missing TLD
    expect(isInvalidEmail('arthur.pendelton@gmail')).toBe(true);
    // Missing @ symbol
    expect(isInvalidEmail('kavitakrishnanyahoo.com')).toBe(true);
    // Blank string
    expect(isInvalidEmail('')).toBe(true);
    expect(isInvalidEmail(null)).toBe(true);
    expect(isInvalidEmail(undefined)).toBe(true);
  });
});

describe('3. Spreadsheet Column Auto-Mapping & Sheet Processing', () => {
  it('accurately detects standard TEDx workbook column headers', () => {
    const headers = [
      'Ticket ID',
      'Attendee Name',
      'Email Address',
      'Pass Type',
      'Notes / Group Affiliation',
    ];
    const mapping = suggestColumnMappings(headers);

    expect(mapping.ticket_id).toBe('Ticket ID');
    expect(mapping.attendee_name).toBe('Attendee Name');
    expect(mapping.email).toBe('Email Address');
    expect(mapping.pass_type).toBe('Pass Type');
    expect(mapping.notes).toBe('Notes / Group Affiliation');
  });
});

describe('4. Ledger Import & Idempotency Engine', () => {
  const mapping: ColumnMapping = {
    ticket_id: 'Ticket ID',
    attendee_name: 'Attendee Name',
    email: 'Email Address',
    pass_type: 'Pass Type',
    notes: 'Notes / Group Affiliation',
  };

  it('imports all 49 ticket entries and sets APPROVED_FOR_ISSUANCE', () => {
    const previews = prepareImportPreview(SAMPLE_TEDX_LEDGER_DATA, mapping, []);
    expect(previews.length).toBe(49);

    const summary = executeIdempotentImport(previews, []);
    expect(summary.totalRows).toBe(49);
    expect(summary.approvedCount).toBe(49);
    expect(summary.importedTickets.length).toBe(49);

    // Verify all tickets are marked as APPROVED_FOR_ISSUANCE
    summary.importedTickets.forEach((ticket) => {
      expect(ticket.status).toBe('APPROVED_FOR_ISSUANCE');
      expect(ticket.payment_status).toBe('UNVERIFIED_OPERATIONAL_APPROVAL');
      expect(ticket.security_token).toMatch(/^tedx_tok_/);
      expect(ticket.ticket_id).toMatch(/^TEDX-2026-\d{3}$/);
    });

    // Check that malformed emails were flagged
    const flagged = summary.importedTickets.filter((t) => t.is_email_invalid);
    expect(flagged.length).toBeGreaterThan(0);
    // Verify text is preserved
    const arthur = summary.importedTickets.find((t) => t.attendee_name === 'Arthur Pendelton');
    expect(arthur?.email).toBe('arthur.pendelton@gmail');
    expect(arthur?.is_email_invalid).toBe(true);
  });

  it('is strictly idempotent on re-import and never regenerates existing security tokens', () => {
    // First Import
    const previews1 = prepareImportPreview(SAMPLE_TEDX_LEDGER_DATA, mapping, []);
    const summary1 = executeIdempotentImport(previews1, []);
    const initialTickets = summary1.importedTickets;

    const tokenMap = new Map<string, string>();
    initialTickets.forEach((t) => tokenMap.set(t.ticket_id, t.security_token));

    // Second Import with identical data
    const previews2 = prepareImportPreview(SAMPLE_TEDX_LEDGER_DATA, mapping, initialTickets);
    const summary2 = executeIdempotentImport(previews2, initialTickets);

    // Must not create duplicate rows: still exactly 49
    expect(summary2.importedTickets.length).toBe(49);
    expect(summary2.duplicateCount).toBe(49);

    // CRITICAL: Tokens must NOT be rotated during routine re-import
    summary2.importedTickets.forEach((t) => {
      const originalToken = tokenMap.get(t.ticket_id);
      expect(t.security_token).toBe(originalToken);
    });
  });

  it('detects duplicate Ticket IDs within the same file', () => {
    const duplicateData = [
      {
        'Ticket ID': 'TEDX-001',
        'Attendee Name': 'Alice Smith',
        'Email Address': 'alice@test.com',
        'Pass Type': 'General Admission',
        'Notes / Group Affiliation': '',
      },
      {
        'Ticket ID': 'TEDX-001', // Duplicate Ticket ID
        'Attendee Name': 'Bob Jones',
        'Email Address': 'bob@test.com',
        'Pass Type': 'General Admission',
        'Notes / Group Affiliation': '',
      },
    ];

    const previews = prepareImportPreview(duplicateData, mapping, []);
    expect(previews[0].is_duplicate).toBe(false);
    expect(previews[1].is_duplicate).toBe(true);
    expect(previews[1].duplicate_reason).toContain('Duplicate Ticket ID');
  });
});

describe('5. Concurrency-Safe Atomic Check-In Operation', () => {
  let sampleTicket: Ticket;

  beforeEach(() => {
    sandboxStore.clear();

    const rawToken = 'tedx_tok_abc123testpasstoken999';
    sampleTicket = {
      id: 'uuid-101',
      ticket_id: 'TEDX-2026-001',
      attendee_name: 'Dr. Marcus Vance',
      email: 'marcus.vance@neurotech.org',
      is_email_invalid: false,
      pass_type: 'VIP Guest',
      status: 'APPROVED_FOR_ISSUANCE',
      payment_status: 'UNVERIFIED_OPERATIONAL_APPROVAL',
      security_token: rawToken,
      token_hash: hashTokenSync(rawToken),
      is_checked_in: false,
      checked_in_at: null,
      checked_in_by: null,
      downloaded_at: null,
      email_delivery_status: 'NOT_PREPARED',
      email_sent_at: null,
      notes: 'Keynote Speaker Guest',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    sandboxStore.setTickets([sampleTicket]);
  });

  it('accepts an approved, unadmitted ticket and records admission', async () => {
    const result = await performAtomicCheckIn(
      sampleTicket.security_token,
      'gate-1@tedx.org',
      'camera'
    );

    expect(result.status).toBe('VALID');
    expect(result.message).toBe('ENTRY APPROVED');
    if (result.status === 'VALID') {
      expect(result.ticket.is_checked_in).toBe(true);
      expect(result.ticket.checked_in_at).not.toBeNull();
      expect(result.ticket.checked_in_by).toBe('gate-1@tedx.org');
    }

    // Verify stored state in database/store
    const updated = sandboxStore.getTickets().find((t) => t.id === sampleTicket.id);
    expect(updated?.is_checked_in).toBe(true);
  });

  it('supports manual ticket ID fallback lookup', async () => {
    const result = await performAtomicCheckIn(
      'TEDX-2026-001',
      'desk-operator@tedx.org',
      'manual_lookup'
    );

    expect(result.status).toBe('VALID');
    expect(result.message).toBe('ENTRY APPROVED');
    if (result.status === 'VALID') {
      expect(result.ticket.ticket_id).toBe('TEDX-2026-001');
    }
  });

  it('strictly rejects duplicate check-in attempts and returns previous timestamp', async () => {
    // First scan: successful admission
    const res1 = await performAtomicCheckIn(sampleTicket.security_token, 'gate-1@tedx.org');
    expect(res1.status).toBe('VALID');

    // Second scan with same token: MUST be rejected
    const res2 = await performAtomicCheckIn(sampleTicket.security_token, 'gate-2@tedx.org');
    expect(res2.status).toBe('ALREADY_CHECKED_IN');
    expect(res2.message).toBe('ALREADY CHECKED IN');
    if (res2.status === 'ALREADY_CHECKED_IN') {
      expect(res2.checkedInBy).toBe('gate-1@tedx.org');
    }
  });

  it('rejects forged or unrecognized ticket tokens', async () => {
    const fakeToken = 'tedx_tok_completely_fake_token_99999';
    const result = await performAtomicCheckIn(fakeToken, 'gate-1@tedx.org');

    expect(result.status).toBe('INVALID');
    expect(result.message).toBe('INVALID TICKET');
  });

  it('rejects tickets with status other than APPROVED_FOR_ISSUANCE', async () => {
    sandboxStore.updateTicket(sampleTicket.id, { status: 'REVOKED' });

    const result = await performAtomicCheckIn(sampleTicket.security_token, 'gate-1@tedx.org');
    expect(result.status).toBe('NOT_APPROVED');
    expect(result.message).toBe('NOT APPROVED FOR ISSUANCE');
  });

  it('prevents concurrent double-check-in race conditions', async () => {
    // Simulate two gate scanners simultaneously submitting check-in for the same ticket
    const [result1, result2] = await Promise.all([
      performAtomicCheckIn(sampleTicket.security_token, 'scanner-alpha@tedx.org'),
      performAtomicCheckIn(sampleTicket.security_token, 'scanner-beta@tedx.org'),
    ]);

    // Exactly one scan must succeed (VALID), and the other must be rejected (ALREADY_CHECKED_IN)
    const statuses = [result1.status, result2.status];
    expect(statuses).toContain('VALID');
    expect(statuses).toContain('ALREADY_CHECKED_IN');
  });
});
