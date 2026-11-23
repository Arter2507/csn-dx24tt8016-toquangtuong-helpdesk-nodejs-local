import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18n, Translate, errorKey } from './i18n';
import { Loading } from './loading';
import { Session } from './session';
import { Notifications } from './notifications';
import { Preferences } from './preferences';
import { WorkspaceService } from './features/workspace/workspace.service';
import { Row } from './features/workspace/workspace.types';

@Component({
  imports: [DatePipe, FormsModule, RouterLink, Translate, Loading],
  templateUrl: './account-pages.html',
})
export class AccountPages implements OnInit {
  readonly page = input.required<'settings' | 'notifications'>();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly inbox = inject(Notifications);
  private readonly workspace = inject(WorkspaceService);
  private readonly destroy = inject(DestroyRef);
  readonly i18n = inject(I18n);
  readonly preferences = inject(Preferences);
  readonly session = inject(Session);
  readonly users = signal<Row[] | null>(null);
  readonly error = signal('');
  readonly unreadOnly = signal(false);
  readonly shown = computed(() => (this.unreadOnly() ? this.inbox.unread() : this.inbox.updates()));

  ngOnInit() {
    this.load();
  }

  load() {
    this.error.set('');
    const account = this.session.account();
    if (account) {
      if (this.page() === 'notifications') this.inbox.refresh();
      return;
    }
    this.workspace
      .listAll('users')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (users) => {
          const available = users.filter((user) => user['isActive']);
          this.users.set(available);
          if (
            this.page() === 'settings' &&
            available[0] &&
            !available.some((user) => user.id === this.preferences.account())
          ) {
            this.preferences.account.set(available[0].id);
          }
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  chooseNotificationAccount(id: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { account: id },
      replaceUrl: true,
    });
  }
}
