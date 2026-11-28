import { HttpClient } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Session } from '../../core/auth/session';
import { Translate, errorKey } from '../../core/i18n/i18n';

@Component({
  imports: [FormsModule, RouterLink, Translate],
  template: `
    <div class="login-scene">
      <div class="login-composition">
        <div class="login-art" aria-hidden="true"></div>
        <section class="login-panel">
          <h1>{{ (resetting() ? 'reset_password' : 'forgot_password') | t }}</h1>
          @if (complete()) {
            <p class="notice success" role="status">
              {{ (resetting() ? 'recovery_complete' : 'recovery_email_sent') | t }}
            </p>
          } @else if (resetting() && !validToken) {
            <p class="notice error" role="alert">{{ 'api_PASSWORD_RESET_INVALID' | t }}</p>
            <a class="secondary" routerLink="/forgot-password">{{ 'forgot_password' | t }}</a>
          } @else {
            <form class="field" #recoveryForm="ngForm" (ngSubmit)="submit()">
              @if (resetting()) {
                <label class="field"
                  >{{ 'new_password' | t }}
                  <input
                    type="password"
                    name="password"
                    [(ngModel)]="password"
                    autocomplete="new-password"
                    minlength="12"
                    maxlength="72"
                    required
                  />
                </label>
                <label class="field"
                  >{{ 'confirm_password' | t }}
                  <input
                    type="password"
                    name="confirmed"
                    [(ngModel)]="confirmed"
                    autocomplete="new-password"
                    minlength="12"
                    maxlength="72"
                    required
                  />
                </label>
              } @else {
                <label class="field"
                  >{{ 'email' | t }}
                  <input
                    type="email"
                    name="email"
                    [(ngModel)]="email"
                    autocomplete="email"
                    maxlength="254"
                    email
                    required
                  />
                </label>
              }
              <button class="primary" type="submit" [disabled]="busy() || recoveryForm.invalid">
                {{ (resetting() ? 'reset_password' : 'send_recovery_email') | t }}
              </button>
              @if (error()) {
                <p class="notice error" role="alert">{{ error() | t }}</p>
              }
            </form>
          }
          <a class="text-button" routerLink="/login">{{ 'back_to_login' | t }}</a>
        </section>
      </div>
    </div>
  `,
})
export class PasswordRecovery {
  readonly resetting = input(false);
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);
  private readonly token =
    new URLSearchParams(inject(ActivatedRoute).snapshot.fragment ?? '').get('token') ?? '';
  readonly validToken = /^[a-f0-9]{64}$/.test(this.token);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly complete = signal(false);
  email = '';
  password = '';
  confirmed = '';

  submit() {
    const reset = this.resetting();
    if (this.busy()) return;
    if (reset && this.password !== this.confirmed) {
      this.error.set('password_mismatch');
      return;
    }
    this.error.set('');
    this.busy.set(true);
    this.http
      .post(
        '/api/v1/auth/' + (reset ? 'reset-password' : 'forgot-password'),
        reset ? { token: this.token, password: this.password } : { email: this.email.trim() },
      )
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.password = this.confirmed = '';
          if (reset) this.session.expired(false);
          this.complete.set(true);
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }
}
