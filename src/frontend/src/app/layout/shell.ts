import { NgTemplateOutlet } from '@angular/common';
import { Translate, I18n } from '../core/i18n/i18n';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Session } from '../core/auth/session';
import { BackupScheduler } from '../features/backups/backup-scheduler';
import { Preferences } from '../core/preferences/preferences';
import { NotificationBell } from '../features/notifications/notification-bell';
import { Notifications } from '../features/notifications/notifications';
import { NetworkProgress } from '../core/http/network-progress';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [
    Translate,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NotificationBell,
    NgTemplateOutlet,
  ],
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
  readonly portal = signal<'help' | 'management' | null>(null);
  readonly portalBase = computed(() => (this.portal() === 'help' ? '/help-center' : '/management'));
  readonly staffAccess = computed(() =>
    ['ADMIN', 'TECHNICIAN'].some((role) => this.session.allows(role)),
  );
  readonly workspaceVisible = computed(
    () =>
      this.portal() === 'management' &&
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
        { path: '/management', label: 'overview', icon: 'bi-grid-1x2' },
        { path: '/management/dashboard/technician', label: 'technician', icon: 'bi-tools' },
        { path: '/management/tickets/folders', label: 'ticket_folders', icon: 'bi-folder2' },
        { path: '/management/tickets', label: 'support_requests', icon: 'bi-ticket-perforated' },
        { path: '/management/knowledge', label: 'knowledge', icon: 'bi-book' },
        { path: '/management/tasks', label: 'team_tasks', icon: 'bi-kanban' },
        { path: '/management/notifications', label: 'notifications', icon: 'bi-bell' },
      ],
    },
    {
      label: 'administration',
      links: [
        { path: '/management/categories', label: 'categories', icon: 'bi-tags' },
        { path: '/management/reports', label: 'reports', icon: 'bi-bar-chart' },
        { path: '/management/backup', label: 'backups_2', icon: 'bi-database' },
        { path: '/management/settings', label: 'settings', icon: 'bi-gear' },
      ],
    },
  ];

  readonly crumbs = signal<{ label: string; path?: string }[]>([]);
  private readonly currentPath = signal('');

  constructor() {
    inject(BackupScheduler);
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
      const route = this.router.routerState.snapshot.root.firstChild;
      const portal = route?.data['portal'];
      this.portal.set(portal === 'help' || portal === 'management' ? portal : null);
      const base = portal === 'help' ? '/help-center' : '/management';
      if (path !== this.currentPath()) {
        this.currentPath.set(path);
        this.content()?.nativeElement.scrollTo(0, 0);
        if (window.matchMedia('(max-width: 767px)').matches) window.scrollTo(0, 0);
      }
      const section = route?.url[1]?.path;
      const account = Number(
        route?.queryParamMap.get('account') ??
          route?.queryParamMap.get('requesterId') ??
          route?.queryParamMap.get('assigneeId') ??
          (route?.data['role'] === 'technician' ? 2 : 0),
      );
      this.accountParams.set(account > 0 ? { account } : null);
      this.inbox.demoScope.set(account > 0 ? account : null);
      const mode = route?.data['mode'];
      const rootLabel = portal === 'help' ? 'help_center' : 'overview';
      const ticketLabel = portal === 'help' ? 'my_support_requests' : 'support_requests';
      const sectionLabel =
        section === 'tickets'
          ? ticketLabel
          : this.groups
              .flatMap((group) => group.links)
              .find((link) => link.path === base + '/' + section)?.label;
      let current = route?.data['crumb'] ?? sectionLabel ?? route?.data['title'] ?? rootLabel;
      if (mode === 'create')
        current =
          section === 'tickets' ? 'new_request' : section === 'users' ? 'add_user' : 'add_category';
      if (mode === 'edit') current = 'edit_2';
      if (mode === 'view') current = 'details';
      this.pageLabel.set(current);
      this.crumbs.set(
        path === base
          ? [{ label: rootLabel }]
          : [
              { label: rootLabel, path: base },
              ...(section === 'tickets' && mode && mode !== 'list'
                ? [{ label: ticketLabel, path: base + '/tickets' }]
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
    if (path === '/management/backup') return this.session.allows('OWNER');
    if (path === '/management/tasks')
      return this.session.allows('ADMIN') || this.session.allows('TECHNICIAN');
    if (path === '/management/dashboard/technician') return this.session.allows('TECHNICIAN');
    if (path === '/management/knowledge') return this.session.mode() === 'mysql';
    return (
      !['/management', '/management/categories', '/management/reports'].includes(path) ||
      this.session.allows('ADMIN')
    );
  }

  activeLink(link: string) {
    const path = this.currentPath();
    if (link === '/management/tickets' && path === '/management/tickets/folders') return false;
    return path === link || (link !== '/management' && path.startsWith(link + '/'));
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
    void this.router.navigate(['/management/tickets'], { queryParams });
  }
}
