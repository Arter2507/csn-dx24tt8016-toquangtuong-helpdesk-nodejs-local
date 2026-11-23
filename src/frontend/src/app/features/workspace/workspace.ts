import { RowMenu } from '../../row-menu';
import { BulkActions, RowSelection } from '../../bulk-actions';
import { Loading } from '../../loading';
import { Translate, I18n, errorKey } from '../../i18n';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Preferences } from '../../preferences';
import { Session } from '../../session';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { Category } from '../categories/interfaces/category';
import { CategoryService } from '../categories/services/category.service';
import { ticketPriorities, ticketStatuses, userRoles } from './workspace-labels';
import { WorkspaceService } from './workspace.service';
import {
  Attachment,
  Field,
  Resource,
  Row,
  TicketComment,
  TicketEvent,
  Value,
} from './workspace.types';

const MAX_FILES = 5;
const MAX_BYTES = 50_000_000;
const FILE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];

@Component({
  selector: 'app-workspace',
  imports: [Translate, Loading, RowMenu, BulkActions, FormsModule, RouterLink, DatePipe],
  templateUrl: './workspace.html',
})
export class Workspace implements OnInit {
  readonly resource = input.required<Resource>();
  readonly mode = input<'list' | 'create' | 'edit' | 'view'>('list');
  readonly id = input<string>();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly i18n = inject(I18n);
  readonly selection = new RowSelection();
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
  noticeCode = '';
  noticeTicket: number | null = null;

  get rowIds() {
    return this.rows.map((row) => row.id);
  }
  readonly bulk = viewChild(BulkActions);
  readonly session = inject(Session);
  private readonly preferences = inject(Preferences);
  sender: { id: number; name: string; roles: unknown[] } | null = null;
  comments: TicketComment[] = [];
  comment = '';
  commentError = '';
  commentSaving = false;
  specialties: { categories: Category[]; selected: Set<number> } | null = null;
  specialtyFeedback = '';

  get secured() {
    return this.session.mode() === 'mysql';
  }

  get transitionNoteRequired() {
    const previous = this.editing?.['status'];
    const next = this.form['status'];
    return (
      this.secured &&
      previous !== next &&
      (next === 'RESOLVED' || (previous === 'RESOLVED' && next === 'IN_PROGRESS'))
    );
  }

  lockedField(field: Field) {
    if (
      !this.isTicket &&
      field.key === 'email' &&
      this.editing?.id === (this.session.account()?.id ?? 3)
    )
      return true;
    if (!this.secured || !this.isTicket || !this.editing || this.session.hasRole('ADMIN'))
      return false;
    if (field.key === 'status') return false;
    return (
      field.key !== 'priority' ||
      !this.session.hasRole('TECHNICIAN') ||
      this.session.account()?.id !== this.editing['assigneeId']
    );
  }

  itemMode(row: Row) {
    if (!this.isTicket) return 'edit';
    if (row['status'] === 'CLOSED') return 'view';
    return !this.secured && this.requesterId ? 'view' : 'edit';
  }

  statusSaving = false;
  statusError = '';
  get canDelete() {
    return (
      this.isTicket &&
      this.session.allows('ADMIN') &&
      !this.requesterId &&
      !(Number(this.assigneeId) > 0)
    );
  }
  get isTicket() {
    return this.resource() === 'tickets';
  }
  get filters() {
    return this.isTicket ? ticketStatuses : userRoles;
  }
  get displayField() {
    return this.isTicket ? 'title' : 'fullName';
  }
  get readOnly() {
    return this.mode() === 'view' || this.closed;
  }
  get scope() {
    return { requesterId: this.requesterId || null, assigneeId: this.assigneeId || null };
  }
  get closed() {
    return this.editing?.['status'] === 'CLOSED';
  }
  get startRow() {
    return (this.page - 1) * this.pageSize + 1;
  }

  ngOnInit() {
    const result = this.router.lastSuccessfulNavigation()?.extras.info as
      { notice?: string; ticketId?: number; code?: string } | undefined;
    this.notice = result?.notice ?? '';
    this.noticeTicket = result?.ticketId ?? null;
    this.noticeCode = result?.code ?? '';
    if (this.mode() === 'list') {
      this.order = this.isTicket ? 'recent' : 'asc';
      this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
        this.requesterId = params.get('requesterId') ?? '';
        this.assigneeId = params.get('assigneeId') ?? '';
        this.search = params.get('q') ?? '';
        const filter = params.get('status') ?? '';
        this.filter = this.filters.some((item) => item.value === filter) ? filter : '';
        this.applyFilters();
      });
      return;
    }
    if (this.isTicket) {
      this.requesterId = this.route.snapshot.queryParamMap.get('requesterId') ?? '';
      this.assigneeId = this.route.snapshot.queryParamMap.get('assigneeId') ?? '';
      if (this.mode() !== 'view') void this.loadToday(1);
    }
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      void this.loadEditor(params.get('id'));
    });
  }

  private async loadEditor(id: string | null) {
    const request = ++this.request;
    this.busy = true;
    this.error = '';
    this.editing = null;
    this.sender = null;
    this.attachments = [];
    this.files = [];
    this.removed = [];
    this.fileError = '';
    this.dragging = false;
    this.history = [];
    this.comments = [];
    this.specialties = null;
    this.specialtyFeedback = '';
    this.comment = '';
    this.commentError = '';
    try {
      const row = id ? (await firstValueFrom(this.service.find(this.resource(), id))).data : null;
      const fields: Field[] = this.isTicket
        ? await this.ticketFields(row)
        : [
            {
              key: 'fullName',
              label: 'full_name',
              placeholder: 'enter_a_full_name',
              maxLength: 150,
            },
            {
              key: 'email',
              label: 'email',
              kind: 'email',
              placeholder: 'name@example.com',
              maxLength: 254,
            },
            { key: 'role', label: 'role', kind: 'select', options: userRoles },
            ...(!row && this.secured
              ? [
                  {
                    key: 'password',
                    label: 'initial_password',
                    kind: 'password' as const,
                    maxLength: 72,
                  },
                ]
              : []),
            ...(row
              ? [
                  {
                    key: 'isActive',
                    label: 'account_status',
                    kind: 'select' as const,
                    options: [
                      { value: true, label: 'in_use' },
                      { value: false, label: 'not_in_use' },
                    ],
                  },
                ]
              : []),
          ];
      if (request !== this.request || this.destroy.destroyed) return;
      this.editing = row;
      this.attachments = row?.attachments ?? [];
      this.history = row?.history ?? [];
      this.fields = fields;
      if (row && this.secured) {
        if (this.isTicket) void this.loadComments(row.id, request);
        else if (row['role'] === 'TECHNICIAN') void this.loadSpecialties(row.id, request);
      }
      this.form = Object.fromEntries(
        fields.map((field) => [
          field.key,
          row
            ? row[field.key]
            : field.key === 'priority'
              ? 'MEDIUM'
              : field.key === 'categoryId'
                ? null
                : (field.options?.[0]?.value ?? ''),
        ]),
      );
      if (this.isTicket && !row && !this.sender) this.error = 'api_INVALID_REQUESTER';
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
    const createdOn = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
      new Date(),
    );
    try {
      const result = await firstValueFrom(
        this.service.list('tickets', {
          createdOn,
          page,
          pageSize: 5,
          sortBy: 'id',
          sortOrder: 'desc',
          requesterId: this.requesterId,
          assigneeId: this.assigneeId,
        }),
      );
      this.todayRows = result.data;
      this.todayPage = result.meta?.page ?? page;
      this.todayPages = result.meta?.totalPages ?? 0;
    } catch {
      this.todayError = true;
    } finally {
      this.todayBusy = false;
      if (!this.destroy.destroyed) this.view.markForCheck();
    }
  }

  pickFiles(input: HTMLInputElement) {
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  private async loadSpecialties(id: number, request: number) {
    try {
      const { categories, assigned } = await firstValueFrom(
        forkJoin({
          categories: this.categories.listAll(),
          assigned: this.service.specialties(id),
        }),
      );
      if (request === this.request)
        this.specialties = { categories, selected: new Set(assigned.data) };
    } catch (error) {
      if (request === this.request) this.specialtyFeedback = errorKey(error);
    } finally {
      if (request === this.request && !this.destroy.destroyed) this.view.markForCheck();
    }
  }

  toggleSpecialty(id: number, selected: boolean) {
    if (selected) this.specialties?.selected.add(id);
    else this.specialties?.selected.delete(id);
    this.specialtyFeedback = '';
  }

  async saveSpecialties() {
    if (!this.editing || !this.specialties || this.saving) return;
    this.saving = true;
    this.specialtyFeedback = '';
    try {
      await firstValueFrom(
        this.service.saveSpecialties(this.editing.id, [...this.specialties.selected]),
      );
      this.specialtyFeedback = 'specialties_saved';
    } catch (error) {
      this.specialtyFeedback = errorKey(error);
    } finally {
      this.saving = false;
      if (!this.destroy.destroyed) this.view.markForCheck();
    }
  }

  private async loadComments(id: number, request = this.request) {
    try {
      const response = await firstValueFrom(this.service.comments(id));
      if (request === this.request) this.comments = response.data;
    } catch (error) {
      if (request === this.request) this.commentError = errorKey(error);
    } finally {
      if (request === this.request && !this.destroy.destroyed) this.view.markForCheck();
    }
  }

  async sendComment() {
    const id = this.editing?.id;
    if (!id || this.commentSaving || !this.comment.trim()) return;
    this.commentSaving = true;
    this.commentError = '';
    try {
      const { data } = await firstValueFrom(this.service.addComment(id, this.comment.trim()));
      if (this.editing?.id === id) {
        this.comments = [...this.comments, data];
        this.comment = '';
      }
    } catch (error) {
      this.commentError = errorKey(error);
    } finally {
      this.commentSaving = false;
      if (!this.destroy.destroyed) this.view.markForCheck();
    }
  }

  dragFiles(event: DragEvent) {
    event.preventDefault();
    this.dragging = event.type === 'dragover' && !this.saving;
    if (event.type === 'drop') this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  private addFiles(files: File[]) {
    if (!files.length || this.readOnly || this.saving) return;
    this.fileError = '';
    if (files.some((file) => !FILE_TYPES.includes(file.type) || !file.size)) {
      this.fileError = 'choose_a_valid_png_jpeg_gif_webp_or_pdf';
      return;
    }
    const next = [...this.attachments, ...this.files, ...files];
    if (next.length > MAX_FILES) {
      this.fileError = 'you_can_attach_up_to_5_files_to_a_request';
      return;
    }
    if (next.reduce((total, file) => total + file.size, 0) > MAX_BYTES) {
      this.fileError = 'attachments_can_be_up_to_50_mb_in_total';
      return;
    }
    this.files = [...this.files, ...files];
  }

  removeAttachment(id: string) {
    this.attachments = this.attachments.filter((file) => file.id !== id);
    this.removed.push(id);
    this.fileError = '';
  }

  removeFile(index: number) {
    this.files = this.files.filter((_, position) => position !== index);
    this.fileError = '';
  }

  private async loadOptions() {
    const { users, categories } = await firstValueFrom(
      forkJoin({
        users: this.service.listAll('users'),
        categories: this.categories.listAll(),
      }),
    );
    this.optionsLoaded = true;
    this.categoryOptions = categories;

    this.accountNames = new Map(users.map((row) => [row.id, this.i18n.personKey(row)]));
    return users;
  }

  senderRole(role: unknown) {
    return userRoles.find((item) => item.value === role)?.label ?? '';
  }

  private async ticketFields(row: Row | null): Promise<Field[]> {
    const accounts = await this.loadOptions();
    const accountOptions = (rows: Row[]) =>
      rows.map((row) => ({ value: row.id, label: this.i18n.personKey(row) }));
    if (!row) {
      const signedIn = this.session.account();
      const demoId = Number(this.requesterId) || this.preferences.account();
      const demo = accounts.find((user) => user.id === demoId && user['isActive']);
      this.sender = signedIn
        ? { id: signedIn.id, name: signedIn.fullName, roles: signedIn.roleCodes }
        : demo
          ? { id: demo.id, name: this.i18n.personKey(demo), roles: [demo['role']] }
          : null;
    }
    const categories = this.categoryOptions.filter(
      (category) => category.isActive || category.id === row?.['categoryId'],
    );
    const assignees = accounts.filter(
      (user) =>
        (user['isActive'] && user['role'] === 'TECHNICIAN') || user.id === row?.['assigneeId'],
    );
    return [
      {
        key: 'title',
        label: 'request_title',
        placeholder: 'enter_a_brief_title',
        maxLength: 200,
        wide: true,
      },
      {
        key: 'categoryId',
        label: 'request_category',
        kind: 'select',
        options: [
          { value: null, label: 'choose_a_category' },
          ...categories.map((row) => ({ value: row.id, label: row.name })),
        ],
      },
      {
        key: 'description',
        label: 'describe_the_issue',
        kind: 'textarea',
        placeholder: 'tell_us_what_happened_and_what_youve_already_tried',
        maxLength: 10000,
        wide: true,
      },
      ...(row
        ? [
            {
              key: 'priority',
              label: 'priority_level',
              kind: 'select' as const,
              options: ticketPriorities,
            },
            {
              key: 'assigneeId',
              label: 'technician_2',
              kind: 'select' as const,
              optional: true,
              options: [{ value: null, label: 'unassigned' }, ...accountOptions(assignees)],
            },
            {
              key: 'status',
              label: 'status',
              kind: 'select' as const,
              options: this.statusOptions(row),
            },
          ]
        : []),
    ];
  }

  private statusOptions(row: Row) {
    if (!this.secured) return ticketStatuses;
    const current = row['status'];
    const account = this.session.account();
    const owner = account?.id === row['requesterId'];
    const handling =
      this.session.hasRole('ADMIN') ||
      (this.session.hasRole('TECHNICIAN') && account?.id === row['assigneeId']);
    return ticketStatuses.filter(
      ({ value }) =>
        value === current ||
        (handling && current === 'NEW' && value === 'IN_PROGRESS') ||
        (handling && current === 'IN_PROGRESS' && value === 'RESOLVED') ||
        (owner && current === 'RESOLVED' && (value === 'CLOSED' || value === 'IN_PROGRESS')),
    );
  }

  applyFilters() {
    this.applied = {
      search: this.search.trim().slice(0, 100),
      filter: this.filter,
      priority: this.priorityFilter,
      categoryId: this.categoryFilter,
      order: this.order,
    };
    void this.load(1);
  }

  clearFilters() {
    this.search = this.filter = this.priorityFilter = '';
    this.categoryFilter = 0;
    this.order = this.isTicket ? 'recent' : 'asc';
    if (
      this.route.snapshot.queryParamMap.has('q') ||
      this.route.snapshot.queryParamMap.has('status')
    ) {
      void this.router.navigate(['/', this.resource()], { queryParams: this.scope });
    } else {
      this.applyFilters();
    }
  }

  async load(page: number) {
    this.selection.clear();
    const request = ++this.request;
    this.busy = true;
    this.error = '';
    const { search, filter, priority, categoryId, order } = this.applied;
    try {
      if (this.isTicket && !this.optionsLoaded) await this.loadOptions();
      if (request !== this.request || this.destroy.destroyed) return;
      const result = await firstValueFrom(
        this.service.list(this.resource(), {
          search,
          filter,
          priority,
          categoryId: categoryId || '',
          page,
          requesterId: this.requesterId,
          assigneeId: this.assigneeId,
          sortBy: order === 'recent' ? 'id' : this.displayField,
          sortOrder: order === 'asc' ? 'asc' : 'desc',
        }),
      );
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

  async toggleUser(row: Row) {
    if (this.isTicket || this.statusSaving) return;
    this.statusSaving = true;
    this.statusError = this.notice = '';
    this.noticeTicket = null;
    try {
      const isActive = !row['isActive'];
      await firstValueFrom(this.service.save('users', row.id, { isActive }));
      if (this.destroy.destroyed) return;
      this.notice = isActive ? 'user_activated' : 'user_deactivated';
      await this.load(this.page);
    } catch (error) {
      this.statusError = errorKey(error);
    } finally {
      this.statusSaving = false;
      if (!this.destroy.destroyed) this.view.markForCheck();
    }
  }

  categoryName(id: number) {
    const category = this.categoryOptions.find((row) => row.id === id);
    return category ? this.i18n.category(category) : '—';
  }

  fieldLabel(field: Field, value: Value, fallback: string) {
    return field.key === 'categoryId' && typeof value === 'number'
      ? this.categoryName(value)
      : this.i18n.text(fallback);
  }

  status(value: unknown) {
    return ticketStatuses.find((item) => item.value === value);
  }
  priority(value: unknown) {
    return ticketPriorities.find((item) => item.value === value);
  }
  role(value: unknown) {
    return userRoles.find((item) => item.value === value)?.label;
  }

  async save(editor: NgForm) {
    if (
      this.busy ||
      this.saving ||
      this.readOnly ||
      (this.isTicket && !this.editing && !this.sender)
    )
      return;
    if (editor.invalid) {
      editor.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('.editor .ng-invalid:not(form)')?.focus();
      return;
    }
    this.saving = true;
    this.error = '';
    const payload = Object.fromEntries(
      this.fields.map((field) => [field.key, this.form[field.key]]),
    );
    if (this.isTicket && !this.editing && !this.secured && this.sender)
      payload['requesterId'] = this.sender.id;
    if (this.isTicket && this.editing) {
      payload['version'] = this.editing['version'];
      if (this.transitionNoteRequired) payload['note'] = this.form['note'];
    }
    try {
      const { data } = await firstValueFrom(
        this.service.save(
          this.resource(),
          this.editing?.id ?? null,
          payload,
          this.files,
          this.removed,
        ),
      );
      const notice = this.isTicket
        ? this.editing
          ? 'updated_request'
          : 'sent_request'
        : this.editing
          ? 'user_updated'
          : 'user_added';
      await this.router.navigate(['/', this.resource()], {
        queryParams: this.scope,
        info: {
          notice,
          ticketId: this.isTicket ? data.id : null,
          code: data['code'] ?? '#' + data.id,
        },
      });
    } catch (error) {
      this.showError(error);
    } finally {
      this.saving = false;
      this.view.markForCheck();
    }
  }

  private showError(error: unknown) {
    this.error = errorKey(error);
  }
}
