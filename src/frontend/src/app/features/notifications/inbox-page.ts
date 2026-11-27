import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18n, Translate, errorKey } from '../../core/i18n/i18n';
import { Session } from '../../core/auth/session';
import { WorkspaceService } from '../../shared/data/workspace.service';
import { Row } from '../../shared/data/workspace.types';
import { Loading } from '../../shared/ui/loading';
import { Notifications } from './notifications';

@Component({
  imports: [DatePipe, FormsModule, RouterLink, Translate, Loading],
  templateUrl: './inbox-page.html',
})
export class InboxPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspace = inject(WorkspaceService);
  private readonly destroy = inject(DestroyRef);
  readonly i18n = inject(I18n);
  readonly session = inject(Session);
  readonly inbox = inject(Notifications);
  readonly users = signal<Row[] | null>(null);
  readonly error = signal('');
  readonly unreadOnly = signal(false);
  readonly shown = computed(() => (this.unreadOnly() ? this.inbox.unread() : this.inbox.updates()));

  ngOnInit() {
    if (this.session.account()) this.inbox.refresh();
    else this.load();
  }

  load() {
    this.error.set('');
    this.workspace
      .listAll('users')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (users) => this.users.set(users.filter((user) => user['isActive'])),
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
