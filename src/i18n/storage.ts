import { isLanguage, type Language } from './translations'

/** Where the chosen language is remembered between visits. */
export const LANGUAGE_STORAGE_KEY = 'tdb.language'

/**
 * `localStorage` is not always available: Safari's private mode and some privacy settings throw
 * on access rather than returning null, and a corrupted value is not a language. Both are treated
 * as "no choice remembered", so the app falls back to English instead of failing to render.
 */
export function readStoredLanguage(): Language | null {
  try {
    const stored: unknown = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguage(stored) ? stored : null
  } catch {
    return null
  }
}

/** Remembers the choice. A storage that refuses the write still leaves the choice applied here. */
export function storeLanguage(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Nothing to recover: the language is still switched for this visit, it just is not remembered.
  }
}
