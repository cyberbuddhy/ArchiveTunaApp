import { describe, it, expect } from "vitest";
import { encodeMixtape, decodeMixtape, encodeTracks } from "./share";
import { Track } from "../types";

const t = (over: Partial<Track> = {}): Track => ({
  id: "a", title: "T", artist: "A", album: "Al", albumId: "some-id",
  trackNumber: 1, duration: 61, streamUrl: "https://archive.org/download/some-id/file.mp3",
  filename: "file.mp3", ...over,
});

describe("mixtape envelope", () => {
  it("round-trips name + tracks through gzip", async () => {
    const tracks = [t({ title: "One" }), t({ title: "Two" })];
    const s = await encodeMixtape("Road Trip", tracks);
    const back = await decodeMixtape(s);
    expect(back?.name).toBe("Road Trip");
    expect(back?.tracks).toHaveLength(2);
    expect(back?.tracks[0].streamUrl).toContain("archive.org/download/some-id/file.mp3");
  });
  it("is shorter than the legacy format", async () => {
    const tracks = [t(), t({ title: "Two" }), t({ title: "Three" })];
    const fresh = await encodeMixtape("Mix", tracks);
    const legacy = encodeTracks(tracks);
    expect(fresh.length).toBeLessThan(legacy.length);
  });
  it("still reads legacy links", async () => {
    const back = await decodeMixtape(encodeTracks([t({ title: "Old" })]));
    expect(back?.tracks[0].title).toBe("Old");
  });
});
