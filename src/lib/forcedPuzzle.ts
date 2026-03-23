export type WordLength = 3 | 4 | 5

export type ForcedPuzzle = {
  endWord?: string
  startWord?: string
  wordLength: WordLength
}

function isSupportedWordLength(length: number): length is WordLength {
  return length === 3 || length === 4 || length === 5
}

function isWord(value: string): boolean {
  return /^[a-z]+$/.test(value)
}

export function parseForcedPuzzle(search: string): ForcedPuzzle | null {
  const params = new URLSearchParams(search)
  const startWord = params.get('start')?.trim().toLowerCase() ?? ''
  const endWord = params.get('end')?.trim().toLowerCase() ?? ''

  if (!startWord && !endWord) return null
  if (startWord && !isWord(startWord)) return null
  if (endWord && !isWord(endWord)) return null

  const lengths = [startWord.length, endWord.length].filter(Boolean)
  const wordLength = lengths[0]

  if (!wordLength || !isSupportedWordLength(wordLength)) return null
  if (lengths.some((length) => length !== wordLength)) return null

  return {
    ...(endWord ? { endWord } : {}),
    ...(startWord ? { startWord } : {}),
    wordLength,
  }
}

export function stripForcedPuzzleParams(search: string): string {
  const params = new URLSearchParams(search)
  params.delete('start')
  params.delete('end')

  const nextSearch = params.toString()
  return nextSearch ? `?${nextSearch}` : ''
}

export function getForcedPuzzleFromLocation(): ForcedPuzzle | null {
  if (typeof window === 'undefined') return null
  return parseForcedPuzzle(window.location.search)
}
