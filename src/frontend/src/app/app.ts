import { ChangeDetectorRef, Component, ElementRef, inject, input, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Category, PageMeta } from './features/categories/interfaces/category';
import { CategoryService } from './features/categories/services/category.service';
import { Router, RouterLink } from '@angular/router';
@Component({ selector: 'app-categories', imports: [FormsModule, RouterLink], templateUrl: './app.html' })
export class App implements OnInit {
  private readonly service = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly view = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly mode = input<'list' | 'create' | 'edit'>('list');
  readonly id = input<string>();
  categories: Category[] = []; meta: PageMeta | null = null;
  search = ''; page = 1; sortBy = 'id'; sortOrder = 'asc'; isActive = '';
  code = ''; name = ''; active = true; editingId: number | null = null;
  loading = false; saving = false; error = ''; notice = '';
  applied = { search: '', active: '', sortBy: 'id', sortOrder: 'asc' };
  ngOnInit() {
    this.notice = (this.router.lastSuccessfulNavigation()?.extras.info as { notice?: string } | undefined)?.notice ?? '';
    if (this.mode() === 'list') this.load();
    if (this.mode() !== 'edit' || !this.id()) return;
    this.loading = true;
    this.service.find(this.id()!).subscribe({
      next: result => { this.edit(result.data); this.loading = false; this.view.markForCheck(); },
      error: err => { this.error = this.message(err); this.loading = false; this.view.markForCheck(); }
    });
  }
  load() {
    this.loading = true; this.error = '';
    const { search, active, sortBy, sortOrder } = this.applied;
    this.service.list(search, this.page, sortBy, sortOrder, active).subscribe({
      next: result => { this.categories = result.data; this.meta = result.meta; this.loading = false; this.view.markForCheck(); },
      error: err => { this.error = this.message(err); this.loading = false; this.view.markForCheck(); }
    });
  }
  filter() {
    this.applied = { search: this.search.trim(), active: this.isActive, sortBy: this.sortBy, sortOrder: this.sortOrder };
    this.page = 1;
    this.load();
  }
  clearFilters() {
    this.search = this.isActive = '';
    this.sortBy = 'id';
    this.sortOrder = 'asc';
    this.filter();
  }
  edit(row: Category) { this.editingId = row.id; this.code = row.code; this.name = row.name; this.active = row.isActive; }
  save(form: NgForm) {
    if (this.saving) return;
    if (form.invalid) {
      form.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('.editor .ng-invalid:not(form)')?.focus();
      return;
    }
    this.saving = true; this.error = '';
    const request = this.editingId === null ? this.service.create({ code: this.code, name: this.name }) : this.service.update(this.editingId, { name: this.name, isActive: this.active });
    request.subscribe({
      next: () => {
        this.saving = false;
        const notice = this.editingId === null ? 'Đã thêm danh mục.' : 'Đã cập nhật danh mục.';
        void this.router.navigateByUrl('/categories', { info: { notice } });
      },
      error: err => { this.saving = false; this.error = this.message(err); this.view.markForCheck(); }
    });
  }
  private message(err: HttpErrorResponse) { return err.error?.error?.message || 'Không kết nối được API'; }
}
