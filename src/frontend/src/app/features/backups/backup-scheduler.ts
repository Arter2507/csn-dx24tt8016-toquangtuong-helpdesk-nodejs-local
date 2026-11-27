import { HttpClient, HttpContext } from '@angular/common/http';
import { computed, effect, inject, Injectable } from '@angular/core';
import { catchError, EMPTY, exhaustMap, fromEvent, merge, Subject, timer } from 'rxjs';
import { ApiResponse } from '../../core/http/api-response';
import { silentRequest } from '../../core/http/network-progress';
import { Session } from '../../core/auth/session';

export interface BackupJob {
  id: string;
  kind: 'manual' | 'automatic' | 'pre_restore';
  status: 'queued' | 'collecting' | 'packing' | 'completed' | 'failed';
  createdAt: string;
  finishedAt: string | null;
  size: number | null;
  error: string | null;
}

export const backupsUrl = '/api/v1/backups';

@Injectable({ providedIn: 'root' })
export class BackupScheduler {
  private readonly session = inject(Session);
  private readonly http = inject(HttpClient);
  private readonly check = new Subject<void>();
  readonly started = new Subject<void>();
  private readonly activeAccount = computed(() =>
    this.session.mode() === 'demo'
      ? 0
      : this.session.hasRole('OWNER')
        ? this.session.account()?.id
        : null,
  );

  constructor() {
    effect((onCleanup) => {
      const account = this.activeAccount();
      if (account == null) return;
      const subscription = merge(
        timer(0, 30_000),
        fromEvent(document, 'visibilitychange'),
        this.check,
      )
        .pipe(
          exhaustMap(() =>
            this.http
              .post<ApiResponse<BackupJob> | null>(
                backupsUrl + '/schedule/check',
                {},
                {
                  context: new HttpContext().set(silentRequest, true),
                },
              )
              .pipe(catchError(() => EMPTY)),
          ),
        )
        .subscribe((result) => {
          if (result?.data) this.started.next();
        });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  checkNow() {
    this.check.next();
  }
}
