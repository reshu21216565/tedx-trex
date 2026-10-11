import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Send,
  FileCheck,
} from 'lucide-react';
import type { EmailDeliveryStatus, Ticket } from '../types';


interface EmailModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onUpdateDeliveryStatus: (ticketId: string, status: EmailDeliveryStatus) => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  ticket,
  onClose,
  onUpdateDeliveryStatus,
}) => {
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  if (!ticket) return null;

  const emailSubject = `Your TEDx GeethanjaliCET Admission Ticket: [${ticket.ticket_id}] - ${ticket.attendee_name}`;

  const emailBody = `Dear ${ticket.attendee_name},

We are thrilled to welcome you to TEDx GeethanjaliCET tomorrow!

Here are your official admission credentials:
• Attendee Name: ${ticket.attendee_name}
• Assigned Pass Type: ${ticket.pass_type}
• Official Ticket ID: ${ticket.ticket_id}
• Verification Token: ${ticket.security_token}

Event Schedule & Venue:
• Date: Tomorrow, October 12, 2026
• Venue: Block 4 Auditorium

Important Gate Admission Instructions:
1. Please have your digital or printed QR ticket ready on your mobile device when arriving at the registration turnstiles.
2. Each ticket is strictly valid for one-time admission and non-transferable.
3. If you require physical assistance or have dietary requirements, please approach our concierge desk.

We look forward to sharing ideas worth spreading with you!

Warm regards,
TEDx GeethanjaliCET Organizing Committee
contact@tedxgeethanjalicet.com`;


  const mailtoLink = `mailto:${encodeURIComponent(ticket.email)}?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`;

  const handleCopySubject = () => {
    navigator.clipboard.writeText(emailSubject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(emailBody);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#14151c] rounded-2xl border border-[#2b2d3d] shadow-2xl p-6 sm:p-8 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#eb0028]">
              MANUAL DISPATCH ASSISTANT
            </span>
            <span className="text-xs text-zinc-400">• Step-by-Step Organizer Dispatch</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Email Ticket to {ticket.attendee_name}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            As per organizer guidelines, tickets are manually dispatched rather than automatically
            blasted. Use this pre-composed message with your preferred mail client.
          </p>
        </div>

        {/* Email Address Alert / Details */}
        <div className="mb-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-zinc-400 uppercase font-semibold">Destination Email</div>
            <div className="text-sm font-mono text-white font-medium flex items-center gap-2 mt-0.5">
              <span>{ticket.email || '(No email provided)'}</span>
              {ticket.is_email_invalid && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  Needs Correction
                </span>
              )}
            </div>
          </div>

          {ticket.email && !ticket.is_email_invalid && (
            <a
              href={mailtoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Open Mail Client</span>
            </a>
          )}
        </div>

        {/* Subject Line */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">Email Subject</label>
            <button
              onClick={handleCopySubject}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {copiedSubject ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Subject</span>
                </>
              )}
            </button>
          </div>
          <input
            type="text"
            readOnly
            value={emailSubject}
            className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none"
          />
        </div>

        {/* Message Body */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">Message Body Template</label>
            <button
              onClick={handleCopyBody}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {copiedBody ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied body!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Body</span>
                </>
              )}
            </button>
          </div>
          <textarea
            readOnly
            rows={10}
            value={emailBody}
            className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-lg p-3 text-xs text-zinc-300 font-mono leading-relaxed focus:outline-none resize-none"
          />
        </div>

        {/* Status Tracker */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Organizer Tracking Status:</span>
            <div className="text-xs font-semibold text-white mt-0.5">
              Current:{' '}
              <span
                className={`uppercase ${
                  ticket.email_delivery_status === 'MANUALLY_SENT'
                    ? 'text-emerald-400'
                    : ticket.email_delivery_status === 'PREPARED'
                    ? 'text-blue-400'
                    : 'text-zinc-400'
                }`}
              >
                {ticket.email_delivery_status.replace(/_/g, ' ')}
              </span>
              {ticket.email_sent_at && (
                <span className="text-zinc-500 font-normal ml-2">
                  (Sent at {new Date(ticket.email_sent_at).toLocaleTimeString()})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateDeliveryStatus(ticket.ticket_id, 'PREPARED')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                ticket.email_delivery_status === 'PREPARED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 inline mr-1" />
              Mark Prepared
            </button>

            <button
              onClick={() => onUpdateDeliveryStatus(ticket.ticket_id, 'MANUALLY_SENT')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                ticket.email_delivery_status === 'MANUALLY_SENT'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#eb0028] hover:bg-[#c40022] text-white shadow-md shadow-[#eb0028]/20'
              }`}
            >
              <Send className="w-3.5 h-3.5 inline mr-1" />
              Mark Manually Sent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
