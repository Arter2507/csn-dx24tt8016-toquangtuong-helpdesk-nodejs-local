import { DatePipe } from '@angular/common';
import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Translate, errorKey } from '../../core/i18n/i18n';
import { Session } from '../../core/auth/session';
import { WorkspaceService } from '../../shared/data/workspace.service';
import {
  ticketReference,
  ticketStatuses,
  ticketPriorities,
} from '../../shared/data/workspace-labels';
import { Row, TicketDetails } from '../../shared/data/workspace.types';
import { Loading } from '../../shared/ui/loading';
import { TicketActions, canEditTicket } from './ticket-actions';

@Component({
  selector: 'app-quick-ticket',
  imports: [DatePipe, RouterLink, Translate, Loading, TicketActions],
  templateUrl: './quick-ticket.html',
})
export class QuickTicket {
  readonly names = input.required<Map<number, string>>();
  readonly scope = input.required<Record<string, string | null>>();
  readonly changed = output<Row & TicketDetails>();
  private readonly service = inject(WorkspaceService);
  private readonly session = inject(Session);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly ticket = signal<(Row & TicketDetails) | null>(null);
  readonly history = signal<
    { id: number; type: string; note: string | null; actorName: string; createdAt: string }[]
  >([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly historyError = signal('');
  readonly reference = ticketReference;
  private request = 0;
  secured() {
    return this.session.mode() === 'mysql';
  }
  canEdit(row: Row & TicketDetails) {
    return canEditTicket(row, this.session);
  }
  status(value: unknown) {
    return ticketStatuses.find((status) => status.value === value)?.label;
  }
  priority(value: unknown) {
    return ticketPriorities.find((priority) => priority.value === value)?.label;
  }

  open(id: number) {
    this.reset();
    const request = this.request;
    this.dialog().nativeElement.showModal();
    this.busy.set(true);
    this.service.find('tickets', String(id)).subscribe({
      next: ({ data }) => {
        if (request === this.request) {
          this.ticket.set(data);
          this.busy.set(false);
        }
      },
      error: (error) => {
        if (request === this.request) {
          this.error.set(errorKey(error));
          this.busy.set(false);
        }
      },
    });
    this.loadHistory(id, request);
  }

  update(row: Row & TicketDetails) {
    this.ticket.set(row);
    this.changed.emit(row);
    this.loadHistory(row.id, this.request);
  }

  private loadHistory(id: number, request: number) {
    if (!this.secured()) return;
    this.service.ticketHistory(id).subscribe({
      next: ({ data }) => {
        if (request === this.request) this.history.set(data.slice(-6).reverse());
      },
      error: (error) => {
        if (request === this.request) this.historyError.set(errorKey(error));
      },
    });
  }

  reset() {
    this.request++;
    this.ticket.set(null);
    this.history.set([]);
    this.error.set('');
    this.historyError.set('');
  }
}
