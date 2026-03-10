import fs from 'fs'
import {
  buildGraphForLength,
  filterCommonWords,
  filterValidWords,
  type LadderGraph,
} from './preprocess'
import { generateRandomLadder } from '../src/lib/ladder'

export type WordLength = 3 | 4

type FrequencyMap = Map<string, number>

export type WordInputs = {
  rawWords: string[]
  blacklist: Set<string>
  whitelist: Set<string>
  freqMap: FrequencyMap
}

export type GenerationStats = {
  successCount: number
  successRate: number
  trials: number
  uniquePairs: number
}

export type ThresholdAnalysis = {
  length: WordLength
  threshold: number
  validCount: number
  commonCount: number
  edgeCount: number
  successCount: number
  successRate: number
  trials: number
  uniquePairs: number
}

export type AnalysisOptions = {
  trials?: number
  maxStartTries?: number
}

export type ThresholdSearchOptions = AnalysisOptions & {
  low: number
  high: number
  minCommonCount?: number
  minSuccessRate?: number
  minUniquePairs?: number
  minUniquePairRate?: number
}

function readWordListFile(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return []

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
}

function readFrequencyMap(filePath: string): FrequencyMap {
  const freqMap: FrequencyMap = new Map()

  if (!fs.existsSync(filePath)) {
    return freqMap
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  let isFirstLine = true

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (isFirstLine && /word/i.test(trimmed) && /count/i.test(trimmed)) {
      isFirstLine = false
      continue
    }
    isFirstLine = false

    const [word, countText] = trimmed.split(',')
    const count = Number.parseInt(countText ?? '', 10)
    if (!word || !Number.isFinite(count)) continue

    freqMap.set(word.toLowerCase(), count)
  }

  return freqMap
}

export function loadWordInputs(length: WordLength): WordInputs {
  return {
    rawWords: readWordListFile(`data/raw/scrabble_${length}.txt`),
    blacklist: new Set(readWordListFile(`data/raw/blacklist_${length}.txt`)),
    whitelist: new Set(readWordListFile(`data/raw/whitelist_${length}.txt`)),
    freqMap: readFrequencyMap(`data/raw/freq_${length}.csv`),
  }
}

export function buildWordPools(
  length: WordLength,
  threshold: number,
  inputs: WordInputs = loadWordInputs(length),
): { validWords: string[]; commonWords: string[] } {
  const validWords = filterValidWords(inputs.rawWords, {
    length,
    blacklist: inputs.blacklist,
    whitelist: inputs.whitelist,
  })

  const commonWords = filterCommonWords(validWords, {
    length,
    blacklist: inputs.blacklist,
    whitelist: inputs.whitelist,
    freqMap: inputs.freqMap,
    minCount: threshold,
  })

  return {
    validWords,
    commonWords,
  }
}

export function countGraphEdges(graph: LadderGraph): number {
  let edgeCount = 0

  for (const byPos of graph.neighbors) {
    for (const neighbors of byPos) {
      edgeCount += neighbors.length
    }
  }

  return edgeCount
}

export function measureGenerationQuality(
  graph: LadderGraph,
  options: AnalysisOptions = {},
): GenerationStats {
  const trials = options.trials ?? 200
  const maxStartTries = options.maxStartTries ?? 500

  if (graph.words.length === 0) {
    return {
      successCount: 0,
      successRate: 0,
      trials,
      uniquePairs: 0,
    }
  }

  let successCount = 0
  const uniquePairs = new Set<string>()

  for (let index = 0; index < trials; index++) {
    const ladder = generateRandomLadder(graph, { maxStartTries })
    if (!ladder) continue

    successCount++
    uniquePairs.add(`${ladder.words[0]}:${ladder.words[ladder.words.length - 1]}`)
  }

  return {
    successCount,
    successRate: successCount / trials,
    trials,
    uniquePairs: uniquePairs.size,
  }
}

export function analyzeThreshold(
  length: WordLength,
  threshold: number,
  options: AnalysisOptions = {},
  inputs: WordInputs = loadWordInputs(length),
): ThresholdAnalysis {
  const { validWords, commonWords } = buildWordPools(length, threshold, inputs)
  const graph = buildGraphForLength(commonWords)
  const generation = measureGenerationQuality(graph, options)

  return {
    length,
    threshold,
    validCount: validWords.length,
    commonCount: commonWords.length,
    edgeCount: countGraphEdges(graph),
    successCount: generation.successCount,
    successRate: generation.successRate,
    trials: generation.trials,
    uniquePairs: generation.uniquePairs,
  }
}

export function isThresholdViable(
  analysis: ThresholdAnalysis,
  options: {
    minCommonCount?: number
    minSuccessRate?: number
    minUniquePairs?: number
    minUniquePairRate?: number
  } = {},
): boolean {
  const minSuccessRate = options.minSuccessRate ?? 1
  const minCommonCount = options.minCommonCount ?? 1
  const minUniquePairs = options.minUniquePairs ?? 0
  const minUniquePairRate = options.minUniquePairRate ?? 0

  return (
    analysis.commonCount >= minCommonCount &&
    analysis.successRate >= minSuccessRate &&
    analysis.uniquePairs >= minUniquePairs &&
    analysis.uniquePairs / analysis.trials >= minUniquePairRate
  )
}

export function findHighestViableThreshold(
  length: WordLength,
  options: ThresholdSearchOptions,
  inputs: WordInputs = loadWordInputs(length),
): ThresholdAnalysis | null {
  const cache = new Map<number, ThresholdAnalysis>()

  const getAnalysis = (threshold: number) => {
    let analysis = cache.get(threshold)
    if (!analysis) {
      analysis = analyzeThreshold(length, threshold, options, inputs)
      cache.set(threshold, analysis)
    }
    return analysis
  }

  let low = options.low
  let high = options.high
  let best: ThresholdAnalysis | null = null

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const analysis = getAnalysis(mid)

    if (isThresholdViable(analysis, options)) {
      best = analysis
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return best
}
