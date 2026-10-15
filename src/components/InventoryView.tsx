import React from 'react';
import { Shield, Box, HardHat } from 'lucide-react';
import type { BotStateSummary } from '../types/minecraft';

interface InventoryViewProps {
  botState: BotStateSummary;
  onExecuteCommand: (cmd: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ botState, onExecuteCommand }) => {
  const slots = Array.from({ length: 36 }, (_, i) => {
    const slotId = i + 9;
    const item = botState.inventory.find((inv) => inv.slot === slotId);
    return { slotId, item };
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 overflow-y-auto select-none space-y-6">
      <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="font-pixel text-base text-zinc-100 font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span>MINECRAFT 1.21.11 INVENTORY & EQUIPMENT</span>
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Real-time live inventory state received from the connected Minecraft server.
          </p>
        </div>
        <button
          onClick={() => onExecuteCommand('!inventory')}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
        >
          Refresh Query
        </button>
      </div>

      {/* Equipment Slots */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="font-pixel text-xs text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <HardHat className="w-4 h-4 text-cyan-400" />
          <span>Equipped Armor & Hand</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <span className="text-[10px] text-zinc-500 font-mono block mb-1">HEAD</span>
            <span className="text-xs font-bold text-zinc-200 truncate block">
              {botState.equipment.head || 'Empty'}
            </span>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <span className="text-[10px] text-zinc-500 font-mono block mb-1">CHEST</span>
            <span className="text-xs font-bold text-zinc-200 truncate block">
              {botState.equipment.torso || 'Empty'}
            </span>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <span className="text-[10px] text-zinc-500 font-mono block mb-1">LEGS</span>
            <span className="text-xs font-bold text-zinc-200 truncate block">
              {botState.equipment.legs || 'Empty'}
            </span>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <span className="text-[10px] text-zinc-500 font-mono block mb-1">FEET</span>
            <span className="text-xs font-bold text-zinc-200 truncate block">
              {botState.equipment.feet || 'Empty'}
            </span>
          </div>

          <div className="bg-zinc-950 border border-emerald-800/60 rounded-lg p-3 text-center">
            <span className="text-[10px] text-emerald-400 font-mono block mb-1">MAIN HAND</span>
            <span className="text-xs font-bold text-emerald-300 truncate block">
              {botState.equipment.heldItem || 'Empty'}
            </span>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <span className="text-[10px] text-zinc-500 font-mono block mb-1">OFF HAND</span>
            <span className="text-xs font-bold text-zinc-200 truncate block">
              {botState.equipment.offHand || 'Empty'}
            </span>
          </div>
        </div>
      </div>

      {/* 36 Inventory Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="font-pixel text-xs text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Box className="w-4 h-4 text-emerald-400" />
          <span>36-Slot Player Inventory Grid</span>
        </h3>
        {botState.inventory.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs font-mono">
            Inventory is currently empty. Connect to a 1.21.11 server and gather blocks or items.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
            {slots.map(({ slotId, item }) => (
              <div
                key={slotId}
                className={`relative h-14 rounded-lg border p-1.5 flex flex-col justify-between transition-colors ${
                  item
                    ? 'bg-zinc-950 border-zinc-700 hover:border-emerald-500'
                    : 'bg-zinc-950/40 border-zinc-900 opacity-40'
                }`}
              >
                <span className="text-[9px] text-zinc-600 font-mono select-none">
                  #{slotId}
                </span>
                {item && (
                  <>
                    <span className="text-[11px] font-bold text-zinc-100 truncate">
                      {item.displayName || item.name}
                    </span>
                    <span className="absolute bottom-1 right-1.5 font-pixel text-[10px] text-emerald-400 font-bold">
                      x{item.count}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
