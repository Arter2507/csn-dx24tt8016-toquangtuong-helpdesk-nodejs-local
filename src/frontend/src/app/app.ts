import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Category, PageMeta } from './features/categories/interfaces/category';
import { CategoryService } from './features/categories/services/category.service';
import { Workspace } from './features/workspace/workspace';
@Component({ selector: 'app-root', imports: [FormsModule, Workspace], templateUrl: './app.html', styleUrl: './app.css' })
export class App implements OnInit {
  private readonly service = inject(CategoryService);
  section: 'categories' | 'tickets' | 'users' = 'categories';
  categories: Category[] = []; meta: PageMeta | null = null;
  search = ''; page = 1; sortBy = 'id'; sortOrder = 'asc'; isActive = '';
  code = ''; name = ''; active = true; editingId: number | null = null;
  loading = false; saving = false; error = '';
  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.service.list(this.search, this.page, this.sortBy, this.sortOrder, this.isActive).subscribe({
      next: result => { this.categories = result.data; this.meta = result.meta; this.loading = false; },
      error: err => { this.error = this.message(err); this.loading = false; }
    });
  }
  filter() { this.page = 1; this.load(); }
  edit(row: Category) { this.editingId = row.id; this.code = row.code; this.name = row.name; this.active = row.isActive; }
  reset() { this.editingId = null; this.code = ''; this.name = ''; this.active = true; }
  save() {
    this.saving = true; this.error = '';
    const request = this.editingId === null ? this.service.create({ code: this.code, name: this.name }) : this.service.update(this.editingId, { name: this.name, isActive: this.active });
    request.subscribe({ next: () => { this.saving = false; this.reset(); this.load(); }, error: err => { this.saving = false; this.error = this.message(err); } });
  }
  private message(err: HttpErrorResponse) { return err.error?.error?.message || 'Không kết nối được API'; }
}
