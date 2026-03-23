import { describe, expect, it } from 'vitest'
import { parseForcedPuzzle, stripForcedPuzzleParams } from './forcedPuzzle'

describe('parseForcedPuzzle', () => {
  it('parses a valid start and end pair', () => {
    expect(parseForcedPuzzle('?start=WORD&end=link')).toEqual({
      endWord: 'link',
      startWord: 'word',
      wordLength: 4,
    })
  })

  it('parses a valid start-only request', () => {
    expect(parseForcedPuzzle('?start=word')).toEqual({
      startWord: 'word',
      wordLength: 4,
    })
  })

  it('parses a valid end-only request', () => {
    expect(parseForcedPuzzle('?end=link')).toEqual({
      endWord: 'link',
      wordLength: 4,
    })
  })

  it('returns null when neither param is provided', () => {
    expect(parseForcedPuzzle('')).toBeNull()
  })

  it('returns null when the words are different lengths', () => {
    expect(parseForcedPuzzle('?start=word&end=cat')).toBeNull()
  })

  it('returns null for unsupported word lengths', () => {
    expect(parseForcedPuzzle('?start=at&end=it')).toBeNull()
    expect(parseForcedPuzzle('?start=planet&end=planer')).toBeNull()
  })

  it('returns null for non-letter input', () => {
    expect(parseForcedPuzzle('?start=wo-d&end=link')).toBeNull()
    expect(parseForcedPuzzle('?start=word&end=li4k')).toBeNull()
  })
})

describe('stripForcedPuzzleParams', () => {
  it('removes start and end params', () => {
    expect(stripForcedPuzzleParams('?start=word&end=link')).toBe('')
  })

  it('preserves unrelated params', () => {
    expect(
      stripForcedPuzzleParams('?start=word&theme=dark&end=link&debug=1'),
    ).toBe('?theme=dark&debug=1')
  })
})
