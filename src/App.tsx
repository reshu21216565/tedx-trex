import { useEffect, useState } from 'react';

import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TicketRegistry } from './components/TicketRegistry';
import { Scanner } from './components/Scanner';
import { TicketModal } from './components/TicketModal';
import { ImportModal } from './components/ImportModal';
import { EmailModal } from './components/EmailModal';
import { SetupGuide } from './components/SetupGuide';
import type { EmailDeliveryStatus, ImportSummary, Ticket, CheckInEvent } from './types';
import {
  fetchAllTickets,
  fetchCheckInEvents,
  isSupabaseConfigured,
  saveTicketsBatch,
  updateTicketField,
} from './lib/supabase';
import { SAMPLE_TEDX_LEDGER_DATA } from './lib/sampleData';
import { prepareImportPreview, executeIdempotentImport } from './lib/spreadsheet';
import { FileSpreadsheet } from 'lucide-react';


export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets' | 'scanner' | 'import' | 'setup'>('dashboard');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<CheckInEvent[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [emailModalTicket, setEmailModalTicket] = useState<Ticket | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const isSupabaseLive = isSupabaseConfigured();

  // Load Tickets and Events on mount
  const refreshData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, eventsRes] = await Promise.all([
        fetchAllTickets(),
        fetchCheckInEvents(),
      ]);

      if (ticketsRes.data) {
        setTickets(ticketsRes.data);
      }
      if (eventsRes.data) {
        setEvents(eventsRes.data);
      }
    } catch (err) {
      console.error('Error fetching ticket data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Handler for completing spreadsheet import
  const handleImportComplete = async (summary: ImportSummary) => {
    setTickets(summary.importedTickets);
    await saveTicketsBatch(summary.importedTickets);
    await refreshData();
  };

  // Quick action: Seed 49-record official ledger if empty
  const handleSeedOfficial49Ledger = async () => {
    const mapping = {
      ticket_id: 'Ticket ID',
      attendee_name: 'Attendee Name',
      email: 'Email Address',
      pass_type: 'Pass Type',
      notes: 'Notes / Group Affiliation',
    };
    const previews = prepareImportPreview(SAMPLE_TEDX_LEDGER_DATA, mapping, tickets);
    const summary = executeIdempotentImport(previews, tickets);
    setTickets(summary.importedTickets);
    await saveTicketsBatch(summary.importedTickets);
    await refreshData();
  };

  // Update email delivery status
  const handleUpdateDeliveryStatus = async (ticketId: string, status: EmailDeliveryStatus) => {
    const now = new Date().toISOString();
    const updates: Partial<Ticket> = {
      email_delivery_status: status,
      email_sent_at: status === 'MANUALLY_SENT' ? now : null,
    };

    await updateTicketField(ticketId, updates);
    setTickets((prev) =>
      prev.map((t) => (t.ticket_id === ticketId ? { ...t, ...updates } : t))
    );

    if (emailModalTicket && emailModalTicket.ticket_id === ticketId) {
      setEmailModalTicket((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  // Mark ticket downloaded timestamp
  const handleMarkDownloaded = async (ticketId: string) => {
    const now = new Date().toISOString();
    await updateTicketField(ticketId, { downloaded_at: now });
    setTickets((prev) =>
      prev.map((t) => (t.ticket_id === ticketId ? { ...t, downloaded_at: now } : t))
    );
  };

  // Manual Check-In toggle from registry
  const handleToggleCheckIn = async (ticket: Ticket) => {
    const nextState = !ticket.is_checked_in;
    const now = new Date().toISOString();
    const updates: Partial<Ticket> = {
      is_checked_in: nextState,
      checked_in_at: nextState ? now : null,
      checked_in_by: nextState ? 'Organizer Override' : null,
    };

    await updateTicketField(ticket.ticket_id, updates);
    setTickets((prev) =>
      prev.map((t) => (t.ticket_id === ticket.ticket_id ? { ...t, ...updates } : t))
    );
    await refreshData();
  };

  const checkedInCount = tickets.filter((t) => t.is_checked_in).length;

  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSupabaseLive={isSupabaseLive}
        ticketCount={tickets.length}
        checkedInCount={checkedInCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Empty State Banner if 0 tickets */}
        {tickets.length === 0 && !loading && (
          <div className="mb-6 p-5 rounded-2xl bg-[#14151c] border border-amber-500/30 text-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Event Ticket Registry is Empty</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Import your Google Form registration spreadsheet or load the 49-record Event Ledger to
                  generate secure QR passes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSeedOfficial49Ledger}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
              >
                Load Official 49-Ticket Ledger
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-[#eb0028] hover:bg-[#c40022] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#eb0028]/30 cursor-pointer"
              >
                Upload File (.xlsx / .csv)
              </button>
            </div>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <Dashboard
            tickets={tickets}
            events={events}
            onNavigateTab={(tab) => {
              if (tab === 'import') {
                setShowImportModal(true);
              } else {
                setActiveTab(tab);
              }
            }}
            onSelectTicket={(t) => setSelectedTicket(t)}
          />
        )}

        {activeTab === 'tickets' && (
          <TicketRegistry
            tickets={tickets}
            onSelectTicket={(t) => setSelectedTicket(t)}
            onOpenEmailModal={(t) => setEmailModalTicket(t)}
            onToggleCheckIn={handleToggleCheckIn}
            onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'scanner' && (
          <Scanner onCheckInSuccess={refreshData} />
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="bg-[#14151c] rounded-2xl border border-[#2b2d3d] p-6 text-center max-w-lg mx-auto">
              <FileSpreadsheet className="w-12 h-12 text-[#eb0028] mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white">Spreadsheet Data Import Center</h2>
              <p className="text-xs text-zinc-400 mt-1 mb-5">
                Ingest attendee Google Form responses and Ticket Ledgers with idempotent duplicate protection.
              </p>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-6 py-2.5 bg-[#eb0028] hover:bg-[#c40022] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#eb0028]/25 cursor-pointer"
              >
                Open Spreadsheet Ingestion Modal &rarr;
              </button>
            </div>
          </div>
        )}

        {activeTab === 'setup' && (
          <SetupGuide
            isSupabaseLive={isSupabaseLive}
            ticketCount={tickets.length}
            onSeedOfficialLedger={handleSeedOfficial49Ledger}
            onRefresh={refreshData}
          />
        )}
      </main>

      {/* Ticket Preview & Export Modal */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onMarkDownloaded={handleMarkDownloaded}
        />
      )}

      {/* Manual Email Dispatch Modal */}
      {emailModalTicket && (
        <EmailModal
          ticket={emailModalTicket}
          onClose={() => setEmailModalTicket(null)}
          onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
        />
      )}

      {/* Ingestion & Import Modal */}
      {showImportModal && (
        <ImportModal
          existingTickets={tickets}
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}

export default App;
