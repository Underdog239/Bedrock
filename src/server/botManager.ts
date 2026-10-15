import mineflayerPkg, { type Bot } from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
import { loader as autoEatPlugin } from 'mineflayer-auto-eat';
import { plugin as pvpPlugin } from 'mineflayer-pvp';
import { plugin as collectBlockPlugin } from 'mineflayer-collectblock';
import armorManagerPlugin from 'mineflayer-armor-manager';
import minecraftData from 'minecraft-data';
import mcProtocol from 'minecraft-protocol';
import { createServer as createNetServer } from 'node:net';
import { Vec3 } from 'vec3';
import { GoogleGenAI } from '@google/genai';
import {
  MINECRAFT_VERSION_1_21_11,
  MINECRAFT_PROTOCOL_774,
  type BotStateSummary,
  type TerminalLogEntry,
  type MindMessage,
} from '../types/minecraft';

const mineflayer = (mineflayerPkg as any).default || mineflayerPkg;
const { pathfinder, Movements, goals } = (pathfinderPkg as any).default || (pathfinderPkg as any);

export interface BotServerConfig {
  host: string;
  port: number;
  username: string;
  version: string;
  auth: 'offline' | 'microsoft';
  autoReconnect: boolean;
}

type AiProvider = 'openrouter' | 'gemini';
type AiKeySource = 'runtime' | 'environment' | 'none';

interface ResolvedAiConfig {
  provider: AiProvider;
  apiKey: string | null;
  model: string;
  source: AiKeySource;
}

const DEFAULT_OPENROUTER_MODEL = 'openrouter/auto';
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/** Most recent mind exchanges kept for the panel and for restoring a reloaded session. */
const MIND_HISTORY_LIMIT = 200;
/** How many of the most recent mind messages are replayed to the AI as context. */
const MIND_CONTEXT_MESSAGES = 6;

class MindcraftEngine {
  public bot: Bot | null = null;
  public config: BotServerConfig = {
    host: '127.0.0.1',
    port: 25565,
    username: 'MindBot',
    version: MINECRAFT_VERSION_1_21_11,
    auth: 'offline',
    autoReconnect: false,
  };
  public isConnecting = false;
  public connectionError: string | null = null;
  public msaAuth: any = null;
  public currentTask = 'Idle - Standing by';
  public activeGoal = 'Assist player in 1.21.11 world';
  public mindThought = 'Awaiting connection to Minecraft 1.21.11 server (Protocol 774)...';
  public mindMood = 'Ready';
  public currentPreset = 'survival';
  public modes = {
    self_preservation: true,
    self_defense: true,
    hunting: true,
    item_collecting: true,
    torch_placing: true,
    unstuck: true,
    cowardice: false,
    elbow_room: true,
  };
  public systemInstruction = `You are MindCraft, an autonomous Minecraft AI agent built on the Mindcraft framework with Mineflayer. You operate as an intelligent companion in Minecraft 1.21.11 (Protocol 774).
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
- /say <msg> : speaks in game chat

When replying to the user's mind inquiry:
1. Provide your internal thoughts/reasoning.
2. Provide your direct conversational reply.
3. If the user asked you to do something, include an actionCommand.`;

  public logs: TerminalLogEntry[] = [];
  public mindHistory: MindMessage[] = [];
  public waypoints = new Map<string, { x: number; y: number; z: number }>();
  public localServer: any = null;
  public localServerRunning = false;
  public viewerPort = 3001;
  public cameraStatus: BotStateSummary['cameraStatus'] = 'offline';
  public cameraError: string | null = null;
  private cameraBot: Bot | null = null;
  private runtimeAiConfig: { provider: AiProvider; apiKey: string; model: string } | null = null;

  constructor() {
    this.addLog(
      'INFO',
      `Mindcraft Engine initialized. Real Mineflayer + Mindcraft core loaded. Configured for Minecraft ${MINECRAFT_VERSION_1_21_11} (Protocol ${MINECRAFT_PROTOCOL_774}).`
    );
  }

  public addLog(level: TerminalLogEntry['level'], message: string) {
    const entry: TerminalLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    this.logs.push(entry);
    if (this.logs.length > 500) {
      this.logs.shift();
    }
  }

  /**
   * Records one completed mind exchange as a user/assistant pair.
   * Every path through talkToMind must funnel through here so the panel never
   * shows a message that the server failed to keep, and older turns are dropped
   * instead of growing without bound.
   */
  private recordMindExchange(
    userMessage: string,
    reply: string,
    options: { sender?: string; thought?: string; commandExecuted?: string } = {}
  ) {
    const timestamp = new Date().toLocaleTimeString();
    this.mindHistory.push({
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: userMessage,
      sender: options.sender,
      timestamp,
    });
    this.mindHistory.push({
      id: Math.random().toString(36).substring(2, 9),
      role: 'assistant',
      content: reply,
      thought: options.thought,
      commandExecuted: options.commandExecuted,
      timestamp,
    });
    if (this.mindHistory.length > MIND_HISTORY_LIMIT) {
      this.mindHistory.splice(0, this.mindHistory.length - MIND_HISTORY_LIMIT);
    }
  }

  public async startLocalServer(port = 25565): Promise<boolean> {
    if (this.localServer) {
      this.addLog('WARN', `Local 1.21.11 server already active on port ${port}.`);
      return true;
    }
    try {
      this.addLog('INFO', `Starting local Minecraft ${MINECRAFT_VERSION_1_21_11} (Protocol ${MINECRAFT_PROTOCOL_774}) server on port ${port}...`);
      const server = mcProtocol.createServer({
        host: '127.0.0.1',
        port,
        'online-mode': false,
        version: MINECRAFT_VERSION_1_21_11,
      });

      return new Promise((resolve) => {
        server.on('listening', () => {
          this.localServer = server;
          this.localServerRunning = true;
          this.config.version = MINECRAFT_VERSION_1_21_11;
          this.config.port = port;
          this.addLog('INFO', `[SERVER] Minecraft ${MINECRAFT_VERSION_1_21_11} (Protocol ${MINECRAFT_PROTOCOL_774}) server active at 127.0.0.1:${port}`);
          resolve(true);
        });

        server.on('login', (client) => {
          this.addLog('INFO', `[SERVER] Client joined: ${client.username} (protocol ${client.protocolVersion})`);
        });

        server.on('error', (err: any) => {
          this.addLog('ERROR', `[SERVER] Error: ${err.message}`);
          this.localServerRunning = false;
          resolve(false);
        });
      });
    } catch (err: any) {
      this.addLog('ERROR', `[SERVER] Failed to start local server: ${err.message}`);
      return false;
    }
  }

  public stopLocalServer() {
    if (this.localServer) {
      try {
        this.localServer.close();
        this.addLog('INFO', '[SERVER] Local Minecraft server stopped.');
      } catch (err: any) {
        console.error(err);
      }
      this.localServer = null;
      this.localServerRunning = false;
    }
  }

  public async connectBot(customConfig?: Partial<BotServerConfig>): Promise<{ success: boolean; message: string }> {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    if (this.bot) {
      this.disconnectBot();
    }

    this.isConnecting = true;
    this.connectionError = null;

    const targetVersion = this.config.version && this.config.version !== 'auto' ? this.config.version : MINECRAFT_VERSION_1_21_11;
    const { host, port, username, auth } = this.config;

    this.addLog(
      'INFO',
      `[CONNECT] Connecting to Minecraft server at ${host}:${port} as "${username}" (version: ${targetVersion}, protocol: ${MINECRAFT_PROTOCOL_774})...`
    );

    return new Promise((resolve) => {
      try {
        const options: any = {
          host,
          port,
          username,
          auth,
          version: targetVersion,
          checkTimeoutInterval: 60000,
          onMsaCode: (data: any) => {
            this.msaAuth = {
              user_code: data.user_code,
              verification_uri: data.verification_uri || 'https://microsoft.com/link',
              expires_in: data.expires_in || 900,
            };
            this.addLog(
              'WARN',
              `[MICROSOFT AUTH REQUIRED] Go to ${this.msaAuth.verification_uri} and enter code: ${this.msaAuth.user_code}`
            );
          },
        };

        const bot = mineflayer.createBot(options);
        this.bot = bot;

        try {
          bot.loadPlugin(pathfinder);
          bot.loadPlugin(pvpPlugin);
          bot.loadPlugin(collectBlockPlugin);
          bot.loadPlugin(autoEatPlugin);
          bot.loadPlugin(armorManagerPlugin);
        } catch (pluginErr: any) {
          this.addLog('WARN', `Plugin load note: ${pluginErr.message}`);
        }

        const connectTimeout = setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            this.connectionError = `Connection to ${host}:${port} timed out. Verify server is running on Minecraft ${targetVersion} (Protocol ${MINECRAFT_PROTOCOL_774}).`;
            this.addLog('ERROR', `[TIMEOUT] ${this.connectionError}`);
            resolve({ success: false, message: this.connectionError });
          }
        }, 20000);

        bot.once('login', () => {
          this.isConnecting = false;
          this.connectionError = null;
          this.msaAuth = null;
          this.addLog('INFO', `[LOGIN] Logged into server as ${bot.username}! Protocol: ${bot.protocolVersion || MINECRAFT_PROTOCOL_774}`);
          resolve({ success: true, message: `Connected as ${username} on 1.21.11 (Protocol 774)` });
        });

        bot.once('spawn', () => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;
          this.connectionError = null;
          this.currentTask = 'Connected and spawned in world.';
          const pos = bot.entity?.position;
          this.addLog(
            'INFO',
            `[SPAWN] Successfully spawned in 1.21.11 world! Position: X=${Math.round(pos?.x || 0)}, Y=${Math.round(pos?.y || 64)}, Z=${Math.round(pos?.z || 0)}`
          );

          try {
            const mcData = minecraftData(bot.version || MINECRAFT_VERSION_1_21_11);
            if (mcData) {
              const defaultMove = new Movements(bot, mcData);
              bot.pathfinder.setMovements(defaultMove);
            }
          } catch (e: any) {
            this.addLog('WARN', `Pathfinder note: ${e.message}`);
          }

          this.startCameraViewer();
          resolve({ success: true, message: `Connected as ${username}` });
        });

        bot.on('chat', (sender: string, message: string) => {
          this.addLog('CHAT', `<${sender}> ${message}`);
          if (sender !== bot.username && (message.includes(bot.username) || message.startsWith('!'))) {
            this.handlePlayerCommand(sender, message);
          }
        });

        let lastHealthLog = 0;
        bot.on('health', () => {
          const now = Date.now();
          if (bot.health < 6 && this.modes.self_preservation && now - lastHealthLog > 5000) {
            lastHealthLog = now;
            const hasFood = bot.inventory.items().some((i: any) => i.name.includes('apple') || i.name.includes('bread') || i.name.includes('beef') || i.name.includes('pork') || i.name.includes('cooked') || i.name.includes('potato'));
            this.addLog('WARN', `[HEALTH CRITICAL] Health is ${Number(bot.health.toFixed(1))}/20! ${hasFood ? 'Triggering auto-eat.' : 'No food in inventory to restore health.'}`);
          }
        });

        bot.on('death', () => {
          this.addLog('WARN', '[DEATH] Bot died. Halting tasks, clearing pathfinder, and awaiting respawn...');
          if (this.bot?.pathfinder) {
            this.bot.pathfinder.setGoal(null);
          }
          if (this.bot?.pvp) {
            this.bot.pvp.stop();
          }
          this.currentTask = 'Respawning at world spawn point...';
        });

        bot.on('respawn', () => {
          this.addLog('INFO', '[RESPAWN] Bot safely respawned in world.');
          this.currentTask = 'Idle - Standing by';
        });

        bot.on('kicked', (reason: any) => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;
          const rText = typeof reason === 'string' ? reason : JSON.stringify(reason);
          this.connectionError = `Kicked: ${rText}`;
          this.addLog('ERROR', `[KICKED] ${rText}`);

          if (rText.toLowerCase().includes('verify username') || rText.toLowerCase().includes('invalid session')) {
            this.connectionError = "Server rejected connection: Server has 'online-mode=true' enabled. Select 'Microsoft Account' in the Server IP:Port tab, or set online-mode=false in your server.properties.";
            this.addLog(
              'WARN',
              `[ONLINE-MODE REJECTION] The server has online-mode=true enabled and rejected the offline session. To connect: Switch Auth Mode to 'Microsoft Account' in the Server tab, OR set 'online-mode=false' in server.properties.`
            );
          }

          if (this.config.autoReconnect && !rText.toLowerCase().includes('verify username')) {
            this.addLog('INFO', '[AUTO-RECONNECT] Attempting reconnect in 5s...');
            setTimeout(() => this.connectBot(), 5000);
          }
        });

        bot.on('error', (err: any) => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;
          this.connectionError = err.message;
          this.addLog('ERROR', `[ERROR] ${err.message}`);

          if (err.message && (err.message.toLowerCase().includes('verify username') || err.message.toLowerCase().includes('invalid session'))) {
            this.connectionError = "Server has 'online-mode=true' enabled. Switch Auth Mode to 'Microsoft Account' in the Server tab, or set online-mode=false in server.properties.";
            this.addLog(
              'WARN',
              `[ONLINE-MODE NOTICE] Switch Auth Mode to 'Microsoft Account' in the Server tab, or set online-mode=false in your server.properties.`
            );
          }

          resolve({ success: false, message: this.connectionError || err.message || 'Connection error' });
        });

        bot.on('end', () => {
          if (this.bot === bot) this.isConnecting = false;
          this.addLog('INFO', '[DISCONNECT] Bot connection closed.');
          this.stopCameraViewer(bot);
        });
      } catch (err: any) {
        this.isConnecting = false;
        this.connectionError = err.message;
        this.addLog('ERROR', `[FAIL] Failed to instantiate bot: ${err.message}`);
        resolve({ success: false, message: err.message });
      }
    });
  }

  public disconnectBot() {
    const bot = this.bot;
    if (bot) {
      this.stopCameraViewer(bot);
      try {
        bot.quit();
        this.addLog('INFO', '[DISCONNECT] Bot manually disconnected.');
      } catch (e: any) {
        console.error(e);
      }
      this.bot = null;
    }
    this.isConnecting = false;
    if (!bot) this.stopCameraViewer();
  }

  private async startCameraViewer(bot = this.bot): Promise<void> {
    if (!bot) {
      this.cameraStatus = 'offline';
      this.cameraError = null;
      return;
    }

    this.stopCameraViewer();
    this.cameraStatus = 'starting';
    this.cameraError = null;

    try {
      const prismarineViewer = await import('prismarine-viewer');
      const mineflayerViewer = prismarineViewer.default?.mineflayer || (prismarineViewer as any).mineflayer;
      if (typeof mineflayerViewer !== 'function') {
        throw new Error('Prismarine Viewer did not provide its Mineflayer adapter.');
      }
      if (this.bot !== bot) return;
      await this.ensureCameraPortAvailable();
      if (this.bot !== bot) return;

      this.cameraBot = bot;
      this.addLog('INFO', `[CAMERA] Starting first-person Prismarine Viewer on port ${this.viewerPort}...`);
      mineflayerViewer(bot, {
        port: this.viewerPort,
        firstPerson: true,
        viewDistance: 6,
        prefix: '/viewer',
      });

      const isReady = await this.waitForCameraViewer(bot);
      if (!isReady || this.bot !== bot || this.cameraBot !== bot) return;

      this.cameraStatus = 'ready';
      this.addLog('INFO', `[CAMERA] First-person stream is ready at /viewer/ on port ${this.viewerPort}.`);
    } catch (err: any) {
      if (this.bot !== bot) return;
      this.cameraStatus = 'error';
      this.cameraError = err.message || 'Prismarine Viewer failed to start.';
      this.stopCameraViewer(bot);
      this.cameraStatus = 'error';
      this.cameraError = err.message || 'Prismarine Viewer failed to start.';
      this.addLog('ERROR', `[CAMERA] ${this.cameraError}`);
    }
  }

  private async ensureCameraPortAvailable(): Promise<void> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const isAvailable = await new Promise<boolean>((resolve) => {
        const probe = createNetServer();
        probe.once('error', () => resolve(false));
        probe.listen(this.viewerPort, '127.0.0.1', () => {
          probe.close((error) => resolve(!error));
        });
      });

      if (isAvailable) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(`Camera port ${this.viewerPort} is already in use.`);
  }

  private async waitForCameraViewer(bot: Bot): Promise<boolean> {
    const timeoutAt = Date.now() + 10000;
    const viewerUrl = `http://127.0.0.1:${this.viewerPort}/viewer/`;

    while (Date.now() < timeoutAt) {
      if (this.bot !== bot || this.cameraBot !== bot) return false;

      try {
        const response = await fetch(viewerUrl);
        const html = response.ok ? await response.text() : '';
        if (html.includes('<title>Prismarine Viewer</title>')) return true;
      } catch {
        // The viewer may need a short moment to bind its HTTP port.
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Prismarine Viewer did not become available at ${viewerUrl}.`);
  }

  private stopCameraViewer(bot = this.cameraBot) {
    if (bot && (bot as any).viewer) {
      try {
        (bot as any).viewer.close();
      } catch {
        // The viewer may already have been closed by a socket or connection event.
      }
    }

    if (!bot || this.cameraBot === bot || this.bot === bot) {
      this.cameraBot = null;
      this.cameraStatus = 'offline';
      this.cameraError = null;
    }
  }

  public async restartCameraViewer(): Promise<{ success: boolean; message: string }> {
    if (!this.bot?.entity) {
      return { success: false, message: 'Connect the bot and wait for it to spawn before starting the camera.' };
    }

    const bot = this.bot;
    await this.startCameraViewer(bot);
    return this.cameraStatus === 'ready'
      ? { success: true, message: 'Camera stream is ready.' }
      : { success: false, message: this.cameraError || 'Camera stream did not start.' };
  }

  private getResolvedAiConfig(): ResolvedAiConfig {
    if (this.runtimeAiConfig) {
      return { ...this.runtimeAiConfig, source: 'runtime' };
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || null;
    const geminiKey = process.env.GEMINI_API_KEY?.trim() || null;
    const requestedProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
    const provider: AiProvider = requestedProvider === 'gemini' || requestedProvider === 'openrouter'
      ? requestedProvider
      : openRouterKey
        ? 'openrouter'
        : geminiKey
          ? 'gemini'
          : 'openrouter';
    const apiKey = provider === 'openrouter' ? openRouterKey : geminiKey;

    return {
      provider,
      apiKey,
      model: provider === 'openrouter'
        ? process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL
        : DEFAULT_GEMINI_MODEL,
      source: apiKey ? 'environment' : 'none',
    };
  }

  public getAiConfigStatus(): {
    configured: boolean;
    provider: AiProvider;
    source: AiKeySource;
    model: string;
  } {
    const { apiKey, ...publicConfig } = this.getResolvedAiConfig();
    return { ...publicConfig, configured: Boolean(apiKey) };
  }

  public setRuntimeAiConfig(provider: AiProvider, apiKey: string, model?: string): void {
    this.runtimeAiConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: provider === 'openrouter' ? model?.trim() || DEFAULT_OPENROUTER_MODEL : DEFAULT_GEMINI_MODEL,
    };
  }

  public clearRuntimeAiConfig(): void {
    this.runtimeAiConfig = null;
  }

  private async generateAiContent(config: ResolvedAiConfig, prompt: string, jsonOutput = false): Promise<string> {
    if (!config.apiKey) {
      throw new Error(`No ${config.provider === 'openrouter' ? 'OpenRouter' : 'Gemini'} API key is configured.`);
    }

    if (config.provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Mindcraft Minecraft Bot',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(30000),
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error(`OpenRouter returned an unreadable response (HTTP ${response.status}).`);
      }
      if (!response.ok) {
        const message = String(data?.error?.message || `OpenRouter returned HTTP ${response.status}.`);
        throw new Error(message.split(config.apiKey).join('[redacted]'));
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        const text = content.map((part: any) => typeof part?.text === 'string' ? part.text : '').join('');
        if (text) return text;
      }
      throw new Error('OpenRouter returned no text content. Check the selected model and its response format.');
    }

    const ai = new GoogleGenAI({
      apiKey: config.apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const generate = (model: string) => ai.models.generateContent({
      model,
      contents: prompt,
      ...(jsonOutput ? { config: { responseMimeType: 'application/json' } } : {}),
    });

    try {
      const response = await generate(config.model);
      return response.text || '';
    } catch (firstErr: any) {
      if (config.model === 'gemini-flash-latest') throw firstErr;
      const safeError = String(firstErr?.message || 'Primary Gemini model failed.').split(config.apiKey).join('[redacted]');
      this.addLog('WARN', `Primary Gemini model failed (${safeError}); falling back to gemini-flash-latest.`);
      const response = await generate('gemini-flash-latest');
      return response.text || '';
    }
  }

  public async executeCommand(commandStr: string): Promise<string> {
    const raw = commandStr.trim();
    this.addLog('COMMAND', `> ${raw}`);
    if (!raw) return 'No command provided.';

    if (raw.startsWith('/')) {
      if (this.bot) {
        this.bot.chat(raw);
        return `Sent to Minecraft server: ${raw}`;
      }
      return 'Bot is not connected to a server to send chat.';
    }

    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case '!stop': {
        if (this.bot) {
          if (this.bot.pathfinder) this.bot.pathfinder.setGoal(null);
          if (this.bot.pvp) this.bot.pvp.stop();
        }
        this.currentTask = 'Idle - Force stopped all actions.';
        this.addLog('INFO', '[ACTION] Stopped all active movements, pathfinding, and combat.');
        return 'Bot stopped all current actions.';
      }

      case '!followplayer': {
        const targetPlayer = args[0] || 'Steve';
        if (!this.bot) return 'Bot not connected.';
        const player = this.bot.players[targetPlayer]?.entity;
        if (!player) {
          const names = Object.keys(this.bot.players).join(', ');
          return `Player "${targetPlayer}" not found. Visible players: ${names || 'none'}`;
        }
        const goal = new goals.GoalFollow(player, 2);
        this.bot.pathfinder.setGoal(goal, true);
        this.currentTask = `Following player: ${targetPlayer}`;
        this.addLog('INFO', `[PATH] Set pathfinder goal to follow player ${targetPlayer}.`);
        return `Now following ${targetPlayer}.`;
      }

      case '!gotoplayer': {
        const targetPlayer = args[0] || 'Steve';
        if (!this.bot) return 'Bot not connected.';
        const player = this.bot.players[targetPlayer]?.entity;
        if (!player) return `Player "${targetPlayer}" not found.`;
        const goal = new goals.GoalNear(player.position.x, player.position.y, player.position.z, 1);
        this.bot.pathfinder.setGoal(goal);
        this.currentTask = `Pathfinding to ${targetPlayer} at [${Math.round(player.position.x)}, ${Math.round(player.position.z)}]`;
        return `Pathfinding to ${targetPlayer}.`;
      }

      case '!collectblocks': {
        const blockName = args[0] || 'oak_log';
        const count = parseInt(args[1], 10) || 1;
        if (!this.bot) return 'Bot not connected.';
        try {
          const mcData = minecraftData(this.bot.version || MINECRAFT_VERSION_1_21_11);
          const blockType = mcData.blocksByName[blockName];
          if (!blockType) return `Unknown block name: "${blockName}".`;
          const blocks = this.bot.findBlocks({
            matching: blockType.id,
            maxDistance: 32,
            count,
          });
          if (blocks.length === 0) {
            return `No "${blockName}" found within 32 blocks.`;
          }
          this.currentTask = `Collecting ${blocks.length} ${blockName} blocks`;
          const targetBlock = this.bot.blockAt(blocks[0]);
          if (targetBlock && (this.bot as any).collectBlock) {
            (this.bot as any).collectBlock.collect(targetBlock, (err: any) => {
              if (err) this.addLog('WARN', `Collect error: ${err.message}`);
              else this.addLog('INFO', `[COLLECT] Harvested ${blockName}!`);
            });
          } else if (targetBlock) {
            this.bot.pathfinder.setGoal(new goals.GoalBlock(targetBlock.position.x, targetBlock.position.y, targetBlock.position.z));
          }
          return `Initiated collection for ${blocks.length}x ${blockName}.`;
        } catch (e: any) {
          return `Error in collectBlocks: ${e.message}`;
        }
      }

      case '!attack': {
        const targetName = args[0] || 'zombie';
        if (!this.bot) return 'Bot not connected.';
        const entity = this.bot.nearestEntity((e: any) => {
          return Boolean(e.name?.toLowerCase().includes(targetName.toLowerCase()) || e.displayName?.toLowerCase().includes(targetName.toLowerCase()));
        });
        if (!entity) return `No entity matching "${targetName}" found nearby.`;
        if (this.bot.pvp) {
          this.bot.pvp.attack(entity);
          this.currentTask = `Attacking ${entity.name || 'target'}`;
          return `Engaging in combat with ${entity.name}.`;
        }
        return 'PVP plugin not available.';
      }

      case '!equip': {
        const itemName = args[0];
        if (!this.bot || !itemName) return 'Specify item name to equip.';
        const item = this.bot.inventory.items().find((i) => i.name.includes(itemName));
        if (!item) return `Item "${itemName}" not found in inventory.`;
        try {
          await this.bot.equip(item, 'hand');
          return `Equipped ${item.name} in hand.`;
        } catch (err: any) {
          return `Failed to equip: ${err.message}`;
        }
      }

      case '!consume': {
        if (!this.bot) return 'Bot not connected.';
        try {
          if ((this.bot as any).autoEat) {
            (this.bot as any).autoEat.eat();
            return 'Triggered auto-eat routine.';
          }
          return 'No auto-eat plugin ready.';
        } catch (e: any) {
          return `Consume error: ${e.message}`;
        }
      }

      case '!rememberhere': {
        const placeName = args[0] || 'checkpoint';
        if (!this.bot) return 'Bot not connected.';
        const p = this.bot.entity.position;
        this.waypoints.set(placeName, { x: p.x, y: p.y, z: p.z });
        return `Remembered location "${placeName}" at [${Math.round(p.x)}, ${Math.round(p.y)}, ${Math.round(p.z)}].`;
      }

      case '!gotoplace': {
        const placeName = args[0];
        if (!this.bot) return 'Bot not connected.';
        const pos = this.waypoints.get(placeName);
        if (!pos) return `Location "${placeName}" not found in memory.`;
        this.bot.pathfinder.setGoal(new goals.GoalBlock(pos.x, pos.y, pos.z));
        this.currentTask = `Pathfinding to remembered location: ${placeName}`;
        return `Pathfinding to ${placeName}.`;
      }

      case '!inventory': {
        if (!this.bot) return 'Bot not connected.';
        const items = this.bot.inventory.items().map((i) => `${i.count}x ${i.name}`);
        return `Inventory: ${items.join(', ') || 'Empty'}`;
      }

      case '!newaction': {
        const prompt = args.join(' ');
        return await this.executeNewActionCode(prompt);
      }

      default: {
        return `Unknown command "${cmd}". Try !stop, !followPlayer, !collectBlocks, !attack, !equip, !inventory, !newAction, or server chat "/say ..."`;
      }
    }
  }

  private async executeNewActionCode(userPrompt: string): Promise<string> {
    const aiConfig = this.getResolvedAiConfig();
    if (!aiConfig.apiKey) {
      return `No ${aiConfig.provider === 'openrouter' ? 'OpenRouter' : 'Gemini'} API key is configured. Add one in AI Mind settings or set the corresponding server environment variable.`;
    }
    const apiKey = aiConfig.apiKey;
    try {
      this.addLog('MIND', `[CODER] Synthesizing Mineflayer execution code for Minecraft 1.21.11 using ${aiConfig.provider}...`);
      const prompt = `You are the Mindcraft Coder module for Mineflayer Minecraft 1.21.11 bots.
Write an async JavaScript function body that executes the user's request using the 'bot' object.
Request: "${userPrompt}"
Available variables:
- bot: the Mineflayer bot instance
- Vec3: vec3 constructor
- goals: mineflayer-pathfinder goals
- mcData: minecraft-data instance (minecraftData(bot.version))
Rules:
- Write ONLY raw JavaScript inside the function body. No markdown formatting, no backticks.
- Handle errors gracefully with try/catch.
- Await all promises.`;

      const responseText = await this.generateAiContent(aiConfig, prompt);
      let code = responseText.trim();
      if (code.startsWith('```')) {
        code = code.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
      }
      this.addLog('INFO', `[EXECUTING CODE]:\n${code}`);
      if (this.bot) {
        const mcData = minecraftData(this.bot.version || MINECRAFT_VERSION_1_21_11);
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction('bot', 'Vec3', 'goals', 'mcData', code);
        await fn(this.bot, Vec3, goals, mcData);
        return `Executed custom action successfully for: "${userPrompt}"`;
      }
      return `Code generated successfully:\n${code}\n(Connect bot to execute).`;
    } catch (err: any) {
      const safeError = String(err?.message || 'AI provider request failed.').split(apiKey).join('[redacted]');
      this.addLog('ERROR', `[CODER ERROR] ${safeError}`);
      return `Failed to execute newAction: ${safeError}`;
    }
  }

  private async handlePlayerCommand(sender: string, message: string) {
    this.addLog('MIND', `[AGENT] Processing message from ${sender}: "${message}"`);
    if (message.startsWith('!')) {
      const res = await this.executeCommand(message);
      if (this.bot) this.bot.chat(res);
      return;
    }
    const mindResult = await this.talkToMind(message, sender);
    if (this.bot && mindResult.reply) {
      this.bot.chat(mindResult.reply);
    }
  }

  public async talkToMind(
    userMessage: string,
    sender = 'Player'
  ): Promise<{
    reply: string;
    thought: string;
    mood: string;
    actionCommand?: string;
    error?: string;
  }> {
    const aiConfig = this.getResolvedAiConfig();
    const apiKey = aiConfig.apiKey;
    const botStateInfo = {
      connected: !!this.bot,
      version: MINECRAFT_VERSION_1_21_11,
      protocolVersion: MINECRAFT_PROTOCOL_774,
      username: this.bot?.username || this.config.username,
      health: this.bot?.health ?? 20,
      food: this.bot?.food ?? 20,
      position: this.bot?.entity?.position
        ? {
            x: Math.round(this.bot.entity.position.x),
            y: Math.round(this.bot.entity.position.y),
            z: Math.round(this.bot.entity.position.z),
          }
        : { x: 0, y: 64, z: 0 },
      gameMode: this.bot?.game?.gameMode || 'survival',
      inventory: this.bot?.inventory?.items().map((i) => `${i.count}x ${i.name}`) || [],
      currentTask: this.currentTask,
      preset: this.currentPreset,
      modes: this.modes,
    };

    if (!apiKey) {
      const providerName = aiConfig.provider === 'openrouter' ? 'OpenRouter' : 'Gemini';
      const fallbackReply = `[Mind]: Received "${userMessage}". Operating in 1.21.11 world at [${botStateInfo.position.x}, ${botStateInfo.position.y}, ${botStateInfo.position.z}]. Ready for commands.`;
      this.mindThought = `No ${providerName} API key is configured. Add one in AI Mind settings or set the matching server environment variable.`;
      this.mindMood = 'Alert';
      this.recordMindExchange(userMessage, fallbackReply, {
        sender,
        thought: this.mindThought,
      });
      return {
        reply: fallbackReply,
        thought: this.mindThought,
        mood: 'Alert',
        error: `No ${providerName} API key is configured.`,
      };
    }

    try {

      const conversationContext = this.mindHistory
        .slice(-MIND_CONTEXT_MESSAGES)
        .map((m) => `${m.role === 'user' ? m.sender || sender : 'MindCraft'}: ${m.content}`)
        .join('\n');

      const prompt = `${this.systemInstruction}
Bot Current State: ${JSON.stringify(botStateInfo, null, 2)}
Recent Conversation: ${conversationContext}
User says to your Mind: "${userMessage}"
Respond with a JSON object with:
- "thought": your internal cognitive reasoning about the Minecraft 1.21.11 environment, game state, and strategy.
- "reply": what you say back to the player in natural conversation.
- "mood": your emotional/tactical stance (e.g. "Confident", "Vigilant", "Resource-hungry", "Defensive").
- "actionCommand": optional Mindcraft command to execute right now if user gave an order (e.g. "!followPlayer Steve", "!collectBlocks oak_log 5", "!stop", "!attack zombie", or empty string).`;

      const rawText = await this.generateAiContent(aiConfig, prompt, true);
      let jsonText = rawText.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(jsonText || '{}');
      const thought = parsed.thought || 'Analyzing environment and orders in 1.21.11.';
      const reply = parsed.reply || 'Understood. Carrying out instructions.';
      const mood = parsed.mood || 'Focused';
      const actionCommand = parsed.actionCommand || undefined;

      this.mindThought = thought;
      this.mindMood = mood;
      this.addLog('MIND', `[THOUGHT] ${thought}`);

      this.recordMindExchange(userMessage, reply, {
        sender,
        thought,
        commandExecuted: actionCommand,
      });

      if (actionCommand && actionCommand.trim().length > 0) {
        this.executeCommand(actionCommand);
      }

      return {
        reply,
        thought,
        mood,
        actionCommand,
      };
    } catch (err: any) {
      const safeError = String(err?.message || 'AI provider request failed.').split(apiKey).join('[redacted]');
      this.addLog('ERROR', `[MIND NOTICE] ${safeError}`);
      const fallbackReply = `[Mind]: Received "${userMessage}". Operating in 1.21.11 (Protocol 774) world at [${botStateInfo.position.x}, ${botStateInfo.position.y}, ${botStateInfo.position.z}]. Ready for tactical orders.`;
      const fallbackThought = `Evaluating 1.21.11 tactical position. Health: ${botStateInfo.health}/20, Food: ${botStateInfo.food}/20. Standing by.`;
      this.mindThought = fallbackThought;
      this.mindMood = 'Alert';

      // Auto-extract command if user typed a command
      let actionCmd: string | undefined = undefined;
      if (userMessage.startsWith('!')) {
        actionCmd = userMessage;
        this.executeCommand(actionCmd);
      }

      this.recordMindExchange(userMessage, fallbackReply, {
        sender,
        thought: fallbackThought,
        commandExecuted: actionCmd,
      });

      return {
        reply: fallbackReply,
        thought: fallbackThought,
        mood: 'Alert',
        actionCommand: actionCmd,
        error: safeError,
      };
    }
  }

  public getState(): BotStateSummary {
    const pos = this.bot?.entity?.position;
    const inv = this.bot?.inventory?.items() || [];
    const equipment = {
      heldItem: this.bot?.heldItem?.name || null,
      offHand: (this.bot?.inventory?.slots[45] as any)?.name || null,
      head: (this.bot?.inventory?.slots[5] as any)?.name || null,
      torso: (this.bot?.inventory?.slots[6] as any)?.name || null,
      legs: (this.bot?.inventory?.slots[7] as any)?.name || null,
      feet: (this.bot?.inventory?.slots[8] as any)?.name || null,
    };

    return {
      connected: !!this.bot && !this.isConnecting,
      connecting: this.isConnecting,
      error: this.connectionError,
      serverHost: this.config.host,
      serverPort: this.config.port,
      username: this.bot?.username || this.config.username,
      version: this.bot?.version || this.config.version || MINECRAFT_VERSION_1_21_11,
      protocolVersion: MINECRAFT_PROTOCOL_774,
      auth: this.config.auth,
      msaAuth: this.msaAuth,
      health: this.bot?.health ?? 20,
      maxHealth: 20,
      food: this.bot?.food ?? 20,
      saturation: this.bot?.foodSaturation ?? 5,
      armor: 0,
      experience: {
        level: this.bot?.experience?.level ?? 0,
        points: this.bot?.experience?.points ?? 0,
        progress: this.bot?.experience?.progress ?? 0,
      },
      position: pos
        ? {
            x: Number(pos.x.toFixed(2)),
            y: Number(pos.y.toFixed(2)),
            z: Number(pos.z.toFixed(2)),
          }
        : { x: 0, y: 64, z: 0 },
      yaw: this.bot?.entity?.yaw ? Number(this.bot.entity.yaw.toFixed(2)) : 0,
      pitch: this.bot?.entity?.pitch ? Number(this.bot.entity.pitch.toFixed(2)) : 0,
      gameMode: this.bot?.game?.gameMode || 'survival',
      biome: 'plains',
      timeOfDay: this.bot?.time?.timeOfDay ?? 6000,
      isRaining: this.bot?.isRaining ?? false,
      ping: (this.bot?.player as any)?.ping ?? 15,
      currentTask: this.currentTask,
      activeGoal: this.activeGoal,
      inventory: inv.map((i) => ({
        slot: i.slot,
        name: i.name,
        count: i.count,
        displayName: i.displayName,
      })),
      equipment,
      modes: this.modes,
      preset: this.currentPreset,
      mindThought: this.mindThought,
      mindMood: this.mindMood,
      viewerPort: this.viewerPort,
      cameraStatus: this.cameraStatus,
      cameraError: this.cameraError,
      localServerRunning: this.localServerRunning,
    };
  }

  public setPreset(presetName: string) {
    this.currentPreset = presetName;
    switch (presetName) {
      case 'survival':
        this.modes = {
          self_preservation: true,
          self_defense: true,
          hunting: true,
          item_collecting: true,
          torch_placing: true,
          unstuck: true,
          cowardice: false,
          elbow_room: true,
        };
        break;
      case 'combat_guard':
        this.modes = {
          self_preservation: true,
          self_defense: true,
          hunting: false,
          item_collecting: true,
          torch_placing: false,
          unstuck: true,
          cowardice: false,
          elbow_room: false,
        };
        break;
      case 'resource_gatherer':
        this.modes = {
          self_preservation: true,
          self_defense: true,
          hunting: true,
          item_collecting: true,
          torch_placing: true,
          unstuck: true,
          cowardice: false,
          elbow_room: true,
        };
        break;
      case 'passive_companion':
        this.modes = {
          self_preservation: true,
          self_defense: false,
          hunting: false,
          item_collecting: true,
          torch_placing: false,
          unstuck: true,
          cowardice: true,
          elbow_room: true,
        };
        break;
    }
    this.addLog('INFO', `[PRESET] Loaded preset "${presetName}". Behavior modes updated.`);
  }
}

export const mindcraftEngine = new MindcraftEngine();

export async function handleMindcraftApi(req: any, res: any): Promise<boolean> {
  // Match on the pathname only. An exact-string match on req.url means a single
  // query string (e.g. /api/bot/status?t=1) falls through to the SPA and hands
  // the client HTML with a 200 status.
  const url = (req.url || '').split('?')[0];

  const sendJson = (status: number, data: any) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  const parseBody = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: any) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(err);
        }
      });
    });
  };

  if (url === '/api/bot/status' && req.method === 'GET') {
    sendJson(200, mindcraftEngine.getState());
    return true;
  }

  if (url === '/api/ai/config' && req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    sendJson(200, mindcraftEngine.getAiConfigStatus());
    return true;
  }

  if (url === '/api/ai/config' && req.method === 'PUT') {
    try {
      const body = await parseBody();
      const provider = body.provider;
      if (provider !== 'openrouter' && provider !== 'gemini') {
        sendJson(400, { error: 'Choose OpenRouter or Gemini as the AI provider.' });
        return true;
      }
      if (typeof body.apiKey !== 'string' || !body.apiKey.trim()) {
        sendJson(400, { error: `Enter ${provider === 'openrouter' ? 'an OpenRouter' : 'a Gemini'} API key before applying it.` });
        return true;
      }
      if (body.apiKey.trim().length > 8192) {
        sendJson(413, { error: 'The API key is too long.' });
        return true;
      }
      const model = typeof body.model === 'string' ? body.model.trim() : '';
      if (model.length > 256) {
        sendJson(400, { error: 'The model ID must be 256 characters or fewer.' });
        return true;
      }
      mindcraftEngine.setRuntimeAiConfig(provider, body.apiKey, model);
      res.setHeader('Cache-Control', 'no-store');
      sendJson(200, mindcraftEngine.getAiConfigStatus());
    } catch (e: any) {
      sendJson(400, { error: e.message || 'Invalid AI provider settings request.' });
    }
    return true;
  }

  if (url === '/api/ai/config' && req.method === 'DELETE') {
    mindcraftEngine.clearRuntimeAiConfig();
    res.setHeader('Cache-Control', 'no-store');
    sendJson(200, mindcraftEngine.getAiConfigStatus());
    return true;
  }

  if (url === '/api/bot/camera/restart' && req.method === 'POST') {
    const result = await mindcraftEngine.restartCameraViewer();
    sendJson(result.success ? 200 : 409, result);
    return true;
  }

  if (url === '/api/bot/connect' && req.method === 'POST') {
    try {
      const body = await parseBody();
      const result = await mindcraftEngine.connectBot(body);
      sendJson(result.success ? 200 : 400, result);
    } catch (e: any) {
      sendJson(500, { success: false, message: e.message });
    }
    return true;
  }

  if (url === '/api/bot/disconnect' && req.method === 'POST') {
    mindcraftEngine.disconnectBot();
    sendJson(200, { success: true, message: 'Disconnected' });
    return true;
  }

  if (url === '/api/bot/command' && req.method === 'POST') {
    try {
      const { command } = await parseBody();
      const result = await mindcraftEngine.executeCommand(command);
      sendJson(200, { result });
    } catch (e: any) {
      sendJson(500, { error: e.message });
    }
    return true;
  }

  if (url === '/api/bot/mind/chat' && req.method === 'POST') {
    try {
      const { message, sender } = await parseBody();
      const result = await mindcraftEngine.talkToMind(message, sender);
      sendJson(200, result);
    } catch (e: any) {
      sendJson(500, { error: e.message });
    }
    return true;
  }

  if (url === '/api/bot/mind/history' && req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    sendJson(200, mindcraftEngine.mindHistory);
    return true;
  }

  if (url === '/api/bot/logs' && req.method === 'GET') {
    sendJson(200, mindcraftEngine.logs);
    return true;
  }

  if (url === '/api/bot/settings' && req.method === 'POST') {
    try {
      const body = await parseBody();
      if (body.preset) mindcraftEngine.setPreset(body.preset);
      if (body.modes) mindcraftEngine.modes = { ...mindcraftEngine.modes, ...body.modes };
      if (body.systemInstruction) mindcraftEngine.systemInstruction = body.systemInstruction;
      sendJson(200, { success: true, state: mindcraftEngine.getState() });
    } catch (e: any) {
      sendJson(500, { error: e.message });
    }
    return true;
  }

  if (url === '/api/server/start-local' && req.method === 'POST') {
    try {
      const { port } = await parseBody();
      const success = await mindcraftEngine.startLocalServer(port || 25565);
      sendJson(200, { success, running: mindcraftEngine.localServerRunning });
    } catch (e: any) {
      sendJson(500, { error: e.message });
    }
    return true;
  }

  if (url === '/api/server/stop-local' && req.method === 'POST') {
    mindcraftEngine.stopLocalServer();
    sendJson(200, { success: true });
    return true;
  }

  if (url === '/api/bot/terminal/exec' && req.method === 'POST') {
    try {
      const { code } = await parseBody();
      mindcraftEngine.addLog('COMMAND', `[CLI EXEC] ${code}`);

      if (code.startsWith('js:') || code.startsWith('eval:')) {
        const jsCode = code.replace(/^(js:|eval:)/, '').trim();
        const bot = mindcraftEngine.bot;
        const executor = new Function('bot', `return (${jsCode})`);
        const result = executor(bot);
        mindcraftEngine.addLog('INFO', `=> ${JSON.stringify(result) || result}`);
        sendJson(200, { output: String(result) });
        return true;
      }

      const resText = await mindcraftEngine.executeCommand(code);
      sendJson(200, { output: resText });
    } catch (e: any) {
      mindcraftEngine.addLog('ERROR', `[EXEC ERROR] ${e.message}`);
      sendJson(500, { error: e.message });
    }
    return true;
  }

  return false;
}
