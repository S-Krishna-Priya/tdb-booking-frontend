import { createContext, useContext } from 'react'
import { LOCALES, MESSAGES, type Language, type Messages } from './translations'

export interface LanguageContextValue {
  language: Language
  /** The BCP 47 tag to format dates and times with. The timezone stays IST in every language. */
  locale: string
  /** The interface text for the chosen language. */
  t: Messages
  setLanguage: (language: Language) => void
}

/**
 * The interface is English until a `LanguageProvider` says otherwise, so a component rendered on
 * its own still has a complete, typed message set rather than throwing. Only the switch itself is
 * inert without a provider, which is exactly right: there is nothing above it to tell.
 */
export const DEFAULT_LANGUAGE_CONTEXT: LanguageContextValue = {
  language: 'en',
  locale: LOCALES.en,
  t: MESSAGES.en,
  setLanguage: () => undefined,
}

export const LanguageContext = createContext<LanguageContextValue>(DEFAULT_LANGUAGE_CONTEXT)

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext)
}
