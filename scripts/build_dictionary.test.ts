import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildDictionaryFiles } from './build_dictionary'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('buildDictionaryFiles', () => {
  it('normalizes a source word list into length-specific dictionary files', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wordlink-dictionary-build-'))
    tempDirs.push(root)

    const inputPath = path.join(root, 'source.txt')
    const outputDir = path.join(root, 'data')

    fs.writeFileSync(
      inputPath,
      [
        '# comment',
        'Cold',
        'cord',
        'CARD',
        'ward',
        'warm',
        'a',
        'ab',
        'crate',
        'crane',
        'co-op',
        'word2',
        'cord',
      ].join('\n') + '\n',
    )

    const results = buildDictionaryFiles(inputPath, [4, 5], outputDir)

    expect(results).toEqual([
      {
        length: 4,
        outputPath: path.join(outputDir, 'dictionary_4.txt'),
        wordCount: 5,
      },
      {
        length: 5,
        outputPath: path.join(outputDir, 'dictionary_5.txt'),
        wordCount: 2,
      },
    ])

    expect(fs.readFileSync(path.join(outputDir, 'dictionary_4.txt'), 'utf8')).toBe(
      ['card', 'cold', 'cord', 'ward', 'warm'].join('\n') + '\n',
    )
    expect(fs.readFileSync(path.join(outputDir, 'dictionary_5.txt'), 'utf8')).toBe(
      ['crane', 'crate'].join('\n') + '\n',
    )
  })
})
