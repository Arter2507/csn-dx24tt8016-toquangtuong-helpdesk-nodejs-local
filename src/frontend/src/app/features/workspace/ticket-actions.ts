import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Session } from '../../core/auth/session';
import { Translate, errorKey } from '../../core/i18n/i18n';
import { WorkspaceService } from '../../shared/data/workspace.service';
import { Row, TicketDetails } from '../../shared/data/workspace.types';
import { ticketPriorities } from '../../shared/data/workspace-labels';

export function canEditTicket(ticket: Row & TicketDetails, session: Session) {
  const account = session.account();
  return (
    ticket['status'] !== 'CLOSED' &&
    !ticket.mergedInto &&
    (session.mode() === 'demo' ||
      (account?.id === ticket['requesterId'] &&
        Date.now() < Date.parse(String(ticket['createdAt'])) + 600_000))
  );
}

@Component({
  selector: 'app-ticket-actions',
  imports: [Translate, FormsModule],
  template: `
    <div class="iam-actions">
      @if (canAssign()) {
        <button class="secondary" type="button" (click)="openAssign()">
          {{ (canTriage() ? 'ticket_assign' : 'ticket_transfer') | t }}
        </button>
      }
      @if (canTriage()) {
        <button type="button" class="secondary" (click)="openPriority()">
          {{ 'ticket_update_priority' | t }}
        </button>
      }
      @for (action of available(); track action.label) {
        <button class="secondary" type="button" [disabled]="busy()" (click)="selectAction(action)">
          {{ action.label | t }}
        </button>
      }
    </div>
    @if (panel() !== 'assign' && suggested(); as name) {
      <p class="muted">{{ 'ticket_suggested_technician' | t: { name } }}</p>
    }
    @if (panel() === 'assign') {
      <form class="iam-actions ticket-action-form" (ngSubmit)="assign()">
        @if (loadingOptions()) {
          <span role="status">{{ 'loading' | t }}</span>
        } @else {
          <label class="field"
            >{{ 'technician_2' | t }}
            <select name="assigneeId" [(ngModel)]="assigneeId" [disabled]="busy()">
              @if (canTriage() && ticket()['status'] === 'NEW') {
                <option [ngValue]="null">{{ 'unassigned' | t }}</option>
              }
              @for (person of technicians(); track person.id) {
                <option [ngValue]="person.id">{{ person.fullName }}</option>
              }
            </select>
          </label>
          @if (technicians()[0]; as recommended) {
            <small class="muted">{{
              'ticket_suggested_technician' | t: { name: recommended.fullName }
            }}</small>
          }
          <button
            class="primary"
            type="submit"
            [disabled]="busy() || assigneeId === ticket()['assigneeId']"
          >
            {{ 'save_changes' | t }}
          </button>
        }
        <button class="text-button" type="button" [disabled]="busy()" (click)="panel.set(null)">
          {{ 'cancel' | t }}
        </button>
      </form>
    } @else if (panel() === 'priority') {
      <form class="ticket-action-form iam-actions" (ngSubmit)="save('priority', { priority })">
        <label class="field">
          {{ 'priority' | t }}
          <select name="priority" [(ngModel)]="priority">
            @for (item of priorities; track item.value) {
              <option [value]="item.value">{{ item.label | t }}</option>
            }
          </select>
        </label>
        <button
          class="primary"
          type="submit"
          [disabled]="busy() || priority === ticket()['priority']"
        >
          {{ 'save_changes' | t }}
        </button>
        <button class="text-button" type="button" (click)="panel.set(null)">
          {{ 'cancel' | t }}
        </button>
      </form>
    } @else if (panel() === 'note') {
      <form class="ticket-action-form field" (ngSubmit)="submitNote()">
        @if (selected?.target === 'RESOLVED') {
          <label class="field">
            {{ 'ticket_cause' | t }}
            <textarea name="cause" [(ngModel)]="cause" maxlength="800" required></textarea>
          </label>
        }
        <label for="ticket-action-note">{{
          (selected?.target === 'RESOLVED'
            ? 'ticket_solution'
            : selected?.target === 'IN_PROGRESS'
              ? 'ticket_reopen_reason'
              : 'request_more_information'
          ) | t
        }}</label>
        <textarea
          id="ticket-action-note"
          name="note"
          [(ngModel)]="note"
          maxlength="2000"
          required
        ></textarea>
        <div class="iam-actions">
          <button
            class="primary"
            type="submit"
            [disabled]="
              busy() || !note.trim() || (selected?.target === 'RESOLVED' && !cause.trim())
            "
          >
            {{ selected?.label | t }}
          </button>
          <button class="text-button" type="button" [disabled]="busy()" (click)="panel.set(null)">
            {{ 'cancel' | t }}
          </button>
        </div>
      </form>
    }
    @if (error()) {
      <p class="notice error" role="alert">{{ error() | t }}</p>
    }
  `,
})
export class TicketActions {
  readonly ticket = input.required<Row & TicketDetails>();
  readonly changed = output<Row & TicketDetails>();
  private readonly session = inject(Session);
  private readonly service = inject(WorkspaceService);
  readonly busy = signal(false);
  readonly loadingOptions = signal(false);
  readonly error = signal('');
  readonly panel = signal<'assign' | 'priority' | 'note' | null>(null);
  readonly technicians = signal<{ id: number; fullName: string }[]>([]);
  readonly suggested = signal('');
  assigneeId: number | null = null;
  note = '';
  cause = '';
  priority = '';
  readonly priorities = ticketPriorities;
  selected: { target: string; label: string } | null = null;
  readonly canTriage = computed(
    () =>
      this.session.hasRole('ADMIN') &&
      !this.ticket().mergedInto &&
      this.ticket()['status'] !== 'CLOSED',
  );
  readonly canAssign = computed(
    () =>
      this.canTriage() ||
      (this.session.hasRole('TECHNICIAN') &&
        this.session.account()?.id === this.ticket()['assigneeId'] &&
        !this.ticket().mergedInto &&
        !['RESOLVED', 'CLOSED'].includes(String(this.ticket()['status']))),
  );

  constructor() {
    effect((onCleanup) => {
      const ticket = this.ticket();
      this.suggested.set('');
      if (!this.canAssign() || ticket['status'] !== 'NEW' || ticket['assigneeId'] != null) return;
      const request = this.service.assignableTechnicians(Number(ticket['categoryId'])).subscribe({
        next: ({ data }) => this.suggested.set(data[0]?.fullName ?? ''),
        error: () => {},
      });
      onCleanup(() => request.unsubscribe());
    });
  }

  readonly available = computed(() => {
    const ticket = this.ticket();
    const account = this.session.account();
    if (ticket.mergedInto || !account) return [];
    const canHandle = this.session.hasRole('ADMIN') || account.id === ticket['assigneeId'];
    switch (ticket['status']) {
      case 'NEW':
        return canHandle && ticket['assigneeId']
          ? [{ target: 'IN_PROGRESS', label: 'ticket_start' }]
          : [];
      case 'IN_PROGRESS':
        return canHandle
          ? [
              { target: 'RESOLVED', label: 'ticket_resolve' },
              { target: 'PENDING_CUSTOMER', label: 'request_more_information' },
            ]
          : [];
      case 'PENDING_CUSTOMER':
        return canHandle ? [{ target: 'IN_PROGRESS', label: 'ticket_resume' }] : [];
      case 'RESOLVED':
        return account.id === ticket['requesterId']
          ? [
              { target: 'CLOSED', label: 'ticket_close' },
              { target: 'IN_PROGRESS', label: 'ticket_reopen' },
            ]
          : [];
      default:
        return [];
    }
  });

  openAssign() {
    this.error.set('');
    this.panel.set('assign');
    this.loadingOptions.set(true);
    this.technicians.set([]);
    const current = this.ticket()['assigneeId'];
    this.assigneeId = typeof current === 'number' ? current : null;
    this.service
      .assignableTechnicians(Number(this.ticket()['categoryId']), this.ticket().id)
      .pipe(finalize(() => this.loadingOptions.set(false)))
      .subscribe({
        next: ({ data }) => {
          this.technicians.set(data);
          if (this.ticket()['assigneeId'] == null) this.assigneeId = data[0]?.id ?? null;
        },
        error: (error) => {
          this.error.set(errorKey(error));
          this.panel.set(null);
        },
      });
  }

  selectAction(action: { target: string; label: string }) {
    this.error.set('');
    if (
      action.target === 'RESOLVED' ||
      action.target === 'PENDING_CUSTOMER' ||
      action.label === 'ticket_reopen'
    ) {
      this.selected = action;
      this.note = '';
      this.cause = '';
      this.panel.set('note');
    } else this.save('transitions', { toStatus: action.target });
  }

  submitNote() {
    if (!this.selected || !this.note.trim()) return;
    const toStatus = this.selected.target;
    if (toStatus === 'RESOLVED' && !this.cause.trim()) return;
    this.save('transitions', {
      toStatus,
      note: this.note.trim(),
      ...(toStatus === 'RESOLVED' ? { cause: this.cause.trim() } : {}),
    });
  }

  openPriority() {
    this.error.set('');
    this.priority = String(this.ticket()['priority']);
    this.panel.set('priority');
  }

  assign() {
    this.save('assignee', { assigneeId: this.assigneeId });
  }

  save(
    action: 'assignee' | 'transitions' | 'priority',
    data: Record<string, string | number | null>,
  ) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.service
      .ticketAction(this.ticket().id, Number(this.ticket()['version']), action, data)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: ({ data }) => {
          this.panel.set(null);
          this.changed.emit(data);
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }
}
