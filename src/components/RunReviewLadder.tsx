import { type CSSProperties } from 'react'
import { type BoardState } from '../lib/board'

type RunReviewEntry = {
  board: BoardState
  puzzle: {
    endWord: string
    startWord: string
  }
}

type RunReviewLadderProps = {
  boardStyle?: CSSProperties
  entries: RunReviewEntry[]
}

type ReviewRow = {
  cells: string[]
  changedColumns: Set<number>
  className: string
  label: string
}

function getChangedColumns(
  previousCells: string[] | null,
  currentCells: string[],
): Set<number> {
  const changedColumns = new Set<number>()

  if (!previousCells) return changedColumns

  currentCells.forEach((cell, columnIndex) => {
    if (cell !== previousCells[columnIndex]) {
      changedColumns.add(columnIndex)
    }
  })

  return changedColumns
}

function buildReviewRows(entries: RunReviewEntry[]): ReviewRow[] {
  const rows: ReviewRow[] = []
  let previousCells: string[] | null = null

  entries.forEach((entry, entryIndex) => {
    const { board, puzzle } = entry

    if (entryIndex === 0) {
      const startCells = puzzle.startWord.split('')
      rows.push({
        cells: startCells,
        changedColumns: new Set<number>(),
        className: 'word-row is-fixed',
        label: puzzle.startWord,
      })
      previousCells = startCells
    }

    board.intermediateCells.forEach((cells, rowIndex) => {
      const rowState = board.rowStates[rowIndex] ?? 'pending'
      const classNames = ['word-row']

      if (rowState === 'invalid') {
        classNames.push('is-invalid')
      }

      if (rowState === 'valid') {
        classNames.push('is-valid')
      }

      rows.push({
        cells,
        changedColumns: getChangedColumns(previousCells, cells),
        className: classNames.join(' '),
        label: board.intermediateWords[rowIndex] || `Row ${rows.length}`,
      })
      previousCells = cells
    })

    const endCells = puzzle.endWord.split('')
    rows.push({
      cells: endCells,
      changedColumns: getChangedColumns(previousCells, endCells),
      className: 'word-row is-fixed',
      label: puzzle.endWord,
    })
    previousCells = endCells
  })

  return rows
}

function RunReviewLadder({ boardStyle, entries }: RunReviewLadderProps) {
  if (entries.length === 0) return null

  const rows = buildReviewRows(entries)

  return (
    <div className='ladder-grid run-review-ladder' style={boardStyle}>
      {rows.map((row, rowIndex) => (
        <div aria-label={row.label} className={row.className} key={`review-row-${rowIndex}`}>
          {row.cells.map((letter, columnIndex) => (
            <div
              className={`tile ${
                row.changedColumns.has(columnIndex) ? 'is-change-cell' : ''
              }`}
              key={`review-cell-${rowIndex}-${columnIndex}`}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default RunReviewLadder
