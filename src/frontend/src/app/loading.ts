import { Component, inject, Injectable, signal } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { defer, finalize } from 'rxjs';
import { Translate } from './i18n';

@Injectable({ providedIn: 'root' })
export class NetworkProgress {
  readonly pending = signal(0);
}

export const trackProgress: HttpInterceptorFn = (request, next) => {
  const progress = inject(NetworkProgress);
  return defer(() => {
    progress.pending.update((count) => count + 1);
    return next(request).pipe(finalize(() => progress.pending.update((count) => count - 1)));
  });
};

@Component({
  selector: 'app-loading',
  imports: [Translate],
  template: `
    <div class="panel loading-panel" role="status">
      <span>{{ 'loading' | t }}</span>
      <div class="skeleton-line" aria-hidden="true"></div>
      <div class="skeleton-line" aria-hidden="true"></div>
      <div class="skeleton-line" aria-hidden="true"></div>
    </div>
  `,
})
export class Loading {}
