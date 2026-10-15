import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Compass,
  Eye,
  Heart,
  LoaderCircle,
  Maximize2,
  Play,
  RefreshCw,
  Utensils,
} from 'lucide-react';
import type { BotStateSummary } from '../types/minecraft';

interface RealCameraViewProps {
  botState: BotStateSummary;
  onConnect: () => void;
  onStartLocalServer: () => void;
  onRestartCamera: () => Promise<void>;
}

export const RealCameraView: React.FC<RealCameraViewProps> = ({
  botState,
  onConnect,
  onStartLocalServer,
  onRestartCamera,
}) => {
  const [frameKey, setFrameKey] = useState(0);
  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [isRestarting, setIsRestarting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (botState.cameraStatus === 'ready') setIsFrameLoading(true);
  }, [botState.cameraStatus]);

  const handleRefresh = () => {
    setIsFrameLoading(true);
    setFrameKey((previous) => previous + 1);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleRestartCamera = async () => {
    setIsRestarting(true);
    try {
      await onRestartCamera();
    } finally {
      setIsRestarting(false);
    }
  };

  const renderHearts = () => {
    const hearts = [];
    const hp = Math.max(0, Math.min(20, botState.health));
    for (let i = 0; i < 10; i++) {
      const heartValue = hp - i * 2;
      const isFull = heartValue >= 2;
      const isHalf = heartValue === 1;
      hearts.push(
        <div key={i} className="relative inline-block h-4 w-4">
          <Heart
            className={`h-4 w-4 drop-shadow ${
              isFull
                ? 'fill-red-500 text-red-500'
                : isHalf
                  ? 'fill-red-400 text-red-400 opacity-80'
                  : 'fill-zinc-800 text-zinc-600'
            }`}
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
      const foodValue = food - i * 2;
      drumsticks.push(
        <div key={i} className="relative inline-block h-4 w-4">
          <Utensils
            className={`h-3.5 w-3.5 drop-shadow ${
              foodValue >= 2 ? 'fill-amber-500 text-amber-500' : 'text-zinc-600'
            }`}
          />
        </div>
      );
    }
    return drumsticks;
  };

  const cameraLabel = botState.cameraStatus === 'ready'
    ? 'STREAM LIVE'
    : botState.cameraStatus === 'starting'
      ? 'STARTING'
      : botState.cameraStatus === 'error'
        ? 'CAMERA ERROR'
        : botState.connected
          ? 'WAITING FOR SPAWN'
          : 'STANDBY';

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full select-none flex-col items-center justify-center overflow-hidden bg-black"
    >
      <div className="pointer-events-none absolute left-4 right-4 top-3 z-20 flex items-center justify-between">
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-zinc-800 bg-black/80 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <Camera
            className={`h-4 w-4 ${botState.cameraStatus === 'ready' ? 'animate-pulse text-emerald-400' : 'text-zinc-400'}`}
          />
          <span className="font-pixel text-xs font-bold text-emerald-400">BOT POV</span>
          <span className="font-mono text-[11px] text-zinc-400">
            Minecraft {botState.version} · {cameraLabel}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={botState.cameraStatus !== 'ready'}
            className="rounded-lg border border-zinc-700 bg-black/80 p-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            title="Reload camera stream"
            aria-label="Reload camera stream"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleFullscreen}
            className="rounded-lg border border-zinc-700 bg-black/80 p-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            title="Toggle fullscreen"
            aria-label="Toggle fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {botState.connected && botState.cameraStatus === 'ready' ? (
        <div className="relative h-full w-full">
          <iframe
            key={frameKey}
            src="/viewer/"
            title="Live Minecraft bot point of view"
            className="h-full w-full border-0 bg-slate-950"
            allow="fullscreen"
            onLoad={() => setIsFrameLoading(false)}
          />

          {isFrameLoading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/60 text-sm text-zinc-300 backdrop-blur-[2px]">
              <span className="flex items-center gap-2 rounded-full border border-zinc-700 bg-black/75 px-4 py-2 font-mono text-xs">
                <LoaderCircle className="h-4 w-4 animate-spin text-emerald-400" />
                Loading live camera…
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-4 w-4 opacity-75">
              <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-white mix-blend-difference" />
              <div className="absolute bottom-0 left-1/2 top-0 w-[2px] -translate-x-1/2 bg-white mix-blend-difference" />
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1.5">
            <div className="flex w-72 items-center justify-between px-1">
              <div className="flex items-center gap-0.5">{renderHearts()}</div>
              <div className="flex items-center gap-0.5">{renderFood()}</div>
            </div>

            <div className="relative h-2 w-72 overflow-hidden rounded-sm border border-zinc-700 bg-zinc-900">
              <div
                className="h-full bg-gradient-to-r from-lime-500 to-emerald-400"
                style={{ width: `${Math.round((botState.experience.progress || 0) * 100)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-pixel text-[10px] font-bold text-lime-400 drop-shadow">
                {botState.experience.level || 0}
              </span>
            </div>

            {botState.equipment.heldItem && (
              <div className="rounded border border-zinc-800 bg-black/80 px-3 py-0.5 font-mono text-[11px] text-zinc-300">
                Held: <span className="font-bold text-cyan-400">{botState.equipment.heldItem}</span>
              </div>
            )}
          </div>
        </div>
      ) : botState.connected ? (
        <div className="z-10 mx-4 flex max-w-lg flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-950/95 p-8 text-center shadow-2xl">
          <div
            className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border ${
              botState.cameraStatus === 'error'
                ? 'border-rose-800 bg-rose-950/50 text-rose-400'
                : 'border-zinc-700 bg-zinc-900 text-emerald-400'
            }`}
          >
            {botState.cameraStatus === 'error' ? (
              <AlertTriangle className="h-8 w-8" />
            ) : (
              <LoaderCircle className="h-8 w-8 animate-spin" />
            )}
          </div>
          <h2 className="font-pixel text-sm font-bold text-zinc-100">
            {botState.cameraStatus === 'error' ? 'CAMERA STREAM FAILED' : 'PREPARING CAMERA STREAM'}
          </h2>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-zinc-400">
            {botState.cameraStatus === 'error'
              ? botState.cameraError || 'The viewer could not be started. Check the server log and retry.'
              : 'The bot is connected. The live view will appear once the world spawn and camera server are ready.'}
          </p>
          {botState.cameraStatus === 'error' && (
            <button
              onClick={handleRestartCamera}
              disabled={isRestarting}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
            >
              {isRestarting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isRestarting ? 'Restarting camera…' : 'Retry camera'}
            </button>
          )}
        </div>
      ) : (
        <div className="z-10 m-4 flex max-w-md flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-950/90 p-8 text-center shadow-2xl">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-emerald-400 shadow-inner">
            <Eye className="h-8 w-8" />
          </div>
          <h2 className="font-pixel text-sm font-bold text-zinc-100">CAMERA STREAM STANDBY</h2>
          <p className="mb-6 mt-3 text-xs leading-relaxed text-zinc-400">
            Connect the bot to a Minecraft server. The camera will start after the bot enters the world.
          </p>
          <div className="mb-6 w-full space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-left font-mono text-xs text-zinc-300">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Target server</span>
              <span className="text-right text-emerald-400">{botState.serverHost}:{botState.serverPort}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Target protocol</span>
              <span className="font-bold text-cyan-400">{botState.version} · {botState.protocolVersion}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Bot username</span>
              <span className="text-right text-zinc-200">{botState.username}</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              onClick={onConnect}
              disabled={botState.connecting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{botState.connecting ? 'Connecting…' : 'Connect bot'}</span>
            </button>
            {!botState.localServerRunning && (
              <button
                onClick={onStartLocalServer}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-zinc-700"
              >
                <span>Launch local server</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-4 z-20">
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black/80 px-3 py-1.5 font-mono text-[11px] text-zinc-300 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Compass className="h-3.5 w-3.5" />
            <span className="font-bold">XYZ:</span>
          </div>
          <span>{botState.position.x} / {botState.position.y} / {botState.position.z}</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">Yaw: {botState.yaw}° Pitch: {botState.pitch}°</span>
          <span className="text-zinc-600">|</span>
          <span className="font-semibold text-amber-400">{botState.gameMode.toUpperCase()}</span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-4 z-20 hidden max-w-sm md:block">
        <div className="rounded-lg border border-zinc-800 bg-black/80 px-3 py-1.5 font-mono text-[11px] text-zinc-300 backdrop-blur-md">
          <div className="truncate text-zinc-400">
            Task: <span className="font-medium text-cyan-400">{botState.currentTask}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
