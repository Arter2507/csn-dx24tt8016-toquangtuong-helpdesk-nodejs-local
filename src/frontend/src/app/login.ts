import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Translate } from './i18n';
import { Session } from './session';

@Component({
  imports: [FormsModule, Translate],
  template: `
    <form class="panel editor login-panel" (ngSubmit)="login()" #form="ngForm">
      <h1>{{ 'sign_in' | t }}</h1>
      <p class="muted">{{ 'sign_in_help' | t }}</p>
      @if (error()) {
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
      <button class="primary" [disabled]="busy() || form.invalid" type="submit">
        {{ 'sign_in' | t }}
      </button>
    </form>
  `,
})
export class Login {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  email = '';
  password = '';

  constructor() {
    void this.session
      .initialize()
      .then(() => {
        if (this.session.mode() === 'demo' || this.session.account())
          void this.router.navigateByUrl(this.session.home);
      })
      .catch(() => this.error.set('we_couldnt_load_your_data'));
  }

  login() {
    if (this.busy()) return;
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
              : 'we_couldnt_load_your_data',
        );
      },
    });
  }
}
