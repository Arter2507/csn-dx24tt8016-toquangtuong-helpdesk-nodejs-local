import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Category } from './features/categories/interfaces/category';
import { CategoryService } from './features/categories/services/category.service';
import { WorkspaceService } from './features/workspace/workspace.service';
import { Row } from './features/workspace/workspace.types';
import { ticketPriorities, ticketStatuses } from './features/workspace/workspace-labels';

const dayFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const dayKey = (date: Date) => dayFormat.format(date);
const localDay = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
  ? dayKey(new Date(value))
  : '';
function daysBack(offset: number) {
  const date = new Date(dayKey(new Date()) + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() - offset);
  return dayKey(date);
}

function summarize(tickets: Row[]) {
  return ticketStatuses.map(status => ({
    ...status,
    count: tickets.filter(ticket => ticket['status'] === status.value).length,
  }));
}

@Component({
  selector: 'helpdesk-stat-cards',
  template: `
    <div class="stats">
      @for (card of cards(); track card.label) {
        <div class="panel stat">
          <span class="stat-label"><span class="stat-icon" [attr.data-tone]="card.tone">
            <i class="bi" [class]="card.icon" aria-hidden="true"></i>
          </span>{{ card.label }}</span>
          <strong>{{ card.count }}</strong>
        </div>
      }
    </div>
  `,
})
class StatCards {
  readonly tickets = input.required<Row[]>();
  readonly report = input(false);
  readonly cards = computed(() => {
    const tickets = this.tickets();
    const statuses = summarize(tickets);
    const cards = this.report() ? [statuses[3], statuses[1], statuses[2]] : statuses.slice(0, 3);
    return [{ label: 'Tổng yêu cầu', count: tickets.length, tone: 'primary', icon: 'bi-clipboard-data' }, ...cards];
  });
}

@Component({
  selector: 'helpdesk-status-chart',
  template: `
    <section class="panel">
      <h2>Trạng thái yêu cầu</h2>
      <p class="section-note">{{ period() }} · Số yêu cầu</p>
      @if (tickets().length) {
        <div class="donut-layout">
          <div class="donut" aria-hidden="true" [style.--donut]="gradient()">
            <div class="donut-center"><strong>{{ tickets().length }}</strong><span>Tổng yêu cầu</span></div>
          </div>
          <ul class="chart-legend" aria-label="Số yêu cầu theo trạng thái">
            @for (entry of entries(); track entry.value) {
              <li><span class="legend-dot" [style.--segment]="'var(--ds-chart-' + entry.color + ')'" aria-hidden="true"></span>
                <span>{{ entry.label }}</span><strong>{{ entry.count }}</strong>
              </li>
            }
          </ul>
        </div>
      } @else {
        <div class="empty-data"><i class="bi bi-pie-chart" aria-hidden="true"></i><p>Chưa có dữ liệu trạng thái.</p></div>
      }
    </section>
  `,
})
class StatusChart {
  readonly tickets = input.required<Row[]>();
  readonly period = input.required<string>();
  readonly entries = computed(() => summarize(this.tickets()));
  readonly gradient = computed(() => {
    const total = this.tickets().length;
    if (!total) return '';
    let offset = 0;
    const stops = this.entries().filter(entry => entry.count).map(entry => {
      const start = offset;
      offset += entry.count / total * 100;
      return `var(--ds-chart-${entry.color}) ${start}% ${offset}%`;
    });
    if (stops.length === 1) return stops[0].split(' ')[0];
    return 'conic-gradient(' + stops.join(', ') + ')';
  });
}

@Component({
  imports: [RouterLink, StatCards, StatusChart],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly workspace = inject(WorkspaceService);
  private readonly destroy = inject(DestroyRef);
  readonly tickets = signal<Row[] | null>(null);
  readonly error = signal(false);
  readonly trend = computed(() => {
    const counts = new Map<string, number>();
    for (const row of this.tickets() ?? []) {
      const day = localDay(row['createdAt']);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return Array.from({ length: 7 }, (_, index) => {
      const date = daysBack(6 - index);
      return { date, label: date.slice(8) + '/' + date.slice(5, 7), count: counts.get(date) ?? 0 };
    });
  });
  readonly hasTrend = computed(() => this.trend().some(day => day.count > 0));
  readonly trendMax = computed(() => Math.max(1, ...this.trend().map(day => day.count)));
  readonly unassigned = computed(() => (this.tickets() ?? []).filter(row => row['assigneeId'] == null && row['status'] === 'NEW').length);
  readonly recent = computed(() => [...(this.tickets() ?? [])]
    .sort((a, b) => String(b['updatedAt'] ?? '').localeCompare(String(a['updatedAt'] ?? '')) || b.id - a.id)
    .slice(0, 5));

  constructor() { this.load(); }

  load() {
    this.error.set(false);
    this.workspace.listAll('tickets').pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: tickets => this.tickets.set(tickets),
      error: () => this.error.set(true),
    });
  }

  status(value: unknown) { return ticketStatuses.find(item => item.value === value); }
  priority(value: unknown) { return ticketPriorities.find(item => item.value === value); }
}

@Component({
  imports: [FormsModule, StatCards, StatusChart],
  templateUrl: './reports.html',
})
export class Reports {
  private readonly workspace = inject(WorkspaceService);
  private readonly categoryService = inject(CategoryService);
  private readonly destroy = inject(DestroyRef);
  readonly error = signal(false);
  readonly tickets = signal<Row[] | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly statuses = ticketStatuses;
  readonly periods = [
    { value: 0, label: 'Tất cả thời gian' },
    { value: 7, label: '7 ngày gần đây' },
    { value: 30, label: '30 ngày gần đây' },
    { value: 90, label: '90 ngày gần đây' },
  ];
  days = 0;
  categoryId = 0;
  status = '';
  readonly applied = signal({ days: 0, categoryId: 0, status: '' });
  readonly period = computed(() => this.periods.find(period => period.value === this.applied().days)!.label);
  readonly scope = computed(() => {
    const { categoryId, status } = this.applied();
    return [
      this.period(),
      this.categories().find(category => category.id === categoryId)?.name,
      this.statuses.find(item => item.value === status)?.label,
    ].filter(Boolean).join(' · ');
  });
  readonly filtered = computed(() => {
    const { days, categoryId, status } = this.applied();
    const start = days ? daysBack(days - 1) : '';
    return (this.tickets() ?? []).filter(row =>
      (!start || localDay(row['createdAt']) >= start) &&
      (!categoryId || row['categoryId'] === categoryId) && (!status || row['status'] === status));
  });
  readonly summary = computed(() => {
    const grouped = new Map<number, Row[]>();
    for (const row of this.filtered()) {
      const id = Number(row['categoryId']);
      const group = grouped.get(id);
      if (group) group.push(row);
      else grouped.set(id, [row]);
    }
    return [...grouped].map(([id, rows]) => ({
      id,
      name: this.categories().find(category => category.id === id)?.name ?? 'Danh mục #' + id,
      total: rows.length,
      closed: rows.filter(row => row['status'] === 'CLOSED').length,
      progress: rows.filter(row => row['status'] === 'IN_PROGRESS').length,
    })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'vi'));
  });
  readonly maximum = computed(() => Math.max(1, ...this.summary().map(row => row.total)));

  constructor() { this.load(); }

  load() {
    this.error.set(false);
    forkJoin({ tickets: this.workspace.listAll('tickets'), categories: this.categoryService.listAll() })
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: ({ tickets, categories }) => { this.categories.set(categories); this.tickets.set(tickets); },
        error: () => this.error.set(true),
      });
  }

  apply() { this.applied.set({ days: this.days, categoryId: this.categoryId, status: this.status }); }

  clearFilters() {
    this.days = this.categoryId = 0;
    this.status = '';
    this.apply();
  }

  exportReport() {
    const csvCell = (value: string) => '"' + (/^\s*[=+@-]|^[\t\r\n]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"';
    const rows = this.summary().map(row => [csvCell(row.name), row.total, row.closed, row.progress].join(','));
    const file = new Blob(['\uFEFFLoại yêu cầu,Số lượng,Đã đóng,Đang xử lý\r\n', rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bao-cao-helpdesk.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

@Component({
  imports: [RouterLink],
  template: `
    <div class="page-heading"><div><h1>{{ title }}</h1></div></div>
    <section class="panel empty-page"><i class="bi" [class]="icon" aria-hidden="true"></i><h2>{{ message }}</h2>
      <a class="secondary" routerLink="/">Về tổng quan</a>
    </section>
  `,
})
export class BlankPage {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  readonly title = this.data['title'];
  readonly icon = this.data['icon'] ?? 'bi-folder2-open';
  readonly message = this.data['message'] ?? 'Tính năng đang được phát triển.';
}
