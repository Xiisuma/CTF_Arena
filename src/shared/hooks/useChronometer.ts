
import { useCallback, useEffect, useRef, useState } from "react";

export function useChronometer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (running) return;
    startRef.current = Date.now();
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed(
        accumulatedRef.current + Date.now() - (startRef.current ?? Date.now())
      );
    }, 100);
  }, [running]);

  const pause = useCallback(() => {
    if (!running) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    accumulatedRef.current += Date.now() - (startRef.current ?? Date.now());
    setElapsed(accumulatedRef.current);
    setRunning(false);
  }, [running]);

  const stop = useCallback((): number => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const total = running
      ? accumulatedRef.current + Date.now() - (startRef.current ?? Date.now())
      : accumulatedRef.current;
    accumulatedRef.current = 0;
    startRef.current = null;
    setElapsed(0);
    setRunning(false);
    return total;
  }, [running]);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    []
  );

  return { elapsed, running, start, pause, stop };
}

