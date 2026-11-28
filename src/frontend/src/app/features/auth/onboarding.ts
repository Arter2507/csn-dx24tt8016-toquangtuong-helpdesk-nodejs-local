import { HttpClient } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { errorKey, Translate } from '../../core/i18n/i18n';
import { Session } from '../../core/auth/session';

@Component({
  imports: [FormsModule, RouterLink, Translate],
  templateUrl: './onboarding.html',
})
export class Onboarding {
  readonly mode = input.required<'register' | 'activate' | 'pending'>();
  private readonly session = inject(Session);
  private readonly http = inject(HttpClient);
  readonly token =
    new URLSearchParams(inject(ActivatedRoute).snapshot.fragment ?? '').get('token') ?? '';
  readonly validToken = /^[a-f0-9]{64}$/.test(this.token);
  readonly busy = signal(false);
  readonly completed = signal(false);
  readonly error = signal('');
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';

  submit() {
    if (this.busy()) return;
    if (this.mode() === 'register' && this.password !== this.confirmPassword) {
      this.error.set('password_mismatch');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const activation = this.mode() === 'activate';
    const request = activation
      ? { token: this.token, password: this.password }
      : {
          fullName: this.fullName.trim(),
          email: this.email.trim(),
          password: this.password,
        };
    this.http
      .post('/api/v1/auth/' + this.mode(), request)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.password = '';
          this.confirmPassword = '';
          this.completed.set(true);
        },
        error: (error) => this.error.set(errorKey(error, 'sign_in_unavailable')),
      });
  }

  signOut() {
    this.busy.set(true);
    this.error.set('');
    this.session
      .logout()
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        error: (error) => this.error.set(errorKey(error, 'sign_in_unavailable')),
      });
  }
}
