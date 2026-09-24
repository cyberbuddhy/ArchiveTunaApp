import { describe, it, expect } from "vitest";
import { searchTerms, buildTextQueryClause, computeRelevanceScore, isSearchWorthy } from "./api";

describe("searchTerms", () => {
  it("tokenizes multi-word queries and drops stopwords", () => {
    expect(searchTerms("Tame Impala kexp")).toEqual(["tame", "impala", "kexp"]);
  });

  it("keeps everything when all words are stopwords", () => {
    expect(searchTerms("The The")).toEqual(["the"]);
  });

  it("collapses punctuation and dedupes", () => {
    expect(searchTerms("R.E.M.  R.E.M.")).toEqual(["rem"]);
  });

  it("drops single characters", () => {
    expect(searchTerms("a X Jimi")).toEqual(["jimi"]);
  });
});

describe("buildTextQueryClause", () => {
  it("keeps single-term queries as exact phrases", () => {
    expect(buildTextQueryClause("madonna", "all")).toBe(
      '(creator:("madonna")^8 OR title:("madonna")^4 OR subject:("madonna")^2 OR collection:("madonna")^2 OR ("madonna"))'
    );
  });

  it("ANDs per-term groups across fields for multi-term queries", () => {
    const clause = buildTextQueryClause("Tame Impala kexp", "all");
    expect(clause).toContain("creator:tame OR title:tame OR subject:tame OR collection:tame OR identifier:tame*");
    expect(clause).toContain("creator:kexp OR title:kexp OR subject:kexp OR collection:kexp OR identifier:kexp*");
    expect(clause).toContain(") AND (");
    // exact-phrase boost retained for precision
    expect(clause).toContain('creator:("Tame Impala kexp")^8');
  });

  it("tokenizes field-targeted queries", () => {
    expect(buildTextQueryClause("Smashing Pumpkins", "artist")).toBe(
      '(creator:("Smashing Pumpkins")^10 OR ((creator:smashing OR title:smashing OR subject:smashing) AND (creator:pumpkins OR title:pumpkins OR subject:pumpkins)))'
    );
    expect(buildTextQueryClause("Nevermind", "title")).toBe('title:("Nevermind")');
  });

  it("keeps the KEXP session findable even under the artist field", () => {
    const clause = buildTextQueryClause("Tame Impala kexp", "artist");
    expect(clause).toContain("(creator:tame OR title:tame OR subject:tame)");
    expect(clause).toContain("(creator:kexp OR title:kexp OR subject:kexp)");
    expect(clause).toContain('creator:("Tame Impala kexp")^10');
  });
});

describe("computeRelevanceScore", () => {
  it("ranks the KEXP session above unrelated items for multi-term queries", () => {
    const q = "Tame Impala kexp";
    const session = computeRelevanceScore(
      {
        artist: "KEXP",
        title: "Tame Impala Live at KEXP Studios on 2011-04-22",
        downloads: 10,
        collection: "kexp",
        identifier: "TameImpala2011-04-22",
        year: "2011",
      },
      q
    );
    const unrelated = computeRelevanceScore(
      { artist: "Grateful Dead", title: "Cornell 5/8/77", downloads: 999999 },
      q
    );
    expect(session).toBeGreaterThan(unrelated);
  });

  it("orders exact artist > title-contained > weak subject-only matches", () => {
    const q = "tame impala";
    const exact = computeRelevanceScore(
      { artist: "Tame Impala", title: "Innerspeaker", downloads: 5 },
      q
    );
    const titleHit = computeRelevanceScore(
      { artist: "KEXP", title: "Tame Impala Live Session", downloads: 5 },
      q
    );
    const weak = computeRelevanceScore(
      { artist: "Someone Else", title: "Random Show", genre: "tame impala tribute night", downloads: 5 },
      q
    );
    expect(exact).toBeGreaterThan(titleHit);
    expect(titleHit).toBeGreaterThan(weak);
  });

  it("pins the recording year when the query carries year digits", () => {
    const q = "tame impala 2011";
    const y2011 = computeRelevanceScore(
      { artist: "KEXP", title: "Tame Impala Live", year: "2011", downloads: 5 },
      q
    );
    const y2015 = computeRelevanceScore(
      { artist: "KEXP", title: "Tame Impala Live", year: "2015", downloads: 5 },
      q
    );
    expect(y2011).toBeGreaterThan(y2015);
  });

  it("rewards identifier slugs holding every term", () => {
    const q = "tame impala kexp";
    const slugged = computeRelevanceScore(
      { artist: "KEXP", title: "Live Session", identifier: "tame-impala-live-on-kexp-2011", downloads: 5 },
      q
    );
    const plain = computeRelevanceScore(
      { artist: "KEXP", title: "Live Session", identifier: "kexp-show-999", downloads: 5 },
      q
    );
    expect(slugged).toBeGreaterThan(plain);
  });
});

describe("isSearchWorthy", () => {
  it("drops metadata-less blobs and keeps real items", () => {
    expect(isSearchWorthy({ identifier: "x" })).toBe(false);
    expect(isSearchWorthy({ identifier: "x", title: "Something" })).toBe(true);
    expect(isSearchWorthy({ identifier: "x", creator: "Someone" })).toBe(true);
    expect(isSearchWorthy(null)).toBe(false);
  });
});
