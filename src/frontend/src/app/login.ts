import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Translate } from './i18n';
import { Session } from './session';

@Component({
  imports: [FormsModule, Translate, RouterLink],
  template: `
    <div class="login-composition">
      <div class="login-art" aria-hidden="true"></div>
      <form
        class="panel login-panel"
        (ngSubmit)="login()"
        #form="ngForm"
        aria-labelledby="login-title"
      >
        <div class="login-brand">
          <span class="brand-mark">
            <img src="mascot/it-support-mark.webp" alt="" width="40" height="40" />
          </span>
          <strong>{{ 'tr_m_m_o' | t }}</strong>
        </div>
        <div class="login-heading">
          <h1 id="login-title">{{ 'sign_in' | t }}</h1>
          <p class="muted">{{ 'sign_in_help' | t }}</p>
        </div>
        @if (sessionFailed()) {
          <div class="notice error login-connection" role="alert">
            <span>{{ 'sign_in_unavailable' | t }}</span>
            <button class="text-button" type="button" (click)="checkSession()">
              {{ 'try_again' | t }}
            </button>
          </div>
        } @else if (error()) {
          <p class="notice error" role="alert">{{ error() | t }}</p>
        }
        <div class="field">
          <label for="login-email">{{ 'email' | t }}</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autocomplete="username"
            required
            email
            [(ngModel)]="email"
          />
        </div>
        <div class="field">
          <label for="login-password">{{ 'password' | t }}</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            [(ngModel)]="password"
          />
        </div>
        <button
          class="primary"
          [disabled]="busy() || checkingSession() || sessionFailed() || form.invalid"
          type="submit"
        >
          {{ (checkingSession() ? 'checking_sign_in' : busy() ? 'signing_in' : 'sign_in') | t }}
        </button>
        <a routerLink="/register" class="text-button login-link">{{ 'register' | t }}</a>
      </form>
    </div>
  `,
})
export class Login {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly checkingSession = signal(false);
  readonly sessionFailed = signal(false);
  readonly error = signal('');
  email = '';
  password = '';

  constructor() {
    this.checkSession();
  }

  checkSession() {
    if (this.checkingSession()) return;
    this.checkingSession.set(true);
    this.sessionFailed.set(false);
    void this.session
      .initialize()
      .then(() => {
        if (this.session.mode() === 'demo' || this.session.account())
          void this.router.navigateByUrl(this.session.home);
      })
      .catch(() => this.sessionFailed.set(true))
      .finally(() => this.checkingSession.set(false));
  }

  login() {
    if (this.busy() || this.checkingSession() || this.sessionFailed()) return;
    this.busy.set(true);
    this.error.set('');
    this.session.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.password = '';
        void this.router.navigateByUrl(this.session.home);
      },
      error: (error) => {
        this.busy.set(false);
        this.error.set(
          error.status === 401
            ? 'invalid_credentials'
            : error.status === 429
              ? 'login_limit'
              : error.status === 0 || error.status >= 500
                ? 'sign_in_unavailable'
                : 'we_couldnt_load_your_data',
        );
      },
    });
  }
}
