import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ApiResponse, Category } from './features/categories/interfaces/category';
import { formatTicketCode } from './features/workspace/workspace-labels';
import { I18n, Translate, errorKey } from './i18n';
import { Loading } from './loading';

interface NumberRule {
  categoryId: number;
  category: Category;
  prefix: string;
  nextNumber: number | null;
  digits: number | null;
  suffix: string;
  configured: boolean;
}

@Component({
  selector: 'app-ticket-number-settings',
  imports: [FormsModule, Translate, Loading],
  templateUrl: './ticket-number-settings.html',
})
export class TicketNumberSettings implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  private readonly url = '/api/v1/settings/ticket-number-rules';
  readonly i18n = inject(I18n);
  readonly rows = signal<NumberRule[] | null>(null);
  readonly loadError = signal('');
  readonly saving = signal<number | null>(null);
  readonly feedback = signal<{ categoryId: number; message: string; error: boolean } | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loadError.set('');
    this.http
      .get<ApiResponse<NumberRule[]>>(this.url)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => this.rows.set(data),
        error: (error) => this.loadError.set(errorKey(error)),
      });
  }

  preview(row: NumberRule) {
    const { nextNumber, digits } = row;
    const prefix = row.prefix.trim().toUpperCase();
    const suffix = row.suffix.trim().toUpperCase();
    if (
      nextNumber === null ||
      !Number.isInteger(nextNumber) ||
      nextNumber < 1 ||
      digits === null ||
      !Number.isInteger(digits) ||
      digits < 1 ||
      digits > 9 ||
      nextNumber >= 10 ** digits ||
      !/^[A-Z0-9_-]{0,12}$/.test(prefix) ||
      !/^[A-Z0-9_-]{0,12}$/.test(suffix)
    )
      return '';
    return formatTicketCode(prefix + String(nextNumber).padStart(digits, '0') + suffix);
  }

  save(row: NumberRule) {
    if (this.saving() !== null || !this.preview(row)) return;
    this.saving.set(row.categoryId);
    this.feedback.set(null);
    const { prefix, nextNumber, digits, suffix } = row;
    this.http
      .put<void>(this.url + '/' + row.categoryId, { prefix, nextNumber, digits, suffix })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          row.prefix = prefix.trim().toUpperCase();
          row.suffix = suffix.trim().toUpperCase();
          row.configured = true;
          this.saving.set(null);
          this.feedback.set({
            categoryId: row.categoryId,
            message: 'ticket_number_saved',
            error: false,
          });
        },
        error: (error) => {
          this.saving.set(null);
          this.feedback.set({ categoryId: row.categoryId, message: errorKey(error), error: true });
        },
      });
  }
}
