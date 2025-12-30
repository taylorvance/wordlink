// src/lib/ladder.ts

export type LadderGraph = {
  words: string[];
  // neighbors[wordIndex][pos] = indices of neighbors that differ at that position
  neighbors: number[][][];
};

export type LadderPath = {
  indices: number[]; // indices into graph.words
  words: string[]; // same length as indices
  positions: number[]; // length = words.length - 1, positions[i] is changed pos from words[i] -> words[i+1]
};

export type RandomLadderOptions = {
  maxStartTries?: number; // how many random start words to try
};

function getWordLength(graph: LadderGraph): number {
  if (graph.words.length === 0) {
    throw new Error("Graph has no words");
  }
  const len = graph.words[0].length;
  if (!graph.words.every((w) => w.length === len)) {
    throw new Error("Graph words have inconsistent lengths");
  }
  return len;
}

/**
 * Helper to convert indices + positions into full LadderPath.
 */
function buildLadderPath(
  graph: LadderGraph,
  indices: number[],
  positions: number[],
): LadderPath {
  const words = indices.map((i) => graph.words[i]);
  return { indices, words, positions };
}

function shuffleInPlace<T>(arr: T[], rng: () => number = Math.random): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Generate a random ladder path that uses each character position exactly once.
 * Returns null if it fails to find one after some attempts.
 */
export function generateRandomLadder(
  graph: LadderGraph,
  options: RandomLadderOptions = {},
): LadderPath | null {
  const wordLen = getWordLength(graph);
  const maxStartTries = options.maxStartTries ?? 200;

  const totalWords = graph.words.length;
  if (totalWords === 0) return null;

  const rng = Math.random;

  for (let attempt = 0; attempt < maxStartTries; attempt++) {
    const startIndex = Math.floor(rng() * totalWords);

    const path: number[] = [startIndex];
    const positions: number[] = [];
    const usedMask = 0;

    if (
      dfsRandomLadder(
        graph,
        startIndex,
        usedMask,
        0,
        wordLen,
        path,
        positions,
        rng,
      )
    ) {
      return buildLadderPath(graph, path, positions);
    }
  }

  return null;
}

/**
 * DFS with backtracking to find a path of exactly `wordLen` steps,
 * using each position at most once (and exactly once if we succeed).
 */
function dfsRandomLadder(
  graph: LadderGraph,
  currentIndex: number,
  usedMask: number,
  depth: number,
  wordLen: number,
  path: number[],
  positions: number[],
  rng: () => number,
): boolean {
  if (depth === wordLen) {
    // We have wordLen steps, so path has wordLen+1 words, and we've used wordLen positions.
    // usedMask should be all bits set (0..wordLen-1).
    const allBitsMask = (1 << wordLen) - 1;
    return usedMask === allBitsMask;
  }

  const neighborsByPos = graph.neighbors[currentIndex];
  if (!neighborsByPos || neighborsByPos.length !== wordLen) {
    return false;
  }

  // Choose order of positions: only unused positions that have neighbors.
  const posCandidates: number[] = [];
  for (let pos = 0; pos < wordLen; pos++) {
    if (usedMask & (1 << pos)) continue;
    if (neighborsByPos[pos].length === 0) continue;
    posCandidates.push(pos);
  }

  if (posCandidates.length === 0) {
    return false;
  }

  shuffleInPlace(posCandidates, rng);

  const visitedInPath = (idx: number) => path.includes(idx);

  for (const pos of posCandidates) {
    const neighbors = [...neighborsByPos[pos]];
    shuffleInPlace(neighbors, rng);

    for (const nextIndex of neighbors) {
      if (visitedInPath(nextIndex)) continue;

      path.push(nextIndex);
      positions.push(pos);

      const nextMask = usedMask | (1 << pos);
      if (
        dfsRandomLadder(
          graph,
          nextIndex,
          nextMask,
          depth + 1,
          wordLen,
          path,
          positions,
          rng,
        )
      ) {
        return true;
      }

      // backtrack
      path.pop();
      positions.pop();
    }
  }

  return false;
}

/**
 * Find index of a word in the graph. Returns -1 if not found.
 */
export function findWordIndex(graph: LadderGraph, word: string): number {
  // For now: linear search. You can optimize with a precomputed map if needed.
  return graph.words.indexOf(word.toLowerCase());
}

/**
 * Solve a ladder between start and end indices using the "each position at most once"
 * rule, and exactly wordLen steps.
 *
 * Returns a LadderPath if found, otherwise null.
 */
export function solveLadderByIndex(
  graph: LadderGraph,
  startIdx: number,
  endIdx: number,
): LadderPath | null {
  const wordLen = getWordLength(graph);
  const fullMask = (1 << wordLen) - 1;

  type State = { idx: number; mask: number; depth: number };

  const key = (idx: number, mask: number) => `${idx}|${mask}`;
  const visited = new Set<string>();
  const parent = new Map<
    string,
    { prevIdx: number; prevMask: number; pos: number }
  >();

  const queue: State[] = [{ idx: startIdx, mask: 0, depth: 0 }];
  visited.add(key(startIdx, 0));

  let foundKey: string | null = null;

  while (queue.length > 0) {
    const { idx, mask, depth } = queue.shift()!;

    if (depth === wordLen) {
      if (idx === endIdx && mask === fullMask) {
        foundKey = key(idx, mask);
        break;
      }
      continue;
    }

    const neighborsByPos = graph.neighbors[idx];
    if (!neighborsByPos) continue;

    for (let pos = 0; pos < wordLen; pos++) {
      if (mask & (1 << pos)) continue; // already used this position

      const neighbors = neighborsByPos[pos];
      for (const nextIdx of neighbors) {
        const nextMask = mask | (1 << pos);
        const k = key(nextIdx, nextMask);
        if (visited.has(k)) continue;
        visited.add(k);
        parent.set(k, { prevIdx: idx, prevMask: mask, pos });

        queue.push({ idx: nextIdx, mask: nextMask, depth: depth + 1 });
      }
    }
  }

  if (!foundKey) {
    return null;
  }

  // Reconstruct path
  const pathIndices: number[] = [];
  const positions: number[] = [];

  let currentKey = foundKey;
  while (true) {
    const [idxStr] = currentKey.split("|");
    const idx = Number.parseInt(idxStr, 10);

    pathIndices.push(idx);

    const p = parent.get(currentKey);
    if (!p) break;

    positions.push(p.pos);
    currentKey = key(p.prevIdx, p.prevMask);
  }

  // We reconstructed from end->start; reverse
  pathIndices.reverse();
  positions.reverse();

  return buildLadderPath(graph, pathIndices, positions);
}

/**
 * Solve a ladder between two words (by string).
 */
export function solveLadder(
  graph: LadderGraph,
  startWord: string,
  endWord: string,
): LadderPath | null {
  const startIdx = findWordIndex(graph, startWord);
  const endIdx = findWordIndex(graph, endWord);
  if (startIdx === -1 || endIdx === -1) {
    return null;
  }
  return solveLadderByIndex(graph, startIdx, endIdx);
}
