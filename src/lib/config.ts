function readNonNegativeIntegerEnv(
  name: keyof ImportMetaEnv,
  fallback: number,
): number {
  const raw = import.meta.env[name];
  if (raw === undefined || raw === "") return fallback;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `[config] ${name} must be a non-negative integer, received "${raw}"`,
    );
  }

  return value;
}

export const TIMED_START_MS = readNonNegativeIntegerEnv(
  "VITE_TIMED_START_MS",
  30_000,
);
export const TIMED_REWARD_MS = readNonNegativeIntegerEnv(
  "VITE_TIMED_REWARD_MS",
  2_000,
);
export const TIMED_PENALTY_MS = readNonNegativeIntegerEnv(
  "VITE_TIMED_PENALTY_MS",
  5_000,
);
export const TIMED_WARNING_MS = readNonNegativeIntegerEnv(
  "VITE_TIMED_WARNING_MS",
  10_000,
);
export const TIMED_DANGER_MS = readNonNegativeIntegerEnv(
  "VITE_TIMED_DANGER_MS",
  5_000,
);

if (TIMED_WARNING_MS > TIMED_START_MS) {
  throw new Error(
    "[config] VITE_TIMED_WARNING_MS cannot exceed VITE_TIMED_START_MS",
  );
}

if (TIMED_DANGER_MS > TIMED_WARNING_MS) {
  throw new Error(
    "[config] VITE_TIMED_DANGER_MS cannot exceed VITE_TIMED_WARNING_MS",
  );
}
