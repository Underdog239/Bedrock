import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send, Sparkles, Zap, RefreshCw } from 'lucide-react';
import type { BotStateSummary, MindMessage } from '../types/minecraft';

interface AiMindChatProps {
  botState: BotStateSummary;
  onSendCommand: (cmd: string) => void;
}

export const AiMindChat: React.FC<AiMindChatProps> = ({ botState }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<MindMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/bot/mind/history')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
        } else {
          setMessages([
            {
              id: 'init-1',
              role: 'assistant',
              content: `I am MindCraft, your autonomous Minecraft bot running on version 1.21.11 (Protocol 774). You can talk to my cognitive mind directly here or give me tasks. What are your orders?`,
              thought: 'Cognitive loop online. Monitoring 1.21.11 environment and standing by for orders.',
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: MindMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/bot/mind/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sender: 'Player' }),
      });
      const data = await res.json();
      const botMsg: MindMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: data.reply || 'Understood.',
        thought: data.thought,
        commandExecuted: data.actionCommand,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          role: 'assistant',
          content: `Neural connection failure: ${err.message}`,
          thought: 'Error communicating with Mindcraft server module.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'What is your current plan and surroundings in 1.21.11?',
    'Follow me and protect me from hostile mobs',
    '!collectBlocks oak_log 5',
    'Chop wood, craft a pickaxe, and mine 3 iron ore',
    '!stop',
    'Build a safe 3x3 wooden shelter',
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-4 gap-4 overflow-hidden select-none">
      {/* Mind Status Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-700/60 flex items-center justify-center text-purple-400">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-xs text-purple-400 font-bold">MINDCRAFT COGNITIVE CORE</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-900/40 text-purple-300 border border-purple-700/50">
                Gemini 3.8 Flash • MC 1.21.11
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-mono flex items-center gap-3 mt-0.5">
              <span>Mood: <strong className="text-zinc-200">{botState.mindMood || 'Alert'}</strong></span>
              <span>•</span>
              <span>Task: <strong className="text-cyan-400">{botState.currentTask}</strong></span>
            </div>
          </div>
        </div>

        {/* Internal Thought Box */}
        <div className="flex-1 min-w-[280px] bg-zinc-950 border border-zinc-800/80 rounded-lg p-2.5 font-mono text-[11px] text-zinc-300">
          <div className="text-[10px] uppercase text-purple-400 font-bold flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3" />
            <span>Active Internal Thought</span>
          </div>
          <p className="line-clamp-2 italic text-zinc-300">
            "{botState.mindThought || 'Processing sensory inputs and monitoring 1.21.11 perimeter.'}"
          </p>
        </div>
      </div>

      {/* Messages Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-800"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 text-[10px] font-mono text-zinc-500">
              <span className="font-bold text-zinc-400">{m.role === 'user' ? 'YOU (Player)' : 'MINDCRAFT BOT'}</span>
              <span>•</span>
              <span>{m.timestamp}</span>
            </div>
            <div
              className={`max-w-2xl rounded-xl p-3.5 text-xs leading-relaxed shadow-sm ${
                m.role === 'user'
                  ? 'bg-emerald-700 text-white rounded-br-none'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
              }`}
            >
              {m.thought && (
                <div className="mb-2.5 p-2 bg-purple-950/40 border border-purple-800/40 rounded text-[11px] font-mono text-purple-300">
                  <span className="font-bold text-purple-400 uppercase text-[9px] block mb-0.5">Thought Monologue:</span>
                  {m.thought}
                </div>
              )}
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.commandExecuted && (
                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center gap-2 font-mono text-[11px] text-emerald-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Executed: <code className="bg-black/60 px-1.5 py-0.5 rounded text-cyan-300">{m.commandExecuted}</code></span>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-purple-400 font-mono bg-zinc-900 border border-zinc-800 rounded-lg p-3 max-w-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>AI Mind is thinking and formulating response...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-mono">
        <span className="text-zinc-500 shrink-0">Quick Orders:</span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="shrink-0 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Talk to the AI's mind in natural language (e.g. 'Chop wood and guard me in 1.21.11')..."
          className="flex-1 bg-transparent border-0 outline-none px-3 text-xs text-zinc-100 placeholder-zinc-500 font-sans"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
