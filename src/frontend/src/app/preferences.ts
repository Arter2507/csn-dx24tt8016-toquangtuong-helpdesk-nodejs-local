import { effect, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class Preferences {
  readonly theme = signal<Theme>(localStorage.getItem('helpdesk.theme') === 'dark' ? 'dark' : 'light');
  readonly account = signal(Number(localStorage.getItem('tram-meo.account')) || 1);
  readonly reducedMotion = signal(localStorage.getItem('tram-meo.reduce-motion') === 'true');

  constructor() {
    effect(() => {
      const theme = this.theme();
      document.documentElement.dataset['theme'] = theme;
      localStorage.setItem('helpdesk.theme', theme);
    });
    effect(() => {
      const reduced = this.reducedMotion();
      document.documentElement.classList.toggle('reduce-motion', reduced);
      localStorage.setItem('tram-meo.reduce-motion', String(reduced));
    });
    effect(() => localStorage.setItem('tram-meo.account', String(this.account())));
  }
}
