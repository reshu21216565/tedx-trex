export type TicketStatus = 'APPROVED_FOR_ISSUANCE' | 'REVOKED' | 'PENDING';

export type PaymentStatus = 'UNVERIFIED_OPERATIONAL_APPROVAL' | 'VERIFIED_OFFLINE' | 'WAIVED' | 'PENDING';

export type EmailDeliveryStatus = 'NOT_PREPARED' | 'PREPARED' | 'MANUALLY_SENT';

export interface Ticket {
  id: string; // Database UUID
  ticket_id: string; // Preserved existing ticket ID (e.g. TEDX-2026-001)
  attendee_name: string;
  email: string;
  is_email_invalid: boolean;
  pass_type: string; // VIP, General, Speaker, Student, Group Member, etc.
  status: TicketStatus;
  payment_status: PaymentStatus;
  security_token: string; // Unhashed raw token (stored securely, shown only for QR / organizer)
  token_hash: string; // SHA-256 hash of security token
  is_checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  downloaded_at: string | null;
  email_delivery_status: EmailDeliveryStatus;
  email_sent_at: string | null;
  notes: string | null;
  group_primary_contact?: string | null;
  source_submission_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckInEvent {
  id: string;
  ticket_id: string;
  scanned_token_hash: string;
  operator_name: string;
  operator_email: string;
  scan_method: 'camera' | 'manual_lookup';
  result: 'VALID_CHECK_IN' | 'ALREADY_CHECKED_IN' | 'INVALID_TOKEN' | 'REVOKED' | 'UNAPPROVED';
  attendee_name?: string;
  pass_type?: string;
  notes?: string | null;
  created_at: string;
}

export type ScanVerificationResult =
  | {
      status: 'VALID';
      message: 'ENTRY APPROVED';
      ticket: Ticket;
    }
  | {
      status: 'ALREADY_CHECKED_IN';
      message: 'ALREADY CHECKED IN';
      ticket: Ticket;
      checkedInAt: string;
      checkedInBy: string;
    }
  | {
      status: 'INVALID';
      message: 'INVALID TICKET';
      reason: string;
    }
  | {
      status: 'NOT_APPROVED';
      message: 'NOT APPROVED FOR ISSUANCE';
      ticket?: Ticket;
      reason: string;
    }
  | {
      status: 'ERROR';
      message: 'CHECK-IN ERROR — RETRY OR USE MANUAL LOOKUP';
      error: string;
    };

export interface ColumnMapping {
  ticket_id: string;
  attendee_name: string;
  email: string;
  pass_type: string;
  notes: string;
}

export interface ImportPreviewRow {
  rowIndex: number;
  ticket_id: string;
  attendee_name: string;
  email: string;
  is_email_invalid: boolean;
  pass_type: string;
  notes: string;
  is_duplicate: boolean;
  duplicate_reason?: string;
  is_valid: boolean;
  validation_errors: string[];
}

export interface ImportSummary {
  totalRows: number;
  approvedCount: number;
  duplicateCount: number;
  emailIssuesCount: number;
  skippedCount: number;
  importedTickets: Ticket[];
}

export interface EventConfig {
  eventName: string;
  eventTheme: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  admissionNotice: string;
  organizerEmail: string;
}
