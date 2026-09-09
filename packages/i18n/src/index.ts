import { en, type MessageKey } from './en';
import { es } from './es';

export type Locale = 'en' | 'es';
export type { MessageKey };

const tables: Record<Locale, Record<string, string>> = {
  en: en as unknown as Record<string, string>,
  es: { ...(en as unknown as Record<string, string>), ...es },
};

export function t(key: MessageKey, locale: Locale = 'en'): string {
  return tables[locale][key] ?? tables.en[key] ?? key;
}

export { en, es };
