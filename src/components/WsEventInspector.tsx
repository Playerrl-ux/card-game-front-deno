import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { wsService, WsLogEntry } from "@/services/websocket";
import { sound } from "@/services/sound";
import {
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  X,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

export const WsEventInspector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<WsLogEntry[]>([]);
  const [filter, setFilter] = useState<"ALL" | "OUT" | "IN" | "ERROR">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Inscrever para receber logs do websocket service
    const unsubscribe = wsService.onLog((entry) => {
      setLogs((prev) => [entry, ...prev.slice(0, 99)]); // Guarda até 100 eventos recentes
    });
    return unsubscribe;
  }, []);

  const handleCopy = (id: string, data: unknown) => {
    sound.playClick();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "OUT" && log.direction !== "OUT") return false;
    if (filter === "IN" && log.direction !== "IN") return false;
    if (filter === "ERROR" && !log.isError) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = log.name.toLowerCase().includes(term);
      const matchRoom = log.roomName.toLowerCase().includes(term);
      const matchData = JSON.stringify(log.data).toLowerCase().includes(term);
      return matchName || matchRoom || matchData;
    }
    return true;
  });

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40">
        <button
          onClick={() => {
            sound.playClick();
            setIsOpen((prev) => !prev);
          }}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full border shadow-xl backdrop-blur-md text-[10px] sm:text-xs font-bold transition ${
            isOpen
              ? "bg-teal-600 border-teal-400 text-white"
              : "bg-petrol-900/90 border-petrol-700/80 text-petrol-300 hover:text-white hover:border-teal-500"
          }`}
          title="Abrir Console / Inspetor de Eventos WebSocket"
        >
          <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" />
          <span className="hidden sm:inline">Console WS</span>
          {logs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 text-[10px] font-mono">
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {/* Slide-over Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-14 right-3 left-3 sm:left-auto sm:bottom-16 sm:right-4 sm:w-[480px] h-[520px] max-h-[78vh] z-50 rounded-2xl glass-panel bg-petrol-950/95 border border-petrol-700/80 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-petrol-800 flex items-center justify-between gap-2 bg-petrol-900/60">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Eventos WebSocket em Tempo Real
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    setLogs([]);
                  }}
                  className="p-1.5 hover:bg-petrol-800 text-petrol-400 hover:text-rose-400 rounded-lg transition"
                  title="Limpar Histórico"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-petrol-800 text-petrol-400 hover:text-white rounded-lg transition"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Controls Bar: Search & Filters */}
            <div className="p-3 border-b border-petrol-800/80 space-y-2 bg-petrol-900/40">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-petrol-500" />
                <input
                  type="text"
                  placeholder="Filtrar por evento, sala ou dado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-petrol-900 border border-petrol-800 text-xs text-petrol-200 placeholder:text-petrol-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold">
                {(["ALL", "OUT", "IN", "ERROR"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      sound.playClick();
                      setFilter(f);
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      filter === f
                        ? "bg-teal-600 text-white font-bold"
                        : "bg-petrol-900 text-petrol-400 hover:text-slate-200"
                    }`}
                  >
                    {f === "ALL" && "Todos"}
                    {f === "OUT" && "Enviados (OUT)"}
                    {f === "IN" && "Recebidos (IN)"}
                    {f === "ERROR" && "Erros"}
                  </button>
                ))}
              </div>
            </div>

            {/* Event List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Activity className="w-8 h-8 mb-2 opacity-30 text-purple-400" />
                  <p className="text-xs">Nenhum evento registrado ainda.</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Crie ou entre em uma sala para visualizar o fluxo WebSocket.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <div
                      key={log.id}
                      className={`rounded-xl border transition p-2.5 ${
                        log.isError
                          ? "bg-rose-950/40 border-rose-600/40"
                          : log.direction === "OUT"
                          ? "bg-emerald-950/20 border-emerald-500/30"
                          : "bg-blue-950/20 border-blue-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Direction & Name */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                              log.isError
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : log.direction === "OUT"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            }`}
                          >
                            {log.isError ? (
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                            ) : log.direction === "OUT" ? (
                              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <ArrowDownLeft className="w-3 h-3 text-blue-400" />
                            )}
                            {log.direction}
                          </span>

                          <span className="font-bold text-slate-200 truncate font-['Plus_Jakarta_Sans']">
                            {log.name}
                          </span>
                        </div>

                        {/* Timestamp & Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                          <button
                            onClick={() => handleCopy(log.id, log.data)}
                            className="p-1 text-slate-500 hover:text-slate-300 transition rounded"
                            title="Copiar JSON"
                          >
                            {copiedId === log.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="p-1 text-slate-500 hover:text-slate-300 transition rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Summary line */}
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400">
                        <span>
                          Sala: <strong className="text-yellow-400">{log.roomName || "-"}</strong>
                        </span>
                        <span>
                          Sender ID: <strong className="text-slate-200">{log.sendedBy}</strong>
                        </span>
                        <span className="uppercase text-[9px] px-1 bg-slate-800 rounded">
                          {log.type}
                        </span>
                      </div>

                      {/* Expanded JSON view */}
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80">
                          <pre className="p-2 rounded-lg bg-black/50 text-[11px] text-slate-300 overflow-x-auto max-h-40">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
