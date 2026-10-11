import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ColumnMapping, ImportPreviewRow, ImportSummary, Ticket } from '../types';
import { generateSecureToken, generateUUID, hashTokenSync, isInvalidEmail } from './crypto';

export interface ParsedWorkbook {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
}

/**
 * Parses an XLSX, XLS or CSV file from an ArrayBuffer or File object.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedWorkbook> {
  const isCsv = file.name.endsWith('.csv');
  const buffer = await file.arrayBuffer();

  if (isCsv) {
    const text = new TextDecoder('utf-8').decode(buffer);
    const parsed = Papa.parse<Record<string, any>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const headers = parsed.meta.fields || [];
    return {
      sheetNames: ['CSV Upload'],
      activeSheet: 'CSV Upload',
      headers,
      rawRows: parsed.data,
    };
  }

  // Parse XLSX / XLS using SheetJS
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  // Auto-detect "Ticket Ledger" or similar sheet name
  let targetSheet = sheetNames.find((s) => /ticket\s*ledger/i.test(s));
  if (!targetSheet) {
    // If not found, look for "ledger" or default to the first sheet
    targetSheet = sheetNames.find((s) => /ledger/i.test(s)) || sheetNames[0];
  }

  const worksheet = workbook.Sheets[targetSheet];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  // Extract all distinct headers
  const headersSet = new Set<string>();
  rawRows.forEach((row) => {
    Object.keys(row).forEach((k) => headersSet.add(k));
  });
  const headers = Array.from(headersSet);

  return {
    sheetNames,
    activeSheet: targetSheet,
    headers,
    rawRows,
  };
}

/**
 * Automatically suggests column mappings based on common header names
 */
export function suggestColumnMappings(headers: string[]): ColumnMapping {
  const findMatch = (patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const match = headers.find((h) => pattern.test(h.trim()));
      if (match) return match;
    }
    return '';
  };

  return {
    ticket_id: findMatch([
      /^ticket[\s_-]?id$/i,
      /^ticket[\s_-]?number$/i,
      /^ticket$/i,
      /^id$/i,
      /ticket/i,
    ]),
    attendee_name: findMatch([
      /^attendee[\s_-]?name$/i,
      /^full[\s_-]?name$/i,
      /^name$/i,
      /^participant$/i,
      /name/i,
    ]),
    email: findMatch([
      /^email[\s_-]?address$/i,
      /^email$/i,
      /^email[\s_-]?destination$/i,
      /email/i,
    ]),
    pass_type: findMatch([
      /^pass[\s_-]?type$/i,
      /^ticket[\s_-]?type$/i,
      /^category$/i,
      /^tier$/i,
      /pass/i,
    ]),
    notes: findMatch([
      /^notes.*$/i,
      /^group.*$/i,
      /^affiliation.*$/i,
      /^comment.*$/i,
      /note/i,
    ]),
  };
}

/**
 * Validates and prepares preview rows from raw spreadsheet data
 */
export function prepareImportPreview(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  existingTickets: Ticket[] = []
): ImportPreviewRow[] {
  const existingTicketIdMap = new Set(existingTickets.map((t) => t.ticket_id.toUpperCase().trim()));
  const seenInFileTicketIds = new Set<string>();

  return rows.map((row, index) => {
    const rawTicketId = mapping.ticket_id ? String(row[mapping.ticket_id] || '').trim() : '';
    const rawName = mapping.attendee_name ? String(row[mapping.attendee_name] || '').trim() : '';
    const rawEmail = mapping.email ? String(row[mapping.email] || '').trim() : '';
    const rawPassType = mapping.pass_type ? String(row[mapping.pass_type] || '').trim() : 'General Admission';
    const rawNotes = mapping.notes ? String(row[mapping.notes] || '').trim() : '';

    const validationErrors: string[] = [];

    // Preserved ticket ID validation
    if (!rawTicketId) {
      validationErrors.push('Missing Ticket ID');
    }

    if (!rawName) {
      validationErrors.push('Missing Attendee Name');
    }

    // Duplicate detection
    let isDuplicate = false;
    let duplicateReason = '';

    const upperId = rawTicketId.toUpperCase();
    if (upperId) {
      if (seenInFileTicketIds.has(upperId)) {
        isDuplicate = true;
        duplicateReason = `Duplicate Ticket ID "${rawTicketId}" within this spreadsheet`;
        validationErrors.push(duplicateReason);
      } else if (existingTicketIdMap.has(upperId)) {
        isDuplicate = true;
        duplicateReason = `Ticket ID "${rawTicketId}" already exists in database (will update idempotently without overwriting check-in status or rotating security token)`;
      }
      seenInFileTicketIds.add(upperId);
    }

    // Flag email if invalid or missing, but PRESERVE the raw string as per instruction!
    const emailInvalid = isInvalidEmail(rawEmail);

    return {
      rowIndex: index + 1,
      ticket_id: rawTicketId,
      attendee_name: rawName,
      email: rawEmail,
      is_email_invalid: emailInvalid,
      pass_type: rawPassType || 'General Admission',
      notes: rawNotes,
      is_duplicate: isDuplicate,
      duplicate_reason: duplicateReason,
      is_valid: validationErrors.filter((e) => !e.includes('already exists in database')).length === 0,
      validation_errors: validationErrors,
    };
  });
}

/**
 * Idempotently executes import of previewed rows into tickets.
 * - Preserves existing ticket IDs.
 * - Re-importing does NOT duplicate tickets.
 * - Does NOT overwrite already checked-in tickets.
 * - Does NOT rotate security tokens of existing tickets during routine re-import.
 * - Sets status to APPROVED_FOR_ISSUANCE.
 * - Payment status set to UNVERIFIED_OPERATIONAL_APPROVAL.
 */
export function executeIdempotentImport(
  previewRows: ImportPreviewRow[],
  existingTickets: Ticket[] = []
): ImportSummary {
  const existingMap = new Map<string, Ticket>();
  existingTickets.forEach((t) => existingMap.set(t.ticket_id.toUpperCase().trim(), t));

  const validRows = previewRows.filter((r) => r.is_valid && r.ticket_id);
  const updatedTickets: Ticket[] = [...existingTickets];
  const importedList: Ticket[] = [];

  let duplicateCount = 0;
  let emailIssuesCount = 0;
  let skippedCount = 0;

  for (const row of validRows) {
    const key = row.ticket_id.toUpperCase().trim();
    const existing = existingMap.get(key);

    if (row.is_email_invalid) {
      emailIssuesCount++;
    }

    if (existing) {
      duplicateCount++;
      // If already checked in, NEVER overwrite check-in state or token!
      // Only safely update metadata if changed
      const updated: Ticket = {
        ...existing,
        attendee_name: row.attendee_name || existing.attendee_name,
        email: row.email !== '' ? row.email : existing.email,
        is_email_invalid: row.is_email_invalid,
        pass_type: row.pass_type || existing.pass_type,
        notes: row.notes || existing.notes,
        updated_at: new Date().toISOString(),
      };
      const idx = updatedTickets.findIndex((t) => t.id === existing.id);
      if (idx !== -1) {
        updatedTickets[idx] = updated;
      }
      importedList.push(updated);
    } else {
      // New Ticket creation
      const rawToken = generateSecureToken();
      const tokenHash = hashTokenSync(rawToken);

      const newTicket: Ticket = {
        id: generateUUID(),
        ticket_id: row.ticket_id, // PRESERVE EXACT TICKET ID
        attendee_name: row.attendee_name,
        email: row.email,
        is_email_invalid: row.is_email_invalid,
        pass_type: row.pass_type || 'General Admission',
        status: 'APPROVED_FOR_ISSUANCE', // Required operational instruction
        payment_status: 'UNVERIFIED_OPERATIONAL_APPROVAL', // Separate payment field
        security_token: rawToken,
        token_hash: tokenHash,
        is_checked_in: false,
        checked_in_at: null,
        checked_in_by: null,
        downloaded_at: null,
        email_delivery_status: 'NOT_PREPARED',
        email_sent_at: null,
        notes: row.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      updatedTickets.push(newTicket);
      existingMap.set(key, newTicket);
      importedList.push(newTicket);
    }
  }

  skippedCount = previewRows.length - validRows.length;

  return {
    totalRows: previewRows.length,
    approvedCount: importedList.length,
    duplicateCount,
    emailIssuesCount,
    skippedCount,
    importedTickets: updatedTickets,
  };
}
