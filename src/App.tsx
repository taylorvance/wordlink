import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  applyCellSelection,
  deriveBoardState,
  type BoardState,
  type ChangeSelection,
} from './lib/board'
import {
  generateRandomLadder,
  generateRandomLadderFromWord,
  type LadderGraph,
} from './lib/ladder'
import LadderSnapshot from './components/LadderSnapshot'
import RunReviewLadder from './components/RunReviewLadder'
import {
  applyThemePreference,
  getInitialThemePreference,
  persistThemePreference,
  watchSystemTheme,
  type ThemePreference,
} from './lib/theme'
import './App.css'

type WordLength = 3 | 4

type GameMode = 'classic' | 'timed'
type TimerState = 'normal' | 'warning' | 'danger'

type Puzzle = {
  startWord: string
  endWord: string
  selections: ChangeSelection[]
}

type PuzzleData = {
  graph: LadderGraph
  validWords: string[]
}

type MotionDirection =
  | 'motion-up'
  | 'motion-down'
  | 'motion-left'
  | 'motion-right'
  | 'motion-clear'

type CellMotion = {
  delayMs: number
  direction: MotionDirection
}

type PreviewTarget = {
  rowIndex: number
  columnIndex: number
}

type TimedHistoryEntry = {
  board: BoardState
  puzzle: Puzzle
}

type TimedRunState = {
  history: TimedHistoryEntry[]
  laddersCleared: number
  status: 'active' | 'over'
  timeLeftMs: number
}

type TimedTransition = {
  currentBoard: BoardState
  currentPuzzle: Puzzle
  nextBoard: BoardState
  nextPuzzle: Puzzle
}

const FLOW_DURATION_MS = 680
const FLOW_STAGGER_MS = 70
const TIMED_START_MS = 30_000
const TIMED_REWARD_MS = 2_000
const TIMED_PENALTY_MS = 5_000
const TIMED_TRANSITION_MS = 420
const TIMED_MIN_NEXT_LADDERS = 2
const TIMED_WARNING_MS = 15_000
const TIMED_DANGER_MS = 8_000

function getCellMotion(
  originRow: number,
  originColumn: number,
  rowIndex: number,
  columnIndex: number,
): CellMotion | null {
  const deltaRow = rowIndex - originRow
  const deltaColumn = columnIndex - originColumn

  if (deltaRow === 0 && deltaColumn === 0) return null

  const direction: MotionDirection =
    Math.abs(deltaColumn) >= Math.abs(deltaRow)
      ? deltaColumn < 0
        ? 'motion-left'
        : 'motion-right'
      : deltaRow < 0
        ? 'motion-up'
        : 'motion-down'

  const distance = Math.abs(deltaRow) + Math.abs(deltaColumn)

  return {
    delayMs: Math.max(0, distance - 1) * FLOW_STAGGER_MS,
    direction,
  }
}

function getClearCellMotion(
  originRow: number,
  originColumn: number,
  rowIndex: number,
  columnIndex: number,
): CellMotion {
  const rowDistance = Math.max(0, rowIndex - originRow)
  const columnDistance = Math.abs(columnIndex - originColumn)

  return {
    delayMs: Math.max(0, rowDistance - 1) * FLOW_STAGGER_MS +
      columnDistance * Math.floor(FLOW_STAGGER_MS / 2),
    direction: 'motion-clear',
  }
}

function clonePuzzle(puzzle: Puzzle): Puzzle {
  return {
    ...puzzle,
    selections: [...puzzle.selections],
  }
}

function samePuzzle(a: Puzzle, b: Puzzle): boolean {
  return (
    a.startWord === b.startWord &&
    a.endWord === b.endWord &&
    a.selections.length === b.selections.length &&
    a.selections.every((selection, index) => selection === b.selections[index])
  )
}

function createPuzzle(
  graph: LadderGraph,
  options: {
    minNextLadders?: number
    startWord?: string
  } = {},
): Puzzle | null {
  const path = options.startWord
    ? generateRandomLadderFromWord(graph, options.startWord, {
        minNextLadders: options.minNextLadders,
      })
    : generateRandomLadder(graph, {
        minNextLadders: options.minNextLadders,
      })

  if (!path) return null

  const startWord = path.words[0]
  const endWord = path.words[path.words.length - 1]

  return {
    startWord,
    endWord,
    selections: Array.from({ length: startWord.length }, () => null),
  }
}

function formatTimeLeft(timeLeftMs: number): string {
  return `${Math.max(0, Math.ceil(timeLeftMs / 1000))}s`
}

function getNextThemePreference(
  currentPreference: ThemePreference,
): ThemePreference {
  const themeCycle: ThemePreference[] = ['system', 'light', 'dark']
  const currentIndex = themeCycle.indexOf(currentPreference)
  const nextIndex = (currentIndex + 1) % themeCycle.length
  return themeCycle[nextIndex]
}

function getThemeButtonLabel(preference: ThemePreference): string {
  if (preference === 'system') return 'Auto'
  if (preference === 'light') return 'Light'
  return 'Dark'
}

function getTimerState(timeLeftMs: number): TimerState {
  if (timeLeftMs <= TIMED_DANGER_MS) return 'danger'
  if (timeLeftMs <= TIMED_WARNING_MS) return 'warning'
  return 'normal'
}

function App() {
  const [mode, setMode] = useState<GameMode>('classic')
  const [wordLength, setWordLength] = useState<WordLength>(4)
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    getInitialThemePreference,
  )
  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [timedRun, setTimedRun] = useState<TimedRunState | null>(null)
  const [timedTransition, setTimedTransition] = useState<TimedTransition | null>(
    null,
  )
  const [animatedCells, setAnimatedCells] = useState<
    Record<string, CellMotion>
  >({})
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null)
  const [boardHeight, setBoardHeight] = useState<number | null>(null)
  const previousCellsRef = useRef<string[][] | null>(null)
  const previousPuzzleRef = useRef<string | null>(null)
  const motionOriginRef = useRef<{ columnIndex: number; rowIndex: number } | null>(
    null,
  )
  const timerDeadlineRef = useRef<number | null>(null)
  const invalidAttemptRef = useRef<string | null>(null)
  const liveBoardRef = useRef<HTMLDivElement | null>(null)
  const reviewRef = useRef<HTMLDivElement | null>(null)

  const graph = puzzleData?.graph ?? null

  const dictionary = useMemo(
    () => new Set(puzzleData?.validWords ?? []),
    [puzzleData],
  )

  const board = useMemo(() => {
    if (!puzzle) return null
    return deriveBoardState(
      puzzle.startWord,
      puzzle.endWord,
      puzzle.selections,
      dictionary,
    )
  }, [dictionary, puzzle])

  const previewSelections = useMemo(() => {
    if (!puzzle || !previewTarget || board?.solved || timedTransition) return null

    return applyCellSelection(
      puzzle.selections,
      previewTarget.columnIndex,
      previewTarget.rowIndex,
    )
  }, [board?.solved, previewTarget, puzzle, timedTransition])

  const previewBoard = useMemo(() => {
    if (!puzzle || !previewSelections) return null

    return deriveBoardState(
      puzzle.startWord,
      puzzle.endWord,
      previewSelections,
      dictionary,
    )
  }, [dictionary, previewSelections, puzzle])

  const displayedBoard = previewBoard ?? board
  const displayedSelections = previewSelections ?? puzzle?.selections ?? []
  const isTimedMode = mode === 'timed'
  const isTimedActive = isTimedMode && timedRun?.status === 'active'
  const isTimedOver = isTimedMode && timedRun?.status === 'over'
  const timerState = getTimerState(timedRun?.timeLeftMs ?? TIMED_START_MS)
  const timerFill = Math.max(
    0,
    Math.min(1, (timedRun?.timeLeftMs ?? TIMED_START_MS) / TIMED_START_MS),
  )
  const boardDisabled =
    loading ||
    !!error ||
    !puzzle ||
    !!timedTransition ||
    !!board?.solved ||
    (isTimedMode && !isTimedActive)
  const boardStyle = puzzle
    ? ({
        '--letters': puzzle.startWord.length,
        '--flow-duration': `${FLOW_DURATION_MS}ms`,
      } as CSSProperties)
    : undefined
  const transitionStyle = {
    ...(boardStyle ?? {}),
    ...(boardHeight
      ? ({
          '--ladder-height': `${boardHeight}px`,
          '--ladder-shift-duration': `${TIMED_TRANSITION_MS}ms`,
        } as CSSProperties)
      : {}),
  } as CSSProperties
  const timedEndLabel = timedRun?.timeLeftMs === 0 ? "Time's up" : 'Run over'

  const reviewEntries = useMemo(() => {
    if (!isTimedOver || !timedRun) return []

    const entries = [...timedRun.history]

    if (puzzle && board) {
      const currentEntry = {
        board,
        puzzle: clonePuzzle(puzzle),
      }
      const lastEntry = entries[entries.length - 1]

      if (!lastEntry || !samePuzzle(lastEntry.puzzle, currentEntry.puzzle)) {
        entries.push(currentEntry)
      }
    }

    return entries
  }, [board, isTimedOver, puzzle, timedRun])

  const resetBoardPresentation = useCallback(() => {
    previousCellsRef.current = null
    previousPuzzleRef.current = null
    motionOriginRef.current = null
    invalidAttemptRef.current = null
    setAnimatedCells({})
    setPreviewTarget(null)
  }, [])

  const loadClassicPuzzle = useCallback(() => {
    if (!graph) return

    resetBoardPresentation()
    timerDeadlineRef.current = null
    setTimedRun(null)
    setTimedTransition(null)

    const nextPuzzle = createPuzzle(graph)
    if (!nextPuzzle) {
      setError('Unable to build a ladder. Try again.')
      setPuzzle(null)
      return
    }

    setError(null)
    setPuzzle(nextPuzzle)
  }, [graph, resetBoardPresentation])

  const startTimedRun = useCallback(() => {
    if (!graph) return

    resetBoardPresentation()
    setTimedTransition(null)

    const nextPuzzle = createPuzzle(graph, {
      minNextLadders: TIMED_MIN_NEXT_LADDERS,
    })
    if (!nextPuzzle) {
      timerDeadlineRef.current = null
      setTimedRun(null)
      setError('Unable to build a timed run. Try again.')
      setPuzzle(null)
      return
    }

    timerDeadlineRef.current = Date.now() + TIMED_START_MS
    setError(null)
    setPuzzle(nextPuzzle)
    setTimedRun({
      history: [],
      laddersCleared: 0,
      status: 'active',
      timeLeftMs: TIMED_START_MS,
    })
  }, [graph, resetBoardPresentation])

  useLayoutEffect(() => {
    if (!liveBoardRef.current) return

    const nextHeight = Math.round(
      liveBoardRef.current.getBoundingClientRect().height,
    )
    setBoardHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight,
    )
  }, [mode, puzzle?.endWord, puzzle?.startWord, wordLength])

  useLayoutEffect(() => {
    if (!board || !puzzle || timedTransition) {
      previousCellsRef.current = null
      previousPuzzleRef.current = null
      setAnimatedCells({})
      return
    }

    const puzzleKey = `${puzzle.startWord}:${puzzle.endWord}:${puzzle.startWord.length}`
    if (previousPuzzleRef.current !== puzzleKey) {
      previousPuzzleRef.current = puzzleKey
      previousCellsRef.current = board.intermediateCells.map((row) => [...row])
      setAnimatedCells({})
      return
    }

    const previousCells = previousCellsRef.current
    if (!previousCells) {
      previousCellsRef.current = board.intermediateCells.map((row) => [...row])
      return
    }

    const nextAnimatedCells: Record<string, CellMotion> = {}
    const motionOrigin = motionOriginRef.current

    for (let rowIndex = 1; rowIndex < puzzle.startWord.length; rowIndex++) {
      for (
        let columnIndex = 0;
        columnIndex < puzzle.startWord.length;
        columnIndex++
      ) {
        const previousLetter = previousCells[rowIndex - 1]?.[columnIndex] ?? ''
        const nextLetter =
          board.intermediateCells[rowIndex - 1]?.[columnIndex] ?? ''

        if (previousLetter === nextLetter) continue
        if (!motionOrigin) continue

        if (!nextLetter && previousLetter) {
          nextAnimatedCells[`${rowIndex}-${columnIndex}`] = getClearCellMotion(
            motionOrigin.rowIndex,
            motionOrigin.columnIndex,
            rowIndex,
            columnIndex,
          )
          continue
        }

        if (!nextLetter) continue

        const motion = getCellMotion(
          motionOrigin.rowIndex,
          motionOrigin.columnIndex,
          rowIndex,
          columnIndex,
        )
        if (motion) {
          nextAnimatedCells[`${rowIndex}-${columnIndex}`] = motion
        }
      }
    }

    previousCellsRef.current = board.intermediateCells.map((row) => [...row])
    setAnimatedCells(nextAnimatedCells)
    motionOriginRef.current = null

    if (Object.keys(nextAnimatedCells).length === 0) return

    const maxDelay = Math.max(
      ...Object.values(nextAnimatedCells).map((motion) => motion.delayMs),
    )
    const timeoutId = window.setTimeout(() => {
      setAnimatedCells({})
    }, FLOW_DURATION_MS + maxDelay + 100)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [board, puzzle, timedTransition])

  useEffect(() => {
    if (
      !puzzle ||
      loading ||
      !!error ||
      !!timedTransition ||
      board?.solved ||
      (isTimedMode && !isTimedActive)
    ) {
      setPreviewTarget(null)
    }
  }, [
    board?.solved,
    error,
    isTimedActive,
    isTimedMode,
    loading,
    puzzle,
    timedTransition,
  ])

  useEffect(() => {
    applyThemePreference(themePreference)
    persistThemePreference(themePreference)

    if (themePreference !== 'system') return

    return watchSystemTheme(() => {
      applyThemePreference('system')
    })
  }, [themePreference])

  useEffect(() => {
    let cancelled = false

    const loadPuzzleData = async () => {
      setLoading(true)
      setError(null)
      setPuzzleData(null)
      setPuzzle(null)
      setTimedRun(null)
      setTimedTransition(null)
      timerDeadlineRef.current = null

      try {
        const [graphResponse, wordsResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/graph_${wordLength}.json`),
          fetch(`${import.meta.env.BASE_URL}data/words_${wordLength}.json`),
        ])

        if (!graphResponse.ok) {
          throw new Error(
            `Failed to load graph_${wordLength}.json. Run npm run preprocess first.`,
          )
        }

        if (!wordsResponse.ok) {
          throw new Error(
            `Failed to load words_${wordLength}.json. Run npm run preprocess first.`,
          )
        }

        const [graphData, validWords] = await Promise.all([
          graphResponse.json() as Promise<LadderGraph>,
          wordsResponse.json() as Promise<string[]>,
        ])

        if (!cancelled) {
          setPuzzleData({
            graph: graphData,
            validWords,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load puzzle data.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPuzzleData()

    return () => {
      cancelled = true
    }
  }, [wordLength])

  useEffect(() => {
    if (!graph) return

    if (mode === 'timed') {
      startTimedRun()
      return
    }

    loadClassicPuzzle()
  }, [graph, loadClassicPuzzle, mode, startTimedRun])

  useEffect(() => {
    if (!isTimedActive || timedTransition) return

    const updateTimeLeft = () => {
      const deadline = timerDeadlineRef.current
      if (deadline === null) return

      const nextTimeLeft = Math.max(0, deadline - Date.now())

      setTimedRun((currentRun) => {
        if (!currentRun || currentRun.status !== 'active') return currentRun
        if (currentRun.timeLeftMs === nextTimeLeft) return currentRun

        return {
          ...currentRun,
          timeLeftMs: nextTimeLeft,
        }
      })

      if (nextTimeLeft === 0) {
        timerDeadlineRef.current = null
        setTimedRun((currentRun) => {
          if (!currentRun || currentRun.status !== 'active') return currentRun

          return {
            ...currentRun,
            status: 'over',
            timeLeftMs: 0,
          }
        })
      }
    }

    updateTimeLeft()
    const intervalId = window.setInterval(updateTimeLeft, 100)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isTimedActive, timedTransition])

  useEffect(() => {
    if (!puzzle || !board || !board.complete || board.solved) {
      invalidAttemptRef.current = null
    }
  }, [board, puzzle])

  useEffect(() => {
    if (
      !isTimedActive ||
      !puzzle ||
      !board ||
      !board.complete ||
      board.solved ||
      timedTransition
    ) {
      return
    }

    const attemptKey = `${puzzle.startWord}:${puzzle.endWord}:${puzzle.selections.join(',')}`
    if (invalidAttemptRef.current === attemptKey) return

    invalidAttemptRef.current = attemptKey

    const now = Date.now()
    if (timerDeadlineRef.current !== null) {
      const nextDeadline = Math.max(now, timerDeadlineRef.current - TIMED_PENALTY_MS)
      timerDeadlineRef.current = nextDeadline === now ? null : nextDeadline
    }

    const nextTimeLeft = timerDeadlineRef.current
      ? Math.max(0, timerDeadlineRef.current - now)
      : 0

    setTimedRun((currentRun) => {
      if (!currentRun || currentRun.status !== 'active') return currentRun

      return {
        ...currentRun,
        status: nextTimeLeft === 0 ? 'over' : currentRun.status,
        timeLeftMs: nextTimeLeft,
      }
    })
  }, [board, isTimedActive, puzzle, timedTransition])

  useEffect(() => {
    if (!isTimedOver || !reviewRef.current) return

    const reviewNode = reviewRef.current
    const frameId = window.requestAnimationFrame(() => {
      reviewNode.scrollTop = reviewNode.scrollHeight
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [isTimedOver, reviewEntries.length])

  useEffect(() => {
    if (
      !isTimedActive ||
      !graph ||
      !puzzle ||
      !board ||
      !board.solved ||
      timedTransition
    ) {
      return
    }

    const historyEntry = {
      board,
      puzzle: clonePuzzle(puzzle),
    }
    const measuredHeight = liveBoardRef.current
      ? Math.round(liveBoardRef.current.getBoundingClientRect().height)
      : boardHeight
    if (measuredHeight) {
      setBoardHeight(measuredHeight)
    }

    const nextPuzzle = createPuzzle(graph, {
      minNextLadders: TIMED_MIN_NEXT_LADDERS,
      startWord: puzzle.endWord,
    })

    const now = Date.now()
    if (timerDeadlineRef.current !== null) {
      timerDeadlineRef.current = Math.min(
        timerDeadlineRef.current + TIMED_REWARD_MS,
        now + TIMED_START_MS,
      )
    }

    const nextTimeLeft = timerDeadlineRef.current
      ? Math.max(0, timerDeadlineRef.current - now)
      : 0

    if (!nextPuzzle) {
      setTimedRun((currentRun) => {
        if (!currentRun || currentRun.status !== 'active') return currentRun

        return {
          ...currentRun,
          history: [...currentRun.history, historyEntry],
          laddersCleared: currentRun.laddersCleared + 1,
          status: 'over',
          timeLeftMs: nextTimeLeft,
        }
      })
      return
    }

    const nextBoard = deriveBoardState(
      nextPuzzle.startWord,
      nextPuzzle.endWord,
      nextPuzzle.selections,
      dictionary,
    )

    setTimedRun((currentRun) => {
      if (!currentRun || currentRun.status !== 'active') return currentRun

      return {
        ...currentRun,
        history: [...currentRun.history, historyEntry],
        laddersCleared: currentRun.laddersCleared + 1,
        timeLeftMs: nextTimeLeft,
      }
    })

    setTimedTransition({
      currentBoard: board,
      currentPuzzle: clonePuzzle(puzzle),
      nextBoard,
      nextPuzzle,
    })
    invalidAttemptRef.current = null
    motionOriginRef.current = null
  }, [board, boardHeight, dictionary, graph, isTimedActive, puzzle, timedTransition])

  useEffect(() => {
    if (!timedTransition) return

    const timeoutId = window.setTimeout(() => {
      setPuzzle(timedTransition.nextPuzzle)
      setTimedTransition(null)
    }, TIMED_TRANSITION_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [timedTransition])

  const handleRefresh = () => {
    if (!graph) return

    if (mode === 'timed') {
      startTimedRun()
      return
    }

    loadClassicPuzzle()
  }

  const handleCellClick = (rowIndex: number, columnIndex: number) => {
    if (boardDisabled) return

    setPreviewTarget(null)
    motionOriginRef.current = { rowIndex, columnIndex }

    setPuzzle((currentPuzzle) => {
      if (!currentPuzzle) return currentPuzzle

      return {
        ...currentPuzzle,
        selections: applyCellSelection(
          currentPuzzle.selections,
          columnIndex,
          rowIndex,
        ),
      }
    })
  }

  const showPreview = (rowIndex: number, columnIndex: number) => {
    if (boardDisabled) return

    setPreviewTarget({ rowIndex, columnIndex })
  }

  const clearPreview = (rowIndex: number, columnIndex: number) => {
    setPreviewTarget((currentPreview) => {
      if (!currentPreview) return currentPreview

      if (
        currentPreview.rowIndex !== rowIndex ||
        currentPreview.columnIndex !== columnIndex
      ) {
        return currentPreview
      }

      return null
    })
  }

  const handleThemeCycle = () => {
    setThemePreference((currentPreference) =>
      getNextThemePreference(currentPreference),
    )
  }

  return (
    <div className='app-shell'>
      <header className='topbar'>
        <p className='brand-mark'>WORDLINK</p>

        <button
          type='button'
          className='theme-cycle-button'
          onClick={handleThemeCycle}
          aria-label={`Theme: ${getThemeButtonLabel(themePreference)}. Change theme.`}
          title={`Theme: ${getThemeButtonLabel(themePreference)}`}
        >
          {themePreference === 'system'
            ? '◐'
            : themePreference === 'light'
              ? '☀'
              : '☾'}
        </button>

        <div className='controls'>
          <fieldset className='mode-picker'>
            <legend>Mode</legend>
            {[
              { label: 'Classic', value: 'classic' },
              { label: 'Timed', value: 'timed' },
            ].map((option) => (
              <label key={option.value}>
                <input
                  type='radio'
                  name='game-mode'
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value as GameMode)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className='length-picker'>
            <legend>Ladder length</legend>
            {[3, 4].map((len) => (
              <label key={len}>
                <input
                  type='radio'
                  name='word-length'
                  value={len}
                  checked={wordLength === len}
                  onChange={() => setWordLength(len as WordLength)}
                />
                <span>{len}</span>
              </label>
            ))}
          </fieldset>

          <button
            type='button'
            className='refresh-button'
            onClick={handleRefresh}
            disabled={!graph || loading}
            aria-label={mode === 'timed' ? 'Restart timed run' : 'Reset puzzle'}
          >
            <svg viewBox='0 0 24 24' aria-hidden='true'>
              <path
                d='M20 12a8 8 0 1 1-2.34-5.66'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M20 4v5h-5'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </button>
        </div>
      </header>

      <main className='game-card'>
        {isTimedMode && timedRun ? (
          <section className='timed-hud' aria-label='Timed run status'>
            <div
              className={`hud-bar is-${timerState}`}
              style={{ '--timer-fill': timerFill } as CSSProperties}
            >
              <div className='hud-bar-fill' />
              <span className='hud-bar-text'>
                {formatTimeLeft(timedRun.timeLeftMs)}
              </span>
            </div>
          </section>
        ) : null}

        {isTimedOver ? (
          <section className='run-review'>
            <div className='run-summary'>
              <p className='run-summary-title'>{timedEndLabel}</p>
              <p className='run-summary-stats'>
                {timedRun?.laddersCleared ?? 0} ladders cleared
              </p>
            </div>

            <div className='run-history' ref={reviewRef}>
              <article className='run-history-entry'>
                <RunReviewLadder boardStyle={boardStyle} entries={reviewEntries} />
              </article>
            </div>
          </section>
        ) : (
          <section
            className={`ladder-frame ${board?.solved ? 'is-solved' : ''} ${
              board?.complete && !board?.solved ? 'has-errors' : ''
            }`}
            aria-live='polite'
          >
            {!puzzle ? (
              <div className='loading-state'>
                {loading ? 'Loading...' : 'No puzzle loaded.'}
              </div>
            ) : timedTransition ? (
              <div className='ladder-viewport' style={transitionStyle}>
                <div className='ladder-track is-transitioning' style={transitionStyle}>
                  <LadderSnapshot
                    board={timedTransition.currentBoard}
                    boardStyle={boardStyle}
                    className='is-transition-panel'
                    puzzle={timedTransition.currentPuzzle}
                  />
                  <LadderSnapshot
                    board={timedTransition.nextBoard}
                    boardStyle={boardStyle}
                    className='is-transition-panel'
                    puzzle={timedTransition.nextPuzzle}
                  />
                </div>
              </div>
            ) : (
              <div className='ladder-grid' style={boardStyle} ref={liveBoardRef}>
                <div className='word-row is-fixed'>
                  {puzzle.startWord.split('').map((letter, columnIndex) => (
                    <div className='tile' key={`start-${columnIndex}`}>
                      {letter}
                    </div>
                  ))}
                </div>

                {Array.from(
                  { length: puzzle.startWord.length - 1 },
                  (_, index) => {
                    const rowIndex = index + 1
                    const rowState = board?.rowStates[index] ?? 'pending'
                    const rowWord = displayedBoard?.intermediateWords[index] ?? ''
                    const isPreviewRow = previewTarget?.rowIndex === rowIndex
                    const showRowState = !previewTarget

                    return (
                      <div
                        className={`word-row ${
                          showRowState && rowState === 'invalid' ? 'is-invalid' : ''
                        } ${
                          showRowState && rowState === 'valid' && board?.solved
                            ? 'is-valid'
                            : ''
                        } ${isPreviewRow ? 'is-preview' : ''}`}
                        key={`row-${rowIndex}`}
                        aria-label={rowWord || `Row ${rowIndex}`}
                      >
                        {Array.from(
                          { length: puzzle.startWord.length },
                          (_, columnIndex) => {
                            const actualLetter =
                              board?.intermediateCells[index]?.[columnIndex] ?? ''
                            const letter =
                              displayedBoard?.intermediateCells[index]?.[columnIndex] ??
                              ''
                            const isSelected =
                              displayedSelections[columnIndex] === rowIndex
                            const isActuallySelected =
                              puzzle.selections[columnIndex] === rowIndex
                            const isPreviewTarget =
                              previewTarget?.rowIndex === rowIndex &&
                              previewTarget.columnIndex === columnIndex
                            const isPreviewChange =
                              !!previewBoard && actualLetter !== letter

                            return (
                              <button
                                key={`cell-${rowIndex}-${columnIndex}`}
                                type='button'
                                className={`tile button-tile ${letter ? 'is-filled' : ''} ${
                                  isSelected ? 'is-selected' : ''
                                } ${
                                  isPreviewTarget ? 'is-preview-target' : ''
                                } ${
                                  isPreviewChange ? 'is-preview-change' : ''
                                } ${
                                  animatedCells[`${rowIndex}-${columnIndex}`]?.direction ??
                                  ''
                                }`}
                                style={
                                  animatedCells[`${rowIndex}-${columnIndex}`]
                                    ? ({
                                        '--flow-delay': `${animatedCells[`${rowIndex}-${columnIndex}`].delayMs}ms`,
                                      } as CSSProperties)
                                    : undefined
                                }
                                onClick={() =>
                                  handleCellClick(rowIndex, columnIndex)
                                }
                                onPointerEnter={(event) => {
                                  if (event.pointerType === 'mouse') {
                                    showPreview(rowIndex, columnIndex)
                                  }
                                }}
                                onPointerLeave={(event) => {
                                  if (event.pointerType === 'mouse') {
                                    clearPreview(rowIndex, columnIndex)
                                  }
                                }}
                                onPointerDown={(event) => {
                                  if (event.pointerType !== 'mouse') {
                                    showPreview(rowIndex, columnIndex)
                                  }
                                }}
                                onPointerUp={(event) => {
                                  if (event.pointerType !== 'mouse') {
                                    clearPreview(rowIndex, columnIndex)
                                  }
                                }}
                                onPointerCancel={() =>
                                  clearPreview(rowIndex, columnIndex)
                                }
                                onFocus={(event) => {
                                  if (event.currentTarget.matches(':focus-visible')) {
                                    showPreview(rowIndex, columnIndex)
                                  }
                                }}
                                onBlur={() => clearPreview(rowIndex, columnIndex)}
                                disabled={boardDisabled}
                                aria-label={
                                  isActuallySelected
                                    ? `Remove column ${columnIndex + 1} from row ${rowIndex}`
                                    : `Place column ${columnIndex + 1} on row ${rowIndex}`
                                }
                              >
                                {letter}
                              </button>
                            )
                          },
                        )}
                      </div>
                    )
                  },
                )}

                <div className='word-row is-fixed'>
                  {puzzle.endWord.split('').map((letter, columnIndex) => (
                    <div
                      className={`tile ${
                        board?.implicitFinalColumn === columnIndex
                          ? 'is-final-column'
                          : ''
                      }`}
                      key={`end-${columnIndex}`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
