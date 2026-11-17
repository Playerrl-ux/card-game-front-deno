import { create } from "zustand";
import {
  Configs,
  SerializedCard,
  ServerEventMessage,
  ExternalServerEvents,
  GameServerEvents,
  GameSnapshotServerPayload,
  BroadcastUnoPayload,
} from "@/shared/events.map";
import { wsService, ConnectionState } from "@/services/websocket";
import { sound } from "@/services/sound";
import confetti from "canvas-confetti";

export interface PlayerSlot {
  id: number;
  name: string;
  isBot: boolean;
  isConnected: boolean;
}

export interface ToastMessage {
  id: number;
  type: "success" | "error" | "info";
  text: string;
}

export interface RevealedOpponentHand {
  playerId: number;
  playerName: string;
  cards: SerializedCard[];
}

export type SyncedClientEventName =
  | "client:PLAY_CARD"
  | "client:JUMP_IN"
  | "client:CHOOSE_COLOR";

export const SYNCED_CLIENT_EVENTS: readonly SyncedClientEventName[] = [
  "client:PLAY_CARD",
  "client:JUMP_IN",
  "client:CHOOSE_COLOR",
] as const;

export const EXPECTED_BROADCAST_FOR_CLIENT_EVENT: Record<SyncedClientEventName, string> = {
  "client:PLAY_CARD": GameServerEvents.BROADCAST_PLAY_CARD,
  "client:JUMP_IN": GameServerEvents.BROADCAST_JUMP_IN,
  "client:CHOOSE_COLOR": GameServerEvents.BROADCAST_WILD_CHOOSE,
};

export interface OptimisticStateSnapshot {
  handCards: SerializedCard[];
  topDiscard: SerializedCard | null;
  effectiveColor: string | null;
  playerHandCounts: Record<number, number>;
  showColorPicker: boolean;
  hasDrawnPlayableCard: boolean;
  myAllowedEvents: string[];
  allowedCards: SerializedCard[];
  lastPlayedPlayerId: number | null;
}

export interface PendingClientAction {
  eventName: SyncedClientEventName;
  payload: Record<string, unknown>;
  expectedBroadcast: string;
  previousState: OptimisticStateSnapshot;
  timestamp: number;
}

interface GameState {
  // Conexão
  connectionState: ConnectionState;
  connect: () => Promise<boolean>;
  disconnect: () => void;

  // Identidade do Jogador na Sala
  playerId: number | null;

  // Estado da Sala
  roomName: string;
  inLobby: boolean;
  inGame: boolean;
  players: PlayerSlot[];
  maxPlayers: number;
  setMaxPlayers: (count: number) => void;

  // Reconexão / Histórico
  lastRoomName: string | null;
  lastPlayerId: number | null;
  lastRoomIsCreator: boolean;

  // Configurações da Partida
  gameConfigs: Configs;
  numberOfDecks: number;
  setGameConfig: <K extends keyof Configs>(key: K, value: Configs[K]) => void;
  setNumberOfDecks: (decks: number) => void;

  // UI / Feedback
  toast: ToastMessage | null;
  errorMessage: string | null;
  isLoading: boolean;
  clearError: () => void;
  showToast: (text: string, type?: "success" | "error" | "info") => void;

  // Estado do Jogo em Andamento (Inicial)
  initialDiscard: SerializedCard | null;
  topDiscard: SerializedCard | null;
  effectiveColor: string | null;
  handCards: SerializedCard[];
  currentPlayerTurn: number | null;
  direction: "CLOCKWISE" | "COUNTER_CLOCKWISE" | string;
  myAllowedEvents: string[];
  allowedCards: SerializedCard[];
  playerHandCounts: Record<number, number>;
  winnerPlayerId: number | null;
  hasDrawnPlayableCard: boolean;

  // Mecânica do UNO
  saidUnoPending: boolean;
  vulnerableUnoPlayerId: number | null;
  setSaidUnoPending: (pending: boolean) => void;
  toggleSaidUno: () => void;
  callUno: () => void;

  // Modais de Ação
  showColorPicker: boolean;
  showHandPicker: boolean;
  showChallengeModal: boolean;
  revealedOpponentHand: RevealedOpponentHand | null;
  setShowColorPicker: (show: boolean) => void;
  setShowHandPicker: (show: boolean) => void;
  setShowChallengeModal: (show: boolean) => void;
  setRevealedOpponentHand: (hand: RevealedOpponentHand | null) => void;
  showOpponentHand: (playerId: number, playerName: string, cards: SerializedCard[]) => void;

  // Ações de Jogo (Client -> Server)
  playCard: (cardId: number, saidUno?: boolean) => void;
  drawCard: () => void;
  keepCard: () => void;
  chooseColor: (color: "RED" | "BLUE" | "GREEN" | "YELLOW") => void;
  selectHandTarget: (targetId: number) => void;
  jumpIn: (cardId: number) => void;
  respondChallenge: (challenge: boolean) => void;

  // Ações de Sala (Client -> Server)
  createRoom: (name: string) => Promise<boolean>;
  joinRoom: (name: string) => Promise<boolean>;
  reconnectRoom: () => Promise<boolean>;
  clearSavedRoomSession: () => void;
  leaveRoom: () => void;
  returnToLobby: () => void;
  addBot: () => void;
  startGame: () => void;
  refreshRoomState: () => void;
  syncHandCountsWithServer: (force?: boolean) => void;

  // Feedback visual de compras e jogadas
  isDrawingCard: boolean;
  lastPlayedPlayerId: number | null;
  rivalDrawAlert: { playerId: number; quantity: number; id: number } | null;
  triggerDrawAnimation: (count?: number) => void;
  triggerRivalDrawAnimation: (playerId: number, quantity: number) => void;

  // Controle de Timeout do Turno
  turnTimeoutMs: number | null;
  turnTimeoutDeadline: number | null;
  remainingTurnSeconds: number | null;
  timeoutNotice: { text: string; isMe: boolean; id: number } | null;
  setTimeoutNotice: (text: string, isMe: boolean) => void;
  clearTimeoutTimer: () => void;

  // Sincronização Otimista e Reversão (Rollback) de Ações do Cliente
  lastClientAction: PendingClientAction | null;
  rollbackLastClientAction: () => void;

  // Processador Central de Mensagens do Servidor
  handleServerMessage: (msg: ServerEventMessage) => void;
  processEventQueue: () => Promise<void>;
  applyServerMessage: (msg: ServerEventMessage) => void;
}

const DEFAULT_CONFIGS: Configs = {
  SEVEN_HAS_EFFECT: true,
  ZERO_HAS_EFFECT: true,
  DRAW_2_OVER_DRAW_4: true,
  DRAW_UNTIL_HAVE: false,
  JUMPIN: true,
  DRAW_4_CHALLENGES: true,
  CanWin: true,
};

// Formatação padronizada: Player 0, Player 1, etc.
const getPlayerDisplayName = (id: number, isBot: boolean, myId: number | null): string => {
  if (isBot) {
    return `Bot ${id}`;
  }
  if (myId !== null && id === myId) {
    return `Player ${id} (Você)`;
  }
  return `Player ${id}`;
};

// =========================================================================
// Fila e Cadência Visual de Eventos de Jogo (Previne avalanche rápida dos bots)
// =========================================================================
let messageQueue: ServerEventMessage[] = [];
let isProcessingQueue = false;
let queueTimer: NodeJS.Timeout | null = null;

let turnTimerInterval: NodeJS.Timeout | null = null;
let timeoutNoticeTimer: NodeJS.Timeout | null = null;
let lastPlayedTickSecond: number | null = null;

export const clearTurnTimer = () => {
  if (turnTimerInterval) {
    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
  }
  lastPlayedTickSecond = null;
};

let unoTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

export const clearUnoTimer = () => {
  if (unoTimeoutTimer) {
    clearTimeout(unoTimeoutTimer);
    unoTimeoutTimer = null;
  }
};

export const clearEventQueue = () => {
  messageQueue = [];
  isProcessingQueue = false;
  if (queueTimer) {
    clearTimeout(queueTimer);
    queueTimer = null;
  }
  clearTurnTimer();
  clearUnoTimer();
};

let revealedHandTimer: ReturnType<typeof setTimeout> | null = null;
let lastChallengeResult: { won: boolean; timestamp: number; challengerId: number } | null = null;
let pendingRevealedHand: { playerId: number; cards: SerializedCard[]; timestamp: number } | null = null;
const knownBotIds = new Set<number>();
let pendingBotAdditions = 0;
let isAttemptingReconnect = false;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

const PACED_GAME_EVENTS = new Set<string>([
  GameServerEvents.BROADCAST_PLAY_CARD,
  GameServerEvents.BROADCAST_JUMP_IN,
  GameServerEvents.BROADCAST_UNO,
  GameServerEvents.BROADCAST_WILD_CHOOSE,
  GameServerEvents.BROADCAST_7_EFFECT_CHOOSE,
  GameServerEvents.DIRECTION,
  GameServerEvents.CARD_DRAW,
  GameServerEvents.PERMISSIONS,
  GameServerEvents.TIMEOUT_TO_PLAYER,
  GameServerEvents.NEW_HAND,
  GameServerEvents.HAND_CHANGED,
  GameServerEvents.CHOOSE,
  GameServerEvents.CHALLENGE_RESULT,
  GameServerEvents.SHOW_HAND,
  GameServerEvents.BROADCAST_WIN,
  GameServerEvents.WIN,
]);

const rotatePlayerHandCounts = (
  currentCounts: Record<number, number>,
  players: PlayerSlot[],
  direction: "CLOCKWISE" | "COUNTER_CLOCKWISE" | string
): Record<number, number> => {
  if (players.length < 2) return currentCounts;
  const isClockwise = direction === "CLOCKWISE" || direction === "RIGHT";
  const rotatedCounts: Record<number, number> = { ...currentCounts };

  for (let i = 0; i < players.length; i++) {
    const fromPlayer = players[i];
    const nextIndex = isClockwise
      ? (i + 1) % players.length
      : (i - 1 + players.length) % players.length;
    const toPlayer = players[nextIndex];
    rotatedCounts[toPlayer.id] = currentCounts[fromPlayer.id] ?? 7;
  }

  return rotatedCounts;
};

const calculateEventDelay = (
  msg: ServerEventMessage,
  queueLength: number,
  myId: number | null
): number => {
  // Acelera dinamicamente caso a fila acumule muitas jogadas dos bots
  const speed = queueLength > 4 ? 0.35 : queueLength > 2 ? 0.65 : 1.0;

  switch (msg.name) {
    case GameServerEvents.BROADCAST_PLAY_CARD:
    case GameServerEvents.BROADCAST_JUMP_IN: {
      const isMe = msg.sendedBy === myId;
      if (isMe) return Math.round(120 * speed);
      // Para jogadas de bots, delay perceptível para que o humano veja cada jogada
      return Math.round(480 * speed);
    }
    case GameServerEvents.BROADCAST_UNO:
      return Math.round(280 * speed);
    case GameServerEvents.CARD_DRAW: {
      const payload = msg.data as { playerId: number; quantity: number };
      const isMe = payload?.playerId === myId;
      if (isMe) return Math.round(200 * speed);
      return Math.round(350 * speed);
    }
    case GameServerEvents.BROADCAST_WILD_CHOOSE:
      return Math.round(350 * speed);
    case GameServerEvents.BROADCAST_7_EFFECT_CHOOSE:
      return Math.round(400 * speed);
    case GameServerEvents.DIRECTION:
      return Math.round(280 * speed);
    case GameServerEvents.TIMEOUT_TO_PLAYER:
      return Math.round(400 * speed);
    case GameServerEvents.SHOW_HAND:
      return 2000;
    case GameServerEvents.BROADCAST_WIN:
    case GameServerEvents.WIN:
      return 600;
    default:
      return 0;
  }
};

const startTurnCountdown = (
  timeoutMs: number,
  set: (partial: Partial<GameState>) => void
): { deadline: number; initialRemainingSec: number | null } => {
  clearTurnTimer();
  const deadline = Date.now() + timeoutMs;
  let initialRemainingSec: number | null = null;
  const diffSec = Math.ceil(timeoutMs / 1000);
  if (diffSec <= 5 && diffSec > 0) {
    initialRemainingSec = diffSec;
    lastPlayedTickSecond = diffSec;
    sound.playTick();
  }

  turnTimerInterval = setInterval(() => {
    const diffMs = deadline - Date.now();
    const remainingSec = Math.ceil(diffMs / 1000);

    if (diffMs <= 0) {
      clearTurnTimer();
      set({
        remainingTurnSeconds: null,
        turnTimeoutDeadline: null,
      });
      return;
    }

    if (remainingSec <= 5) {
      set({ remainingTurnSeconds: remainingSec });
      if (remainingSec !== lastPlayedTickSecond && remainingSec > 0) {
        lastPlayedTickSecond = remainingSec;
        sound.playTick();
      }
    } else {
      set({ remainingTurnSeconds: null });
    }
  }, 200);

  return { deadline, initialRemainingSec };
};

export const useGameStore = create<GameState>((set, get) => {
  // Inicialização com dados do LocalStorage
  const savedLastRoom = localStorage.getItem("uno_lastRoomName");
  const savedLastPlayerId = localStorage.getItem("uno_lastPlayerId");
  const savedLastIsCreator = localStorage.getItem("uno_lastRoomIsCreator") === "true";

  let savedConfigs = { ...DEFAULT_CONFIGS };
  const savedConfigsRaw = localStorage.getItem("uno_lastCreatorConfigs");
  if (savedConfigsRaw) {
    try {
      savedConfigs = { ...DEFAULT_CONFIGS, ...JSON.parse(savedConfigsRaw) };
    } catch {
      // Ignora erro de parse
    }
  }

  const savedDecksRaw = localStorage.getItem("uno_lastCreatorDecks");
  const savedDecks = savedDecksRaw ? Math.max(1, Math.min(4, Number(savedDecksRaw) || 1)) : 1;

  // Conectar listener de mensagens e status do WebSocket
  wsService.onStateChange((state) => {
    set({ connectionState: state });
  });

  wsService.onMessage((msg) => {
    get().handleServerMessage(msg);
  });

  return {
    connectionState: "DISCONNECTED",
    playerId: null,
    roomName: "",
    inLobby: false,
    inGame: false,
    players: [],
    maxPlayers: 4,
    lastRoomName: savedLastRoom,
    lastPlayerId: savedLastPlayerId ? Number(savedLastPlayerId) : null,
    lastRoomIsCreator: savedLastIsCreator,
    gameConfigs: savedConfigs,
    numberOfDecks: savedDecks,
    toast: null,
    errorMessage: null,
    isLoading: false,

    // Estado do Jogo em Andamento
    initialDiscard: null,
    topDiscard: null,
    effectiveColor: null,
    handCards: [],
    currentPlayerTurn: null,
    direction: "CLOCKWISE",
    myAllowedEvents: [],
    allowedCards: [],
    playerHandCounts: {},
    winnerPlayerId: null,
    hasDrawnPlayableCard: false,
    saidUnoPending: false,
    vulnerableUnoPlayerId: null,

    // Feedback visual de compras e jogadas
    isDrawingCard: false,
    lastPlayedPlayerId: null,
    rivalDrawAlert: null,
    triggerDrawAnimation: (_count = 1) => {
      sound.playDraw();
      set({ isDrawingCard: true });
      setTimeout(() => {
        set({ isDrawingCard: false });
      }, 450);
    },
    triggerRivalDrawAnimation: (playerId: number, quantity: number) => {
      sound.playDraw();
      const alertId = Date.now() + Math.random();
      set({ rivalDrawAlert: { playerId, quantity, id: alertId } });
      setTimeout(() => {
        if (get().rivalDrawAlert?.id === alertId) {
          set({ rivalDrawAlert: null });
        }
      }, 1200);
    },

    // Controle de Timeout do Turno
    turnTimeoutMs: null,
    turnTimeoutDeadline: null,
    remainingTurnSeconds: null,
    timeoutNotice: null,

    setTimeoutNotice: (text: string, isMe: boolean) => {
      if (timeoutNoticeTimer) {
        clearTimeout(timeoutNoticeTimer);
        timeoutNoticeTimer = null;
      }
      const id = Date.now();
      set({ timeoutNotice: { text, isMe, id } });
      timeoutNoticeTimer = setTimeout(() => {
        if (get().timeoutNotice?.id === id) {
          set({ timeoutNotice: null });
        }
      }, 3500);
    },

    clearTimeoutTimer: () => {
      clearTurnTimer();
      set({
        turnTimeoutMs: null,
        turnTimeoutDeadline: null,
        remainingTurnSeconds: null,
      });
    },

    // Modais
    showColorPicker: false,
    showHandPicker: false,
    showChallengeModal: false,
    revealedOpponentHand: null,
    setShowColorPicker: (show) => set({ showColorPicker: show }),
    setShowHandPicker: (show) => set({ showHandPicker: show }),
    setShowChallengeModal: (show) => set({ showChallengeModal: show }),
    setRevealedOpponentHand: (hand) => set({ revealedOpponentHand: hand }),
    showOpponentHand: (targetId, playerName, cards) => {
      if (revealedHandTimer) {
        clearTimeout(revealedHandTimer);
        revealedHandTimer = null;
      }
      set({
        revealedOpponentHand: {
          playerId: targetId,
          playerName,
          cards,
        },
      });
      revealedHandTimer = setTimeout(() => {
        set({ revealedOpponentHand: null });
        revealedHandTimer = null;
      }, 2000);
    },

    // Sincronização Otimista e Reversão (Rollback) de Ações do Cliente
    lastClientAction: null,

    rollbackLastClientAction: () => {
      const pending = get().lastClientAction;
      if (!pending) return;

      const snap = pending.previousState;
      set({
        handCards: snap.handCards,
        topDiscard: snap.topDiscard,
        effectiveColor: snap.effectiveColor,
        playerHandCounts: snap.playerHandCounts,
        showColorPicker: snap.showColorPicker,
        hasDrawnPlayableCard: snap.hasDrawnPlayableCard,
        myAllowedEvents: snap.myAllowedEvents,
        allowedCards: snap.allowedCards,
        lastPlayedPlayerId: snap.lastPlayedPlayerId,
        lastClientAction: null,
      });
    },

    // Ações de UNO
    setSaidUnoPending: (pending: boolean) => set({ saidUnoPending: pending }),

    toggleSaidUno: () => {
      sound.playClick();
      set((s) => ({ saidUnoPending: !s.saidUnoPending }));
    },

    callUno: () => {
      const state = get();
      const { roomName, playerId, vulnerableUnoPlayerId } = state;
      if (!roomName || playerId === null) return;
      sound.playClick();
      wsService.sendGame(
        "client:UNO",
        { playerId: vulnerableUnoPlayerId !== null ? vulnerableUnoPlayerId : undefined },
        roomName,
        playerId
      );
      clearUnoTimer();
      set({ vulnerableUnoPlayerId: null });
    },

    // Ações de Jogo
    playCard: (cardId: number, saidUno?: boolean) => {
      const state = get();
      const { roomName, playerId } = state;
      if (!roomName || playerId === null) return;
      state.clearTimeoutTimer();
      sound.playClick();

      const finalSaidUno = typeof saidUno === "boolean" ? saidUno : state.saidUnoPending;

      const playedCard = state.handCards.find((c) => c.id === cardId);
      if (playedCard) {
        const snapshot: OptimisticStateSnapshot = {
          handCards: [...state.handCards],
          topDiscard: state.topDiscard ? { ...state.topDiscard } : null,
          effectiveColor: state.effectiveColor,
          playerHandCounts: { ...state.playerHandCounts },
          showColorPicker: state.showColorPicker,
          hasDrawnPlayableCard: state.hasDrawnPlayableCard,
          myAllowedEvents: [...state.myAllowedEvents],
          allowedCards: [...state.allowedCards],
          lastPlayedPlayerId: state.lastPlayedPlayerId,
        };

        const updatedHand = state.handCards.filter((c) => c.id !== cardId);
        let newCounts: Record<number, number> = {
          ...state.playerHandCounts,
          [playerId]: updatedHand.length,
        };

        const isZero = playedCard.value === 0 || playedCard.name.endsWith("_0");
        const zeroEffect = Boolean(state.gameConfigs.ZERO_HAS_EFFECT ?? true);
        if (isZero && zeroEffect) {
          newCounts = rotatePlayerHandCounts(newCounts, state.players, state.direction);
        }

        set({
          handCards: updatedHand,
          topDiscard: playedCard,
          effectiveColor: playedCard.effectiveColor ?? playedCard.color,
          playerHandCounts: newCounts,
          hasDrawnPlayableCard: false,
          showColorPicker: false,
          saidUnoPending: false,
          myAllowedEvents: [],
          allowedCards: [],
          lastPlayedPlayerId: playerId,
          lastClientAction: {
            eventName: "client:PLAY_CARD",
            payload: { cardId, saidUno: finalSaidUno },
            expectedBroadcast: EXPECTED_BROADCAST_FOR_CLIENT_EVENT["client:PLAY_CARD"],
            previousState: snapshot,
            timestamp: Date.now(),
          },
        });
      }

      wsService.sendGame("client:PLAY_CARD", { cardId, saidUno: finalSaidUno }, roomName, playerId);
    },

    drawCard: () => {
      const { roomName, playerId } = get();
      if (!roomName || playerId === null) return;
      get().clearTimeoutTimer();
      sound.playDraw();
      wsService.sendGame("client:DRAW_CHOICE", {}, roomName, playerId);
    },

    keepCard: () => {
      const { roomName, playerId } = get();
      if (!roomName || playerId === null) return;
      get().clearTimeoutTimer();
      sound.playClick();
      set({ hasDrawnPlayableCard: false });
      wsService.sendGame("client:KEEP_EVENT", {}, roomName, playerId);
    },

    chooseColor: (color: "RED" | "BLUE" | "GREEN" | "YELLOW") => {
      const state = get();
      const { roomName, playerId } = state;
      if (!roomName || playerId === null) return;
      state.clearTimeoutTimer();
      sound.playClick();

      const snapshot: OptimisticStateSnapshot = {
        handCards: [...state.handCards],
        topDiscard: state.topDiscard ? { ...state.topDiscard } : null,
        effectiveColor: state.effectiveColor,
        playerHandCounts: { ...state.playerHandCounts },
        showColorPicker: state.showColorPicker,
        hasDrawnPlayableCard: state.hasDrawnPlayableCard,
        myAllowedEvents: [...state.myAllowedEvents],
        allowedCards: [...state.allowedCards],
        lastPlayedPlayerId: state.lastPlayedPlayerId,
      };

      set({
        showColorPicker: false,
        effectiveColor: color,
        topDiscard: state.topDiscard
          ? { ...state.topDiscard, effectiveColor: color }
          : null,
        lastClientAction: {
          eventName: "client:CHOOSE_COLOR",
          payload: { color },
          expectedBroadcast: EXPECTED_BROADCAST_FOR_CLIENT_EVENT["client:CHOOSE_COLOR"],
          previousState: snapshot,
          timestamp: Date.now(),
        },
      });

      wsService.sendGame("client:CHOOSE_COLOR", { color }, roomName, playerId);
    },

    selectHandTarget: (targetId: number) => {
      const { roomName, playerId } = get();
      if (!roomName || playerId === null) return;
      get().clearTimeoutTimer();
      sound.playClick();
      set({ showHandPicker: false });
      wsService.sendGame("client:SELECT_HAND", { targetId }, roomName, playerId);
    },

    jumpIn: (cardId: number) => {
      const state = get();
      const { roomName, playerId, topDiscard } = state;
      if (!roomName || playerId === null || !topDiscard) return;
      state.clearTimeoutTimer();
      sound.playClick();

      const jumpedCard = state.handCards.find((c) => c.id === cardId);
      if (jumpedCard) {
        const snapshot: OptimisticStateSnapshot = {
          handCards: [...state.handCards],
          topDiscard: state.topDiscard ? { ...state.topDiscard } : null,
          effectiveColor: state.effectiveColor,
          playerHandCounts: { ...state.playerHandCounts },
          showColorPicker: state.showColorPicker,
          hasDrawnPlayableCard: state.hasDrawnPlayableCard,
          myAllowedEvents: [...state.myAllowedEvents],
          allowedCards: [...state.allowedCards],
          lastPlayedPlayerId: state.lastPlayedPlayerId,
        };

        const updatedHand = state.handCards.filter((c) => c.id !== cardId);
        let newCounts: Record<number, number> = {
          ...state.playerHandCounts,
          [playerId]: updatedHand.length,
        };

        const isZero = jumpedCard.value === 0 || jumpedCard.name.endsWith("_0");
        const zeroEffect = Boolean(state.gameConfigs.ZERO_HAS_EFFECT ?? true);
        if (isZero && zeroEffect) {
          newCounts = rotatePlayerHandCounts(newCounts, state.players, state.direction);
        }

        set({
          handCards: updatedHand,
          topDiscard: jumpedCard,
          effectiveColor: jumpedCard.effectiveColor ?? jumpedCard.color,
          playerHandCounts: newCounts,
          lastPlayedPlayerId: playerId,
          lastClientAction: {
            eventName: "client:JUMP_IN",
            payload: { cardJumpedId: cardId, targetId: topDiscard.id },
            expectedBroadcast: EXPECTED_BROADCAST_FOR_CLIENT_EVENT["client:JUMP_IN"],
            previousState: snapshot,
            timestamp: Date.now(),
          },
        });
      }

      wsService.sendGame("client:JUMP_IN", { cardJumpedId: cardId, targetId: topDiscard.id }, roomName, playerId);
    },

    respondChallenge: (challenge: boolean) => {
      const { roomName, playerId } = get();
      if (!roomName || playerId === null) return;
      sound.playClick();

      if (!challenge) {
        // Se o jogador clica para NÃO desafiar:
        // Fecha o modal e remove a permissão de desafiar para que ele possa realizar as outras ações permitidas
        // (como jogar carta, comprar, etc.) sem enviar evento ao servidor (evitando falso positivo de desafio).
        set((state) => ({
          showChallengeModal: false,
          myAllowedEvents: state.myAllowedEvents.filter((e) => e !== "client:CHALLENGE"),
        }));
        return;
      }

      // Se o jogador clica para DESAFIAR:
      get().clearTimeoutTimer();
      set((state) => ({
        showChallengeModal: false,
        myAllowedEvents: state.myAllowedEvents.filter((e) => e !== "client:CHALLENGE"),
      }));
      wsService.sendGame("client:CHALLENGE", { challenge: true }, roomName, playerId);
    },

    connect: async () => {
      set({ isLoading: true });
      const success = await wsService.connect();
      set({ isLoading: false });
      return success;
    },

    disconnect: () => {
      clearEventQueue();
      clearTurnTimer();
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      isAttemptingReconnect = false;
      if (revealedHandTimer) {
        clearTimeout(revealedHandTimer);
        revealedHandTimer = null;
      }
      lastChallengeResult = null;
      pendingRevealedHand = null;
      knownBotIds.clear();
      pendingBotAdditions = 0;
      wsService.disconnect();
      set({
        inLobby: false,
        inGame: false,
        playerId: null,
        players: [],
        topDiscard: null,
        effectiveColor: null,
        handCards: [],
        currentPlayerTurn: null,
        winnerPlayerId: null,
        isDrawingCard: false,
        lastPlayedPlayerId: null,
        rivalDrawAlert: null,
        turnTimeoutMs: null,
        turnTimeoutDeadline: null,
        remainingTurnSeconds: null,
        timeoutNotice: null,
        lastClientAction: null,
        revealedOpponentHand: null,
      });
    },

    setMaxPlayers: (count: number) => {
      set({ maxPlayers: Math.max(2, Math.min(10, count)) });
    },

    setGameConfig: (key, value) => {
      sound.playToggle();
      set((state) => {
        const updated = {
          ...state.gameConfigs,
          [key]: value,
        };
        if (state.lastRoomIsCreator || state.playerId === 0 || !state.inLobby) {
          localStorage.setItem("uno_lastCreatorConfigs", JSON.stringify(updated));
        }
        return { gameConfigs: updated };
      });
    },

    setNumberOfDecks: (decks: number) => {
      const validDecks = Math.max(1, Math.min(4, decks));
      set((state) => {
        if (state.lastRoomIsCreator || state.playerId === 0 || !state.inLobby) {
          localStorage.setItem("uno_lastCreatorDecks", String(validDecks));
        }
        return { numberOfDecks: validDecks };
      });
    },

    clearError: () => set({ errorMessage: null }),

    showToast: (text: string, type = "info") => {
      const id = Date.now();
      set({ toast: { id, type, text } });
      setTimeout(() => {
        if (get().toast?.id === id) {
          set({ toast: null });
        }
      }, 4000);
    },

    createRoom: async (name: string) => {
      const cleanRoom = name.trim().toUpperCase();
      if (cleanRoom.length < 5 || cleanRoom.length > 10) {
        get().showToast("O nome da sala deve ter entre 5 e 10 caracteres.", "error");
        sound.playError();
        return false;
      }

      set({ isLoading: true, errorMessage: null });
      if (!wsService.isConnected()) {
        const connected = await wsService.connect();
        if (!connected) {
          set({ isLoading: false, errorMessage: "Não foi possível conectar ao servidor." });
          sound.playError();
          return false;
        }
      }

      const sent = wsService.sendExternal("createRoom", { isTestRoom: false }, cleanRoom, -1);
      if (!sent) {
        set({ isLoading: false, errorMessage: "Falha ao enviar solicitação para criar sala." });
        sound.playError();
        return false;
      }

      set({ roomName: cleanRoom });
      return true;
    },

    joinRoom: async (name: string) => {
      const cleanRoom = name.trim().toUpperCase();
      if (cleanRoom.length < 5 || cleanRoom.length > 10) {
        get().showToast("O nome da sala deve ter entre 5 e 10 caracteres.", "error");
        sound.playError();
        return false;
      }

      set({ isLoading: true, errorMessage: null });
      if (!wsService.isConnected()) {
        const connected = await wsService.connect();
        if (!connected) {
          set({ isLoading: false, errorMessage: "Não foi possível conectar ao servidor." });
          sound.playError();
          return false;
        }
      }

      const sent = wsService.sendExternal("joinRoom", {}, cleanRoom, -1);
      if (!sent) {
        set({ isLoading: false, errorMessage: "Falha ao solicitar entrada na sala." });
        sound.playError();
        return false;
      }

      set({ roomName: cleanRoom });
      return true;
    },

    clearSavedRoomSession: () => {
      try {
        localStorage.removeItem("uno_lastRoomName");
        localStorage.removeItem("uno_lastPlayerId");
        localStorage.removeItem("uno_lastRoomIsCreator");
        localStorage.removeItem("uno_lastCreatorConfigs");
        localStorage.removeItem("uno_lastCreatorDecks");
      } catch (err) {
        console.error("Falha ao limpar sessão do localStorage:", err);
      }
      wsService.clearSession();
      set({
        lastRoomName: null,
        lastPlayerId: null,
        lastRoomIsCreator: false,
        roomName: "",
        playerId: null,
        inLobby: false,
        inGame: false,
      });
    },

    reconnectRoom: async () => {
      const { lastRoomName, lastPlayerId } = get();
      if (!lastRoomName || lastPlayerId === null) {
        get().showToast("Nenhuma partida anterior encontrada para reconectar.", "info");
        return false;
      }

      set({ isLoading: true, errorMessage: null });
      if (!wsService.isConnected()) {
        const connected = await wsService.connect();
        if (!connected) {
          set({ isLoading: false, errorMessage: "Não foi possível conectar ao servidor para reconectar." });
          sound.playError();
          return false;
        }
      }

      isAttemptingReconnect = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      reconnectTimeout = setTimeout(() => {
        if (isAttemptingReconnect && !get().inGame && !get().inLobby) {
          isAttemptingReconnect = false;
          get().clearSavedRoomSession();
          set({
            isLoading: false,
            errorMessage: "A sala não existe mais.",
          });
          get().showToast("A sala não existe mais.", "error");
          sound.playError();
        }
      }, 5000);

      const sent = wsService.sendExternal("reconnectRoom", {}, lastRoomName, lastPlayerId);
      if (!sent) {
        isAttemptingReconnect = false;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        set({ isLoading: false, errorMessage: "Falha ao enviar pacote de reconexão." });
        sound.playError();
        return false;
      }

      // Mantém no LobbyAuth até o servidor responder se a sala é válida
      set({
        roomName: lastRoomName,
        playerId: lastPlayerId,
      });

      wsService.setSession(lastRoomName, lastPlayerId);
      get().showToast(`Tentando reconectar à sala ${lastRoomName}...`, "info");
      return true;
    },

    leaveRoom: () => {
      clearEventQueue();
      clearTurnTimer();
      const { roomName, playerId } = get();

      // Envia evento leaveRoom para o servidor (saída definitiva)
      if (roomName && playerId !== null) {
        wsService.sendExternal("leaveRoom", {}, roomName, playerId);
      }

      // Apaga imediatamente todos os dados da sala no banco local / localStorage
      get().clearSavedRoomSession();

      sound.playLeave();
      set({
        inLobby: false,
        inGame: false,
        roomName: "",
        playerId: null,
        players: [],
        initialDiscard: null,
        topDiscard: null,
        effectiveColor: null,
        handCards: [],
        currentPlayerTurn: null,
        direction: "CLOCKWISE",
        myAllowedEvents: [],
        allowedCards: [],
        playerHandCounts: {},
        winnerPlayerId: null,
        hasDrawnPlayableCard: false,
        saidUnoPending: false,
        vulnerableUnoPlayerId: null,
        showColorPicker: false,
        showHandPicker: false,
        showChallengeModal: false,
        revealedOpponentHand: null,
        isDrawingCard: false,
        lastPlayedPlayerId: null,
        rivalDrawAlert: null,
        turnTimeoutMs: null,
        turnTimeoutDeadline: null,
        remainingTurnSeconds: null,
        timeoutNotice: null,
        lastClientAction: null,
        lastRoomName: null,
        lastPlayerId: null,
        lastRoomIsCreator: false,
      });
      knownBotIds.clear();
      pendingBotAdditions = 0;
      get().showToast("Você saiu da sala.", "info");
    },

    returnToLobby: () => {
      const { roomName, playerId } = get();
      sound.playClick();
      clearTurnTimer();
      clearEventQueue();

      set({
        inGame: false,
        inLobby: true,
        winnerPlayerId: null,
        initialDiscard: null,
        topDiscard: null,
        effectiveColor: null,
        handCards: [],
        currentPlayerTurn: null,
        direction: "CLOCKWISE",
        myAllowedEvents: [],
        allowedCards: [],
        playerHandCounts: {},
        hasDrawnPlayableCard: false,
        saidUnoPending: false,
        vulnerableUnoPlayerId: null,
        showColorPicker: false,
        showHandPicker: false,
        showChallengeModal: false,
        revealedOpponentHand: null,
        isDrawingCard: false,
        lastPlayedPlayerId: null,
        rivalDrawAlert: null,
        turnTimeoutMs: null,
        turnTimeoutDeadline: null,
        remainingTurnSeconds: null,
        timeoutNotice: null,
        lastClientAction: null,
      });

      if (typeof window !== "undefined") {
        window.scrollTo({ left: 0, top: 0, behavior: "instant" as ScrollBehavior });
        if (document.documentElement) document.documentElement.scrollLeft = 0;
        if (document.body) document.body.scrollLeft = 0;
      }

      if (roomName && playerId !== null) {
        wsService.setSession(roomName, playerId);
        wsService.sendExternal("getRoomState", {}, roomName, playerId);
      }
      get().showToast("Retornou à sala de espera.", "info");
    },

    addBot: () => {
      const { roomName, playerId } = get();
      if (!roomName) return;
      sound.playClick();
      pendingBotAdditions++;
      wsService.sendExternal("addBot", {}, roomName, playerId ?? 0);
    },

    startGame: () => {
      const { roomName, playerId, gameConfigs, numberOfDecks, players } = get();
      if (!roomName) return;
      if (players.length < 2) {
        get().showToast("São necessários no mínimo 2 jogadores para iniciar.", "error");
        sound.playError();
        return;
      }

      sound.playClick();
      wsService.sendExternal(
        "startGame",
        {
          modeName: "Default",
          numberOfDecks,
          configs: gameConfigs,
        },
        roomName,
        playerId ?? 0
      );
    },

    refreshRoomState: () => {
      const { roomName, playerId } = get();
      if (typeof window !== "undefined") {
        window.scrollTo({ left: 0, top: 0, behavior: "instant" as ScrollBehavior });
        if (document.documentElement) document.documentElement.scrollLeft = 0;
        if (document.body) document.body.scrollLeft = 0;
      }

      if (roomName && playerId !== null) {
        wsService.setSession(roomName, playerId);
        wsService.sendExternal("getRoomState", {}, roomName, playerId);
      }
    },

    syncHandCountsWithServer: (_force = false) => {
      // Intencionalmente no-op: as contagens de cartas e estados das mãos são gerenciados
      // de forma determinística através dos broadcasts de jogo (BROADCAST_PLAY_CARD, CARD_DRAW,
      // BROADCAST_7_EFFECT_CHOOSE, etc.).
      // Nunca enviar 'reconnectRoom' durante uma partida em andamento, pois isso dispara
      // PLAYER_STATUS_CHANGED em broadcast para todos os jogadores e inunda os logs do servidor.
    },

    handleServerMessage: (msg: ServerEventMessage) => {
      (msg as any)._receivedAt = Date.now();

      // Eventos de sala/lobby e início/reconexão de jogo têm processamento imediato
      if (
        msg.type === "EXTERNAL" ||
        msg.name === GameServerEvents.GAME_STARTED ||
        msg.name === GameServerEvents.GAME_SNAPSHOT
      ) {
        if (msg.name === GameServerEvents.GAME_STARTED) {
          clearEventQueue();
        }
        get().applyServerMessage(msg);
        return;
      }

      // Se não for um evento que precisa de cadência visual, processa diretamente
      if (!PACED_GAME_EVENTS.has(msg.name)) {
        get().applyServerMessage(msg);
        return;
      }

      // Enfileira para execução com cadência e animações visuais
      messageQueue.push(msg);

      if (!isProcessingQueue) {
        get().processEventQueue();
      }
    },

    processEventQueue: async () => {
      if (isProcessingQueue) return;
      isProcessingQueue = true;

      while (messageQueue.length > 0) {
        const nextMsg = messageQueue.shift()!;
        const remainingCount = messageQueue.length;
        const myId = get().playerId;

        const rawMsgData = (nextMsg.data as any)?.data ?? nextMsg.data;
        const msgPlayerId = (nextMsg.data as any)?.playerId ?? rawMsgData?.playerId;

        const isMyDraw =
          nextMsg.name === GameServerEvents.CARD_DRAW &&
          msgPlayerId === myId;

        if (isMyDraw) {
          const rawData = (nextMsg.data as any)?.data ?? nextMsg.data;
          const payload = rawData as {
            playerId: number;
            quantity: number;
            cards: SerializedCard[];
          };

          if (payload.cards && payload.cards.length > 1) {
            // Múltiplas cartas compradas pelo jogador atual: anima cada uma com pequeno intervalo
            const allCards = payload.cards;
            for (let i = 0; i < allCards.length; i++) {
              const singleCard = allCards[i];
              get().triggerDrawAnimation(1);
              set((state) => {
                const existingIds = new Set(state.handCards.map((c) => c.id));
                if (existingIds.has(singleCard.id)) return state;
                const updatedHand = [...state.handCards, singleCard];
                return {
                  handCards: updatedHand,
                  playerHandCounts: {
                    ...state.playerHandCounts,
                    [myId!]: updatedHand.length,
                  },
                };
              });
              if (i < allCards.length - 1) {
                await new Promise((r) => setTimeout(r, 150));
              }
            }
          } else {
            get().applyServerMessage(nextMsg);
            const qty = Number(payload.quantity) || (payload.cards ? payload.cards.length : 1);
            if (qty > 0) {
              get().triggerDrawAnimation(qty);
            }
          }
        } else {
          get().applyServerMessage(nextMsg);
          if (nextMsg.name === GameServerEvents.CARD_DRAW) {
            const rawData = (nextMsg.data as any)?.data ?? nextMsg.data;
            const payload = rawData as { playerId: number; quantity: number };
            const targetId = payload?.playerId !== undefined ? Number(payload.playerId) : nextMsg.sendedBy;
            const qty = Number(payload?.quantity) || 1;
            if (targetId !== myId && qty > 0) {
              get().triggerRivalDrawAnimation(targetId, qty);
            }
          }
        }

        const delay = calculateEventDelay(nextMsg, remainingCount, myId);
        if (delay > 0 && messageQueue.length > 0) {
          await new Promise((resolve) => {
            queueTimer = setTimeout(() => {
              queueTimer = null;
              resolve(true);
            }, delay);
          });
        }
      }

      isProcessingQueue = false;
    },

    applyServerMessage: (msg: ServerEventMessage) => {
      let current = get();
      const pendingAction = current.lastClientAction;

      // Verificação de sincronização para eventos otimistas (PLAY_CARD, JUMP_IN, CHOOSE_COLOR)
      // Ignora apenas PONG e PLAYER_STATUS_CHANGED para não desfazer jogada por heartbeat de rede
      const isHeartbeatOrStatus =
        msg.name === ExternalServerEvents.PONG ||
        msg.name === ExternalServerEvents.PLAYER_STATUS_CHANGED;

      if (
        pendingAction &&
        !isHeartbeatOrStatus &&
        SYNCED_CLIENT_EVENTS.includes(pendingAction.eventName)
      ) {
        const isExpectedBroadcast = msg.name === pendingAction.expectedBroadcast;
        const isFromMe =
          msg.sendedBy === current.playerId ||
          (pendingAction.eventName === "client:CHOOSE_COLOR" &&
            (msg.sendedBy === -1 || msg.sendedBy === current.playerId));

        if (isExpectedBroadcast && isFromMe) {
          // Servidor confirmou o broadcast relativo ao último evento enviado pelo cliente!
          // Restauramos a base pré-otimista internamente e limpamos lastClientAction para que
          // o handler oficial do broadcast aplique a transição exata sem duplicar contagens/rotações.
          set({
            ...pendingAction.previousState,
            lastClientAction: null,
          });
          current = get();
        } else if (msg.name === ExternalServerEvents.ROOM_ERROR) {
          // Apenas um erro explícito retornado pelo servidor deve reverter a ação otimista.
          // Eventos intermediários legítimos (como PERMISSIONS, CARD_DRAW, etc.) não devem
          // desfazer a jogada nem fazer a carta retornar para a mão antes do broadcast.
          get().rollbackLastClientAction();
          current = get();
        }
      }

      switch (msg.name) {
        case ExternalServerEvents.ROOM_CREATED: {
          const payload = msg.data as { roomName: string; playerId: number };
          const myId = payload.playerId;
          knownBotIds.clear();
          pendingBotAdditions = 0;
          localStorage.setItem("uno_lastRoomName", payload.roomName);
          localStorage.setItem("uno_lastPlayerId", String(myId));
          localStorage.setItem("uno_lastRoomIsCreator", "true");
          localStorage.setItem("uno_lastCreatorConfigs", JSON.stringify(current.gameConfigs));
          localStorage.setItem("uno_lastCreatorDecks", String(current.numberOfDecks));

          const player: PlayerSlot = {
            id: myId,
            name: getPlayerDisplayName(myId, false, myId),
            isBot: false,
            isConnected: true,
          };

          set({
            roomName: payload.roomName,
            playerId: myId,
            inLobby: true,
            inGame: false,
            isLoading: false,
            lastRoomName: payload.roomName,
            lastPlayerId: myId,
            lastRoomIsCreator: true,
            players: [player],
          });

          wsService.setSession(payload.roomName, myId);
          sound.playSuccess();
          current.showToast(`Sala "${payload.roomName}" criada com sucesso!`, "success");
          break;
        }

        case ExternalServerEvents.ROOM_JOINED: {
          const payload = msg.data as {
            roomName: string;
            playerId: number;
            players: Array<{ id: number; isBot?: boolean }>;
            isBot?: boolean;
          };

          let myId = current.playerId;
          let isJustJoined = false;

          // Se ainda não temos nosso playerId, é porque fomos nós quem acabamos de entrar
          if (myId === null) {
            myId = payload.playerId;
            isJustJoined = true;
            knownBotIds.clear();
            pendingBotAdditions = 0;
            const isCreator = myId === 0;
            localStorage.setItem("uno_lastRoomName", payload.roomName);
            localStorage.setItem("uno_lastPlayerId", String(myId));
            localStorage.setItem("uno_lastRoomIsCreator", String(isCreator));
            if (isCreator) {
              localStorage.setItem("uno_lastCreatorConfigs", JSON.stringify(current.gameConfigs));
              localStorage.setItem("uno_lastCreatorDecks", String(current.numberOfDecks));
            }
          }

          // Identifica se um bot entrou (por termos acionado addBot ou informado diretamente pelo backend)
          const isJoiningBot =
            (payload.playerId !== myId && pendingBotAdditions > 0) ||
            payload.isBot === true;

          if (isJoiningBot) {
            knownBotIds.add(payload.playerId);
            if (pendingBotAdditions > 0) {
              pendingBotAdditions--;
            }
          }

          // Deduplica lista de jogadores e garante unicidade de IDs
          const rawPlayersList = Array.isArray(payload.players) ? payload.players : [];
          const uniqueMap = new Map<number, { id: number; isBot?: boolean }>();
          rawPlayersList.forEach((p) => {
            if (!uniqueMap.has(p.id)) {
              uniqueMap.set(p.id, p);
            } else if (p.id === myId) {
              uniqueMap.set(p.id, { id: p.id, isBot: false });
            }
          });
          const dedupedList = Array.from(uniqueMap.values());

          // Construir slots a partir da lista deduplicada
          const updatedPlayers: PlayerSlot[] = dedupedList.map((p) => {
            const isMe = p.id === myId;
            const existing = current.players.find((ep) => ep.id === p.id);
            const isBot =
              isMe
                ? false
                : typeof p.isBot === "boolean"
                ? p.isBot
                : (p.id === payload.playerId && isJoiningBot)
                ? true
                : existing
                ? existing.isBot
                : knownBotIds.has(p.id);

            if (isBot) {
              knownBotIds.add(p.id);
            } else {
              knownBotIds.delete(p.id);
            }

            return {
              id: p.id,
              name: getPlayerDisplayName(p.id, isBot, myId),
              isBot,
              isConnected: true,
            };
          });

          const isCreator = myId === 0 || current.lastRoomIsCreator;
          set({
            roomName: payload.roomName,
            playerId: myId,
            inLobby: true,
            isLoading: false,
            lastRoomName: payload.roomName,
            lastPlayerId: myId,
            lastRoomIsCreator: isCreator,
            players: updatedPlayers,
          });

          if (myId !== null) {
            wsService.setSession(payload.roomName, myId);
            // Requisita o estado da sala para garantir sincronização das flags isBot de todos os jogadores
            wsService.sendExternal("getRoomState", {}, payload.roomName, myId);
          }

          if (isJustJoined) {
            sound.playSuccess();
            current.showToast(`Entrou na sala "${payload.roomName}" como Player ${myId}!`, "success");
          } else {
            sound.playJoin();
            const displayName = isJoiningBot ? `Bot ${payload.playerId}` : `Player ${payload.playerId}`;
            current.showToast(`${displayName} entrou na sala!`, "info");
          }
          break;
        }

        case ExternalServerEvents.ROOM_STATE: {
          const rawData = ((msg.data as any)?.data ?? msg.data) as {
            roomName?: string;
            players?: Array<{ id: number; isBot: boolean }>;
          };

          const playersList: Array<{ id: number; isBot?: boolean }> = Array.isArray(rawData?.players)
            ? rawData.players
            : Array.isArray((rawData as any)?.data?.players)
            ? (rawData as any).data.players
            : [];

          const myId = current.playerId;
          const uniqueMap = new Map<number, { id: number; isBot?: boolean }>();
          playersList.forEach((p) => {
            if (!uniqueMap.has(p.id)) {
              uniqueMap.set(p.id, p);
            } else if (p.id === myId) {
              uniqueMap.set(p.id, { id: p.id, isBot: false });
            }
          });

          const slots: PlayerSlot[] = Array.from(uniqueMap.values()).map((p) => {
            const isMe = p.id === myId;
            const isBot = isMe ? false : Boolean(p.isBot);
            if (isBot) {
              knownBotIds.add(p.id);
            } else {
              knownBotIds.delete(p.id);
            }
            return {
              id: p.id,
              name: getPlayerDisplayName(p.id, isBot, myId),
              isBot,
              isConnected: true,
            };
          });

          set((state) => ({
            roomName: rawData?.roomName || state.roomName,
            players: slots.length > 0 ? slots : state.players,
            isLoading: false,
            inLobby: !state.inGame ? true : state.inLobby,
          }));
          break;
        }

        case ExternalServerEvents.ROOM_LEFT: {
          const payload = msg.data as { roomName: string; playerId: number };
          const remaining = current.players.filter((p) => p.id !== payload.playerId);
          set({ players: remaining });
          sound.playLeave();
          current.showToast(`Player ${payload.playerId} saiu da sala.`, "info");
          break;
        }

        case ExternalServerEvents.PLAYER_STATUS_CHANGED: {
          const payload = msg.data as {
            playerId: number;
            isConnected: boolean;
            isBot: boolean;
          };

          if (payload.isBot) {
            knownBotIds.add(payload.playerId);
          } else if (payload.isConnected) {
            knownBotIds.delete(payload.playerId);
          }

          const myId = current.playerId;
          const exists = current.players.some((p) => p.id === payload.playerId);
          let updated: PlayerSlot[];
          if (exists) {
            updated = current.players.map((p) => {
              if (p.id === payload.playerId) {
                return {
                  ...p,
                  name: getPlayerDisplayName(p.id, payload.isBot, myId),
                  isConnected: payload.isConnected,
                  isBot: payload.isBot,
                };
              }
              return p;
            });
          } else {
            updated = [
              ...current.players,
              {
                id: payload.playerId,
                name: getPlayerDisplayName(payload.playerId, payload.isBot, myId),
                isBot: payload.isBot,
                isConnected: payload.isConnected,
              },
            ];
          }

          set({ players: updated, isLoading: false });

          // Se reconectamos e ainda estamos no lobby (não no jogo), pedir estado da sala
          if (payload.playerId === myId && payload.isConnected) {
            if (isAttemptingReconnect) {
              isAttemptingReconnect = false;
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
              }
            }
            if (!current.inGame) {
              set({
                inLobby: true,
                isLoading: false,
                roomName: current.roomName || current.lastRoomName || "",
                playerId: myId,
              });
              wsService.sendExternal("getRoomState", {}, current.roomName || current.lastRoomName || "", myId);
            }
          }
          break;
        }

        case ExternalServerEvents.ROOM_ERROR: {
          const payload = msg.data as { message: string; code?: string };
          sound.playError();

          const wasReconnecting = isAttemptingReconnect;
          isAttemptingReconnect = false;
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }

          const rawMsg = (payload?.message || "").toLowerCase();
          const isRoomMissing =
            wasReconnecting ||
            rawMsg.includes("not found") ||
            rawMsg.includes("not exist") ||
            rawMsg.includes("doesnt exist") ||
            rawMsg.includes("doesn't exist") ||
            rawMsg.includes("não encontrada") ||
            rawMsg.includes("inexistente") ||
            rawMsg.includes("fechada") ||
            rawMsg.includes("closed") ||
            (!current.inGame && !current.inLobby);

          if (isRoomMissing) {
            get().clearSavedRoomSession();
            set({
              isLoading: false,
              inLobby: false,
              inGame: false,
              errorMessage: "A sala não existe mais.",
            });
            current.showToast("A sala não existe mais.", "error");
            break;
          }

          set({
            isLoading: false,
            errorMessage: payload.message || "Ocorreu um erro na sala.",
          });
          current.showToast(payload.message || "Erro de sala.", "error");
          break;
        }

        // ==========================================
        // Eventos de Jogo em Tempo Real
        // ==========================================

        case GameServerEvents.GAME_STARTED: {
          const payload = msg.data as {
            roomName: string;
            modeName: string;
            configs: Configs;
            initialDiscard: SerializedCard;
          };

          sound.playStartGame();
          try {
            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6"],
            });
          } catch {
            // Ignorar se confetti falhar
          }

          const initialCounts: Record<number, number> = {};
          current.players.forEach((p) => {
            initialCounts[p.id] = 7;
          });
          if (current.playerId !== null) {
            initialCounts[current.playerId] = 7;
          }

          set({
            gameConfigs: payload.configs ? { ...current.gameConfigs, ...payload.configs } : current.gameConfigs,
            inGame: true,
            inLobby: false,
            isLoading: false,
            initialDiscard: payload.initialDiscard,
            topDiscard: payload.initialDiscard,
            effectiveColor: payload.initialDiscard.effectiveColor ?? payload.initialDiscard.color,
            handCards: [],
            currentPlayerTurn: null,
            direction: "CLOCKWISE",
            myAllowedEvents: [],
            allowedCards: [],
            playerHandCounts: initialCounts,
            winnerPlayerId: null,
            hasDrawnPlayableCard: false,
            saidUnoPending: false,
            vulnerableUnoPlayerId: null,
            showColorPicker: false,
            showHandPicker: false,
            showChallengeModal: false,
            revealedOpponentHand: null,
          });

          current.showToast("Partida iniciada! Boa sorte!", "success");
          break;
        }

        case GameServerEvents.NEW_HAND: {
          const rawData = (msg.data as any)?.data ?? msg.data;
          const payload = rawData as { playerId: number; hand: SerializedCard[] };
          const myId = get().playerId;

          set((state) => {
            const newCounts = {
              ...state.playerHandCounts,
              [payload.playerId]: payload.hand.length,
            };

            if (payload.playerId === myId) {
              return {
                handCards: payload.hand,
                playerHandCounts: newCounts,
              };
            }

            return {
              playerHandCounts: newCounts,
            };
          });

          if (payload.playerId === myId && get().inGame && get().handCards.length > 0) {
            sound.playDraw();
            get().showToast("Sua nova mão está disponível!", "success");
          }
          break;
        }

        case GameServerEvents.PERMISSIONS: {
          const rawData = (msg.data as any)?.data ?? msg.data;
          const payload = rawData as {
            playerId: number;
            allowedEvents: string[][] | string[];
            timeout?: number;
            allowedCards?: SerializedCard[];
          };
          const myId = current.playerId;
          let myEvents: string[] = [];
          if (myId !== null && Array.isArray(payload.allowedEvents)) {
            if (Array.isArray(payload.allowedEvents[myId])) {
              myEvents = payload.allowedEvents[myId] as string[];
            } else if (typeof payload.allowedEvents[0] === "string") {
              myEvents = payload.allowedEvents as string[];
            }
          }

          const wasMyTurn = current.currentPlayerTurn === myId;
          const isMyTurn = payload.playerId === myId;

          const showColorPicker = myEvents.includes("client:CHOOSE_COLOR");
          const showHandPicker = myEvents.includes("client:SELECT_HAND");
          const showChallengeModal = myEvents.includes("client:CHALLENGE");
          const hasDrawnPlayableCard = myEvents.includes("client:KEEP_EVENT");

          // Identifica se o jogador local realmente possui uma ação de turno obrigatória
          // (ignora janelas de Jump-In onde o playerId ainda é o de quem acabou de jogar a carta)
          const hasTurnAction =
            myEvents.includes("client:PLAY_CARD") ||
            myEvents.includes("client:DRAW_CHOICE") ||
            showColorPicker ||
            showHandPicker ||
            showChallengeModal ||
            hasDrawnPlayableCard;

          if (!wasMyTurn && isMyTurn && hasTurnAction) {
            sound.playAlert();
          }

          const isMyAction = hasTurnAction;
          const rawTimeout = typeof payload.timeout === "number" ? payload.timeout : 0;
          const msgReceivedAt = (msg as any)._receivedAt || Date.now();
          const elapsedSinceReceived = Math.max(0, Date.now() - msgReceivedAt);
          const timeoutMs = Math.max(0, rawTimeout - elapsedSinceReceived);
          clearTurnTimer();

          let initialRemainingSec: number | null = null;
          let deadline: number | null = null;

          if (isMyAction && timeoutMs > 0) {
            const started = startTurnCountdown(timeoutMs, set);
            deadline = started.deadline;
            initialRemainingSec = started.initialRemainingSec;
          }

          // Gerenciamento de permissão / janela de acusação de UNO
          let unoVulnerableUpdate: number | null = current.vulnerableUnoPlayerId;
          if (!myEvents.includes("client:UNO")) {
            clearUnoTimer();
            unoVulnerableUpdate = null;
          } else if (timeoutMs > 0) {
            clearUnoTimer();
            unoTimeoutTimer = setTimeout(() => {
              if (get().vulnerableUnoPlayerId !== null) {
                set({ vulnerableUnoPlayerId: null });
              }
            }, timeoutMs);
          }

          set({
            currentPlayerTurn: payload.playerId,
            myAllowedEvents: myEvents,
            allowedCards: payload.allowedCards || [],
            showColorPicker,
            showHandPicker,
            showChallengeModal,
            hasDrawnPlayableCard: hasDrawnPlayableCard ? true : current.hasDrawnPlayableCard,
            turnTimeoutMs: (isMyAction && timeoutMs > 0) ? timeoutMs : null,
            turnTimeoutDeadline: deadline,
            remainingTurnSeconds: initialRemainingSec,
            vulnerableUnoPlayerId: unoVulnerableUpdate,
          });
          break;
        }

        case GameServerEvents.TIMEOUT_TO_PLAYER: {
          const rawData = (msg.data as any)?.data ?? msg.data;
          const payload = rawData as { playerId?: number };
          const hadActiveTurnTimer = current.turnTimeoutMs !== null;
          clearTurnTimer();
          clearUnoTimer();
          set({
            turnTimeoutMs: null,
            remainingTurnSeconds: null,
            turnTimeoutDeadline: null,
            vulnerableUnoPlayerId: null,
          });

          const myId = get().playerId;
          const timedOutPlayerId = payload?.playerId !== undefined ? Number(payload.playerId) : msg.sendedBy;
          const isMe = timedOutPlayerId === myId;

          // Só exibe o aviso quando for a MINHA vez que passou por inatividade (e não o fim da janela de Jump-In após eu jogar)
          if (isMe && hadActiveTurnTimer) {
            get().setTimeoutNotice("Sua vez passou! O tempo esgotou.", true);
            sound.playAlert();
          }
          break;
        }

        case GameServerEvents.CARD_DRAW: {
          const rawData = (msg.data as any)?.data ?? msg.data;
          const payload = rawData as {
            playerId: number;
            quantity: number;
            cards: SerializedCard[];
          };
          const myId = get().playerId;
          sound.playDraw();

          const targetPlayerId = payload?.playerId !== undefined
            ? Number(payload.playerId)
            : (msg.sendedBy !== -1 ? msg.sendedBy : (myId ?? 0));

          const rawQty = Number(payload?.quantity);
          const qty = !isNaN(rawQty) && rawQty > 0
            ? rawQty
            : (Array.isArray(payload?.cards) && payload.cards.length > 0 ? payload.cards.length : 1);

          set((state) => {
            const currentCount = state.playerHandCounts[targetPlayerId] ?? (targetPlayerId === state.playerId ? state.handCards.length : 7);
            const newCount = currentCount + qty;
            const newCounts = {
              ...state.playerHandCounts,
              [targetPlayerId]: newCount,
            };

            const updatedVulnerable = state.vulnerableUnoPlayerId === targetPlayerId ? null : state.vulnerableUnoPlayerId;
            if (state.vulnerableUnoPlayerId === targetPlayerId) {
              clearUnoTimer();
            }

            if (targetPlayerId === state.playerId && payload?.cards && payload.cards.length > 0) {
              const existingIds = new Set(state.handCards.map((c) => c.id));
              const newCards = payload.cards.filter((c) => !existingIds.has(c.id));
              const updatedHand = [...state.handCards, ...newCards];
              return {
                handCards: updatedHand,
                playerHandCounts: {
                  ...newCounts,
                  [targetPlayerId]: updatedHand.length,
                },
                vulnerableUnoPlayerId: updatedVulnerable,
              };
            }

            return {
              playerHandCounts: newCounts,
              vulnerableUnoPlayerId: updatedVulnerable,
            };
          });
          break;
        }

        case GameServerEvents.CHOOSE: {
          const payload = msg.data as { playerId: number };
          if (payload.playerId === current.playerId) {
            set({ hasDrawnPlayableCard: true });
            current.showToast("Você comprou uma carta jogável! Pode jogar ou manter.", "info");
          }
          break;
        }

        case GameServerEvents.DIRECTION: {
          const payload = msg.data as { direction: "CLOCKWISE" | "COUNTER_CLOCKWISE" | string };
          set({ direction: payload.direction });
          current.showToast(
            `Sentido invertido para ${payload.direction === "CLOCKWISE" || payload.direction === "RIGHT" ? "Horário" : "Anti-horário"}!`,
            "info"
          );
          break;
        }

        case GameServerEvents.BROADCAST_PLAY_CARD: {
          clearTurnTimer();
          const rawData = (msg.data as any)?.data ?? msg.data;
          const payload = rawData as { card: SerializedCard; saidUno?: boolean };
          const senderId = msg.sendedBy;

          sound.playCard();

          let newVulnerableUnoPlayerId: number | null = null;

          set((state) => {
            const currentCount = state.playerHandCounts[senderId] ?? (senderId === state.playerId ? state.handCards.length : 7);
            const updatedHand = senderId === state.playerId
              ? state.handCards.filter((c) => c.id !== payload.card.id)
              : state.handCards;

            let targetCount = senderId === state.playerId
              ? updatedHand.length
              : Math.max(0, currentCount - 1);

            // Se o jogo ainda não registrou vencedor, um jogador ativo não pode ficar com 0 cartas
            if (state.winnerPlayerId === null && targetCount === 0 && senderId !== state.playerId) {
              targetCount = 1;
            }

            let newCounts = {
              ...state.playerHandCounts,
              [senderId]: targetCount,
            };

            // Efeito da carta 0: rotaciona as mãos se ZERO_HAS_EFFECT estiver ativo
            const isZero = payload.card.value === 0 || payload.card.name.endsWith("_0");
            const zeroEffect = Boolean(state.gameConfigs.ZERO_HAS_EFFECT ?? true);
            if (isZero && zeroEffect) {
              newCounts = rotatePlayerHandCounts(newCounts, state.players, state.direction);
            }

            // Mecânica do UNO: quando o jogador fica com 1 carta
            if (targetCount === 1) {
              if (payload.saidUno) {
                const senderName = state.players.find((p) => p.id === senderId)?.name ?? `Jogador ${senderId}`;
                current.showToast(`🔥 ${senderName} disse UNO!`, "info");
                newVulnerableUnoPlayerId = null;
              } else {
                newVulnerableUnoPlayerId = senderId;
                const senderName = state.players.find((p) => p.id === senderId)?.name ?? `Jogador ${senderId}`;
                current.showToast(`⚠️ ${senderName} ficou com 1 carta e NÃO disse UNO!`, "error");
              }
            } else if (state.vulnerableUnoPlayerId === senderId) {
              newVulnerableUnoPlayerId = null;
            } else {
              newVulnerableUnoPlayerId = state.vulnerableUnoPlayerId;
            }

            return {
              topDiscard: payload.card,
              effectiveColor: payload.card.effectiveColor ?? payload.card.color,
              handCards: updatedHand,
              playerHandCounts: newCounts,
              hasDrawnPlayableCard: false,
              showColorPicker: false,
              saidUnoPending: senderId === state.playerId ? false : state.saidUnoPending,
              vulnerableUnoPlayerId: newVulnerableUnoPlayerId,
              lastPlayedPlayerId: senderId,
              remainingTurnSeconds: null,
            };
          });

          clearUnoTimer();
          if (newVulnerableUnoPlayerId !== null) {
            unoTimeoutTimer = setTimeout(() => {
              if (get().vulnerableUnoPlayerId === senderId) {
                set({ vulnerableUnoPlayerId: null });
              }
            }, 3000);
          }

          setTimeout(() => {
            if (get().lastPlayedPlayerId === senderId) {
              set({ lastPlayedPlayerId: null });
            }
          }, 900);
          break;
        }

        case GameServerEvents.BROADCAST_UNO: {
          clearTurnTimer();
          clearUnoTimer();
          const rawData = (msg.data as any)?.data ?? msg.data;
          const payload = rawData as BroadcastUnoPayload;
          const callerId = msg.sendedBy;
          const targetId = payload?.playerId;

          sound.playUno();

          const callerName = current.players.find((p) => p.id === callerId)?.name ?? `Jogador ${callerId}`;
          if (targetId !== undefined && targetId !== null && targetId !== callerId) {
            const targetName = current.players.find((p) => p.id === targetId)?.name ?? `Jogador ${targetId}`;
            current.showToast(`🚨 ${callerName} denunciou ${targetName} por não dizer UNO!`, "error");
          } else {
            current.showToast(`🔥 ${callerName} gritou UNO!`, "success");
          }

          set({
            vulnerableUnoPlayerId: null,
          });
          break;
        }

        case GameServerEvents.BROADCAST_JUMP_IN: {
          clearTurnTimer();
          const rawData = (msg.data as any)?.data ?? msg.data;
          const payload = rawData as { target: SerializedCard; cardJumpedIn: SerializedCard };
          const senderId = msg.sendedBy;

          sound.playSuccess();

          set((state) => {
            const currentCount = state.playerHandCounts[senderId] ?? (senderId === state.playerId ? state.handCards.length : 7);
            const updatedHand = senderId === state.playerId
              ? state.handCards.filter((c) => c.id !== payload.cardJumpedIn.id)
              : state.handCards;

            let targetCount = senderId === state.playerId
              ? updatedHand.length
              : Math.max(0, currentCount - 1);

            if (state.winnerPlayerId === null && targetCount === 0 && senderId !== state.playerId) {
              targetCount = 1;
            }

            let newCounts = {
              ...state.playerHandCounts,
              [senderId]: targetCount,
            };

            const isZero = payload.cardJumpedIn.value === 0 || payload.cardJumpedIn.name.endsWith("_0");
            const zeroEffect = Boolean(state.gameConfigs.ZERO_HAS_EFFECT ?? true);
            if (isZero && zeroEffect) {
              newCounts = rotatePlayerHandCounts(newCounts, state.players, state.direction);
            }

            return {
              topDiscard: payload.cardJumpedIn,
              effectiveColor: payload.cardJumpedIn.effectiveColor ?? payload.cardJumpedIn.color,
              handCards: updatedHand,
              playerHandCounts: newCounts,
              lastPlayedPlayerId: senderId,
              remainingTurnSeconds: null,
            };
          });

          current.showToast(`Player ${senderId} realizou um Jump-In!`, "info");

          setTimeout(() => {
            if (get().lastPlayedPlayerId === senderId) {
              set({ lastPlayedPlayerId: null });
            }
          }, 900);
          break;
        }

        case GameServerEvents.BROADCAST_WILD_CHOOSE: {
          clearTurnTimer();
          const payload = msg.data as { color: string };
          set((state) => ({
            effectiveColor: payload.color,
            showColorPicker: false,
            remainingTurnSeconds: null,
            turnTimeoutDeadline: null,
            topDiscard: state.topDiscard
              ? { ...state.topDiscard, effectiveColor: payload.color }
              : null,
          }));
          current.showToast(`Cor da mesa definida para: ${payload.color}`, "info");
          break;
        }

        case GameServerEvents.BROADCAST_7_EFFECT_CHOOSE: {
          clearTurnTimer();
          const payload = msg.data as { targetId: number };
          const senderId = msg.sendedBy;
          set({
            showHandPicker: false,
            remainingTurnSeconds: null,
            turnTimeoutDeadline: null,
          });
          current.showToast(`Player ${senderId} trocou de mãos com Player ${payload.targetId}!`, "info");
          break;
        }

        case GameServerEvents.HAND_CHANGED: {
          const rawData = (msg.data as any)?.data ?? msg.data;
          const payload = rawData as { playerId: number; targetId: number };
          const myId = get().playerId;

          set((state) => {
            const countP1 = payload.playerId === state.playerId
              ? state.handCards.length
              : (state.playerHandCounts[payload.playerId] ?? 7);

            const countP2 = payload.targetId === state.playerId
              ? state.handCards.length
              : (state.playerHandCounts[payload.targetId] ?? 7);

            return {
              playerHandCounts: {
                ...state.playerHandCounts,
                [payload.playerId]: countP2,
                [payload.targetId]: countP1,
              },
            };
          });

          if (myId !== null && (myId === payload.playerId || myId === payload.targetId)) {
            const rivalId = myId === payload.playerId ? payload.targetId : payload.playerId;
            sound.playDraw();
            current.showToast(`🔄 Efeito do 7: Sua mão foi trocada com o Player ${rivalId}!`, "info");
          } else {
            current.showToast(`🔄 Player ${payload.playerId} e Player ${payload.targetId} trocaram de mão!`, "info");
          }
          break;
        }

        case GameServerEvents.SHOW_HAND: {
          const rawData = (msg.data as any)?.data ?? msg.data;
          const payload = rawData as { playerId: number; cards: SerializedCard[] };
          const myId = get().playerId;

          if (payload && Array.isArray(payload.cards) && payload.playerId !== myId) {
            const rival = get().players.find((p) => p.id === payload.playerId);
            const rivalName = rival?.name ?? `Player ${payload.playerId}`;

            // Se já recebemos resultado de desafio recente e o desafiante perdeu, não exibe
            if (lastChallengeResult && Date.now() - lastChallengeResult.timestamp < 6000) {
              if (lastChallengeResult.won && lastChallengeResult.challengerId === myId) {
                get().showOpponentHand(payload.playerId, rivalName, payload.cards);
              }
            } else {
              // Guarda a mão pendente para quando CHALLENGE_RESULT chegar
              pendingRevealedHand = {
                playerId: payload.playerId,
                cards: payload.cards,
                timestamp: Date.now(),
              };
              // Se ainda não temos CHALLENGE_RESULT, exibe preventivamente para o desafiante
              get().showOpponentHand(payload.playerId, rivalName, payload.cards);
            }
          }
          break;
        }

        case GameServerEvents.CHALLENGE_RESULT: {
          const rawData = (msg.data as any)?.data ?? msg.data;
          const payload = rawData as {
            playerId: number;
            challengeResult: boolean;
            cards?: SerializedCard[];
            hand?: SerializedCard[];
            challengedPlayerId?: number;
            targetId?: number;
          };
          set({ showChallengeModal: false });

          const myId = get().playerId;
          const isChallenger = payload.playerId === myId;
          const wonChallenge = payload.challengeResult === true;

          lastChallengeResult = {
            won: wonChallenge,
            timestamp: Date.now(),
            challengerId: payload.playerId,
          };

          if (wonChallenge) {
            current.showToast("Desafio bem-sucedido! O jogador blefou com +4!", "success");
            sound.playWin();

            // Se sou o desafiante que ganhou o desafio:
            if (isChallenger) {
              // 1. Verifica se já temos cartas vindas de SHOW_HAND pendente
              if (pendingRevealedHand && Date.now() - pendingRevealedHand.timestamp < 6000) {
                const rival = current.players.find((p) => p.id === pendingRevealedHand!.playerId);
                const rivalName = rival?.name ?? `Player ${pendingRevealedHand.playerId}`;
                get().showOpponentHand(pendingRevealedHand.playerId, rivalName, pendingRevealedHand.cards);
              } else {
                // 2. Ou se as cartas vieram direto no payload de CHALLENGE_RESULT
                const cards = payload.cards || payload.hand;
                if (Array.isArray(cards) && cards.length > 0) {
                  const targetId = payload.challengedPlayerId ?? payload.targetId ?? current.lastPlayedPlayerId;
                  const rival = current.players.find((p) => p.id === targetId);
                  const rivalName = rival?.name ?? (targetId !== undefined && targetId !== null ? `Player ${targetId}` : "Adversário");
                  get().showOpponentHand(targetId ?? -1, rivalName, cards);
                }
              }
            }
          } else {
            // Se o desafio foi perdido, remove visualização de mão caso estivesse aberta
            if (revealedHandTimer) {
              clearTimeout(revealedHandTimer);
              revealedHandTimer = null;
            }
            set({ revealedOpponentHand: null });
            current.showToast("Desafio refutado! O +4 foi legal; desafiante compra cartas extras!", "error");
            sound.playError();
          }
          break;
        }
    case GameServerEvents.BROADCAST_WIN:
        case GameServerEvents.WIN: {
          clearTurnTimer();
          const winner = msg.sendedBy !== -1 ? msg.sendedBy : 0;
          set((state) => ({
            winnerPlayerId: winner,
            remainingTurnSeconds: null,
            turnTimeoutDeadline: null,
            playerHandCounts: {
              ...state.playerHandCounts,
              [winner]: 0,
            },
          }));
          sound.playWin();
          try {
            confetti({
              particleCount: 200,
              spread: 90,
              origin: { y: 0.5 },
              colors: ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6"],
            });
          } catch {
            // Ignore confetti fail
          }
          if (winner === current.playerId) {
            current.showToast("🎉 VOCÊ VENCEU A PARTIDA! PARABÉNS! 🎉", "success");
          } else {
            current.showToast(`Player ${winner} venceu a partida!`, "info");
          }
          break;
        }

        case GameServerEvents.GAME_SNAPSHOT: {
          const payload = msg.data as GameSnapshotServerPayload;
          const myId = get().playerId;
          const wasInGame = get().inGame;

          // Reconstruir lista de jogadores a partir do snapshot
          const slots: PlayerSlot[] = payload.players.map((p) => {
            const existing = get().players.find((ep) => ep.id === p.id);
            const isBot =
              typeof (p as any).isBot === "boolean"
                ? Boolean((p as any).isBot)
                : existing
                ? existing.isBot
                : knownBotIds.has(p.id);

            if (isBot) {
              knownBotIds.add(p.id);
            }

            return {
              id: p.id,
              name: getPlayerDisplayName(p.id, isBot, myId),
              isBot,
              isConnected: true,
            };
          });

          const counts: Record<number, number> = {};
          payload.players.forEach((p) => {
            counts[p.id] = p.handCount;
          });

          const myEvents = (myId !== null && payload.allowedEvents) ? payload.allowedEvents : [];
          const isMyAction =
            myEvents.includes("client:PLAY_CARD") ||
            myEvents.includes("client:DRAW_CHOICE") ||
            myEvents.includes("client:CHOOSE_COLOR") ||
            myEvents.includes("client:SELECT_HAND") ||
            myEvents.includes("client:CHALLENGE") ||
            myEvents.includes("client:KEEP_EVENT");

          if (isAttemptingReconnect) {
            isAttemptingReconnect = false;
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
              reconnectTimeout = null;
            }
          }

          if (!wasInGame) {
            clearEventQueue();
            const activeTimer = payload.timers && payload.timers.length > 0 ? payload.timers[0] : null;
            if (isMyAction && activeTimer && activeTimer.remainingTime > 0) {
              const started = startTurnCountdown(activeTimer.remainingTime, set);
              set({
                turnTimeoutMs: activeTimer.duration || activeTimer.remainingTime,
                turnTimeoutDeadline: started.deadline,
                remainingTurnSeconds: started.initialRemainingSec,
              });
            }
          } else if (!turnTimerInterval && isMyAction && payload.timers && payload.timers.length > 0) {
            const activeTimer = payload.timers[0];
            if (activeTimer && activeTimer.remainingTime > 0) {
              const started = startTurnCountdown(activeTimer.remainingTime, set);
              set({
                turnTimeoutMs: activeTimer.duration || activeTimer.remainingTime,
                turnTimeoutDeadline: started.deadline,
                remainingTurnSeconds: started.initialRemainingSec,
              });
            }
          } else if (!isMyAction) {
            clearTurnTimer();
            set({
              turnTimeoutMs: null,
              turnTimeoutDeadline: null,
              remainingTurnSeconds: null,
            });
          }

          set((state) => ({
            gameConfigs: payload.configs ? { ...state.gameConfigs, ...payload.configs } : state.gameConfigs,
            roomName: msg.roomName || state.roomName,
            inGame: true,
            inLobby: false,
            isLoading: false,
            players: slots,
            initialDiscard: payload.topDiscard,
            topDiscard: payload.topDiscard,
            effectiveColor: payload.topDiscard ? (payload.topDiscard.effectiveColor ?? payload.topDiscard.color) : null,
            handCards: (payload.handCards && payload.handCards.length > 0) ? payload.handCards : state.handCards,
            currentPlayerTurn: payload.currentPlayerId,
            direction: payload.direction || "CLOCKWISE",
            playerHandCounts: counts,
            myAllowedEvents: myEvents.length > 0 ? myEvents : state.myAllowedEvents,
          }));

          if (isAttemptingReconnect) {
            isAttemptingReconnect = false;
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
              reconnectTimeout = null;
            }
          }

          if (!wasInGame) {
            sound.playSuccess();
            get().showToast("Reconectado à partida em andamento!", "success");
          }
          break;
        }

        default:
          break;
      }
    },
  };
});
