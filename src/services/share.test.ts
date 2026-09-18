import { describe, it, expect } from "vitest";
import { encodeTracks, decodeTracks } from "./share";
import { Track } from "../types";

const t = (over: Partial<Track> = {}): Track => ({
  id: "a", title: "T", artist: "A", album: "Al", albumId: "al",
  trackNumber: 1, duration: 60, streamUrl: "https://archive.org/download/al/f.mp3",
  ...over,
});

describe("share", () => {
  it("round-trips tracks through encode/decode", () => {
    const tracks = [t({ id: "1", title: "One" }), t({ id: "2", title: "Two", duration: 0 })];
    const back = decodeTracks(encodeTracks(tracks));
    expect(back).toHaveLength(2);
    expect(back[0].title).toBe("One");
    expect(back[1].streamUrl).toContain("archive.org");
  });
  it("returns [] on garbage input", () => {
    expect(decodeTracks("!!!not-base64!!!")).toEqual([]);
  });
});
