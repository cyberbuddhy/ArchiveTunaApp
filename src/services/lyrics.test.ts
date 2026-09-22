import { describe, it, expect } from "vitest";
import { currentLyricIndex, parseLRC } from "./lyrics";

describe("parseLRC", () => {
  it("parses mm:ss.xx lines and sorts by time", () => {
    const lines = parseLRC("[01:00.45] Second\n[00:19.16] First\n[bad line]\n[02:03] Third\n");
    expect(lines.map((l) => l.line)).toEqual(["First", "Second", "Third"]);
    expect(lines[0].t).toBeCloseTo(19.16);
    expect(lines[1].t).toBeCloseTo(60.45);
    expect(lines[2].t).toBe(123);
  });

  it("drops empty lines and garbage", () => {
    expect(parseLRC("[00:10.00]   \nnope\n[00:20.00] Hi")).toHaveLength(1);
    expect(parseLRC("")).toEqual([]);
  });
});

describe("currentLyricIndex", () => {
  const lines = [
    { t: 10, line: "a" },
    { t: 20, line: "b" },
    { t: 30, line: "c" },
  ];
  it("finds the active line", () => {
    expect(currentLyricIndex(lines, 0)).toBe(-1);
    expect(currentLyricIndex(lines, 10)).toBe(0);
    expect(currentLyricIndex(lines, 25)).toBe(1);
    expect(currentLyricIndex(lines, 99)).toBe(2);
  });
});
