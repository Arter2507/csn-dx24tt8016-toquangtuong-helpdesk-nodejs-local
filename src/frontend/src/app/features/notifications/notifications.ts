import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, fromEvent, merge, Subject, switchMap, timeout, timer } from 'rxjs';
import { ApiResponse } from '../../core/http/api-response';
import { ticketStatuses } from '../../shared/data/workspace-labels';
import { silentRequest } from '../../core/http/network-progress';
import { Preferences } from '../../core/preferences/preferences';
import { Session } from '../../core/auth/session';

interface NotificationRecord {
  id: string | number;
  ticketId: number | null;
  type: string;
  title: string;
  status: string;
  readAt: string | null;
  createdAt: string;
  assigned?: boolean;
}

const readKey = 'tram-meo.seen-notifications';
const inboxUrl = '/api/v1/notifications';

export function notificationLabel(item: NotificationRecord) {
  if (item.type === 'COMMENT_ADDED') return 'notification_comment';
  if (item.type === 'SLA_RESPONSE_DUE') return 'notification_sla_response';
  if (item.type === 'SLA_RESOLUTION_DUE') return 'notification_sla_resolution';
  if (['ASSIGNEE_CHANGED', 'ASSIGNED'].includes(item.type)) return 'notification_assigned';
  return (
    ticketStatuses.find((status) => status.value === item.status)?.label ??
    'notification_ticket_update'
  );
}

@Injectable({ providedIn: 'root' })
export class Notifications {
  private readonly http = inject(HttpClient);
  private readonly preferences = inject(Preferences);
  private readonly session = inject(Session);
  private readonly refreshRequests = new Subject<void>();
  private readonly records = signal<NotificationRecord[]>([]);
  private readonly demoRead = signal(
    new Set((localStorage.getItem(readKey) ?? '').split(',').filter(Boolean)),
  );
  private readonly confirmedRead = signal(new Set<string>());
  private readonly activeSource = computed(() => {
    if (this.session.mode() === 'demo') return 'demo:' + this.demoAccount();
    const account = this.session.account();
    return account?.organizationId ? 'mysql:' + account.id : null;
  });

  readonly demoScope = signal<number | null>(null);
  readonly demoAccount = computed(() => this.demoScope() ?? this.preferences.account());
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly readFailed = signal(false);
  readonly saving = signal(false);
  readonly toasts = signal<NotificationRecord[]>([]);
  readonly updates = computed(() =>
    this.records().map((item) => ({
      ...item,
      id: String(item.id),
      label: notificationLabel(item),
      read:
        Boolean(item.readAt) ||
        this.confirmedRead().has(String(item.id)) ||
        (this.session.mode() === 'demo' && this.demoRead().has(String(item.id))),
    })),
  );
  readonly unread = computed(() => this.updates().filter((item) => !item.read));

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly received = new Set<string>();

  constructor() {
    effect((onCleanup) => {
      const source = this.activeSource();
      this.records.set([]);
      this.confirmedRead.set(new Set());
      this.clearToasts();
      this.received.clear();
      this.initialized = false;
      this.failed.set(false);
      this.readFailed.set(false);
      this.saving.set(false);
      this.loading.set(Boolean(source));
      if (!source) return;

      const demo = source.startsWith('demo:');
      const params = demo ? new HttpParams().set('account', source.slice(5)) : new HttpParams();
      const streamChanges = new Subject<void>();
      let stream: EventSource | undefined;
      let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
      let reconnectAfter = 0;
      const connect = () => {
        if (demo || stream || Date.now() < reconnectAfter || !('EventSource' in window)) return;
        stream = new EventSource(inboxUrl + '/stream');
        stream.addEventListener('inbox', () => streamChanges.next());
        stream.onerror = () => {
          reconnectAfter = Date.now() + 3000;
          stream?.close();
          stream = undefined;
          streamChanges.next();
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => streamChanges.next(), 3100);
        };
      };
      const subscription = merge(
        timer(0, demo ? 15000 : 30000),
        streamChanges,
        fromEvent(window, 'focus'),
        fromEvent(document, 'visibilitychange'),
        this.refreshRequests,
      )
        .pipe(
          switchMap(() => {
            if (demo && document.visibilityState === 'hidden') return EMPTY;
            return this.http
              .get<ApiResponse<NotificationRecord[]>>(inboxUrl, {
                params,
                context: new HttpContext().set(silentRequest, true),
              })
              .pipe(
                timeout(10000),
                catchError(() => {
                  this.failed.set(true);
                  this.loading.set(false);
                  return EMPTY;
                }),
              );
          }),
        )
        .subscribe(({ data }) => {
          if (source !== this.activeSource()) return;
          this.accept(data);
          connect();
        });
      onCleanup(() => {
        subscription.unsubscribe();
        stream?.close();
        clearTimeout(reconnectTimer);
        this.clearTimers();
      });
    });
  }

  private accept(items: NotificationRecord[]) {
    const first = !this.initialized;
    const seen = this.session.mode() === 'demo' ? this.demoRead() : this.confirmedRead();
    if (!first && this.preferences.notificationToasts()) {
      const fresh = items.filter(
        (item) => !item.readAt && !seen.has(String(item.id)) && !this.received.has(String(item.id)),
      );
      for (const item of fresh.slice(0, 3).reverse()) this.showToast(item);
    }
    this.received.clear();
    for (const item of items) this.received.add(String(item.id));
    this.initialized = true;
    this.records.set(items);
    this.loading.set(false);
    this.failed.set(false);
  }

  private initialized = false;

  refresh() {
    this.refreshRequests.next();
  }

  ticketQuery(item: NotificationRecord) {
    if (this.session.mode() !== 'demo') return null;
    return item.assigned ? { assigneeId: this.demoAccount() } : { requesterId: this.demoAccount() };
  }

  readAll() {
    this.markRead(this.unread().map((item) => item.id));
  }

  markRead(ids: string[]) {
    const source = this.activeSource();
    if (!ids.length || !source || this.saving()) return;
    this.readFailed.set(false);
    if (source.startsWith('demo:')) {
      const seen = [...new Set([...this.demoRead(), ...ids])].slice(-500);
      this.demoRead.set(new Set(seen));
      localStorage.setItem(readKey, seen.join(','));
      return;
    }
    this.saving.set(true);
    this.http.patch<void>(inboxUrl + '/read', { ids: ids.map(Number) }).subscribe({
      next: () => {
        if (source !== this.activeSource()) return;
        this.confirmedRead.update((previous) => new Set([...previous, ...ids]));
        this.saving.set(false);
        this.refresh();
      },
      error: () => {
        if (source !== this.activeSource()) return;
        this.readFailed.set(true);
        this.saving.set(false);
      },
    });
  }

  private showToast(item: NotificationRecord) {
    const next = [item, ...this.toasts()];
    for (const removed of next.slice(3)) this.pauseToast(removed.id);
    this.toasts.set(next.slice(0, 3));
    this.resumeToast(item.id);
  }

  pauseToast(id: string | number) {
    clearTimeout(this.timers.get(String(id)));
    this.timers.delete(String(id));
  }

  resumeToast(id: string | number) {
    this.pauseToast(id);
    this.timers.set(
      String(id),
      setTimeout(() => this.dismissToast(id), 7000),
    );
  }

  dismissToast(id: string | number) {
    this.pauseToast(id);
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  clearToasts() {
    this.clearTimers();
    this.toasts.set([]);
  }

  private clearTimers() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}
