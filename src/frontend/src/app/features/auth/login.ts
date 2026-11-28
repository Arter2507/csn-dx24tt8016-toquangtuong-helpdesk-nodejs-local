import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Translate } from '../../core/i18n/i18n';
import { Session } from '../../core/auth/session';

@Component({
  imports: [FormsModule, Translate, RouterLink],
  template: `
    <div class="login-scene">
      <div class="login-composition page-content-enter">
        <div class="login-art" aria-hidden="true"><i class="bi bi-headset"></i></div>
        <form class="login-panel" (ngSubmit)="login()" #form="ngForm" aria-labelledby="login-title">
          <div class="login-brand">
            <span class="brand-mark">
              <i class="bi bi-headset" aria-hidden="true"></i>
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
            <label for="login-email">{{ 'login_identifier' | t }}</label>
            <input
              id="login-email"
              name="email"
              autocapitalize="none"
              spellcheck="false"
              autocomplete="username"
              required
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
            @if (checkingSession() || busy()) {
              <span class="activity-spinner" aria-hidden="true"></span>
            }
            {{ (checkingSession() ? 'checking_sign_in' : busy() ? 'signing_in' : 'sign_in') | t }}
          </button>
          <div class="iam-actions login-link">
            <a routerLink="/register" class="text-button">{{ 'register' | t }}</a>
            <a routerLink="/knowledge" class="text-button">{{ 'knowledge' | t }}</a>
          </div>
        </form>
      </div>
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
