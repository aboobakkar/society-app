import en from './en'
import ml from './ml'
import { Language } from '@/types'

export const locales = { en, ml }

export type Translations = typeof en

// Returns the translation object for the given language
export function getTranslations(lang: Language): Translations {
  return locales[lang]
}

export { en, ml }
