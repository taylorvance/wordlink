import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  applyCellSelection,
  deriveBoardState,
  type ChangeSelection,
} from "./lib/board";
import { generateRandomLadder, type LadderGraph } from "./lib/ladder";
import "./App.css";

type WordLength = 3 | 4;

type Puzzle = {
  startWord: string;
  endWord: string;
  selections: ChangeSelection[];
};

type MotionDirection =
  | "motion-up"
  | "motion-down"
  | "motion-left"
  | "motion-right";

type CellMotion = {
  delayMs: number;
  direction: MotionDirection;
};

const FLOW_DURATION_MS = 680;
const FLOW_STAGGER_MS = 70;

function getCellMotion(
  originRow: number,
  originColumn: number,
  rowIndex: number,
  columnIndex: number,
): CellMotion | null {
  const deltaRow = rowIndex - originRow;
  const deltaColumn = columnIndex - originColumn;

  if (deltaRow === 0 && deltaColumn === 0) return null;

  const direction: MotionDirection =
    Math.abs(deltaColumn) >= Math.abs(deltaRow)
      ? deltaColumn < 0
        ? "motion-left"
        : "motion-right"
      : deltaRow < 0
        ? "motion-up"
        : "motion-down";

  const distance = Math.abs(deltaRow) + Math.abs(deltaColumn);

  return {
    delayMs: Math.max(0, distance - 1) * FLOW_STAGGER_MS,
    direction,
  };
}

function createPuzzle(graph: LadderGraph): Puzzle | null {
  const path = generateRandomLadder(graph);
  if (!path) return null;

  const startWord = path.words[0];
  const endWord = path.words[path.words.length - 1];

  return {
    startWord,
    endWord,
    selections: Array.from({ length: startWord.length }, () => null),
  };
}

function App() {
  const [wordLength, setWordLength] = useState<WordLength>(4);
  const [graph, setGraph] = useState<LadderGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [animatedCells, setAnimatedCells] = useState<
    Record<string, CellMotion>
  >({});
  const previousCellsRef = useRef<string[][] | null>(null);
  const previousPuzzleRef = useRef<string | null>(null);
  const motionOriginRef = useRef<{ columnIndex: number; rowIndex: number } | null>(
    null,
  );

  const dictionary = useMemo(() => new Set(graph?.words ?? []), [graph]);

  const board = useMemo(() => {
    if (!puzzle) return null;
    return deriveBoardState(
      puzzle.startWord,
      puzzle.endWord,
      puzzle.selections,
      dictionary,
    );
  }, [dictionary, puzzle]);

  useLayoutEffect(() => {
    if (!board || !puzzle) {
      previousCellsRef.current = null;
      previousPuzzleRef.current = null;
      setAnimatedCells({});
      return;
    }

    const puzzleKey = `${puzzle.startWord}:${puzzle.endWord}:${puzzle.startWord.length}`;
    if (previousPuzzleRef.current !== puzzleKey) {
      previousPuzzleRef.current = puzzleKey;
      previousCellsRef.current = board.intermediateCells.map((row) => [...row]);
      setAnimatedCells({});
      return;
    }

    const previousCells = previousCellsRef.current;
    if (!previousCells) {
      previousCellsRef.current = board.intermediateCells.map((row) => [...row]);
      return;
    }

    const nextAnimatedCells: Record<string, CellMotion> = {};
    const motionOrigin = motionOriginRef.current;

    for (let rowIndex = 1; rowIndex < puzzle.startWord.length; rowIndex++) {
      for (
        let columnIndex = 0;
        columnIndex < puzzle.startWord.length;
        columnIndex++
      ) {
        const previousLetter = previousCells[rowIndex - 1]?.[columnIndex] ?? "";
        const nextLetter =
          board.intermediateCells[rowIndex - 1]?.[columnIndex] ?? "";

        if (!nextLetter || previousLetter === nextLetter) continue;

        if (!motionOrigin) continue;

        const motion = getCellMotion(
          motionOrigin.rowIndex,
          motionOrigin.columnIndex,
          rowIndex,
          columnIndex,
        );
        if (motion) {
          nextAnimatedCells[`${rowIndex}-${columnIndex}`] = motion;
        }
      }
    }

    previousCellsRef.current = board.intermediateCells.map((row) => [...row]);
    setAnimatedCells(nextAnimatedCells);
    motionOriginRef.current = null;

    if (Object.keys(nextAnimatedCells).length === 0) return;

    const maxDelay = Math.max(
      ...Object.values(nextAnimatedCells).map((motion) => motion.delayMs),
    );
    const timeoutId = window.setTimeout(() => {
      setAnimatedCells({});
    }, FLOW_DURATION_MS + maxDelay + 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [board, puzzle]);

  const handleRefresh = () => {
    if (!graph) return;

    const nextPuzzle = createPuzzle(graph);
    if (!nextPuzzle) {
      setError("Unable to build a ladder. Try again.");
      setPuzzle(null);
      return;
    }

    setError(null);
    setPuzzle(nextPuzzle);
  };

  useEffect(() => {
    let cancelled = false;

    const loadGraph = async () => {
      setLoading(true);
      setError(null);
      setGraph(null);
      setPuzzle(null);

      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/graph_${wordLength}.json`,
        );
        if (!response.ok) {
          throw new Error(
            `Failed to load graph_${wordLength}.json. Run npm run preprocess first.`,
          );
        }

        const data = (await response.json()) as LadderGraph;
        if (!cancelled) {
          setGraph(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load graph data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadGraph();

    return () => {
      cancelled = true;
    };
  }, [wordLength]);

  useEffect(() => {
    if (!graph) return;

    const nextPuzzle = createPuzzle(graph);
    if (!nextPuzzle) {
      setError("Unable to build a ladder. Try again.");
      setPuzzle(null);
      return;
    }

    setError(null);
    setPuzzle(nextPuzzle);
  }, [graph]);

  const handleCellClick = (rowIndex: number, columnIndex: number) => {
    if (!puzzle || board?.solved) return;
    motionOriginRef.current = { rowIndex, columnIndex };

    setPuzzle((currentPuzzle) => {
      if (!currentPuzzle) return currentPuzzle;

      return {
        ...currentPuzzle,
        selections: applyCellSelection(
          currentPuzzle.selections,
          columnIndex,
          rowIndex,
        ),
      };
    });
  };

  const chosenCount =
    puzzle?.selections.filter((selection) => selection !== null).length ?? 0;
  const pendingColumns = (puzzle?.startWord.length ?? wordLength) - chosenCount;

  const statusMessage = loading
    ? "Loading ladder..."
    : error
      ? error
      : board?.solved
        ? "Ladder complete."
        : board?.complete
          ? "Not every rung is a valid word yet."
          : `Pick ${pendingColumns} more ${pendingColumns === 1 ? "column" : "columns"}.`;

  const boardStyle = puzzle
    ? ({
        "--letters": puzzle.startWord.length,
        "--flow-duration": `${FLOW_DURATION_MS}ms`,
      } as CSSProperties)
    : undefined;

  const showBoardState =
    !loading && !error && (board?.solved || board?.complete);

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
          className={`ladder-frame ${board?.solved ? "is-solved" : ""} ${
            board?.complete && !board?.solved ? "has-errors" : ""
          }`}
          aria-live="polite"
        >
          {!puzzle ? (
            <div className="loading-state">
              {loading ? "Loading..." : "No puzzle loaded."}
            </div>
          ) : (
            <div className="ladder-grid" style={boardStyle}>
              <div className="word-row is-fixed">
                {puzzle.startWord.split("").map((letter, columnIndex) => (
                  <div className="tile is-anchor" key={`start-${columnIndex}`}>
                    {letter}
                  </div>
                ))}
              </div>

              {Array.from(
                { length: puzzle.startWord.length - 1 },
                (_, index) => {
                  const rowIndex = index + 1;
                  const rowState = board?.rowStates[index] ?? "pending";
                  const rowWord = board?.intermediateWords[index] ?? "";

                  return (
                    <div
                      className={`word-row ${rowState === "invalid" ? "is-invalid" : ""} ${
                        rowState === "valid" && board?.solved ? "is-valid" : ""
                      }`}
                      key={`row-${rowIndex}`}
                      aria-label={rowWord || `Row ${rowIndex}`}
                    >
                      {Array.from(
                        { length: puzzle.startWord.length },
                        (_, columnIndex) => {
                          const letter =
                            board?.intermediateCells[index]?.[columnIndex] ??
                            "";
                          const isSelected =
                            puzzle.selections[columnIndex] === rowIndex;

                          return (
                            <button
                              key={`cell-${rowIndex}-${columnIndex}`}
                              type="button"
                              className={`tile button-tile ${letter ? "is-filled" : ""} ${
                                isSelected ? "is-selected" : ""
                              } ${
                                animatedCells[`${rowIndex}-${columnIndex}`]?.direction ?? ""
                              }`}
                              style={
                                animatedCells[`${rowIndex}-${columnIndex}`]
                                  ? ({
                                      "--flow-delay": `${animatedCells[`${rowIndex}-${columnIndex}`].delayMs}ms`,
                                    } as CSSProperties)
                                  : undefined
                              }
                              onClick={() =>
                                handleCellClick(rowIndex, columnIndex)
                              }
                              disabled={loading || !!error || board?.solved}
                              aria-label={
                                isSelected
                                  ? `Remove column ${columnIndex + 1} from row ${rowIndex}`
                                  : `Place column ${columnIndex + 1} on row ${rowIndex}`
                              }
                            >
                              {letter}
                            </button>
                          );
                        },
                      )}
                    </div>
                  );
                },
              )}

              <div className="word-row is-fixed">
                {puzzle.endWord.split("").map((letter, columnIndex) => (
                  <div
                    className={`tile is-anchor ${board?.implicitFinalColumn === columnIndex ? "is-final-column" : ""}`}
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
          <p className={`board-state ${board?.solved ? "solved" : "invalid"}`}>
            {statusMessage}
          </p>
        ) : null}
      </main>
    </div>
  );
}

export default App;
