import { RowMenu } from '../../shared/ui/row-menu';
import { BatchStateActions, RowSelection } from '../../shared/ui/batch-state-actions';
import { Loading } from '../../shared/ui/loading';
import { Translate, I18n, errorKey } from '../../core/i18n/i18n';
import {
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Category } from './interfaces/category';
import { PageMeta } from '../../core/http/api-response';
import { CategoryService } from './services/category.service';
import { Router, RouterLink } from '@angular/router';
import { catalogPaths } from './catalog';
@Component({
  selector: 'app-categories',
  imports: [Translate, Loading, RowMenu, FormsModule, RouterLink, BatchStateActions],
  templateUrl: './categories-page.html',
})
export class CategoriesPage implements OnInit {
  readonly i18n = inject(I18n);
  private readonly service = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly view = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly mode = input<'list' | 'create' | 'edit'>('list');
  readonly id = input<string>();
  categories: Category[] = [];
  readonly catalog = signal<Category[]>([]);
  catalogError = '';
  parentId: number | null = null;
  readonly catalogRows = computed(() =>
    catalogPaths(this.catalog(), (category) => this.i18n.category(category)),
  );
  readonly pathsById = computed(
    () => new Map(this.catalogRows().map((item) => [item.row.id, item.path])),
  );
  eligibleParents() {
    return this.catalogRows().filter(
      (item) =>
        item.row.id !== this.editingId &&
        item.ancestors.every((parent) => parent.id !== this.editingId) &&
        (item.row.isActive || !this.active),
    );
  }
  readonly selection = new RowSelection();
  get rowIds() {
    return this.categories.map((row) => row.id);
  }
  meta: PageMeta | null = null;
  search = '';
  page = 1;
  sortBy = 'id';
  sortOrder = 'asc';
  isActive = '';
  code = '';
  name = '';
  active = true;
  editingId: number | null = null;
  statusError = '';
  loading = false;
  saving = false;
  error = '';
  notice = '';
  applied = { search: '', active: '', sortBy: 'id', sortOrder: 'asc' };
  ngOnInit() {
    this.service.listAll().subscribe({
      next: (rows) => {
        this.catalog.set(rows);
        this.view.markForCheck();
      },
      error: (error) => {
        this.catalogError = this.message(error);
        this.view.markForCheck();
      },
    });
    this.notice =
      (this.router.lastSuccessfulNavigation()?.extras.info as { notice?: string } | undefined)
        ?.notice ?? '';
    if (this.mode() === 'list') this.load();
    if (this.mode() !== 'edit' || !this.id()) return;
    this.loading = true;
    this.service.find(this.id()!).subscribe({
      next: (result) => {
        this.edit(result.data);
        this.loading = false;
        this.view.markForCheck();
      },
      error: (err) => {
        this.error = this.message(err);
        this.loading = false;
        this.view.markForCheck();
      },
    });
  }
  load() {
    this.selection.clear();
    this.loading = true;
    this.error = '';
    const { search, active, sortBy, sortOrder } = this.applied;
    this.service.list(search, this.page, sortBy, sortOrder, active).subscribe({
      next: (result) => {
        this.categories = result.data;
        this.meta = result.meta;
        this.loading = false;
        this.view.markForCheck();
      },
      error: (err) => {
        this.error = this.message(err);
        this.loading = false;
        this.view.markForCheck();
      },
    });
  }
  toggleCategory(row: Category) {
    if (this.saving) return;
    this.saving = true;
    this.notice = this.statusError = '';
    const isActive = !row.isActive;
    this.service.update(row.id, { isActive }).subscribe({
      next: () => {
        row.isActive = isActive;
        this.catalog.update((rows) =>
          rows.map((item) => (item.id === row.id ? { ...item, isActive } : item)),
        );
        this.saving = false;
        this.notice = isActive ? 'category_activated' : 'category_deactivated';
        this.page = 1;
        this.load();
        this.view.markForCheck();
      },
      error: (error) => {
        this.saving = false;
        this.statusError = this.message(error);
        this.view.markForCheck();
      },
    });
  }

  batchState(isActive: boolean) {
    if (this.loading || this.saving || !this.selection.ids().size) return;
    this.saving = true;
    this.notice = this.statusError = '';
    this.service.batchState([...this.selection.ids()], isActive).subscribe({
      next: () => {
        const selected = this.selection.ids();
        this.catalog.update((rows) =>
          rows.map((item) => (selected.has(item.id) ? { ...item, isActive } : item)),
        );
        this.saving = false;
        this.notice = isActive ? 'batch_categories_enabled' : 'batch_categories_disabled';
        this.page = 1;
        this.load();
      },
      error: (error) => {
        this.saving = false;
        this.statusError = this.message(error);
        this.view.markForCheck();
      },
    });
  }

  filter() {
    if (this.saving) return;
    this.applied = {
      search: this.search.trim(),
      active: this.isActive,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };
    this.page = 1;
    this.load();
  }
  clearFilters() {
    this.search = this.isActive = '';
    this.sortBy = 'id';
    this.sortOrder = 'asc';
    this.filter();
  }
  edit(row: Category) {
    this.editingId = row.id;
    this.code = row.code;
    this.name = row.name;
    this.parentId = row.parentId ?? null;
    this.active = row.isActive;
  }
  save(form: NgForm) {
    if (this.saving) return;
    if (form.invalid) {
      form.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('.editor .ng-invalid:not(form)')?.focus();
      return;
    }
    this.saving = true;
    this.error = '';
    const request =
      this.editingId === null
        ? this.service.create({ code: this.code, name: this.name, parentId: this.parentId })
        : this.service.update(this.editingId, {
            name: this.name,
            isActive: this.active,
            parentId: this.parentId,
          });
    request.subscribe({
      next: () => {
        this.saving = false;
        const notice = this.editingId === null ? 'category_added' : 'category_updated';
        void this.router.navigateByUrl('/categories/ticket-types', { info: { notice } });
      },
      error: (err) => {
        this.saving = false;
        this.error = this.message(err);
        this.view.markForCheck();
      },
    });
  }
  private message(err: HttpErrorResponse) {
    return errorKey(err);
  }
}
