import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

// Get saved language from localStorage or default to 'en'
const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') || 'en' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

// Update document direction when language loads or changes
const updateDocumentDirection = (lang) => {
  if (typeof window !== 'undefined') {
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    }
  }
};

updateDocumentDirection(savedLanguage);

i18n.on('languageChanged', (lang) => {
  updateDocumentDirection(lang);
});

export default i18n;
