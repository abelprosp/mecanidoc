"use client";

import { useEffect, useRef, useCallback } from 'react';

type Options = {
  /** Intervalo inicial (ms). */
  baseMs: number;
  /** Intervalo máximo após períodos sem novidades (ms). */
  maxMs?: number;
  /** Ativo? Quando falso, não faz polling. */
  enabled?: boolean;
};

/**
 * Polling adaptativo: o intervalo cresce (x1.5) enquanto o callback devolve `false`
 * (sem novidades) até `maxMs`, volta a `baseMs` quando há novidades ou quando se chama
 * `bump()`. Pausa quando a aba está oculta e recomeça imediatamente quando volta a
 * ficar visível. Reduz drasticamente os pedidos face a um `setInterval` fixo.
 */
export function usePolling(tick: () => Promise<boolean | void>, { baseMs, maxMs = baseMs * 8, enabled = true }: Options) {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const delayRef = useRef(baseMs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const schedule = useCallback(
    (ms: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!enabledRef.current) return;
      timerRef.current = setTimeout(run, ms);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const run = useCallback(async () => {
    if (!enabledRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      // Volta a tentar quando a aba ficar visível (listener abaixo).
      return;
    }
    if (runningRef.current) {
      schedule(delayRef.current);
      return;
    }
    runningRef.current = true;
    let changed = false;
    try {
      changed = (await tickRef.current()) === true;
    } catch (e) {
      console.error('polling tick:', e);
    } finally {
      runningRef.current = false;
    }
    delayRef.current = changed ? baseMs : Math.min(maxMs, Math.round(delayRef.current * 1.5));
    schedule(delayRef.current);
  }, [baseMs, maxMs, schedule]);

  const bump = useCallback(() => {
    delayRef.current = baseMs;
    schedule(0);
  }, [baseMs, schedule]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    delayRef.current = baseMs;
    schedule(0);
    const onVisible = () => {
      if (document.visibilityState === 'visible') bump();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, baseMs, schedule, bump]);

  return { bump };
}
