import React, { useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Header } from "@/components/Header";
import { LobbyAuth } from "@/components/LobbyAuth";
import { WaitingRoom } from "@/components/WaitingRoom";
import { GameTable } from "@/components/GameTable";
import { Toast } from "@/components/Toast";
import { ErrorModal } from "@/components/ErrorModal";
import { WsEventInspector } from "@/components/WsEventInspector";

export const App: React.FC = () => {
  const { inLobby, inGame, connect } = useGameStore();

  // Conectar ao WebSocket na inicialização da aplicação
  useEffect(() => {
    connect();
  }, [connect]);

  // Garante que o scroll horizontal e vertical resete ao trocar de tela (evita tela deslocada para a direita)
  useEffect(() => {
    window.scrollTo({ left: 0, top: 0, behavior: "instant" as ScrollBehavior });
    if (document.documentElement) document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;
  }, [inLobby, inGame]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col justify-between relative selection:bg-teal-500 selection:text-white">
      {/* Toast Notifications & Modal */}
      <Toast />
      <ErrorModal />
      <WsEventInspector />

      {/* Top Navbar */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden flex flex-col items-center justify-center py-2 sm:py-6 px-2 sm:px-4 relative z-10">
        {!inLobby && !inGame && (
          <div className="w-full max-w-full flex justify-center">
            <LobbyAuth />
          </div>
        )}

        {inLobby && !inGame && (
          <div className="w-full max-w-full flex justify-center">
            <WaitingRoom />
          </div>
        )}

        {inGame && (
          <div className="w-full max-w-full flex justify-center">
            <GameTable />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`${inGame ? "hidden sm:block" : "block"} w-full border-t border-petrol-800/80 bg-petrol-950/85 backdrop-blur-md py-3 sm:py-4 px-4 sm:px-6 text-center text-[11px] sm:text-xs text-petrol-400`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Engine de Cartas Deno • WebSocket Protocol v2.0</span>
          <span>Card Game Especial com 7 Troca, 0 Gira, Acúmulo e Desafios</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
