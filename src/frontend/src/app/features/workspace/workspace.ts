import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { Category } from '../categories/interfaces/category';
import { CategoryService } from '../categories/services/category.service';
import { ticketPriorities, ticketStatuses, userRoles } from './workspace-labels';
import { WorkspaceService } from './workspace.service';
import { Attachment, Field, Resource, Row, TicketEvent, Value } from './workspace.types';

const MAX_FILES = 5;
const MAX_BYTES = 50_000_000;
const FILE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];

@Component({
  selector: 'app-workspace',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './workspace.html',
})
export class Workspace implements OnInit {
  readonly resource = input.required<Resource>();
  readonly mode = input<'list' | 'create' | 'edit' | 'view'>('list');
  readonly id = input<string>();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(WorkspaceService);
  private readonly categories = inject(CategoryService);
  private readonly view = inject(ChangeDetectorRef);
  private readonly destroy = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private request = 0;
  private optionsLoaded = false;

  readonly fileTypes = FILE_TYPES.join(',');
  attachments: Attachment[] = [];
  files: File[] = [];
  removed: string[] = [];
  fileError = '';
  dragging = false;
  history: TicketEvent[] = [];
  requesterId = '';
  assigneeId = '';
  todayRows: Row[] = [];
  todayBusy = false;
  todayError = false;
  todayPage = 1;
  todayPages = 0;

  readonly statuses = ticketStatuses;
  readonly priorities = ticketPriorities;
  rows: Row[] = [];
  fields: Field[] = [];
  form: Record<string, Value> = {};
  editing: Row | null = null;
  categoryOptions: Category[] = [];
  categoryNames = new Map<number, string>();
  accountNames = new Map<number, string>();
  search = '';
  filter = '';
  priorityFilter = '';
  categoryFilter = 0;
  order = '';
  applied = { search: '', filter: '', priority: '', categoryId: 0, order: '' };
  page = 1;
  totalPages = 0;
  total = 0;
  pageSize = 20;
  busy = true;
  saving = false;
  error = '';
  notice = '';
  noticeTicket: number | null = null;

  get isTicket() { return this.resource() === 'tickets'; }
  get filters() { return this.isTicket ? ticketStatuses : userRoles; }
  get displayField() { return this.isTicket ? 'title' : 'fullName'; }
  get fixedRequester() { return !!this.requesterId && Number(this.requesterId) === this.form['requesterId']; }
  get readOnly() { return this.mode() === 'view' || this.closed; }
  get scope() { return { requesterId: this.requesterId || null, assigneeId: this.assigneeId || null }; }
  get closed() { return this.editing?.['status'] === 'CLOSED'; }
  get startRow() { return (this.page - 1) * this.pageSize + 1; }

  ngOnInit() {
    const result = this.router.lastSuccessfulNavigation()?.extras.info as { notice?: string; ticketId?: number } | undefined;
    this.notice = result?.notice ?? '';
    this.noticeTicket = result?.ticketId ?? null;
    if (this.mode() === 'list') {
      this.order = this.isTicket ? 'recent' : 'asc';
      this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(params => {
        this.requesterId = params.get('requesterId') ?? '';
        this.assigneeId = params.get('assigneeId') ?? '';
        this.search = params.get('q') ?? '';
        const filter = params.get('status') ?? '';
        this.filter = this.filters.some(item => item.value === filter) ? filter : '';
        this.applyFilters();
      });
      return;
    }
    if (this.isTicket) {
      this.requesterId = this.route.snapshot.queryParamMap.get('requesterId') ?? '';
      this.assigneeId = this.route.snapshot.queryParamMap.get('assigneeId') ?? '';
      if (this.mode() !== 'view') void this.loadToday(1);
    }
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(params => {
      void this.loadEditor(params.get('id'));
    });
  }

  private async loadEditor(id: string | null) {
    const request = ++this.request;
    this.busy = true;
    this.error = '';
    this.editing = null;
    this.attachments = [];
    this.files = [];
    this.removed = [];
    this.fileError = '';
    this.dragging = false;
    this.history = [];
    try {
      const row = id ? (await firstValueFrom(this.service.find(this.resource(), id))).data : null;
      const fields: Field[] = this.isTicket ? await this.ticketFields(row) : [
        { key: 'fullName', label: 'Họ tên', placeholder: 'Nhập họ tên', maxLength: 150 },
        { key: 'email', label: 'Email', kind: 'email', placeholder: 'name@example.com', maxLength: 254 },
        { key: 'role', label: 'Vai trò', kind: 'select', options: userRoles },
        ...(row ? [{ key: 'isActive', label: 'Trạng thái tài khoản', kind: 'select' as const,
          options: [{ value: true, label: 'Hoạt động' }, { value: false, label: 'Ngừng hoạt động' }] }] : []),
      ];
      if (request !== this.request || this.destroy.destroyed) return;
      this.editing = row;
      this.attachments = row?.attachments ?? [];
      this.history = row?.history ?? [];
      this.fields = fields;
      this.form = Object.fromEntries(fields.map(field => [
        field.key, row ? row[field.key] : field.key === 'priority' ? 'MEDIUM' : field.key === 'categoryId' ? null : field.options?.[0]?.value ?? '',
      ]));
      const requesters = fields.find(field => field.key === 'requesterId')?.options;
      if (requesters?.some(option => option.value === Number(this.requesterId))) this.form['requesterId'] = Number(this.requesterId);
    } catch (error) {
      if (request === this.request) this.showError(error);
    } finally {
      if (request === this.request && !this.destroy.destroyed) {
        this.busy = false;
        this.view.markForCheck();
      }
    }
  }

  async loadToday(page: number) {
    this.todayBusy = true;
    this.todayError = false;
    const createdOn = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    try {
      const result = await firstValueFrom(this.service.list('tickets', { createdOn, page, pageSize: 5, sortBy: 'id', sortOrder: 'desc', requesterId: this.requesterId, assigneeId: this.assigneeId }));
      this.todayRows = result.data;
      this.todayPage = result.meta?.page ?? page;
      this.todayPages = result.meta?.totalPages ?? 0;
    } catch { this.todayError = true; }
    finally {
      this.todayBusy = false;
      if (!this.destroy.destroyed) this.view.markForCheck();
    }
  }

  pickFiles(input: HTMLInputElement) {
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  dragFiles(event: DragEvent) {
    event.preventDefault();
    this.dragging = event.type === 'dragover' && !this.saving;
    if (event.type === 'drop') this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  private addFiles(files: File[]) {
    if (!files.length || this.readOnly || this.saving) return;
    this.fileError = '';
    if (files.some(file => !FILE_TYPES.includes(file.type) || !file.size)) {
      this.fileError = 'Chỉ chọn ảnh PNG, JPEG, GIF, WebP hoặc PDF hợp lệ.';
      return;
    }
    const next = [...this.attachments, ...this.files, ...files];
    if (next.length > MAX_FILES) {
      this.fileError = 'Mỗi yêu cầu chỉ được đính kèm tối đa 5 tệp.';
      return;
    }
    if (next.reduce((total, file) => total + file.size, 0) > MAX_BYTES) {
      this.fileError = 'Tổng dung lượng đính kèm tối đa 50 MB.';
      return;
    }
    this.files = [...this.files, ...files];
  }

  removeAttachment(id: string) {
    this.attachments = this.attachments.filter(file => file.id !== id);
    this.removed.push(id);
    this.fileError = '';
  }

  removeFile(index: number) {
    this.files = this.files.filter((_, position) => position !== index);
    this.fileError = '';
  }

  private async loadOptions() {
    const { users, categories } = await firstValueFrom(forkJoin({
      users: this.service.listAll('users'), categories: this.categories.listAll(),
    }));
    this.optionsLoaded = true;
    this.categoryOptions = categories;
    this.categoryNames = new Map(categories.map(row => [row.id, row.name]));
    this.accountNames = new Map(users.map(row => [row.id, String(row['fullName'])]));
    return users;
  }

  private async ticketFields(row: Row | null): Promise<Field[]> {
    const accounts = await this.loadOptions();
    const accountOptions = (rows: Row[]) => rows.map(row => ({ value: row.id, label: String(row['fullName']) }));
    const active = accounts.filter(user => user['isActive']);
    const categories = this.categoryOptions.filter(category => category.isActive || category.id === row?.['categoryId']);
    const assignees = accounts.filter(user => (user['isActive'] && user['role'] === 'TECHNICIAN') || user.id === row?.['assigneeId']);
    return [
      { key: 'title', label: 'Tiêu đề yêu cầu', placeholder: 'Nhập tiêu đề sự cố', maxLength: 200, wide: true },
      { key: 'categoryId', label: 'Loại yêu cầu', kind: 'select', options: [
        { value: null, label: 'Chọn loại yêu cầu' }, ...categories.map(row => ({ value: row.id, label: row.name })),
      ] },
      { key: 'priority', label: 'Mức ưu tiên', kind: 'select', options: ticketPriorities },
      { key: 'description', label: 'Mô tả sự cố', kind: 'textarea', placeholder: 'Mô tả chi tiết vấn đề bạn gặp phải', maxLength: 10000, wide: true },
      ...(row ? [
        { key: 'assigneeId', label: 'Kỹ thuật viên', kind: 'select' as const, optional: true,
          options: [{ value: null, label: 'Chưa phân công' }, ...accountOptions(assignees)] },
        { key: 'status', label: 'Trạng thái', kind: 'select' as const, options: ticketStatuses },
      ] : [{ key: 'requesterId', label: 'Người gửi mẫu', kind: 'select' as const, options: accountOptions(active) }]),
    ];
  }

  applyFilters() {
    this.applied = { search: this.search.trim().slice(0, 100), filter: this.filter, priority: this.priorityFilter,
      categoryId: this.categoryFilter, order: this.order };
    void this.load(1);
  }

  clearFilters() {
    this.search = this.filter = this.priorityFilter = '';
    this.categoryFilter = 0;
    this.order = this.isTicket ? 'recent' : 'asc';
    if (this.route.snapshot.queryParamMap.has('q') || this.route.snapshot.queryParamMap.has('status')) {
      void this.router.navigate(['/', this.resource()], { queryParams: this.scope });
    } else {
      this.applyFilters();
    }
  }

  async load(page: number) {
    const request = ++this.request;
    this.busy = true;
    this.error = '';
    const { search, filter, priority, categoryId, order } = this.applied;
    try {
      if (this.isTicket && !this.optionsLoaded) await this.loadOptions();
      if (request !== this.request || this.destroy.destroyed) return;
      const result = await firstValueFrom(this.service.list(this.resource(), {
        search, filter, priority, categoryId: categoryId || '', page,
        requesterId: this.requesterId, assigneeId: this.assigneeId,
        sortBy: order === 'recent' ? 'id' : this.displayField,
        sortOrder: order === 'asc' ? 'asc' : 'desc',
      }));
      if (request !== this.request || this.destroy.destroyed) return;
      this.rows = result.data;
      this.page = result.meta?.page ?? page;
      this.pageSize = result.meta?.pageSize ?? 20;
      this.total = result.meta?.totalItems ?? 0;
      this.totalPages = result.meta?.totalPages ?? 0;
    } catch (error) {
      if (request === this.request) this.showError(error);
    } finally {
      if (request === this.request && !this.destroy.destroyed) {
        this.busy = false;
        this.view.markForCheck();
      }
    }
  }

  status(value: unknown) { return ticketStatuses.find(item => item.value === value); }
  priority(value: unknown) { return ticketPriorities.find(item => item.value === value); }
  role(value: unknown) { return userRoles.find(item => item.value === value)?.label; }

  async save(editor: NgForm) {
    if (this.busy || this.saving || this.readOnly) return;
    if (editor.invalid) {
      editor.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('.editor .ng-invalid:not(form)')?.focus();
      return;
    }
    this.saving = true;
    this.error = '';
    const payload = Object.fromEntries(this.fields.map(field => [field.key, this.form[field.key]]));
    if (this.isTicket && this.editing) payload['version'] = this.editing['version'];
    try {
      const { data } = await firstValueFrom(this.service.save(this.resource(), this.editing?.id ?? null, payload, this.files, this.removed));
      const notice = this.isTicket
        ? (this.editing ? 'Đã cập nhật yêu cầu ' : 'Đã gửi yêu cầu ') + (data['code'] ?? '#' + data.id) + '.'
        : this.editing ? 'Đã cập nhật người dùng.' : 'Đã thêm người dùng.';
      await this.router.navigate(['/', this.resource()], { queryParams: this.scope, info: { notice, ticketId: this.isTicket ? data.id : null } });
    } catch (error) { this.showError(error); }
    finally { this.saving = false; this.view.markForCheck(); }
  }

  private showError(error: unknown) {
    const response = error as { error?: { error?: { message?: string } } };
    this.error = response?.error?.error?.message ?? 'Không tải hoặc lưu được dữ liệu. Vui lòng thử lại.';
  }
}
