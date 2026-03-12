#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type WordLength = 3 | 4;

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
const WORD_LENGTHS: WordLength[] = [3, 4];

// Kaggle CSV: "word,count"
function getFreqCsvPath(len: WordLength, dataDir: string): string {
  // e.g. data/freq_3.csv, data/freq_4.csv
  return path.join(dataDir, `freq_${len}.csv`);
}

// Minimum frequency count threshold for "common" words.
// Tuned per word length to keep endpoints familiar without starving the graph.
const MIN_FREQUENCY_COUNT_DEFAULT: Record<WordLength, number> = {
  3: 500_000,
  4: 650_000,
};

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
// Frequency loading (Kaggle word,count CSV)
// ----------------------------------------------------------------------------

type FrequencyMap = Map<string, number>;

async function loadFrequencyMap(csvPath: string): Promise<FrequencyMap> {
  const freq = new Map<string, number>();

  if (!fs.existsSync(csvPath)) {
    console.warn(
      `[freq] CSV not found at ${csvPath}. All words will be treated as uncommon unless whitelisted.`,
    );
    return freq;
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let isFirstLine = true;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip header if present
    if (isFirstLine && /word/i.test(trimmed) && /count/i.test(trimmed)) {
      isFirstLine = false;
      continue;
    }
    isFirstLine = false;

    const parts = trimmed.split(",");
    if (parts.length < 2) continue;

    const word = parts[0].toLowerCase();
    const countStr = parts[1].trim();
    const count = Number.parseInt(countStr, 10);
    if (!Number.isFinite(count)) continue;

    freq.set(word, count);
  }

  console.log(`[freq] Loaded ${freq.size} entries from ${csvPath}`);
  return freq;
}

// ----------------------------------------------------------------------------
// Filters
// ----------------------------------------------------------------------------

interface FilterContext {
  length: WordLength;
  blacklist: Set<string>;
  whitelist: Set<string>;
  freqMap: FrequencyMap;
  minCount: number;
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
  for (const word of rawWords) {
    if (isValidWord(word, ctx)) {
      result.push(word);
    }
  }

  for (const word of ctx.whitelist ?? []) {
    if (isValidWord(word, ctx)) {
      result.push(word);
    }
  }

  return result;
}

/**
 * Modular "is common" function. Swap this out if you change frequency source.
 */
export function isCommonWord(word: string, ctx: FilterContext): boolean {
  if (!isValidWord(word, ctx)) return false;
  if (ctx.blacklist.has(word)) return false;

  // Whitelist overrides frequency
  if (ctx.whitelist.has(word)) return true;

  // Frequency check (default behavior)
  const count = ctx.freqMap.get(word) ?? 0;
  if (count < ctx.minCount) return false;

  return true;
}

/**
 * Apply all filters to raw words and return the "common" list.
 */
export function filterCommonWords(
  rawWords: string[],
  ctx: FilterContext,
): string[] {
  const result: string[] = [];
  for (const w of rawWords) {
    if (isCommonWord(w, ctx)) {
      result.push(w);
    }
  }
  return result;
}

// ----------------------------------------------------------------------------
// Common word lists (Step 1)
// ----------------------------------------------------------------------------

export async function buildCommonLists(
  minFrequencyCount?: number,
  paths: PreprocessPaths = DEFAULT_PATHS,
): Promise<Record<WordLength, string[]>> {
  const commonByLen: Partial<Record<WordLength, string[]>> = {};

  for (const len of WORD_LENGTHS) {
    const scrabblePath = path.join(paths.dataDir, `scrabble_${len}.txt`);
    const blacklistPath = path.join(paths.dataDir, `blacklist_${len}.txt`);
    const whitelistPath = path.join(paths.dataDir, `whitelist_${len}.txt`);
    const freqCsvPath = getFreqCsvPath(len, paths.dataDir);

    const rawWords = readWordListFile(scrabblePath);
    const blacklist = new Set(readWordListFile(blacklistPath));
    const whitelist = new Set(readWordListFile(whitelistPath));
    const freqMap = await loadFrequencyMap(freqCsvPath);

    console.log(
      `[raw] len=${len} scrabble=${rawWords.length} blacklist=${blacklist.size} whitelist=${whitelist.size}`,
    );

    const ctx: FilterContext = {
      length: len,
      blacklist,
      whitelist,
      freqMap,
      minCount: minFrequencyCount ?? MIN_FREQUENCY_COUNT_DEFAULT[len],
    };

    const validWords = filterValidWords(rawWords, {
      length: len,
      whitelist,
    });

    const wordsJson = path.join(paths.publicDir, `allowed_words_${len}.json`);
    writeJsonFile(wordsJson, validWords);

    const commonWords = filterCommonWords(validWords, ctx);
    commonByLen[len] = commonWords;

    console.log(
      `[lists] len=${len} allowed=${validWords.length} puzzle=${commonWords.length} (written ${wordsJson})`,
    );
  }

  return commonByLen as Record<WordLength, string[]>;
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
  commonByLen: Partial<Record<WordLength, string[]>>,
  paths: PreprocessPaths = DEFAULT_PATHS,
): void {
  for (const len of WORD_LENGTHS) {
    const words = commonByLen[len] ?? [];

    if (words.length === 0) {
      console.warn(`[graph] Skipping len=${len} (no puzzle words).`);
      continue;
    }

    const graph = buildGraphForLength(words);
    const graphPath = path.join(paths.publicDir, `puzzle_graph_${len}.json`);
    writeJsonFile(graphPath, graph);

    // Stats
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
  minFrequencyCount?: number;
}

function parseCliArgs(argv: string[]): CliOptions {
  // argv: [node, script, ...]
  const args = argv.slice(2);
  let step: CliOptions["step"] = "all";
  let minFrequencyCount: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "all" || arg === "common" || arg === "graphs") {
      step = arg;
      continue;
    }

    if (arg === "--min-count" && i + 1 < args.length) {
      const val = Number.parseInt(args[i + 1], 10);
      if (Number.isFinite(val)) {
        minFrequencyCount = val;
      }
      i++;
      continue;
    }

    // Unknown args just ignored for now
  }

  return { step, minFrequencyCount };
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------

async function main(): Promise<void> {
  const { step, minFrequencyCount } = parseCliArgs(process.argv);
  await runPreprocess({ step, minFrequencyCount });
}

export async function runPreprocess(
  options: CliOptions & Partial<PreprocessPaths>,
): Promise<void> {
  const paths: PreprocessPaths = {
    ...DEFAULT_PATHS,
    ...options,
  };

  ensureDir(paths.publicDir);

  console.log(
    options.minFrequencyCount === undefined
      ? `[preprocess] step=${options.step} minFrequencyCount=default(3=${MIN_FREQUENCY_COUNT_DEFAULT[3]},4=${MIN_FREQUENCY_COUNT_DEFAULT[4]})`
      : `[preprocess] step=${options.step} minFrequencyCount=${options.minFrequencyCount}`,
  );

  const commonByLen = await buildCommonLists(options.minFrequencyCount, paths);

  if (options.step === "all" || options.step === "graphs") {
    buildGraphs(commonByLen, paths);
  }
}

const entryPoint = process.argv[1]

if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
