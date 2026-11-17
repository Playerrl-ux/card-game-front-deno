import {
  ClientExternalEventName,
  ClientExternalPayloadMap,
  ClientGameEventName,
  ClientGamePayloadMap,
  EventNetwork,
  ServerEventMessage,
} from "@/shared/events.map";

export type ConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING" | "ERROR";

export interface WsLogEntry {
  id: string;
  direction: "IN" | "OUT";
  type: "GAME" | "EXTERNAL";
  name: string;
  roomName: string;
  sendedBy: number;
  data: unknown;
  timestamp: string;
  isError?: boolean;
}

type MessageHandler = (message: ServerEventMessage) => void;
type StateChangeHandler = (state: ConnectionState) => void;
type LogHandler = (log: WsLogEntry) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string = "";
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private stateHandlers: Set<StateChangeHandler> = new Set();
  private logHandlers: Set<LogHandler> = new Set();
  private state: ConnectionState = "DISCONNECTED";
  private manualClose: boolean = false;

  // Sessão atual do jogador na sala
  private currentRoomName: string | null = null;
  private currentPlayerId: number | null = null;

  constructor() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname || "localhost";
    // Default backend port is 9000
    this.url = import.meta.env.VITE_WS_URL || `${protocol}//${host}:9000/ws`;
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public setUrl(url: string) {
    this.url = url;
  }

  public setSession(roomName: string | null, playerId: number | null) {
    this.currentRoomName = roomName;
    this.currentPlayerId = playerId;
  }

  public clearSession() {
    this.setSession(null, null);
  }

  private setState(newState: ConnectionState) {
    if (this.state === newState) return;
    this.state = newState;
    this.stateHandlers.forEach((handler) => handler(newState));
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state);
    return () => this.stateHandlers.delete(handler);
  }

  public onLog(handler: LogHandler): () => void {
    this.logHandlers.add(handler);
    return () => this.logHandlers.delete(handler);
  }

  private emitLog(entry: WsLogEntry) {
    this.logHandlers.forEach((handler) => handler(entry));
  }

  public connect(): Promise<boolean> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve(true);
    }

    this.manualClose = false;
    this.setState("CONNECTING");

    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          this.setState("CONNECTED");
          this.startHeartbeat();
          console.log("%c[WS CONNECTED]%c Conectado ao servidor:", "color: #10b981; font-weight: bold", "color: inherit", this.url);
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data) as ServerEventMessage;
            const isError = parsed.name === "ROOM_ERROR";

            // Log formatado no DevTools Console
            console.log(
              `%c[WS IN] ${parsed.name}%c (room: ${parsed.roomName}, sender: ${parsed.sendedBy})`,
              isError
                ? "color: #ef4444; font-weight: bold; background: #450a0a; padding: 2px 4px; border-radius: 4px;"
                : "color: #3b82f6; font-weight: bold; background: #172554; padding: 2px 4px; border-radius: 4px;",
              "color: #94a3b8",
              parsed.data
            );

            // Emitir para os listeners do inspetor in-app
            this.emitLog({
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              direction: "IN",
              type: parsed.type,
              name: parsed.name,
              roomName: parsed.roomName,
              sendedBy: parsed.sendedBy,
              data: parsed.data,
              timestamp: new Date().toLocaleTimeString(),
              isError,
            });

            this.messageHandlers.forEach((handler) => handler(parsed));
          } catch (err) {
            console.error("[WS] Failed to parse message:", event.data, err);
          }
        };

        this.socket.onerror = (err) => {
          console.warn("[WS] Connection error:", err);
          this.setState("ERROR");
          resolve(false);
        };

        this.socket.onclose = () => {
          this.stopHeartbeat();
          this.socket = null;

          if (!this.manualClose) {
            this.setState("RECONNECTING");
            this.scheduleReconnect();
          } else {
            this.setState("DISCONNECTED");
          }
          resolve(false);
        };
      } catch (err) {
        console.error("[WS] Socket init exception:", err);
        this.setState("ERROR");
        resolve(false);
      }
    });
  }

  public disconnect() {
    this.manualClose = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setSession(null, null);
    this.setState("DISCONNECTED");
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || this.manualClose) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (!this.manualClose && this.state !== "CONNECTED") {
        this.connect();
      }
    }, 3000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    // Heartbeat a cada 5 segundos com evento leve 'ping' (conforme documentação do protocolo)
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected() && this.currentRoomName && this.currentPlayerId !== null) {
        this.sendExternal("ping", {}, this.currentRoomName, this.currentPlayerId);
      }
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Send EXTERNAL event (e.g. createRoom, joinRoom, addBot, startGame)
   */
  public sendExternal<K extends ClientExternalEventName>(
    name: K,
    payload: ClientExternalPayloadMap[K],
    roomName: string,
    sendedBy: number = -1
  ): boolean {
    const envelope: EventNetwork<ClientExternalPayloadMap[K]> = {
      type: "EXTERNAL",
      name,
      sendedBy,
      roomName,
      data: payload,
    };
    return this.sendRaw(envelope);
  }

  /**
   * Send GAME event (e.g. client:PLAY_CARD)
   */
  public sendGame<K extends ClientGameEventName>(
    name: K,
    payload: ClientGamePayloadMap[K],
    roomName: string,
    sendedBy: number
  ): boolean {
    const envelope = {
      type: "GAME" as const,
      name,
      sendedBy,
      roomName,
      data: {
        data: payload,
      },
    };
    return this.sendRaw(envelope);
  }

  private sendRaw(data: EventNetwork<unknown>): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("[WS] Cannot send message, socket is not OPEN:", data);
      return false;
    }

    // Log no DevTools Console
    console.log(
      `%c[WS OUT] ${data.name}%c (room: ${data.roomName}, sender: ${data.sendedBy})`,
      "color: #10b981; font-weight: bold; background: #064e3b; padding: 2px 4px; border-radius: 4px;",
      "color: #94a3b8",
      data.data
    );

    // Emitir para os listeners do inspetor in-app
    this.emitLog({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      direction: "OUT",
      type: data.type,
      name: data.name,
      roomName: data.roomName,
      sendedBy: data.sendedBy,
      data: data.data,
      timestamp: new Date().toLocaleTimeString(),
    });

    const jsonStr = JSON.stringify(data);
    this.socket.send(jsonStr);
    return true;
  }
}

export const wsService = new WebSocketService();
