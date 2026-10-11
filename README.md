# TEDx QR Ticketing, Pass Generation & Turnstile Check-In System

A production-ready event management, ticket issuance, and gate admission web application built specifically for a TEDx event.

Designed with clean editorial typography, robust dark aesthetics, restrained TED Red accents (`#EB0028`), cryptographic QR tokens, zero-PII transmission, concurrency-safe atomic admissions, and an idempotent spreadsheet ingestion pipeline.

---

## 1. System Architecture & Operational Rules

### Context & Rules Adherence
- **43 Form Submissions &rarr; 49 Ledger Entries**: Group passes (teams, lab delegations, duos) are expanded into individual attendee records.
- **Preserved Existing Ticket IDs**: Original ticket IDs (e.g. `TEDX-2026-001` through `TEDX-2026-049`) are strictly preserved and never overwritten.
- **Approved for Issuance**: As per organizer instructions, all 49 ledger records are tagged `APPROVED_FOR_ISSUANCE`. Payment status is held in a distinct `payment_status` field (`UNVERIFIED_OPERATIONAL_APPROVAL`) without fabricating payment proof.
- **Zero-PII in QR Codes**: QR codes generated locally with `qrcode.react` contain solely a high-entropy random token (`tedx_tok_...`), not personal names, emails, or internal database IDs.
- **Idempotent Spreadsheet Re-import**: Re-uploading workbooks does not create duplicate tickets, does not rotate existing tokens, and never overwrites an already checked-in attendee.
- **Manual Email Workflow**: No automated email blasting. Organizers prepare, copy, and track manual dispatches individually (`NOT_PREPARED` &rarr; `PREPARED` &rarr; `MANUALLY_SENT`).
- **Fail-Safe Operation**: If Supabase credentials are not supplied, the app runs in a local in-memory Sandbox Mode with full fidelity and zero fake data.

---

## 2. Technology Stack

- **Frontend**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 + Lucide Icons + Canvas Confetti
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Concurrency Safety**: Stored procedure `check_in_ticket_atomic` with `SELECT ... FOR UPDATE` row locks
- **QR Engine**: `qrcode.react` (SVG generator) + `html5-qrcode` (camera-based scanner)
- **Spreadsheet Parser**: `xlsx` (SheetJS) + `papaparse` (CSV fallback)
- **Exporting**: `html-to-image` (high-res PNG canvas), `jspdf` (PDF pass export), `jszip` (bulk ZIP archive)
- **Audio Synthesis**: Web Audio API (zero-latency pleasant chime and error buzzer)
- **Testing**: Vitest test runner (15 automated unit & integration tests)

---

## 3. Quick Start & Local Development

### Prerequisites
- Node.js v20+ or v24+
- npm v10+

### Installation & Run
```bash
# Navigate to the project directory
cd tedx-ticketing

# Install dependencies
npm install

# Run the development server
npm run dev

# Open in your browser:
# http://localhost:5173
```

### Running Automated Tests
```bash
# Execute Vitest test suite
npx vitest run
```
*All 15 tests verify token entropy, import idempotency, duplicate prevention, invalid email preservation, and concurrent check-in locking.*

---

## 4. Production Supabase Configuration

### Step 1: Create Supabase Project
1. Log in to [supabase.com](https://supabase.com) and create a project.
2. Choose the data center closest to your event venue for minimal gate scanning latency.

### Step 2: Run Database Migration
Open **SQL Editor** &rarr; **New Query** in your Supabase dashboard and run:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tickets Table
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

-- Fast Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON public.tickets (ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_token_hash ON public.tickets (token_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_security_token ON public.tickets (security_token);
CREATE INDEX IF NOT EXISTS idx_tickets_checked_in ON public.tickets (is_checked_in);

-- Audit Events Table
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

-- Atomic Concurrency-Safe Check-In Procedure
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
        RETURN jsonb_build_object('status', 'INVALID', 'message', 'Empty token provided');
    END IF;

    v_token_hash := encode(digest(v_clean_token, 'sha256'), 'hex');

    -- ACQUIRE ROW LOCK: Prevents race condition between simultaneous scans
    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE security_token = v_clean_token
       OR token_hash = v_clean_token
       OR UPPER(ticket_id) = UPPER(v_clean_token)
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.check_in_events (ticket_id, scanned_token_hash, operator_email, scan_method, result, notes)
        VALUES (v_clean_token, v_token_hash, p_operator_email, p_scan_method, 'INVALID_TOKEN', 'Ticket not found');
        RETURN jsonb_build_object('status', 'INVALID', 'message', 'No ticket found with this QR token or ID');
    END IF;

    IF v_ticket.status <> 'APPROVED_FOR_ISSUANCE' THEN
        RETURN jsonb_build_object('status', 'NOT_APPROVED', 'message', 'Ticket status: ' || v_ticket.status, 'ticket', row_to_json(v_ticket));
    END IF;

    IF v_ticket.is_checked_in THEN
        INSERT INTO public.check_in_events (ticket_id, scanned_token_hash, operator_email, scan_method, result, attendee_name, pass_type, notes)
        VALUES (v_ticket.ticket_id, v_token_hash, p_operator_email, p_scan_method, 'ALREADY_CHECKED_IN', v_ticket.attendee_name, v_ticket.pass_type, 'Duplicate check-in attempted');
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

CREATE POLICY "Organizers manage tickets" ON public.tickets FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Organizers view events" ON public.check_in_events FOR SELECT TO authenticated USING (TRUE);
```

### Step 3: Configure Environment Variables
Create `.env.local` in the project root:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
VITE_EVENT_NAME=TEDx GeethanjaliCET
VITE_EVENT_VENUE=Block 4 Auditorium
```

---

## 5. Deployment Guide

### Vercel / Netlify
1. Connect your GitHub repository to Vercel or Netlify.
2. Build Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

---

## 6. Event Day Turnstile Runbook

1. **Staff Login**: Gate volunteers open `https://your-domain.vercel.app/` on their smartphones.
2. **Scanner Mode**: Tap the red **Scan QR** navigation tab. Grant camera permissions.
3. **Turnstile Operations**:
   - Hold attendee phone in front of camera.
   - 🟢 **GREEN (ENTRY APPROVED)**: Hand attendee their lanyard and welcome bag.
   - 🔴 **RED (ALREADY CHECKED IN)**: Direct attendee to the help desk; pass was already used.
   - 🔴 **RED (INVALID)**: Use the fallback manual input to type their preserved Ticket ID (e.g. `TEDX-2026-015`).
4. **Offline Resilience**: Even with momentary gate internet fluctuations, manual lookup remains available.
