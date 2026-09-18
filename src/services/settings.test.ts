import { describe, it, expect } from "vitest";
import { computeRelevanceScore } from "./api";
import { getStoredPlayerSettings, DEFAULT_PLAYER_SETTINGS } from "./playerSettings";

describe("computeRelevanceScore", () => {
  it("ranks exact artist matches highest", () => {
    const exact = computeRelevanceScore({ artist: "Grateful Dead", title: "x", downloads: 0 }, "grateful dead");
    const partial = computeRelevanceScore({ artist: "Some Dead Cover Band", title: "x", downloads: 0 }, "grateful dead");
    expect(exact).toBeGreaterThan(partial);
  });
  it("returns 0 on empty query", () => {
    expect(computeRelevanceScore({ artist: "A" }, "")).toBe(0);
  });
});

describe("playerSettings", () => {
  it("falls back to defaults without localStorage", () => {
    const s = getStoredPlayerSettings();
    expect(s.crossfadeSeconds).toBe(DEFAULT_PLAYER_SETTINGS.crossfadeSeconds);
    expect(s.eq).toHaveLength(10);
    expect(s.eqProfiles?.length).toBeGreaterThanOrEqual(1);
  });
});
