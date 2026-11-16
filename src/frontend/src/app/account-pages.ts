import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { I18n, Translate, errorKey } from './i18n';
import { Loading } from './loading';
import { Preferences } from './preferences';
import { ApiResponse } from './features/categories/interfaces/category';
import { ticketStatuses, userRoles } from './features/workspace/workspace-labels';
import { WorkspaceService } from './features/workspace/workspace.service';
import { Row } from './features/workspace/workspace.types';

const readKey = 'tram-meo.seen-notifications';
const backupKey = 'tram-meo.last-backup';

@Component({
  imports: [DatePipe, FormsModule, RouterLink, Translate, Loading],
  templateUrl: './account-pages.html',
})
export class AccountPages implements OnInit {
  readonly page = input.required<'profile' | 'settings' | 'notifications' | 'backup'>();
  private readonly route = inject(ActivatedRoute);
  private readonly workspace = inject(WorkspaceService);
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  readonly i18n = inject(I18n);
  readonly preferences = inject(Preferences);
  readonly users = signal<Row[] | null>(null);
  readonly tickets = signal<Row[]>([]);
  readonly account = signal(this.preferences.account());
  readonly error = signal('');
  readonly feedback = signal('');
  readonly busy = signal(false);
  readonly unreadOnly = signal(false);
  readonly lastBackup = signal(localStorage.getItem(backupKey));
  readonly seen = signal(new Set((localStorage.getItem(readKey) ?? '').split(',').filter(Boolean)));
  name = '';
  email = '';
  readonly profile = computed(() => this.users()?.find((user) => user.id === this.account()));
  readonly updates = computed(() =>
    this.tickets()
      .filter(
        (row) => row['requesterId'] === this.account() || row['assigneeId'] === this.account(),
      )
      .sort(
        (a, b) =>
          String(b['updatedAt'] ?? '').localeCompare(String(a['updatedAt'] ?? '')) || b.id - a.id,
      )
      .map((row) => ({
        row,
        id: [this.account(), row.id, row['version'], row['updatedAt']].join(':'),
        assigned: row['assigneeId'] === this.account() && row['requesterId'] !== this.account(),
        status: ticketStatuses.find((item) => item.value === row['status']),
      })),
  );
  readonly unread = computed(() => this.updates().filter((update) => !this.seen().has(update.id)));
  readonly shown = computed(() => (this.unreadOnly() ? this.unread() : this.updates()));

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      this.selectAccount(Number(params.get('account')) || this.preferences.account());
    });
    if (this.page() !== 'backup') this.load();
  }

  load() {
    this.error.set('');
    forkJoin({
      users: this.workspace.listAll('users'),
      tickets:
        this.page() === 'notifications' ? this.workspace.listAll('tickets') : of([] as Row[]),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ users, tickets }) => {
          this.users.set(users.filter((user) => user['isActive']));
          this.tickets.set(tickets);
          if (this.page() === 'settings') {
            const available = this.users() ?? [];
            if (available[0] && !available.some((user) => user.id === this.preferences.account())) {
              this.preferences.account.set(available[0].id);
            }
          }
          this.syncProfile();
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  selectAccount(id: number) {
    this.account.set(id);
    this.feedback.set('');
    if (this.users()) this.error.set('');
    this.syncProfile();
  }

  private syncProfile() {
    this.name = String(this.profile()?.['fullName'] ?? '');
    this.email = String(this.profile()?.['email'] ?? '');
  }

  role(value: unknown) {
    return userRoles.find((item) => item.value === value)?.label;
  }

  saveProfile() {
    const row = this.profile();
    if (this.busy() || !row || !this.name.trim() || !this.email.trim()) return;
    this.busy.set(true);
    this.error.set('');
    this.feedback.set('');
    this.workspace
      .save('users', row.id, {
        fullName: this.name.trim(),
        email: this.email.trim(),
        role: row['role'],
        isActive: row['isActive'],
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => {
          this.users.update((users) =>
            (users ?? []).map((user) => (user.id === data.id ? data : user)),
          );
          this.busy.set(false);
          this.syncProfile();
          this.feedback.set('profile_saved');
        },
        error: (error) => {
          this.error.set(errorKey(error));
          this.busy.set(false);
        },
      });
  }

  unreadIds() {
    return this.unread().map((item) => item.id);
  }

  markRead(ids: string[]) {
    this.seen.update((seen) => new Set([...seen, ...ids]));
    localStorage.setItem(readKey, [...this.seen()].join(','));
  }

  downloadBackup() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.feedback.set('');
    this.http
      .get<ApiResponse<{ createdAt: string }>>('/api/v1/backups/snapshot')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => {
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
          );
          const link = document.createElement('a');
          link.href = url;
          link.download = 'tram-meo-' + data.createdAt.slice(0, 10) + '.json';
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          this.lastBackup.set(data.createdAt);
          localStorage.setItem(backupKey, data.createdAt);
          this.feedback.set('backup_downloaded');
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorKey(error));
          this.busy.set(false);
        },
      });
  }
}
