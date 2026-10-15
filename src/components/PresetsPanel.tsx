import React, { useState } from 'react';
import { Sliders, Shield, Sword, Pickaxe, HeartHandshake, Check, Save } from 'lucide-react';
import type { BotStateSummary, BotModes } from '../types/minecraft';

interface PresetsPanelProps {
  botState: BotStateSummary;
  onUpdateSettings: (settings: { preset?: string; modes?: Partial<BotModes>; systemInstruction?: string }) => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({ botState, onUpdateSettings }) => {
  const [selectedPreset, setSelectedPreset] = useState(botState.preset || 'survival');
  const [modes, setModes] = useState<BotModes>(botState.modes);
  const [systemInstruction, setSystemInstruction] = useState(
    `You are MindCraft, an autonomous Minecraft AI agent built on the Mindcraft framework with Mineflayer. You operate as an intelligent companion in Minecraft 1.21.11 (Protocol 774).
You can execute real Mineflayer commands:
- !stop : stops current action
- !followPlayer <player> : follows player
- !goToPlayer <player> : pathfinds to player
- !collectBlocks <blockName> [count] : collects wood, stone, ores, etc.
- !craftRecipe <itemName> [count] : crafts items
- !attack <mob> : attacks hostile mob or animal
- !equip <item> : equips weapon or armor
- !consume <food> : eats food
- !newAction <prompt> : creates and executes custom code
- /say <msg> : speaks in game chat`
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const presets = [
    {
      id: 'survival',
      title: 'Survivalist',
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      desc: 'Balanced survival routine in 1.21.11: manages health, hunts food, collects dropped items, guards against hostiles, and avoids hazards.',
    },
    {
      id: 'combat_guard',
      title: 'Combat Guard',
      icon: <Sword className="w-5 h-5 text-rose-400" />,
      desc: 'Aggressive sentry mode: attacks hostile mobs on sight, shields against arrows, defends teammates, cowardice disabled.',
    },
    {
      id: 'resource_gatherer',
      title: 'Resource Gatherer',
      icon: <Pickaxe className="w-5 h-5 text-amber-400" />,
      desc: 'Mining & Logging automation: pathfinds to trees and ores, quarries stone, and stores resources safely.',
    },
    {
      id: 'passive_companion',
      title: 'Passive Companion',
      icon: <HeartHandshake className="w-5 h-5 text-cyan-400" />,
      desc: 'Peaceful follower: stays near player, flees from creepers/skeletons, gathers dropped items, and never attacks players.',
    },
  ];

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    onUpdateSettings({ preset: presetId });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleToggleMode = (modeKey: keyof BotModes) => {
    const updated = { ...modes, [modeKey]: !modes[modeKey] };
    setModes(updated);
    onUpdateSettings({ modes: updated });
  };

  const handleSaveInstructions = () => {
    onUpdateSettings({ systemInstruction });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const modeDescriptions: Record<string, string> = {
    self_preservation: 'Evades lava, deep water drowning, fire, and fatal cliff falls.',
    self_defense: 'Attacks back when attacked by mobs or hostile entities.',
    hunting: 'Automatically kills nearby animals for food when hunger drops.',
    item_collecting: 'Vacuums up and stores dropped item entities within 16 blocks.',
    torch_placing: 'Places torches when local block light level drops below 7.',
    unstuck: 'Jumps or breaks obstructing blocks when pathfinding is impeded.',
    cowardice: 'Flees from creepers and lethal mobs instead of fighting.',
    elbow_room: 'Maintains comfortable standing distance from friendly players.',
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 overflow-y-auto select-none space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="font-pixel text-base text-zinc-100 font-bold flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <span>PRESETS & BEHAVIOR MODES</span>
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Configure preset profiles and autonomous Mindcraft behavioral loops for 1.21.11.
          </p>
        </div>
        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-600/60 rounded-md text-emerald-400 font-mono text-xs">
            <Check className="w-3.5 h-3.5" />
            <span>Preset Applied!</span>
          </div>
        )}
      </div>

      {/* Preset Profiles */}
      <div>
        <h3 className="font-pixel text-xs text-zinc-300 uppercase tracking-wider mb-3">
          1. Autonomous Bot Presets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {presets.map((p) => {
            const isSelected = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-zinc-900 border-emerald-500 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/50'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-800 shrink-0">
                  {p.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-100">{p.title}</span>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{p.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Behavior Mode Toggles */}
      <div>
        <h3 className="font-pixel text-xs text-zinc-300 uppercase tracking-wider mb-3">
          2. Mindcraft Behavioral Mode Switches
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(modes) as Array<keyof BotModes>).map((key) => {
            const val = modes[key];
            return (
              <div
                key={key}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-zinc-200 capitalize">
                      {key.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => handleToggleMode(key)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        val ? 'bg-emerald-600' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          val ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    {modeDescriptions[key] || 'Autonomous behavior loop toggle.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Instructions Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-pixel text-xs text-zinc-300 uppercase tracking-wider">
            3. AI Mind System Instructions Prompt
          </h3>
          <button
            onClick={handleSaveInstructions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Prompt Rules</span>
          </button>
        </div>
        <textarea
          rows={6}
          value={systemInstruction}
          onChange={(e) => setSystemInstruction(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500/70 transition-colors"
          placeholder="System prompt instructions for the AI's mind in 1.21.11..."
        />
      </div>
    </div>
  );
};
