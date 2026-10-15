export const MINECRAFT_VERSION_1_21_11 = '1.21.11';
export const MINECRAFT_PROTOCOL_774 = 774;

export interface Vec3Pos {
  x: number;
  y: number;
  z: number;
}

export interface InventoryItem {
  slot: number;
  name: string;
  count: number;
  displayName: string;
}

export interface EquipmentState {
  heldItem: string | null;
  offHand: string | null;
  head: string | null;
  torso: string | null;
  legs: string | null;
  feet: string | null;
}

export interface BotModes {
  self_preservation: boolean;
  self_defense: boolean;
  hunting: boolean;
  item_collecting: boolean;
  torch_placing: boolean;
  unstuck: boolean;
  cowardice: boolean;
  elbow_room: boolean;
}

export interface MsaCodeInfo {
  user_code: string;
  verification_uri: string;
  expires_in: number;
}

export interface BotStateSummary {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  serverHost: string;
  serverPort: number;
  username: string;
  version: string;
  protocolVersion: number;
  auth: 'offline' | 'microsoft';
  msaAuth: MsaCodeInfo | null;
  health: number;
  maxHealth: number;
  food: number;
  saturation: number;
  armor: number;
  experience: { level: number; points: number; progress: number };
  position: Vec3Pos;
  yaw: number;
  pitch: number;
  gameMode: string;
  biome: string;
  timeOfDay: number;
  isRaining: boolean;
  ping: number;
  currentTask: string;
  activeGoal: string;
  inventory: InventoryItem[];
  equipment: EquipmentState;
  modes: BotModes;
  preset: string;
  mindThought: string;
  mindMood: string;
  viewerPort: number;
  cameraStatus: 'offline' | 'starting' | 'ready' | 'error';
  cameraError: string | null;
  localServerRunning: boolean;
}

export interface TerminalLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'CHAT' | 'MIND' | 'COMMAND' | 'WARN' | 'ERROR';
  message: string;
}

export interface MindMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thought?: string;
  commandExecuted?: string;
  /** Who sent an incoming message, e.g. the Mind panel player or an in-game player name. */
  sender?: string;
  timestamp: string;
}
