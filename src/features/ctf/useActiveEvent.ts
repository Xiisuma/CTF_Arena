
import { useCallback, useEffect, useRef, useState } from "react";
import { getActiveEvent, type ActiveEvent } from "./activeEventApi";
import { useWebSocket } from "../../shared/hooks/useWebSocket";

export function useActiveEvent() {
  const [event, setEvent] = useState<ActiveEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const e = await getActiveEvent();
    setEvent(e);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh instantané sur event WS
  useWebSocket((msg) => {
    if (msg.type === "event" || msg.type === "mystery_challenge") load();
  });

  // Compte à rebours auto : retire l'event quand il expire
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!event) return;
    const msLeft = new Date(event.endsAt).getTime() - Date.now();
    if (msLeft <= 0) { setEvent(null); return; }
    timerRef.current = setTimeout(() => { setEvent(null); load(); }, msLeft + 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [event, load]);

  return { event, loading, refresh: load };
}

