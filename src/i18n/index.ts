import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zh from './locales/zh/translation.json'
import en from './locales/en/translation.json'

/**
 * Supported languages registry.
 *
 * To add a new language:
 * 1. Create `locales/<code>/translation.json` mirroring the key structure.
 * 2. Import it here and add an entry to `supportedLanguages` and `resources`.
 * The language switcher UI reads `supportedLanguages` automatically.
 */
export interface LanguageInfo {
  /** BCP-47 code, e.g. 'zh', 'en' */
  code: string
  /** i18n key (inside the `lang` namespace) holding the native display name */
  labelKey: string
}

export const supportedLanguages: LanguageInfo[] = [
  { code: 'zh', labelKey: 'lang.zh' },
  { code: 'en', labelKey: 'lang.en' },
]

export const fallbackLanguage = 'zh'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    fallbackLng: fallbackLanguage,
    supportedLngs: supportedLanguages.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'vp-language',
    },
    returnNull: false,
  })

export default i18n
