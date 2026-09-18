import { describe, it, expect } from "vitest";
import { negotiateTracks } from "./ingest";
import { Track } from "../types";

const t = (filename: string, n = 1): Track => ({
  id: filename, title: filename, artist: "A", album: "Al", albumId: "al",
  trackNumber: n, duration: 60, streamUrl: `https://x/${filename}`, filename,
});

describe("negotiateTracks", () => {
  const dupes = [t("song.mp3"), t("song.flac"), t("other.mp3")];
  it("prefers flac when asked", () => {
    const out = negotiateTracks(dupes, "flac");
    expect(out.find((x) => x.filename?.startsWith("song"))?.filename).toBe("song.flac");
  });
  it("prefers mp3 when asked", () => {
    const out = negotiateTracks(dupes, "mp3");
    expect(out.find((x) => x.filename?.startsWith("song"))?.filename).toBe("song.mp3");
  });
  it("auto keeps everything", () => {
    expect(negotiateTracks(dupes, "auto")).toHaveLength(3);
  });
});
