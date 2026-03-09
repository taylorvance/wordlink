import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { applyCellSelection, deriveBoardState, type ChangeSelection } from './lib/board'
import { generateRandomLadder, type LadderGraph } from './lib/ladder'
import './App.css'

type WordLength = 3 | 4

type Puzzle = {
  startWord: string
  endWord: string
  selections: ChangeSelection[]
}

function createPuzzle(graph: LadderGraph): Puzzle | null {
  const path = generateRandomLadder(graph)
  if (!path) return null

  const startWord = path.words[0]
  const endWord = path.words[path.words.length - 1]

  return {
    startWord,
    endWord,
    selections: Array.from({ length: startWord.length }, () => null),
  }
}

function App() {
  const [wordLength, setWordLength] = useState<WordLength>(4)
  const [graph, setGraph] = useState<LadderGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)

  const dictionary = useMemo(() => new Set(graph?.words ?? []), [graph])

  const board = useMemo(() => {
    if (!puzzle) return null
    return deriveBoardState(puzzle.startWord, puzzle.endWord, puzzle.selections, dictionary)
  }, [dictionary, puzzle])

  const handleRefresh = () => {
    if (!graph) return

    const nextPuzzle = createPuzzle(graph)
    if (!nextPuzzle) {
      setError('Unable to build a ladder. Try again.')
      setPuzzle(null)
      return
    }

    setError(null)
    setPuzzle(nextPuzzle)
  }

  useEffect(() => {
    let cancelled = false

    const loadGraph = async () => {
      setLoading(true)
      setError(null)
      setGraph(null)
      setPuzzle(null)

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/graph_${wordLength}.json`)
        if (!response.ok) {
          throw new Error(
            `Failed to load graph_${wordLength}.json. Run npm run preprocess first.`,
          )
        }

        const data = (await response.json()) as LadderGraph
        if (!cancelled) {
          setGraph(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load graph data.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadGraph()

    return () => {
      cancelled = true
    }
  }, [wordLength])

  useEffect(() => {
    if (!graph) return

    const nextPuzzle = createPuzzle(graph)
    if (!nextPuzzle) {
      setError('Unable to build a ladder. Try again.')
      setPuzzle(null)
      return
    }

    setError(null)
    setPuzzle(nextPuzzle)
  }, [graph])

  const handleCellClick = (rowIndex: number, columnIndex: number) => {
    if (!puzzle || board?.solved) return

    setPuzzle((currentPuzzle) => {
      if (!currentPuzzle) return currentPuzzle

      return {
        ...currentPuzzle,
        selections: applyCellSelection(currentPuzzle.selections, columnIndex, rowIndex),
      }
    })
  }

  const chosenCount = puzzle?.selections.filter((selection) => selection !== null).length ?? 0
  const pendingColumns = (puzzle?.startWord.length ?? wordLength) - chosenCount

  const statusMessage = loading
    ? 'Loading ladder...'
    : error
      ? error
      : board?.solved
        ? 'Ladder complete.'
        : board?.complete
          ? 'Not every rung is a valid word yet.'
          : `Pick ${pendingColumns} more ${pendingColumns === 1 ? 'column' : 'columns'}.`

  const boardStyle = puzzle
    ? ({ '--letters': puzzle.startWord.length } as CSSProperties)
    : undefined

  const showBoardState = !loading && !error && (board?.solved || board?.complete)

  return (
    <div className="app-shell">
      <header className="topbar">
        <p className="brand-mark">WORDLINK</p>

        <div className="controls">
          <fieldset className="length-picker">
            <legend>Ladder length</legend>
            {[3, 4].map((len) => (
              <label key={len}>
                <input
                  type="radio"
                  name="word-length"
                  value={len}
                  checked={wordLength === len}
                  onChange={() => setWordLength(len as WordLength)}
                />
                <span>{len}</span>
              </label>
            ))}
          </fieldset>

          <button
            type="button"
            className="refresh-button"
            onClick={handleRefresh}
            disabled={!graph || loading}
            aria-label="Refresh puzzle"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20 4v5h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="game-card">
        <section
          className={`ladder-frame ${board?.solved ? 'is-solved' : ''} ${
            board?.complete && !board?.solved ? 'has-errors' : ''
          }`}
          aria-live="polite"
        >
          {!puzzle ? (
            <div className="loading-state">{loading ? 'Loading...' : 'No puzzle loaded.'}</div>
          ) : (
            <div className="ladder-grid" style={boardStyle}>
              <div className="word-row is-fixed">
                {puzzle.startWord.split('').map((letter, columnIndex) => (
                  <div className="tile is-anchor" key={`start-${columnIndex}`}>
                    {letter}
                  </div>
                ))}
              </div>

              {Array.from({ length: puzzle.startWord.length - 1 }, (_, index) => {
                const rowIndex = index + 1
                const rowState = board?.rowStates[index] ?? 'pending'
                const rowWord = board?.intermediateWords[index] ?? ''

                return (
                  <div
                    className={`word-row ${rowState === 'invalid' ? 'is-invalid' : ''} ${
                      rowState === 'valid' && board?.solved ? 'is-valid' : ''
                    }`}
                    key={`row-${rowIndex}`}
                    aria-label={rowWord || `Row ${rowIndex}`}
                  >
                    {Array.from({ length: puzzle.startWord.length }, (_, columnIndex) => {
                      const letter = board?.intermediateCells[index]?.[columnIndex] ?? ''
                      const isSelected = puzzle.selections[columnIndex] === rowIndex

                      return (
                        <button
                          key={`cell-${rowIndex}-${columnIndex}`}
                          type="button"
                          className={`tile button-tile ${letter ? 'is-filled' : ''} ${
                            isSelected ? 'is-selected' : ''
                          }`}
                          onClick={() => handleCellClick(rowIndex, columnIndex)}
                          disabled={loading || !!error || board?.solved}
                          aria-label={
                            isSelected
                              ? `Remove column ${columnIndex + 1} from row ${rowIndex}`
                              : `Place column ${columnIndex + 1} on row ${rowIndex}`
                          }
                        >
                          {letter}
                        </button>
                      )
                    })}
                  </div>
                )
              })}

              <div className="word-row is-fixed">
                {puzzle.endWord.split('').map((letter, columnIndex) => (
                  <div
                    className={`tile is-anchor ${board?.implicitFinalColumn === columnIndex ? 'is-final-column' : ''}`}
                    key={`end-${columnIndex}`}
                  >
                    {letter}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {showBoardState ? (
          <p className={`board-state ${board?.solved ? 'solved' : 'invalid'}`}>{statusMessage}</p>
        ) : null}
      </main>
    </div>
  )
}

export default App
