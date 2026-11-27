import { inject, Injectable, signal } from '@angular/core';
import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { defer, finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NetworkProgress {
  readonly pending = signal(0);
}

export const silentRequest = new HttpContextToken(() => false);

export const trackProgress: HttpInterceptorFn = (request, next) => {
  if (request.context.get(silentRequest)) return next(request);
  const progress = inject(NetworkProgress);
  return defer(() => {
    progress.pending.update((count) => count + 1);
    return next(request).pipe(finalize(() => progress.pending.update((count) => count - 1)));
  });
};
