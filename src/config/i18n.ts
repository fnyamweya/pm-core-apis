import i18n from 'i18n';
import path from 'path';

// i18n configuration
i18n.configure({
  locales: ['en'],
  directory: path.join(__dirname, '../locales'),
  defaultLocale: 'en',
  cookie: 'lang',
});

export default i18n;
