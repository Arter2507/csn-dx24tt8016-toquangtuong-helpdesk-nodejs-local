import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
})
export class Shell {
  readonly menuOpen = signal(false);
  readonly groups = [
    { label: 'Không gian làm việc', links: [
      { path: '/', label: 'Tổng quan', icon: 'bi-grid-1x2' },
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
}
