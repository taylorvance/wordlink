#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

type CliOptions = {
  input: string
  lengths: number[]
  outputDir: string
  prefix: string
}

type BuildResult = {
  length: number
  outputPath: string
  wordCount: number
}

function parseLengths(raw: string): number[] {
  const lengths = raw
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0)

  return Array.from(new Set(lengths)).sort((a, b) => a - b)
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2)

  let input = ''
  let outputDir = 'data'
  let prefix = 'dictionary'
  let lengths = [3, 4, 5]

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    const next = args[index + 1]

    if (arg === '--input' && next) {
      input = next
      index++
      continue
    }

    if (arg === '--output-dir' && next) {
      outputDir = next
      index++
      continue
    }

    if (arg === '--prefix' && next) {
      prefix = next
      index++
      continue
    }

    if (arg === '--lengths' && next) {
      lengths = parseLengths(next)
      index++
    }
  }

  if (!input) {
    throw new Error(
      'Missing required --input path. Example: npm run build:dictionary -- --input /path/to/words.txt --lengths 3,4,5',
    )
  }

  if (lengths.length === 0) {
    throw new Error('Expected at least one positive integer in --lengths')
  }

  return {
    input,
    lengths,
    outputDir,
    prefix,
  }
}

function normalizeWord(raw: string): string | null {
  const word = raw.trim().toLowerCase()

  if (!word || word.startsWith('#')) return null
  if (!/^[a-z]+$/.test(word)) return null

  return word
}

function getWordListBody(rawText: string): string[] {
  const lines = rawText.split(/\r?\n/)
  const dividerIndex = lines.findIndex((line) => line.trim() === '---')

  return dividerIndex === -1 ? lines : lines.slice(dividerIndex + 1)
}

export function buildDictionaryFiles(
  inputPath: string,
  lengths: readonly number[],
  outputDir: string,
  prefix = 'dictionary',
): BuildResult[] {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  const rawLines = getWordListBody(fs.readFileSync(inputPath, 'utf8'))
  const normalizedWords = rawLines
    .map(normalizeWord)
    .filter((word): word is string => word !== null)

  const uniqueWords = Array.from(new Set(normalizedWords))
  fs.mkdirSync(outputDir, { recursive: true })

  return lengths.map((length) => {
    const words = uniqueWords
      .filter((word) => word.length === length)
      .sort()
    const outputPath = path.join(outputDir, `${prefix}_${length}.txt`)
    const outputText = words.length > 0 ? `${words.join('\n')}\n` : ''

    fs.writeFileSync(outputPath, outputText, 'utf8')

    return {
      length,
      outputPath,
      wordCount: words.length,
    }
  })
}

function main(): void {
  const options = parseArgs(process.argv)
  const results = buildDictionaryFiles(
    options.input,
    options.lengths,
    options.outputDir,
    options.prefix,
  )

  for (const result of results) {
    console.log(
      `[dictionary] len=${result.length} words=${result.wordCount} wrote=${result.outputPath}`,
    )
  }
}

const entryPoint = process.argv[1]

if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  main()
}
