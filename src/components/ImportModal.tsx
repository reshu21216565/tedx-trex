import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Check,
} from 'lucide-react';
import type { ColumnMapping, ImportPreviewRow, ImportSummary, Ticket } from '../types';
import {
  executeIdempotentImport,
  type ParsedWorkbook,
  parseSpreadsheetFile,
  prepareImportPreview,
  suggestColumnMappings,
} from '../lib/spreadsheet';

import {
  downloadSampleWorkbook,
  SAMPLE_TEDX_LEDGER_DATA,
} from '../lib/sampleData';

interface ImportModalProps {
  existingTickets: Ticket[];
  onClose: () => void;
  onImportComplete: (summary: ImportSummary) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  existingTickets,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'summary'>('upload');
  const [parsedWb, setParsedWb] = useState<ParsedWorkbook | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    ticket_id: '',
    attendee_name: '',
    email: '',
    pass_type: '',
    notes: '',
  });
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const parsed = await parseSpreadsheetFile(file);
      setParsedWb(parsed);

      const suggested = suggestColumnMappings(parsed.headers);
      setMapping(suggested);

      // Generate preview rows
      const previews = prepareImportPreview(parsed.rawRows, suggested, existingTickets);
      setPreviewRows(previews);

      setStep('mapping');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse file. Ensure it is a valid XLSX or CSV file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Load the 49-Record Official Event Ledger fixture directly
  const handleLoadSampleLedger = () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const headers = [
        'Ticket ID',
        'Attendee Name',
        'Email Address',
        'Pass Type',
        'Notes / Group Affiliation',
        'Approval Status',
      ];
      const parsed: ParsedWorkbook = {
        sheetNames: ['Ticket Ledger', 'Form Responses 1'],
        activeSheet: 'Ticket Ledger',
        headers,
        rawRows: SAMPLE_TEDX_LEDGER_DATA,
      };
      setParsedWb(parsed);

      const mapping: ColumnMapping = {
        ticket_id: 'Ticket ID',
        attendee_name: 'Attendee Name',
        email: 'Email Address',
        pass_type: 'Pass Type',
        notes: 'Notes / Group Affiliation',
      };
      setMapping(mapping);

      const previews = prepareImportPreview(SAMPLE_TEDX_LEDGER_DATA, mapping, existingTickets);
      setPreviewRows(previews);

      setStep('preview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample dataset');
    } finally {
      setIsProcessing(false);
    }
  };

  // Update mapping and refresh preview
  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const updatedMapping = { ...mapping, [field]: value };
    setMapping(updatedMapping);
    if (parsedWb) {
      const previews = prepareImportPreview(parsedWb.rawRows, updatedMapping, existingTickets);
      setPreviewRows(previews);
    }
  };

  // Execute idempotent import
  const handleExecuteImport = () => {
    setIsProcessing(true);
    try {
      const summary = executeIdempotentImport(previewRows, existingTickets);
      setImportSummary(summary);
      onImportComplete(summary);
      setStep('summary');
    } catch (err: any) {
      setErrorMessage(err.message || 'Import execution failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#14151c] rounded-2xl border border-[#2b2d3d] shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] flex flex-col">
        {/* Close Button */}
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
              DATA INGESTION PIPELINE
            </span>
            <span className="text-xs text-zinc-400">• Idempotent Ledger Import</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Import Google Form / Ticket Ledger Spreadsheet
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Preserves original Ticket IDs, generates unique QR verification tokens, flags invalid emails,
            and maintains idempotent state without overwriting checked-in passes.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD OR LOAD SAMPLE */}
        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed border-[#2b2d3d] rounded-2xl p-8 text-center hover:border-[#eb0028]/60 transition-colors bg-[#0d0e12]/50">
              <FileSpreadsheet className="w-12 h-12 text-[#eb0028] mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Upload Event Workbook</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-4">
                Drag and drop your event spreadsheet file (.xlsx, .xls, or .csv).
                Worksheets named "Ticket Ledger" or "Form Responses 1" will be detected automatically.
              </p>

              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#eb0028] hover:bg-[#c40022] text-white font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-[#eb0028]/20">
                <Upload className="w-4 h-4" />
                <span>Browse File from Computer</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Demo Option */}
            <div className="rounded-xl p-4 bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">
                  Use the 49-Record Event Ledger (43 Submissions Expanded)
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Includes group passes expanded into individual attendees, preserved IDs (TEDX-2026-001 to 049), and realistic email variations.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => downloadSampleWorkbook()}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Download template XLSX"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download .XLSX</span>
                </button>
                <button
                  onClick={handleLoadSampleLedger}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Load 49 Records Now &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: COLUMN MAPPING */}
        {step === 'mapping' && parsedWb && (
          <div className="space-y-6 py-2 overflow-y-auto">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <span className="text-zinc-300">
                Active Sheet: <strong>{parsedWb.activeSheet}</strong> ({parsedWb.rawRows.length} rows found)
              </span>
              <span className="text-emerald-400 font-semibold">Columns Auto-Detected</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Ticket ID Column <span className="text-[#eb0028]">*</span>
                </label>
                <select
                  value={mapping.ticket_id}
                  onChange={(e) => handleMappingChange('ticket_id', e.target.value)}
                  className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#eb0028]"
                >
                  <option value="">-- Select Ticket ID Column --</option>
                  {parsedWb.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">Preserves existing IDs without replacing them.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Attendee Name Column <span className="text-[#eb0028]">*</span>
                </label>
                <select
                  value={mapping.attendee_name}
                  onChange={(e) => handleMappingChange('attendee_name', e.target.value)}
                  className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#eb0028]"
                >
                  <option value="">-- Select Attendee Name Column --</option>
                  {parsedWb.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Email Address Column</label>
                <select
                  value={mapping.email}
                  onChange={(e) => handleMappingChange('email', e.target.value)}
                  className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#eb0028]"
                >
                  <option value="">-- Select Email Column (Optional) --</option>
                  {parsedWb.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Malformed emails will be preserved as entered and flagged for review.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Pass Type Column</label>
                <select
                  value={mapping.pass_type}
                  onChange={(e) => handleMappingChange('pass_type', e.target.value)}
                  className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#eb0028]"
                >
                  <option value="">-- Select Pass Type Column --</option>
                  {parsedWb.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Notes / Group Affiliation Column
                </label>
                <select
                  value={mapping.notes}
                  onChange={(e) => handleMappingChange('notes', e.target.value)}
                  className="w-full bg-[#0d0e12] border border-[#2b2d3d] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#eb0028]"
                >
                  <option value="">-- Select Notes Column (Optional) --</option>
                  {parsedWb.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-between">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                &larr; Choose Different File
              </button>
              <button
                onClick={() => setStep('preview')}
                disabled={!mapping.ticket_id || !mapping.attendee_name}
                className="px-5 py-2 rounded-lg bg-[#eb0028] hover:bg-[#c40022] text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
              >
                Continue to Preview ({previewRows.length} Rows) &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW TABLE & DUPLICATE CHECKS */}
        {step === 'preview' && (
          <div className="space-y-4 py-2 flex-1 flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-zinc-300">
                  Ready to Ingest: <strong>{previewRows.length}</strong> Entries
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                  Approved for Issuance (Operational Rule)
                </span>
              </div>
              <div className="text-zinc-400">
                Invalid Emails Flagged:{' '}
                <strong className="text-amber-400">
                  {previewRows.filter((r) => r.is_email_invalid).length}
                </strong>
              </div>
            </div>

            {/* Scrollable Preview Table */}
            <div className="flex-1 overflow-y-auto border border-[#2b2d3d] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0d0e12] border-b border-[#2b2d3d] text-zinc-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Ticket ID</th>
                    <th className="p-2.5">Attendee Name</th>
                    <th className="p-2.5">Pass Type</th>
                    <th className="p-2.5">Email Address</th>
                    <th className="p-2.5">Group Notes</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222433]">
                  {previewRows.slice(0, 50).map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={`hover:bg-zinc-900/50 ${
                        row.is_duplicate ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="p-2.5 font-mono text-zinc-500">{row.rowIndex}</td>
                      <td className="p-2.5 font-mono font-bold text-white">{row.ticket_id}</td>
                      <td className="p-2.5 font-semibold text-zinc-200">{row.attendee_name}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">
                          {row.pass_type}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className={row.email ? 'text-zinc-300' : 'text-zinc-600 italic'}>
                            {row.email || '(blank)'}
                          </span>
                          {row.is_email_invalid && (
                            <span className="text-[10px] text-amber-400 font-sans font-bold bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/80">
                              Flagged
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 text-zinc-400 text-[11px] max-w-xs truncate">
                        {row.notes || '-'}
                      </td>
                      <td className="p-2.5">
                        {row.is_duplicate ? (
                          <span className="text-[10px] text-amber-300 font-semibold bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                            Re-import Match
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                            New Pass
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                &larr; Back to Mapping
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-[#eb0028] hover:bg-[#c40022] text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-[#eb0028]/25 disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing & Hashing Tokens...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Execute Import ({previewRows.length} Passes)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUMMARY & SUCCESS */}
        {step === 'summary' && importSummary && (
          <div className="space-y-6 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Import Successfully Completed</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                All records have been idempotently synchronized into the ticket registry with unique
                cryptographic QR tokens.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-left">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Total Processed</div>
                <div className="text-xl font-bold text-white">{importSummary.totalRows}</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Active Approved</div>
                <div className="text-xl font-bold text-emerald-400">{importSummary.approvedCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Re-import Matches</div>
                <div className="text-xl font-bold text-amber-400">{importSummary.duplicateCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Email Flags</div>
                <div className="text-xl font-bold text-[#eb0028]">{importSummary.emailIssuesCount}</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#eb0028] hover:bg-[#c40022] text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-[#eb0028]/25"
            >
              Open Ticket Registry &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
