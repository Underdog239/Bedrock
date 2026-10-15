import React, { useState } from 'react';
import { Zap, Square, Compass, Axe, Shield, Swords, Sparkles } from 'lucide-react';
import type { BotStateSummary } from '../types/minecraft';

interface MindcraftActionsProps {
  botState: BotStateSummary;
  onExecuteCommand: (cmd: string) => Promise<string | void>;
}

export const MindcraftActions: React.FC<MindcraftActionsProps> = ({ onExecuteCommand }) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runAction = async (cmd: string) => {
    setIsRunning(true);
    setActionFeedback(null);
    try {
      const res = await onExecuteCommand(cmd);
      setActionFeedback(typeof res === 'string' ? res : `Executed: ${cmd}`);
    } finally {
      setIsRunning(false);
    }
  };

  const actions = [
    {
      title: 'Emergency Stop',
      cmd: '!stop',
      icon: <Square className="w-4 h-4 text-rose-400 fill-current" />,
      desc: 'Halts all movement, mining, and combat routines instantly.',
    },
    {
      title: 'Follow Player',
      cmd: '!followPlayer Steve',
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
      desc: 'Pathfinds and continuously follows nearest target player.',
    },
    {
      title: 'Harvest 5 Oak Logs',
      cmd: '!collectBlocks oak_log 5',
      icon: <Axe className="w-4 h-4 text-amber-400" />,
      desc: 'Locates nearest tree in 1.21.11, cuts trunk logs, and collects drops.',
    },
    {
      title: 'Mine 8 Cobblestone',
      cmd: '!collectBlocks stone 8',
      icon: <Axe className="w-4 h-4 text-cyan-400" />,
      desc: 'Mines surface or underground stone blocks.',
    },
    {
      title: 'Attack Nearest Zombie',
      cmd: '!attack zombie',
      icon: <Swords className="w-4 h-4 text-rose-400" />,
      desc: 'Engages nearest hostile zombie with equipped weapon.',
    },
    {
      title: 'Auto-Eat Food',
      cmd: '!consume',
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
      desc: 'Selects food from hotbar and restores hunger saturation.',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 overflow-y-auto select-none space-y-6">
      <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="font-pixel text-base text-zinc-100 font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <span>MINDCRAFT 1.21.11 ACTIONS & CODER</span>
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Trigger real Mindcraft actions or synthesize dynamic Mineflayer code via !newAction.
          </p>
        </div>
        {actionFeedback && (
          <div className="max-w-md bg-zinc-900 border border-emerald-600/60 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-400 truncate">
            {actionFeedback}
          </div>
        )}
      </div>

      {/* !newAction Dynamic Code Synthesizer */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="font-pixel text-xs text-purple-400 font-bold uppercase tracking-wider">
            !newAction Autonomous Code Synthesizer
          </h3>
        </div>
        <p className="text-zinc-400 text-xs">
          Enter any natural language task. Mindcraft's Coder will generate and execute custom Mineflayer JavaScript code directly on the bot for Minecraft 1.21.11.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customPrompt.trim()) {
              runAction(`!newAction ${customPrompt.trim()}`);
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. 'Build a 3-block high stone pillar beneath you' or 'Scan 20 blocks for iron ore'..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={!customPrompt.trim() || isRunning}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow transition-colors disabled:opacity-50"
          >
            Synthesize & Execute
          </button>
        </form>
      </div>

      {/* Quick Action Cards */}
      <div>
        <h3 className="font-pixel text-xs text-zinc-300 uppercase tracking-wider mb-3">
          Mindcraft Built-in Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((act, idx) => (
            <button
              key={idx}
              onClick={() => runAction(act.cmd)}
              disabled={isRunning}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 rounded-xl p-4 text-left transition-all disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-black/60 border border-zinc-800">
                    {act.icon}
                  </div>
                  <span className="font-bold text-xs text-zinc-100">{act.title}</span>
                </div>
                <code className="text-[10px] font-mono text-zinc-500 bg-black/60 px-1.5 py-0.5 rounded">
                  {act.cmd.split(' ')[0]}
                </code>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">{act.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
