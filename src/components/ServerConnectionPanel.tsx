import React, { useState } from 'react';
import { Server, Play, Square, Wifi, AlertCircle, Layers } from 'lucide-react';
import {
  MINECRAFT_VERSION_1_21_11,
  MINECRAFT_PROTOCOL_774,
  type BotStateSummary,
} from '../types/minecraft';
import type { BotServerConfig } from '../server/botManager';

interface ServerConnectionPanelProps {
  botState: BotStateSummary;
  onConnect: (config: Partial<BotServerConfig>) => void;
  onDisconnect: () => void;
  onStartLocalServer: (port: number) => void;
  onStopLocalServer: () => void;
}

export const ServerConnectionPanel: React.FC<ServerConnectionPanelProps> = ({
  botState,
  onConnect,
  onDisconnect,
  onStartLocalServer,
  onStopLocalServer,
}) => {
  const [host, setHost] = useState(botState.serverHost || '127.0.0.1');
  const [port, setPort] = useState(botState.serverPort || 25565);
  const [username, setUsername] = useState(botState.username || 'MindBot');
  const [version, setVersion] = useState(botState.version || MINECRAFT_VERSION_1_21_11);
  const [auth, setAuth] = useState<'offline' | 'microsoft'>(
    (botState.auth as any) || 'offline'
  );
  const [autoReconnect, setAutoReconnect] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect({
      host,
      port: Number(port),
      username,
      version,
      auth,
      autoReconnect,
    });
  };

  const serverPresets = [
    { label: 'Localhost:25565', host: '127.0.0.1', port: 25565 },
    { label: 'LAN Port:55916', host: '127.0.0.1', port: 55916 },
    { label: 'Custom Port:25566', host: '127.0.0.1', port: 25566 },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 overflow-y-auto select-none space-y-6">
      {/* Title */}
      <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="font-pixel text-base text-zinc-100 font-bold flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            <span>MINECRAFT SERVER CONNECTION</span>
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Connect the real Mineflayer bot to any Minecraft Java Edition server. Configured for version 1.21.11 (Protocol 774).
          </p>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono">
          <Wifi className={`w-4 h-4 ${botState.connected ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span className={botState.connected ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
            {botState.connected ? `CONNECTED (${botState.ping}ms)` : botState.connecting ? 'CONNECTING...' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Protocol 774 Banner */}
      <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">Active Protocol:</span>
          <span className="text-zinc-200">Minecraft Java {MINECRAFT_VERSION_1_21_11} (Network Protocol {MINECRAFT_PROTOCOL_774})</span>
        </div>
        <span className="text-zinc-400 text-[11px] hidden sm:inline">Official Minecraft + Mineflayer 4.39.0 Engine</span>
      </div>

      {/* Microsoft Device Code Auth Card */}
      {botState.msaAuth && (
        <div className="bg-amber-950/60 border border-amber-600 rounded-xl p-5 shadow-2xl animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h3 className="font-pixel text-xs text-amber-300 font-bold uppercase tracking-wider">
              Microsoft Account Sign-In Required (online-mode=true)
            </h3>
          </div>
          <p className="text-zinc-300 text-xs mb-4">
            The target server requires a verified Mojang/Microsoft session. Go to{' '}
            <a
              href={botState.msaAuth.verification_uri}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 underline font-bold"
            >
              {botState.msaAuth.verification_uri}
            </a>{' '}
            and enter the code below to authorize your bot:
          </p>
          <div className="flex items-center gap-4 bg-black/80 border border-amber-500/50 rounded-xl p-4">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono block mb-1">ONE-TIME CODE:</span>
              <span className="font-mono text-2xl font-bold tracking-widest text-amber-400 select-all">
                {botState.msaAuth.user_code}
              </span>
            </div>
            <a
              href={botState.msaAuth.verification_uri}
              target="_blank"
              rel="noreferrer"
              className="ml-auto px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow transition-colors"
            >
              Open Microsoft Sign-In
            </a>
          </div>
        </div>
      )}

      {botState.error && (
        <div className="bg-rose-950/70 border border-rose-800/80 rounded-xl p-4 flex flex-col gap-3 text-rose-200 text-xs shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <span className="font-bold block text-rose-300 mb-1">Connection Disconnected:</span>
              <span>{botState.error}</span>
            </div>
          </div>
          {(botState.error.includes('online-mode') || botState.error.includes('verify username') || botState.error.includes('invalid session')) && (
            <div className="bg-black/50 border border-rose-900 rounded-lg p-3 text-[11px] font-mono space-y-2">
              <div className="text-amber-400 font-bold">Why did this happen?</div>
              <div className="text-zinc-300">
                Your Minecraft server has <code className="text-rose-300 bg-black/60 px-1 py-0.5 rounded">online-mode=true</code> enabled in its <code className="text-rose-300 bg-black/60 px-1 py-0.5 rounded">server.properties</code>. It requires a verified Microsoft/Mojang account.
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuth('microsoft');
                    onConnect({ host, port: Number(port), username, version, auth: 'microsoft', autoReconnect });
                  }}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-colors"
                >
                  Quick Fix: Switch to Microsoft Auth & Connect
                </button>
                <span className="text-zinc-500 text-[10px]">OR set online-mode=false in your server.properties</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connection Form */}
      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Server IP / Hostname</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="e.g. 127.0.0.1 or play.server.net"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="25565"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Bot In-Game Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="MindBot"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Minecraft Version (Protocol)</label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-emerald-500"
            >
              <option value="1.21.11">1.21.11 (Protocol 774 - Recommended / Current)</option>
              <option value="1.21.6">1.21.6 (Protocol 771)</option>
              <option value="1.21.4">1.21.4 (Protocol 769)</option>
              <option value="1.21.1">1.21.1 (Protocol 767)</option>
              <option value="1.20.4">1.20.4 (Protocol 765)</option>
              <option value="1.19.4">1.19.4 (Protocol 762)</option>
              <option value="1.16.5">1.16.5 (Protocol 754)</option>
              <option value="auto">Auto-negotiate protocol with server</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Authentication Mode</label>
            <select
              value={auth}
              onChange={(e) => setAuth(e.target.value as any)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-emerald-500"
            >
              <option value="offline">Offline / Cracked / LAN (No Microsoft Account required)</option>
              <option value="microsoft">Microsoft Account (Official Online Servers)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="autoRec"
              checked={autoReconnect}
              onChange={(e) => setAutoReconnect(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-emerald-600 focus:ring-0"
            />
            <label htmlFor="autoRec" className="text-xs text-zinc-300 font-mono">
              Auto-reconnect on server restart / kick
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-800/80">
          {botState.connected ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-lg"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Disconnect Bot</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={botState.connecting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{botState.connecting ? 'Connecting...' : 'Connect to Minecraft 1.21.11'}</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto text-xs font-mono">
            <span className="text-zinc-500">Presets:</span>
            {serverPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setHost(p.host);
                  setPort(p.port);
                }}
                className="px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px]"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Embedded 1.21.11 Server Section */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-pixel text-xs text-zinc-200 font-bold flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>EMBEDDED MINECRAFT 1.21.11 (PROTOCOL 774) TEST SERVER</span>
          </h3>
          <p className="text-zinc-400 text-xs">
            Want to test immediately without opening an external client? Spawn a real local Minecraft 1.21.11 protocol server on port 25565.
          </p>
        </div>
        <div>
          {botState.localServerRunning ? (
            <button
              onClick={onStopLocalServer}
              className="px-4 py-2 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900 text-xs font-mono transition-colors"
            >
              Stop 1.21.11 World
            </button>
          ) : (
            <button
              onClick={() => onStartLocalServer(25565)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
            >
              + Launch 1.21.11 Server (127.0.0.1:25565)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
