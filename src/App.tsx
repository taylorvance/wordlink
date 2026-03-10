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
import {
  applyThemePreference,
  getInitialThemePreference,
  persistThemePreference,
  watchSystemTheme,
  type ThemePreference,
} from "./lib/theme";
import "./App.css";

type WordLength = 3 | 4;

type Puzzle = {
  startWord: string;
  endWord: string;
  selections: ChangeSelection[];
};

type PuzzleData = {
  graph: LadderGraph;
  validWords: string[];
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

type PreviewTarget = {
  rowIndex: number;
  columnIndex: number;
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
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    getInitialThemePreference,
  );
  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [animatedCells, setAnimatedCells] = useState<
    Record<string, CellMotion>
  >({});
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(
    null,
  );
  const previousCellsRef = useRef<string[][] | null>(null);
  const previousPuzzleRef = useRef<string | null>(null);
  const motionOriginRef = useRef<{ columnIndex: number; rowIndex: number } | null>(
    null,
  );

  const graph = puzzleData?.graph ?? null;

  const dictionary = useMemo(
    () => new Set(puzzleData?.validWords ?? []),
    [puzzleData],
  );

  const board = useMemo(() => {
    if (!puzzle) return null;
    return deriveBoardState(
      puzzle.startWord,
      puzzle.endWord,
      puzzle.selections,
      dictionary,
    );
  }, [dictionary, puzzle]);

  const previewSelections = useMemo(() => {
    if (!puzzle || !previewTarget || board?.solved) return null;

    return applyCellSelection(
      puzzle.selections,
      previewTarget.columnIndex,
      previewTarget.rowIndex,
    );
  }, [board?.solved, previewTarget, puzzle]);

  const previewBoard = useMemo(() => {
    if (!puzzle || !previewSelections) return null;

    return deriveBoardState(
      puzzle.startWord,
      puzzle.endWord,
      previewSelections,
      dictionary,
    );
  }, [dictionary, previewSelections, puzzle]);

  const displayedBoard = previewBoard ?? board;
  const displayedSelections = previewSelections ?? puzzle?.selections ?? [];

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

  useEffect(() => {
    if (!puzzle || loading || !!error || board?.solved) {
      setPreviewTarget(null);
    }
  }, [board?.solved, error, loading, puzzle]);

  const handleRefresh = () => {
    if (!graph) return;
    setPreviewTarget(null);

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
    applyThemePreference(themePreference);
    persistThemePreference(themePreference);

    if (themePreference !== "system") return;

    return watchSystemTheme(() => {
      applyThemePreference("system");
    });
  }, [themePreference]);

  useEffect(() => {
    let cancelled = false;

    const loadPuzzleData = async () => {
      setLoading(true);
      setError(null);
      setPuzzleData(null);
      setPuzzle(null);

      try {
        const [graphResponse, wordsResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/graph_${wordLength}.json`),
          fetch(`${import.meta.env.BASE_URL}data/words_${wordLength}.json`),
        ]);

        if (!graphResponse.ok) {
          throw new Error(
            `Failed to load graph_${wordLength}.json. Run npm run preprocess first.`,
          );
        }

        if (!wordsResponse.ok) {
          throw new Error(
            `Failed to load words_${wordLength}.json. Run npm run preprocess first.`,
          );
        }

        const [graphData, validWords] = await Promise.all([
          graphResponse.json() as Promise<LadderGraph>,
          wordsResponse.json() as Promise<string[]>,
        ]);

        if (!cancelled) {
          setPuzzleData({
            graph: graphData,
            validWords,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load puzzle data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPuzzleData();

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
    setPreviewTarget(null);
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

  const showPreview = (rowIndex: number, columnIndex: number) => {
    if (!puzzle || loading || !!error || board?.solved) return;

    setPreviewTarget({ rowIndex, columnIndex });
  };

  const clearPreview = (rowIndex: number, columnIndex: number) => {
    setPreviewTarget((currentPreview) => {
      if (!currentPreview) return currentPreview;

      if (
        currentPreview.rowIndex !== rowIndex ||
        currentPreview.columnIndex !== columnIndex
      ) {
        return currentPreview;
      }

      return null;
    });
  };

  const boardStyle = puzzle
    ? ({
        "--letters": puzzle.startWord.length,
        "--flow-duration": `${FLOW_DURATION_MS}ms`,
      } as CSSProperties)
    : undefined;

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

          <fieldset className="theme-picker">
            <legend>Theme</legend>
            {[
              { label: "Auto", value: "system" },
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
            ].map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="theme-preference"
                  value={option.value}
                  checked={themePreference === option.value}
                  onChange={() =>
                    setThemePreference(option.value as ThemePreference)
                  }
                />
                <span>{option.label}</span>
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
                  <div className="tile" key={`start-${columnIndex}`}>
                    {letter}
                  </div>
                ))}
              </div>

              {Array.from(
                { length: puzzle.startWord.length - 1 },
                (_, index) => {
                  const rowIndex = index + 1;
                  const rowState = board?.rowStates[index] ?? "pending";
                  const rowWord = displayedBoard?.intermediateWords[index] ?? "";
                  const isPreviewRow = previewTarget?.rowIndex === rowIndex;
                  const showRowState = !previewTarget;

                  return (
                    <div
                      className={`word-row ${
                        showRowState && rowState === "invalid" ? "is-invalid" : ""
                      } ${
                        showRowState && rowState === "valid" && board?.solved
                          ? "is-valid"
                          : ""
                      } ${isPreviewRow ? "is-preview" : ""}`}
                      key={`row-${rowIndex}`}
                      aria-label={rowWord || `Row ${rowIndex}`}
                    >
                      {Array.from(
                        { length: puzzle.startWord.length },
                        (_, columnIndex) => {
                          const actualLetter =
                            board?.intermediateCells[index]?.[columnIndex] ??
                            "";
                          const letter =
                            displayedBoard?.intermediateCells[index]?.[columnIndex] ??
                            "";
                          const isSelected =
                            displayedSelections[columnIndex] === rowIndex;
                          const isActuallySelected =
                            puzzle.selections[columnIndex] === rowIndex;
                          const isPreviewTarget =
                            previewTarget?.rowIndex === rowIndex &&
                            previewTarget.columnIndex === columnIndex;
                          const isPreviewChange =
                            !!previewBoard && actualLetter !== letter;

                          return (
                            <button
                              key={`cell-${rowIndex}-${columnIndex}`}
                              type="button"
                              className={`tile button-tile ${letter ? "is-filled" : ""} ${
                                isSelected ? "is-selected" : ""
                              } ${
                                isPreviewTarget ? "is-preview-target" : ""
                              } ${
                                isPreviewChange ? "is-preview-change" : ""
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
                              onPointerEnter={(event) => {
                                if (event.pointerType === "mouse") {
                                  showPreview(rowIndex, columnIndex);
                                }
                              }}
                              onPointerLeave={(event) => {
                                if (event.pointerType === "mouse") {
                                  clearPreview(rowIndex, columnIndex);
                                }
                              }}
                              onPointerDown={(event) => {
                                if (event.pointerType !== "mouse") {
                                  showPreview(rowIndex, columnIndex);
                                }
                              }}
                              onPointerUp={(event) => {
                                if (event.pointerType !== "mouse") {
                                  clearPreview(rowIndex, columnIndex);
                                }
                              }}
                              onPointerCancel={() =>
                                clearPreview(rowIndex, columnIndex)
                              }
                              onFocus={(event) => {
                                if (event.currentTarget.matches(":focus-visible")) {
                                  showPreview(rowIndex, columnIndex);
                                }
                              }}
                              onBlur={() => clearPreview(rowIndex, columnIndex)}
                              disabled={loading || !!error || board?.solved}
                              aria-label={
                                isActuallySelected
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
                    className={`tile ${board?.implicitFinalColumn === columnIndex ? "is-final-column" : ""}`}
                    key={`end-${columnIndex}`}
                  >
                    {letter}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default App;
