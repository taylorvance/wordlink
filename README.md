# WordLink

Word ladder game

word
worK
woNk
wInk
Link

## Preprocess

1. Prep player-valid word list
   1. start with scrabble list
   2. keep real words even if they appear in `data/blacklist_*.txt`
   3. add `data/whitelist_*.txt` words if present
2. Prep common puzzle word list
   1. start with the player-valid word list
   2. remove blacklisted words from puzzle generation only
   3. remove uncommon words
   4. keep whitelisted words even if uncommon
3. Prep wildcards for each common puzzle word (`*ord`, `w*rd`, `wo*d`, `wor*`)
   1. dict of {str: Array[int]} (wildcard str: word indices)
4. Create graph
   1. for each word's wildcard, add all indices for that wildcard (minus current word's index) to that word's graph line

`data/blacklist_*.txt` and `data/whitelist_*.txt` affect puzzle generation, not whether a player is allowed to enter a real word during play. Generated runtime assets are written to `public/data/`. See `data/README.md` for the detailed data contract.

## Tuning

- Use `npm run analyze:common -- --threshold 300000` to inspect a specific common-word cutoff.
- Use `npm run analyze:common -- --low 100000 --high 300000000 --trials 200` to binary-search for the highest viable cutoff.
- Add guards like `--min-common 2000` or `--min-unique-pair-rate 0.75` to keep the search from overfitting to tiny but technically valid graphs.
- Default preprocess thresholds are `500000` for 3-letter words and `650000` for 4-letter words; `--min-count` still overrides both lengths with one shared value.

## Acknowledgements

1. Scrabble dictionary (for valid words) - idk
1. Word frequencies (for finding common English words) - https://www.kaggle.com/datasets/rtatman/english-word-frequency/data
1. Bad word list (for filtering) - https://www.cs.cmu.edu/~biglou/resources/bad-words.txt
