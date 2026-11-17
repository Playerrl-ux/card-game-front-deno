import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { sound } from "@/services/sound";
import { AlertTriangle, X, RefreshCw } from "lucide-react";

export const ErrorModal: React.FC = () => {
  const { errorMessage, clearError, refreshRoomState, inLobby } = useGameStore();

  if (!errorMessage) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="w-full max-w-md p-6 rounded-2xl bg-petrol-950/95 border border-rose-500/40 shadow-2xl shadow-black/80"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                Aviso do Servidor
              </h3>
              <p className="mt-2 text-sm text-petrol-200 leading-relaxed break-words font-mono text-xs">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                clearError();
              }}
              className="text-petrol-400 hover:text-white transition p-1 rounded-lg hover:bg-petrol-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            {inLobby && (
              <button
                onClick={() => {
                  sound.playClick();
                  refreshRoomState();
                  clearError();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-petrol-800 hover:bg-petrol-750 text-petrol-200 text-sm font-medium transition"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar Sala
              </button>
            )}
            <button
              onClick={() => {
                sound.playClick();
                clearError();
              }}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition shadow-lg shadow-rose-900/40"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
