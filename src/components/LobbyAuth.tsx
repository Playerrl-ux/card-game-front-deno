import React, { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { sound } from "@/services/sound";
import {
  LogIn,
  PlusCircle,
  RotateCcw,
  Sparkles,
  Layers,
  Dices,
  ShieldAlert,
  ArrowRight,
  Flame,
  X,
} from "lucide-react";

export const LobbyAuth: React.FC = () => {
  const {
    createRoom,
    joinRoom,
    reconnectRoom,
    clearSavedRoomSession,
    lastRoomName,
    lastPlayerId,
    lastRoomIsCreator,
    gameConfigs,
    setGameConfig,
    numberOfDecks,
    setNumberOfDecks,
    isLoading,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<"join" | "create">("join");

  // Formulário de Entrar
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Formulário de Criar
  const [createRoomInput, setCreateRoomInput] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Gerador de Código Aleatório (5 letras maiúsculas legíveis)
  const generateRandomCode = () => {
    sound.playClick();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateRoomInput(result);
    setCreateError(null);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const cleaned = joinRoomInput.trim().toUpperCase();
    if (cleaned.length < 5 || cleaned.length > 10) {
      setJoinError("O nome da sala deve ter entre 5 e 10 caracteres.");
      return;
    }
    setJoinError(null);
    await joinRoom(cleaned);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    let cleaned = createRoomInput.trim().toUpperCase();
    if (!cleaned) {
      // Auto-gerar se estiver vazio
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (let i = 0; i < 6; i++) {
        cleaned += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setCreateRoomInput(cleaned);
    }

    if (cleaned.length < 5 || cleaned.length > 10) {
      setCreateError("O nome da sala deve ter entre 5 e 10 caracteres.");
      return;
    }

    setCreateError(null);
    await createRoom(cleaned);
  };

  const rulesList = [
    {
      id: "SEVEN_HAS_EFFECT" as const,
      label: "Efeito do 7 (Trocar de Mão)",
      desc: "Quem joga um 7 escolhe um jogador rival e troca toda a sua mão com ele.",
      icon: "🔄",
      badge: "Estratégico",
    },
    {
      id: "ZERO_HAS_EFFECT" as const,
      label: "Efeito do 0 (Girar Todas as Mãos)",
      desc: "Ao jogar 0, todas as mãos giram no sentido atual da partida.",
      icon: "🌪️",
      badge: "Caótico",
    },
    {
      id: "DRAW_2_OVER_DRAW_4" as const,
      label: "Acúmulo de +2 sobre +4",
      desc: "Permite rebater e acumular cartas de compra na cadeia de ataque.",
      icon: "⚡",
      badge: "Intenso",
    },
    {
      id: "JUMPIN" as const,
      label: "Jump-In (Corte Fora de Turno)",
      desc: "Se você tem a carta idêntica à descartada, jogue instantaneamente fora da sua vez.",
      icon: "🎯",
      badge: "Reflexo",
    },
    {
      id: "DRAW_4_CHALLENGES" as const,
      label: "Desafio do +4",
      desc: "Permite desafiar o rival que jogou +4 para checar se ele blefou tendo a cor da mesa.",
      icon: "🕵️",
      badge: "Mente Brilhante",
    },
    {
      id: "DRAW_UNTIL_HAVE" as const,
      label: "Comprar até Poder Jogar",
      desc: "Ao comprar do monte, continua comprando até achar uma carta jogável.",
      icon: "🃏",
      badge: "Hardcore",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-2.5 sm:px-4 py-4 sm:py-8">
      {/* Banner / Hero Section */}
      <div className="text-center mb-5 sm:mb-8 relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[10px] sm:text-xs font-semibold mb-2.5 sm:mb-3 tracking-wide backdrop-blur-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>MESA DE JOGO EM TEMPO REAL & BOTS INTELIGENTES</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl xs:text-3xl sm:text-5xl font-black font-['Outfit'] tracking-tight text-white drop-shadow-md"
        >
          Pronto para o <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-teal-300 to-cyan-400">Próximo Descarte</span>?
        </motion.h2>
        <p className="mt-2 sm:mt-3 text-xs sm:text-base text-petrol-300 max-w-lg mx-auto px-2">
          Crie sua sala com regras personalizadas ou entre em uma partida com seus amigos.
        </p>
      </div>

      {/* Quick Reconnect Card (if available) */}
      {lastRoomName && lastPlayerId !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-5 sm:mb-8 p-3.5 sm:p-4 rounded-2xl bg-petrol-900/80 border border-teal-500/40 shadow-xl shadow-black/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin-reverse" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-teal-300 font-medium uppercase tracking-wider">
                Partida em Andamento Detectada
              </div>
              <div className="text-xs sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
                Sala anterior: <span className="font-mono text-amber-400 font-black">{lastRoomName}</span>
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${
                  lastRoomIsCreator
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : "text-petrol-300 bg-petrol-800/80"
                }`}>
                  {lastRoomIsCreator ? "👑 Criador da Sala (Host)" : `Player ID: ${lastPlayerId}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                sound.playClick();
                clearSavedRoomSession();
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-petrol-800/60 hover:bg-rose-950/40 border border-petrol-700/60 hover:border-rose-500/40 text-petrol-400 hover:text-rose-300 text-xs font-semibold transition"
              title="Descartar partida salva"
            >
              <X className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sound.playClick();
                reconnectRoom();
              }}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl btn-teal-gradient text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-teal-950/60 disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Reconectando..." : "Reconectar à Partida"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Card with Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8"
      >
        {/* Navigation Tabs */}
        <div className="flex p-1 sm:p-1.5 rounded-2xl bg-petrol-950/80 border border-petrol-800/80 mb-5 sm:mb-8 max-w-md mx-auto">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab("join");
            }}
            className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === "join"
                ? "btn-teal-gradient text-white shadow-lg shadow-teal-950/50"
                : "text-petrol-400 hover:text-white"
            }`}
          >
            <LogIn className="w-4 h-4" />
            Entrar na Sala
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab("create");
            }}
            className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === "create"
                ? "btn-uno-gradient text-white shadow-lg shadow-amber-950/50"
                : "text-petrol-400 hover:text-white"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Criar Sala
          </button>
        </div>

        {/* Tab 1: Entrar na Sala */}
        {activeTab === "join" && (
          <form onSubmit={handleJoin} className="max-w-md mx-auto space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-petrol-300 mb-2">
                Código / Nome da Sala
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="EX: SALA01"
                  value={joinRoomInput}
                  onChange={(e) => {
                    setJoinRoomInput(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  className="w-full px-4 py-3.5 rounded-xl bg-petrol-900/80 border border-petrol-700/80 text-white font-mono text-lg font-bold tracking-widest uppercase placeholder:text-petrol-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition"
                  autoFocus
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-petrol-400">
                  {joinRoomInput.length}/10
                </span>
              </div>
              <p className="mt-1 text-[11px] text-petrol-400">
                Deve conter entre 5 e 10 caracteres.
              </p>
            </div>

            {joinError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{joinError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || joinRoomInput.length < 5}
              className="w-full py-4 rounded-xl btn-teal-gradient text-white font-bold text-base transition shadow-xl shadow-teal-950/60 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <span>Conectando à sala...</span>
              ) : (
                <>
                  <span>Entrar na Sala</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Criar Sala */}
        {activeTab === "create" && (
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Código da Sala */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-petrol-300 mb-2">
                  Nome / Código da Sala
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="EX: SALA99"
                      value={createRoomInput}
                      onChange={(e) => {
                        setCreateRoomInput(e.target.value.toUpperCase());
                        setCreateError(null);
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-petrol-900/80 border border-petrol-700/80 text-white font-mono text-base font-bold tracking-wider uppercase placeholder:text-petrol-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-petrol-400">
                      {createRoomInput.length}/10
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3.5 py-3 rounded-xl bg-petrol-800 hover:bg-petrol-750 text-petrol-200 border border-petrol-700 transition flex items-center gap-1.5 text-xs font-semibold"
                    title="Gerar código aleatório"
                  >
                    <Dices className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Aleatório</span>
                  </button>
                </div>
                {createError && (
                  <p className="mt-1 text-xs text-rose-400">{createError}</p>
                )}
              </div>

              {/* Baralhos */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-petrol-300 mb-2">
                  Número de Baralhos
                </label>
                <div className="flex items-center gap-2 sm:gap-3">
                  {[1, 2].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setNumberOfDecks(num);
                      }}
                      className={`flex-1 py-3 px-2.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition ${
                        numberOfDecks === num
                          ? "bg-teal-600/30 border-teal-400 text-teal-100 shadow-sm"
                          : "bg-petrol-900/60 border-petrol-800 text-petrol-400 hover:text-petrol-200"
                      }`}
                    >
                      <Layers className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{num} {num === 1 ? "Baralho (108)" : "Baralhos (216)"}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Regras Opcionais da Partida */}
            <div className="pt-4 border-t border-petrol-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Regras Especiais da Partida
                  </h3>
                </div>
                <span className="text-[11px] sm:text-xs text-petrol-300">
                  Ative ou desative as mecânicas ao seu gosto
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {rulesList.map((rule) => {
                  const isChecked = gameConfigs[rule.id] ?? false;
                  return (
                    <div
                      key={rule.id}
                      onClick={() => setGameConfig(rule.id, !isChecked)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition select-none flex items-start gap-3.5 ${
                        isChecked
                          ? "bg-gradient-to-r from-petrol-900/90 to-petrol-800/80 border-teal-500/50 shadow-md shadow-teal-950/30"
                          : "bg-petrol-950/60 border-petrol-800/70 opacity-60 hover:opacity-90"
                      }`}
                    >
                      <div className="text-2xl mt-0.5 shrink-0">{rule.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white truncate">
                            {rule.label}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isChecked
                                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                : "bg-petrol-900 text-petrol-400"
                            }`}
                          >
                            {rule.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-petrol-300 leading-snug line-clamp-2">
                          {rule.desc}
                        </p>
                      </div>

                      {/* Custom Toggle Switch */}
                      <div className="shrink-0 pt-0.5">
                        <div
                          className={`w-11 h-6 rounded-full transition-colors p-1 flex items-center ${
                            isChecked ? "bg-teal-500 justify-end" : "bg-petrol-800 justify-start"
                          }`}
                        >
                          <motion.div
                            layout
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="w-4 h-4 rounded-full bg-white shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Create Room */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl btn-uno-gradient text-white font-bold text-base transition shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 disabled:opacity-50 group"
              >
                {isLoading ? (
                  <span>Criando sala no servidor...</span>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" />
                    <span>Criar Sala e Ir para o Lobby</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
