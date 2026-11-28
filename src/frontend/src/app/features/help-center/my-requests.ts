import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { auditTime, catchError, merge, of, Subject, switchMap, tap } from 'rxjs';
import { Session } from '../../core/auth/session';
import { PageMeta } from '../../core/http/api-response';
import { Translate, errorKey } from '../../core/i18n/i18n';
import { Preferences } from '../../core/preferences/preferences';
import { ticketReference, ticketStatuses } from '../../shared/data/workspace-labels';
import { WorkspaceService } from '../../shared/data/workspace.service';
import { Row } from '../../shared/data/workspace.types';
import { Loading } from '../../shared/ui/loading';
import { Notifications } from '../notifications/notifications';

@Component({
  imports: [DatePipe, FormsModule, RouterLink, Translate, Loading],
  templateUrl: './my-requests.html',
})
export class MyRequests implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspace = inject(WorkspaceService);
  private readonly session = inject(Session);
  private readonly preferences = inject(Preferences);
  private readonly notifications = inject(Notifications);
  private readonly destroy = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  readonly rows = signal<Row[]>([]);
  readonly pagination = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly statuses = ticketStatuses;
  readonly ticketReference = ticketReference;
  readonly status = (value: unknown) => ticketStatuses.find((entry) => entry.value === value);
  search = '';
  filter = '';

  ngOnInit() {
    merge(
      this.route.queryParamMap.pipe(
        tap((params) => {
          this.search = (params.get('q') ?? '').slice(0, 100);
          const status = params.get('status') ?? '';
          this.filter = ticketStatuses.some((entry) => entry.value === status) ? status : '';
          this.loading.set(true);
        }),
      ),
      this.notifications.ticketChanges.pipe(auditTime(150)),
      this.reload,
    )
      .pipe(
        switchMap(() => {
          this.error.set('');
          const page = Number(this.route.snapshot.queryParamMap.get('page'));
          return this.workspace
            .list('tickets', {
              requesterId: this.session.account()?.id ?? this.preferences.account(),
              page: Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1,
              pageSize: 9,
              search: this.search.trim(),
              filter: this.filter,
              sortBy: 'id',
              sortOrder: 'desc',
            })
            .pipe(
              catchError((error) => {
                this.error.set(errorKey(error));
                return of(null);
              }),
            );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((result) => {
        this.rows.set(result?.data ?? []);
        this.pagination.set(result?.meta ?? null);
        this.loading.set(false);
      });
  }

  applyFilters() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.search.trim() || null, status: this.filter || null },
    });
  }

  retry() {
    this.loading.set(true);
    this.reload.next();
  }
}
