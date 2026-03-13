# WordLink

Word ladder game

word
worK
woNk
wInk
Link

## Preprocess

1. Prep player-valid word list
   1. start with `data/dictionary_*.txt`
   2. keep real words even if they appear in `data/blacklist_*.txt`
   3. add `data/whitelist_*.txt` words if present
2. Prep puzzle-generation word list
   1. start with `data/puzzle_words_*.txt`
   2. remove blacklisted words from puzzle generation only
   3. keep whitelisted words
   4. drop anything not present in the allowed dictionary list
3. Prep wildcards for each puzzle word (`*ord`, `w*rd`, `wo*d`, `wor*`)
   1. dict of {str: Array[int]} (wildcard str: word indices)
4. Create graph
   1. for each word's wildcard, add all indices for that wildcard (minus current word's index) to that word's graph line

`data/blacklist_*.txt` and `data/whitelist_*.txt` affect puzzle generation, not whether a player is allowed to enter a real word during play. Generated runtime assets are written to `public/data/`. See `data/README.md` for the detailed data contract and [docs/data-sources.md](docs/data-sources.md) for source/provenance notes.

## Dictionary Workflow

- Build or import the allowed dictionary with `npm run build:dictionary -- --input /path/to/source.txt --lengths 3,4,5`.
- Build or import the puzzle pool with `npm run build:dictionary -- --input /path/to/source.txt --lengths 3,4,5 --prefix puzzle_words`.
- The recommended manual SCOWL workflow lives in `docs/data-sources.md`.

## Env Config

- Copy `.env.example` to `.env` or `.env.local` to tune gameplay and preprocessing without code changes.
- Timed-mode env knobs are `VITE_TIMED_START_MS`, `VITE_TIMED_REWARD_MS`, `VITE_TIMED_PENALTY_MS`, `VITE_TIMED_WARNING_MS`, and `VITE_TIMED_DANGER_MS`.
- `VITE_BASE_PATH` remains the deploy-path override for Vite builds.

## Acknowledgements

1. Current checked-in `dictionary_3.txt` / `dictionary_4.txt` were inherited from an older import. Original source URL was not recorded; see `docs/data-sources.md`.
1. Bad word list (for filtering) - https://www.cs.cmu.edu/~biglou/resources/bad-words.txt
