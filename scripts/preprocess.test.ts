import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildWildcardMap,
  buildGraphForLength,
  filterPuzzleWords,
  filterValidWords,
  isValidWord,
  runPreprocess,
  type LadderGraph,
} from "./preprocess";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("isValidWord / filterValidWords", () => {
  const ctx = {
    length: 4 as const,
    whitelist: new Set<string>(["tvok"]),
  };

  it("filters invalid characters but keeps real blacklisted words valid", () => {
    expect(isValidWord("cold", ctx)).toBe(true);
    expect(isValidWord("arse", ctx)).toBe(true);
    expect(isValidWord("co*d", ctx)).toBe(false);
    expect(isValidWord("abc", ctx)).toBe(false);
  });

  it("keeps all valid words and appends whitelist entries", () => {
    const raw = ["cold", "arse", "co*d", "warm"];
    expect(filterValidWords(raw, ctx)).toEqual(["cold", "arse", "warm", "tvok"]);
  });
});

describe("filterPuzzleWords", () => {
  const ctx = {
    length: 4 as const,
    blacklist: new Set<string>(["test"]),
    whitelist: new Set<string>(["rare"]),
    allowedWords: new Set<string>(["cold", "cord", "rare", "test"]),
  };

  it("keeps allowed puzzle words, removes blacklisted entries, and restores whitelisted words", () => {
    const raw = ["cold", "cord", "rare", "test", "tiny"];
    const filtered = filterPuzzleWords(raw, ctx);
    expect(filtered.sort()).toEqual(["cold", "cord", "rare"].sort());
  });

  it("ignores invalid words and words outside the allowed dictionary", () => {
    const raw = ["te5t", "tests", "rare", "else"];
    expect(filterPuzzleWords(raw, ctx)).toEqual(["rare"]);
  });
});

describe("buildWildcardMap", () => {
  it("groups indices by wildcard pattern", () => {
    const words = ["cold", "cord", "card"];
    const wild = buildWildcardMap(words);

    const pattern = "co*d";
    const indices = wild.get(pattern) ?? [];
    expect(indices.sort()).toEqual([0, 1]);

    const pattern2 = "c*rd";
    const indices2 = wild.get(pattern2) ?? [];
    expect(indices2.sort()).toEqual([1, 2]);
  });
});

describe("buildGraphForLength", () => {
  it("creates neighbors grouped by changed position", () => {
    const words = ["cold", "cord", "card", "ward"];
    const graph: LadderGraph = buildGraphForLength(words);

    const idxCold = 0;
    const idxCord = 1;
    const idxCard = 2;
    const idxWard = 3;

    expect(graph.neighbors[idxCold][2]).toContain(idxCord);
    expect(graph.neighbors[idxCord][2]).toContain(idxCold);

    expect(graph.neighbors[idxCord][1]).toContain(idxCard);
    expect(graph.neighbors[idxCard][1]).toContain(idxCord);

    expect(graph.neighbors[idxCard][0]).toContain(idxWard);
    expect(graph.neighbors[idxWard][0]).toContain(idxCard);

    for (let i = 0; i < words.length; i++) {
      for (let pos = 0; pos < words[0].length; pos++) {
        expect(graph.neighbors[i][pos]).not.toContain(i);
      }
    }
  });
});

describe("runPreprocess", () => {
  it("writes consolidated runtime assets from dictionary and puzzle-word sources", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "wordlink-preprocess-"));
    tempDirs.push(root);

    const dataDir = path.join(root, "data");
    const publicDir = path.join(root, "public-data");

    fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(
      path.join(dataDir, "dictionary_3.txt"),
      ["bad", "dad", "dab", "sex", "tit"].join("\n") + "\n",
    );
    fs.writeFileSync(
      path.join(dataDir, "puzzle_words_3.txt"),
      ["bad", "dad", "dab", "sex", "tit", "zzz"].join("\n") + "\n",
    );
    fs.writeFileSync(
      path.join(dataDir, "blacklist_3.txt"),
      ["sex", "tit"].join("\n") + "\n",
    );
    fs.writeFileSync(path.join(dataDir, "whitelist_3.txt"), "bag\n");

    fs.writeFileSync(
      path.join(dataDir, "dictionary_4.txt"),
      ["cold", "cord", "sexy", "word"].join("\n") + "\n",
    );
    fs.writeFileSync(
      path.join(dataDir, "puzzle_words_4.txt"),
      ["cold", "cord", "sexy", "madeup"].join("\n") + "\n",
    );
    fs.writeFileSync(path.join(dataDir, "blacklist_4.txt"), "sexy\n");
    fs.writeFileSync(path.join(dataDir, "whitelist_4.txt"), "word\n");

    fs.writeFileSync(
      path.join(dataDir, "dictionary_5.txt"),
      ["stone", "shone", "phone", "phony"].join("\n") + "\n",
    );
    fs.writeFileSync(
      path.join(dataDir, "puzzle_words_5.txt"),
      ["stone", "shone", "phone", "phony", "zzzzz"].join("\n") + "\n",
    );
    fs.writeFileSync(path.join(dataDir, "blacklist_5.txt"), "phony\n");
    fs.writeFileSync(path.join(dataDir, "whitelist_5.txt"), "phone\n");

    await runPreprocess({
      step: "all",
      dataDir,
      publicDir,
    });

    const words3 = JSON.parse(
      fs.readFileSync(path.join(publicDir, "allowed_words_3.json"), "utf8"),
    ) as string[];
    const graph3 = JSON.parse(
      fs.readFileSync(path.join(publicDir, "puzzle_graph_3.json"), "utf8"),
    ) as LadderGraph;

    expect(words3).toEqual(expect.arrayContaining(["sex", "tit", "bag"]));
    expect(graph3.words).not.toContain("sex");
    expect(graph3.words).not.toContain("tit");
    expect(graph3.words).not.toContain("zzz");
    expect(graph3.words).toContain("bag");

    const words4 = JSON.parse(
      fs.readFileSync(path.join(publicDir, "allowed_words_4.json"), "utf8"),
    ) as string[];
    const graph4 = JSON.parse(
      fs.readFileSync(path.join(publicDir, "puzzle_graph_4.json"), "utf8"),
    ) as LadderGraph;

    expect(words4).toEqual(expect.arrayContaining(["sexy", "word"]));
    expect(graph4.words).not.toContain("sexy");
    expect(graph4.words).not.toContain("madeup");
    expect(graph4.words).toContain("word");

    const words5 = JSON.parse(
      fs.readFileSync(path.join(publicDir, "allowed_words_5.json"), "utf8"),
    ) as string[];
    const graph5 = JSON.parse(
      fs.readFileSync(path.join(publicDir, "puzzle_graph_5.json"), "utf8"),
    ) as LadderGraph;

    expect(words5).toEqual(expect.arrayContaining(["stone", "shone", "phone", "phony"]));
    expect(graph5.words).not.toContain("phony");
    expect(graph5.words).not.toContain("zzzzz");
    expect(graph5.words).toContain("phone");

    const publicFiles = fs.readdirSync(publicDir).sort();
    expect(publicFiles).toEqual([
      "allowed_words_3.json",
      "allowed_words_4.json",
      "allowed_words_5.json",
      "puzzle_graph_3.json",
      "puzzle_graph_4.json",
      "puzzle_graph_5.json",
    ]);
  });
});
