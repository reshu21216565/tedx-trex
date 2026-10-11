import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CheckInEvent, ScanVerificationResult, Ticket } from '../types';
import { hashTokenSync } from './crypto';


const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let forceSandbox =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
  import.meta.env.MODE === 'test';

export const setForceSandbox = (val: boolean) => {
  forceSandbox = val;
};

export const isSupabaseConfigured = (): boolean => {
  if (forceSandbox) return false;
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-supabase') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 20 &&
    !supabaseAnonKey.includes('your-anon-key')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;


// ==========================================
// In-Memory Sandbox Storage (Fail-safe when Supabase is not yet connected)
// ==========================================
class SandboxStore {
  private tickets: Ticket[] = [];
  private checkInEvents: CheckInEvent[] = [];

  getTickets(): Ticket[] {
    return [...this.tickets];
  }

  setTickets(newTickets: Ticket[]) {
    this.tickets = [...newTickets];
  }

  getEvents(): CheckInEvent[] {
    return [...this.checkInEvents];
  }

  updateTicket(id: string, updates: Partial<Ticket>): Ticket | null {
    const idx = this.tickets.findIndex((t) => t.id === id || t.ticket_id === id);
    if (idx === -1) return null;
    const updated = {
      ...this.tickets[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.tickets[idx] = updated;
    return updated;
  }

  addEvent(event: CheckInEvent) {
    this.checkInEvents.unshift(event);
  }

  clear() {
    this.tickets = [];
    this.checkInEvents = [];
  }
}

export const sandboxStore = new SandboxStore();

// ==========================================
// Ticket Service Methods (Real DB or Sandbox)
// ==========================================

export async function fetchAllTickets(): Promise<{ data: Ticket[]; error: string | null }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        return { data: [], error: error.message };
      }
      return { data: data || [], error: null };
    } catch (err: any) {
      return { data: [], error: err.message || 'Failed to query Supabase' };
    }
  }

  // Sandbox fallback
  return { data: sandboxStore.getTickets(), error: null };
}

export async function saveTicketsBatch(tickets: Ticket[]): Promise<{ count: number; error: string | null }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      // Upsert tickets on preserved ticket_id
      const { data, error } = await supabase
        .from('tickets')
        .upsert(tickets, { onConflict: 'ticket_id' })
        .select('id');

      if (error) {
        return { count: 0, error: error.message };
      }
      return { count: data ? data.length : tickets.length, error: null };
    } catch (err: any) {
      return { count: 0, error: err.message || 'Failed to upsert to Supabase' };
    }
  }

  // Sandbox store
  sandboxStore.setTickets(tickets);
  return { count: tickets.length, error: null };
}

export async function updateTicketField(
  ticketId: string,
  updates: Partial<Ticket>
): Promise<{ success: boolean; error: string | null }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('ticket_id', ticketId);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  const res = sandboxStore.updateTicket(ticketId, updates);
  return { success: !!res, error: res ? null : 'Ticket not found' };
}

export async function fetchCheckInEvents(): Promise<{ data: CheckInEvent[]; error: string | null }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('check_in_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) return { data: [], error: error.message };
      return { data: data || [], error: null };
    } catch (err: any) {
      return { data: [], error: err.message };
    }
  }

  return { data: sandboxStore.getEvents(), error: null };
}

/**
 * Concurrency-Safe Atomic Check-In Operation
 *
 * Verifies token or ticket ID, checks status, locks record, prevents duplicate check-in,
 * marks record as checked in, and records audit trail.
 */
export async function performAtomicCheckIn(
  tokenOrId: string,
  operatorEmail = 'organizer@tedx.local',
  scanMethod: 'camera' | 'manual_lookup' = 'camera'
): Promise<ScanVerificationResult> {
  const cleanInput = tokenOrId.trim();
  if (!cleanInput) {
    return {
      status: 'INVALID',
      message: 'INVALID TICKET',
      reason: 'Empty QR code or ticket ID scanned',
    };
  }

  // --- Real Supabase Production Mode ---
  if (isSupabaseConfigured() && supabase) {
    try {
      // Call Postgres RPC with atomic transaction & row locking
      const { data, error } = await supabase.rpc('check_in_ticket_atomic', {
        p_token: cleanInput,
        p_operator_email: operatorEmail,
        p_scan_method: scanMethod,
      });

      if (error) {
        return {
          status: 'ERROR',
          message: 'CHECK-IN ERROR — RETRY OR USE MANUAL LOOKUP',
          error: error.message,
        };
      }

      if (!data) {
        return {
          status: 'INVALID',
          message: 'INVALID TICKET',
          reason: 'No response from verification server',
        };
      }

      // Map response from atomic RPC
      if (data.status === 'VALID') {
        return {
          status: 'VALID',
          message: 'ENTRY APPROVED',
          ticket: data.ticket,
        };
      } else if (data.status === 'ALREADY_CHECKED_IN') {
        return {
          status: 'ALREADY_CHECKED_IN',
          message: 'ALREADY CHECKED IN',
          ticket: data.ticket,
          checkedInAt: data.checked_in_at || new Date().toISOString(),
          checkedInBy: data.checked_in_by || 'Gate Staff',
        };
      } else if (data.status === 'NOT_APPROVED') {
        return {
          status: 'NOT_APPROVED',
          message: 'NOT APPROVED FOR ISSUANCE',
          ticket: data.ticket,
          reason: data.message || 'Ticket is revoked or pending',
        };
      } else {
        return {
          status: 'INVALID',
          message: 'INVALID TICKET',
          reason: data.message || 'Ticket not found or unrecognized token',
        };
      }
    } catch (err: any) {
      return {
        status: 'ERROR',
        message: 'CHECK-IN ERROR — RETRY OR USE MANUAL LOOKUP',
        error: err.message || 'Network exception during verification',
      };
    }
  }

  // --- Sandbox Simulation Mode (Guaranteed Atomic Logic) ---
  const tickets = sandboxStore.getTickets();
  const inputHash = hashTokenSync(cleanInput);

  // Match by raw security_token, token_hash, or preserved ticket_id (for manual lookup)
  const ticket = tickets.find(
    (t) =>
      t.security_token === cleanInput ||
      t.token_hash === inputHash ||
      t.ticket_id.toUpperCase() === cleanInput.toUpperCase()
  );

  if (!ticket) {
    const event: CheckInEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`,
      ticket_id: cleanInput,
      scanned_token_hash: inputHash,
      operator_name: 'Gate Scanner',
      operator_email: operatorEmail,
      scan_method: scanMethod,
      result: 'INVALID_TOKEN',
      notes: 'Token not found in ticket ledger',
      created_at: new Date().toISOString(),
    };
    sandboxStore.addEvent(event);

    return {
      status: 'INVALID',
      message: 'INVALID TICKET',
      reason: `No record matching token or ticket ID "${cleanInput}"`,
    };
  }

  // Check issuance approval
  if (ticket.status !== 'APPROVED_FOR_ISSUANCE') {
    const event: CheckInEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`,
      ticket_id: ticket.ticket_id,
      scanned_token_hash: inputHash,
      operator_name: 'Gate Scanner',
      operator_email: operatorEmail,
      scan_method: scanMethod,
      result: 'UNAPPROVED',
      attendee_name: ticket.attendee_name,
      pass_type: ticket.pass_type,
      notes: `Status is ${ticket.status}`,
      created_at: new Date().toISOString(),
    };
    sandboxStore.addEvent(event);

    return {
      status: 'NOT_APPROVED',
      message: 'NOT APPROVED FOR ISSUANCE',
      ticket,
      reason: `Ticket status is ${ticket.status}. Entry not permitted.`,
    };
  }

  // Check if already checked in
  if (ticket.is_checked_in) {
    const event: CheckInEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`,
      ticket_id: ticket.ticket_id,
      scanned_token_hash: inputHash,
      operator_name: 'Gate Scanner',
      operator_email: operatorEmail,
      scan_method: scanMethod,
      result: 'ALREADY_CHECKED_IN',
      attendee_name: ticket.attendee_name,
      pass_type: ticket.pass_type,
      notes: `Duplicate scan. First scanned at ${ticket.checked_in_at}`,
      created_at: new Date().toISOString(),
    };
    sandboxStore.addEvent(event);

    return {
      status: 'ALREADY_CHECKED_IN',
      message: 'ALREADY CHECKED IN',
      ticket,
      checkedInAt: ticket.checked_in_at || 'Earlier today',
      checkedInBy: ticket.checked_in_by || 'Gate Staff',
    };
  }

  // ATOMIC ADMISSION
  const now = new Date().toISOString();
  const updatedTicket: Ticket = {
    ...ticket,
    is_checked_in: true,
    checked_in_at: now,
    checked_in_by: operatorEmail,
    updated_at: now,
  };

  sandboxStore.updateTicket(ticket.id, updatedTicket);

  const event: CheckInEvent = {
    id: crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`,
    ticket_id: ticket.ticket_id,
    scanned_token_hash: inputHash,
    operator_name: 'Gate Scanner',
    operator_email: operatorEmail,
    scan_method: scanMethod,
    result: 'VALID_CHECK_IN',
    attendee_name: ticket.attendee_name,
    pass_type: ticket.pass_type,
    notes: 'Admitted successfully',
    created_at: now,
  };
  sandboxStore.addEvent(event);

  return {
    status: 'VALID',
    message: 'ENTRY APPROVED',
    ticket: updatedTicket,
  };
}
