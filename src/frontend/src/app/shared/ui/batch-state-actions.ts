import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { Translate } from '../../core/i18n/i18n';

export class RowSelection {
  readonly ids = signal(new Set<number>());

  set(ids: number[], checked: boolean) {
    this.ids.update((selected) => {
      const updated = new Set(selected);
      for (const id of ids) {
        if (checked) updated.add(id);
        else updated.delete(id);
      }
      return updated;
    });
  }

  clear() {
    this.ids.set(new Set());
  }
}

@Component({
  selector: 'app-selection-summary',
  imports: [Translate],
  template: `
    <strong role="status">{{ 'selected_count' | t: { count: count() } }}</strong>
    <button type="button" class="text-button" [disabled]="busy()" (click)="clear.emit()">
      {{ 'clear_selection' | t }}
    </button>
  `,
})
export class SelectionSummary {
  readonly count = input.required<number>();
  readonly busy = input(false);
  readonly clear = output<void>();
}

@Component({
  selector: 'app-batch-state',
  imports: [Translate, SelectionSummary],
  template: `
    <div class="bulk-toolbar">
      <app-selection-summary [count]="count()" [busy]="busy()" (clear)="clear.emit()" />
      <button type="button" class="secondary" [disabled]="blocked() || busy()" (click)="ask(true)">
        <i class="bi bi-check-circle" aria-hidden="true"></i>{{ enableLabel() | t }}
      </button>
      <button type="button" class="secondary" [disabled]="blocked() || busy()" (click)="ask(false)">
        <i class="bi bi-pause-circle" aria-hidden="true"></i>{{ disableLabel() | t }}
      </button>
    </div>
    @if (blocked()) {
      <p class="muted batch-hint" role="status">{{ 'batch_members_outside_scope' | t }}</p>
    }
    <dialog #dialog class="confirm-dialog" [attr.aria-label]="'confirm_state_title' | t">
      <h2>{{ 'confirm_state_title' | t }}</h2>
      <p>
        {{
          'confirm_state_body'
            | t: { count: count(), action: ((enabled() ? enableLabel() : disableLabel()) | t) }
        }}
      </p>
      <div class="heading-actions">
        <button type="button" class="secondary" autofocus (click)="dialog.close()">
          {{ 'cancel' | t }}
        </button>
        <button type="button" class="primary" (click)="confirm()">
          {{ 'confirm_state_apply' | t }}
        </button>
      </div>
    </dialog>
  `,
})
export class BatchStateActions {
  readonly count = input.required<number>();
  readonly enableLabel = input.required<string>();
  readonly disableLabel = input.required<string>();
  readonly blocked = input(false);
  readonly busy = input(false);
  readonly clear = output<void>();
  readonly apply = output<boolean>();
  readonly enabled = signal(false);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  ask(enabled: boolean) {
    this.enabled.set(enabled);
    this.dialog().nativeElement.showModal();
  }

  confirm() {
    this.dialog().nativeElement.close();
    if (this.count() && !this.blocked() && !this.busy()) this.apply.emit(this.enabled());
  }
}
