import { describe, it, expect } from "vitest";
import { categorizeReleaseGroups } from "./api";

// Daft Punk-shaped fixtures: studio albums carry primary-type Album with NO
// secondary types — they must land in officialAlbums, never vanish.
const rg = (title: string, primary: string, secondary: string[] = [], date = "") => ({
  id: `rg-${title}`,
  title,
  "primary-type": primary,
  "secondary-types": secondary,
  "first-release-date": date,
});

describe("categorizeReleaseGroups", () => {
  it("buckets Daft Punk studio albums, EPs and singles", () => {
    const out = categorizeReleaseGroups([
      rg("Homework", "Album", [], "1997-01-20"),
      rg("Discovery", "Album", [], "2001-02-26"),
      rg("Human After All", "Album", [], "2005-03-01"),
      rg("Random Access Memories", "Album", [], "2013-05-17"),
      rg("Alive 2007", "Album", ["Live"], "2007-11-14"),
      rg("Daft Club", "Album", ["Remix"], "2003-11-27"),
      rg("Musique Vol. 1 1993–2005", "Album", ["Compilation"], "2006-03-06"),
      rg("TRON: Legacy", "Album", ["Soundtrack"], "2010-12-03"),
      rg("One More Time", "Single", [], "2000-11-13"),
      rg("The Remixes, Volume 3", "EP", [], "2004-01-01"),
      rg("Bootleg Live Mix", "Album", ["Bootleg"], "2009-01-01"),
      rg("Generic Radio Interview", "Album", ["Interview"], "2001-01-01"),
    ]);

    const albumTitles = out.officialAlbums.map((a) => a.title);
    expect(albumTitles).toEqual(
      expect.arrayContaining(["Homework", "Discovery", "Human After All", "Random Access Memories"])
    );
    expect(albumTitles).not.toContain("Alive 2007");
    expect(out.officialEPs.map((e) => e.title)).toContain("The Remixes, Volume 3");
    expect(out.officialSingles.map((s) => s.title)).toContain("One More Time");
    expect(out.officialLiveReleases.map((l) => l.title)).toContain("Alive 2007");
    expect(out.officialOther.map((o) => o.title)).toEqual(
      expect.arrayContaining(["Daft Club", "Musique Vol. 1 1993–2005", "TRON: Legacy"])
    );
    const all = [
      ...out.officialAlbums,
      ...out.officialEPs,
      ...out.officialSingles,
      ...out.officialOther,
      ...out.officialLiveReleases,
    ].map((r) => r.title);
    expect(all).not.toContain("Bootleg Live Mix");
    expect(all).not.toContain("Generic Radio Interview");
  });

  it("sorts newest first and builds cover URLs", () => {
    const out = categorizeReleaseGroups([
      rg("Homework", "Album", [], "1997-01-20"),
      rg("Random Access Memories", "Album", [], "2013-05-17"),
    ]);
    expect(out.officialAlbums[0].title).toBe("Random Access Memories");
    expect(out.officialAlbums[0].coverUrl).toContain("coverartarchive.org");
    expect(out.officialAlbums[0].year).toBe("2013");
  });
});
