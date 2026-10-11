import React, { useState } from 'react';
import {
  Search,
  Filter,
  Mail,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileArchive,
  RefreshCw,
  CheckSquare,
  Square,
  Trash2,
} from 'lucide-react';
import type { EmailDeliveryStatus, Ticket } from '../types';
import { bulkExportTicketsZip } from '../lib/ticketExporter';
import { toPng } from 'html-to-image';


interface TicketRegistryProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onOpenEmailModal: (ticket: Ticket) => void;
  onToggleCheckIn: (ticket: Ticket) => void;
  onUpdateDeliveryStatus: (ticketId: string, status: EmailDeliveryStatus) => void;
  onRefresh: () => void;
  onOpenClearModal?: () => void;
}

export const TicketRegistry: React.FC<TicketRegistryProps> = ({
  tickets,
  onSelectTicket,
  onOpenEmailModal,
  onToggleCheckIn,
  onUpdateDeliveryStatus,
  onRefresh,
  onOpenClearModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [passTypeFilter, setPassTypeFilter] = useState('ALL');
  const [checkInFilter, setCheckInFilter] = useState<'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN'>('ALL');
  const [emailStatusFilter, setEmailStatusFilter] = useState<'ALL' | EmailDeliveryStatus>('ALL');
  const [emailIssueOnly, setEmailIssueOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);

  // Distinct pass types for filter dropdown
  const passTypes = Array.from(new Set(tickets.map((t) => t.pass_type)));

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    // Search query
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchName = t.attendee_name.toLowerCase().includes(query);
      const matchEmail = t.email.toLowerCase().includes(query);
      const matchId = t.ticket_id.toLowerCase().includes(query);
      if (!matchName && !matchEmail && !matchId) return false;
    }

    // Pass type filter
    if (passTypeFilter !== 'ALL' && t.pass_type !== passTypeFilter) {
      return false;
    }

    // Check-in filter
    if (checkInFilter === 'CHECKED_IN' && !t.is_checked_in) return false;
    if (checkInFilter === 'NOT_CHECKED_IN' && t.is_checked_in) return false;

    // Email delivery status
    if (emailStatusFilter !== 'ALL' && t.email_delivery_status !== emailStatusFilter) {
      return false;
    }

    // Email issue flag
    if (emailIssueOnly && !t.is_email_invalid) return false;

    return true;
  });

  // Select / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredTickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTickets.map((t) => t.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Bulk ZIP Download
  const handleBulkZipDownload = async () => {
    const targetTickets =
      selectedIds.size > 0
        ? tickets.filter((t) => selectedIds.has(t.id))
        : tickets;

    if (targetTickets.length === 0) return;

    try {
      setIsZipping(true);
      setZipProgress({ current: 0, total: targetTickets.length });

      // Offscreen container renderer
      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.position = 'fixed';
      hiddenContainer.style.left = '-9999px';
      hiddenContainer.style.top = '-9999px';
      hiddenContainer.style.width = '400px';
      document.body.appendChild(hiddenContainer);

      await bulkExportTicketsZip(
        targetTickets,
        async (ticket) => {
          // Render SVG barcode offscreen
          hiddenContainer.innerHTML = `
            <div style="background:#0c0d12; color:#fff; padding:24px; border-radius:12px; font-family:sans-serif; border:2px solid #2b2d3d;">
              <div style="font-size:24px; font-weight:900; color:#eb0028; margin-bottom:2px;">TEDx<span style="color:#fff"> GeethanjaliCET</span></div>
              <div style="font-size:11px; color:#888; margin-bottom:14px;">Block 4 Auditorium • PASS ID: ${ticket.ticket_id}</div>
              <div style="font-size:18px; font-weight:bold; margin-bottom:4px;">${ticket.attendee_name}</div>
              <div style="font-size:12px; color:#aaa; margin-bottom:12px;">Pass: ${ticket.pass_type}</div>
              <div style="background:#fff; padding:12px; border-radius:8px; display:inline-block; margin-bottom:12px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                  ticket.security_token
                )}" style="width:140px; height:140px; display:block;" />
              </div>
              <div style="font-size:10px; color:#777; margin-top:8px;">★ One-Time Admission Only • Non-Transferable</div>
            </div>

          `;
          // Wait for qr image to load
          await new Promise((r) => setTimeout(r, 80));
          return await toPng(hiddenContainer, { backgroundColor: '#0c0d12' });
        },
        (curr, total) => {
          setZipProgress({ current: curr, total });
        }
      );

      document.body.removeChild(hiddenContainer);
    } catch (err) {
      console.error('Bulk export error:', err);
    } finally {
      setIsZipping(false);
      setZipProgress(null);
    }
  };

  const getPassBadgeClass = (pass: string) => {
    const p = pass.toLowerCase();
    if (p.includes('vip')) return 'bg-amber-950/80 text-amber-300 border-amber-800';
    if (p.includes('speaker')) return 'bg-red-950/80 text-red-300 border-red-800';
    if (p.includes('student')) return 'bg-blue-950/80 text-blue-300 border-blue-800';
    if (p.includes('organizing')) return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  return (
    <div className="space-y-4">
      {/* Registry Top Bar */}
      <div className="bg-[#14151c] rounded-2xl border border-[#2b2d3d] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Attendee & Ticket Registry</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {filteredTickets.length} of {tickets.length}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Approved attendee records. Manage passes, download PNG/PDFs, or prepare manual email dispatches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkZipDownload}
              disabled={isZipping || tickets.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#eb0028] hover:bg-[#c40022] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#eb0028]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>
                {isZipping
                  ? `Bundling ZIP (${zipProgress?.current}/${zipProgress?.total})...`
                  : selectedIds.size > 0
                  ? `Download Selected (${selectedIds.size}) ZIP`
                  : `Export All (${tickets.length}) Tickets ZIP`}
              </span>
            </button>

            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
              title="Refresh Registry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {tickets.length > 0 && onOpenClearModal && (
              <button
                onClick={onOpenClearModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                title="Erase all tickets from database for a fresh upload"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Erase All</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Email, or Ticket ID..."
              className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#eb0028]"
            />
          </div>

          {/* Pass Type Filter */}
          <div>
            <select
              value={passTypeFilter}
              onChange={(e) => setPassTypeFilter(e.target.value)}
              className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#eb0028]"
            >
              <option value="ALL">All Pass Types ({tickets.length})</option>
              {passTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Check-In Status Filter */}
          <div>
            <select
              value={checkInFilter}
              onChange={(e) => setCheckInFilter(e.target.value as any)}
              className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#eb0028]"
            >
              <option value="ALL">All Admission States</option>
              <option value="NOT_CHECKED_IN">Pending Entry Only</option>
              <option value="CHECKED_IN">Checked In Only</option>
            </select>
          </div>

          {/* Email Status Filter */}
          <div>
            <select
              value={emailStatusFilter}
              onChange={(e) => setEmailStatusFilter(e.target.value as any)}
              className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#eb0028]"
            >
              <option value="ALL">All Email States</option>
              <option value="NOT_PREPARED">Not Prepared</option>
              <option value="PREPARED">Prepared</option>
              <option value="MANUALLY_SENT">Manually Sent</option>
            </select>
          </div>

          {/* Email Issues Toggle */}
          <div className="flex items-center">
            <button
              onClick={() => setEmailIssueOnly(!emailIssueOnly)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                emailIssueOnly
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                  : 'bg-[#0d0e12] text-zinc-400 border-[#2b2d3d] hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Email Issues</span>
            </button>
          </div>

        </div>
      </div>

      {/* Table & Attendees List */}
      <div className="bg-[#14151c] rounded-2xl border border-[#2b2d3d] overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Filter className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">No matching tickets found</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Try adjusting your search criteria or clear the filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e0f14] border-b border-[#242636] text-zinc-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3 w-8">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {selectedIds.size === filteredTickets.length && filteredTickets.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#eb0028]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Ticket ID</th>
                  <th className="p-3">Attendee Name</th>
                  <th className="p-3">Pass Type</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Check-In Status</th>
                  <th className="p-3">Manual Dispatch</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e202c]">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`hover:bg-zinc-900/60 transition-colors ${
                      ticket.is_checked_in ? 'bg-emerald-950/10' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleSelectRow(ticket.id)}
                        className="text-zinc-500 hover:text-white cursor-pointer"
                      >
                        {selectedIds.has(ticket.id) ? (
                          <CheckSquare className="w-4 h-4 text-[#eb0028]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Preserved Ticket ID */}
                    <td className="p-3 font-mono font-bold text-white whitespace-nowrap">
                      {ticket.ticket_id}
                    </td>

                    {/* Attendee Name & Group Note */}
                    <td className="p-3">
                      <div className="font-bold text-white">{ticket.attendee_name}</div>
                      {ticket.notes && (
                        <div className="text-[11px] text-zinc-400 truncate max-w-xs">{ticket.notes}</div>
                      )}
                    </td>

                    {/* Pass Type */}
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPassBadgeClass(
                          ticket.pass_type
                        )}`}
                      >
                        {ticket.pass_type}
                      </span>
                    </td>

                    {/* Email Destination & Flag */}
                    <td className="p-3">
                      <div className="font-mono text-zinc-300 flex items-center gap-1.5">
                        <span>{ticket.email || '(None)'}</span>
                        {ticket.is_email_invalid && (
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 font-sans font-bold"
                            title="Malformed or missing email address (preserved as-is)"
                          >
                            Review
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Check-In Status */}
                    <td className="p-3 whitespace-nowrap">
                      {ticket.is_checked_in ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Admitted</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending</span>
                        </div>
                      )}
                    </td>

                    {/* Manual Email Dispatch Status */}
                    <td className="p-3 whitespace-nowrap">
                      <button
                        onClick={() => {
                          const next: EmailDeliveryStatus =
                            ticket.email_delivery_status === 'NOT_PREPARED'
                              ? 'PREPARED'
                              : ticket.email_delivery_status === 'PREPARED'
                              ? 'MANUALLY_SENT'
                              : 'NOT_PREPARED';
                          onUpdateDeliveryStatus(ticket.ticket_id, next);
                        }}
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                          ticket.email_delivery_status === 'MANUALLY_SENT'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                            : ticket.email_delivery_status === 'PREPARED'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800 hover:bg-blue-900'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                        title="Click to toggle status: Not Prepared -> Prepared -> Manually Sent"
                      >
                        {ticket.email_delivery_status.replace(/_/g, ' ')}
                      </button>
                    </td>



                    {/* Actions */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectTicket(ticket)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                          title="Preview & Download Ticket"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pass</span>
                        </button>

                        <button
                          onClick={() => onOpenEmailModal(ticket)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                          title="Prepare Email"
                        >
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                          <span>Email</span>
                        </button>

                        <button
                          onClick={() => onToggleCheckIn(ticket)}
                          className={`p-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            ticket.is_checked_in
                              ? 'text-zinc-500 hover:text-red-400'
                              : 'text-zinc-400 hover:text-emerald-400'
                          }`}
                          title={ticket.is_checked_in ? 'Undo Check-In' : 'Manual Check-In'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
