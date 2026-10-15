import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  Brain,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Send,
  Settings2,
  Sparkles,
  X,
  Zap,
  RefreshCw,
} from 'lucide-react';
import type { BotStateSummary, MindMessage } from '../types/minecraft';
import { readJson } from '../lib/api';

interface AiMindChatProps {
  botState: BotStateSummary;
  onSendCommand: (cmd: string) => void;
}

type AiProvider = 'openrouter' | 'gemini';

interface AiConfigStatus {
  configured: boolean;
  provider: AiProvider;
  source: 'runtime' | 'environment' | 'none';
  model: string;
}

const MIND_GREETING: MindMessage = {
  id: 'init-1',
  role: 'assistant',
  content: `I am MindCraft, your autonomous Minecraft bot running on version 1.21.11 (Protocol 774). You can talk to my cognitive mind directly here or give me tasks. What are your orders?`,
  thought: 'Cognitive loop online. Monitoring 1.21.11 environment and standing by for orders.',
  timestamp: new Date().toLocaleTimeString(),
};

export const AiMindChat: React.FC<AiMindChatProps> = ({ botState }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<MindMessage[]>([]);
  const [keyStatus, setKeyStatus] = useState<AiConfigStatus>({
    configured: false,
    provider: 'openrouter',
    source: 'none',
    model: 'openrouter/auto',
  });
  const [isKeyStatusLoading, setIsKeyStatusLoading] = useState(true);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('openrouter');
  const [modelInput, setModelInput] = useState('openrouter/auto');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [keyNotice, setKeyNotice] = useState('');
  const [keyError, setKeyError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const keyDialogRef = useRef<HTMLDialogElement>(null);

  const refreshKeyStatus = async () => {
    setIsKeyStatusLoading(true);
    try {
      const response = await fetch('/api/ai/config');
      const data = await readJson<AiConfigStatus & { error?: string }>(response);
      if (!response.ok || !data) {
        throw new Error(data?.error || `Unable to read AI provider settings (HTTP ${response.status}).`);
      }
      setKeyStatus(data);
      setKeyError('');
    } catch (error: any) {
      setKeyError(error.message || 'Unable to read AI provider settings.');
    } finally {
      setIsKeyStatusLoading(false);
    }
  };

  useEffect(() => {
    void refreshKeyStatus();
  }, []);

  useEffect(() => {
    const dialog = keyDialogRef.current;
    if (!dialog) return;
    if (isKeyDialogOpen && !dialog.open) dialog.showModal();
    if (!isKeyDialogOpen && dialog.open) dialog.close();
  }, [isKeyDialogOpen]);

  const openKeyDialog = () => {
    setKeyNotice('');
    setKeyError('');
    setApiKeyInput('');
    setSelectedProvider(keyStatus.provider);
    setModelInput(keyStatus.model);
    setIsApiKeyVisible(false);
    setIsKeyDialogOpen(true);
    void refreshKeyStatus();
  };

  const closeKeyDialog = () => {
    setIsKeyDialogOpen(false);
    setApiKeyInput('');
    setIsApiKeyVisible(false);
  };

  const handleProviderChange = (provider: AiProvider) => {
    setSelectedProvider(provider);
    setModelInput(provider === 'openrouter'
      ? keyStatus.provider === 'openrouter' ? keyStatus.model : 'openrouter/auto'
      : '');
  };

  const handleApplyApiKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiKey = apiKeyInput.trim();
    if (!apiKey) {
      setKeyError(`Paste your ${selectedProvider === 'openrouter' ? 'OpenRouter' : 'Gemini'} API key to continue.`);
      return;
    }

    setIsSavingApiKey(true);
    setKeyError('');
    setKeyNotice('');
    try {
      const response = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, provider: selectedProvider, model: modelInput }),
      });
      const data = await readJson<AiConfigStatus & { error?: string }>(response);
      if (!response.ok || !data) {
        throw new Error(data?.error || `Unable to apply AI provider settings (HTTP ${response.status}).`);
      }
      setKeyStatus(data);
      setSelectedProvider(data.provider);
      setModelInput(data.model);
      setApiKeyInput('');
      setKeyNotice(`${data.provider === 'openrouter' ? 'OpenRouter' : 'Gemini'} settings applied to the app server.`);
    } catch (error: any) {
      setKeyError(error.message || 'Unable to apply AI provider settings.');
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleClearApiKey = async () => {
    setIsSavingApiKey(true);
    setKeyError('');
    setKeyNotice('');
    try {
      const response = await fetch('/api/ai/config', { method: 'DELETE' });
      const data = await readJson<AiConfigStatus & { error?: string }>(response);
      if (!response.ok || !data) {
        throw new Error(data?.error || `Unable to clear the runtime provider settings (HTTP ${response.status}).`);
      }
      setKeyStatus(data);
      setSelectedProvider(data.provider);
      setModelInput(data.model);
      setApiKeyInput('');
      setKeyNotice(data.source === 'environment'
        ? 'Runtime override removed. The server environment configuration is now active.'
        : 'Runtime override removed. No AI API key is currently configured.');
    } catch (error: any) {
      setKeyError(error.message || 'Unable to clear the runtime provider settings.');
    } finally {
      setIsSavingApiKey(false);
    }
  };

  /**
   * The server transcript is the source of truth. Rendering from it keeps what
   * the panel shows identical to what survives a reload or a tab switch.
   * Failures are swallowed so a dropped request never blanks the conversation.
   */
  const syncHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/mind/history', { cache: 'no-store' });
      const data = await readJson<MindMessage[]>(res);
      if (!res.ok || !Array.isArray(data)) return;
      setMessages(data.length > 0 ? data : [MIND_GREETING]);
    } catch {
      // Keep the messages already on screen.
    }
  }, []);

  useEffect(() => {
    void syncHistory();
  }, [syncHistory]);

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
      sender: 'Player',
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
      if (!res.ok) {
        const failure = await readJson<{ error?: string }>(res);
        throw new Error(failure?.error || `The AI request failed (HTTP ${res.status}).`);
      }
      // The exchange is now on the server, so re-read the transcript instead of
      // rendering a local copy that could drift from the stored one.
      await syncHistory();
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
              <span className="max-w-[240px] truncate rounded border border-purple-700/50 bg-purple-900/40 px-2 py-0.5 font-mono text-[10px] text-purple-300">
                {keyStatus.provider === 'openrouter' ? 'OpenRouter' : 'Gemini'} · {keyStatus.model} · MC 1.21.11
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-mono flex items-center gap-3 mt-0.5">
              <span>Mood: <strong className="text-zinc-200">{botState.mindMood || 'Alert'}</strong></span>
              <span>•</span>
              <span>Task: <strong className="text-cyan-400">{botState.currentTask}</strong></span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openKeyDialog}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-emerald-700 hover:bg-zinc-800"
          title="Configure AI provider and API key"
        >
          <KeyRound className="h-4 w-4 text-emerald-400" />
          <span>AI provider</span>
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${keyStatus.configured ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
            {isKeyStatusLoading ? 'CHECKING' : keyStatus.configured ? 'CONFIGURED' : 'ADD KEY'}
          </span>
          <Settings2 className="h-3.5 w-3.5 text-zinc-500" />
        </button>

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
              <span className="font-bold text-zinc-400">
                {m.role === 'user' ? (m.sender || 'YOU (Player)').toUpperCase() : 'MINDCRAFT BOT'}
              </span>
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

      <dialog
        ref={keyDialogRef}
        aria-labelledby="ai-provider-settings-title"
        aria-describedby="ai-provider-settings-description"
        onCancel={(event) => {
          event.preventDefault();
          closeKeyDialog();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeKeyDialog();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      >
        <form onSubmit={handleApplyApiKey} className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-800/70 bg-emerald-950/60 text-emerald-400">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">AI provider credentials</p>
                <h2 id="ai-provider-settings-title" className="mt-1 text-lg font-semibold tracking-tight text-white">AI provider settings</h2>
                <p id="ai-provider-settings-description" className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Choose OpenRouter or Gemini and provide a server-side API key. The key is never returned to this page.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeKeyDialog}
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
              aria-label="Close AI provider settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label htmlFor="ai-provider" className="block text-xs font-medium text-zinc-200">
              Provider
              <select
                id="ai-provider"
                value={selectedProvider}
                onChange={(event) => handleProviderChange(event.target.value as AiProvider)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-black/60 px-3.5 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              >
                <option value="openrouter">OpenRouter</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </label>
            {selectedProvider === 'openrouter' ? (
              <label htmlFor="openrouter-model" className="block text-xs font-medium text-zinc-200">
                OpenRouter model ID
                <input
                  id="openrouter-model"
                  value={modelInput}
                  onChange={(event) => setModelInput(event.target.value)}
                  placeholder="openrouter/auto"
                  autoComplete="off"
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-black/60 px-3.5 py-3 font-mono text-sm text-zinc-100 outline-none transition-colors placeholder:text-xs placeholder:text-zinc-600 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
              </label>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-3">
                <span className="text-xs font-medium text-zinc-300">Gemini model</span>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">Model selection is managed by the server.</p>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-zinc-300">Active key source</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] ${
                keyStatus.configured
                  ? 'border-emerald-800/70 bg-emerald-950/60 text-emerald-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400'
              }`}>
                {keyStatus.configured ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {isKeyStatusLoading
                  ? 'CHECKING'
                  : keyStatus.source === 'runtime'
                    ? 'APP MEMORY'
                    : keyStatus.source === 'environment'
                      ? 'ENVIRONMENT'
                      : 'NOT CONFIGURED'}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              {keyStatus.source === 'runtime'
                ? 'The runtime provider setting takes priority over environment variables.'
                : keyStatus.source === 'environment'
                  ? `Using ${keyStatus.provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'GEMINI_API_KEY'} from the server environment.`
                  : 'Add a key here or configure OPENROUTER_API_KEY on the server.'}
            </p>
          </div>

          <label htmlFor="ai-provider-api-key" className="mt-5 block text-xs font-medium text-zinc-200">
            Your {selectedProvider === 'openrouter' ? 'OpenRouter' : 'Gemini'} API key
          </label>
          <div className="relative mt-2">
            <input
              id="ai-provider-api-key"
              name="ai-provider-api-key"
              type={isApiKeyVisible ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              placeholder={`Paste ${selectedProvider === 'openrouter' ? 'OpenRouter' : 'Gemini'} key to override the active provider`}
              className="w-full select-text rounded-xl border border-zinc-700 bg-black/60 px-3.5 py-3 pr-12 font-mono text-sm text-zinc-100 outline-none transition-colors placeholder:text-xs placeholder:text-zinc-600 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
            <button
              type="button"
              onClick={() => setIsApiKeyVisible((visible) => !visible)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              aria-label={isApiKeyVisible ? 'Hide API key' : 'Show API key'}
            >
              {isApiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Applying stores it in server memory for this run; it is not written to local storage or logs. {selectedProvider === 'openrouter' ? 'OpenRouter' : 'Google'} validates it on the first AI request. Restart the app server to clear it.
          </p>

          {keyError && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-rose-900/70 bg-rose-950/50 px-3 py-2.5 text-xs text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{keyError}</span>
            </p>
          )}
          {keyNotice && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-900/70 bg-emerald-950/40 px-3 py-2.5 text-xs text-emerald-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{keyNotice}</span>
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {keyStatus.source === 'runtime' && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  disabled={isSavingApiKey}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-950/50 disabled:opacity-50"
                >
                  Remove runtime override
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeKeyDialog}
                className="rounded-lg border border-zinc-700 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!apiKeyInput.trim() || isSavingApiKey}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingApiKey && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {isSavingApiKey ? 'Applying…' : 'Apply key'}
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </div>
  );
};
