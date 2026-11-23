import { Session } from './session';
import { Loading } from './loading';
import { Translate, I18n } from './i18n';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ticketPriorities, ticketStatuses } from './features/workspace/workspace-labels';
import { WorkspaceService } from './features/workspace/workspace.service';
import { Row } from './features/workspace/workspace.types';

const vietnamDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const weekdayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const dateKey = (row: Row, field: string) => {
  const date = new Date(String(row[field] ?? ''));
  return Number.isFinite(date.getTime()) ? vietnamDay.format(date) : '';
};
const shiftDay = (key: string, offset: number) => {
  const date = new Date(key + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + offset);
  return vietnamDay.format(date);
};
const activeTicket = (row: Row) => row['status'] !== 'CLOSED';
const priorityRank = (row: Row) =>
  ticketPriorities.findIndex((item) => item.value === row['priority']);
const newest = (a: Row, b: Row) =>
  String(b['updatedAt'] ?? '').localeCompare(String(a['updatedAt'] ?? '')) || b.id - a.id;

@Component({
  imports: [Translate, Loading, RouterLink, NgTemplateOutlet],
  templateUrl: './role-dashboard.html',
})
export class RoleDashboard {
  readonly role = input.required<'technician' | 'user'>();
  readonly i18n = inject(I18n);
  private readonly workspace = inject(WorkspaceService);
  private readonly destroy = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  // Hai tài khoản cố định đến từ dữ liệu seed của API demo.
  readonly session = inject(Session);
  readonly technicianId = this.session.account()?.id ?? 2;
  readonly requesterId = signal(1);
  readonly today = vietnamDay.format(new Date());
  readonly selectedDay = signal(this.today);
  readonly userPeriod = signal<'day' | 'week'>('week');
  readonly data = signal<{ tickets: Row[]; users: Row[] } | null>(null);
  readonly error = signal(false);
  readonly note = signal('');
  readonly noteFeedback = signal('');
  readonly noteChanged = signal(false);

  readonly technician = computed(() => this.role() === 'technician');
  readonly account = computed(
    () =>
      this.session.account()?.id ?? (this.technician() ? this.technicianId : this.requesterId()),
  );
  readonly profile = computed(() => this.data()?.users.find((row) => row.id === this.account()));
  readonly scope = computed(() =>
    this.technician() ? { assigneeId: this.account() } : { requesterId: this.account() },
  );
  readonly tickets = computed(() => {
    const field = this.technician() ? 'assigneeId' : 'requesterId';
    return (this.data()?.tickets ?? [])
      .filter((ticket) => ticket[field] === this.account())
      .sort(newest);
  });
  readonly open = computed(() => this.tickets().filter(activeTicket));
  readonly waiting = computed(
    () => this.tickets().filter((row) => row['status'] === 'RESOLVED').length,
  );
  readonly processing = computed(
    () => this.tickets().filter((row) => row['status'] === 'IN_PROGRESS').length,
  );
  readonly techDay = computed(() =>
    this.tickets().filter((row) => dateKey(row, 'updatedAt') === this.selectedDay()),
  );
  readonly weekStart = computed(() => {
    const key = this.selectedDay();
    const weekday = new Date(key + 'T12:00:00Z').getUTCDay();
    return shiftDay(key, -((weekday + 6) % 7));
  });
  readonly week = computed(() =>
    weekdayNames.map((label, index) => {
      const date = shiftDay(this.weekStart(), index);
      return {
        label,
        date,
        count: this.tickets().filter((row) => dateKey(row, 'updatedAt') === date).length,
      };
    }),
  );
  readonly userStart = computed(() => {
    if (this.userPeriod() === 'day') return this.today;
    const weekday = new Date(this.today + 'T12:00:00Z').getUTCDay();
    return shiftDay(this.today, -((weekday + 6) % 7));
  });
  readonly userRows = computed(() =>
    this.tickets()
      .filter((row) => {
        const date = dateKey(row, 'createdAt');
        return date >= this.userStart() && date <= this.today;
      })
      .sort((a, b) => b.id - a.id)
      .slice(0, 8),
  );
  readonly priorityRows = computed(() =>
    [...this.open()].sort((a, b) => priorityRank(b) - priorityRank(a) || newest(a, b)).slice(0, 5),
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      this.requesterId.set(
        params.get('account') === String(this.technicianId) ? this.technicianId : 1,
      );
    });
    try {
      this.note.set(localStorage.getItem('tram-meo:notes:' + this.technicianId) ?? '');
    } catch {
      this.noteFeedback.set('your_browser_is_blocking_note_storage');
    }
    this.load();
  }

  load() {
    this.error.set(false);
    forkJoin({ tickets: this.workspace.listAll('tickets'), users: this.workspace.listAll('users') })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => this.data.set(data),
        error: () => this.error.set(true),
      });
  }

  shortDate(date: string) {
    return date.slice(8) + '/' + date.slice(5, 7);
  }
  moveWeek(offset: number) {
    this.selectedDay.update((date) => shiftDay(date, offset * 7));
  }
  status(value: unknown) {
    return ticketStatuses.find((item) => item.value === value);
  }
  priority(value: unknown) {
    return ticketPriorities.find((item) => item.value === value);
  }

  setNote(value: string) {
    this.note.set(value);
    this.noteChanged.set(true);
    this.noteFeedback.set('');
  }

  saveNote() {
    try {
      localStorage.setItem('tram-meo:notes:' + this.technicianId, this.note());
      this.noteChanged.set(false);
      this.noteFeedback.set('saved_in_this_browser');
    } catch {
      this.noteFeedback.set('we_couldnt_save_your_note_in_this_browser');
    }
  }
}
