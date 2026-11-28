import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {
  catchError,
  finalize,
  firstValueFrom,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { ApiResponse } from '../http/api-response';

export interface Account {
  id: number;
  fullName: string;
  email: string;
  username?: string | null;
  roleCodes: string[];
  isActive: boolean;
  role: 'OWNER' | 'ADMIN' | 'TECHNICIAN' | 'USER' | null;
  organizationId: number | null;
  organizationName: string | null;
  status: 'ACTIVE' | 'UNASSIGNED';
}

@Injectable({ providedIn: 'root' })
export class Session {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly mode = signal<'demo' | 'mysql' | null>(null);
  readonly account = signal<Account | null>(null);
  private initialization?: Promise<void>;
  private refreshing?: Observable<Account>;

  hasRole(role: string) {
    if (role === 'ADMIN' && this.account()?.role === 'OWNER') return true;
    if (role === 'USER') return this.account()?.role === 'USER';
    return this.account()?.roleCodes.includes(role) ?? false;
  }

  allows(role: string) {
    return this.mode() === 'demo' || this.hasRole(role);
  }

  get home() {
    if (this.account()?.status === 'UNASSIGNED') return '/pending-assignment';
    return this.allows('ADMIN')
      ? '/management'
      : this.hasRole('TECHNICIAN')
        ? '/management/dashboard/technician'
        : '/help-center';
  }

  initialize() {
    return (this.initialization ??= firstValueFrom(
      this.http.get<ApiResponse<'demo' | 'mysql'>>('/api/v1/auth/mode').pipe(
        switchMap(({ data }) => {
          this.mode.set(data);
          if (data === 'demo') return of(null);
          return this.http.get<ApiResponse<Account>>('/api/v1/auth/me').pipe(
            map((response) => response.data),
            catchError((error) =>
              error.status === 401 ? this.refresh() : throwError(() => error),
            ),
            catchError((error) => (error.status === 401 ? of(null) : throwError(() => error))),
          );
        }),
        tap((account) => this.account.set(account)),
        map(() => undefined),
      ),
    ).catch((error) => {
      this.initialization = undefined;
      throw error;
    }));
  }

  login(identifier: string, password: string) {
    return this.http
      .post<ApiResponse<Account>>('/api/v1/auth/login', { identifier, password })
      .pipe(tap(({ data }) => this.account.set(data)));
  }

  refresh() {
    return (this.refreshing ??= this.http
      .post<ApiResponse<Account>>('/api/v1/auth/refresh', {})
      .pipe(
        map(({ data }) => data),
        tap((account) => this.account.set(account)),
        finalize(() => (this.refreshing = undefined)),
        shareReplay(1),
      ));
  }

  logout() {
    return this.http.post<void>('/api/v1/auth/logout', {}).pipe(tap(() => this.expired()));
  }

  expired(redirect = true) {
    const hadAccount = !!this.account();
    this.account.set(null);
    if (hadAccount && redirect) void this.router.navigateByUrl('/login');
  }

  updateProfile(fullName: string, email: string) {
    return this.http
      .patch<ApiResponse<Account>>('/api/v1/auth/me', { fullName, email })
      .pipe(tap(({ data }) => this.account.set(data)));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http
      .patch<void>('/api/v1/auth/me/password', { currentPassword, newPassword })
      .pipe(tap(() => this.expired()));
  }
}

export const requireSession: CanActivateFn = async (route, state) => {
  const session = inject(Session);
  const router = inject(Router);
  try {
    await session.initialize();
  } catch {
    return router.parseUrl('/login');
  }
  if (session.mode() === 'demo') return true;
  if (!session.account()) {
    return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
  }
  if (!session.account()?.organizationId) {
    return route.data['pending'] ? true : router.parseUrl('/pending-assignment');
  }
  if (route.data['pending']) return router.parseUrl(session.home);
  const access: string | string[] | undefined = route.data['access'];
  return !access ||
    (Array.isArray(access) ? access.some((role) => session.hasRole(role)) : session.hasRole(access))
    ? true
    : router.parseUrl(session.home);
};

export const renewSession: HttpInterceptorFn = (request, next) => {
  if (
    !request.url.startsWith('/api/v1/') ||
    /^\/api\/v1\/auth\/(mode|login|register|activate|refresh|logout)$/.test(request.url)
  )
    return next(request);
  const session = inject(Session);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !session.account()) {
        return throwError(() => error);
      }
      return session.refresh().pipe(
        catchError((refreshError) => {
          if (refreshError.status === 401) session.expired();
          return throwError(() => refreshError);
        }),
        switchMap(() => next(request)),
      );
    }),
  );
};
