import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { getCardAssetUrl } from "@/utils/cardAsset";
import { sound } from "@/services/sound";
import {
  RotateCw,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  ArrowRightLeft,
  Trophy,
  Zap,
  LogOut,
  Layers,
  Flame,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Timer,
  X,
  Eye,
  Play,
  CheckCircle2,
} from "lucide-react";

const COLOR_CONFIG: Record<
  string,
  { label: string; bg: string; border: string; glow: string; text: string }
> = {
  RED: {
    label: "Vermelho",
    bg: "bg-red-500",
    border: "border-red-400",
    glow: "shadow-[0_0_25px_rgba(239,68,68,0.7)]",
    text: "text-red-400",
  },
  BLUE: {
    label: "Azul",
    bg: "bg-blue-500",
    border: "border-blue-400",
    glow: "shadow-[0_0_25px_rgba(59,130,246,0.7)]",
    text: "text-blue-400",
  },
  GREEN: {
    label: "Verde",
    bg: "bg-emerald-500",
    border: "border-emerald-400",
    glow: "shadow-[0_0_25px_rgba(16,185,129,0.7)]",
    text: "text-emerald-400",
  },
  YELLOW: {
    label: "Amarelo",
    bg: "bg-amber-400",
    border: "border-amber-300",
    glow: "shadow-[0_0_25px_rgba(251,191,36,0.7)]",
    text: "text-amber-300",
  },
  WILD: {
    label: "Coringa",
    bg: "bg-gradient-to-r from-red-500 via-amber-400 to-teal-400",
    border: "border-teal-300",
    glow: "shadow-[0_0_25px_rgba(45,212,191,0.7)]",
    text: "text-teal-300",
  },
};

export const GameTable: React.FC = () => {
  const {
    roomName,
    playerId,
    players,
    topDiscard,
    effectiveColor,
    handCards,
    currentPlayerTurn,
    direction,
    myAllowedEvents,
    allowedCards,
    playerHandCounts,
    winnerPlayerId,
    hasDrawnPlayableCard,
    showColorPicker,
    showHandPicker,
    showChallengeModal,
    revealedOpponentHand,
    setRevealedOpponentHand,
    isDrawingCard,
    lastPlayedPlayerId,
    rivalDrawAlert,
    remainingTurnSeconds,
    playCard,
    drawCard,
    keepCard,
    chooseColor,
    selectHandTarget,
    jumpIn,
    respondChallenge,
    leaveRoom,
    returnToLobby,
    startGame,
    saidUnoPending,
    vulnerableUnoPlayerId,
    toggleSaidUno,
    callUno,
    lastClientAction,
  } = useGameStore();

  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);

  const isMyTurn = currentPlayerTurn === playerId;
  const canDraw = myAllowedEvents.includes("client:DRAW_CHOICE") || isMyTurn;
  const canPlayAny = myAllowedEvents.includes("client:PLAY_CARD");
  const canJumpIn = myAllowedEvents.includes("client:JUMP_IN");

  const allowedCardIds = new Set(allowedCards.map((c) => c.id));

  // Determine other players
  const otherPlayers = players.filter((p) => p.id !== playerId);
  const isClockwise = direction === "CLOCKWISE" || direction === "RIGHT";

  // Active color info
  const currentColorKey = effectiveColor || topDiscard?.color || "WILD";
  const colorTheme = COLOR_CONFIG[currentColorKey] || COLOR_CONFIG.WILD;

  // Verificação local das regras de descarte do UNO caso haja delay de rede nas permissões
  const isUnoLegal = (card: typeof handCards[0]) => {
    if (!topDiscard) return true;
    if (card.color === "WILD" || card.type === "WILD_CARD" || card.type === "DRAW_4") {
      return true;
    }
    const tableColor = effectiveColor || topDiscard.effectiveColor || topDiscard.color;
    if (tableColor && (card.color === tableColor || card.effectiveColor === tableColor)) {
      return true;
    }
    if (card.value !== undefined && topDiscard.value !== undefined && card.value === topDiscard.value) {
      return true;
    }
    if (card.type && topDiscard.type && card.type !== "NUMBERED" && card.type === topDiscard.type) {
      return true;
    }
    return false;
  };

  // Verificação de Jump-In: a carta na mão do jogador deve ter a mesma cor e tipo da carta jogada atualmente na mesa
  const isJumpInLegal = (card: typeof handCards[0]) => {
    if (!topDiscard) return false;
    const sameColor = card.color === topDiscard.color;
    const sameType = card.type === topDiscard.type;
    if (!sameColor || !sameType) return false;

    // Para cartas numéricas, o valor/número também precisa coincidir
    if (card.type === "NUMBERED" || card.value !== undefined || topDiscard.value !== undefined) {
      return card.value === topDiscard.value;
    }

    return true;
  };

  // Se o jogador acabou de jogar uma carta e está aguardando a confirmação do servidor / passagem de turno
  const isPendingMyAction =
    lastPlayedPlayerId === playerId ||
    lastClientAction?.eventName === "client:PLAY_CARD";

  // Condição para o jogador poder descartar uma carta e dizer UNO (quando possui exatamente 2 cartas)
  const hasPlayableCard =
    !isPendingMyAction &&
    canPlayAny &&
    handCards.some(
      (c) => allowedCardIds.has(c.id) || (isMyTurn && isUnoLegal(c))
    );

  const showMyUnoButton =
    isMyTurn &&
    !isPendingMyAction &&
    handCards.length === 2 &&
    hasPlayableCard;

  // Condição para denunciar/acusar UNO quando alguém jogou sem dizer UNO (visível para outros jogadores)
  const showCalloutUnoButton =
    vulnerableUnoPlayerId !== null &&
    vulnerableUnoPlayerId !== playerId;

  const vulnerablePlayer = vulnerableUnoPlayerId !== null
    ? players.find((p) => p.id === vulnerableUnoPlayerId)
    : null;
  const vulnerablePlayerName = vulnerablePlayer?.name ?? `Jogador ${vulnerableUnoPlayerId}`;

  return (
    <div className="w-full max-w-7xl mx-auto px-1.5 sm:px-4 py-1 sm:py-2 flex flex-col items-center justify-between min-h-[calc(100dvh-56px)] sm:min-h-[85vh] relative select-none overflow-x-hidden">
      {/* ======================================================== */}
      {/* 1. TOP BAR: STATUS, SENTIDO, COR DA MESA & SAIR          */}
      {/* ======================================================== */}
      <header className="w-full h-10 sm:h-12 flex flex-nowrap items-center justify-between gap-1 sm:gap-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl glass-panel border border-petrol-750/70 shadow-lg z-20 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-petrol-900/90 border border-petrol-700/80 shrink-0">
            <span className="hidden sm:inline text-[10px] uppercase font-bold text-petrol-400 tracking-wider">Sala:</span>
            <span className="font-mono text-[11px] sm:text-xs font-bold text-teal-300">{roomName}</span>
          </div>

          {/* Direction indicator */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-petrol-900/90 border border-petrol-700/80 text-[11px] sm:text-xs font-semibold text-petrol-200 shrink-0"
            title={`Sentido do jogo: ${isClockwise ? "Horário" : "Anti-horário"}`}
          >
            {isClockwise ? (
              <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-400 animate-spin-slow" />
            ) : (
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 animate-spin-slow" />
            )}
            <span className="hidden md:inline text-[11px]">
              {isClockwise ? "Horário" : "Anti-horário"}
            </span>
          </div>

          {/* Active color pill */}
          <div
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 min-w-[76px] sm:min-w-[92px] rounded-lg sm:rounded-xl border ${colorTheme.border} ${colorTheme.glow} bg-petrol-950/80 whitespace-nowrap shrink-0`}
          >
            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0 ${colorTheme.bg}`} />
            <span className={`text-[10px] sm:text-xs font-bold ${colorTheme.text}`}>{colorTheme.label}</span>
          </div>
        </div>

        {/* Turn message alert */}
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 shrink-0">
          <AnimatePresence mode="wait">
            {isMyTurn ? (
              <motion.div
                key="myTurn"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-0.5 sm:py-1 rounded-full font-black text-[10px] sm:text-xs whitespace-nowrap shrink-0 transition-all ${
                  remainingTurnSeconds !== null && remainingTurnSeconds <= 5 && remainingTurnSeconds > 0
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse"
                    : "bg-gradient-to-r from-teal-500 to-emerald-500 text-petrol-950 shadow-[0_0_20px_rgba(20,184,166,0.6)] animate-pulse"
                }`}
              >
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current shrink-0" />
                <span>SEU TURNO!</span>
                {remainingTurnSeconds !== null && remainingTurnSeconds <= 5 && remainingTurnSeconds > 0 && (
                  <span className="hidden sm:inline">({remainingTurnSeconds}s)</span>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="otherTurn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-petrol-900/80 border border-petrol-750 text-[10px] sm:text-xs text-petrol-300 whitespace-nowrap min-w-0"
              >
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span className="truncate max-w-[90px] xs:max-w-[115px] sm:max-w-none">
                  <span className="hidden sm:inline">Vez de: </span>
                  <strong className="text-amber-300">
                    {players.find((p) => p.id === currentPlayerTurn)?.name ??
                      `Player ${currentPlayerTurn}`}
                  </strong>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => {
              sound.playClick();
              leaveRoom();
            }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-bold transition hover:border-red-600 shrink-0"
            title="Sair da Partida"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. RIVALS SECTION: OS OUTROS JOGADORES NA MESA            */}
      {/* ======================================================== */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center my-1.5 sm:my-2 z-10">
        {/* Seta sobre o contêiner de jogadores indicando o sentido do jogo */}
        {otherPlayers.length > 0 && (
          <div className="w-full max-w-full px-1 sm:px-4 mb-1.5 sm:mb-2 overflow-hidden">
            <div
              className={`w-full flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full backdrop-blur-md border transition-colors duration-300 overflow-hidden ${
                isClockwise
                  ? "bg-petrol-900/70 border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.15)]"
                  : "bg-petrol-900/70 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              }`}
              title={`Sentido da partida: ${
                isClockwise
                  ? "Horário (da esquerda para a direita)"
                  : "Anti-horário (da direita para a esquerda)"
              }`}
            >
              {isClockwise ? (
                <>
                  {/* Origem da seta à esquerda */}
                  <div className="flex items-center gap-1 sm:gap-1.5 text-teal-400 text-[10px] sm:text-xs font-mono font-bold uppercase select-none shrink-0">
                    <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin-slow text-teal-400" />
                    <span className="text-teal-300/90 text-[10px] sm:text-[11px]">Horário</span>
                  </div>

                  {/* Trilha animada fluindo da esquerda para a direita */}
                  <div className="flex-1 min-w-0 mx-1.5 sm:mx-3 h-1.5 rounded-full bg-teal-950/80 border border-teal-500/20 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-teal-400/40 to-teal-300/80" />
                    <motion.div
                      animate={{ x: ["-20%", "20%"] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="flex items-center gap-4 sm:gap-6 text-teal-200 drop-shadow-[0_0_4px_rgba(45,212,191,0.9)] absolute whitespace-nowrap"
                    >
                      {Array.from({ length: 14 }).map((_, i) => (
                        <ChevronRight key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      ))}
                    </motion.div>
                  </div>

                  {/* Destino da seta à direita (apontando da esquerda para a direita) */}
                  <div className="flex items-center gap-1 sm:gap-1.5 text-teal-300 font-bold select-none shrink-0">
                    <span className="hidden xs:inline text-[10px] sm:text-[11px] font-mono tracking-wider uppercase">
                      Sentido do Jogo
                    </span>
                    <ChevronsRight className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 animate-pulse drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                  </div>
                </>
              ) : (
                <>
                  {/* Destino da seta à esquerda (apontando da direita para a esquerda) */}
                  <div className="flex items-center gap-1 sm:gap-1.5 text-cyan-300 font-bold select-none shrink-0">
                    <ChevronsLeft className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    <span className="hidden xs:inline text-[10px] sm:text-[11px] font-mono tracking-wider uppercase">
                      Sentido do Jogo
                    </span>
                  </div>

                  {/* Trilha animada fluindo da direita para a esquerda */}
                  <div className="flex-1 min-w-0 mx-1.5 sm:mx-3 h-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/20 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-l from-cyan-500/10 via-cyan-400/40 to-cyan-300/80" />
                    <motion.div
                      animate={{ x: ["20%", "-20%"] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="flex items-center gap-4 sm:gap-6 text-cyan-200 drop-shadow-[0_0_4px_rgba(34,211,238,0.9)] absolute whitespace-nowrap"
                    >
                      {Array.from({ length: 14 }).map((_, i) => (
                        <ChevronLeft key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      ))}
                    </motion.div>
                  </div>

                  {/* Origem da seta à direita */}
                  <div className="flex items-center gap-1 sm:gap-1.5 text-cyan-400 text-[10px] sm:text-xs font-mono font-bold uppercase select-none shrink-0">
                    <span className="text-cyan-300/90 text-[10px] sm:text-[11px]">Anti-horário</span>
                    <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin-slow text-cyan-400" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <section className="w-full flex items-center justify-center gap-2 sm:gap-8 z-10 flex-wrap px-1 pt-2 pb-4 sm:pb-5">
        {otherPlayers.map((player) => {
          const isPlayerTurn = currentPlayerTurn === player.id;
          const isLastPlayer = lastPlayedPlayerId === player.id;
          const rawCount = playerHandCounts[player.id] ?? 7;
          const count = (winnerPlayerId === null && rawCount <= 0) ? 1 : rawCount;
          const isUno = count === 1;

          return (
            <motion.div
              key={player.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: isLastPlayer ? [1, 1.04, 1] : 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl glass-panel transition-all duration-300 relative ${
                isPlayerTurn
                  ? "border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.35)] bg-petrol-850/95 ring-2 ring-amber-400/50"
                  : isLastPlayer
                  ? "border-teal-400/80 shadow-[0_0_15px_rgba(20,184,166,0.4)] bg-petrol-850/90 ring-1 ring-teal-400/50"
                  : "border-petrol-800/80 bg-petrol-900/75"
              }`}
            >
              {/* Floating alert for rival drawing cards */}
              <AnimatePresence>
                {rivalDrawAlert?.playerId === player.id && (
                  <motion.div
                    initial={{ y: 5, opacity: 0, scale: 0.8 }}
                    animate={{ y: -26, opacity: 1, scale: 1.05 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 sm:px-2.5 py-0.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-petrol-950 font-black text-[9px] sm:text-[10px] uppercase tracking-wider shadow-lg whitespace-nowrap z-30 pointer-events-none flex items-center gap-1"
                  >
                    <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>+{rivalDrawAlert.quantity} {rivalDrawAlert.quantity === 1 ? "carta" : "cartas"}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Turn indicator glow tag */}
              {isPlayerTurn && (
                <div className="absolute -top-2 sm:-top-2.5 left-1/2 -translate-x-1/2 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-400 text-petrol-950 text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow">
                  Jogando
                </div>
              )}

              {/* Played card notification badge */}
              <AnimatePresence>
                {isLastPlayer && !isPlayerTurn && (
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute -bottom-2.5 sm:-bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-teal-400 text-petrol-950 text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-md z-30 pointer-events-none whitespace-nowrap"
                  >
                    Jogou!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Player Avatar */}
              <div className="relative shrink-0">
                <div
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-xs ${
                    player.isBot
                      ? "bg-cyan-950 border border-cyan-500/40 text-cyan-300"
                      : "bg-teal-950 border border-teal-500/40 text-teal-300"
                  }`}
                >
                  {player.isBot ? <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-petrol-900 ${
                    player.isConnected ? "bg-emerald-400" : "bg-red-500"
                  }`}
                />
              </div>

              {/* Player Info & Card Counter */}
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[11px] sm:text-xs font-bold text-white max-w-[78px] sm:max-w-[110px] truncate">
                  {player.name}
                </span>

                <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold text-petrol-300">
                    <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-petrol-400" />
                    <span>{count}</span>
                  </div>

                  {isUno && (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="flex items-center gap-0.5 px-1 sm:px-1.5 py-0.2 rounded-md bg-red-600 text-white text-[8px] sm:text-[9px] font-black uppercase shadow"
                    >
                      <Flame className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-current" />
                      UNO!
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>
    </div>

      {/* ======================================================== */}
      {/* 3. CENTER ARENA: MONTE DE COMPRA & PILHA DE DESCARTE      */}
      {/* ======================================================== */}
      <section className="w-full flex-1 flex flex-col items-center justify-center relative py-2 sm:py-4 z-10">
        <div className="flex items-center justify-center gap-8 sm:gap-14">
          {/* DRAW PILE (DECK) */}
          <div className="flex flex-col items-center group relative">
            {/* Animação de carta voando do monte para a mão */}
            <AnimatePresence>
              {isDrawingCard && (
                <motion.div
                  key="flying-draw-card"
                  initial={{ x: 0, y: 0, scale: 0.85, rotate: 0, opacity: 1 }}
                  animate={{ x: 25, y: 220, scale: 1.05, rotate: -8, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.36, ease: "easeOut" }}
                  className="absolute pointer-events-none z-50 drop-shadow-[0_15px_30px_rgba(20,184,166,0.7)]"
                >
                  <img
                    src="/assets/Deck.png"
                    alt="Comprando..."
                    className="w-24 sm:w-32 h-auto rounded-xl ring-2 ring-teal-400 shadow-2xl"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              animate={isDrawingCard ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: 0.3 }}
              onClick={() => {
                if (canDraw) {
                  drawCard();
                } else {
                  sound.playError();
                }
              }}
              className={`relative cursor-pointer rounded-2xl transition-all duration-300 ${
                canDraw
                  ? "ring-2 ring-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.5)]"
                  : "opacity-80 hover:opacity-100"
              }`}
            >
              <img
                src="/assets/Deck.png"
                alt="Monte de Compra"
                className="w-24 sm:w-32 h-auto rounded-xl shadow-2xl drop-shadow-xl select-none"
              />

              {canDraw && (
                <div className="absolute inset-0 bg-teal-400/10 rounded-xl pointer-events-none animate-pulse" />
              )}
            </motion.div>

            <button
              onClick={() => {
                if (canDraw) drawCard();
              }}
              disabled={!canDraw}
              className={`mt-2 sm:mt-3 px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                canDraw
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30"
                  : "bg-petrol-900/60 text-petrol-500 border border-petrol-800/40 cursor-not-allowed"
              }`}
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>Comprar Carta</span>
            </button>
          </div>

          {/* DISCARD PILE (TOPO DO DESCARTE) */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              {/* Active Color Ambient Aura Glow */}
              <div
                className={`absolute -inset-3 sm:-inset-4 rounded-3xl blur-2xl opacity-70 transition-all duration-500 ${colorTheme.bg}`}
              />

              <motion.div
                key={topDiscard ? `${topDiscard.id}-${topDiscard.name}` : "empty"}
                initial={{ scale: 0.8, rotate: -8, y: 10 }}
                animate={{ scale: 1, rotate: 0, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="relative"
              >
                <img
                  src={getCardAssetUrl(topDiscard)}
                  alt={topDiscard?.name || "Descarte"}
                  className="w-24 sm:w-32 h-auto rounded-xl shadow-2xl drop-shadow-2xl border border-white/20 select-none"
                />
              </motion.div>
            </div>

            <div className="mt-2 sm:mt-3 px-2.5 sm:px-3 py-1 min-w-[105px] rounded-xl bg-petrol-900/90 border border-petrol-750 text-center whitespace-nowrap">
              <span className="text-[11px] font-bold text-petrol-300">
                Mesa: <span className={colorTheme.text}>{colorTheme.label}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. PLAYER HAND (SUA MÃO DE CARTAS - HORIZONTAL FAN)       */}
      {/* ======================================================== */}
      <footer className="w-full flex flex-col items-center z-20 pb-1 sm:pb-0 shrink-0">
        {/* Espaço predefinido reservado para a mensagem de manter carta jogável (evita layout shift) */}
        <div className="h-10 sm:h-11 w-full max-w-xl px-2 sm:px-4 flex items-center justify-center shrink-0">
          <AnimatePresence>
            {hasDrawnPlayableCard && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full flex items-center justify-between gap-2 bg-petrol-900/95 border border-teal-500/60 shadow-lg shadow-teal-950/40 rounded-xl px-2.5 sm:px-4 py-1 sm:py-1.5 backdrop-blur-md"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0 animate-pulse" />
                  <span className="text-[11px] sm:text-xs text-petrol-200 truncate">
                    <span className="hidden xs:inline">Carta jogável comprada! </span>
                    <span>Pode jogar ou manter:</span>
                  </span>
                </div>
                <button
                  onClick={() => keepCard()}
                  className="shrink-0 px-2.5 sm:px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[10px] sm:text-xs font-bold transition shadow-sm border border-teal-400/40 flex items-center gap-1"
                >
                  <span>Manter Carta</span>
                  <span className="hidden sm:inline">e Passar</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between w-full max-w-4xl px-2 sm:px-4 mb-1 sm:mb-2 min-h-[30px] sm:min-h-[32px]">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-petrol-300">
            <div
              className="flex items-center gap-1 text-teal-400 select-none"
              title={`Sentido do jogo: ${isClockwise ? "Horário" : "Anti-horário"}`}
            >
              <div className="flex items-center">
                {isClockwise ? (
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400 drop-shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
                ) : (
                  <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                )}
              </div>
            </div>
            <span>Sua Mão</span>
            <span className="px-2 py-0.5 rounded-full bg-teal-950 border border-teal-500/40 text-teal-300 font-mono text-[11px]">
              {handCards.length} {handCards.length === 1 ? "carta" : "cartas"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {handCards.length === 1 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.9 }}
                className="px-2.5 sm:px-3 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.7)]"
              >
                🔥 VOCÊ ESTÁ DE UNO!
              </motion.div>
            )}

            {/* Timer posicionado logo acima da mão do jogador à direita */}
            <AnimatePresence>
              {isMyTurn && remainingTurnSeconds !== null && remainingTurnSeconds <= 5 && remainingTurnSeconds > 0 && (
                <motion.div
                  key="countdown-pill"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border shadow-xl backdrop-blur-md bg-red-950/95 border-red-500/90 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.6)] ring-1 ring-red-400"
                >
                  <Timer className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-red-400 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    Seu tempo:
                  </span>
                  <motion.span
                    key={remainingTurnSeconds}
                    initial={{ scale: 1.3, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="font-mono font-black text-xs sm:text-sm px-1.5 sm:px-2 py-0.2 rounded-md bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                  >
                    {remainingTurnSeconds}s
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Scrollable Fan / Cards Container */}
        <div className="w-full max-w-5xl overflow-x-auto pb-3 sm:pb-4 pt-12 sm:pt-14 -mt-5 sm:-mt-6 px-2 sm:px-4 flex items-end justify-start sm:justify-center no-scrollbar">
          <div className="flex items-center justify-center -space-x-7 sm:-space-x-10 min-w-max mx-auto px-4 sm:px-6 pt-2">
            {handCards.map((card, index) => {
              const isServerPlayable = allowedCardIds.has(card.id) && canPlayAny;
              const isFallbackPlayable = isMyTurn && canPlayAny && (allowedCardIds.size === 0 || !allowedCardIds.has(card.id)) && isUnoLegal(card);
              const isPlayable = isServerPlayable || isFallbackPlayable;
              const isJumpInCard = canJumpIn && isJumpInLegal(card);
              const isHovered = hoveredCardId === card.id;

              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ y: -70, scale: 0.65, opacity: 0, rotate: -12 }}
                  animate={{
                    y: isHovered ? -22 : 0,
                    scale: isHovered ? 1.12 : 1,
                    opacity: 1,
                    rotate: 0,
                  }}
                  exit={{ y: -60, opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  onClick={() => {
                    if (isJumpInCard) {
                      jumpIn(card.id);
                    } else if (isPlayable) {
                      playCard(card.id);
                    } else if (isMyTurn && isUnoLegal(card)) {
                      playCard(card.id);
                    } else {
                      sound.playError();
                    }
                  }}
                  className={`relative rounded-xl cursor-pointer transition-shadow select-none group ${
                    isJumpInCard
                      ? "ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.85)] z-40"
                      : isPlayable
                      ? "ring-2 ring-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.6)] z-30"
                      : "opacity-80 hover:opacity-100 z-10"
                  }`}
                  style={{ zIndex: isHovered ? 50 : index + 10 }}
                >
                  {/* Jump-in Badge Overlay */}
                  {isJumpInCard && (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-petrol-950 font-black text-[9px] uppercase tracking-wider shadow-lg whitespace-nowrap z-50 pointer-events-none"
                    >
                      ⚡ JUMP IN!
                    </motion.div>
                  )}

                  {/* Playable indicator on hover */}
                  {isPlayable && !isJumpInCard && isHovered && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-teal-400 text-petrol-950 font-bold text-[9px] uppercase tracking-wider shadow whitespace-nowrap z-50 pointer-events-none">
                      Jogar
                    </div>
                  )}

                  <img
                    src={getCardAssetUrl(card)}
                    alt={card.name}
                    className="w-[74px] sm:w-24 md:w-28 h-auto rounded-xl shadow-xl drop-shadow-md pointer-events-none"
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 5. ACTION MODALS                                         */}
      {/* ======================================================== */}

      {/* 5.1 COLOR PICKER MODAL (CORINGA / +4) */}
      <AnimatePresence>
        {showColorPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-petrol-950/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-petrol-900/95 p-5 sm:p-8 rounded-3xl max-w-md w-full text-center border border-teal-500/40 shadow-2xl relative"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Coringa Ativado</span>
                {remainingTurnSeconds !== null && remainingTurnSeconds <= 5 && remainingTurnSeconds > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono font-black text-[11px] animate-pulse">
                    {remainingTurnSeconds}s
                  </span>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                Escolha a Nova Cor da Mesa
              </h3>
              <p className="text-xs text-petrol-300 mt-1 mb-5 sm:mb-6">
                Todos os próximos jogadores deverão seguir a cor que você escolher.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {(["RED", "BLUE", "GREEN", "YELLOW"] as const).map((color) => {
                  const cfg = COLOR_CONFIG[color];
                  return (
                    <motion.button
                      key={color}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => chooseColor(color)}
                      className={`flex flex-col items-center justify-center py-4 sm:py-5 rounded-2xl border font-black text-white text-sm sm:text-base shadow-xl transition ${cfg.bg} ${cfg.border} hover:brightness-110`}
                    >
                      <span>{cfg.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5.2 HAND PICKER MODAL (EFEITO DO 7: TROCA DE MÃO) */}
      <AnimatePresence>
        {showHandPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-petrol-950/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-petrol-900/95 p-5 sm:p-8 rounded-3xl max-w-md w-full text-center border border-teal-500/40 shadow-2xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                <ArrowRightLeft className="w-4 h-4" />
                Efeito da Carta 7
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                Trocar de Mão com Quem?
              </h3>
              <p className="text-xs text-petrol-300 mt-1 mb-5 sm:mb-6">
                Escolha um oponente para trocar todas as cartas de sua mão com as dele.
              </p>

              <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto">
                {otherPlayers.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => selectHandTarget(target.id)}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-petrol-900/90 hover:bg-petrol-800 border border-petrol-750 hover:border-teal-400 text-white font-bold transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-petrol-800 flex items-center justify-center text-teal-300">
                        {target.isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <span className="text-sm">{target.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-petrol-300 font-mono">
                      <span>{playerHandCounts[target.id] ?? 7} cartas</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5.3 CHALLENGE MODAL (DESAFIO DO +4) */}
      <AnimatePresence>
        {showChallengeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-petrol-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-petrol-900/95 p-5 sm:p-8 rounded-3xl max-w-md w-full text-center border border-amber-500/40 shadow-2xl relative"
            >
              <button
                onClick={() => respondChallenge(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-petrol-400 hover:text-white hover:bg-petrol-800 transition"
                title="Fechar e não desafiar"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                <ShieldAlert className="w-4 h-4" />
                <span>Desafio de Coringa +4</span>
                {remainingTurnSeconds !== null && remainingTurnSeconds <= 5 && remainingTurnSeconds > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono font-black text-[11px] animate-pulse">
                    {remainingTurnSeconds}s
                  </span>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                Deseja Desafiar o Blefe?
              </h3>
              <p className="text-xs text-petrol-300 mt-2 mb-5 sm:mb-6 leading-relaxed">
                Se o adversário jogou o +4 tendo outra carta da cor válida anterior, ele blefou e
                comprará as 4 cartas! Caso o jogo dele tenha sido legal, você comprará 6 cartas (+2
                de penalidade).
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => respondChallenge(false)}
                  className="py-3 px-3 sm:px-4 rounded-xl bg-petrol-800 hover:bg-petrol-750 text-petrol-200 text-xs font-bold transition border border-petrol-700"
                >
                  Não Desafiar
                </button>
                <button
                  onClick={() => respondChallenge(true)}
                  className="py-3 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-petrol-950 text-xs font-black transition shadow-lg"
                >
                  Desafiar Blefe!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5.4 REVEALED OPPONENT HAND MODAL (DESAFIO VENCIDO) */}
      <AnimatePresence>
        {revealedOpponentHand && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-petrol-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.85, y: 25 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 25 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-petrol-900/95 p-4 sm:p-6 rounded-3xl max-w-2xl w-full border border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)] relative overflow-hidden flex flex-col"
            >
              {/* Barra de progresso animada (contagem regressiva de 2 segundos) */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-petrol-950 overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 2, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                />
              </div>

              {/* Cabeçalho */}
              <div className="flex items-center justify-between gap-2 mb-3 pt-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                      <span>Desafio Vencido!</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <h3 className="text-base sm:text-xl font-black text-white font-['Outfit'] mt-0.5 truncate">
                      Mão de {revealedOpponentHand.playerName}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] sm:text-xs text-petrol-400 font-mono">
                    {revealedOpponentHand.cards.length} {revealedOpponentHand.cards.length === 1 ? "carta" : "cartas"}
                  </span>
                  <button
                    onClick={() => setRevealedOpponentHand(null)}
                    className="p-1.5 rounded-lg text-petrol-400 hover:text-white hover:bg-petrol-800 transition"
                    title="Fechar agora"
                    aria-label="Fechar"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-petrol-300 mb-3 leading-relaxed">
                O adversário blefou jogando +4! Veja as cartas dele abaixo:
              </p>

              {/* Contêiner com rolagem horizontal (scroll para a direita caso haja muitas cartas) */}
              <div className="w-full overflow-x-auto py-2 px-1 flex items-center justify-start gap-2.5 sm:gap-3 scroll-smooth no-scrollbar">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-max pb-1">
                  {revealedOpponentHand.cards.map((card, idx) => (
                    <motion.div
                      key={`revealed-${card.id}-${idx}`}
                      initial={{ opacity: 0, y: 15, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: idx * 0.04, duration: 0.2 }}
                      className="shrink-0 group relative"
                    >
                      <img
                        src={getCardAssetUrl(card)}
                        alt={card.name}
                        className="w-16 sm:w-20 md:w-24 h-auto rounded-xl shadow-xl drop-shadow-md border border-white/20 select-none hover:scale-105 transition-transform"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Dica no rodapé */}
              <div className="mt-2 text-center text-[10px] text-petrol-400 font-medium">
                Desaparece automaticamente em 2s • Arraste para o lado para ver todas as cartas
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5.5 VICTORY OVERLAY (FIM DE JOGO) */}
      <AnimatePresence>
        {winnerPlayerId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-petrol-950/90 backdrop-blur-lg z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="glass-panel p-6 sm:p-12 rounded-3xl max-w-lg w-full text-center border border-teal-400 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-500 to-teal-400 flex items-center justify-center shadow-xl">
                <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-petrol-950" />
              </div>

              {winnerPlayerId === playerId ? (
                <>
                  <h2 className="text-3xl sm:text-5xl font-black text-white font-['Outfit'] tracking-tight">
                    VOCÊ VENCEU!
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-teal-300">
                    Parabéns! Você zerou todas as suas cartas e dominou a mesa.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl sm:text-4xl font-black text-white font-['Outfit']">
                    Fim de Jogo!
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-petrol-300">
                    Vencedor da partida:{" "}
                    <strong className="text-amber-400">
                      {players.find((p) => p.id === winnerPlayerId)?.name ??
                        `Player ${winnerPlayerId}`}
                    </strong>
                  </p>
                </>
              )}

              <button
                onClick={() => returnToLobby()}
                className="absolute top-4 right-4 p-2 rounded-xl text-petrol-400 hover:text-white hover:bg-petrol-800/80 transition"
                title="Retornar ao Lobby"
                aria-label="Retornar ao Lobby"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => returnToLobby()}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl btn-teal-gradient text-white font-black text-sm tracking-wide transition shadow-xl shadow-teal-950/60 flex items-center justify-center gap-2 group"
                >
                  <RotateCcw className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-300" />
                  <span>Retornar ao Lobby</span>
                </button>

                <button
                  onClick={() => startGame()}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl btn-uno-gradient text-white font-black text-sm tracking-wide transition shadow-xl shadow-amber-950/60 flex items-center justify-center gap-2 group"
                >
                  <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform duration-300" />
                  <span>Jogar Novamente</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    leaveRoom();
                  }}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-petrol-900/80 hover:bg-rose-950/40 text-petrol-300 hover:text-rose-300 border border-petrol-750 hover:border-rose-800/50 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Sala</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 6. BOTÕES UNO: REDONDOS, NO CANTO DA TELA (SEM FAZER SOM) */}
      {/* ======================================================== */}
      <div className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-40 pointer-events-none flex items-center gap-3">
        <AnimatePresence>
          {showCalloutUnoButton && (
            <motion.div
              key={`uno-callout-${vulnerableUnoPlayerId}`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="pointer-events-auto"
            >
              {/* Botão Redondo de Acusação de UNO (Punir jogador rival que esqueceu) */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => callUno()}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-red-600 via-rose-600 to-amber-500 border-2 border-yellow-300 text-white shadow-[0_0_20px_rgba(239,68,68,0.85)] hover:shadow-[0_0_30px_rgba(239,68,68,1)] transition-shadow animate-pulse select-none cursor-pointer"
                title={`Acusar e punir ${vulnerablePlayerName} por não dizer UNO!`}
              >
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 shrink-0" />
                <span className="text-xs sm:text-sm font-black tracking-wider leading-none text-white drop-shadow">
                  UNO!
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold text-yellow-200 uppercase tracking-tighter leading-none mt-0.5">
                  Acusar
                </span>
              </motion.button>
            </motion.div>
          )}

          {showMyUnoButton && (
            <motion.div
              key="uno-my-action"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="pointer-events-auto"
            >
              {/* Botão Redondo para o jogador declarar o seu próprio UNO antes de descartar */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => toggleSaidUno()}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center border-2 transition-all select-none cursor-pointer ${
                  saidUnoPending
                    ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-500 border-emerald-300 text-white shadow-[0_0_22px_rgba(16,185,129,0.9)] ring-2 ring-emerald-400"
                    : "bg-gradient-to-br from-red-600 via-rose-600 to-amber-500 border-yellow-300 text-white shadow-[0_0_20px_rgba(239,68,68,0.8)] hover:shadow-[0_0_28px_rgba(239,68,68,1)] animate-pulse"
                }`}
                title={saidUnoPending ? "UNO declarado! Será enviado no descarte" : "Clique para dizer UNO antes de descartar"}
              >
                {saidUnoPending ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200 shrink-0" />
                    <span className="text-xs sm:text-sm font-black tracking-wider leading-none text-white drop-shadow">
                      UNO!
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-emerald-100 uppercase tracking-tighter leading-none mt-0.5">
                      OK ✓
                    </span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 shrink-0" />
                    <span className="text-xs sm:text-sm font-black tracking-wider leading-none text-white drop-shadow">
                      UNO!
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-yellow-100 uppercase tracking-tighter leading-none mt-0.5">
                      Dizer
                    </span>
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GameTable;
