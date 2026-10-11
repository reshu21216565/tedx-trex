import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import type { Ticket } from '../types';


/**
 * Exports an HTML ticket DOM element to high-resolution PNG data URL
 */
export async function exportTicketElementToPng(element: HTMLElement): Promise<string> {
  return await toPng(element, {
    quality: 0.95,
    pixelRatio: 2, // 2x retina clarity for crystal sharp QR scanning and print
    backgroundColor: '#0a0a0d',
  });
}

/**
 * Downloads a single ticket as a PNG image file
 */
export async function downloadTicketPng(element: HTMLElement, ticket: Ticket): Promise<void> {
  const dataUrl = await exportTicketElementToPng(element);
  const link = document.createElement('a');
  const safeName = ticket.attendee_name.replace(/[^a-zA-Z0-9]/g, '_');
  link.download = `${ticket.ticket_id}_${safeName}_TEDx_Ticket.png`;
  link.href = dataUrl;
  link.click();
}

/**
 * Downloads a single ticket as a PDF document
 */
export async function downloadTicketPdf(element: HTMLElement, ticket: Ticket): Promise<void> {
  const dataUrl = await exportTicketElementToPng(element);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Standard compact event ticket / pass size
  });

  const imgWidth = 130;
  const imgHeight = (element.offsetHeight / element.offsetWidth) * imgWidth;
  const x = (148 - imgWidth) / 2;
  const y = 15;

  pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);

  // Add event metadata footer
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('Valid for one-time admission. Present QR code at reception desk.', 74, y + imgHeight + 10, { align: 'center' });

  const safeName = ticket.attendee_name.replace(/[^a-zA-Z0-9]/g, '_');
  pdf.save(`${ticket.ticket_id}_${safeName}_TEDx_Ticket.pdf`);
}

/**
 * Native mobile sharing using Web Share API
 */
export async function shareTicket(element: HTMLElement, ticket: Ticket): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    const dataUrl = await exportTicketElementToPng(element);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const safeName = ticket.attendee_name.replace(/[^a-zA-Z0-9]/g, '_');
    const file = new File([blob], `${ticket.ticket_id}_${safeName}_Ticket.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `TEDx Ticket - ${ticket.attendee_name}`,
        text: `Your TEDx Admission Ticket (${ticket.ticket_id}) for ${ticket.attendee_name}. Pass type: ${ticket.pass_type}.`,
        files: [file],
      });
      return true;
    } else {
      await navigator.share({
        title: `TEDx Ticket - ${ticket.attendee_name}`,
        text: `TEDx Ticket: ${ticket.ticket_id}\nAttendee: ${ticket.attendee_name}\nPass: ${ticket.pass_type}\nToken: ${ticket.security_token}`,
      });
      return true;
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('Share error:', err);
    }
    return false;
  }
}

/**
 * Bulk exports tickets as a ZIP archive
 * Renders tickets in a hidden or provided offscreen container and bundles into a single .zip download
 */
export async function bulkExportTicketsZip(
  tickets: Ticket[],
  renderContainerFn: (ticket: Ticket) => Promise<string>,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('TEDx_Tickets_2026') || zip;

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (onProgress) {
      onProgress(i + 1, tickets.length);
    }

    try {
      const dataUrl = await renderContainerFn(ticket);
      // Strip data:image/png;base64,
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const safeName = ticket.attendee_name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${ticket.ticket_id}_${safeName}.png`;
      folder.file(filename, base64Data, { base64: true });
    } catch (err) {
      console.error(`Failed to render ticket ${ticket.ticket_id}:`, err);
    }
  }

  // Generate zip file
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TEDx_2026_All_Tickets_${tickets.length}_Passes.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
