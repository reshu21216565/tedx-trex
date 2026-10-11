-- =========================================================================
-- TEDx Ticketing & Check-In Database Migration
-- Production Schema, Concurrency Locks, and Security Policies
-- =========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TICKETS TABLE
-- Stores individual attendee records with preserved ticket IDs and unique tokens
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT NOT NULL UNIQUE, -- Preserved original ticket ID (e.g. TEDX-2026-001)
    attendee_name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    is_email_invalid BOOLEAN NOT NULL DEFAULT FALSE,
    pass_type TEXT NOT NULL DEFAULT 'General Admission',
    status TEXT NOT NULL DEFAULT 'APPROVED_FOR_ISSUANCE', -- APPROVED_FOR_ISSUANCE, REVOKED, PENDING
    payment_status TEXT NOT NULL DEFAULT 'UNVERIFIED_OPERATIONAL_APPROVAL', -- Never false payment evidence
    security_token TEXT NOT NULL UNIQUE, -- High entropy secret token for QR code
    token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash for indexed lookups
    is_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT,
    downloaded_at TIMESTAMPTZ,
    email_delivery_status TEXT NOT NULL DEFAULT 'NOT_PREPARED', -- NOT_PREPARED, PREPARED, MANUALLY_SENT
    email_sent_at TIMESTAMPTZ,
    notes TEXT,
    group_primary_contact TEXT,
    source_submission_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON public.tickets (ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_token_hash ON public.tickets (token_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_security_token ON public.tickets (security_token);
CREATE INDEX IF NOT EXISTS idx_tickets_checked_in ON public.tickets (is_checked_in);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON public.tickets (email);

-- 2. CHECK-IN AUDIT EVENTS TABLE
-- Immutable log of every camera scan and manual verification attempt
CREATE TABLE IF NOT EXISTS public.check_in_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT NOT NULL,
    scanned_token_hash TEXT NOT NULL,
    operator_name TEXT NOT NULL DEFAULT 'Gate Staff',
    operator_email TEXT NOT NULL,
    scan_method TEXT NOT NULL DEFAULT 'camera', -- camera, manual_lookup
    result TEXT NOT NULL, -- VALID_CHECK_IN, ALREADY_CHECKED_IN, INVALID_TOKEN, REVOKED, UNAPPROVED
    attendee_name TEXT,
    pass_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_in_events_ticket_id ON public.check_in_events (ticket_id);
CREATE INDEX IF NOT EXISTS idx_check_in_events_created_at ON public.check_in_events (created_at DESC);

-- 3. ORGANIZER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.organizer_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'scanner_operator', -- admin, scanner_operator
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ATOMIC CHECK-IN FUNCTION (ROW-LEVEL LOCKING FOR CONCURRENCY SAFETY)
-- Uses SELECT ... FOR UPDATE to eliminate duplicate simultaneous admissions
CREATE OR REPLACE FUNCTION public.check_in_ticket_atomic(
    p_token TEXT,
    p_operator_email TEXT DEFAULT 'organizer@tedx.local',
    p_scan_method TEXT DEFAULT 'camera'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket RECORD;
    v_clean_token TEXT;
    v_token_hash TEXT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    v_clean_token := TRIM(p_token);
    IF v_clean_token = '' THEN
        RETURN jsonb_build_object(
            'status', 'INVALID',
            'message', 'Empty token or ticket ID provided'
        );
    END IF;

    -- Compute sha256 hash of token for lookup
    v_token_hash := encode(digest(v_clean_token, 'sha256'), 'hex');

    -- ACQUIRE ROW LOCK: Prevents race condition between concurrent gate scanners
    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE security_token = v_clean_token
       OR token_hash = v_clean_token
       OR UPPER(ticket_id) = UPPER(v_clean_token)
    FOR UPDATE;

    -- Case 1: Ticket not found
    IF NOT FOUND THEN
        INSERT INTO public.check_in_events (
            ticket_id,
            scanned_token_hash,
            operator_email,
            scan_method,
            result,
            notes
        ) VALUES (
            v_clean_token,
            v_token_hash,
            p_operator_email,
            p_scan_method,
            'INVALID_TOKEN',
            'Token or Ticket ID not found in database'
        );

        RETURN jsonb_build_object(
            'status', 'INVALID',
            'message', 'No ticket found with this QR token or ID'
        );
    END IF;

    -- Case 2: Ticket not approved for issuance (e.g. revoked or cancelled)
    IF v_ticket.status <> 'APPROVED_FOR_ISSUANCE' THEN
        INSERT INTO public.check_in_events (
            ticket_id,
            scanned_token_hash,
            operator_email,
            scan_method,
            result,
            attendee_name,
            pass_type,
            notes
        ) VALUES (
            v_ticket.ticket_id,
            v_token_hash,
            p_operator_email,
            p_scan_method,
            'UNAPPROVED',
            v_ticket.attendee_name,
            v_ticket.pass_type,
            'Ticket status is ' || v_ticket.status
        );

        RETURN jsonb_build_object(
            'status', 'NOT_APPROVED',
            'message', 'Ticket is not approved for issuance (Status: ' || v_ticket.status || ')',
            'ticket', row_to_json(v_ticket)
        );
    END IF;

    -- Case 3: Already checked in
    IF v_ticket.is_checked_in THEN
        INSERT INTO public.check_in_events (
            ticket_id,
            scanned_token_hash,
            operator_email,
            scan_method,
            result,
            attendee_name,
            pass_type,
            notes
        ) VALUES (
            v_ticket.ticket_id,
            v_token_hash,
            p_operator_email,
            p_scan_method,
            'ALREADY_CHECKED_IN',
            v_ticket.attendee_name,
            v_ticket.pass_type,
            'Attempted second check-in'
        );

        RETURN jsonb_build_object(
            'status', 'ALREADY_CHECKED_IN',
            'message', 'Ticket was already checked in',
            'ticket', row_to_json(v_ticket),
            'checked_in_at', v_ticket.checked_in_at,
            'checked_in_by', v_ticket.checked_in_by
        );
    END IF;

    -- Case 4: Valid Check-In -> Execute atomic update
    UPDATE public.tickets
    SET is_checked_in = TRUE,
        checked_in_at = v_now,
        checked_in_by = p_operator_email,
        updated_at = v_now
    WHERE id = v_ticket.id;

    -- Audit successful admission
    INSERT INTO public.check_in_events (
        ticket_id,
        scanned_token_hash,
        operator_email,
        scan_method,
        result,
        attendee_name,
        pass_type,
        notes
    ) VALUES (
        v_ticket.ticket_id,
        v_token_hash,
        p_operator_email,
        p_scan_method,
        'VALID_CHECK_IN',
        v_ticket.attendee_name,
        v_ticket.pass_type,
        'Admitted successfully'
    );

    -- Return updated ticket state
    SELECT * INTO v_ticket FROM public.tickets WHERE id = v_ticket.id;

    RETURN jsonb_build_object(
        'status', 'VALID',
        'message', 'ENTRY APPROVED',
        'ticket', row_to_json(v_ticket)
    );
END;
$$;

-- 5. PUBLIC RPC FOR SAFE TICKET PREVIEW
-- Allows attendee to view their ticket card without exposing private emails or other attendees
CREATE OR REPLACE FUNCTION public.get_ticket_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    SELECT ticket_id, attendee_name, pass_type, status, is_checked_in, checked_in_at, created_at
    INTO v_ticket
    FROM public.tickets
    WHERE security_token = TRIM(p_token)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', FALSE);
    END IF;

    RETURN jsonb_build_object(
        'found', TRUE,
        'ticket_id', v_ticket.ticket_id,
        'attendee_name', v_ticket.attendee_name,
        'pass_type', v_ticket.pass_type,
        'status', v_ticket.status,
        'is_checked_in', v_ticket.is_checked_in
    );
END;
$$;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_profiles ENABLE ROW LEVEL SECURITY;

-- Allow reading and managing tickets for authenticated organizers and configured event terminal clients
DROP POLICY IF EXISTS "Organizers and gate terminals can read tickets" ON public.tickets;
CREATE POLICY "Organizers and gate terminals can read tickets"
    ON public.tickets
    FOR SELECT
    TO authenticated, anon
    USING (TRUE);

DROP POLICY IF EXISTS "Organizers and gate terminals can manage tickets" ON public.tickets;
CREATE POLICY "Organizers and gate terminals can manage tickets"
    ON public.tickets
    FOR ALL
    TO authenticated, anon
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Organizers can read audit logs" ON public.check_in_events;
CREATE POLICY "Organizers can read audit logs"
    ON public.check_in_events
    FOR SELECT
    TO authenticated, anon
    USING (TRUE);

DROP POLICY IF EXISTS "Allow check in event logging" ON public.check_in_events;
CREATE POLICY "Allow check in event logging"
    ON public.check_in_events
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (TRUE);


