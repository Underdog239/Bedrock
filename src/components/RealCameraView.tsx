import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, Maximize2, Compass, Heart, Utensils, Eye, Play, Wifi } from 'lucide-react';
import type { BotStateSummary } from '../types/minecraft';

interface RealCameraViewProps {
  botState: BotStateSummary;
  onConnect: () => void;
  onStartLocalServer: () => void;
}

export const RealCameraView: React.FC<RealCameraViewProps> = ({
  botState,
  onConnect,
  onStartLocalServer,
}) => {
  const [key, setKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const renderHearts = () => {
    const hearts = [];
    const hp = Math.max(0, Math.min(20, botState.health));
    for (let i = 0; i < 10; i++) {
      const heartVal = hp - i * 2;
      const isFull = heartVal >= 2;
      const isHalf = heartVal === 1;
      hearts.push(
        <div key={i} className="relative inline-block w-4 h-4">
          <Heart
            className={`w-4 h-4 ${
              isFull
                ? 'text-red-500 fill-red-500'
                : isHalf
                ? 'text-red-400 fill-red-400 opacity-80'
                : 'text-zinc-600 fill-zinc-800'
            } drop-shadow`}
          />
        </div>
      );
    }
    return hearts;
  };

  const renderFood = () => {
    const drumsticks = [];
    const food = Math.max(0, Math.min(20, botState.food));
    for (let i = 0; i < 10; i++) {
      const foodVal = food - i * 2;
      const isFull = foodVal >= 2;
      drumsticks.push(
        <div key={i} className="relative inline-block w-4 h-4">
          <Utensils
            className={`w-3.5 h-3.5 ${
              isFull ? 'text-amber-500 fill-amber-500' : 'text-zinc-600'
            } drop-shadow`}
          />
        </div>
      );
    }
    return drumsticks;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* Top Camera Status Banner */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-zinc-800 rounded-lg px-3 py-1.5 shadow-lg pointer-events-auto">
          <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-pixel text-xs text-emerald-400 font-bold">REAL CAMERA POV</span>
          <span className="text-[11px] text-zinc-400 font-mono">
            Minecraft 1.21.11 ({botState.connected ? 'STREAM ACTIVE' : 'STANDBY'})
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-black/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Reload Camera Stream"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            className="p-2 rounded-lg bg-black/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Viewport */}
      {botState.connected ? (
        <div className="relative w-full h-full">
          <iframe
            key={key}
            src="/viewer"
            title="Real Minecraft Bot POV"
            className="w-full h-full border-0 bg-slate-950"
            allow="fullscreen"
          />

          {/* Minecraft Crosshair Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 relative opacity-75">
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white -translate-y-1/2 mix-blend-difference" />
              <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white -translate-x-1/2 mix-blend-difference" />
            </div>
          </div>

          {/* In-Game HUD: Hearts & Hunger */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
            <div className="flex items-center justify-between w-72 px-1">
              <div className="flex items-center gap-0.5">{renderHearts()}</div>
              <div className="flex items-center gap-0.5">{renderFood()}</div>
            </div>

            <div className="relative w-72 h-2 bg-zinc-900 border border-zinc-700 rounded-sm overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-lime-500 to-emerald-400"
                style={{ width: `${Math.round((botState.experience.progress || 0) * 100)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-pixel text-[10px] text-lime-400 font-bold drop-shadow">
                {botState.experience.level || 0}
              </span>
            </div>

            {botState.equipment.heldItem && (
              <div className="bg-black/80 px-3 py-0.5 rounded text-[11px] font-mono text-zinc-300 border border-zinc-800">
                Held: <span className="text-cyan-400 font-bold">{botState.equipment.heldItem}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Standby / Disconnected Camera Viewfinder */
        <div className="flex flex-col items-center justify-center max-w-md p-8 text-center bg-zinc-950/90 border border-zinc-800 rounded-2xl shadow-2xl z-10 m-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
            <Eye className="w-8 h-8" />
          </div>
          <h2 className="font-pixel text-base text-zinc-100 font-bold mb-2">1.21.11 CAMERA STREAM STANDBY</h2>
          <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
            Connect the bot to your Minecraft 1.21.11 server (Protocol 774) or launch an embedded 1.21.11 test world to stream live camera POV through the bot's eyes.
          </p>
          <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 text-left mb-6 font-mono text-xs text-zinc-300 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-zinc-500">Target Server:</span>
              <span className="text-emerald-400">{botState.serverHost}:{botState.serverPort}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Target Protocol:</span>
              <span className="text-cyan-400 font-bold">1.21.11 (Protocol 774)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Bot Username:</span>
              <span className="text-zinc-200">{botState.username}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={onConnect}
              disabled={botState.connecting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{botState.connecting ? 'Connecting...' : 'Connect to 1.21.11'}</span>
            </button>
            {!botState.localServerRunning && (
              <button
                onClick={onStartLocalServer}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-emerald-400 font-semibold text-xs transition-colors"
              >
                <span>+ Launch 1.21.11 Server</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Info HUD: Coordinates & Compass */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-zinc-300 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Compass className="w-3.5 h-3.5" />
            <span className="font-bold">XYZ:</span>
          </div>
          <span>
            {botState.position.x} / {botState.position.y} / {botState.position.z}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">
            Yaw: {botState.yaw}° Pitch: {botState.pitch}°
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-amber-400 font-semibold">{botState.gameMode.toUpperCase()}</span>
        </div>
      </div>

      {/* Task & Active Goal Banner */}
      <div className="absolute bottom-3 right-4 z-20 pointer-events-none max-w-sm hidden md:block">
        <div className="bg-black/80 backdrop-blur-md border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-zinc-300">
          <div className="text-zinc-400 truncate">
            Task: <span className="text-cyan-400 font-medium">{botState.currentTask}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
