import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, EMPTY, exhaustMap, finalize, merge, Subject, timer } from 'rxjs';
import { ApiResponse } from './features/categories/interfaces/category';
import { Translate, errorKey } from './i18n';
import { silentRequest } from './loading';
import { BackupJob, BackupScheduler, backupsUrl as url } from './backup-scheduler';

interface ScheduleOptions {
  enabled: boolean;
  intervalMinutes: number;
}

interface Schedule extends ScheduleOptions {
  nextAt: string | null;
}

interface BackupIndex {
  jobs: BackupJob[];
  schedule: Schedule;
}

@Component({
  imports: [DatePipe, DecimalPipe, FormsModule, Translate],
  templateUrl: './backups.html',
})
export class BackupPage {
  private readonly http = inject(HttpClient);
  private readonly scheduler = inject(BackupScheduler);
  private readonly destroy = inject(DestroyRef);
  private readonly refreshRequests = new Subject<void>();
  readonly index = signal<BackupIndex | null>(null);
  readonly draft = signal<ScheduleOptions | null>(null);
  readonly schedule = computed(() => this.draft() ?? this.index()?.schedule);
  readonly working = computed(() =>
    this.index()?.jobs.find((job) => ['queued', 'collecting', 'packing'].includes(job.status)),
  );
  readonly lastSuccess = computed(() =>
    this.index()?.jobs.find((job) => job.status === 'completed'),
  );
  readonly pending = signal(false);
  readonly selectedRestore = signal<BackupJob | null>(null);
  readonly restoreStatus = signal('');
  readonly restoring = signal(false);
  private readonly restoreDialog = viewChild<ElementRef<HTMLDialogElement>>('restoreDialog');
  readonly systemError = signal(false);
  readonly actionError = signal(false);
  readonly saved = signal(false);
  readonly intervals = [30, 60, 180, 360, 1440];

  constructor() {
    merge(timer(0, 2000), this.refreshRequests, this.scheduler.started)
      .pipe(
        exhaustMap(() =>
          this.http
            .get<ApiResponse<BackupIndex>>(url, {
              context: new HttpContext().set(silentRequest, true),
            })
            .pipe(
              catchError(() => {
                this.systemError.set(true);
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(({ data }) => {
        this.index.set(data);
        this.systemError.set(false);
      });
  }

  setEnabled(enabled: boolean) {
    const schedule = this.schedule();
    if (schedule) this.draft.set({ enabled, intervalMinutes: schedule.intervalMinutes });
    this.saved.set(false);
  }

  setInterval(intervalMinutes: number) {
    const schedule = this.schedule();
    if (schedule) this.draft.set({ enabled: schedule.enabled, intervalMinutes });
    this.saved.set(false);
  }

  saveSchedule() {
    const schedule = this.draft();
    if (!schedule || this.pending()) return;
    this.pending.set(true);
    this.actionError.set(false);
    this.http
      .put<ApiResponse<Schedule>>(url + '/schedule', schedule)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: ({ data }) => {
          this.index.update((index) => (index ? { ...index, schedule: data } : index));
          this.draft.set(null);
          this.saved.set(true);
          if (data.enabled) this.scheduler.checkNow();
        },
        error: () => this.actionError.set(true),
      });
  }

  start() {
    if (this.pending() || this.working()) return;
    this.pending.set(true);
    this.actionError.set(false);
    this.http
      .post<ApiResponse<BackupJob>>(url, {})
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: ({ data }) => {
          this.index.update((index) =>
            index
              ? {
                  ...index,
                  jobs: index.jobs.some((job) => job.id === data.id)
                    ? index.jobs
                    : [data, ...index.jobs],
                }
              : index,
          );
          this.refresh();
        },
        error: () => this.actionError.set(true),
      });
  }

  askRestore(job: BackupJob) {
    this.selectedRestore.set(job);
    this.restoreStatus.set('');
    this.restoreDialog()?.nativeElement.showModal();
  }

  cancelRestore() {
    if (!this.restoring()) this.restoreDialog()?.nativeElement.close();
  }

  restore() {
    const job = this.selectedRestore();
    if (!job || this.restoring()) return;
    this.restoring.set(true);
    this.restoreStatus.set('backup_restoring');
    this.restoreDialog()?.nativeElement.close();
    this.http
      .post(url + '/' + encodeURIComponent(job.id) + '/restore', { confirmed: true })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.restoring.set(false)),
      )
      .subscribe({
        next: () => {
          this.restoreStatus.set('backup_restored');
          this.refresh();
        },
        error: (error) => {
          this.restoreStatus.set(errorKey(error));
          this.refresh();
        },
      });
  }

  refresh() {
    this.refreshRequests.next();
  }

  downloadUrl(id: string) {
    return url + '/' + encodeURIComponent(id) + '/download';
  }
}
