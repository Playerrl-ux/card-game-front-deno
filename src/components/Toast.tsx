import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

export const Toast: React.FC = () => {
  const { toast, timeoutNotice } = useGameStore();

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:top-5 sm:right-5 z-50 pointer-events-none flex flex-col gap-2 sm:max-w-sm">
      <AnimatePresence>
        {timeoutNotice && (
          <motion.div
            key={`timeout-notice-${timeoutNotice.id}`}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-auto p-3 sm:p-4 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-2.5 sm:gap-3 ${
              timeoutNotice.isMe
                ? "bg-rose-950/95 border-rose-500/60 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/40"
                : "bg-amber-950/95 border-amber-500/60 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/40"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              <AlertTriangle
                className={`w-4 h-4 sm:w-5 sm:h-5 ${timeoutNotice.isMe ? "text-rose-400" : "text-amber-400"} animate-bounce`}
              />
            </div>
            <div className="flex-1 text-xs sm:text-sm leading-relaxed">
              <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider opacity-75 mb-0.5">
                {timeoutNotice.isMe ? "Tempo Esgotado" : "Turno Passou"}
              </div>
              <div className="font-bold">{timeoutNotice.text}</div>
            </div>
            <button
              onClick={() => useGameStore.setState({ timeoutNotice: null })}
              className="text-slate-400 hover:text-slate-200 transition p-0.5 rounded"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {toast && (
          <motion.div
            key={`toast-${toast.id}`}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto p-3 sm:p-4 rounded-xl border shadow-xl backdrop-blur-md flex items-start gap-2.5 sm:gap-3 ${
              toast.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-100"
                : toast.type === "error"
                ? "bg-rose-950/80 border-rose-500/30 text-rose-100"
                : "bg-petrol-900/95 border-teal-500/40 text-petrol-100"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === "success" && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
              {toast.type === "error" && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />}
              {toast.type === "info" && <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />}
            </div>
            <div className="flex-1 text-xs sm:text-sm leading-relaxed">{toast.text}</div>
            <button
              onClick={() => useGameStore.setState({ toast: null })}
              className="text-slate-400 hover:text-slate-200 transition p-0.5 rounded"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
