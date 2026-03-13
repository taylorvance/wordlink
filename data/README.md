# Data Pipeline

This directory contains the checked-in source inputs used by preprocessing.

## Source Files

- `dictionary_*.txt`: normalized base dictionary input. If a word is here and is alphabetic with the right length, it is eligible to be a player-valid word.
- `puzzle_words_*.txt`: puzzle-generation input. These words seed the graph used for generated ladders.
- `blacklist_*.txt`: puzzle-generation exclusions only. These words should not appear in generated ladders, but they are still allowed as player-entered words if they are otherwise valid dictionary words.
- `whitelist_*.txt`: puzzle-generation inclusions. These words are added to the player-valid list and are also kept in the puzzle-generation pool even if frequency would normally exclude them.

`blacklist_*.txt` does not mean "invalid everywhere." It only removes words from the generated puzzle pool.

Use `npm run build:dictionary -- --input /path/to/source.txt --lengths 3,4,5` to derive `dictionary_*.txt` files from an upstream lexicon word list. Use the same command with `--prefix puzzle_words` to derive the puzzle-generation list from a smaller or more restrictive source. Source/provenance notes live in `docs/data-sources.md`.

## Generated Assets

Running `npm run preprocess` writes runtime assets to `public/data/`.

- `allowed_words_*.json`: player-valid words used to validate player-entered words. This list includes real blacklisted words and any whitelisted words.
- `puzzle_graph_*.json`: graph built from the puzzle-generation word pool. Generated ladders come only from this graph, so blacklisted words should not appear here unless they were explicitly whitelisted.
