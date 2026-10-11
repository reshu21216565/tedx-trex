import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Volume2,
  VolumeX,
  FlipHorizontal,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { ScanVerificationResult } from '../types';
import { performAtomicCheckIn } from '../lib/supabase';
import { playErrorBuzzer, playSuccessChime } from '../lib/sound';

interface ScannerProps {
  onCheckInSuccess: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onCheckInSuccess }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<ScanVerificationResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [operatorEmail] = useState('gate-alpha@tedxgeethanjalicet.org');

  const [recentScans, setRecentScans] = useState<
    Array<{ id: string; name: string; ticketId: string; status: string; time: string }>
  >([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'tedx-qr-reader-viewport';
  const isProcessingRef = useRef(false);


  // Initialize and start camera
  const startCamera = async (mode = facingMode) => {
    try {
      setCameraError(null);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      const qrScanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: mode },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // Prevent multiple scans of the same frame
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          await handleValidateCode(decodedText, 'camera');
        },
        () => {
          // Frame read non-matches (ignore normal idle frames)
        }

      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setIsScanning(false);
      setCameraError(
        err.message || 'Unable to access camera. Please allow camera permissions or use manual lookup.'
      );
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.debug('Error stopping camera:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const handleValidateCode = async (code: string, method: 'camera' | 'manual_lookup') => {
    if (!code || verifying) return;
    setVerifying(true);

    try {
      const result = await performAtomicCheckIn(code, operatorEmail, method);
      setScanResult(result);

      if (result.status === 'VALID') {
        if (soundEnabled) playSuccessChime();
        // Trigger celebratory confetti on admission
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#eb0028', '#10b981', '#ffffff'],
          });
        } catch (e) {
          // ignore if canvas not supported
        }

        setRecentScans((prev) => [
          {
            id: result.ticket.id,
            name: result.ticket.attendee_name,
            ticketId: result.ticket.ticket_id,
            status: 'VALID',
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 9),
        ]);

        onCheckInSuccess();
      } else {
        if (soundEnabled) playErrorBuzzer();
        if (result.status === 'ALREADY_CHECKED_IN') {
          setRecentScans((prev) => [
            {
              id: result.ticket.id,
              name: result.ticket.attendee_name,
              ticketId: result.ticket.ticket_id,
              status: 'ALREADY_CHECKED_IN',
              time: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 9),
          ]);
        }
      }
    } catch (err: any) {
      setScanResult({
        status: 'ERROR',
        message: 'CHECK-IN ERROR — RETRY OR USE MANUAL LOOKUP',
        error: err.message || 'Verification failed',
      });
      if (soundEnabled) playErrorBuzzer();
    } finally {
      setVerifying(false);
    }
  };

  const handleManualLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleValidateCode(manualInput.trim(), 'manual_lookup');
  };

  const handleResetForNext = () => {
    setScanResult(null);
    setManualInput('');
    isProcessingRef.current = false;
  };

  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Scanner Control Bar */}
      <div className="flex items-center justify-between bg-[#14151c] rounded-xl border border-[#2b2d3d] p-3 px-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#eb0028]" />
          <span className="text-sm font-bold text-white">TEDx GeethanjaliCET Gate Scanner</span>

          {isScanning && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>


        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute sound chime' : 'Enable sound chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          <button
            onClick={toggleCameraFacing}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            title="Switch front/back camera"
          >
            <FlipHorizontal className="w-4 h-4 text-blue-400" />
          </button>

          <button
            onClick={() => startCamera(facingMode)}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            title="Restart camera"
          >
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          RESULT OVERLAYS: UNMISTAKABLE COLOR-CODED OUTCOMES
          Green: VALID, Red: ALREADY CHECKED IN / INVALID, Amber: ERROR
         ========================================================================= */}
      {scanResult && (
        <div
          className={`rounded-2xl p-6 border-2 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200 ${
            scanResult.status === 'VALID'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-900/30'
              : scanResult.status === 'ALREADY_CHECKED_IN'
              ? 'bg-red-950/95 border-red-500 text-red-100 shadow-red-900/40'
              : scanResult.status === 'NOT_APPROVED'
              ? 'bg-red-950/95 border-red-600 text-red-100 shadow-red-900/40'
              : scanResult.status === 'INVALID'
              ? 'bg-red-950/95 border-red-600 text-red-100 shadow-red-900/40'
              : 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-900/40'
          }`}
        >
          {/* Header Status */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              {scanResult.status === 'VALID' && (
                <div className="p-2 bg-emerald-500 rounded-full text-black">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}
              {scanResult.status === 'ALREADY_CHECKED_IN' && (
                <div className="p-2 bg-red-600 rounded-full text-white">
                  <XCircle className="w-8 h-8" />
                </div>
              )}
              {scanResult.status === 'INVALID' && (
                <div className="p-2 bg-red-600 rounded-full text-white">
                  <XCircle className="w-8 h-8" />
                </div>
              )}
              {scanResult.status === 'NOT_APPROVED' && (
                <div className="p-2 bg-red-600 rounded-full text-white">
                  <XCircle className="w-8 h-8" />
                </div>
              )}
              {scanResult.status === 'ERROR' && (
                <div className="p-2 bg-amber-500 rounded-full text-black">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-widest font-black opacity-80">
                  VERIFICATION OUTCOME
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight">
                  {scanResult.message}
                </div>
              </div>
            </div>

            <button
              onClick={handleResetForNext}
              className="p-2 rounded-lg bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer"
              title="Close overlay"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Attendee Details Card */}
          <div className="py-4 space-y-3">
            {scanResult.status === 'VALID' && (
              <>
                <div className="bg-black/30 rounded-xl p-4 border border-emerald-500/30">
                  <div className="text-xs opacity-70 uppercase font-semibold">Admitted Attendee</div>
                  <div className="text-2xl font-black text-white mt-0.5">
                    {scanResult.ticket.attendee_name}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-mono bg-emerald-900/60 px-2 py-0.5 rounded font-bold border border-emerald-700">
                      ID: {scanResult.ticket.ticket_id}
                    </span>
                    <span className="bg-white/10 px-2 py-0.5 rounded font-semibold">
                      Pass: {scanResult.ticket.pass_type}
                    </span>
                    <span>• Admitted at {new Date(scanResult.ticket.checked_in_at || '').toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="text-xs font-semibold opacity-90 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>Entry turnstile unlocked. Hand out official event lanyard & kit.</span>
                </div>
              </>
            )}

            {scanResult.status === 'ALREADY_CHECKED_IN' && (
              <>
                <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
                  <div className="text-xs opacity-70 uppercase font-semibold">Duplicate Check-in Alert</div>
                  <div className="text-2xl font-black text-white mt-0.5">
                    {scanResult.ticket.attendee_name}
                  </div>
                  <div className="mt-2 text-xs space-y-1">
                    <div className="font-mono">PASS ID: {scanResult.ticket.ticket_id}</div>
                    <div className="text-red-200">
                      <strong>First Admitted At:</strong>{' '}
                      {new Date(scanResult.checkedInAt).toLocaleString()}
                    </div>
                    <div className="text-red-200">
                      <strong>Operator / Gate:</strong> {scanResult.checkedInBy}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold text-red-300">
                  ⚠️ This pass has already been redeemed. Verify attendee identity at the help desk.
                </div>
              </>
            )}

            {scanResult.status === 'INVALID' && (
              <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
                <div className="text-sm font-semibold">Unrecognized Ticket Token</div>
                <div className="text-xs mt-1 text-red-200 leading-relaxed">
                  {scanResult.reason}
                </div>
                <div className="text-xs mt-3 opacity-80">
                  Tip: Confirm attendee registration in the Registry tab or use manual ticket ID lookup.
                </div>
              </div>
            )}

            {scanResult.status === 'NOT_APPROVED' && (
              <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
                <div className="text-sm font-semibold">Issuance Revoked or Pending</div>
                <div className="text-xs mt-1 text-red-200">{scanResult.reason}</div>
              </div>
            )}

            {scanResult.status === 'ERROR' && (
              <div className="bg-black/30 rounded-xl p-4 border border-amber-500/30">
                <div className="text-sm font-semibold">Network / Verification Exception</div>
                <div className="text-xs mt-1 text-amber-200">{scanResult.error}</div>
                <div className="text-xs mt-3 opacity-90">
                  Please tap 'Scan Next' or enter the Ticket ID manually below.
                </div>
              </div>
            )}
          </div>

          {/* Reset / Next Button */}
          <div className="pt-2">
            <button
              onClick={handleResetForNext}
              className="w-full py-3 rounded-xl bg-white text-black font-black text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ready for Next Attendee</span>
            </button>
          </div>
        </div>
      )}

      {/* Camera Viewport Container */}
      <div className="relative overflow-hidden rounded-2xl bg-[#090a0d] border border-[#2b2d3d] p-4 text-center">
        {/* html5-qrcode target div */}
        <div
          id={scannerContainerId}
          className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border-2 border-[#eb0028]/40 shadow-inner bg-black"
          style={{ minHeight: '280px' }}
        />

        {verifying && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
            <RefreshCw className="w-8 h-8 text-[#eb0028] animate-spin mb-2" />
            <span className="text-sm font-bold tracking-wide">Validating Ticket Cryptographically...</span>
          </div>
        )}

        {cameraError && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 flex items-center justify-between text-left">
            <span>{cameraError}</span>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-2 py-1 rounded bg-red-900 text-white font-medium hover:bg-red-800 cursor-pointer shrink-0 ml-2"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-3 text-xs text-zinc-400">
          Point camera directly at the TEDx admission QR code. Scans execute with zero server latency.
        </div>
      </div>

      {/* Manual Ticket ID Fallback Input */}
      <div className="bg-[#14151c] rounded-2xl border border-[#2b2d3d] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-bold text-white">Manual Pass-ID Fallback Lookup</h3>
        </div>
        <form onSubmit={handleManualLookupSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter Ticket ID (e.g. TEDX-2026-001) or Token"
            className="flex-1 bg-[#090a0d] border border-[#2b2d3d] rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-[#eb0028]"
          />
          <button
            type="submit"
            disabled={!manualInput.trim() || verifying}
            className="px-5 py-2.5 bg-[#eb0028] hover:bg-[#c40022] text-white font-semibold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            Check In
          </button>
        </form>
      </div>

      {/* Recent Scans Session Log */}
      {recentScans.length > 0 && (
        <div className="bg-[#14151c] rounded-xl border border-[#2b2d3d] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Recent Gate Scans (This Terminal)
            </span>
            <span className="text-xs text-zinc-500">{recentScans.length} scans</span>
          </div>
          <div className="space-y-2">
            {recentScans.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.status === 'VALID' ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />
                  <span className="font-semibold text-white">{item.name}</span>
                  <span className="font-mono text-zinc-400">{item.ticketId}</span>
                </div>
                <div className="text-zinc-500 font-mono text-[11px]">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
