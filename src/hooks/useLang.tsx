import { createContext, useContext, useState, ReactNode } from 'react'
import { Language } from '@/types'

interface LangContextType {
  lang: Language
  setLang: (l: Language) => void
  t: (en: string, ml: string) => string
}

const LangContext = createContext<LangContextType | undefined>(undefined)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'en'
  })

  const setLang = (l: Language) => {
    localStorage.setItem('lang', l)
    setLangState(l)
  }

  const t = (en: string, ml: string) => lang === 'ml' ? ml : en

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
