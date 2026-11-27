import { HttpClient } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../core/http/api-response';
import { ticketPriorities } from '../../shared/data/workspace-labels';
import { errorKey, Translate } from '../../core/i18n/i18n';
import { Loading } from '../../shared/ui/loading';
import { SettingsNav } from './settings-nav';

type Targets = Record<
  (typeof ticketPriorities)[number]['value'],
  { response: number; resolution: number }
>;
interface Policy {
  enabled: boolean;
  week: { start: string; end: string }[][];
  holidays: { date: string; name: string }[];
  rules: { STANDARD: Targets; VIP: Targets | null };
}

@Component({
  imports: [FormsModule, Loading, NgTemplateOutlet, RouterLink, SettingsNav, Translate],
  templateUrl: './sla-settings.html',
})
export class SlaSettings {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/v1/settings/sla';
  readonly days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  readonly priorities = ticketPriorities;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');
  policy: Policy | null = null;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<ApiResponse<Policy>>(this.url)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ data }) => (this.policy = data),
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  toggleVip(policy: Policy, enabled: boolean) {
    policy.rules.VIP = enabled ? structuredClone(policy.rules.STANDARD) : null;
  }

  save() {
    if (!this.policy || this.saving()) return;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');
    this.http
      .put<ApiResponse<Policy>>(this.url, this.policy)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: ({ data }) => {
          this.policy = data;
          this.saved.set(true);
        },
        error: (error) => this.error.set(error.status === 422 ? 'sla_invalid' : errorKey(error)),
      });
  }
}
