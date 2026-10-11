import React from 'react';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  QrCode,
  Upload,
  Database,
  AlertTriangle,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'tickets' | 'scanner' | 'import' | 'setup';
  setActiveTab: (tab: 'dashboard' | 'tickets' | 'scanner' | 'import' | 'setup') => void;
  isSupabaseLive: boolean;
  ticketCount: number;
  checkedInCount: number;
}


export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isSupabaseLive,
  ticketCount,
  checkedInCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0d0e12]/95 backdrop-blur-md border-b border-[#22242e]">
      {/* Top Notification Bar if in Sandbox Mode */}
      {!isSupabaseLive && (
        <div className="bg-amber-950/60 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Local Sandbox Mode:</strong> Supabase credentials not detected. Tickets and scans run in-memory.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('setup')}
            className="text-xs text-amber-400 underline hover:text-amber-300 cursor-pointer font-medium"
          >
            Connect Supabase Production &rarr;
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* TEDx Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-baseline">
              <span className="text-2xl font-black tracking-tighter text-[#eb0028]">TEDx</span>
              <span className="text-xl font-bold tracking-tight text-white ml-1">GeethanjaliCET</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-zinc-800">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                Ideas Worth Spreading
              </span>
              <span className="inline-block w-1 h-1 rounded-full bg-zinc-600" />
              <span className="text-xs text-zinc-400">Block 4 Auditorium</span>
            </div>

          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#eb0028]" />
              <span className="hidden md:inline">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'tickets'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <TicketIcon className="w-4 h-4 text-[#eb0028]" />
              <span>Registry</span>
              {ticketCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-700 text-zinc-200">
                  {ticketCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'scanner'
                  ? 'bg-[#eb0028] text-white shadow-md shadow-[#eb0028]/20'
                  : 'bg-zinc-800/80 text-zinc-200 hover:bg-[#eb0028]/20 hover:text-white border border-[#eb0028]/30'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR</span>
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'import'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Import</span>
            </button>

            <button
              onClick={() => setActiveTab('setup')}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'setup'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
              title="Database & Migration Setup"
            >
              <Database className="w-4 h-4 text-blue-400" />
              <span className="hidden lg:inline">Database</span>
            </button>
          </nav>

          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-3">
            {ticketCount > 0 && (
              <div className="text-xs text-zinc-400 font-medium">
                <span className="text-emerald-400 font-bold">{checkedInCount}</span> / {ticketCount} Admitted
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-900 border-zinc-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-zinc-300">
                {isSupabaseLive ? 'Supabase Connected' : 'Sandbox Store'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
