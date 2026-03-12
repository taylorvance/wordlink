/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string
  readonly VITE_TIMED_START_MS?: string
  readonly VITE_TIMED_REWARD_MS?: string
  readonly VITE_TIMED_PENALTY_MS?: string
  readonly VITE_TIMED_WARNING_MS?: string
  readonly VITE_TIMED_DANGER_MS?: string
}
