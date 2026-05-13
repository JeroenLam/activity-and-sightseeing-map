import { createI18n } from 'vue-i18n';
import nl from './nl.json';
import en from './en.json';

export const i18n = createI18n({
    legacy: false,
    locale: 'nl',
    fallbackLocale: 'en',
    messages: { nl, en },
});
