#!/usr/bin/env python
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable, List, Dict, Set

from wordfreq import zipf_frequency


# ---- Paths -----------------------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
PUBLIC = ROOT / "public" / "data"

# Which word lengths you want to process
WORD_LENGTHS = (3, 4)

ALPHABET = "abcdefghijklmnopqrstuvwxyz"


# ---- Utilities -------------------------------------------------------------


def read_word_list(path: Path) -> List[str]:
    """Read words from a file, one per line, ignoring empty/comment lines."""
    if not path.exists():
        return []
    words: List[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        words.append(line.lower())
    return words


def read_word_set(path: Path) -> Set[str]:
    return set(read_word_list(path))


def write_word_list(path: Path, words: Iterable[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # sort for determinism
    text = "\n".join(sorted(set(words))) + "\n"
    path.write_text(text, encoding="utf-8")


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # indent for debugging, you can drop indent later to save bytes
    path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")


# ---- Filters ---------------------------------------------------------------


def is_common_enough(word: str, min_zipf: float) -> bool:
    """
    Filter by word frequency.

    Zipf scale: 3.5–4.0 is "normal/common English"; tune as you like.
    """
    return zipf_frequency(word, "en") >= min_zipf


def passes_filters(
    word: str, length: int, blacklist: Set[str], whitelist: Set[str], min_zipf: float
) -> bool:
    """
    All filters in one place so you can add more later.
    Order:
      1. blacklist always wins
      2. whitelist always passes
      3. otherwise, frequency-based + whatever else you add
    """
    if word in blacklist:
        return False

    if whitelist and word in whitelist:
        return True

    # length safety, in case raw files are messy
    if len(word) != length:
        return False

    if not word.isalpha():
        return False

    if not is_common_enough(word, min_zipf=min_zipf):
        return False

    # hook for future filters:
    # if not some_other_filter(word, length):
    #     return False

    return True


# ---- Step 1: build common_<len> files -------------------------------------


def build_common_lists(min_zipf: float = 3.5) -> None:
    """
    For each scrabble_<len>.txt, filter words and write common_<len>.

    Outputs:
      data/processed/common_<len>.txt
      public/data/common_<len>.json
    """
    for length in WORD_LENGTHS:
        raw_path = RAW / f"scrabble_{length}.txt"
        blacklist_path = RAW / f"blacklist_{length}.txt"
        whitelist_path = RAW / f"whitelist_{length}.txt"

        raw_words = read_word_list(raw_path)
        blacklist = read_word_set(blacklist_path)
        whitelist = read_word_set(whitelist_path)

        filtered: List[str] = []
        for w in raw_words:
            if passes_filters(w, length, blacklist, whitelist, min_zipf):
                filtered.append(w)

        processed_txt = PROCESSED / f"common_{length}.txt"
        processed_json = PUBLIC / f"common_{length}.json"

        write_word_list(processed_txt, filtered)
        write_json(processed_json, sorted(set(filtered)))

        print(
            f"[common] length={length} raw={len(raw_words)} -> common={len(filtered)}"
        )


# ---- Step 2: adjacency graph ----------------------------------------------


def build_adjacency(words: Iterable[str]) -> Dict[str, List[str]]:
    """
    Build adjacency where edges connect words of Hamming distance 1.

    For 3/4-letter words, naive O(N * length * 26) is perfectly fine.
    """
    word_list = list(words)
    word_set = set(word_list)
    graph: Dict[str, List[str]] = {w: [] for w in word_list}

    for w in word_list:
        for i in range(len(w)):
            orig = w[i]
            for c in ALPHABET:
                if c == orig:
                    continue
                candidate = w[:i] + c + w[i + 1 :]
                if candidate in word_set:
                    graph[w].append(candidate)

    return graph


def build_graphs_from_common() -> None:
    """
    Read common_<len>.txt and write graph_<len>.json for each length.

    Outputs:
      public/data/graph_<len>.json
    """
    for length in WORD_LENGTHS:
        common_path = PROCESSED / f"common_{length}.txt"
        words = read_word_list(common_path)
        graph = build_adjacency(words)

        graph_path = PUBLIC / f"graph_{length}.json"
        write_json(graph_path, graph)

        edge_count = sum(len(v) for v in graph.values())
        print(f"[graph] length={length} nodes={len(graph)} edges={edge_count}")


# ---- CLI / entrypoint ------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Preprocess word lists for the ladder game."
    )
    parser.add_argument(
        "step",
        nargs="?",
        default="all",
        choices=["all", "common", "graphs"],
        help="Which step to run (default: all).",
    )
    parser.add_argument(
        "--min-zipf",
        type=float,
        default=3.5,
        help="Minimum Zipf frequency for 'common' words (default: 3.5).",
    )

    args = parser.parse_args()

    PROCESSED.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    if args.step in ("all", "common"):
        build_common_lists(min_zipf=args.min_zipf)

    if args.step in ("all", "graphs"):
        build_graphs_from_common()


if __name__ == "__main__":
    main()
