import React, { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { sound } from "@/services/sound";
import { Volume2, VolumeX, Wifi, WifiOff, User } from "lucide-react";

export const Header: React.FC = () => {
  const {
    connectionState,
    playerId,
    roomName,
    inLobby,
    inGame,
    connect,
  } = useGameStore();

  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const statusConfig = {
    CONNECTED: {
      color: "bg-emerald-500",
      border: "border-emerald-500/30",
      text: "Conectado",
      textColor: "text-emerald-400",
    },
    CONNECTING: {
      color: "bg-amber-500 animate-pulse",
      border: "border-amber-500/30",
      text: "Conectando...",
      textColor: "text-amber-400",
    },
    RECONNECTING: {
      color: "bg-amber-500 animate-pulse",
      border: "border-amber-500/30",
      text: "Reconectando...",
      textColor: "text-amber-400",
    },
    DISCONNECTED: {
      color: "bg-rose-500",
      border: "border-rose-500/30",
      text: "Desconectado",
      textColor: "text-rose-400",
    },
    ERROR: {
      color: "bg-rose-500",
      border: "border-rose-500/30",
      text: "Erro de Conexão",
      textColor: "text-rose-400",
    },
  }[connectionState] || {
    color: "bg-slate-500",
    border: "border-slate-500/30",
    text: connectionState,
    textColor: "text-slate-400",
  };

  return (
    <header className="w-full border-b border-petrol-800/80 bg-petrol-950/75 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 lg:px-8 py-2 sm:py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-red-600 via-amber-500 to-teal-500 shadow-lg shadow-teal-950/50">
            <span className="font-black text-white text-xs sm:text-base tracking-tighter drop-shadow font-['Outfit']">
              CG
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-bold font-['Outfit'] tracking-wide text-white truncate">
                Card Game Online
              </h1>
              <span className="hidden xs:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                v2.0
              </span>
            </div>
            <p className="text-xs text-petrol-300 hidden sm:block">
              Engine de Cartas em Tempo Real
            </p>
          </div>
        </div>

        {/* Center Room Indicator (if in room) */}
        {(inLobby || inGame) && roomName && (
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full bg-petrol-900/90 border border-petrol-700/60 text-xs">
            <span className="text-petrol-300">Sala:</span>
            <span className="font-mono font-bold tracking-wider text-teal-300">
              {roomName}
            </span>
          </div>
        )}

        {/* Right Actions: Player Badge, Sound, WS Status */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Player Badge (quando estiver associado a uma sala com playerId) */}
          {playerId !== null && (
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-petrol-850/80 border border-teal-500/40 text-[11px] sm:text-xs text-teal-200">
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-400" />
              <span className="font-bold font-mono">
                <span className="sm:hidden">P{playerId}</span>
                <span className="hidden sm:inline">Player {playerId}</span>
              </span>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-lg border transition ${
              isMuted
                ? "bg-petrol-900/50 border-petrol-800 text-petrol-400 hover:text-slate-200"
                : "bg-petrol-900/80 border-petrol-700/70 text-teal-400 hover:text-teal-300 shadow-sm"
            }`}
            title={isMuted ? "Ativar Áudio" : "Silenciar Áudio"}
            aria-label="Controle de Áudio"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Connection Pill */}
          <button
            onClick={() => {
              if (connectionState === "DISCONNECTED" || connectionState === "ERROR") {
                connect();
              }
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
              statusConfig.border
            } bg-slate-900/70 hover:bg-slate-800/80`}
            title={connectionState === "CONNECTED" ? "WebSocket Conectado" : "Clique para tentar reconectar"}
          >
            <span className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
            <span className={`hidden sm:inline ${statusConfig.textColor}`}>
              {statusConfig.text}
            </span>
            {connectionState === "CONNECTED" ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
