# Repository Guidelines

WordLink is a Vite + React + TypeScript word-ladder app with preprocessing scripts for word lists and graph data. Keep changes focused and reflect the existing tooling and data pipeline.

## Project Structure & Module Organization
- `src/` holds the React app (`App.tsx`, `main.tsx`) and shared logic under `src/lib/`.
- `src/assets/` contains static images used by the app; `public/` holds Vite-served public files.
- `scripts/` contains Node/TS utilities for preprocessing and debugging (`preprocess.ts`, `debug_ladder.ts`).
- `data/raw/` stores input word lists and frequency data; `data/processed/` stores generated filtered lists.
- `dist/` is the production build output (generated).

## Build, Test, and Development Commands
- `npm run dev`: start the Vite dev server with HMR.
- `npm run build`: type-check, run preprocessing, and produce a production build.
- `npm run preprocess`: regenerate processed word data from `data/raw/`.
- `npm run lint`: run ESLint across the project.
- `npm run test`: run the Vitest suite once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run preview`: serve the production build locally.
- `npm run debug:ladder`: run the ladder debugging script.

## Coding Style & Naming Conventions
- TypeScript + React with 2-space indentation, single quotes, and no semicolons in existing files.
- Use `*.tsx` for React components (PascalCase component names) and `*.ts` for utilities/scripts.
- Prefer small, pure functions in `src/lib/` for shared logic.
- ESLint is configured in `eslint.config.js`; TypeScript is `strict` in `tsconfig.app.json`.

## Testing Guidelines
- Tests are written with Vitest; current tests live in `scripts/preprocess.test.ts`.
- Name tests with `*.test.ts` and keep them close to the scripts they cover.
- Run `npm run test` before shipping changes that affect preprocessing or core logic.

## Commit & Pull Request Guidelines
- Existing commits use short, sentence-case summaries (no conventional commit prefixes). Follow that style.
- PRs should include a concise description, test commands run, and screenshots for UI changes.
- Link relevant issues or notes when touching data or preprocessing behavior.

## Data & Preprocessing Notes
- Update inputs in `data/raw/` and re-run `npm run preprocess` to refresh `data/processed/` outputs.
- Avoid editing `data/processed/` by hand; treat it as generated.
