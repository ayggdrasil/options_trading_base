import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
// import Backend from "i18next-http-backend";
import en from "../locales/en/translation.json";
import kr from "../locales/kr/translation.json";

i18n
  // .use(Backend)
  .use(LanguageDetector) // detect user language
  .use(initReactI18next) // pass the i18n instance to react-i18next.
  .init({ // init i18next (for all options read: https://www.i18next.com/overview/configuration-options)
    debug: true,
    fallbackLng: "kr",
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: {
        translation: en,
      },
      kr: {
        translation: kr,
      },
    },
  });

export default i18n;
