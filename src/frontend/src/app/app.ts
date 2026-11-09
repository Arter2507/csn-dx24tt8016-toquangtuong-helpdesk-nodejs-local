import { ChangeDetectorRef, Component, inject, input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Category, PageMeta } from './features/categories/interfaces/category';
import { CategoryService } from './features/categories/services/category.service';
import { Router, RouterLink } from '@angular/router';
@Component({ selector: 'app-categories', imports: [FormsModule, RouterLink], templateUrl: './app.html', styleUrl: './app.css' })
export class App implements OnInit {
  private readonly service = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly view = inject(ChangeDetectorRef);
  readonly mode = input<'list' | 'create' | 'edit'>('list');
  readonly id = input<string>();
  categories: Category[] = []; meta: PageMeta | null = null;
  search = ''; page = 1; sortBy = 'id'; sortOrder = 'asc'; isActive = '';
  code = ''; name = ''; active = true; editingId: number | null = null;
  loading = false; saving = false; error = '';
  ngOnInit() {
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
    this.service.list(this.search, this.page, this.sortBy, this.sortOrder, this.isActive).subscribe({
      next: result => { this.categories = result.data; this.meta = result.meta; this.loading = false; this.view.markForCheck(); },
      error: err => { this.error = this.message(err); this.loading = false; this.view.markForCheck(); }
    });
  }
  filter() { this.page = 1; this.load(); }
  edit(row: Category) { this.editingId = row.id; this.code = row.code; this.name = row.name; this.active = row.isActive; }
  save() {
    if (this.saving) return;
    this.saving = true; this.error = '';
    const request = this.editingId === null ? this.service.create({ code: this.code, name: this.name }) : this.service.update(this.editingId, { name: this.name, isActive: this.active });
    request.subscribe({
      next: () => { this.saving = false; void this.router.navigateByUrl('/categories'); },
      error: err => { this.saving = false; this.error = this.message(err); this.view.markForCheck(); }
    });
  }
  private message(err: HttpErrorResponse) { return err.error?.error?.message || 'Không kết nối được API'; }
}
