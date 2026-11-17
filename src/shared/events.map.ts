/**
 * Definições de Tipos e Payloads dos Eventos do Jogo (Cliente <-> Servidor)
 * Este arquivo pode ser compartilhado diretamente ou copiado para o Frontend.
 */

// ==========================================
// 1. Constantes e Enums Básicos
// ==========================================

export enum COLOR {
  BLUE = "BLUE",
  RED = "RED",
  GREEN = "GREEN",
  YELLOW = "YELLOW",
  WILD = "WILD",
}

export enum Type {
  BLOCK = "BLOCK",
  DRAW_4 = "DRAW_4",
  DRAW_2 = "DRAW_2",
  NUMBERED = "NUMBERED",
  WILD_CARD = "WILD_CARD",
  REVERSE = "REVERSE",
}

export interface SerializedCard {
  id: number;
  name: string;
  color: COLOR | string;
  type: Type | string;
  value?: number;
  effectiveColor?: COLOR | string;
}

export interface Configs {
  SEVEN_HAS_EFFECT: boolean;
  ZERO_HAS_EFFECT: boolean;
  DRAW_2_OVER_DRAW_4: boolean;
  DRAW_UNTIL_HAVE: boolean;
  JUMPIN: boolean;
  DRAW_4_CHALLENGES: boolean;
  CanWin?: boolean;
  isTestRoom?: boolean;
  seed?: number;
}

// ==========================================
// 2. Envelope de Rede (EventNetwork)
// ==========================================

export type EventNetworkType = "GAME" | "EXTERNAL";

export interface EventNetwork<T = unknown> {
  type: EventNetworkType;
  name: string;
  roomName: string;
  sendedBy: number; // ID do jogador emissor, ou -1 se for originado pelo Servidor
  data: T;
}

/**
 * Envelope para eventos de JOGO enviados pelo Cliente para o Servidor.
 * O servidor espera o payload dentro de { data: ... }.
 */
export interface ClientGameEnvelope<T = unknown> {
  data: T;
}

// ==========================================
// 3. Eventos EXTERNOS (Lobby & Sala)
// ==========================================

export const ExternalClientEvents = {
  CREATE_ROOM: "createRoom",
  JOIN_ROOM: "joinRoom",
  RECONNECT_ROOM: "reconnectRoom",
  ADD_BOT: "addBot",
  LEAVE_ROOM: "leaveRoom",
  GET_ROOM_STATE: "getRoomState",
  START_GAME: "startGame",
  PING: "ping",
} as const;

export const ExternalServerEvents = {
  ROOM_CREATED: "ROOM_CREATED",
  ROOM_JOINED: "ROOM_JOINED",
  ROOM_RECONNECT: "ROOM_RECONNECT",
  ROOM_LEFT: "ROOM_LEFT",
  ROOM_STATE: "ROOM_STATE",
  ROOM_ERROR: "ROOM_ERROR",
  PONG: "PONG",
  PLAYER_STATUS_CHANGED: "PLAYER_STATUS_CHANGED",
  TEST_PLAY: "TEST_PLAY",
} as const;

// Payloads Client -> Server (External)
export interface CreateRoomClientPayload {
  isTestRoom?: boolean;
}

export interface StartGameClientPayload {
  modeName: string; // Ex: "Default"
  configs: Configs;
  numberOfDecks: number;
  seed?: number;
  isTestRoom?: boolean;
}

// Payloads Server -> Client (External)
export interface RoomCreatedServerPayload {
  roomName: string;
  playerId: number; // O criador sempre recebe playerId: 0
}

export interface RoomJoinedServerPayload {
  roomName: string;
  playerId: number;
  players: Array<{ id: number; isBot?: boolean }>;
  isBot?: boolean;
}

export interface RoomReconnectServerPayload {
  roomName: string;
  playerId: number;
}

export interface RoomLeftServerPayload {
  roomName: string;
  playerId: number;
}

export interface RoomStateServerPayload {
  roomName: string;
  players: Array<{
    id: number;
    isBot: boolean;
  }>;
}

export interface RoomErrorServerPayload {
  message: string;
  code?: string;
  details?: unknown;
}

export interface PongServerPayload {
  timestamp: number;
}

export interface PlayerStatusChangedServerPayload {
  playerId: number;
  isConnected: boolean;
  isBot: boolean;
}

export interface TestPlayServerPayload {
  eventName: string;
  data: unknown;
}

// ==========================================
// 4. Eventos de JOGO (GAME Events)
// ==========================================

export const GameClientEvents = {
  PLAY_CARD: "client:PLAY_CARD",
  JUMP_IN: "client:JUMP_IN",
  DRAW_CHOICE: "client:DRAW_CHOICE",
  KEEP_EVENT: "client:KEEP_EVENT",
  CHOOSE_COLOR: "client:CHOOSE_COLOR",
  SELECT_HAND: "client:SELECT_HAND",
  CHALLENGE: "client:CHALLENGE",
  UNO: "client:UNO",
} as const;

export const GameServerEvents = {
  // Estado e Turnos
  GAME_STARTED: "GAME_STARTED",
  GAME_SNAPSHOT: "GAME_SNAPSHOT",
  PERMISSIONS: "PERMISSIONS",
  CARD_DRAW: "CARD_DRAW",
  NEW_HAND: "NEW_HAND",
  HAND_CHANGED: "HAND_CHANGED",
  DIRECTION: "DIRECTION",
  CHOOSE: "CHOOSE",
  DRAW2_OPTIONS: "DRAW2_OPTIONS",
  CHALLENGE_RESULT: "CHALLENGE_RESULT",
  SHOW_HAND: "SHOW_HAND",
  TIMEOUT_TO_PLAYER: "TIMEOUT-TO-PLAYER",

  // Notificações de Ações (Broadcast para a mesa)
  BROADCAST_PLAY_CARD: "BROADCAST:client:PLAY_CARD",
  BROADCAST_JUMP_IN: "BROADCAST:client:JUMP_IN",
  BROADCAST_CHALLENGE: "BROADCAST:client:CHALLENGE",
  BROADCAST_UNO: "BROADCAST:client:UNO",
  BROADCAST_WILD_CHOOSE: "BROADCAST:WILD_CHOOSE",
  BROADCAST_7_EFFECT_CHOOSE: "BROADCAST:7_EFFECT_CHOOSE",
  BROADCAST_WIN: "BROADCAST:WIN",
  WIN: "WIN",
} as const;

// Payloads Client -> Server (Game)
export interface PlayCardClientPayload {
  cardId: number;
  playerId?: number;
  saidUno?: boolean;
}

export interface JumpInClientPayload {
  cardJumpedId: number;
  targetId: number;
}

export interface DrawChoiceClientPayload {
  playerId?: number;
}

export type KeepEventClientPayload = Record<string, never>;

export interface ChooseColorClientPayload {
  color: COLOR | "BLUE" | "RED" | "GREEN" | "YELLOW";
}

export interface SelectHandClientPayload {
  targetId: number;
}

export interface ChallengeClientPayload {
  challenge: boolean;
  playerId?: number;
}

export interface UnoClientPayload {
  playerId?: number;
}

// Payloads Server -> Client (Game)
export interface GameStartedServerPayload {
  roomName: string;
  modeName: string;
  configs: Configs;
  initialDiscard: SerializedCard;
  seed?: number;
}

export interface GameSnapshotServerPayload {
  players: Array<{
    id: number;
    handCount: number;
    lastClientEventName: string | null;
  }>;
  playerOrder: number[];
  currentPlayerId: number;
  direction: "CLOCKWISE" | "COUNTER_CLOCKWISE" | string;
  handCards: SerializedCard[];
  topDiscard: SerializedCard | null;
  timers: Array<{
    duration: number;
    createdAt: number;
    remainingTime: number;
  }>;
  lastEvent: { name: string; data: unknown; sendedBy?: number } | null;
  lastClientEventName: string | null;
  allowedEvents: string[];
  gameRound: number;
  configs: Record<string, unknown>;
}

export interface PermissionsServerPayload {
  allowedEvents: string[][]; // Ex: [["client:PLAY_CARD", "client:DRAW_CHOICE"]]
  playerId: number;
  timeout?: number; // Tempo em milissegundos (padrão 3000ms)
  allowedCards?: SerializedCard[]; // Cartas da mão que são jogáveis neste turno
}

export interface CardDrawServerPayload {
  playerId: number;
  quantity: number;
  cards: SerializedCard[];
}

export interface NewHandServerPayload {
  playerId: number;
  hand: SerializedCard[];
}

export interface HandChangedServerPayload {
  playerId: number;
  targetId: number;
}

export interface DirectionServerPayload {
  direction: "CLOCKWISE" | "COUNTER_CLOCKWISE" | string;
}

export interface ChooseServerPayload {
  playerId: number;
}

export type Draw2OptionsServerPayload = void | undefined;

export interface ChallengeResultServerPayload {
  playerId: number;
  challengeResult: boolean; // true = blefe comprovado (desafiante ganhou); false = blefe não houve (desafiante perdeu)
}

export interface ShowHandServerPayload {
  playerId: number;
  cards: SerializedCard[];
}

export interface TimeoutToPlayerServerPayload {
  playerId: number;
}

// Broadcasts Server -> Client
export interface BroadcastPlayCardPayload {
  card: SerializedCard;
  saidUno?: boolean;
}

export interface BroadcastJumpInPayload {
  target: SerializedCard;
  cardJumpedIn: SerializedCard;
}

export interface BroadcastChallengePayload {
  challenge: boolean;
}

export interface BroadcastUnoPayload {
  playerId?: number;
}

export interface BroadcastWildChoosePayload {
  color: COLOR | string;
}

export interface BroadcastSevenEffectChoosePayload {
  targetId: number;
}

export type BroadcastWinPayload = Record<string, never>;

// ==========================================
// 5. Mapeamento Discriminado para Frontend
// ==========================================

export type ServerToClientPayloadMap = {
  // Externos
  ROOM_CREATED: RoomCreatedServerPayload;
  ROOM_JOINED: RoomJoinedServerPayload;
  ROOM_RECONNECT: RoomReconnectServerPayload;
  ROOM_LEFT: RoomLeftServerPayload;
  ROOM_STATE: RoomStateServerPayload;
  ROOM_ERROR: RoomErrorServerPayload;
  PONG: PongServerPayload;
  PLAYER_STATUS_CHANGED: PlayerStatusChangedServerPayload;
  TEST_PLAY: TestPlayServerPayload;

  // Jogo - Estado
  GAME_STARTED: GameStartedServerPayload;
  GAME_SNAPSHOT: GameSnapshotServerPayload;
  PERMISSIONS: PermissionsServerPayload;
  CARD_DRAW: CardDrawServerPayload;
  NEW_HAND: NewHandServerPayload;
  HAND_CHANGED: HandChangedServerPayload;
  DIRECTION: DirectionServerPayload;
  CHOOSE: ChooseServerPayload;
  DRAW2_OPTIONS: Draw2OptionsServerPayload;
  CHALLENGE_RESULT: ChallengeResultServerPayload;
  SHOW_HAND: ShowHandServerPayload;
  "TIMEOUT-TO-PLAYER": TimeoutToPlayerServerPayload;

  // Jogo - Broadcasts
  "BROADCAST:client:PLAY_CARD": BroadcastPlayCardPayload;
  "BROADCAST:client:JUMP_IN": BroadcastJumpInPayload;
  "BROADCAST:client:CHALLENGE": BroadcastChallengePayload;
  "BROADCAST:client:UNO": BroadcastUnoPayload;
  "BROADCAST:WILD_CHOOSE": BroadcastWildChoosePayload;
  "BROADCAST:7_EFFECT_CHOOSE": BroadcastSevenEffectChoosePayload;
  "BROADCAST:WIN": BroadcastWinPayload;
  WIN: BroadcastWinPayload;
};

export type ServerEventName = keyof ServerToClientPayloadMap;

export interface ServerEventMessage<
  K extends ServerEventName = ServerEventName,
> {
  type: EventNetworkType;
  name: K;
  roomName: string;
  sendedBy: number;
  data: ServerToClientPayloadMap[K];
}

// ==========================================
// 6. Mapeamento Cliente -> Servidor
// ==========================================

export type ClientExternalPayloadMap = {
  createRoom: CreateRoomClientPayload;
  joinRoom: Record<string, never> | unknown;
  reconnectRoom: Record<string, never> | unknown;
  addBot: Record<string, never> | unknown;
  leaveRoom: Record<string, never> | unknown;
  getRoomState: Record<string, never> | unknown;
  startGame: StartGameClientPayload;
  ping: Record<string, never> | unknown;
};

export type ClientGamePayloadMap = {
  "client:PLAY_CARD": PlayCardClientPayload;
  "client:JUMP_IN": JumpInClientPayload;
  "client:DRAW_CHOICE": DrawChoiceClientPayload;
  "client:KEEP_EVENT": KeepEventClientPayload;
  "client:CHOOSE_COLOR": ChooseColorClientPayload;
  "client:SELECT_HAND": SelectHandClientPayload;
  "client:CHALLENGE": ChallengeClientPayload;
  "client:UNO": UnoClientPayload;
};

export type ClientExternalEventName = keyof ClientExternalPayloadMap;
export type ClientGameEventName = keyof ClientGamePayloadMap;

export type ClientExternalEventMessage<
  K extends ClientExternalEventName = ClientExternalEventName,
> = {
  type: "EXTERNAL";
  name: K;
  roomName: string;
  sendedBy: number;
  data: ClientExternalPayloadMap[K];
};

export type ClientGameEventMessage<
  K extends ClientGameEventName = ClientGameEventName,
> = {
  type: "GAME";
  name: K;
  roomName: string;
  sendedBy: number;
  data: {
    data: ClientGamePayloadMap[K];
  };
};

export type ClientEventMessage =
  | ClientExternalEventMessage
  | ClientGameEventMessage;
