import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ColumnMapping, ImportPreviewRow, ImportSummary, Ticket } from '../types';
import { generateSecureToken, generateUUID, hashTokenSync, isInvalidEmail } from './crypto';

export interface ParsedWorkbook {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
  isGoogleFormExpanded?: boolean;
  originalRowCount?: number;
}

/**
 * Checks if a sheet has the structure of a Google Form Responses spreadsheet
 */
export function isGoogleFormSheet(headers: string[]): boolean {
  const headerStr = headers.join(' ').toLowerCase();
  const hasTimestamp = headerStr.includes('timestamp');
  const hasPassType = headerStr.includes('pass type') || headerStr.includes('participation');
  const hasTicketId = headers.some((h) => /^ticket[\s_-]?id$/i.test(h.trim()));
  return hasTimestamp && (hasPassType || headerStr.includes('full name')) && !hasTicketId;
}

/**
 * Expands Google Form rows: separates individual single passes and expands multi-member group passes.
 */
export function expandGoogleFormRows(
  rows: Record<string, any>[],
  _headers?: string[],
  existingTickets: Ticket[] = []
): Record<string, any>[] {
  let maxIdNum = 0;
  existingTickets.forEach((t) => {
    const m = t.ticket_id.match(/(\d+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxIdNum) maxIdNum = num;
    }
  });

  const expandedRows: Record<string, any>[] = [];

  rows.forEach((row) => {
    const entries = Object.entries(row);
    let passTypeVal = '';
    let submitterEmail = '';
    let txnId = '';

    for (const [k, v] of entries) {
      if (!v) continue;
      const strVal = String(v).trim();
      const key = k.toLowerCase().trim();

      if (key.includes('pass type') || key.includes('select pass type')) {
        passTypeVal = strVal;
      }
      if (key === 'email address' || (key.includes('email') && !submitterEmail)) {
        submitterEmail = strVal;
      }
      if (key.includes('transaction id') || key.includes('txn')) {
        txnId = strVal;
      }
    }

    if (/group/i.test(passTypeVal)) {
      // Group Pass: Extract Team Lead and Members 2, 3, 4
      let tlName = '';
      let tlEmail = '';
      let tlNotes = '';

      let m2Name = '';
      let m2Notes = '';

      let m3Name = '';
      let m3Notes = '';

      let m4Name = '';
      let m4Notes = '';

      for (const [k, v] of entries) {
        if (!v || !String(v).trim()) continue;
        const val = String(v).trim();
        const key = k.toLowerCase().trim();

        if (key.includes('team lead') && (key.includes('name') || key.includes('full name'))) {
          tlName = val;
        } else if (key.includes('team lead') && key.includes('email')) {
          tlEmail = val;
        } else if (key.includes('team lead') && (key.includes('branch') || key.includes('college') || key.includes('roll') || key.includes('profession'))) {
          tlNotes += ` ${val}`;
        }

        if (key.includes('member 2') && (key.includes('name') || key.includes('full name') || key.includes('details'))) {
          if (!key.includes('contact') && !key.includes('roll') && !key.includes('college')) {
            m2Name = val;
          }
        } else if (key.includes('member 2') && (key.includes('roll') || key.includes('college'))) {
          m2Notes += ` ${val}`;
        }

        if (key.includes('member 3') && (key.includes('name') || key.includes('full name') || key.includes('details'))) {
          if (!key.includes('contact') && !key.includes('roll') && !key.includes('college')) {
            m3Name = val;
          }
        } else if (key.includes('member 3') && (key.includes('roll') || key.includes('college'))) {
          m3Notes += ` ${val}`;
        }

        if (key.includes('member 4') && (key.includes('name') || key.includes('full name') || key.includes('details'))) {
          if (!key.includes('contact') && !key.includes('roll') && !key.includes('college')) {
            m4Name = val;
          }
        } else if (key.includes('member 4') && (key.includes('roll') || key.includes('college'))) {
          m4Notes += ` ${val}`;
        }
      }

      if (tlName) {
        maxIdNum++;
        expandedRows.push({
          'Ticket ID': `TEDX-2026-${String(maxIdNum).padStart(3, '0')}`,
          'Attendee Name': tlName,
          'Email Address': tlEmail || submitterEmail,
          'Pass Type': 'Group Pass (Team Lead)',
          'Notes / Group Affiliation': `Group Lead${txnId ? ` | Txn: ${txnId}` : ''}${tlNotes ? ` | ${tlNotes.trim()}` : ''}`,
          'Transaction ID': txnId,
        });
      }
      if (m2Name) {
        maxIdNum++;
        expandedRows.push({
          'Ticket ID': `TEDX-2026-${String(maxIdNum).padStart(3, '0')}`,
          'Attendee Name': m2Name,
          'Email Address': submitterEmail,
          'Pass Type': 'Group Pass (Member 2)',
          'Notes / Group Affiliation': `Group Member 2 | Lead: ${tlName}${m2Notes ? ` | ${m2Notes.trim()}` : ''}`,
          'Transaction ID': txnId,
        });
      }
      if (m3Name) {
        maxIdNum++;
        expandedRows.push({
          'Ticket ID': `TEDX-2026-${String(maxIdNum).padStart(3, '0')}`,
          'Attendee Name': m3Name,
          'Email Address': submitterEmail,
          'Pass Type': 'Group Pass (Member 3)',
          'Notes / Group Affiliation': `Group Member 3 | Lead: ${tlName}${m3Notes ? ` | ${m3Notes.trim()}` : ''}`,
          'Transaction ID': txnId,
        });
      }
      if (m4Name) {
        maxIdNum++;
        expandedRows.push({
          'Ticket ID': `TEDX-2026-${String(maxIdNum).padStart(3, '0')}`,
          'Attendee Name': m4Name,
          'Email Address': submitterEmail,
          'Pass Type': 'Group Pass (Member 4)',
          'Notes / Group Affiliation': `Group Member 4 | Lead: ${tlName}${m4Notes ? ` | ${m4Notes.trim()}` : ''}`,
          'Transaction ID': txnId,
        });
      }
    } else {
      // Single Pass
      let name = '';
      let email = '';
      let extraNotes = '';

      for (const [k, v] of entries) {
        if (!v || !String(v).trim()) continue;
        const val = String(v).trim();
        const key = k.toLowerCase().trim();

        if ((key.includes('name') || key.includes('full name')) && !key.includes('college') && !key.includes('lead') && !key.includes('member')) {
          if (!name) name = val;
        }
        if (key.includes('email') && key !== 'email address' && !key.includes('lead')) {
          if (!email) email = val;
        }
        if (key.includes('roll') || key.includes('branch') || key.includes('college name') || key.includes('profession') || key.includes('year of study')) {
          extraNotes += ` ${val}`;
        }
      }

      maxIdNum++;
      expandedRows.push({
        'Ticket ID': `TEDX-2026-${String(maxIdNum).padStart(3, '0')}`,
        'Attendee Name': name || 'Attendee',
        'Email Address': email || submitterEmail,
        'Pass Type': 'General Admission',
        'Notes / Group Affiliation': `${txnId ? `Txn: ${txnId} | ` : ''}${extraNotes.trim()}`,
        'Transaction ID': txnId,
      });
    }
  });

  return expandedRows;
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
    let headers = parsed.meta.fields || [];
    let rawRows = parsed.data;

    let isGoogleFormExpanded = false;
    const originalRowCount = rawRows.length;

    if (isGoogleFormSheet(headers)) {
      rawRows = expandGoogleFormRows(rawRows, headers);
      headers = [
        'Ticket ID',
        'Attendee Name',
        'Email Address',
        'Pass Type',
        'Notes / Group Affiliation',
        'Transaction ID',
      ];
      isGoogleFormExpanded = true;
    }

    return {
      sheetNames: ['CSV Upload'],
      activeSheet: 'CSV Upload',
      headers,
      rawRows,
      isGoogleFormExpanded,
      originalRowCount,
    };
  }

  // Parse XLSX / XLS using SheetJS
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  // Auto-detect "Ticket Ledger" or similar sheet name
  let targetSheet = sheetNames.find((s) => /ticket\s*ledger/i.test(s));
  if (!targetSheet) {
    targetSheet = sheetNames.find((s) => /ledger/i.test(s)) || sheetNames[0];
  }

  const worksheet = workbook.Sheets[targetSheet];
  let rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  // Extract all distinct headers
  const headersSet = new Set<string>();
  rawRows.forEach((row) => {
    Object.keys(row).forEach((k) => headersSet.add(k));
  });
  let headers = Array.from(headersSet);

  let isGoogleFormExpanded = false;
  const originalRowCount = rawRows.length;

  if (isGoogleFormSheet(headers)) {
    rawRows = expandGoogleFormRows(rawRows, headers);
    headers = [
      'Ticket ID',
      'Attendee Name',
      'Email Address',
      'Pass Type',
      'Notes / Group Affiliation',
      'Transaction ID',
    ];
    isGoogleFormExpanded = true;
  }

  return {
    sheetNames,
    activeSheet: targetSheet,
    headers,
    rawRows,
    isGoogleFormExpanded,
    originalRowCount,
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

  const matchedTicketId = findMatch([
    /^ticket[\s_-]?id$/i,
    /^ticket[\s_-]?number$/i,
    /^ticket$/i,
    /^id$/i,
    /ticket/i,
  ]);

  return {
    ticket_id: matchedTicketId || '__AUTO_GENERATE__',
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

  let nextAutoId = 1;
  existingTickets.forEach((t) => {
    const m = t.ticket_id.match(/(\d+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num >= nextAutoId) nextAutoId = num + 1;
    }
  });

  return rows.map((row, index) => {
    let rawTicketId = mapping.ticket_id && mapping.ticket_id !== '__AUTO_GENERATE__'
      ? String(row[mapping.ticket_id] || '').trim()
      : '';

    // Auto-generate sequential ticket ID if missing or requested
    if (!rawTicketId) {
      rawTicketId = `TEDX-2026-${String(nextAutoId++).padStart(3, '0')}`;
    }

    let rawName = mapping.attendee_name ? String(row[mapping.attendee_name] || '').trim() : '';
    // Fallback name search across columns if mapped column was empty in this specific row
    if (!rawName) {
      for (const [k, v] of Object.entries(row)) {
        const lk = k.toLowerCase();
        if ((lk.includes('name') || lk.includes('attendee')) && !lk.includes('college') && v && String(v).trim()) {
          rawName = String(v).trim();
          break;
        }
      }
    }

    let rawEmail = mapping.email ? String(row[mapping.email] || '').trim() : '';
    if (!rawEmail) {
      for (const [k, v] of Object.entries(row)) {
        const lk = k.toLowerCase();
        if (lk.includes('email') && v && String(v).trim()) {
          rawEmail = String(v).trim();
          break;
        }
      }
    }

    const rawPassType = mapping.pass_type ? String(row[mapping.pass_type] || '').trim() : 'General Admission';
    const rawNotes = mapping.notes ? String(row[mapping.notes] || '').trim() : '';

    const validationErrors: string[] = [];

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
