import { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '@/types';
import { getTranslations, Translations } from '@/locales';

interface LangContextType {
    lang: Language;
    setLang: (l: Language) => void;
    i18n: Translations;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LangProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Language>(() => {
        return (localStorage.getItem('lang') as Language) || 'en';
    });

    const setLang = (l: Language) => {
        localStorage.setItem('lang', l);
        setLangState(l);
    };

    const i18n = getTranslations(lang);

    return (
        <LangContext.Provider value={{ lang, setLang, i18n }}>
            {children}
        </LangContext.Provider>
    );
}

export function useLang() {
    const ctx = useContext(LangContext);
    if (!ctx) throw new Error('useLang must be used within LangProvider');
    return ctx;
}
