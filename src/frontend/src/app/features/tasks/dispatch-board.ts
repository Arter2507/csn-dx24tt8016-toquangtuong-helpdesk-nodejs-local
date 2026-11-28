import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { auditTime, finalize, forkJoin, merge, timer } from 'rxjs';
import { Translate, errorKey } from '../../core/i18n/i18n';
import { WorkspaceService } from '../../shared/data/workspace.service';
import { ticketReference, ticketStatuses } from '../../shared/data/workspace-labels';
import { Row } from '../../shared/data/workspace.types';
import { Notifications } from '../notifications/notifications';
import { QuickTicket } from '../workspace/quick-ticket';

@Component({
  selector: 'app-dispatch-board',
  imports: [DatePipe, Translate, QuickTicket],
  template: `
    <section aria-labelledby="dispatch-title">
      <div class="section-heading">
        <h2 id="dispatch-title">{{ 'tasks_dispatch' | t }}</h2>
        <button type="button" class="secondary" [disabled]="busy()" (click)="load()">
          <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>{{ 'refresh_data' | t }}
        </button>
      </div>
      @if (error()) {
        <p class="notice error" role="alert">{{ error() | t }}</p>
      }
      @if (busy() && !rows().length) {
        <p role="status">{{ 'loading' | t }}</p>
      }
      <app-quick-ticket #preview [names]="names()" [scope]="{}" (changed)="replace($event)" />
      <div class="task-board dispatch-board">
        @for (column of columns(); track column.label) {
          <section class="panel task-column" [attr.data-status]="column.tone">
            <header>
              <h3>{{ column.label | t }}</h3>
              <span class="badge">{{ column.rows.length }}</span>
            </header>
            @for (row of column.rows; track row.id) {
              <button class="task-card dispatch-card" type="button" (click)="preview.open(row.id)">
                <small class="ticket-code">{{ reference(row) }}</small>
                <strong>{{ row['title'] }}</strong>
                <small
                  >{{ status(row) | t }} ·
                  {{ names().get(+(row['assigneeId'] ?? 0)) ?? ('unassigned' | t) }}</small
                >
                @if (row['resolutionDueAt'] && row['status'] !== 'CLOSED') {
                  <small
                    >{{ 'sla_resolution_due' | t }}
                    {{ '' + row['resolutionDueAt'] | date: 'dd/MM HH:mm' : '+0700' }}</small
                  >
                }
              </button>
            } @empty {
              <p class="muted">{{ 'no_matching_results' | t }}</p>
            }
          </section>
        }
      </div>
    </section>
  `,
})
export class DispatchBoard {
  private readonly workspace = inject(WorkspaceService);
  private readonly destroy = inject(DestroyRef);
  private readonly notifications = inject(Notifications);
  readonly rows = signal<Row[]>([]);
  readonly names = signal(new Map<number, string>());
  readonly busy = signal(false);
  readonly error = signal('');
  readonly reference = ticketReference;
  readonly columns = computed(() => {
    const rows = [...this.rows()].sort((a, b) => b.id - a.id);
    return [
      {
        label: 'unassigned',
        tone: 'TODO',
        rows: rows.filter((row) => row['status'] === 'NEW' && !row['assigneeId']),
      },
      {
        label: 'dispatch_assigned',
        tone: 'DOING',
        rows: rows.filter((row) => row['status'] === 'NEW' && row['assigneeId']),
      },
      {
        label: 'tasks_status_DOING',
        tone: 'DOING',
        rows: rows.filter((row) =>
          ['IN_PROGRESS', 'PENDING_CUSTOMER'].includes(String(row['status'])),
        ),
      },
      {
        label: 'tasks_status_DONE',
        tone: 'DONE',
        rows: rows.filter((row) => ['RESOLVED', 'CLOSED'].includes(String(row['status']))),
      },
    ];
  });
  private loadAgain = false;

  constructor() {
    merge(this.notifications.ticketChanges, timer(30000, 30000))
      .pipe(auditTime(200), takeUntilDestroyed(this.destroy))
      .subscribe(() => this.load());
    this.load();
  }

  status(row: Row) {
    return ticketStatuses.find((item) => item.value === row['status'])?.label ?? '';
  }

  replace(row: Row) {
    this.rows.update((rows) => rows.map((item) => (item.id === row.id ? row : item)));
  }

  load() {
    if (this.busy()) {
      this.loadAgain = true;
      return;
    }
    this.busy.set(true);
    this.error.set('');
    forkJoin({ rows: this.workspace.listAll('tickets'), people: this.workspace.listAll('users') })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          this.busy.set(false);
          if (this.loadAgain && !this.destroy.destroyed) {
            this.loadAgain = false;
            this.load();
          }
        }),
      )
      .subscribe({
        next: ({ rows, people }) => {
          this.rows.set(rows);
          this.names.set(new Map(people.map((person) => [person.id, String(person['fullName'])])));
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }
}
