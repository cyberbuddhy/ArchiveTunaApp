import { describe, it, expect } from "vitest";
import { suggestCorrection } from "./popularArtists";

describe("suggestCorrection", () => {
  it("suggests the right artist on a typo", () => {
    expect(suggestCorrection("Grateful Ded")).toBe("Grateful Dead");
  });
  it("returns null on exact match or short query", () => {
    expect(suggestCorrection("Grateful Dead")).toBeNull();
    expect(suggestCorrection("ab")).toBeNull();
  });
  it("returns null on unrelated queries", () => {
    expect(suggestCorrection("xqzt blender")).toBeNull();
  });
});
