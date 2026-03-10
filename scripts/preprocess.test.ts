import { describe, it, expect } from "vitest";
import {
  buildWildcardMap,
  buildGraphForLength,
  filterCommonWords,
  filterValidWords,
  isCommonWord,
  isValidWord,
  type LadderGraph,
} from "./preprocess";

// Minimal fake FrequencyMap type matching your implementation
type FrequencyMap = Map<string, number>;

describe("isValidWord / filterValidWords", () => {
  const ctx = {
    length: 4 as const,
    blacklist: new Set<string>(["arse"]),
    whitelist: new Set<string>(["tvok", "arse"]),
  };

  it("filters invalid characters and blacklisted words", () => {
    expect(isValidWord("cold", ctx)).toBe(true);
    expect(isValidWord("arse", ctx)).toBe(false);
    expect(isValidWord("co*d", ctx)).toBe(false);
    expect(isValidWord("abc", ctx)).toBe(false);
  });

  it("keeps all non-blacklisted valid words", () => {
    const raw = ["cold", "arse", "co*d", "warm"];
    expect(filterValidWords(raw, ctx)).toEqual(["cold", "warm", "tvok"]);
  });
});

describe("isCommonWord / filterCommonWords", () => {
  const freqMap: FrequencyMap = new Map<string, number>([
    ["cold", 10000],
    ["cord", 9000],
    ["rare", 1],
  ]);

  const ctx = {
    length: 4 as const,
    blacklist: new Set<string>(["test"]),
    whitelist: new Set<string>(["rare"]),
    freqMap,
    minCount: 5000,
  };

  it("respects blacklist and whitelist and frequency threshold", () => {
    expect(isCommonWord("cold", ctx)).toBe(true); // above threshold
    expect(isCommonWord("cord", ctx)).toBe(true); // above threshold
    expect(isCommonWord("test", ctx)).toBe(false); // blacklisted
    expect(isCommonWord("rare", ctx)).toBe(true); // whitelisted despite low freq
    expect(isCommonWord("tiny", ctx)).toBe(false); // not in freq map
  });

  it("filters a list correctly", () => {
    const raw = ["cold", "cord", "rare", "test", "tiny"];
    const filtered = filterCommonWords(raw, ctx);
    expect(filtered.sort()).toEqual(["cold", "cord", "rare"].sort());
  });

  it("only promotes words that are also valid", () => {
    expect(isCommonWord("te5t", ctx)).toBe(false);
    expect(isCommonWord("tests", ctx)).toBe(false);
  });
});

describe("buildWildcardMap", () => {
  it("groups indices by wildcard pattern", () => {
    const words = ["cold", "cord", "card"];
    const wild = buildWildcardMap(words);

    // cold (0) and cord (1) differ at index 2: c o l d / c o r d -> co*d
    const pattern = "co*d";
    const indices = wild.get(pattern) ?? [];
    expect(indices.sort()).toEqual([0, 1]);

    // cord (1) and card (2) differ at index 1: c o r d / c a r d -> c*rd
    const pattern2 = "c*rd";
    const indices2 = wild.get(pattern2) ?? [];
    expect(indices2.sort()).toEqual([1, 2]);
  });
});

describe("buildGraphForLength", () => {
  it("creates neighbors grouped by changed position", () => {
    const words = ["cold", "cord", "card", "ward"];
    const graph: LadderGraph = buildGraphForLength(words);

    // Index mapping: 0:cold, 1:cord, 2:card, 3:ward
    const idxCold = 0;
    const idxCord = 1;
    const idxCard = 2;
    const idxWard = 3;

    // cold vs cord differ at index 2: c o l d / c o r d
    // so neighbors[0][2] should contain 1 and neighbors[1][2] should contain 0
    expect(graph.neighbors[idxCold][2]).toContain(idxCord);
    expect(graph.neighbors[idxCord][2]).toContain(idxCold);

    // cord vs card differ at index 1: c o r d / c a r d
    expect(graph.neighbors[idxCord][1]).toContain(idxCard);
    expect(graph.neighbors[idxCard][1]).toContain(idxCord);

    // card vs ward differ at index 0: c a r d / w a r d
    expect(graph.neighbors[idxCard][0]).toContain(idxWard);
    expect(graph.neighbors[idxWard][0]).toContain(idxCard);

    // sanity: no self-neighbors
    for (let i = 0; i < words.length; i++) {
      for (let pos = 0; pos < words[0].length; pos++) {
        expect(graph.neighbors[i][pos]).not.toContain(i);
      }
    }
  });
});
