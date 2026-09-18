import { describe, it, expect } from "vitest";
import {
  formatFromName,
  isAudioFileName,
  makeTrackId,
  parseFilename,
} from "./localLibrary";

describe("localLibrary pure helpers", () => {
  it("detects audio files by extension (case-insensitive)", () => {
    expect(isAudioFileName("song.mp3")).toBe(true);
    expect(isAudioFileName("SONG.FLAC")).toBe(true);
    expect(isAudioFileName("take.ogg")).toBe(true);
    expect(isAudioFileName("cover.jpg")).toBe(false);
    expect(isAudioFileName("noext")).toBe(false);
    expect(isAudioFileName("notes.txt")).toBe(false);
  });

  it("normalizes format labels", () => {
    expect(formatFromName("a.mp3")).toBe("MP3");
    expect(formatFromName("a.flac")).toBe("FLAC");
    expect(formatFromName("a.oga")).toBe("OGG");
    expect(formatFromName("a.mp4")).toBe("M4A");
  });

  it("parses Artist - Title filenames", () => {
    expect(parseFilename("Miles Davis - So What.mp3")).toEqual({
      artist: "Miles Davis",
      title: "So What",
    });
    expect(parseFilename("03 - Blue in Green.flac")).toEqual({
      artist: "Unknown Artist",
      title: "Blue in Green",
    });
    expect(parseFilename("04_Title_Here.ogg")).toEqual({
      artist: "Unknown Artist",
      title: "Title_Here",
    });
  });

  it("makes stable ids per file version", () => {
    const a = makeTrackId("disc/song.mp3", 1000, 111);
    const b = makeTrackId("disc/song.mp3", 1000, 111);
    const c = makeTrackId("disc/song.mp3", 1001, 111);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith("local_")).toBe(true);
  });
});
