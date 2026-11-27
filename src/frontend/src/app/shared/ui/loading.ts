import { Component } from '@angular/core';
import { Translate } from '../../core/i18n/i18n';

@Component({
  selector: 'app-loading',
  imports: [Translate],
  template: `
    <div class="panel loading-panel" role="status">
      <span class="loading-caption"
        ><span class="activity-spinner" aria-hidden="true"></span>{{ 'loading' | t }}</span
      >
      <div class="skeleton-line" aria-hidden="true"></div>
      <div class="skeleton-line" aria-hidden="true"></div>
      <div class="skeleton-line" aria-hidden="true"></div>
    </div>
  `,
})
export class Loading {}
