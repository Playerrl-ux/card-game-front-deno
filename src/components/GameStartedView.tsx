import React from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { getCardAssetUrl } from "@/utils/cardAsset";
import { sound } from "@/services/sound";
import { Sparkles, ArrowLeft, Bot } from "lucide-react";

export const GameStartedView: React.FC = () => {
  const { initialDiscard, roomName, players, playerId, leaveRoom } = useGameStore();

  const cardImg = getCardAssetUrl(initialDiscard);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-3xl p-8 text-center relative overflow-hidden"
      >
        {/* Glow overlay */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Partida Oficialmente Iniciada
        </div>

        <h2 className="text-3xl sm:text-5xl font-black font-['Outfit'] text-white tracking-tight">
          A Mesa está Pronta!
        </h2>
        <p className="mt-2 text-petrol-300 text-sm max-w-md mx-auto">
          Sala <span className="font-mono font-bold text-amber-400">{roomName}</span> conectada à engine do servidor.
        </p>

        {/* Initial Discard Showcase */}
        <div className="my-10 flex flex-col items-center justify-center">
          <div className="text-xs font-bold uppercase tracking-widest text-petrol-400 mb-3">
            Carta Inicial no Topo do Descarte
          </div>

          <motion.div
            initial={{ rotate: -15, scale: 0.8, y: 20 }}
            animate={{ rotate: 0, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative group"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-red-600 via-amber-500 to-teal-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-70 transition" />
            <img
              src={cardImg}
              alt={initialDiscard?.name || "Carta Inicial"}
              className="relative w-36 sm:w-44 h-auto rounded-xl shadow-2xl drop-shadow-2xl border border-white/20 select-none"
            />
          </motion.div>

          {initialDiscard && (
            <div className="mt-4 px-4 py-1.5 rounded-full bg-petrol-900/90 border border-petrol-700/80 text-xs font-bold text-petrol-200">
              Cor: <span className="text-amber-400 font-mono">{initialDiscard.color}</span> | Tipo: <span className="text-teal-300 font-mono">{initialDiscard.type}</span>
            </div>
          )}
        </div>

        {/* Players on table */}
        <div className="pt-6 border-t border-petrol-800/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-petrol-400 mb-4">
            Jogadores na Partida
          </h4>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {players.map((p) => {
              const isYou = p.id === playerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold ${
                    isYou
                      ? "bg-petrol-850/90 border-teal-500/60 text-teal-200"
                      : "bg-petrol-900/80 border-petrol-800 text-petrol-200"
                  }`}
                >
                  {p.isBot && <Bot className="w-4 h-4 text-cyan-400" />}
                  <span>{p.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back to lobby option */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => {
              sound.playClick();
              leaveRoom();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-petrol-800 hover:bg-petrol-750 text-petrol-200 text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Menu Principal
          </button>
        </div>
      </motion.div>
    </div>
  );
};
