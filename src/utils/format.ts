/** Shared mm:ss duration formatter. `fallback` differs by context ("0:00" for player, "--:--" for lists). */
export function formatTime(secs: number, fallback = "0:00"): string {
  if (!secs || isNaN(secs)) return fallback;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
