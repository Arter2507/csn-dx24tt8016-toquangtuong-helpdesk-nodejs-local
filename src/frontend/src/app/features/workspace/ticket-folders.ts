import { HttpClient } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiResponse } from '../../core/http/api-response';
import { I18n, Translate, errorKey } from '../../core/i18n/i18n';
import { Loading } from '../../shared/ui/loading';

interface FolderCount {
  categoryId: number;
  categoryName: string;
  unitId: number;
  unitName: string | null;
  period: string;
  total: number;
}

@Component({
  imports: [Translate, RouterLink, Loading],
  templateUrl: './ticket-folders.html',
})
export class TicketFolders implements OnInit {
  readonly by = input<string>();
  readonly category = input<string>();
  readonly year = input<string>();
  readonly rows = signal<FolderCount[] | null>(null);
  readonly error = signal('');
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  private readonly i18n = inject(I18n);
  readonly directory = '/admin-management/tickets/folders';
  readonly tickets = '/admin-management/tickets';
  readonly byUnit = computed(() => this.by() === 'unit');
  readonly categoryRows = computed(() =>
    (this.rows() ?? []).filter((row) => row.categoryId === Number(this.category())),
  );
  readonly selectedCategory = computed(() => this.categoryRows()[0]);
  readonly years = computed(() => [
    ...new Set(this.categoryRows().map((row) => row.period.slice(0, 4))),
  ]);
  readonly selectedYear = computed(() => this.years().find((year) => year === this.year()));

  readonly cards = computed(() => {
    const rows = this.rows() ?? [];
    const byUnit = this.byUnit();
    const groups = new Map<number, FolderCount[]>();
    for (const row of rows) {
      const id = byUnit ? row.unitId : row.categoryId;
      const group = groups.get(id);
      if (group) group.push(row);
      else groups.set(id, [row]);
    }
    if (this.byUnit()) {
      return [...groups].map(([id, values]) => ({
        key: 'unit-' + id,
        label: values[0].unitName ?? 'org_unassigned_unit',
        total: this.count(values),
        path: this.tickets,
        query: { unitId: id },
      }));
    }
    const category = this.selectedCategory();
    if (!category) {
      return [...groups].map(([id, values]) => ({
        key: 'category-' + id,
        label: values[0].categoryName,
        total: this.count(values),
        path: this.directory,
        query: { category: id },
      }));
    }
    const year = this.selectedYear();
    if (!year) {
      return this.years().map((value) => ({
        key: value,
        label: value,
        total: this.count(this.categoryRows().filter((row) => row.period.startsWith(value))),
        path: this.directory,
        query: { category: category.categoryId, year: value },
      }));
    }
    const monthName = new Intl.DateTimeFormat(this.i18n.language(), {
      month: 'long',
      timeZone: 'UTC',
    });
    return Array.from({ length: 12 }, (_, index) => {
      const period = year + '-' + String(index + 1).padStart(2, '0');
      return {
        key: period,
        label: monthName.format(new Date(Date.UTC(2024, index, 1))),
        total: this.count(this.categoryRows().filter((row) => row.period === period)),
        path: this.tickets,
        query: { catalogCategoryId: category.categoryId, createdMonth: period },
      };
    });
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.error.set('');
    this.http
      .get<ApiResponse<FolderCount[]>>('/api/v1/tickets/folders')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => this.rows.set(data),
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  private count(rows: FolderCount[]) {
    return rows.reduce((total, row) => total + row.total, 0);
  }
}
