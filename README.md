# WordLink

Word ladder game

word
worK
woNk
wInk
Link

## Preprocess

1. Prep word list
   1. start with scrabble list
   2. remove blacklisted words
   3. remove uncommon words
   4. add whitelisted words
2. Prep wildcards for each word (*ord w*rd wo*d wor*)
   1. dict of {str: Array[int]} (wildcard str: word indices)
3. Create graph
   1. for each word's wildcard, add all indices for that wildcard (minus current word's index) to that word's graph line

## Acknowledgements

1. Scrabble dictionary (for valid words) - idk
1. Word frequencies (for finding common English words) - https://www.kaggle.com/datasets/rtatman/english-word-frequency/data
1. Bad word list (for filtering) - https://www.cs.cmu.edu/~biglou/resources/bad-words.txt
