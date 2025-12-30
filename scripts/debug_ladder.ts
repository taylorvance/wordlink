// scripts/debug_ladder.ts

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  type LadderGraph,
  generateRandomLadder,
  solveLadderByIndex,
} from "../src/lib/ladder";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function loadGraph(len: 3 | 4): LadderGraph {
  const graphPath = path.join(ROOT, "public", "data", `graph_${len}.json`);
  if (!fs.existsSync(graphPath)) {
    throw new Error(
      `Graph file not found: ${graphPath}. Did you run preprocess?`,
    );
  }
  const raw = fs.readFileSync(graphPath, "utf8");
  return JSON.parse(raw) as LadderGraph;
}

function formatLadder(
  graph: LadderGraph,
  indices: number[],
  positions: number[],
): string {
  const parts: string[] = [];
  for (let i = 0; i < indices.length; i++) {
    const word = graph.words[indices[i]];
    if (i === 0) {
      parts.push(word);
    } else {
      const pos = positions[i - 1];
      parts.push(` --[${pos}]--> ${word}`);
    }
  }
  return parts.join("");
}

async function main(): Promise<void> {
  const len: 3 | 4 = 4; // change to 3 if you want to test 3-letter mode
  const graph = loadGraph(len);

  console.log(`Loaded graph_${len}.json with ${graph.words.length} words`);

  const randomLadder = generateRandomLadder(graph, { maxStartTries: 500 });
  if (!randomLadder) {
    console.log("Failed to generate a random ladder.");
    return;
  }

  const { indices, positions } = randomLadder;
  console.log("\nRandom ladder:");
  console.log(formatLadder(graph, indices, positions));

  const startIdx = indices[0];
  const endIdx = indices[indices.length - 1];

  const solved = solveLadderByIndex(graph, startIdx, endIdx);

  if (!solved) {
    console.log(
      "\nSolver FAILED to find a path between the same start/end. Bug!",
    );
  } else {
    console.log("\nSolver path between same start/end:");
    console.log(formatLadder(graph, solved.indices, solved.positions));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
