import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Translate, errorKey } from '../../core/i18n/i18n';
import { WorkspaceService } from '../../shared/data/workspace.service';
import { ticketReference } from '../../shared/data/workspace-labels';
import { Row } from '../../shared/data/workspace.types';
import { RowSelection, SelectionSummary } from '../../shared/ui/batch-state-actions';
import { RowMenu } from '../../shared/ui/row-menu';

@Component({
  selector: 'app-bulk-actions',
  imports: [FormsModule, Translate, RouterLink, SelectionSummary, RowMenu],
  template: `
    @if (selected().length) {
      <div class="bulk-toolbar">
        <app-selection-summary
          [count]="selected().length"
          [busy]="busy()"
          (clear)="selection().clear()"
        />
        @if (selected().length === 1) {
          <a
            class="secondary"
            [routerLink]="[
              '/tickets',
              selected()[0].id,
              selected()[0]['status'] === 'CLOSED' ? 'view' : 'edit',
            ]"
            [queryParams]="scope()"
          >
            <i
              class="bi"
              [class]="selected()[0]['status'] === 'CLOSED' ? 'bi-eye' : 'bi-pencil'"
              aria-hidden="true"
            ></i>
            {{ (selected()[0]['status'] === 'CLOSED' ? 'view_action' : 'edit') | t }}
          </a>
        } @else if (batchEnabled()) {
          <button
            type="button"
            class="secondary"
            [disabled]="!sameCategory() || hasClosed() || busy()"
            (click)="openBatch('assign')"
          >
            <i class="bi bi-person-check" aria-hidden="true"></i>{{ 'batch_assign' | t }}
          </button>
          <button
            type="button"
            class="secondary"
            [disabled]="!canMerge() || busy()"
            (click)="openBatch('merge')"
          >
            <i class="bi bi-intersect" aria-hidden="true"></i>{{ 'batch_merge' | t }}
          </button>
        }
        @if (selected().length === 1) {
          <button type="button" class="secondary" [disabled]="busy()" (click)="ask()">
            <i class="bi bi-trash" aria-hidden="true"></i>{{ 'delete_action' | t }}
          </button>
        } @else {
          <app-row-menu
            menuId="ticket-batch-menu"
            [rowName]="'selected_count' | t: { count: selected().length }"
          >
            <button
              type="button"
              class="row-menu-item is-danger"
              [disabled]="busy()"
              (click)="ask()"
            >
              <i class="bi bi-trash" aria-hidden="true"></i>{{ 'delete_selected' | t }}
            </button>
          </app-row-menu>
        }
      </div>
    }
    @if (batchEnabled() && selected().length >= 2) {
      @if (!sameCategory()) {
        <p class="muted batch-hint">{{ 'api_BATCH_CATEGORY' | t }}</p>
      } @else if (!sameRequester()) {
        <p class="muted batch-hint">{{ 'api_BATCH_REQUESTER' | t }}</p>
      }
      @if (hasClosed()) {
        <p class="muted batch-hint">{{ 'api_BATCH_CLOSED' | t }}</p>
      }
    }
    <dialog
      #batchDialog
      class="confirm-dialog"
      aria-labelledby="batch-title"
      (cancel)="busy() && $event.preventDefault()"
    >
      <h2 id="batch-title">
        {{ (batchMode() === 'assign' ? 'batch_assign' : 'batch_merge') | t }}
      </h2>
      <p class="muted">
        {{ (batchMode() === 'assign' ? 'batch_assign_help' : 'batch_merge_help') | t }}
      </p>
      @if (batchError()) {
        <p class="notice error" role="alert">{{ batchError() | t }}</p>
      }
      @if (batchLoading()) {
        <p role="status">{{ 'loading' | t }}</p>
      } @else {
        <label class="field">
          {{ (batchMode() === 'assign' ? 'assigned_to_2' : 'batch_primary_ticket') | t }}
          <select [(ngModel)]="batchValue" [disabled]="busy()">
            <option [ngValue]="null">{{ 'batch_choose' | t }}</option>
            @if (batchMode() === 'assign') {
              @for (tech of technicians(); track tech.id) {
                <option [ngValue]="tech.id">{{ tech.fullName }}</option>
              }
            } @else {
              @for (row of batchRows(); track row.id) {
                @if (row['status'] !== 'CLOSED') {
                  <option [ngValue]="row.id">{{ reference(row) }} · {{ row['title'] }}</option>
                }
              }
            }
          </select>
        </label>
      }
      <div class="heading-actions">
        <button type="button" class="secondary" [disabled]="busy()" (click)="batchDialog.close()">
          {{ 'cancel' | t }}
        </button>
        <button
          type="button"
          class="primary"
          [disabled]="busy() || !batchValue"
          (click)="saveBatch()"
        >
          {{ (batchMode() === 'assign' ? 'save_changes' : 'batch_merge') | t }}
        </button>
      </div>
    </dialog>
    <dialog #confirm class="confirm-dialog" aria-labelledby="confirm-delete-title">
      <h2 id="confirm-delete-title">
        {{ (pending().length === 1 ? 'confirm_delete_one' : 'confirm_delete') | t }}
      </h2>
      <p>{{ 'confirm_delete_body' | t: { count: pending().length } }}</p>
      <div class="heading-actions">
        <button class="secondary" type="button" autofocus (click)="confirm.close()">
          {{ 'cancel' | t }}
        </button>
        <button class="danger-button" type="button" (click)="remove()">
          {{ 'delete_action' | t }}
        </button>
      </div>
    </dialog>
    @if (feedback()) {
      <p
        class="notice"
        [class.error]="failed()"
        [class.success]="!failed()"
        [attr.role]="failed() ? 'alert' : 'status'"
      >
        {{ feedback() | t: { count: removedCount() } }}
      </p>
    }
  `,
})
export class BulkActions {
  readonly selection = input.required<RowSelection>();
  readonly rows = input.required<Row[]>();
  readonly batchEnabled = input(false);
  readonly scope = input<Record<string, string | null>>({});
  readonly selected = computed(() =>
    this.rows().filter((row) => this.selection().ids().has(row.id)),
  );
  readonly sameCategory = computed(
    () =>
      this.selected().length >= 2 &&
      this.selected().every((row) => row['categoryId'] === this.selected()[0]['categoryId']),
  );
  readonly sameRequester = computed(() =>
    this.selected().every((row) => row['requesterId'] === this.selected()[0]['requesterId']),
  );
  readonly hasClosed = computed(() => this.selected().some((row) => row['status'] === 'CLOSED'));
  readonly canMerge = computed(
    () =>
      this.sameCategory() &&
      this.sameRequester() &&
      this.selected().some((row) => row['status'] !== 'CLOSED'),
  );
  readonly batchRows = signal<Row[]>([]);
  readonly batchMode = signal<'assign' | 'merge'>('assign');
  readonly batchError = signal('');
  readonly batchLoading = signal(false);
  readonly technicians = signal<{ id: number; fullName: string }[]>([]);
  readonly reference = ticketReference;
  batchValue: number | null = null;
  readonly archived = output<void>();
  readonly busy = signal(false);
  readonly pending = signal<number[]>([]);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('confirm');
  private readonly batchDialog = viewChild.required<ElementRef<HTMLDialogElement>>('batchDialog');
  readonly feedback = signal('');
  readonly failed = signal(false);
  readonly removedCount = signal(0);
  private readonly service = inject(WorkspaceService);
  private readonly destroy = inject(DestroyRef);

  openBatch(mode: 'assign' | 'merge') {
    this.batchRows.set(this.selected());
    this.batchMode.set(mode);
    this.batchError.set('');
    this.batchLoading.set(false);
    this.batchValue = null;
    this.batchDialog().nativeElement.showModal();
    if (mode === 'merge') return;
    this.technicians.set([]);
    this.batchLoading.set(true);
    this.service
      .assignableTechnicians(Number(this.batchRows()[0]['categoryId']))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => {
          this.technicians.set(data);
          this.batchLoading.set(false);
          if (!data.length) this.batchError.set('batch_no_technicians');
        },
        error: (error) => {
          this.batchLoading.set(false);
          this.batchError.set(errorKey(error));
        },
      });
  }

  saveBatch() {
    if (!this.batchValue || this.busy()) return;
    const selection = this.batchRows().map((row) => ({
      id: row.id,
      version: Number(row['version']),
    }));
    const assign = this.batchMode() === 'assign';
    const update = assign ? { assigneeId: this.batchValue } : { targetId: this.batchValue };
    this.busy.set(true);
    this.batchError.set('');
    this.service
      .batchTickets(selection, update)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => {
          this.busy.set(false);
          this.batchDialog().nativeElement.close();
          this.selection().clear();
          this.failed.set(false);
          this.removedCount.set(data.count);
          this.feedback.set(assign ? 'batch_assigned' : 'batch_merged');
          this.archived.emit();
        },
        error: (error) => {
          this.busy.set(false);
          this.batchError.set(errorKey(error));
        },
      });
  }

  ask(ids = [...this.selection().ids()]) {
    if (this.busy() || !ids.length) return;
    this.pending.set(ids);
    this.dialog().nativeElement.showModal();
  }

  remove() {
    const ids = this.pending();
    this.dialog().nativeElement.close();
    if (this.busy() || !ids.length) return;
    this.busy.set(true);
    this.feedback.set('');
    this.service
      .archiveTickets(ids)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => {
          this.busy.set(false);
          this.selection().clear();
          this.failed.set(false);
          this.removedCount.set(data.count);
          this.feedback.set(data.count === 1 ? 'item_removed' : 'items_removed');
          this.archived.emit();
        },
        error: (error) => {
          this.busy.set(false);
          this.failed.set(true);
          this.feedback.set(errorKey(error));
        },
      });
  }
}
