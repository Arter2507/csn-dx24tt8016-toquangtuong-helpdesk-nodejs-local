import { Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

type Theme = 'light' | 'dark';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly collapsed = signal(localStorage.getItem('helpdesk.sidebar') === 'collapsed');
  readonly theme = signal<Theme>(localStorage.getItem('helpdesk.theme') === 'dark' ? 'dark' : 'light');
  readonly groups = [
    { label: 'Không gian làm việc', links: [
      { path: '/', label: 'Tổng quan', icon: 'bi-grid-1x2' },
      { path: '/dashboard/technician', label: 'Chuyên viên kỹ thuật', icon: 'bi-tools' },
      { path: '/dashboard/user', label: 'Không gian người dùng', icon: 'bi-person' },
      { path: '/tickets', label: 'Yêu cầu hỗ trợ', icon: 'bi-ticket-perforated' },
      { path: '/notifications', label: 'Thông báo', icon: 'bi-bell' },
    ] },
    { label: 'Quản trị', links: [
      { path: '/users', label: 'Người dùng', icon: 'bi-people' },
      { path: '/categories', label: 'Danh mục', icon: 'bi-tags' },
      { path: '/reports', label: 'Báo cáo', icon: 'bi-bar-chart' },
      { path: '/backup', label: 'Sao lưu', icon: 'bi-database' },
    ] },
  ];

  readonly crumbs = signal<{ label: string; path?: string }[]>([]);
  private currentPath = '';

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (!(event instanceof NavigationEnd)) return;
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
      if (path !== this.currentPath) {
        this.currentPath = path;
        this.content()?.nativeElement.scrollTo(0, 0);
        if (window.matchMedia('(max-width: 767px)').matches) window.scrollTo(0, 0);
      }
      const route = this.router.routerState.snapshot.root.firstChild;
      const section = this.groups.flatMap(group => group.links).find(link => link.path === '/' + route?.url[0]?.path);
      const mode = route?.data['mode'];
      let current = route?.data['crumb'] ?? section?.label ?? route?.data['title'] ?? 'Tổng quan';
      if (mode === 'create') current = section?.path === '/tickets' ? 'Tạo yêu cầu' : section?.path === '/users' ? 'Thêm người dùng' : 'Thêm danh mục';
      if (mode === 'edit') current = 'Chỉnh sửa';
      if (mode === 'view') current = 'Chi tiết';
      this.crumbs.set(path === '/' ? [{ label: 'Tổng quan' }] : [
        { label: 'Tổng quan', path: '/' },
        ...(section && (mode === 'create' || mode === 'edit' || mode === 'view') ? [section] : []),
        { label: current },
      ]);
    });
    effect(() => {
      document.documentElement.dataset['theme'] = this.theme();
      localStorage.setItem('helpdesk.theme', this.theme());
    });
    effect(() => localStorage.setItem('helpdesk.sidebar', this.collapsed() ? 'collapsed' : 'expanded'));
  }

  search(value: string) {
    this.menuOpen.set(false);
    const route = this.router.routerState.snapshot.root.firstChild;
    const queryParams: Record<string, string | number | null> = { q: value.trim() || null };
    if (route?.data['role'] === 'technician') queryParams['assigneeId'] = 2;
    if (route?.data['role'] === 'user') queryParams['requesterId'] = route.queryParamMap.get('account') === '2' ? 2 : 1;
    for (const key of ['assigneeId', 'requesterId']) {
      if (route?.queryParamMap.has(key)) queryParams[key] = route.queryParamMap.get(key);
    }
    void this.router.navigate(['/tickets'], { queryParams });
  }
}
