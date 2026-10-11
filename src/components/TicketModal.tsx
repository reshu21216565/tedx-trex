import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Download,
  Share2,
  FileText,
  Copy,
  Check,
  Printer,
  Calendar,
  MapPin,
} from 'lucide-react';

import type { Ticket } from '../types';
import { downloadTicketPdf, downloadTicketPng, shareTicket } from '../lib/ticketExporter';


interface TicketModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onMarkDownloaded?: (ticketId: string) => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  ticket,
  onClose,
  onMarkDownloaded,
}) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  if (!ticket) return null;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(ticket.security_token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleDownloadPng = async () => {
    if (!ticketRef.current) return;
    try {
      setDownloading(true);
      await downloadTicketPng(ticketRef.current, ticket);
      if (onMarkDownloaded) onMarkDownloaded(ticket.ticket_id);
    } catch (err) {
      console.error('PNG Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!ticketRef.current) return;
    try {
      setDownloading(true);
      await downloadTicketPdf(ticketRef.current, ticket);
      if (onMarkDownloaded) onMarkDownloaded(ticket.ticket_id);
    } catch (err) {
      console.error('PDF Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!ticketRef.current) return;
    const shared = await shareTicket(ticketRef.current, ticket);
    if (shared) {
      setShareSuccess('Shared successfully!');
      setTimeout(() => setShareSuccess(null), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getPassColor = (passType: string) => {
    const lower = passType.toLowerCase();
    if (lower.includes('vip')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (lower.includes('speaker')) return 'bg-[#eb0028]/20 text-[#ff4d66] border-[#eb0028]/40';
    if (lower.includes('student')) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    if (lower.includes('organizing')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (lower.includes('media')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    return 'bg-zinc-800 text-zinc-200 border-zinc-700';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#14151c] rounded-2xl border border-[#2b2d3d] shadow-2xl p-6 sm:p-8 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#eb0028]">
              OFFICIAL PASS ISSUANCE
            </span>
            {ticket.is_checked_in && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                CHECKED IN
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white mt-1">Admission Ticket Preview</h2>
        </div>

        {/* =========================================================================
            TICKET CANVAS ELEMENT (Target for PNG / PDF Export & Print)
            Authentic TEDx Editorial Aesthetics
           ========================================================================= */}
        <div
          ref={ticketRef}
          className="ticket-card relative overflow-hidden rounded-xl bg-[#0c0d12] border-2 border-[#2b2d3d] text-white shadow-xl transition-all"
          style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}
        >
          {/* Top Brand Banner */}
          <div className="bg-gradient-to-r from-[#171822] via-[#12131a] to-[#0c0d12] p-5 border-b border-[#242636]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-baseline">
                  <span className="text-3xl font-black tracking-tighter text-[#eb0028]">TEDx</span>
                  <span className="text-lg font-bold text-white ml-1 tracking-tight">GeethanjaliCET</span>
                </div>
                <div className="text-[10px] tracking-widest uppercase font-semibold text-zinc-400 mt-0.5">
                  x = independently organized TED event
                </div>
              </div>
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getPassColor(
                  ticket.pass_type
                )}`}
              >
                {ticket.pass_type}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#eb0028]" />
                <span>Tomorrow • Oct 12, 2026</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#eb0028]" />
                <span>Block 4 Auditorium</span>
              </div>
            </div>
          </div>


          {/* Ticket Perforation Notch Indicator */}
          <div className="relative flex items-center justify-between px-2 py-1 bg-[#0c0d12]">
            <div className="w-4 h-4 rounded-full bg-[#14151c] -ml-4 border-r border-[#2b2d3d]" />
            <div className="w-full border-t border-dashed border-zinc-700/80 mx-2" />
            <div className="w-4 h-4 rounded-full bg-[#14151c] -mr-4 border-l border-[#2b2d3d]" />
          </div>

          {/* Middle Body: Attendee Details & Local QR Code */}
          <div className="p-5 flex flex-col items-center text-center">
            {/* Preserved Ticket ID */}
            <div className="text-[11px] font-mono tracking-widest text-[#eb0028] font-bold uppercase mb-1">
              PASS ID: {ticket.ticket_id}
            </div>

            {/* Attendee Name */}
            <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
              {ticket.attendee_name}
            </h3>

            {/* Email (if present) */}
            {ticket.email ? (
              <div className="text-xs text-zinc-400 mt-0.5 font-mono">{ticket.email}</div>
            ) : (
              <div className="text-xs text-amber-400/80 mt-0.5 italic">Direct desk collection</div>
            )}

            {/* QR Code Container */}
            <div className="my-5 p-3.5 bg-white rounded-xl shadow-lg inline-block border-2 border-zinc-800">
              {/* Note: QR contains strictly the secure random token, NO personal info */}
              <QRCodeSVG
                value={ticket.security_token}
                size={168}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Security Token String */}
            <div className="text-[10px] font-mono text-zinc-500 tracking-wider">
              VERIFICATION TOKEN: {ticket.security_token.slice(0, 16)}...
            </div>

            {/* Admission Statement & Instructions */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 w-full text-[10px] text-zinc-400 leading-relaxed text-center">
              <p className="font-semibold text-zinc-300">
                ★ One-Time Admission Only • Non-Transferable
              </p>
              <p className="mt-0.5">
                Present this physical or digital QR code at the entrance turnstiles.
                Duplicate attempts will be rejected automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={handleDownloadPng}
              disabled={downloading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#eb0028] hover:bg-[#c40022] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-md shadow-[#eb0028]/20 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Exporting...' : 'Download PNG'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-all border border-zinc-700 cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handleShare}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-all border border-zinc-700 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Share Pass</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
            <button
              onClick={handleCopyToken}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {copiedToken ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Token copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy raw token</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </button>
          </div>

          {shareSuccess && (
            <div className="p-2 rounded bg-emerald-950 border border-emerald-800 text-center text-xs text-emerald-300">
              {shareSuccess}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
