import { describe, it, expect } from "vitest";
import { splitTitleSpec } from "./format";

describe("splitTitleSpec", () => {
  it("splits trailing audio specs", () => {
    expect(splitTitleSpec("Lonerism (24-Bit FLAC 96.0kHz)")).toEqual({
      title: "Lonerism",
      spec: "24-Bit FLAC 96.0kHz",
    });
    expect(splitTitleSpec("Show (VBR MP3)")).toEqual({
      title: "Show",
      spec: "VBR MP3",
    });
  });

  it("leaves meaningful suffixes alone", () => {
    expect(splitTitleSpec("Abbey Road (Remaster)")).toEqual({
      title: "Abbey Road (Remaster)",
      spec: null,
    });
    expect(splitTitleSpec("Unknown (Live)")).toEqual({
      title: "Unknown (Live)",
      spec: null,
    });
    expect(splitTitleSpec("No Suffix")).toEqual({ title: "No Suffix", spec: null });
  });
});
