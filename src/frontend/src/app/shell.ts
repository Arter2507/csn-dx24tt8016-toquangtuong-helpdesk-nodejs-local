import { Translate, I18n } from './i18n';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Session } from './session';
import { BackupScheduler } from './backup-scheduler';
import { Preferences } from './preferences';
import { NotificationBell } from './notification-bell';
import { Notifications } from './notifications';
import { NetworkProgress } from './loading';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [Translate, RouterLink, RouterLinkActive, RouterOutlet, NotificationBell],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');
  readonly mobileToggle = viewChild<ElementRef<HTMLButtonElement>>('mobileMenu');
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly collapsed = signal(localStorage.getItem('helpdesk.sidebar') === 'collapsed');
  readonly preferences = inject(Preferences);
  readonly session = inject(Session);
  private readonly workspaceRoute = signal(false);
  readonly workspaceVisible = computed(
    () =>
      this.workspaceRoute() &&
      (this.session.mode() === 'demo' || !!this.session.account()?.organizationId),
  );
  readonly signOutError = signal(false);
  readonly i18n = inject(I18n);
  readonly progress = inject(NetworkProgress);
  readonly navigating = this.router.currentNavigation;
  private readonly inbox = inject(Notifications);
  private readonly title = inject(Title);
  private readonly pageLabel = signal('overview');
  readonly accountParams = signal<{ account: number } | null>(null);
  readonly groups = [
    {
      label: 'workspace',
      links: [
        { path: '/', label: 'overview', icon: 'bi-grid-1x2' },
        { path: '/dashboard/technician', label: 'technician', icon: 'bi-tools' },
        { path: '/dashboard/user', label: 'requester_workspace', icon: 'bi-person' },
        { path: '/tickets', label: 'support_requests', icon: 'bi-ticket-perforated' },
        { path: '/tasks', label: 'team_tasks', icon: 'bi-kanban' },
        { path: '/notifications', label: 'notifications', icon: 'bi-bell' },
      ],
    },
    {
      label: 'administration',
      links: [
        { path: '/categories', label: 'categories', icon: 'bi-tags' },
        { path: '/reports', label: 'reports', icon: 'bi-bar-chart' },
        { path: '/backup', label: 'backups_2', icon: 'bi-database' },
        { path: '/settings', label: 'settings', icon: 'bi-gear' },
      ],
    },
  ];

  readonly crumbs = signal<{ label: string; path?: string }[]>([]);
  private currentPath = '';

  constructor() {
    inject(BackupScheduler);
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
      this.workspaceRoute.set(
        !['/login', '/register', '/activate', '/pending-assignment'].includes(path),
      );
      if (path !== this.currentPath) {
        this.currentPath = path;
        this.content()?.nativeElement.scrollTo(0, 0);
        if (window.matchMedia('(max-width: 767px)').matches) window.scrollTo(0, 0);
      }
      const route = this.router.routerState.snapshot.root.firstChild;
      const directoryResource = route?.url[0]?.path;
      const section =
        directoryResource === 'users'
          ? { path: '/users', label: 'members' }
          : directoryResource === 'categories' && path !== '/categories'
            ? { path: '/categories/ticket-types', label: 'ticket_types' }
            : this.groups
                .flatMap((group) => group.links)
                .find((link) => link.path === '/' + route?.url[0]?.path);
      const account = Number(
        route?.queryParamMap.get('account') ??
          route?.queryParamMap.get('requesterId') ??
          route?.queryParamMap.get('assigneeId') ??
          (route?.data['role'] === 'technician' ? 2 : route?.data['role'] === 'user' ? 1 : 0),
      );
      this.accountParams.set(account > 0 ? { account } : null);
      this.inbox.demoScope.set(account > 0 ? account : null);
      const mode = route?.data['mode'];
      let current = route?.data['crumb'] ?? section?.label ?? route?.data['title'] ?? 'overview';
      if (mode === 'create')
        current =
          section?.path === '/tickets'
            ? 'new_request'
            : section?.path === '/users'
              ? 'add_user'
              : 'add_category';
      if (mode === 'edit') current = 'edit_2';
      if (mode === 'view') current = 'details';
      this.pageLabel.set(current);
      this.crumbs.set(
        path === '/'
          ? [{ label: 'overview' }]
          : [
              { label: 'overview', path: '/' },
              ...(directoryResource === 'users' ||
              (directoryResource === 'categories' && path !== '/categories')
                ? [{ label: 'categories', path: '/categories' }]
                : []),
              ...(section && (mode === 'create' || mode === 'edit' || mode === 'view')
                ? [section]
                : []),
              { label: current },
            ],
      );
    });
    effect(() =>
      this.title.setTitle(
        this.i18n.text('browser_title', { page: this.i18n.text(this.pageLabel()) }),
      ),
    );
    effect(() =>
      localStorage.setItem('helpdesk.sidebar', this.collapsed() ? 'collapsed' : 'expanded'),
    );
  }

  signOut() {
    this.signOutError.set(false);
    this.session.logout().subscribe({ error: () => this.signOutError.set(true) });
  }

  visibleLink(path: string) {
    if (path === '/backup') return this.session.allows('OWNER');
    if (path === '/tasks') return this.session.allows('ADMIN') || this.session.allows('TECHNICIAN');
    if (path === '/dashboard/technician') return this.session.allows('TECHNICIAN');
    if (path === '/dashboard/user')
      return this.session.allows('USER') || this.session.hasRole('TECHNICIAN');
    return (
      !['/', '/users', '/categories', '/reports'].includes(path) || this.session.allows('ADMIN')
    );
  }

  search(value: string) {
    this.menuOpen.set(false);
    const route = this.router.routerState.snapshot.root.firstChild;
    const queryParams: Record<string, string | number | null> = { q: value.trim() || null };
    if (route?.data['role'] === 'technician')
      queryParams['assigneeId'] = this.session.account()?.id ?? 2;
    if (route?.data['role'] === 'user')
      queryParams['requesterId'] =
        this.session.account()?.id ?? (route.queryParamMap.get('account') === '2' ? 2 : 1);
    for (const key of ['assigneeId', 'requesterId']) {
      if (route?.queryParamMap.has(key)) queryParams[key] = route.queryParamMap.get(key);
    }
    void this.router.navigate(['/tickets'], { queryParams });
  }
}
