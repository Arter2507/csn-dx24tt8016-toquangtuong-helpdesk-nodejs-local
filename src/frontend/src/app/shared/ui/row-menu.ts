import { Component, input } from '@angular/core';
import { Translate } from '../../core/i18n/i18n';

@Component({
  selector: 'app-row-menu',
  imports: [Translate],
  template: `
    <button
      class="secondary row-menu-trigger"
      type="button"
      [attr.popovertarget]="menuId()"
      [attr.aria-label]="'actions_for_row' | t: { name: rowName() }"
      [attr.title]="compact() ? ('actions' | t) : null"
    >
      @if (!compact()) {
        {{ 'actions' | t }}
      }
      <i
        class="bi"
        [class]="compact() ? 'bi-three-dots' : 'bi-chevron-down'"
        aria-hidden="true"
      ></i>
    </button>
    <div
      #panel
      class="row-menu-panel"
      popover="auto"
      [id]="menuId()"
      role="group"
      [attr.aria-label]="'actions' | t"
      (click)="dismissAfterAction(panel, $event)"
    >
      <ng-content />
    </div>
  `,
})
export class RowMenu {
  readonly menuId = input.required<string>();
  readonly compact = input(false);
  readonly rowName = input.required<string>();

  dismissAfterAction(panel: HTMLElement, event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest('a, button:not(:disabled)')) {
      panel.hidePopover();
    }
  }
}
