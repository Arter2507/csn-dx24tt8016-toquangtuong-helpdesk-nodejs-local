import { Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Translate, errorKey } from './i18n';
import { WorkspaceService } from './features/workspace/workspace.service';

export class RowSelection {
  readonly ids = signal(new Set<number>());

  set(ids: number[], checked: boolean) {
    this.ids.update(selected => {
      const updated = new Set(selected);
      for (const id of ids) {
        if (checked) updated.add(id);
        else updated.delete(id);
      }
      return updated;
    });
  }

  clear() { this.ids.set(new Set()); }
}

@Component({
  selector: 'app-bulk-actions',
  imports: [Translate],
  template: `
    <div class="bulk-toolbar">
      <span>{{ 'selected_count' | t:{count: selection().ids().size} }}</span>
      <button type="button" class="danger-button" [disabled]="!selection().ids().size || busy()" (click)="ask()">
        <i class="bi bi-trash" aria-hidden="true"></i>{{ 'delete_selected' | t }}
      </button>
    </div>
    <dialog #confirm class="confirm-dialog" aria-labelledby="confirm-delete-title">
      <h2 id="confirm-delete-title">{{ (pending().length === 1 ? 'confirm_delete_one' : 'confirm_delete') | t }}</h2>
      <p>{{ 'confirm_delete_body' | t:{count: pending().length} }}</p>
      <div class="heading-actions">
        <button class="secondary" type="button" autofocus (click)="confirm.close()">{{ 'cancel' | t }}</button>
        <button class="danger-button" type="button" (click)="remove()">{{ 'delete_action' | t }}</button>
      </div>
    </dialog>
    @if (feedback()) {
      <p class="notice" [class.error]="failed()" [class.success]="!failed()" [attr.role]="failed() ? 'alert' : 'status'">
        {{ feedback() | t:{count: removedCount()} }}
      </p>
    }
  `,
})
export class BulkActions {
  readonly selection = input.required<RowSelection>();
  readonly archived = output<void>();
  readonly busy = signal(false);
  readonly pending = signal<number[]>([]);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('confirm');
  readonly feedback = signal('');
  readonly failed = signal(false);
  readonly removedCount = signal(0);
  private readonly service = inject(WorkspaceService);
  private readonly destroy = inject(DestroyRef);

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
    this.service.archiveTickets(ids).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: ({ data }) => {
        this.busy.set(false);
        this.selection().clear();
        this.failed.set(false);
        this.removedCount.set(data.count);
        this.feedback.set(data.count === 1 ? 'item_removed' : 'items_removed');
        this.archived.emit();
      },
      error: error => {
        this.busy.set(false);
        this.failed.set(true);
        this.feedback.set(errorKey(error));
      },
    });
  }
}
