import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext, type LanguageContextValue } from './context'
import { readStoredLanguage, storeLanguage } from './storage'
import { LOCALES, MESSAGES, type Language } from './translations'

interface LanguageProviderProps {
  children: ReactNode
}

/**
 * Holds the chosen interface language.
 *
 * The choice is read back from `localStorage` when the tree first mounts, so a refresh or a later
 * visit opens in the language that was chosen. It is written on every change, and the document's
 * `lang` attribute is kept in step so a screen reader pronounces the page with the right voice.
 */
export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setChosenLanguage] = useState<Language>(() => readStoredLanguage() ?? 'en')

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((next: Language) => {
    setChosenLanguage(next)
    storeLanguage(next)
  }, [])

  const value = useMemo<LanguageContextValue>(
    () => ({ language, locale: LOCALES[language], t: MESSAGES[language], setLanguage }),
    [language, setLanguage],
  )

  return <LanguageContext value={value}>{children}</LanguageContext>
}
