import { describe, expect, it } from 'vitest'
import { applyCellSelection, deriveBoardState } from './board'

describe('applyCellSelection', () => {
  it('moves a row assignment instead of allowing duplicates', () => {
    const initial = [1, null, 2, null]

    expect(applyCellSelection(initial, 3, 2)).toEqual([1, null, null, 2])
  })

  it('toggles an existing selection off', () => {
    expect(applyCellSelection([null, 2, null], 1, 2)).toEqual([null, null, null])
  })
})

describe('deriveBoardState', () => {
  const dictionary = new Set(['cold', 'cord', 'card', 'ward', 'warm'])

  it('treats the last unassigned column as the final move and solves a valid ladder', () => {
    const board = deriveBoardState('cold', 'warm', [3, 2, 1, null], dictionary)

    expect(board.implicitFinalColumn).toBe(3)
    expect(board.intermediateWords).toEqual(['cord', 'card', 'ward'])
    expect(board.rowStates).toEqual(['valid', 'valid', 'valid'])
    expect(board.solved).toBe(true)
  })

  it('marks completed but invalid ladders', () => {
    const board = deriveBoardState('cold', 'warm', [1, 2, 3, null], dictionary)

    expect(board.complete).toBe(true)
    expect(board.solved).toBe(false)
    expect(board.rowStates).toEqual(['invalid', 'invalid', 'valid'])
  })

  it('keeps incomplete boards pending until every intermediate row is claimed', () => {
    const board = deriveBoardState('cold', 'warm', [3, null, 1, null], dictionary)

    expect(board.implicitFinalColumn).toBeNull()
    expect(board.complete).toBe(false)
    expect(board.rowStates).toEqual(['valid', 'pending', 'pending'])
    expect(board.intermediateCells[0]).toEqual(['c', 'o', 'r', 'd'])
    expect(board.intermediateCells[1]).toEqual(['c', '', 'r', ''])
  })
})
