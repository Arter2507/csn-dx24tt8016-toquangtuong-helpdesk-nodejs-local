import { effect, inject, Injectable, Pipe, signal } from '@angular/core';
import messages from './messages.json';

export type Language = 'vi' | 'en';

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly language = signal<Language>(localStorage.getItem('tram-meo.language') === 'en' ? 'en' : 'vi');

  constructor() {
    effect(() => {
      const language = this.language();
      document.documentElement.lang = language;
      localStorage.setItem('tram-meo.language', language);
    });
  }

  personKey(row: Record<string, unknown>) {
    const name = String(row['fullName'] ?? '');
    const key = 'demo_person_' + row['id'];
    const label = (messages as Record<string, Record<Language, string>>)[key];
    return label?.vi === name ? key : name;
  }

  category(row: { code: string; name: string }): string {
    const key = row.code.toLowerCase() + '_category';
    const label = (messages as Record<string, Record<Language, string>>)[key];
    return label?.vi === row.name ? label[this.language()] : row.name;
  }

  text(key: unknown, params?: Record<string, string | number>): string {
    if (typeof key !== 'string') return '';
    const translation = (messages as Record<string, Record<Language, string>>)[key]?.[this.language()] ?? key;
    return params ? translation.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match)) : translation;
  }
}

@Pipe({ name: 't', pure: false })
export class Translate {
  private readonly i18n = inject(I18n);
  transform(key: unknown, params?: Record<string, string | number>) { return this.i18n.text(key, params); }
}

export function errorKey(error: unknown, fallback = 'we_couldnt_load_or_save_your_data_try_again') {
  const code = (error as { error?: { error?: { code?: string } } })?.error?.error?.code;
  return code && Object.hasOwn(messages, 'api_' + code) ? 'api_' + code : fallback;
}
