import { catalogs, resolveLanguage, translate } from '../public/i18n.js';
export { resolveLanguage };
export function errorPayload(error, language = 'en', fallback = 'errors.generic') {
  const code = Object.hasOwn(catalogs.en, error?.message) ? error.message : fallback;
  return { error: translate(language, code), code };
}
