import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../types';
import { Terminal, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

interface LogTerminalProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs, onClear }) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMinimized && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, isMinimized]);

  // Expand if error happens
  useEffect(() => {
    const lastLog = logs[logs.length - 1];
    if (lastLog && lastLog.type === 'error') {
      setIsMinimized(false);
    }
  }, [logs]);

  return (
    <aside
      id="logTerminal"
      aria-label="Terminal de Conexión y Logs"
      className={`fixed bottom-4 right-4 z-40 w-[min(420px,92vw)] bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden transition-all duration-300 ${
        isMinimized ? 'h-11' : 'h-64'
      }`}
    >
      {/* Header */}
      <div
        onClick={() => setIsMinimized(prev => !prev)}
        className="bg-slate-950 px-4 py-2.5 flex justify-between items-center cursor-pointer border-b border-slate-800 text-xs font-semibold text-slate-200 select-none"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-xs uppercase tracking-wide">Terminal & Logs</span>
          <span className="text-[10px] text-amber-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono">
            {logs.length}
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          {!isMinimized && (
            <button
              onClick={e => {
                e.stopPropagation();
                onClear();
              }}
              title="Limpiar logs"
              className="hover:text-red-400 p-0.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Log Body */}
      {!isMinimized && (
        <div
          ref={containerRef}
          className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1.5 divide-y divide-slate-800/50 bg-slate-950/80"
        >
          {logs.length > 0 ? (
            logs.map(log => {
              const colorClass =
                log.type === 'success'
                  ? 'text-emerald-400'
                  : log.type === 'error'
                  ? 'text-red-400 bg-red-500/10 p-1.5 rounded border border-red-500/20'
                  : log.type === 'warn'
                  ? 'text-amber-300'
                  : 'text-slate-300';

              return (
                <div key={log.id} className={`pt-1 leading-relaxed ${colorClass}`}>
                  <span className="text-slate-500 text-[10px] mr-2">[{log.time}]</span>
                  <span>{log.message}</span>
                </div>
              );
            })
          ) : (
            <div className="text-slate-500 py-4 text-center">Sin logs registrados.</div>
          )}
        </div>
      )}
    </aside>
  );
};
