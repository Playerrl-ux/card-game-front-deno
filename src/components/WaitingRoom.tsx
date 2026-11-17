import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { sound } from "@/services/sound";
import {
  Copy,
  Check,
  Bot,
  Play,
  LogOut,
  Users,
  Sparkles,
  Layers,
  ShieldCheck,
  Info,
  UserPlus,
} from "lucide-react";

export const WaitingRoom: React.FC = () => {
  const {
    roomName,
    players,
    playerId,
    leaveRoom,
    addBot,
    startGame,
    gameConfigs,
    numberOfDecks,
    showToast,
  } = useGameStore();

  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    sound.playClick();
    navigator.clipboard.writeText(roomName);
    setCopied(true);
    showToast("Código da sala copiado!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  // Preencher até 4 slots (ou quantidade de jogadores)
  const safePlayers = Array.isArray(players) ? players : [];
  const totalSlots = Math.max(4, safePlayers.length);
  const emptySlotsCount = Math.max(0, totalSlots - safePlayers.length);

  const activeRulesCount = Object.values(gameConfigs || {}).filter(Boolean).length;

  return (
    <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-4 py-4 sm:py-8">
      {/* Top Bar with Room Code and Exit */}
      <div className="flex items-center justify-between gap-2 mb-5 sm:mb-8">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-teal-400">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            SALA DE ESPERA • PRÉ-JOGO
          </div>
          <div className="flex items-center gap-2 sm:gap-3 mt-1">
            <h2 className="text-2xl sm:text-4xl font-black font-mono tracking-wider text-white">
              {roomName}
            </h2>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-petrol-800/90 hover:bg-petrol-750 text-petrol-200 text-[11px] sm:text-xs font-semibold border border-petrol-700/80 transition"
              title="Copiar código da sala"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-petrol-400" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            if (confirm("Tem certeza que deseja sair desta sala?")) {
              leaveRoom();
            }
          }}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-bold transition shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden xs:inline">Sair da Sala</span>
          <span className="xs:hidden">Sair</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
        {/* Left Column: Players Grid */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-petrol-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  Jogadores ({safePlayers.length}/{totalSlots})
                </h3>
              </div>

              {/* Qualquer jogador pode adicionar bots */}
              <button
                onClick={addBot}
                disabled={safePlayers.length >= 10}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-teal-600/25 hover:bg-teal-600/40 text-teal-300 border border-teal-500/40 text-[11px] sm:text-xs font-bold transition disabled:opacity-40 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Bot</span>
              </button>
            </div>

            {/* Players Slots Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {safePlayers.map((player) => {
                  const isYou = player.id === playerId;
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`p-4 rounded-2xl border transition relative overflow-hidden flex items-center gap-4 ${
                        isYou
                          ? "bg-gradient-to-r from-petrol-850/90 to-petrol-800/90 border-teal-500/50 shadow-md shadow-teal-950/40"
                          : player.isBot
                          ? "bg-petrol-900/60 border-petrol-800 text-petrol-300"
                          : "bg-petrol-900/80 border-petrol-750 text-white"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md font-mono ${
                            player.isBot
                              ? "bg-gradient-to-br from-cyan-600 to-blue-700 text-white"
                              : isYou
                              ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white"
                              : "bg-petrol-800 border border-petrol-700 text-petrol-200"
                          }`}
                        >
                          {player.isBot ? (
                            <Bot className="w-6 h-6 text-white" />
                          ) : (
                            `P${player.id}`
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white font-mono truncate">
                            {player.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isYou
                                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                : player.isBot
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : "bg-petrol-800 text-petrol-400"
                            }`}
                          >
                            {isYou ? "Você" : player.isBot ? "Bot IA" : "Jogador"}
                          </span>
                          <span className="text-[11px] text-petrol-400 font-mono">ID: {player.id}</span>
                        </div>
                      </div>

                      {/* Status dot */}
                      <div className="shrink-0 flex items-center">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            player.isConnected ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                          title={player.isConnected ? "Conectado" : "Desconectado"}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Empty Slots */}
              {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="p-4 rounded-2xl border border-dashed border-petrol-800/80 bg-petrol-950/30 flex items-center gap-4 text-petrol-500 select-none"
                >
                  <div className="w-12 h-12 rounded-2xl border border-dashed border-petrol-800 flex items-center justify-center text-petrol-600">
                    <Users className="w-5 h-5 opacity-40" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-petrol-400">
                      Vaga Disponível
                    </div>
                    <div className="text-xs text-petrol-500">Aguardando jogador ou bot...</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Minimum Players Alert if < 2 */}
            {safePlayers.length < 2 && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  A partida precisa de pelo menos <strong>2 jogadores</strong> para começar.
                  Convide outro jogador para a sala ou clique em <strong>"+ Adicionar Bot"</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Action Footer: Qualquer jogador pode iniciar */}
          <div className="glass-panel rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="text-sm font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                <Play className="w-4 h-4 text-teal-400" />
                Pronto para a Partida
              </div>
              <div className="text-xs text-petrol-300 mt-0.5">
                Qualquer jogador pode iniciar a partida assim que houver 2 ou mais pessoas/bots.
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={safePlayers.length < 2}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl btn-uno-gradient text-white font-black text-sm tracking-wide uppercase transition shadow-xl shadow-amber-950/60 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <Play className="w-4 h-4 fill-current group-hover:scale-110 transition" />
              Iniciar Partida
            </button>
          </div>
        </div>

        {/* Right Column: Room Rules & Info */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-petrol-800/80">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Regras Ativas ({activeRulesCount})
              </h4>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-petrol-900/80 border border-petrol-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-petrol-200">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <span>Baralhos em Jogo</span>
                </div>
                <span className="font-bold text-white font-mono">{numberOfDecks}</span>
              </div>

              {gameConfigs.SEVEN_HAS_EFFECT && (
                <div className="p-3 rounded-xl bg-petrol-900/80 border border-petrol-800/80 flex items-center justify-between text-xs">
                  <span className="text-petrol-200">🔄 Troca de Mão (7)</span>
                  <span className="font-bold text-emerald-400">Ativado</span>
                </div>
              )}

              {gameConfigs.ZERO_HAS_EFFECT && (
                <div className="p-3 rounded-xl bg-petrol-900/80 border border-petrol-800/80 flex items-center justify-between text-xs">
                  <span className="text-petrol-200">🌪️ Giro de Mãos (0)</span>
                  <span className="font-bold text-emerald-400">Ativado</span>
                </div>
              )}

              {gameConfigs.DRAW_2_OVER_DRAW_4 && (
                <div className="p-3 rounded-xl bg-petrol-900/80 border border-petrol-800/80 flex items-center justify-between text-xs">
                  <span className="text-petrol-200">⚡ Acúmulo +2 / +4</span>
                  <span className="font-bold text-emerald-400">Ativado</span>
                </div>
              )}

              {gameConfigs.JUMPIN && (
                <div className="p-3 rounded-xl bg-petrol-900/80 border border-petrol-800/80 flex items-center justify-between text-xs">
                  <span className="text-petrol-200">🎯 Jump-In Instantâneo</span>
                  <span className="font-bold text-emerald-400">Ativado</span>
                </div>
              )}

              {gameConfigs.DRAW_4_CHALLENGES && (
                <div className="p-3 rounded-xl bg-petrol-900/80 border border-petrol-800/80 flex items-center justify-between text-xs">
                  <span className="text-petrol-200">🕵️ Desafio de +4</span>
                  <span className="font-bold text-emerald-400">Ativado</span>
                </div>
              )}

              {gameConfigs.DRAW_UNTIL_HAVE && (
                <div className="p-3 rounded-xl bg-petrol-900/80 border border-petrol-800/80 flex items-center justify-between text-xs">
                  <span className="text-petrol-200">🃏 Comprar até Poder Jogar</span>
                  <span className="font-bold text-emerald-400">Ativado</span>
                </div>
              )}
            </div>

            {playerId !== 0 && (
              <p className="mt-3 text-[11px] text-petrol-400 leading-tight">
                ℹ️ As configurações da partida são personalizadas pelo anfitrião da sala e serão sincronizadas no início do jogo.
              </p>
            )}
          </div>

          {/* Quick Tips */}
          <div className="glass-panel rounded-3xl p-6 bg-gradient-to-br from-petrol-900/90 to-petrol-850/80">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-teal-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Dica Estratégica
            </div>
            <p className="text-xs text-petrol-200 leading-relaxed">
              Com o efeito do <strong>7</strong> ativo, guarde cartas altas de compra para passar adiante na hora certa, ou passe sua mão de poucas cartas se estiver perdendo!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
