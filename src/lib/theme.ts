export type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'

export const THEME_STORAGE_KEY = 'wordlink-theme-preference'
export const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function getStoredThemePreference(): ThemePreference | null {
  if (typeof window === 'undefined') return null

  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemePreference(storedPreference) ? storedPreference : null
}

export function getInitialThemePreference(): ThemePreference {
  return getStoredThemePreference() ?? 'system'
}

export function resolveTheme(preference: ThemePreference): Theme {
  if (preference === 'light' || preference === 'dark') return preference

  if (typeof window === 'undefined') return 'light'

  return window.matchMedia(DARK_MODE_MEDIA_QUERY).matches ? 'dark' : 'light'
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof document === 'undefined') return

  const resolvedTheme = resolveTheme(preference)
  const root = document.documentElement

  root.dataset.theme = resolvedTheme
  root.style.colorScheme = resolvedTheme
}

export function persistThemePreference(preference: ThemePreference) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(THEME_STORAGE_KEY, preference)
}

export function watchSystemTheme(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}

  const mediaQuery = window.matchMedia(DARK_MODE_MEDIA_QUERY)

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onChange)

    return () => {
      mediaQuery.removeEventListener('change', onChange)
    }
  }

  mediaQuery.addListener(onChange)

  return () => {
    mediaQuery.removeListener(onChange)
  }
}
