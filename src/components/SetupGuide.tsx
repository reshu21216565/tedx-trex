import React, { useState } from 'react';
import {
  Database,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface SetupGuideProps {
  isSupabaseLive?: boolean;
  ticketCount?: number;
  onSeedOfficialLedger?: () => void;
  onRefresh?: () => void;
}

export const SetupGuide: React.FC<SetupGuideProps> = ({
  isSupabaseLive = false,
  ticketCount = 0,
  onSeedOfficialLedger,
  onRefresh,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const envSnippet = `VITE_SUPABASE_URL=https://ogvyerjhlrogxyiccyuk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_EVENT_NAME=TEDx GeethanjaliCET
VITE_EVENT_VENUE=Block 4 Auditorium`;


  const sqlSnippet = `-- =========================================================================
-- TEDx Ticketing & Check-In Database Migration
-- Run this in your Supabase SQL Editor
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT NOT NULL UNIQUE,
    attendee_name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    is_email_invalid BOOLEAN NOT NULL DEFAULT FALSE,
    pass_type TEXT NOT NULL DEFAULT 'General Admission',
    status TEXT NOT NULL DEFAULT 'APPROVED_FOR_ISSUANCE',
    payment_status TEXT NOT NULL DEFAULT 'UNVERIFIED_OPERATIONAL_APPROVAL',
    security_token TEXT NOT NULL UNIQUE,
    token_hash TEXT NOT NULL UNIQUE,
    is_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT,
    downloaded_at TIMESTAMPTZ,
    email_delivery_status TEXT NOT NULL DEFAULT 'NOT_PREPARED',
    email_sent_at TIMESTAMPTZ,
    notes TEXT,
    group_primary_contact TEXT,
    source_submission_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON public.tickets (ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_token_hash ON public.tickets (token_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_security_token ON public.tickets (security_token);

CREATE TABLE IF NOT EXISTS public.check_in_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT NOT NULL,
    scanned_token_hash TEXT NOT NULL,
    operator_name TEXT NOT NULL DEFAULT 'Gate Staff',
    operator_email TEXT NOT NULL,
    scan_method TEXT NOT NULL DEFAULT 'camera',
    result TEXT NOT NULL,
    attendee_name TEXT,
    pass_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atomic Check-in function with FOR UPDATE row lock to eliminate race conditions
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
    v_token_hash := encode(digest(v_clean_token, 'sha256'), 'hex');

    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE security_token = v_clean_token
       OR token_hash = v_clean_token
       OR UPPER(ticket_id) = UPPER(v_clean_token)
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.check_in_events (ticket_id, scanned_token_hash, operator_email, scan_method, result, notes)
        VALUES (v_clean_token, v_token_hash, p_operator_email, p_scan_method, 'INVALID_TOKEN', 'Ticket ID not found');
        RETURN jsonb_build_object('status', 'INVALID', 'message', 'No ticket found with this QR token or ID');
    END IF;

    IF v_ticket.status <> 'APPROVED_FOR_ISSUANCE' THEN
        RETURN jsonb_build_object('status', 'NOT_APPROVED', 'message', 'Ticket status: ' || v_ticket.status, 'ticket', row_to_json(v_ticket));
    END IF;

    IF v_ticket.is_checked_in THEN
        INSERT INTO public.check_in_events (ticket_id, scanned_token_hash, operator_email, scan_method, result, attendee_name, pass_type, notes)
        VALUES (v_ticket.ticket_id, v_token_hash, p_operator_email, p_scan_method, 'ALREADY_CHECKED_IN', v_ticket.attendee_name, v_ticket.pass_type, 'Attempted duplicate entry');
        RETURN jsonb_build_object('status', 'ALREADY_CHECKED_IN', 'message', 'Ticket was already checked in', 'ticket', row_to_json(v_ticket), 'checked_in_at', v_ticket.checked_in_at, 'checked_in_by', v_ticket.checked_in_by);
    END IF;

    UPDATE public.tickets
    SET is_checked_in = TRUE, checked_in_at = v_now, checked_in_by = p_operator_email, updated_at = v_now
    WHERE id = v_ticket.id;

    INSERT INTO public.check_in_events (ticket_id, scanned_token_hash, operator_email, scan_method, result, attendee_name, pass_type, notes)
    VALUES (v_ticket.ticket_id, v_token_hash, p_operator_email, p_scan_method, 'VALID_CHECK_IN', v_ticket.attendee_name, v_ticket.pass_type, 'Admitted successfully');

    SELECT * INTO v_ticket FROM public.tickets WHERE id = v_ticket.id;
    RETURN jsonb_build_object('status', 'VALID', 'message', 'ENTRY APPROVED', 'ticket', row_to_json(v_ticket));
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers and gate terminals can read tickets" ON public.tickets;
CREATE POLICY "Organizers and gate terminals can read tickets" ON public.tickets FOR SELECT TO authenticated, anon USING (TRUE);

DROP POLICY IF EXISTS "Organizers and gate terminals can manage tickets" ON public.tickets;
CREATE POLICY "Organizers and gate terminals can manage tickets" ON public.tickets FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Organizers can read audit logs" ON public.check_in_events;
CREATE POLICY "Organizers can read audit logs" ON public.check_in_events FOR SELECT TO authenticated, anon USING (TRUE);

DROP POLICY IF EXISTS "Allow check in event logging" ON public.check_in_events;
CREATE POLICY "Allow check in event logging" ON public.check_in_events FOR INSERT TO authenticated, anon WITH CHECK (TRUE);`;



  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Live Status Card */}
      {isSupabaseLive ? (
        <div className="bg-gradient-to-r from-emerald-950/50 via-[#14151c] to-[#14151c] rounded-2xl border border-emerald-500/40 p-6 shadow-xl shadow-emerald-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Supabase Live Database Connected
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">
                Live PostgreSQL Backend Active
              </h2>
              <p className="text-xs text-zinc-300">
                Connected to endpoint: <code className="text-emerald-300 font-mono">https://ogvyerjhlrogxyiccyuk.supabase.co</code>
              </p>
              <div className="pt-2 text-xs text-zinc-400">
                Current Database State:{' '}
                <strong className="text-white">
                  {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'} stored
                </strong>
                {ticketCount === 0 && (
                  <span className="text-amber-300 ml-1">
                    (Schema initialized, ready for initial ticket data)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              {onSeedOfficialLedger && (
                <button
                  onClick={async () => {
                    setSeeding(true);
                    try {
                      await onSeedOfficialLedger();
                    } finally {
                      setSeeding(false);
                    }
                  }}
                  disabled={seeding}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-900/40 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>
                    {seeding
                      ? 'Syncing 49 Tickets...'
                      : ticketCount === 0
                      ? 'Load 49 Official Tickets to Supabase'
                      : 'Re-Sync 49 Official Tickets'}
                  </span>
                </button>
              )}

              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Connection Data</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#14151c] rounded-2xl border border-amber-500/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Local Sandbox Mode Active</h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            The app is currently running safely in Local Sandbox Mode. Follow the steps below to connect your live Supabase project.
          </p>
        </div>
      )}

      {/* Step 1: Create Supabase Project */}
      <div className="bg-[#14151c] rounded-2xl border border-[#2b2d3d] p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#eb0028] text-white flex items-center justify-center text-xs font-bold">
            1
          </span>
          <h3 className="text-sm font-bold text-white">Create Supabase Project</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Sign up at{' '}
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            supabase.com
          </a>{' '}
          and create a new project. Select the region closest to your event location for lowest latency.
        </p>
      </div>

      {/* Step 2: Run SQL Migration */}
      <div className="bg-[#14151c] rounded-2xl border border-[#2b2d3d] p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#eb0028] text-white flex items-center justify-center text-xs font-bold">
              2
            </span>
            <h3 className="text-sm font-bold text-white">Run PostgreSQL Schema Migration</h3>
          </div>
          <button
            onClick={handleCopySql}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
          >
            {copiedSql ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied SQL</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL Migration</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-zinc-400">
          In your Supabase dashboard, navigate to <strong>SQL Editor</strong> &rarr; <strong>New Query</strong>,
          paste the migration script below, and click <strong>Run</strong>.
        </p>
        <pre className="p-3 bg-[#090a0d] border border-zinc-800 rounded-xl text-[11px] font-mono text-zinc-300 max-h-56 overflow-y-auto">
          {sqlSnippet}
        </pre>
      </div>

      {/* Step 3: Environment Variables */}
      <div className="bg-[#14151c] rounded-2xl border border-[#2b2d3d] p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#eb0028] text-white flex items-center justify-center text-xs font-bold">
              3
            </span>
            <h3 className="text-sm font-bold text-white">Configure Environment Variables (.env)</h3>
          </div>
          <button
            onClick={handleCopyEnv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
          >
            {copiedEnv ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy .env snippet</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-zinc-400">
          In your project root, create a file named <code>.env.local</code> and populate it with your
          Supabase Project URL and Anon Public Key (found under <strong>Project Settings &rarr; API</strong>).
        </p>
        <pre className="p-3 bg-[#090a0d] border border-zinc-800 rounded-xl text-xs font-mono text-emerald-400">
          {envSnippet}
        </pre>
      </div>
    </div>
  );
};
