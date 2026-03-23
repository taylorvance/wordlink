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
  maxStartTries?: number;
  maxPathTries?: number;
  minRunwayLadders?: number;
  runwayCheckLimit?: number;
  rng?: () => number;
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

function countLaddersFromStartIndex(
  graph: LadderGraph,
  startIndex: number,
  limit: number,
): number {
  if (limit <= 0) return 0;

  const wordLen = getWordLength(graph);
  const path = [startIndex];

  return dfsCountLadders(graph, startIndex, 0, 0, wordLen, path, limit);
}

function dfsCountLadders(
  graph: LadderGraph,
  currentIndex: number,
  usedMask: number,
  depth: number,
  wordLen: number,
  path: number[],
  limit: number,
): number {
  if (limit <= 0) return 0;

  if (depth === wordLen) {
    const allBitsMask = (1 << wordLen) - 1;
    return usedMask === allBitsMask ? 1 : 0;
  }

  const neighborsByPos = graph.neighbors[currentIndex];
  if (!neighborsByPos || neighborsByPos.length !== wordLen) {
    return 0;
  }

  let total = 0;

  for (let pos = 0; pos < wordLen; pos++) {
    if (usedMask & (1 << pos)) continue;

    for (const nextIndex of neighborsByPos[pos]) {
      if (path.includes(nextIndex)) continue;

      path.push(nextIndex);
      total += dfsCountLadders(
        graph,
        nextIndex,
        usedMask | (1 << pos),
        depth + 1,
        wordLen,
        path,
        limit - total,
      );
      path.pop();

      if (total >= limit) {
        return total;
      }
    }
  }

  return total;
}

function createRandomLadderFromStartIndex(
  graph: LadderGraph,
  startIndex: number,
  options: RandomLadderOptions = {},
): LadderPath | null {
  const wordLen = getWordLength(graph);
  const maxPathTries = options.maxPathTries ?? 24;
  const minRunwayLadders = options.minRunwayLadders ?? 0;
  const runwayCheckLimit = Math.max(
    options.runwayCheckLimit ?? minRunwayLadders,
    minRunwayLadders,
  );
  const rng = options.rng ?? Math.random;

  let bestPath: LadderPath | null = null;
  let bestRunway = -1;

  for (let attempt = 0; attempt < maxPathTries; attempt++) {
    const path: number[] = [startIndex];
    const positions: number[] = [];

    const found = dfsRandomLadder(
      graph,
      startIndex,
      0,
      0,
      wordLen,
      path,
      positions,
      rng,
    );

    if (!found) continue;

    const candidate = buildLadderPath(graph, [...path], [...positions]);
    const endIndex = candidate.indices[candidate.indices.length - 1];
    const runway = countLaddersFromStartIndex(graph, endIndex, runwayCheckLimit);

    if (runway > bestRunway) {
      bestRunway = runway;
      bestPath = candidate;
    }

    if (runway >= minRunwayLadders) {
      return candidate;
    }
  }

  return bestPath;
}

export function generateRandomLadder(
  graph: LadderGraph,
  options: RandomLadderOptions = {},
): LadderPath | null {
  const maxStartTries = options.maxStartTries ?? 200;
  const totalWords = graph.words.length;
  if (totalWords === 0) return null;

  const rng = options.rng ?? Math.random;
  let bestPath: LadderPath | null = null;
  let bestRunway = -1;

  for (let attempt = 0; attempt < maxStartTries; attempt++) {
    const startIndex = Math.floor(rng() * totalWords);
    const candidate = createRandomLadderFromStartIndex(graph, startIndex, {
      ...options,
      rng,
    });

    if (!candidate) continue;

    const runway = countLaddersFromStartIndex(
      graph,
      candidate.indices[candidate.indices.length - 1],
      Math.max(options.runwayCheckLimit ?? options.minRunwayLadders ?? 0, 1),
    );

    if (runway > bestRunway) {
      bestRunway = runway;
      bestPath = candidate;
    }

    if (runway >= (options.minRunwayLadders ?? 0)) {
      return candidate;
    }
  }

  return bestPath;
}

export function generateRandomLadderFromWord(
  graph: LadderGraph,
  startWord: string,
  options: RandomLadderOptions = {},
): LadderPath | null {
  const startIndex = findWordIndex(graph, startWord);
  if (startIndex === -1) {
    return null;
  }

  return createRandomLadderFromStartIndex(graph, startIndex, options);
}

export function generateRandomLadderToWord(
  graph: LadderGraph,
  endWord: string,
  options: Pick<RandomLadderOptions, 'rng'> = {},
): LadderPath | null {
  const endIndex = findWordIndex(graph, endWord);
  if (endIndex === -1) {
    return null;
  }

  const wordLen = getWordLength(graph);
  const fullMask = (1 << wordLen) - 1;
  const rng = options.rng ?? Math.random;

  type State = { idx: number; mask: number };

  const key = (idx: number, mask: number) => `${idx}|${mask}`;
  const visited = new Set<string>();
  const nextStep = new Map<
    string,
    { nextIdx: number; nextMask: number; pos: number }
  >();
  const queue: State[] = [{ idx: endIndex, mask: fullMask }];
  const startStates: State[] = [];

  visited.add(key(endIndex, fullMask));

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.mask === 0) {
      startStates.push(current);
      continue;
    }

    const neighborsByPos = graph.neighbors[current.idx];
    if (!neighborsByPos) continue;

    for (let pos = 0; pos < wordLen; pos++) {
      if ((current.mask & (1 << pos)) === 0) continue;

      const previousMask = current.mask & ~(1 << pos);

      for (const previousIdx of neighborsByPos[pos]) {
        const previousKey = key(previousIdx, previousMask);
        if (visited.has(previousKey)) continue;

        visited.add(previousKey);
        nextStep.set(previousKey, {
          nextIdx: current.idx,
          nextMask: current.mask,
          pos,
        });
        queue.push({ idx: previousIdx, mask: previousMask });
      }
    }
  }

  if (startStates.length === 0) {
    return null;
  }

  const startState = startStates[Math.floor(rng() * startStates.length)];
  const pathIndices: number[] = [startState.idx];
  const positions: number[] = [];

  let currentKey = key(startState.idx, startState.mask);
  while (true) {
    const currentStep = nextStep.get(currentKey);
    if (!currentStep) break;

    pathIndices.push(currentStep.nextIdx);
    positions.push(currentStep.pos);
    currentKey = key(currentStep.nextIdx, currentStep.nextMask);
  }

  return buildLadderPath(graph, pathIndices, positions);
}

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
    const allBitsMask = (1 << wordLen) - 1;
    return usedMask === allBitsMask;
  }

  const neighborsByPos = graph.neighbors[currentIndex];
  if (!neighborsByPos || neighborsByPos.length !== wordLen) {
    return false;
  }

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

  for (const pos of posCandidates) {
    const neighbors = [...neighborsByPos[pos]];
    shuffleInPlace(neighbors, rng);

    for (const nextIndex of neighbors) {
      if (path.includes(nextIndex)) continue;

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

      path.pop();
      positions.pop();
    }
  }

  return false;
}

export function findWordIndex(graph: LadderGraph, word: string): number {
  return graph.words.indexOf(word.toLowerCase());
}

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
      if (mask & (1 << pos)) continue;

      for (const nextIdx of neighborsByPos[pos]) {
        const nextMask = mask | (1 << pos);
        const nextKey = key(nextIdx, nextMask);
        if (visited.has(nextKey)) continue;

        visited.add(nextKey);
        parent.set(nextKey, { prevIdx: idx, prevMask: mask, pos });
        queue.push({ idx: nextIdx, mask: nextMask, depth: depth + 1 });
      }
    }
  }

  if (!foundKey) {
    return null;
  }

  const pathIndices: number[] = [];
  const positions: number[] = [];

  let currentKey = foundKey;
  while (true) {
    const [idxStr] = currentKey.split("|");
    const idx = Number.parseInt(idxStr, 10);

    pathIndices.push(idx);

    const previous = parent.get(currentKey);
    if (!previous) break;

    positions.push(previous.pos);
    currentKey = key(previous.prevIdx, previous.prevMask);
  }

  pathIndices.reverse();
  positions.reverse();

  return buildLadderPath(graph, pathIndices, positions);
}

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
