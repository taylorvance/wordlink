type WordLength = 3 | 4 | 5

export type TimedConfig = {
  dangerMs: number
  penaltyMs: number
  rewardMs: number
  startMs: number
  warningMs: number
}

function readNonNegativeIntegerEnv(
  name: keyof ImportMetaEnv,
  fallback: number,
): number {
  const raw = import.meta.env[name]
  if (raw === undefined || raw === '') return fallback

  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `[config] ${name} must be a non-negative integer, received "${raw}"`,
    )
  }

  return value
}

function getFallbackStartMs(wordLength: WordLength): number {
  return 2_000 + 1_750 * wordLength * wordLength
}

function getFallbackRewardMs(wordLength: WordLength): number {
  return 400 + 110 * wordLength * wordLength
}

function getFallbackPenaltyMs(wordLength: WordLength): number {
  return 800 + 250 * wordLength * wordLength
}

function getWarningMs(startMs: number): number {
  return Math.round(startMs * 0.35)
}

function getDangerMs(startMs: number): number {
  return Math.round(startMs * 0.18)
}

function validateTimedConfig(wordLength: WordLength, config: TimedConfig): TimedConfig {
  if (config.rewardMs > config.startMs) {
    throw new Error(
      `[config] timed reward cannot exceed start time for word length ${wordLength}`,
    )
  }

  if (config.penaltyMs > config.startMs) {
    throw new Error(
      `[config] timed penalty cannot exceed start time for word length ${wordLength}`,
    )
  }

  if (config.warningMs > config.startMs) {
    throw new Error(
      `[config] timed warning cannot exceed start time for word length ${wordLength}`,
    )
  }

  if (config.dangerMs > config.warningMs) {
    throw new Error(
      `[config] timed danger cannot exceed warning time for word length ${wordLength}`,
    )
  }

  return config
}

const TIMED_CONFIG_BY_LENGTH: Record<WordLength, TimedConfig> = {
  3: validateTimedConfig(3, {
    startMs: readNonNegativeIntegerEnv(
      'VITE_TIMED_START_MS_3',
      getFallbackStartMs(3),
    ),
    rewardMs: readNonNegativeIntegerEnv(
      'VITE_TIMED_REWARD_MS_3',
      getFallbackRewardMs(3),
    ),
    penaltyMs: readNonNegativeIntegerEnv(
      'VITE_TIMED_PENALTY_MS_3',
      getFallbackPenaltyMs(3),
    ),
    warningMs: getWarningMs(
      readNonNegativeIntegerEnv('VITE_TIMED_START_MS_3', getFallbackStartMs(3)),
    ),
    dangerMs: getDangerMs(
      readNonNegativeIntegerEnv('VITE_TIMED_START_MS_3', getFallbackStartMs(3)),
    ),
  }),
  4: validateTimedConfig(4, {
    startMs: readNonNegativeIntegerEnv(
      'VITE_TIMED_START_MS_4',
      getFallbackStartMs(4),
    ),
    rewardMs: readNonNegativeIntegerEnv(
      'VITE_TIMED_REWARD_MS_4',
      getFallbackRewardMs(4),
    ),
    penaltyMs: readNonNegativeIntegerEnv(
      'VITE_TIMED_PENALTY_MS_4',
      getFallbackPenaltyMs(4),
    ),
    warningMs: getWarningMs(
      readNonNegativeIntegerEnv('VITE_TIMED_START_MS_4', getFallbackStartMs(4)),
    ),
    dangerMs: getDangerMs(
      readNonNegativeIntegerEnv('VITE_TIMED_START_MS_4', getFallbackStartMs(4)),
    ),
  }),
  5: validateTimedConfig(5, {
    startMs: readNonNegativeIntegerEnv(
      'VITE_TIMED_START_MS_5',
      getFallbackStartMs(5),
    ),
    rewardMs: readNonNegativeIntegerEnv(
      'VITE_TIMED_REWARD_MS_5',
      getFallbackRewardMs(5),
    ),
    penaltyMs: readNonNegativeIntegerEnv(
      'VITE_TIMED_PENALTY_MS_5',
      getFallbackPenaltyMs(5),
    ),
    warningMs: getWarningMs(
      readNonNegativeIntegerEnv('VITE_TIMED_START_MS_5', getFallbackStartMs(5)),
    ),
    dangerMs: getDangerMs(
      readNonNegativeIntegerEnv('VITE_TIMED_START_MS_5', getFallbackStartMs(5)),
    ),
  }),
}

export function getTimedConfig(wordLength: WordLength): TimedConfig {
  return TIMED_CONFIG_BY_LENGTH[wordLength]
}
