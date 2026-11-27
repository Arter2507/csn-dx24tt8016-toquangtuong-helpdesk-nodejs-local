import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Category } from '../categories/interfaces/category';
import { ApiResponse } from '../../core/http/api-response';
import { formatTicketCode } from '../../shared/data/workspace-labels';
import { I18n, Translate, errorKey } from '../../core/i18n/i18n';
import { Loading } from '../../shared/ui/loading';

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
  readonly draft = signal<NumberRule | null>(null);
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

  toggle(row: NumberRule) {
    this.feedback.set(null);
    this.draft.set(this.draft()?.categoryId === row.categoryId ? null : { ...row });
  }

  validAffix(value: string) {
    return /^[A-Z0-9_-]{0,12}$/i.test(value.trim());
  }

  validDigits(row: NumberRule) {
    return (
      row.digits !== null && Number.isInteger(row.digits) && row.digits >= 1 && row.digits <= 9
    );
  }

  validNumber(row: NumberRule) {
    return (
      row.nextNumber !== null &&
      Number.isInteger(row.nextNumber) &&
      row.nextNumber >= 1 &&
      row.nextNumber < 10 ** (this.validDigits(row) ? row.digits! : 9)
    );
  }

  preview(row: NumberRule) {
    if (
      !this.validAffix(row.prefix) ||
      !this.validAffix(row.suffix) ||
      !this.validDigits(row) ||
      !this.validNumber(row)
    )
      return '';
    const prefix = row.prefix.trim().toUpperCase();
    const suffix = row.suffix.trim().toUpperCase();
    return formatTicketCode(prefix + String(row.nextNumber).padStart(row.digits!, '0') + suffix);
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
          this.draft.set(null);
          this.saving.set(null);
          this.feedback.set({
            categoryId: row.categoryId,
            message: 'ticket_number_saved',
            error: false,
          });
          this.load();
        },
        error: (error) => {
          this.saving.set(null);
          this.feedback.set({ categoryId: row.categoryId, message: errorKey(error), error: true });
        },
      });
  }
}
