import { ChangeDetectorRef, Component, inject, input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CategoryService } from '../categories/services/category.service';
import { WorkspaceService } from './workspace.service';
import { Field, Resource, Row, Value } from './workspace.types';

const roles = ['USER', 'TECHNICIAN', 'ADMIN'];
const statuses = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const options = (values: string[]) => values.map(value => ({ value, label: value }));

@Component({
  selector: 'app-workspace',
  imports: [FormsModule],
  templateUrl: './workspace.html',
  styleUrl: '../../app.css',
})
export class Workspace implements OnInit {
  readonly resource = input.required<Resource>();
  private readonly service = inject(WorkspaceService);
  private readonly categories = inject(CategoryService);
  private readonly view = inject(ChangeDetectorRef);
  rows: Row[] = [];
  fields: Field[] = [];
  form: Record<string, Value> = {};
  editing: Row | null = null;
  search = '';
  filter = '';
  order = 'asc';
  page = 1;
  totalPages = 0;
  busy = false;
  error = '';

  get isTicket() { return this.resource() === 'tickets'; }
  get filters() { return this.isTicket ? statuses : roles; }
  get displayField() { return this.isTicket ? 'title' : 'fullName'; }
  get visibleFields() {
    return this.fields.filter(field => this.editing ? !field.createOnly : !field.editOnly);
  }

  async ngOnInit() {
    this.busy = true;
    try {
      this.fields = this.isTicket ? await this.ticketFields() : [
        { key: 'fullName', label: 'Họ tên' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Vai trò', kind: 'select', options: options(roles) },
        { key: 'isActive', label: 'Hoạt động', kind: 'select', editOnly: true,
          options: [{ value: true, label: 'Có' }, { value: false, label: 'Không' }] }
      ];
      this.reset();
      await this.fetchRows();
    } catch (error) { this.showError(error); }
    finally { this.busy = false; this.view.markForCheck(); }
  }

  private async ticketFields(): Promise<Field[]> {
    const accounts: Row[] = [];
    const categories = [];
    let page = 1;
    let lastPage = 1;
    do {
      const result = await firstValueFrom(this.service.list('users', { page, pageSize: 100 }));
      accounts.push(...result.data);
      lastPage = result.meta?.totalPages ?? 0;
      page++;
    } while (page <= lastPage);
    page = 1;
    do {
      const result = await firstValueFrom(this.categories.list('', page, 'name', 'asc', 'true'));
      categories.push(...result.data);
      lastPage = result.meta?.totalPages ?? 0;
      page++;
    } while (page <= lastPage);
    const active = accounts.filter(user => user['isActive']);
    const accountOptions = (rows: Row[]) => rows.map(user => ({ value: user.id, label: String(user['fullName']) }));
    return [
      { key: 'title', label: 'Tiêu đề' },
      { key: 'description', label: 'Mô tả', kind: 'textarea' },
      { key: 'categoryId', label: 'Danh mục', kind: 'select', options: categories.map(row => ({ value: row.id, label: row.name })) },
      { key: 'requesterId', label: 'Người gửi mẫu', kind: 'select', createOnly: true, options: accountOptions(active) },
      { key: 'assigneeId', label: 'Kỹ thuật viên', kind: 'select', editOnly: true, options: [
        { value: null, label: 'Chưa phân công' }, ...accountOptions(active.filter(user => user['role'] === 'TECHNICIAN'))
      ] },
      { key: 'priority', label: 'Ưu tiên', kind: 'select', editOnly: true, options: options(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) },
      { key: 'status', label: 'Trạng thái', kind: 'select', editOnly: true, options: options(statuses) }
    ];
  }

  async load(page: number) {
    this.page = page;
    this.busy = true;
    this.error = '';
    try { await this.fetchRows(); }
    catch (error) { this.showError(error); }
    finally { this.busy = false; this.view.markForCheck(); }
  }

  private async fetchRows() {
    const result = await firstValueFrom(this.service.list(this.resource(), {
      search: this.search, filter: this.filter, sortBy: this.displayField, sortOrder: this.order, page: this.page
    }));
    this.rows = result.data;
    this.totalPages = result.meta?.totalPages ?? 0;
  }

  edit(row: Row) { this.editing = row; this.form = { ...row }; }
  reset() {
    this.editing = null;
    this.form = Object.fromEntries(this.fields.map(field => [field.key, field.options?.[0]?.value ?? '']));
  }

  async save() {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    const payload = Object.fromEntries(this.visibleFields.map(field => [field.key, this.form[field.key]]));
    if (this.isTicket && this.editing) payload['version'] = this.editing['version'];
    try {
      await firstValueFrom(this.service.save(this.resource(), this.editing?.id ?? null, payload));
      this.reset();
      this.page = 1;
      await this.fetchRows();
    } catch (error) { this.showError(error); }
    finally { this.busy = false; this.view.markForCheck(); }
  }

  private showError(error: unknown) {
    const response = error as { error?: { error?: { message?: string } } };
    this.error = response?.error?.error?.message ?? 'Không tải hoặc lưu được dữ liệu';
  }
}
