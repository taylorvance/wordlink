#!/usr/bin/env tsx

import {
  analyzeThreshold,
  findHighestViableThreshold,
  type AnalysisOptions,
  type ThresholdAnalysis,
  type WordLength,
} from './common_pool'

type CliOptions = AnalysisOptions & {
  high: number
  length: WordLength | 'all'
  low: number
  minCommonCount: number
  minSuccessRate: number
  minUniquePairRate: number
  minUniquePairs: number
  threshold: number | null
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2)

  let length: CliOptions['length'] = 'all'
  let threshold: number | null = null
  let low = 100_000
  let high = 300_000_000
  let trials = 200
  let maxStartTries = 500
  let minSuccessRate = 1
  let minCommonCount = 1
  let minUniquePairs = 0
  let minUniquePairRate = 0

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    const next = args[index + 1]

    if (arg === '--len' && (next === '3' || next === '4' || next === 'all')) {
      length = next === 'all' ? 'all' : (Number.parseInt(next, 10) as WordLength)
      index++
      continue
    }

    if (arg === '--threshold' && next) {
      threshold = Number.parseInt(next, 10)
      index++
      continue
    }

    if (arg === '--low' && next) {
      low = Number.parseInt(next, 10)
      index++
      continue
    }

    if (arg === '--high' && next) {
      high = Number.parseInt(next, 10)
      index++
      continue
    }

    if (arg === '--trials' && next) {
      trials = Number.parseInt(next, 10)
      index++
      continue
    }

    if (arg === '--max-start-tries' && next) {
      maxStartTries = Number.parseInt(next, 10)
      index++
      continue
    }

    if (arg === '--min-success-rate' && next) {
      minSuccessRate = Number.parseFloat(next)
      index++
      continue
    }

    if (arg === '--min-common' && next) {
      minCommonCount = Number.parseInt(next, 10)
      index++
      continue
    }

    if (arg === '--min-unique-pairs' && next) {
      minUniquePairs = Number.parseInt(next, 10)
      index++
      continue
    }

    if (arg === '--min-unique-pair-rate' && next) {
      minUniquePairRate = Number.parseFloat(next)
      index++
    }
  }

  return {
    high,
    length,
    low,
    maxStartTries,
    minCommonCount,
    minSuccessRate,
    minUniquePairRate,
    minUniquePairs,
    threshold,
    trials,
  }
}

function formatAnalysis(analysis: ThresholdAnalysis): string {
  return [
    `len=${analysis.length}`,
    `threshold=${analysis.threshold}`,
    `valid=${analysis.validCount}`,
    `common=${analysis.commonCount}`,
    `edges=${analysis.edgeCount}`,
    `success=${analysis.successCount}/${analysis.trials}`,
    `rate=${analysis.successRate.toFixed(3)}`,
    `uniquePairs=${analysis.uniquePairs}`,
  ].join(' ')
}

function getLengths(length: CliOptions['length']): WordLength[] {
  if (length === 'all') {
    return [3, 4]
  }

  return [length]
}

function runThresholdMode(lengths: WordLength[], options: CliOptions): void {
  for (const length of lengths) {
    const analysis = analyzeThreshold(length, options.threshold!, options)
    console.log(formatAnalysis(analysis))
  }
}

function runBinarySearchMode(lengths: WordLength[], options: CliOptions): void {
  for (const length of lengths) {
    const best = findHighestViableThreshold(length, {
      high: options.high,
      low: options.low,
      maxStartTries: options.maxStartTries,
      minCommonCount: options.minCommonCount,
      minSuccessRate: options.minSuccessRate,
      minUniquePairRate: options.minUniquePairRate,
      minUniquePairs: options.minUniquePairs,
      trials: options.trials,
    })

    if (!best) {
      console.log(
        `len=${length} no viable threshold found in [${options.low}, ${options.high}]`,
      )
      continue
    }

    console.log(formatAnalysis(best))
  }
}

function main(): void {
  const options = parseArgs(process.argv)
  const lengths = getLengths(options.length)

  if (options.threshold !== null) {
    runThresholdMode(lengths, options)
    return
  }

  runBinarySearchMode(lengths, options)
}

main()
