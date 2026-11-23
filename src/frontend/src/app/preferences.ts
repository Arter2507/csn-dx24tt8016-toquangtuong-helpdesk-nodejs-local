import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
type Appearance = Theme | 'system';

function savedAppearance(): Appearance {
  const stored = localStorage.getItem('helpdesk.theme');
  return stored === 'dark' || stored === 'light' ? stored : 'system';
}

@Injectable({ providedIn: 'root' })
export class Preferences {
  private readonly systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.systemTheme.matches);
  readonly appearance = signal<Appearance>(savedAppearance());
  readonly theme = computed<Theme>(() => {
    const appearance = this.appearance();
    return appearance === 'system' ? (this.systemDark() ? 'dark' : 'light') : appearance;
  });
  readonly account = signal(Number(localStorage.getItem('tram-meo.account')) || 1);
  readonly reducedMotion = signal(localStorage.getItem('tram-meo.reduce-motion') === 'true');
  readonly notificationToasts = signal(
    localStorage.getItem('tram-meo.notification-toasts') !== 'off',
  );

  constructor() {
    const updateTheme = (event: MediaQueryListEvent) => this.systemDark.set(event.matches);
    this.systemTheme.addEventListener('change', updateTheme);
    inject(DestroyRef).onDestroy(() => this.systemTheme.removeEventListener('change', updateTheme));

    effect(() => {
      document.documentElement.dataset['theme'] = this.theme();
      localStorage.setItem('helpdesk.theme', this.appearance());
    });
    effect(() => {
      const reduced = this.reducedMotion();
      document.documentElement.classList.toggle('reduce-motion', reduced);
      localStorage.setItem('tram-meo.reduce-motion', String(reduced));
    });
    effect(() => localStorage.setItem('tram-meo.account', String(this.account())));
    effect(() =>
      localStorage.setItem(
        'tram-meo.notification-toasts',
        this.notificationToasts() ? 'on' : 'off',
      ),
    );
  }
}
