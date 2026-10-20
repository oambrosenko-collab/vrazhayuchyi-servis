"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** How often a beat goes to the server, per the PRD. */
const BEAT_MS = 5000;

type Options = {
  lessonId: string;
  durationSec: number;
  /** Server-side watched total at mount, so the bar starts where it was. */
  initialWatchedSec: number;
  initialCompleted: boolean;
};

export type ProgressState = {
  watchedSec: number;
  completed: boolean;
  /** Set when the lesson crosses 90% during this sitting, for the toast. */
  justCompleted: boolean;
  saving: boolean;
  error: string | null;
};

/**
 * Owns the beat, not the playback.
 *
 * The player tells it two things — where the needle is, and how many
 * seconds of real playback have elapsed since the last beat. Everything
 * else (the 90% rule, clamping, when a lesson counts) is decided by the
 * server, because the owner's report has to be honest and a client is not
 * a trustworthy witness about itself.
 *
 * This is also the seam for Bunny: a different player feeds the same two
 * numbers in and nothing here changes.
 */
export function useProgress({
  lessonId,
  durationSec,
  initialWatchedSec,
  initialCompleted,
}: Options) {
  const [state, setState] = useState<ProgressState>({
    watchedSec: initialWatchedSec,
    completed: initialCompleted,
    justCompleted: false,
    saving: false,
    error: null,
  });

  // Seconds of playback accrued since the last successful beat, and the
  // latest needle position. Refs, not state: they change every tick and
  // must not re-render the page sixty times a minute.
  const pendingRef = useRef(0);
  const positionRef = useRef(0);
  const inFlightRef = useRef(false);
  const completedRef = useRef(initialCompleted);

  const supabase = useRef(createClient()).current;

  /** Called by the player on every tick of real playback. */
  const report = useCallback((positionSec: number, deltaSec: number) => {
    positionRef.current = positionSec;
    pendingRef.current += deltaSec;
  }, []);

  const flush = useCallback(async () => {
    // Nothing watched since the last beat — a paused player must not keep
    // writing rows, and must never accrue watch time.
    if (pendingRef.current <= 0 || inFlightRef.current) return;

    const delta = Math.round(pendingRef.current);
    const position = Math.round(positionRef.current);
    pendingRef.current = 0;
    inFlightRef.current = true;
    setState((s) => ({ ...s, saving: true }));

    const { data, error } = await supabase.rpc("save_lesson_progress", {
      p_lesson_id: lessonId,
      p_position_sec: position,
      p_delta_sec: delta,
    });

    inFlightRef.current = false;
    const row = data?.[0];

    if (error || !row?.out_ok) {
      // Put the seconds back so a dropped beat is not lost watch time.
      pendingRef.current += delta;
      setState((s) => ({
        ...s,
        saving: false,
        error:
          row?.out_reason === "no_access"
            ? "Доступ до курсу закінчився. Звернись до управляючого."
            : "Прогрес не зберігся. Перевір звʼязок.",
      }));
      return;
    }

    const crossed = row.out_completed && !completedRef.current;
    completedRef.current = row.out_completed;

    setState((s) => ({
      watchedSec: row.out_watched_sec,
      completed: row.out_completed,
      justCompleted: s.justCompleted || crossed,
      saving: false,
      error: null,
    }));
  }, [lessonId, supabase]);

  useEffect(() => {
    const id = setInterval(flush, BEAT_MS);

    // Leaving the page is the most likely moment to lose a beat, so take
    // the chance to write whatever has accrued.
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  const percent = Math.min(
    100,
    Math.round((state.watchedSec / Math.max(durationSec, 1)) * 100),
  );

  return { ...state, percent, report, flush };
}
