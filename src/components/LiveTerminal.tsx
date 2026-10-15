import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Trash2, Download, CornerDownLeft } from 'lucide-react';
import type { TerminalLogEntry } from '../types/minecraft';

interface LiveTerminalProps {
  logs: TerminalLogEntry[];
  onClearLogs: () => void;
  onExecuteCommand: (cmd: string) => Promise<string | void>;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({
  logs,
  onClearLogs,
  onExecuteCommand,
}) => {
  const [cmdInput, setCmdInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleRun = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = cmdInput.trim();
    if (!cmd || isExecuting) return;

    setHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);
    setCmdInput('');
    setIsExecuting(true);
    try {
      await onExecuteCommand(cmd);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      if (history.length > 0) {
        const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setCmdInput(history[nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIdx !== -1) {
        const nextIdx = historyIdx + 1;
        if (nextIdx >= history.length) {
          setHistoryIdx(-1);
          setCmdInput('');
        } else {
          setHistoryIdx(nextIdx);
          setCmdInput(history[nextIdx] || '');
        }
      }
    }
  };

  const downloadLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindcraft_bot_1.21.11_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: TerminalLogEntry['level']) => {
    switch (level) {
      case 'CHAT':
        return 'text-emerald-400 font-bold';
      case 'MIND':
        return 'text-purple-400 font-bold';
      case 'COMMAND':
        return 'text-cyan-400 font-bold';
      case 'WARN':
        return 'text-amber-400 font-bold';
      case 'ERROR':
        return 'text-rose-400 font-bold';
      case 'INFO':
      default:
        return 'text-zinc-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-4 gap-3 select-none overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="font-pixel text-xs text-zinc-200 font-bold">MINDCRAFT LIVE CONSOLE</span>
          <span className="text-[10px] text-zinc-500">1.21.11 Process Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadLogs}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors text-[11px]"
            title="Export logs as .txt file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={onClearLogs}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-300 transition-colors text-[11px]"
            title="Clear terminal buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 overflow-y-auto bg-black/90 border border-zinc-800/80 rounded-xl p-3.5 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
        {logs.length === 0 ? (
          <div className="text-zinc-600 italic">Terminal ready. Waiting for Minecraft 1.21.11 events...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-zinc-600 select-none text-[10px] shrink-0 mt-0.5">[{log.timestamp}]</span>
              <span className={`text-[10px] uppercase shrink-0 mt-0.5 px-1 rounded bg-zinc-900 border border-zinc-800 ${getLevelColor(log.level)}`}>
                {log.level}
              </span>
              <span className="text-zinc-200 whitespace-pre-wrap break-all flex-1">
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Stdin Input Bar */}
      <form onSubmit={handleRun} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
        <span className="text-emerald-400 font-bold pl-2 select-none">&gt;</span>
        <input
          type="text"
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Execute /say, !command, or 'js: bot.health'..."
          className="flex-1 bg-transparent border-0 outline-none px-2 text-xs text-zinc-100 placeholder-zinc-500 font-mono"
        />
        <button
          type="submit"
          disabled={!cmdInput.trim() || isExecuting}
          className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
          <span>Exec</span>
        </button>
      </form>

      {/* Shortcuts */}
      <div className="flex items-center gap-2 overflow-x-auto text-[10px] text-zinc-400">
        <span className="text-zinc-600 shrink-0">Shortcuts:</span>
        <button
          type="button"
          onClick={() => setCmdInput('!stop')}
          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
        >
          !stop
        </button>
        <button
          type="button"
          onClick={() => setCmdInput('!inventory')}
          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
        >
          !inventory
        </button>
        <button
          type="button"
          onClick={() => setCmdInput('!collectBlocks oak_log 5')}
          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
        >
          !collectBlocks oak_log 5
        </button>
        <button
          type="button"
          onClick={() => setCmdInput('/say Hello world from 1.21.11!')}
          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
        >
          /say Hello
        </button>
        <button
          type="button"
          onClick={() => setCmdInput('js: bot.entity.position')}
          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
        >
          js: bot.entity.position
        </button>
      </div>
    </div>
  );
};
