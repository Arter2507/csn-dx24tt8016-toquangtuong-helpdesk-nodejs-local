import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { Preferences } from './core/preferences/preferences';
import { trackProgress } from './core/http/network-progress';
import { renewSession } from './core/auth/session';
import { routes } from './app.routes';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([trackProgress, renewSession])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          const preferences = inject(Preferences);
          const previous = from.firstChild ?? from;
          const next = to.firstChild ?? to;
          if (
            preferences.reducedMotion() ||
            matchMedia('(prefers-reduced-motion: reduce)').matches ||
            (previous.routeConfig === next.routeConfig &&
              previous.url.map((segment) => segment.path).join('/') ===
                next.url.map((segment) => segment.path).join('/'))
          ) {
            transition.skipTransition();
          }
        },
      }),
    ),
  ],
};
