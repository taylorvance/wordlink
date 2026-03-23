import { describe, expect, it } from 'vitest'
import {
  generateRandomLadderFromWord,
  generateRandomLadderToWord,
  solveLadder,
  type LadderGraph,
} from './ladder'

const graph: LadderGraph = {
  words: ['word', 'work', 'wonk', 'wink', 'link'],
  neighbors: [
    [[], [], [], [1]],
    [[], [], [2], [0]],
    [[], [3], [1], []],
    [[4], [2], [], []],
    [[3], [], [], []],
  ],
}

describe('generateRandomLadderFromWord', () => {
  it('builds a ladder from a fixed start word', () => {
    expect(generateRandomLadderFromWord(graph, 'word')?.words).toEqual([
      'word',
      'work',
      'wonk',
      'wink',
      'link',
    ])
  })
})

describe('generateRandomLadderToWord', () => {
  it('builds a ladder that ends on the requested word', () => {
    expect(generateRandomLadderToWord(graph, 'link')?.words).toEqual([
      'word',
      'work',
      'wonk',
      'wink',
      'link',
    ])
  })
})

describe('solveLadder', () => {
  it('verifies a requested start and end pair', () => {
    expect(solveLadder(graph, 'word', 'link')?.words).toEqual([
      'word',
      'work',
      'wonk',
      'wink',
      'link',
    ])
  })
})
