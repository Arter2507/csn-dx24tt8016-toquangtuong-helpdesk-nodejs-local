import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CategoryService } from './features/categories/services/category.service';
import { WorkspaceService } from './features/workspace/workspace.service';

@Component({
  imports: [RouterLink],
  template: `
    <div class="page-heading">
      <div><p class="eyebrow">Không gian làm việc</p><h1>Tổng quan hỗ trợ</h1><p>Theo dõi yêu cầu và truy cập nhanh các chức năng quản lý.</p></div>
      <a class="primary" routerLink="/tickets/new"><i class="bi bi-plus-lg" aria-hidden="true"></i> Tạo yêu cầu</a>
    </div>
    @if (error()) { <p class="error" role="alert">Không tải được số liệu từ API demo.</p> }
    <div class="stats" [attr.aria-busy]="!counts() && !error()">
      @for (item of cards; track item.key) {
        <a class="panel stat" [routerLink]="item.path"><i class="bi" [class]="item.icon" aria-hidden="true"></i>
          <span>{{ item.label }}</span><strong>{{ counts()?.[item.key] ?? '—' }}</strong>
        </a>
      }
    </div>
    <section class="panel"><h2>Luồng xử lý yêu cầu</h2>
      <ol class="workflow"><li>Gửi yêu cầu</li><li>Phân loại và phân công</li><li>Xử lý</li><li>Xác nhận và đóng</li></ol>
      <a routerLink="/tickets">Mở danh sách yêu cầu <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
    </section>
  `,
})
export class Dashboard {
  private readonly workspace = inject(WorkspaceService);
  private readonly categories = inject(CategoryService);
  readonly counts = signal<Record<string, number> | null>(null);
  readonly error = signal(false);
  readonly cards = [
    { key: 'tickets', path: '/tickets', label: 'Yêu cầu hỗ trợ', icon: 'bi-ticket-perforated' },
    { key: 'progress', path: '/tickets', label: 'Đang xử lý', icon: 'bi-hourglass-split' },
    { key: 'users', path: '/users', label: 'Người dùng', icon: 'bi-people' },
    { key: 'categories', path: '/categories', label: 'Danh mục', icon: 'bi-tags' },
  ];

  constructor() {
    forkJoin({
      tickets: this.workspace.list('tickets', { pageSize: 1 }),
      progress: this.workspace.list('tickets', { pageSize: 1, filter: 'IN_PROGRESS' }),
      users: this.workspace.list('users', { pageSize: 1 }),
      categories: this.categories.list('', 1, 'id', 'asc', ''),
    }).subscribe({
      next: result => this.counts.set(Object.fromEntries(Object.entries(result).map(([key, response]) => [key, response.meta?.totalItems ?? 0]))),
      error: () => this.error.set(true),
    });
  }
}

@Component({
  imports: [RouterLink],
  template: `
    <div class="page-heading"><div><p class="eyebrow">Helpdesk</p><h1>{{ title }}</h1></div></div>
    <section class="panel empty-page"><i class="bi bi-folder2-open" aria-hidden="true"></i><h2>{{ message }}</h2>
      <a routerLink="/">Về tổng quan</a>
    </section>
  `,
})
export class BlankPage {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  readonly title = this.data['title'];
  readonly message = this.data['message'] ?? 'Nội dung sẽ được bổ sung trong giai đoạn phát triển.';
}
