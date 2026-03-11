# Project tracker

This file tracks product decisions, open questions, and implementation work for upcoming mode changes.

## Decisions made

- [x] Keep `Classic` as the current single-ladder mode
- [x] Keep `Classic` untimed
- [x] Keep a `Reset` button in `Classic` to load a new random ladder
- [x] Add a `Timed` mode as an endless continuous ladder run
- [x] In `Timed`, each solved destination becomes the next source
- [x] In `Timed`, `Restart` should begin a new random endless run
- [x] `Timed` generation should favor ladders with plenty of runway, not short dead ends
- [x] Use a countdown timer in `Timed`
- [x] Start `Timed` runs with 30 seconds
- [x] Use the timer as the only survival variable in `Timed`
- [x] Add 2 seconds for each completed ladder in `Timed`, capped at the starting time
- [x] Subtract 5 seconds for each invalid completed word in `Timed`
- [x] Do not punish valid words that lead nowhere
- [x] Keep only one ladder visible while actively solving in `Timed`
- [x] Animate ladder transitions in `Timed` with a clean upward slide
- [x] At the end of a `Timed` run, allow scrolling through the run from bottom to top
- [x] Present the post-run review as one continuous ladder without duplicated boundary words
- [x] Highlight changed cells in the post-run review ladder
- [x] Present the timer as a horizontal status bar with the numeric countdown inside it
- [x] Drain the timer bar from right to left
- [x] Change timer bar colors to warning and danger as time approaches zero
- [x] Keep the timer easy to tune with top-level constants
- [x] `Daily` mode can wait until later

## Open questions

- [x] Changing a higher rung should clear lower selections
- [x] Upstream selection changes should visually cascade downward so the dependency is obvious
- [ ] Should the 2-second reward stay fixed or later depend on ladder length?
- [ ] Should the 5-second penalty stay fixed or scale with something else?
- [ ] What should the score display emphasize: ladders cleared, time survived, or both?
- [ ] How should `Timed` ladder generation define and measure “plenty of runway”?
- [ ] How much run history should be retained in memory for the post-run scroll view?
- [ ] When `Daily` mode arrives, should it use UTC date or local date?

## Backlog

- [x] Add mode selection UI for `Classic` and `Timed`
- [x] Add `GameMode` and timed run state in app state
- [x] Keep the active ladder state separate from timed run stats
- [x] Extend ladder generation to support a fixed starting word
- [x] Add runway-aware generation for `Timed` starts and restarts
- [x] Implement continuous ladder progression for `Timed`
- [x] Auto-advance on solve in `Timed`
- [x] Implement countdown timer for `Timed`
- [x] Implement +2 second reward on ladder completion
- [x] Implement -5 second penalty on invalid completed words
- [x] Keep time tuning values easy to tweak
- [x] Store run history for end-of-run review
- [x] Add ladder transition UI/animation for `Timed`
- [x] Keep only one ladder visible during live `Timed` play
- [x] Add compact timer HUD
- [x] Add end-of-run UI with bottom-to-top scroll-through
- [x] Merge post-run ladders into one continuous review ladder
- [x] Highlight changed cells in the continuous review ladder

## Notes

- `Classic` is the relaxed single-ladder mode: one ladder at a time, no timer, reset for a new random ladder.
- `Timed` is the arcade mode: endless chaining with countdown pressure.
- `Timed` now starts at 30 seconds, caps at 30 seconds, grants +2 seconds per cleared ladder, and subtracts 5 seconds for each invalid completed word.
- The timer should be glanceable from peripheral vision, so urgency styling ramps up as it gets low.
- The current board model is already a good fit for both modes; the main new requirement is timed run state layered around the active puzzle.
- The main generation gap for future tuning is better defining and measuring what counts as enough runway.
- During a live timed run, the board stays focused on the current ladder only. Full run history becomes browseable after the run ends as one continuous ladder.
- Current row-change behavior: changing a higher rung clears lower selections, because downstream choices should be recomputed from the updated preceding word.
