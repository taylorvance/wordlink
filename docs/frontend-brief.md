# Frontend Rebuild Brief

Date: 2026-03-02

## Goal

Scrap the current frontend and build a polished single-page application around the existing backend/game logic.

## Scope

- Keep the existing backend logic and strategy work.
- Replace the current React frontend.
- Target both mobile and desktop.
- Make the experience keyboard-friendly.

## Visual Direction

- Minimal
- Clean
- Inspired by Wordle

## Required Behavior

- Generate a random ladder on initial load.
- Generate a new random ladder when the refresh button is clicked.
- The top word and bottom word are visible on initial load.
- Show a grid of empty boxes between the top and bottom words.
- Rows represent word states.
- Columns represent letter positions.
- The grid contains the start word in the top row, the target word in the bottom row, and `wordLength - 1` intermediate rows between them.
- Each letter column changes exactly once across the full ladder.
- Clicking a cell chooses the row where that column changes from the source letter to the destination letter.
- Cell clicks are the only interaction model in v1.
- Once a change cell is chosen for a column, the app fills that column above and below the chosen cell automatically.
- Only the intermediate grid cells are clickable.
- The last unchosen column is inferred as the final move into the bottom word.
- Choosing a change cell also constrains that full row:
  - No other columns change on that row.
  - Any other cell on that row should inherit a deterministically known adjacent letter when that letter can be inferred.
- The filled letters are derived from the start and target words:
  - Above the chosen row, the column uses the source word's letter.
  - At and below the chosen row, the column uses the destination word's letter.
- Other cell behavior should follow standard word-ladder intuition.
- Intermediate rows must always resolve to valid dictionary words.
- When a full intermediate row is formed, the app validates that word against the dictionary.
- Invalid rows should use clear Wordle-like error styling (for example, a red border).
- Do not show success-style "correct" clues while the ladder is still incomplete.
- For this implementation, each column changes exactly once.

## Controls

- A refresh button is always visible.
- A radio control selects ladder length.
- Ladder length options are 3, 4, and 5.
- Default ladder length is 4.
- No hint system in v1.
- Keep the interface minimal (KISS).

## Success Criteria

- `npm run build` passes.
- Test coverage is sufficient and tests pass.
- The app feels complete.
- The solved state should be indicated simply, such as a green success border.
- A refresh button remains available after success.

## Open Questions

- Any valid ladder is acceptable; the solution path does not need to be unique.
- v1 should be stateless; do not persist puzzle progress.
