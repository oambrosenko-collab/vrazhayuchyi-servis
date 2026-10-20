"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/course";

export type PlayerProps = {
  durationSec: number;
  /** Where to drop the needle, from the server. */
  initialPositionSec: number;
  /**
   * Fires once a second while playing. `deltaSec` is real elapsed playback,
   * never the jump a seek makes — that distinction is the whole reason the
   * completion number can be trusted.
   */
  onTick: (positionSec: number, deltaSec: number) => void;
  /**
   * Once the lesson counts, moving on is the action worth highlighting and
   * this button steps back to neutral. One accent per screen, always.
   */
  credited?: boolean;
};

const TICK_MS = 1000;

/**
 * Stand-in for the Bunny Stream player.
 *
 * Nothing is filmed yet, and waiting for a video to build the screen around
 * it would stall everything that actually has logic in it: resuming,
 * accruing watch time, the 90% rule, what "next lesson" means. So this
 * drives the same clock a real player would, from a timer.
 *
 * It implements PlayerProps exactly. Swapping in Bunny means a component
 * that calls `onTick` from `timeupdate` and seeks to `initialPositionSec`
 * on load — no change above this line.
 */
export function StubPlayer({
  durationSec,
  initialPositionSec,
  onTick,
  credited = false,
}: PlayerProps) {
  const start = Math.min(initialPositionSec, durationSec);
  const [position, setPosition] = useState(start);
  // Mirror of the position for the ticking effect. A state updater must
  // stay pure — React invokes it twice in development precisely to catch
  // side effects hidden inside it, which would double-count watch time.
  const positionRef = useRef(start);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(initialPositionSec >= durationSec);

  // Held in a ref so the ticking effect never restarts when the parent
  // re-renders and hands over a fresh callback. Assigned in an effect,
  // not during render, which would be a side effect in a render pass.
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!playing) return;

    const id = setInterval(() => {
      const next = Math.min(positionRef.current + 1, durationSec);
      positionRef.current = next;
      setPosition(next);
      // One second of playback happened; a seek reports no delta at all.
      onTickRef.current(next, 1);
      if (next >= durationSec) {
        setPlaying(false);
        setEnded(true);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [playing, durationSec]);

  const seek = useCallback(
    (to: number) => {
      const clamped = Math.min(Math.max(to, 0), durationSec);
      positionRef.current = clamped;
      setPosition(clamped);
      setEnded(clamped >= durationSec);
      // Delta of zero: moving the needle is not watching.
      onTickRef.current(clamped, 0);
    },
    [durationSec],
  );

  const percent = (position / durationSec) * 100;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-deep)]">
      {/* 16:9 stage */}
      <div className="relative aspect-video w-full bg-[#15181F]">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[var(--space-3)] px-[var(--space-4)] text-center">
          <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">
            Відео ще не залите
          </span>
          <p className="max-w-[22rem] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Це заглушка плеєра. Таймер іде по-справжньому, прогрес
            зберігається, урок зараховується на 90% — усе як буде з реальним
            відео.
          </p>
          <div
            aria-hidden
            className="mt-[var(--space-2)] font-[family-name:var(--font-mono)] text-[length:var(--text-display)] text-[var(--color-text)]"
          >
            {formatDuration(position)}
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-col gap-[var(--space-3)] p-[var(--space-4)]">
        <input
          type="range"
          min={0}
          max={durationSec}
          step={1}
          value={position}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Позиція у відео"
          className="h-[var(--tap-min)] w-full cursor-pointer accent-[var(--color-text-secondary)]"
          style={{ minHeight: "var(--tap-min)" }}
        />

        <div className="flex items-center gap-[var(--space-4)]">
          <button
            type="button"
            onClick={() => {
              if (ended) seek(0);
              setPlaying((p) => !p);
            }}
            aria-label={playing ? "Пауза" : "Відтворити"}
            className={
              "flex h-[var(--tap-min)] min-w-[7rem] items-center justify-center rounded-[var(--radius-full)] px-[var(--space-6)] font-[var(--weight-semibold)] transition-colors duration-[var(--duration-fast)] " +
              (credited
                ? "border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                : "bg-[var(--color-accent)] text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)]")
            }
          >
            {playing ? "Пауза" : ended ? "Спочатку" : "Дивитись"}
          </button>

          <span className="font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            {formatDuration(position)} / {formatDuration(durationSec)}
          </span>
        </div>

        {/* Thin seen-so-far bar under the controls, deliberately neutral:
            the accent on this screen belongs to the play button. */}
        <div className="h-[3px] w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface-raised)]">
          <div
            className="h-full bg-[var(--color-text-muted)] transition-[width] duration-[var(--duration-base)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
