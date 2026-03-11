export type ChangeSelection = number | null
export type RowState = 'pending' | 'valid' | 'invalid'

export type BoardState = {
  effectiveChangeRows: ChangeSelection[]
  implicitFinalColumn: number | null
  intermediateCells: string[][]
  intermediateWords: string[]
  rowStates: RowState[]
  complete: boolean
  solved: boolean
}

type CellGrid = Array<Array<string | null>>

export function applyCellSelection(
  selections: ChangeSelection[],
  columnIndex: number,
  rowIndex: number,
): ChangeSelection[] {
  const next = [...selections]

  if (next[columnIndex] === rowIndex) {
    next[columnIndex] = null
  } else {
    for (let index = 0; index < next.length; index++) {
      if (index !== columnIndex && next[index] === rowIndex) {
        next[index] = null
      }
    }

    next[columnIndex] = rowIndex
  }

  for (let index = 0; index < next.length; index++) {
    const selection = next[index]
    if (selection !== null && selection > rowIndex) {
      next[index] = null
    }
  }

  return next
}

function getImplicitFinalColumn(
  selections: ChangeSelection[],
  wordLength: number,
): number | null {
  const occupiedRows = new Set<number>()
  const unassignedColumns: number[] = []

  for (let index = 0; index < selections.length; index++) {
    const row = selections[index]
    if (row === null) {
      unassignedColumns.push(index)
      continue
    }

    occupiedRows.add(row)
  }

  if (unassignedColumns.length !== 1) {
    return null
  }

  for (let row = 1; row < wordLength; row++) {
    if (!occupiedRows.has(row)) {
      return null
    }
  }

  return unassignedColumns[0]
}

function propagateAcrossKnownBoundaries(
  cells: CellGrid,
  boundaryChangeColumns: ReadonlyMap<number, number>,
  wordLength: number,
  rowCount: number,
) {
  let changed = true

  while (changed) {
    changed = false

    for (let lowerRow = 1; lowerRow < rowCount; lowerRow++) {
      const changeColumn = boundaryChangeColumns.get(lowerRow)
      if (changeColumn === undefined) continue

      const upperRow = lowerRow - 1

      for (let column = 0; column < wordLength; column++) {
        if (column === changeColumn) continue

        const upper = cells[upperRow][column]
        const lower = cells[lowerRow][column]

        if (upper === null && lower !== null) {
          cells[upperRow][column] = lower
          changed = true
        } else if (upper !== null && lower === null) {
          cells[lowerRow][column] = upper
          changed = true
        }
      }
    }
  }
}

export function deriveBoardState(
  startWord: string,
  endWord: string,
  selections: ChangeSelection[],
  dictionary: ReadonlySet<string>,
): BoardState {
  const wordLength = startWord.length

  if (wordLength === 0) {
    throw new Error('Start word is required')
  }

  if (endWord.length !== wordLength) {
    throw new Error('Start and end words must have the same length')
  }

  if (selections.length !== wordLength) {
    throw new Error('Selections must match the word length')
  }

  const implicitFinalColumn = getImplicitFinalColumn(selections, wordLength)
  const effectiveChangeRows = selections.map((row, columnIndex) => {
    if (row !== null) return row
    return columnIndex === implicitFinalColumn ? wordLength : null
  })

  const rowCount = wordLength + 1
  const cells: Array<Array<string | null>> = Array.from(
    { length: rowCount },
    () => Array.from({ length: wordLength }, () => null),
  )

  for (let column = 0; column < wordLength; column++) {
    cells[0][column] = startWord[column]
    cells[rowCount - 1][column] = endWord[column]
  }

  for (let column = 0; column < wordLength; column++) {
    const changeRow = effectiveChangeRows[column]
    if (changeRow === null) continue

    for (let row = 1; row < rowCount - 1; row++) {
      cells[row][column] =
        row < changeRow ? startWord[column] : endWord[column]
    }
  }

  const boundaryChangeColumns = new Map<number, number>()
  for (let column = 0; column < selections.length; column++) {
    const row = selections[column]
    if (row !== null) {
      boundaryChangeColumns.set(row, column)
    }
  }
  if (implicitFinalColumn !== null) {
    boundaryChangeColumns.set(rowCount - 1, implicitFinalColumn)
  }

  propagateAcrossKnownBoundaries(
    cells,
    boundaryChangeColumns,
    wordLength,
    rowCount,
  )

  const intermediateCells: string[][] = []
  const intermediateWords: string[] = []
  const rowStates: RowState[] = []

  for (let row = 1; row < rowCount - 1; row++) {
    const rowValues = cells[row].map((cell) => cell ?? '')
    intermediateCells.push(rowValues)

    const isComplete = rowValues.every((cell) => cell !== '')
    const word = isComplete ? rowValues.join('') : ''
    intermediateWords.push(word)

    if (!isComplete) {
      rowStates.push('pending')
      continue
    }

    rowStates.push(dictionary.has(word) ? 'valid' : 'invalid')
  }

  const complete =
    implicitFinalColumn !== null &&
    rowStates.every((rowState) => rowState !== 'pending')
  const solved =
    complete && rowStates.every((rowState) => rowState === 'valid')

  return {
    effectiveChangeRows,
    implicitFinalColumn,
    intermediateCells,
    intermediateWords,
    rowStates,
    complete,
    solved,
  }
}
