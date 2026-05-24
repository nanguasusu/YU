import { useState, useEffect } from 'react';
import type { TimerStatus } from '../types';

/**
 * Returns the live elapsed time in milliseconds.
 *
 * - When `timerStatus === 'running'`, starts a 1-second interval to update
 *   an internal `liveNow` timestamp, producing a real-time elapsed value.
 * - When `timerStatus !== 'running'`, returns `elapsedMs` directly without
 *   starting any interval.
 * - Cleans up the interval on unmount or when `timerStatus` changes away
 *   from `'running'`, preventing memory leaks.
 * - Syncs `liveNow` whenever `timerStatus`, `elapsedMs`, or `lastStartedAt`
 *   changes, ensuring the displayed value is always up to date.
 */
export function useLiveElapsedMs(
  timerStatus: TimerStatus,
  elapsedMs: number,
  lastStartedAt: number | null,
): number {
  const [liveNow, setLiveNow] = useState(() => Date.now());

  // Start interval only while running; clean up when status changes or on unmount
  useEffect(() => {
    if (timerStatus !== 'running') return;
    const id = window.setInterval(() => setLiveNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timerStatus]);

  // Sync liveNow immediately whenever any relevant input changes
  useEffect(() => {
    setLiveNow(Date.now());
  }, [timerStatus, elapsedMs, lastStartedAt]);

  if (timerStatus !== 'running' || lastStartedAt === null) {
    return elapsedMs;
  }
  return elapsedMs + Math.max(0, liveNow - lastStartedAt);
}
