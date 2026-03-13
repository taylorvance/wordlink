# Data Sources

This project keeps only the length-specific inputs that the app actually uses. The checked-in files are derived inputs, not a full upstream lexicon mirror.

## Current State

- `data/dictionary_3.txt` and `data/dictionary_4.txt` were inherited from an older import that used `scrabble_*.txt` filenames.
- The original dictionary source URL for those checked-in files was not recorded.
- `data/puzzle_words_3.txt` and `data/puzzle_words_4.txt` were bootstrapped from the existing generated graph inputs so the app could migrate away from frequency-based preprocessing without changing current gameplay immediately.
- The original source URL for those initial checked-in puzzle-word files was not recorded either.
- The profanity/offensive-word filtering list was derived from:
  - https://www.cs.cmu.edu/~biglou/resources/bad-words.txt

## Recommended SCOWL Workflow

For now, acquire SCOWL manually through the custom generator instead of scripting downloads. The generator is the easiest stable interface while SCOWLv2 continues to evolve:

- https://app.aspell.net/create
- https://wordlist.aspell.net/

Recommended starting profiles:

- Allowed dictionary:
  - size `60`
  - spelling `American`
  - variants `1`
  - special lists `none`
  - export plain ASCII words
- Puzzle-generation pool:
  - size `35`
  - spelling `American`
  - variants `1`
  - special lists `none`
  - export plain ASCII words

`60` is a good default general dictionary size; `35` is a conservative starting point for graph generation. If the puzzle pool feels too thin, move the puzzle profile up to `40` or `50`.

## Building Derived Inputs

After downloading the upstream word lists, slice them into the app's length-specific files:

```bash
npm run build:dictionary -- --input /path/to/scowl-dictionary.txt --lengths 3,4,5
npm run build:dictionary -- --input /path/to/scowl-puzzle-pool.txt --lengths 3,4,5 --prefix puzzle_words
```

Those commands write:

- `data/dictionary_3.txt`
- `data/dictionary_4.txt`
- `data/dictionary_5.txt`
- `data/puzzle_words_3.txt`
- `data/puzzle_words_4.txt`
- `data/puzzle_words_5.txt`

The build script:

- lowercases words
- ignores blank lines and `#` comments
- keeps only ASCII alphabetic words
- deduplicates entries
- emits one sorted file per requested length

## Workflow

1. Generate the SCOWL dictionary profile and the SCOWL puzzle-pool profile manually.
2. Record the exact generator URL/options/date here.
3. Run `npm run build:dictionary -- --input ... --lengths ...`.
4. Run `npm run build:dictionary -- --input ... --lengths ... --prefix puzzle_words`.
5. Review `data/dictionary_*.txt` and `data/puzzle_words_*.txt`.
6. Update `data/blacklist_*.txt` / `data/whitelist_*.txt` as needed.
7. Run `npm run preprocess`.

## TODO

- Record the exact historical source for the current 3/4-letter dictionary files if it can be recovered from outside the repo.
- Replace the bootstrapped `puzzle_words_3.txt` / `puzzle_words_4.txt` files with SCOWL-derived versions.
- Add source/version/license notes here whenever the dictionary source changes.
