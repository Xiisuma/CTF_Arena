
/**
 * useWebSocket.ts
 *
 * Se connecte au serveur WebSocket (via /ws proxied par nginx).
 * Reconnexion automatique avec backoff exponentiel (max 10s).
 * Le callback onMessage est stable (ref) — pas besoin de le mémoïser côté appelant.
 */

import { useEffect, useRef } from "react";

export type WSMessage = {
  type: "players" | "teams" | "challenges" | "ctf_state" | string;
};

export function useWebSocket(onMessage: (msg: WSMessage) => void, userId?: string | number): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectDelay = 1000;
    let destroyed = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (destroyed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws`;

      ws = new WebSocket(url);

      ws.onopen = () => {
        reconnectDelay = 1000; // reset backoff on successful connection
        // S'enregistrer auprès du serveur WS pour recevoir les messages ciblés
        if (userId != null) {
          const sock = ws;
          if (sock) sock.send(JSON.stringify({ action: "register", userId: String(userId) }));
        }
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as WSMessage;
          onMessageRef.current(msg);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (destroyed) return;
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
          connect();
        }, reconnectDelay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [userId]);
}

