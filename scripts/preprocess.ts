#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type WordLength = 3 | 4 | 5;

// Graph representation:
// graph[wordIndex][pos] = array of neighbor word indices that differ at that pos
export type LadderGraph = {
  words: string[];
  neighbors: number[][][]; // neighbors[i][pos] = number[]
};

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public", "data");

// Adjust if/when you add more lengths
const WORD_LENGTHS: WordLength[] = [3, 4, 5];

interface PreprocessPaths {
  dataDir: string;
  publicDir: string;
}

const DEFAULT_PATHS: PreprocessPaths = {
  dataDir: DATA_DIR,
  publicDir: PUBLIC_DIR,
};

// ----------------------------------------------------------------------------
// Basic file utilities
// ----------------------------------------------------------------------------

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readWordListFile(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function writeJsonFile(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data), "utf8");
}

// ----------------------------------------------------------------------------
// Filters
// ----------------------------------------------------------------------------

interface PuzzleWordContext {
  length: WordLength;
  blacklist: Set<string>;
  whitelist: Set<string>;
  allowedWords: ReadonlySet<string>;
}

interface ValidWordContext {
  length: WordLength;
  whitelist?: ReadonlySet<string>;
}

export function isValidWord(word: string, ctx: ValidWordContext): boolean {
  if (word.length !== ctx.length) return false;
  if (!/^[a-z]+$/.test(word)) return false;

  return true;
}

export function filterValidWords(
  rawWords: string[],
  ctx: ValidWordContext,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const word of rawWords) {
    if (isValidWord(word, ctx) && !seen.has(word)) {
      seen.add(word);
      result.push(word);
    }
  }

  for (const word of ctx.whitelist ?? []) {
    if (isValidWord(word, ctx) && !seen.has(word)) {
      seen.add(word);
      result.push(word);
    }
  }

  return result;
}

export function filterPuzzleWords(
  rawWords: string[],
  ctx: PuzzleWordContext,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const word of rawWords) {
    if (!isValidWord(word, ctx)) continue;
    if (!ctx.allowedWords.has(word)) continue;
    if (ctx.blacklist.has(word) && !ctx.whitelist.has(word)) continue;

    if (!seen.has(word)) {
      seen.add(word);
      result.push(word);
    }
  }

  for (const word of ctx.whitelist) {
    if (!isValidWord(word, ctx)) continue;
    if (!ctx.allowedWords.has(word)) continue;

    if (!seen.has(word)) {
      seen.add(word);
      result.push(word);
    }
  }

  return result;
}

// ----------------------------------------------------------------------------
// Word lists (Step 1)
// ----------------------------------------------------------------------------

export function buildWordLists(
  paths: PreprocessPaths = DEFAULT_PATHS,
): Record<WordLength, string[]> {
  const puzzleByLen: Partial<Record<WordLength, string[]>> = {};

  for (const len of WORD_LENGTHS) {
    const dictionaryPath = path.join(paths.dataDir, `dictionary_${len}.txt`);
    const puzzleWordsPath = path.join(paths.dataDir, `puzzle_words_${len}.txt`);
    const blacklistPath = path.join(paths.dataDir, `blacklist_${len}.txt`);
    const whitelistPath = path.join(paths.dataDir, `whitelist_${len}.txt`);

    const rawDictionaryWords = readWordListFile(dictionaryPath);
    const rawPuzzleWords = readWordListFile(puzzleWordsPath);
    const blacklist = new Set(readWordListFile(blacklistPath));
    const whitelist = new Set(readWordListFile(whitelistPath));

    console.log(
      `[raw] len=${len} dictionary=${rawDictionaryWords.length} puzzleSource=${rawPuzzleWords.length} blacklist=${blacklist.size} whitelist=${whitelist.size}`,
    );

    const validWords = filterValidWords(rawDictionaryWords, {
      length: len,
      whitelist,
    });
    const validWordSet = new Set(validWords);

    const wordsJson = path.join(paths.publicDir, `allowed_words_${len}.json`);
    writeJsonFile(wordsJson, validWords);

    const puzzleWords = filterPuzzleWords(rawPuzzleWords, {
      length: len,
      blacklist,
      whitelist,
      allowedWords: validWordSet,
    });
    puzzleByLen[len] = puzzleWords;

    console.log(
      `[lists] len=${len} allowed=${validWords.length} puzzle=${puzzleWords.length} (written ${wordsJson})`,
    );
  }

  return puzzleByLen as Record<WordLength, string[]>;
}

// ----------------------------------------------------------------------------
// Graph building (Step 2)
// ----------------------------------------------------------------------------

export function buildWildcardMap(words: string[]): Map<string, number[]> {
  const wildcardMap = new Map<string, number[]>();

  words.forEach((word, index) => {
    const chars = word.split("");
    for (let pos = 0; pos < chars.length; pos++) {
      const original = chars[pos];
      chars[pos] = "*";
      const pattern = chars.join("");
      chars[pos] = original;

      let arr = wildcardMap.get(pattern);
      if (!arr) {
        arr = [];
        wildcardMap.set(pattern, arr);
      }
      arr.push(index);
    }
  });

  return wildcardMap;
}

/**
 * Build graph: neighbors[wordIndex][pos] = indices of neighbors differing at that pos.
 */
export function buildGraphForLength(words: string[]): LadderGraph {
  const length = words[0]?.length ?? 0;
  const wildcardMap = buildWildcardMap(words);

  const neighbors: number[][][] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const chars = word.split("");
    const neighborsByPos: number[][] = Array.from(
      { length },
      () => [] as number[],
    );

    for (let pos = 0; pos < length; pos++) {
      const original = chars[pos];
      chars[pos] = "*";
      const pattern = chars.join("");
      chars[pos] = original;

      const indices = wildcardMap.get(pattern);
      if (!indices) continue;

      for (const j of indices) {
        if (j === i) continue;
        neighborsByPos[pos].push(j);
      }
    }

    neighbors.push(neighborsByPos);
  }

  return { words, neighbors };
}

export function buildGraphs(
  puzzleByLen: Partial<Record<WordLength, string[]>>,
  paths: PreprocessPaths = DEFAULT_PATHS,
): void {
  for (const len of WORD_LENGTHS) {
    const words = puzzleByLen[len] ?? [];

    if (words.length === 0) {
      console.warn(`[graph] Skipping len=${len} (no puzzle words).`);
      continue;
    }

    const graph = buildGraphForLength(words);
    const graphPath = path.join(paths.publicDir, `puzzle_graph_${len}.json`);
    writeJsonFile(graphPath, graph);

    let edgeCount = 0;
    for (const byPos of graph.neighbors) {
      for (const arr of byPos) {
        edgeCount += arr.length;
      }
    }

    console.log(
      `[graph] len=${len} nodes=${graph.words.length} edges=${edgeCount} (written ${graphPath})`,
    );
  }
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------

interface CliOptions {
  step: "all" | "common" | "graphs";
}

function parseCliArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  let step: CliOptions["step"] = "all";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "all" || arg === "common" || arg === "graphs") {
      step = arg;
      continue;
    }
  }

  return { step };
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------

async function main(): Promise<void> {
  const { step } = parseCliArgs(process.argv);
  await runPreprocess({ step });
}

export async function runPreprocess(
  options: CliOptions & Partial<PreprocessPaths>,
): Promise<void> {
  const paths: PreprocessPaths = {
    ...DEFAULT_PATHS,
    ...options,
  };

  ensureDir(paths.publicDir);

  console.log(`[preprocess] step=${options.step}`);

  const puzzleByLen = buildWordLists(paths);

  if (options.step === "all" || options.step === "graphs") {
    buildGraphs(puzzleByLen, paths);
  }
}

const entryPoint = process.argv[1];

if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
