import { type CSSProperties } from "react";
import { type BoardState, type ChangeSelection } from "../lib/board";

type SnapshotPuzzle = {
  startWord: string;
  endWord: string;
  selections: ChangeSelection[];
};

type LadderSnapshotProps = {
  board: BoardState;
  boardStyle?: CSSProperties;
  className?: string;
  puzzle: SnapshotPuzzle;
};

function LadderSnapshot({
  board,
  boardStyle,
  className,
  puzzle,
}: LadderSnapshotProps) {
  return (
    <div
      className={["ladder-grid", className].filter(Boolean).join(" ")}
      style={boardStyle}
    >
      <div className="word-row is-fixed">
        {puzzle.startWord.split("").map((letter, columnIndex) => (
          <div className="tile" key={`snapshot-start-${columnIndex}`}>
            {letter}
          </div>
        ))}
      </div>

      {Array.from({ length: puzzle.startWord.length - 1 }, (_, index) => {
        const rowIndex = index + 1;
        const rowState = board.rowStates[index] ?? "pending";
        const rowWord = board.intermediateWords[index] ?? "";

        return (
          <div
            className={`word-row ${
              rowState === "invalid" ? "is-invalid" : ""
            } ${rowState === "valid" && board.solved ? "is-valid" : ""}`}
            key={`snapshot-row-${rowIndex}`}
            aria-label={rowWord || `Row ${rowIndex}`}
          >
            {Array.from({ length: puzzle.startWord.length }, (_, columnIndex) => {
              const letter = board.intermediateCells[index]?.[columnIndex] ?? "";

              return (
                <div className="tile" key={`snapshot-cell-${rowIndex}-${columnIndex}`}>
                  {letter}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="word-row is-fixed">
        {puzzle.endWord.split("").map((letter, columnIndex) => (
          <div
            className={`tile ${
              board.implicitFinalColumn === columnIndex ? "is-final-column" : ""
            }`}
            key={`snapshot-end-${columnIndex}`}
          >
            {letter}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LadderSnapshot;
