import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Download,
  QrCode,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  MailWarning,
  Activity,
  Layers,
} from 'lucide-react';
import type { CheckInEvent, Ticket } from '../types';


interface DashboardProps {
  tickets: Ticket[];
  events: CheckInEvent[];
  onNavigateTab: (tab: 'tickets' | 'scanner' | 'import' | 'setup') => void;
  onSelectTicket: (ticket: Ticket) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  tickets,
  events,
  onNavigateTab,
  onSelectTicket,
}) => {
  // Compute live real-time statistics
  const totalAttendees = tickets.length;
  const approvedTickets = tickets.filter((t) => t.status === 'APPROVED_FOR_ISSUANCE').length;
  const checkedInCount = tickets.filter((t) => t.is_checked_in).length;
  const notCheckedInCount = totalAttendees - checkedInCount;
  const downloadedCount = tickets.filter((t) => t.downloaded_at !== null).length;
  const emailIssuesCount = tickets.filter((t) => t.is_email_invalid).length;
  const preparedEmailsCount = tickets.filter(
    (t) => t.email_delivery_status === 'PREPARED' || t.email_delivery_status === 'MANUALLY_SENT'
  ).length;

  const checkInRate = totalAttendees > 0 ? Math.round((checkedInCount / totalAttendees) * 100) : 0;

  // Pass Type distribution
  const passTypeCounts = tickets.reduce((acc, t) => {
    acc[t.pass_type] = (acc[t.pass_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Event Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#171922] via-[#121319] to-[#0e0f14] border border-[#262838] p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#eb0028]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#eb0028]/20 text-[#ff4d66] border border-[#eb0028]/30">
                LIVE DISPATCH CONSOLE
              </span>
              <span className="text-xs text-zinc-400">Gate Access Ready</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              TEDx GeethanjaliCET Operations & Check-In
            </h1>

            <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
              Real-time admission status for all 49 ticket entries. Scan QR passes at the entrance,
              download individual passes, or prepare personalized emails for attendees.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('scanner')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#eb0028] hover:bg-[#c40022] text-white font-semibold rounded-xl text-sm shadow-lg shadow-[#eb0028]/25 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Launch Gate Scanner</span>
            </button>
            <button
              onClick={() => onNavigateTab('import')}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-sm border border-zinc-700 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Import Workbook</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Attendees */}
        <div className="bg-[#14151c] rounded-xl border border-[#242636] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Total Attendees</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white">{totalAttendees}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Ledger entries</div>
          </div>
        </div>

        {/* Approved for Issuance */}
        <div className="bg-[#14151c] rounded-xl border border-[#242636] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Approved Tickets</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-400">{approvedTickets}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Ready for issuance</div>
          </div>
        </div>

        {/* Checked In */}
        <div className="bg-[#14151c] rounded-xl border border-[#242636] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Checked In</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white">{checkedInCount}</div>
            <div className="text-[11px] text-emerald-400/90 mt-0.5">{checkInRate}% admitted</div>
          </div>
        </div>

        {/* Not Yet Checked In */}
        <div className="bg-[#14151c] rounded-xl border border-[#242636] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Remaining Entry</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-400">{notCheckedInCount}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Awaiting check-in</div>
          </div>
        </div>

        {/* Tickets Downloaded */}
        <div className="bg-[#14151c] rounded-xl border border-[#242636] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Tickets Exported</span>
            <Download className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white">{downloadedCount}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{preparedEmailsCount} prepared</div>
          </div>
        </div>

        {/* Flagged Email Issues */}
        <div className="bg-[#14151c] rounded-xl border border-[#242636] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Email Issues</span>
            <MailWarning className="w-4 h-4 text-[#eb0028]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[#eb0028]">{emailIssuesCount}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Malformed or blank</div>
          </div>
        </div>
      </div>

      {/* Progress Bar & Gate Capacity */}
      {totalAttendees > 0 && (
        <div className="bg-[#14151c] rounded-xl border border-[#242636] p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#eb0028]" />
              <span>Gate Check-In Admission Velocity</span>
            </div>
            <span className="text-xs font-bold text-zinc-300">
              {checkedInCount} of {totalAttendees} Admitted ({checkInRate}%)
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#eb0028] to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${checkInRate}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Check-In Active</span>
            <span>Block 4 Auditorium Capacity (49)</span>
          </div>

        </div>
      )}

      {/* Two-Column Layout: Activity Feed & Pass Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Check-In Activity (2 cols) */}
        <div className="lg:col-span-2 bg-[#14151c] rounded-xl border border-[#242636] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Live Check-In Activity Log</h2>
            </div>
            <span className="text-xs text-zinc-400">{events.length} audit records</span>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-lg bg-zinc-900/50 border border-dashed border-zinc-800">
              <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-400">No check-in activity recorded yet</p>
              <p className="text-xs text-zinc-500 mt-1">
                Scan attendee QR codes with the camera scanner to record admissions.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {events.slice(0, 10).map((evt) => {
                const matchingTicket = tickets.find((t) => t.ticket_id === evt.ticket_id);
                return (
                  <div
                    key={evt.id}
                    onClick={() => {
                      if (matchingTicket) onSelectTicket(matchingTicket);
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors ${
                      matchingTicket ? 'cursor-pointer hover:bg-zinc-800/70' : ''
                    }`}
                  >

                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        evt.result === 'VALID_CHECK_IN'
                          ? 'bg-emerald-400'
                          : evt.result === 'ALREADY_CHECKED_IN'
                          ? 'bg-amber-400'
                          : 'bg-[#eb0028]'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {evt.attendee_name || evt.ticket_id}
                      </div>
                      <div className="text-xs text-zinc-400 flex items-center gap-2">
                        <span className="font-mono text-zinc-300">{evt.ticket_id}</span>
                        {evt.pass_type && <span>• {evt.pass_type}</span>}
                        <span>• via {evt.scan_method}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        evt.result === 'VALID_CHECK_IN'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : evt.result === 'ALREADY_CHECKED_IN'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {evt.result.replace(/_/g, ' ')}
                    </span>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Pass Breakdown & Quick Actions (1 col) */}
        <div className="space-y-6">
          {/* Pass Type Breakdown */}
          <div className="bg-[#14151c] rounded-xl border border-[#242636] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-semibold text-white">Pass Type Breakdown</h2>
            </div>
            <div className="space-y-2.5">
              {Object.entries(passTypeCounts).length === 0 ? (
                <p className="text-xs text-zinc-500">No tickets loaded</p>
              ) : (
                Object.entries(passTypeCounts).map(([type, count]) => {
                  const percent = Math.round((count / totalAttendees) * 100);
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300 font-medium">{type}</span>
                        <span className="text-zinc-400">
                          {count} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-[#14151c] rounded-xl border border-[#242636] p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Organizer Quick Tools</h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('tickets')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 transition-colors cursor-pointer"
              >
                <span>Browse & Download Tickets</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
              </button>
              <button
                onClick={() => onNavigateTab('import')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 transition-colors cursor-pointer"
              >
                <span>Import Google Form / Ledger (.xlsx)</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </button>
              <button
                onClick={() => onNavigateTab('setup')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 transition-colors cursor-pointer"
              >
                <span>View Supabase Migration SQL</span>
                <ArrowUpRight className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
