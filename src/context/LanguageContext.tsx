import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  LanguageCode,
  LanguageOption,
  SUPPORTED_LANGUAGES,
  TranslationKey,
  getCurrentLanguage,
  setLanguage as setLanguageInUtils,
  t as translateKey
} from '../utils/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: TranslationKey) => translateKey(key, 'en'),
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(getCurrentLanguage());

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<LanguageCode>;
      if (customEvent.detail && (customEvent.detail === 'en' || customEvent.detail === 'hi' || customEvent.detail === 'te')) {
        setLanguageState(customEvent.detail);
      } else {
        setLanguageState(getCurrentLanguage());
      }
    };

    window.addEventListener('language_changed', handleLangChange);
    return () => window.removeEventListener('language_changed', handleLangChange);
  }, []);

  const changeLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    setLanguageInUtils(lang);
  };

  const t = (key: TranslationKey) => translateKey(key, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
