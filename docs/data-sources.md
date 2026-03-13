# Data Sources

This project keeps only the length-specific dictionary inputs that the app actually uses. The checked-in files are derived inputs, not a full upstream lexicon mirror.

## Current State

- `data/dictionary_3.txt` and `data/dictionary_4.txt` were inherited from an older import that used `scrabble_*.txt` filenames.
- The original dictionary source URL for those checked-in files was not recorded.
- `data/freq_3.csv` and `data/freq_4.csv` come from the Kaggle English word frequency dataset:
  - https://www.kaggle.com/datasets/rtatman/english-word-frequency/data
- The profanity/offensive-word filtering list was derived from:
  - https://www.cs.cmu.edu/~biglou/resources/bad-words.txt

## Rebuilding Dictionary Inputs

When you want to swap dictionary sources, download or otherwise obtain the upstream lexicon separately, then slice it into the app's length-specific files:

```bash
npm run build:dictionary -- --input /path/to/upstream-word-list.txt --lengths 3,4,5
```

That command writes:

- `data/dictionary_3.txt`
- `data/dictionary_4.txt`
- `data/dictionary_5.txt`

The build script:

- lowercases words
- ignores blank lines and `#` comments
- keeps only ASCII alphabetic words
- deduplicates entries
- emits one sorted file per requested length

## Workflow

1. Acquire an upstream lexicon and record its URL/version/date here.
2. Run `npm run build:dictionary -- --input ... --lengths ...`.
3. Review `data/dictionary_*.txt`.
4. Update `data/blacklist_*.txt` / `data/whitelist_*.txt` as needed.
5. Run `npm run preprocess`.

## TODO

- Record the exact historical source for the current 3/4-letter dictionary files if it can be recovered from outside the repo.
- Add source/version/license notes here whenever the dictionary source changes.
