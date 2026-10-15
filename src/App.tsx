import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { RealCameraView } from './components/RealCameraView';
import { AiMindChat } from './components/AiMindChat';
import { PresetsPanel } from './components/PresetsPanel';
import { ServerConnectionPanel } from './components/ServerConnectionPanel';
import { LiveTerminal } from './components/LiveTerminal';
import { InventoryView } from './components/InventoryView';
import { MindcraftActions } from './components/MindcraftActions';
import {
  MINECRAFT_VERSION_1_21_11,
  MINECRAFT_PROTOCOL_774,
  type BotStateSummary,
  type TerminalLogEntry,
} from './types/minecraft';
import type { BotServerConfig } from './server/botManager';
import { apiRequest } from './lib/api';

const defaultState: BotStateSummary = {
  connected: false,
  connecting: false,
  error: null,
  serverHost: '127.0.0.1',
  serverPort: 25565,
  username: 'MindBot',
  version: MINECRAFT_VERSION_1_21_11,
  protocolVersion: MINECRAFT_PROTOCOL_774,
  auth: 'offline',
  msaAuth: null,
  health: 20,
  maxHealth: 20,
  food: 20,
  saturation: 5,
  armor: 0,
  experience: { level: 0, points: 0, progress: 0 },
  position: { x: 0, y: 64, z: 0 },
  yaw: 0,
  pitch: 0,
  gameMode: 'survival',
  biome: 'plains',
  timeOfDay: 6000,
  isRaining: false,
  ping: 15,
  currentTask: 'Idle - Standing by',
  activeGoal: 'Assist player in Minecraft 1.21.11',
  inventory: [],
  equipment: {
    heldItem: null,
    offHand: null,
    head: null,
    torso: null,
    legs: null,
    feet: null,
  },
  modes: {
    self_preservation: true,
    self_defense: true,
    hunting: true,
    item_collecting: true,
    torch_placing: true,
    unstuck: true,
    cowardice: false,
    elbow_room: true,
  },
  preset: 'survival',
  mindThought: 'Awaiting connection to Minecraft 1.21.11 server (Protocol 774)...',
  mindMood: 'Ready',
  viewerPort: 3001,
  cameraStatus: 'offline',
  cameraError: null,
  localServerRunning: false,
};

export default function App() {
  const [botState, setBotState] = useState<BotStateSummary>(defaultState);
  const [logs, setLogs] = useState<TerminalLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<
    'camera' | 'mind' | 'presets' | 'server' | 'terminal' | 'inventory' | 'actions'
  >('camera');

  const fetchState = useCallback(async () => {
    try {
      const data = await apiRequest<BotStateSummary>('/api/bot/status');
      setBotState(data);
    } catch {
      // Backend may be starting. Keep the last known state while it recovers.
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await apiRequest<TerminalLogEntry[]>('/api/bot/logs');
      setLogs(data);
    } catch {
      // Keep the last logs if a polling request is interrupted.
    }
  }, []);

  useEffect(() => {
    fetchState();
    fetchLogs();
    const interval = setInterval(() => {
      fetchState();
      fetchLogs();
    }, 1500);
    return () => clearInterval(interval);
  }, [fetchState, fetchLogs]);

  const handleConnect = async (customConfig?: Partial<BotServerConfig>) => {
    try {
      setBotState((prev) => ({ ...prev, connecting: true, error: null }));
      const data = await apiRequest<{ success: boolean; message: string }>('/api/bot/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customConfig || {}),
      });
      if (!data.success) {
        setBotState((prev) => ({ ...prev, connecting: false, error: data.message }));
      }
      fetchState();
      fetchLogs();
    } catch (err: any) {
      setBotState((prev) => ({ ...prev, connecting: false, error: err.message }));
    }
  };

  const handleDisconnect = async () => {
    try {
      await apiRequest('/api/bot/disconnect', { method: 'POST' });
      fetchState();
      fetchLogs();
    } catch {
      // Ignore
    }
  };

  const handleStartLocalServer = async (port = 25565) => {
    try {
      await apiRequest('/api/server/start-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
      });
      fetchState();
      fetchLogs();
    } catch {
      // Ignore
    }
  };

  const handleStopLocalServer = async () => {
    try {
      await apiRequest('/api/server/stop-local', { method: 'POST' });
      fetchState();
      fetchLogs();
    } catch {
      // Ignore
    }
  };

  const handleRestartCamera = async () => {
    try {
      const data = await apiRequest<{ success: boolean; message: string }>('/api/bot/camera/restart', { method: 'POST' });
      if (!data.success) {
        setBotState((prev) => ({ ...prev, cameraStatus: 'error', cameraError: data.message || 'Unable to restart camera.' }));
      }
      fetchState();
      fetchLogs();
    } catch (err: any) {
      setBotState((prev) => ({ ...prev, cameraStatus: 'error', cameraError: err.message || 'Unable to restart camera.' }));
    }
  };

  const handleExecuteCommand = async (command: string): Promise<string | void> => {
    try {
      const data = await apiRequest<{ result: string }>('/api/bot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      fetchState();
      fetchLogs();
      return data.result;
    } catch (err: any) {
      fetchLogs();
      return `Command failed: ${err.message}`;
    }
  };

  const handleExecuteTerminal = async (code: string): Promise<string | void> => {
    try {
      const data = await apiRequest<{ output: string }>('/api/bot/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      fetchLogs();
      return data.output;
    } catch (err: any) {
      fetchLogs();
      return `Execution error: ${err.message}`;
    }
  };

  const handleUpdateSettings = async (settings: {
    preset?: string;
    modes?: any;
    systemInstruction?: string;
  }) => {
    try {
      const data = await apiRequest<{ success: boolean; state?: BotStateSummary }>('/api/bot/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (data.state) setBotState(data.state);
      fetchLogs();
    } catch {
      // Ignore
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-zinc-100 overflow-hidden font-sans">
      <Header
        botState={botState}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onConnect={() => handleConnect()}
        onDisconnect={handleDisconnect}
        onStartLocalServer={() => handleStartLocalServer(25565)}
        onStopLocalServer={handleStopLocalServer}
      />

      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'camera' && (
          <RealCameraView
            botState={botState}
            onConnect={() => handleConnect()}
            onStartLocalServer={() => handleStartLocalServer(25565)}
            onRestartCamera={handleRestartCamera}
          />
        )}
        {activeTab === 'mind' && (
          <AiMindChat
            botState={botState}
            onSendCommand={handleExecuteCommand}
          />
        )}
        {activeTab === 'presets' && (
          <PresetsPanel
            botState={botState}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
        {activeTab === 'server' && (
          <ServerConnectionPanel
            botState={botState}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onStartLocalServer={handleStartLocalServer}
            onStopLocalServer={handleStopLocalServer}
          />
        )}
        {activeTab === 'terminal' && (
          <LiveTerminal
            logs={logs}
            onClearLogs={handleClearLogs}
            onExecuteCommand={handleExecuteTerminal}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryView
            botState={botState}
            onExecuteCommand={handleExecuteCommand}
          />
        )}
        {activeTab === 'actions' && (
          <MindcraftActions
            botState={botState}
            onExecuteCommand={handleExecuteCommand}
          />
        )}
      </main>
    </div>
  );
}
