import { describe, it, expect } from "vitest";
import { compareAppVersions, checkForAppUpdate } from "./appUpdate";

describe("compareAppVersions", () => {
  it("orders beta tags numerically, not lexicographically", () => {
    expect(compareAppVersions("v0.2.0-beta.7", "0.2.0-beta.6")).toBe(1);
    expect(compareAppVersions("v0.2.0-beta.10", "v0.2.0-beta.7")).toBe(1);
    expect(compareAppVersions("v0.2.0-beta.6", "v0.2.0-beta.6")).toBe(0);
    expect(compareAppVersions("v0.2.0-beta.6", "v0.2.0-beta.7")).toBe(-1);
  });

  it("ranks stable above prerelease on the same core", () => {
    expect(compareAppVersions("v0.2.0", "v0.2.0-beta.9")).toBe(1);
    expect(compareAppVersions("v0.2.0-beta.9", "v0.2.0")).toBe(-1);
  });

  it("compares core versions across lengths", () => {
    expect(compareAppVersions("v0.3.0", "v0.2.9")).toBe(1);
    expect(compareAppVersions("v1.0", "v0.9.9")).toBe(1);
  });
});

describe("checkForAppUpdate", () => {
  it("stays inert without a native runtime", async () => {
    await expect(checkForAppUpdate()).resolves.toBeNull();
  });
});
