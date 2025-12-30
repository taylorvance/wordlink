# scripts/preprocess_words.py
from pathlib import Path
from wordfreq import zipf_frequency
import json

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "public" / "data"

def main():
    OUT.mkdir(parents=True, exist_ok=True)

    # Example stub: just dumps common_3.json as empty list for now
    (OUT / "common_3.json").write_text(json.dumps([]))

if __name__ == "__main__":
    main()
