import React from 'react';
import { Bot, Terminal, Video, Brain, Sliders, Shield, Play, Square, Server, Zap } from 'lucide-react';
import type { BotStateSummary } from '../types/minecraft';

interface HeaderProps {
  botState: BotStateSummary;
  activeTab: 'camera' | 'mind' | 'presets' | 'server' | 'terminal' | 'inventory' | 'actions';
  onTabChange: (tab: 'camera' | 'mind' | 'presets' | 'server' | 'terminal' | 'inventory' | 'actions') => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartLocalServer: () => void;
  onStopLocalServer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  botState,
  activeTab,
  onTabChange,
  onConnect,
  onDisconnect,
  onStartLocalServer,
  onStopLocalServer,
}) => {
  return (
    <header className="bg-zinc-950 border-b border-zinc-800 text-zinc-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Brand & Framework ID */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-sm tracking-wider text-emerald-400 font-bold">MINDCRAFT BOT</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold">
              1.21.11 (v774)
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center gap-2 font-mono">
            <span>{botState.username}</span>
            <span>•</span>
            <span className="text-zinc-500">{botState.serverHost}:{botState.serverPort}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs font-medium">
        <button
          onClick={() => onTabChange('camera')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            activeTab === 'camera'
              ? 'bg-emerald-600 text-white shadow font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Real Camera</span>
        </button>
        <button
          onClick={() => onTabChange('mind')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            activeTab === 'mind'
              ? 'bg-emerald-600 text-white shadow font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>AI Mind</span>
        </button>
        <button
          onClick={() => onTabChange('server')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            activeTab === 'server'
              ? 'bg-emerald-600 text-white shadow font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Server IP:Port</span>
        </button>
        <button
          onClick={() => onTabChange('presets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            activeTab === 'presets'
              ? 'bg-emerald-600 text-white shadow font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Presets & Modes</span>
        </button>
        <button
          onClick={() => onTabChange('actions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            activeTab === 'actions'
              ? 'bg-emerald-600 text-white shadow font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Actions & Coder</span>
        </button>
        <button
          onClick={() => onTabChange('terminal')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            activeTab === 'terminal'
              ? 'bg-emerald-600 text-white shadow font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Terminal</span>
        </button>
        <button
          onClick={() => onTabChange('inventory')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
            activeTab === 'inventory'
              ? 'bg-emerald-600 text-white shadow font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Inventory</span>
        </button>
      </nav>

      {/* Bot Status & Action Controls */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg text-xs">
          {botState.connected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-semibold font-mono">ONLINE</span>
              <span className="text-zinc-500 font-mono">[{botState.position.x}, {botState.position.y}, {botState.position.z}]</span>
            </>
          ) : botState.connecting ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-400 font-medium">CONNECTING...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-zinc-400 font-mono">DISCONNECTED</span>
            </>
          )}
        </div>

        {botState.connected ? (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900 text-xs font-medium transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Disconnect</span>
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={botState.connecting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Connect Bot</span>
          </button>
        )}

        {botState.localServerRunning ? (
          <button
            onClick={onStopLocalServer}
            className="px-2.5 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-rose-400 hover:bg-zinc-700 text-xs font-mono"
            title="Stop Embedded 1.21.11 Protocol 774 Server"
          >
            Stop 1.21.11
          </button>
        ) : (
          <button
            onClick={onStartLocalServer}
            className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-emerald-400 text-xs font-mono"
            title="Launch an embedded Minecraft 1.21.11 Protocol 774 server on 127.0.0.1:25565"
          >
            + 1.21.11 Server
          </button>
        )}
      </div>
    </header>
  );
};
