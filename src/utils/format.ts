/** Shared mm:ss duration formatter. `fallback` differs by context ("0:00" for player, "--:--" for lists). */
export function formatTime(secs: number, fallback = "0:00"): string {
  if (!secs || isNaN(secs)) return fallback;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

const SPEC_TOKEN = "(?:\\b\\d+\\s*-\\s*bit\\b|\\b\\d+(?:\\.\\d+)?\\s*kHz\\b|\\b\\d+\\s*kbps\\b|FLAC|MP3|OGG|OPUS|WAV|M4A|VBR|CBR|DSF|APE)";
const SPEC_SUFFIX_RE = new RegExp(`\\s*\\(([^)]*${SPEC_TOKEN}[^)]*)\\)\\s*$`, "i");

/**
 * Split a trailing audio-spec parenthetical off an archive title.
 * "Lonerism (24-Bit FLAC 96.0kHz)" -> { title: "Lonerism", spec: "24-Bit FLAC 96.0kHz" }.
 * Non-spec suffixes ("(Remaster)", "(Live)") are left alone.
 */
export function splitTitleSpec(title: string): { title: string; spec: string | null } {
  const m = title.match(SPEC_SUFFIX_RE);
  if (!m || typeof m.index !== "number") return { title, spec: null };
  return {
    title: title.slice(0, m.index).trim() || title,
    spec: m[1].replace(/\s+/g, " ").trim(),
  };
}
