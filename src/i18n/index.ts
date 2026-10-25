import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'

/** @public Read by i18next.d.ts for typed keys. */
export const defaultNS = 'translation'
/** @public Read by i18next.d.ts for typed keys. */
export const resources = { en: { translation: en } } as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

// Keep <html lang> in sync for screen readers (Khmer later).
document.documentElement.lang = i18n.language
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
