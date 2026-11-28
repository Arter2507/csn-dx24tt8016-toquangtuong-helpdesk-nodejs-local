import { RowMenu } from '../../shared/ui/row-menu';
import { BulkActions } from './bulk-actions';
import { RowSelection } from '../../shared/ui/batch-state-actions';
import { Loading } from '../../shared/ui/loading';
import { Translate, I18n, errorKey } from '../../core/i18n/i18n';
import { DatePipe } from '@angular/common';
import { catalogPaths } from '../categories/catalog';
import {
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Preferences } from '../../core/preferences/preferences';
import { Session } from '../../core/auth/session';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { auditTime, firstValueFrom, forkJoin, merge, timer } from 'rxjs';
import { Notifications } from '../notifications/notifications';
import { TicketActions, canEditTicket } from './ticket-actions';
import { QuickTicket } from './quick-ticket';
import { KnowledgeLinks } from '../knowledge/knowledge-links';
import { Article } from '../knowledge/knowledge.service';
import { Category } from '../categories/interfaces/category';
import { CategoryService } from '../categories/services/category.service';
import {
  formatTicketCode,
  ticketPriorities,
  ticketReference,
  ticketStatuses,
  userRoles,
} from '../../shared/data/workspace-labels';
import { WorkspaceService } from '../../shared/data/workspace.service';
import {
  Attachment,
  Field,
  Resource,
  Row,
  TicketComment,
  TicketDetails,
  TicketEvent,
  Value,
} from '../../shared/data/workspace.types';

const MAX_FILES = 5;
const MAX_BYTES = 50_000_000;
const FILE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];

@Component({
  selector: 'app-workspace',
  imports: [
    Translate,
    Loading,
    RowMenu,
    BulkActions,
    FormsModule,
    RouterLink,
    DatePipe,
    TicketActions,
    QuickTicket,
    KnowledgeLinks,
  ],
  templateUrl: './workspace.html',
})
export class Workspace implements OnInit {
  readonly resource = input.required<Resource>();
  readonly mode = input<'list' | 'create' | 'edit' | 'view'>('list');
  readonly personal = input(false);
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
  private numberRequest = 0;
  private optionsLoaded = false;
  private searchTimer?: ReturnType<typeof setTimeout>;

  readonly fileTypes = FILE_TYPES.join(',');
  attachments: Attachment[] = [];
  files: File[] = [];
  removed: string[] = [];
  fileError = '';
  dragging = false;
  history: TicketEvent[] = [];
  requesterId = '';
  assigneeId = '';
  folderScope: Record<string, string> = {};
  todayRows: Row[] = [];
  todayBusy = false;
  todayError = false;
  todayPage = 1;
  todayPages = 0;

  readonly statuses = ticketStatuses;
  readonly ticketReference = ticketReference;
  readonly formatTicketCode = formatTicketCode;
  readonly priorities = ticketPriorities;
  rows: Row[] = [];
  fields: Field[] = [];
  form: Record<string, Value> = {};
  editing: (Row & TicketDetails) | null = null;
  categoryOptions: Category[] = [];
  categoryPaths = new Map<number, string>();

  accountNames = new Map<number, string>();
  private accountRows = new Map<number, Row>();

  get requesterProfile() {
    if (
      this.personal() ||
      !this.editing ||
      !this.session.hasRole('TECHNICIAN') ||
      this.editing['assigneeId'] !== this.session.account()?.id
    )
      return undefined;
    return this.accountRows.get(Number(this.editing['requesterId']));
  }
  search = '';
  searchOpen = false;
  readonly pageSizes = [5, 10, 20, 50, 100];
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
  readonly quickTicket = viewChild(QuickTicket);
  readonly batchBusy = computed(() => this.bulk()?.busy() ?? false);
  readonly session = inject(Session);
  private readonly notifications = inject(Notifications);
  private readonly preferences = inject(Preferences);
  senderId: number | null = null;
  ticketNumber = '#0000';
  ticketNumberError = '';
  comments: TicketComment[] = [];
  comment = '';
  internalNote = false;
  commentError = '';
  commentSaving = false;
  chatNow = Date.now();
  private commentsRequestInFlight = false;
  chatExpiredByServer = false;
  specialties: { categories: Category[]; selected: Set<number> } | null = null;
  specialtyFeedback = '';

  get secured() {
    return this.session.mode() === 'mysql';
  }

  get transitionNoteRequired() {
    if (this.secured) return false;
    const previous = this.editing?.['status'];
    const next = this.form['status'];
    return (
      previous !== next &&
      (next === 'PENDING_CUSTOMER' ||
        (this.secured &&
          (next === 'RESOLVED' || (previous === 'RESOLVED' && next === 'IN_PROGRESS'))))
    );
  }

  get canWriteInternalNote() {
    return (
      !this.personal() &&
      (this.session.hasRole('ADMIN') ||
        (this.session.hasRole('TECHNICIAN') &&
          this.session.account()?.id === this.editing?.['assigneeId']))
    );
  }

  lockedField(field: Field) {
    if (
      !this.isTicket &&
      field.key === 'email' &&
      this.editing?.id === (this.session.account()?.id ?? 3)
    )
      return true;
    return this.secured && this.isTicket && !!this.editing && field.key === 'priority';
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
      !this.personal() &&
      this.session.allows('ADMIN') &&
      (this.secured || (!this.requesterId && !(Number(this.assigneeId) > 0)))
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
    return (
      this.mode() === 'view' ||
      (this.isTicket && this.editing !== null && !this.canEdit(this.editing))
    );
  }
  canEdit(row: Row & TicketDetails) {
    return canEditTicket(row, this.session);
  }
  get ownTicket() {
    return this.secured && this.editing?.['requesterId'] === this.session.account()?.id;
  }

  get canWriteChat() {
    return this.ownTicket || this.canWriteInternalNote;
  }
  get chatLocked() {
    const expiry = String(this.editing?.['chatExpiresAt'] ?? '');
    return (
      !!this.editing?.mergedInto ||
      this.chatExpiredByServer ||
      (expiry !== '' && Date.parse(expiry) <= this.chatNow)
    );
  }

  changeTicket(row: Row & TicketDetails) {
    const technician = this.session.account();
    if (
      technician?.role === 'TECHNICIAN' &&
      row['assigneeId'] !== technician.id &&
      row['requesterId'] !== technician.id
    ) {
      if (this.editing?.id === row.id) {
        void this.router.navigate([this.listPath], { info: { notice: 'ticket_transferred' } });
      } else {
        this.rows = this.rows.filter((item) => item.id !== row.id);
        this.notice = 'ticket_transferred';
        void this.load(this.page, true);
      }
      return;
    }
    if (this.editing?.id === row.id) {
      this.editing = row;
      this.history = row.history ?? [];
      this.chatExpiredByServer = false;
      this.chatNow = Date.now();
      void this.loadComments(row.id);
    }
    this.rows = this.rows.map((item) => (item.id === row.id ? row : item));
    this.view.markForCheck();
  }

  appendArticle(article: Article) {
    const title = article.title.replace(/[\r\n]/g, ' ');
    this.comment = (this.comment.trimEnd() + '\n' + title + ' /knowledge/' + article.id).trim();
  }

  messageLines(body: string) {
    return body.split('\n').map((line) => {
      const match = /^(.*?)\s*\/knowledge\/(\d+)\s*$/.exec(line);
      return match ? { text: match[1] || line, id: match[2] } : { text: line, id: null };
    });
  }
  get listPath() {
    return (this.personal() ? '/help-center/' : '/management/') + this.resource();
  }

  get scope() {
    return {
      ...this.folderScope,
      requesterId: this.requesterId || null,
      assigneeId: this.assigneeId || null,
    };
  }

  private routeScope(params: ParamMap) {
    this.requesterId = this.personal()
      ? String(this.session.account()?.id ?? this.preferences.account())
      : (params.get('requesterId') ?? '');
    this.assigneeId = this.personal() ? '' : (params.get('assigneeId') ?? '');
    this.folderScope = this.personal()
      ? {}
      : Object.fromEntries(
          ['catalogCategoryId', 'createdMonth', 'createdYear', 'unitId']
            .filter((key) => params.has(key))
            .map((key) => [key, params.get(key)!]),
        );
  }
  get closed() {
    return this.editing?.['status'] === 'CLOSED';
  }
  get startRow() {
    return (this.page - 1) * this.pageSize + 1;
  }

  ngOnInit() {
    this.destroy.onDestroy(() => clearTimeout(this.searchTimer));
    timer(4000, 4000)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        if (!this.secured || !this.editing || !this.isTicket || document.hidden) return;
        this.chatNow = Date.now();
        void this.loadComments(this.editing.id);
        this.view.markForCheck();
      });
    const result = this.router.lastSuccessfulNavigation()?.extras.info as
      { notice?: string; ticketId?: number; code?: string } | undefined;
    this.notice = result?.notice ?? '';
    this.noticeTicket = result?.ticketId ?? null;
    this.noticeCode = result?.code ?? '';
    if (this.mode() === 'list') {
      this.order = this.isTicket ? 'recent' : 'asc';
      this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
        this.routeScope(params);
        this.search = params.get('q') ?? '';
        const filter = params.get('status') ?? '';
        this.filter = this.filters.some((item) => item.value === filter) ? filter : '';
        this.applyFilters();
      });
      if (this.isTicket && this.secured) {
        merge(this.notifications.ticketChanges, timer(30000, 30000))
          .pipe(auditTime(150), takeUntilDestroyed(this.destroy))
          .subscribe(() => void this.load(this.page, true));
      }
      return;
    }
    if (this.isTicket) {
      this.routeScope(this.route.snapshot.queryParamMap);
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
    this.senderId = null;
    this.ticketNumber = '#0000';
    this.ticketNumberError = '';
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
    this.internalNote = false;
    this.commentError = '';
    this.chatExpiredByServer = false;
    try {
      const row = id ? (await firstValueFrom(this.service.find(this.resource(), id))).data : null;
      if (row && this.personal() && row['requesterId'] !== Number(this.requesterId)) {
        if (request === this.request && !this.destroy.destroyed) this.error = 'api_NOT_FOUND';
        return;
      }
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
      if (this.isTicket && !row && !this.senderId) this.error = 'api_INVALID_REQUESTER';
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
    if (this.commentsRequestInFlight || this.commentSaving) return;
    this.commentsRequestInFlight = true;
    const previousComments = this.comments;
    try {
      const response = await firstValueFrom(this.service.comments(id));
      if (request === this.request && this.editing?.id === id && !this.commentSaving) {
        if (this.comments === previousComments)
          this.comments = this.personal()
            ? response.data.filter((comment) => !comment.internal)
            : response.data;
        if (response.meta.version >= Number(this.editing['version'])) {
          const { chatExpiresAt, status, resolvedAt, firstResponseAt } = response.meta;
          const version = this.mode() === 'view' ? response.meta.version : this.editing['version'];
          if (
            this.editing['chatExpiresAt'] !== chatExpiresAt ||
            this.editing['status'] !== status ||
            this.editing['resolvedAt'] !== resolvedAt ||
            this.editing['firstResponseAt'] !== firstResponseAt ||
            this.editing['version'] !== version
          ) {
            this.editing = Object.assign({}, this.editing, {
              chatExpiresAt,
              status,
              resolvedAt,
              firstResponseAt,
              version,
            });
          }
          if (!response.meta.chatExpiresAt) this.chatExpiredByServer = false;
        }
      }
    } catch (error) {
      if (request === this.request) this.commentError = errorKey(error);
    } finally {
      this.commentsRequestInFlight = false;
      if (request === this.request && !this.destroy.destroyed) this.view.markForCheck();
    }
  }

  async sendComment() {
    const id = this.editing?.id;
    if (
      !id ||
      this.commentSaving ||
      this.chatLocked ||
      !this.canWriteChat ||
      !this.comment.trim() ||
      this.comment.length > 5000
    )
      return;
    const request = this.request;
    this.commentSaving = true;
    this.commentError = '';
    try {
      const { data } = await firstValueFrom(
        this.service.addComment(
          id,
          this.comment.trim(),
          this.canWriteInternalNote && this.internalNote,
        ),
      );
      if (request === this.request && this.editing?.id === id) {
        this.comments = [...this.comments, data];
        this.comment = '';
        const change = data.ticketUpdate;
        const editing = this.editing;
        if (data.firstResponseAt)
          this.editing = Object.assign({}, editing, { firstResponseAt: data.firstResponseAt });
        if (change && editing['version'] === change.version - 1) {
          this.editing = Object.assign({}, this.editing ?? editing, {
            status: change.status,
            version: change.version,
          });
          this.form['status'] = change.status;
          this.history = [...this.history, { status: change.status, at: change.at }];
          this.fields = this.fields.map((field) =>
            field.key === 'status'
              ? { ...field, options: this.statusOptions(this.editing!) }
              : field,
          );
        }
      }
    } catch (error) {
      this.commentError = errorKey(error);
      if (this.commentError === 'api_CHAT_EXPIRED') this.chatExpiredByServer = true;
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
    const catalog = catalogPaths(categories, (category) => this.i18n.category(category));
    this.categoryOptions = catalog.map((entry) => entry.row);
    this.categoryPaths = new Map(catalog.map((entry) => [entry.row.id, entry.path]));

    this.accountNames = new Map(users.map((row) => [row.id, this.i18n.personKey(row)]));
    this.accountRows = new Map(users.map((row) => [row.id, row]));
    return users;
  }

  async selectField(field: Field, value: Value) {
    this.form[field.key] = value;
    if (!this.isTicket || this.mode() !== 'create' || field.key !== 'categoryId') return;
    const editorRequest = this.request;
    const numberRequest = ++this.numberRequest;
    const current = () =>
      editorRequest === this.request &&
      numberRequest === this.numberRequest &&
      !this.destroy.destroyed;
    this.ticketNumberError = '';
    this.ticketNumber = typeof value === 'number' ? '…' : '#0000';
    if (typeof value !== 'number') return;
    try {
      const { data } = await firstValueFrom(this.service.previewTicketNumber(value));
      if (current()) this.ticketNumber = formatTicketCode(data.code);
    } catch (error) {
      if (current()) {
        this.ticketNumber = '—';
        this.ticketNumberError = errorKey(error, 'ticket_number_unavailable');
      }
    } finally {
      if (current()) this.view.markForCheck();
    }
  }

  private async ticketFields(row: Row | null): Promise<Field[]> {
    const accounts = await this.loadOptions();
    const accountOptions = (rows: Row[]) =>
      rows.map((row) => ({ value: row.id, label: this.i18n.personKey(row) }));
    if (!row) {
      const signedIn = this.session.account();
      const demoId = Number(this.requesterId) || this.preferences.account();
      const demo = accounts.find((user) => user.id === demoId && user['isActive']);
      this.senderId = signedIn?.id ?? demo?.id ?? null;
    }
    const categories = this.categoryOptions.filter(
      (category) => category.isActive || category.id === row?.['categoryId'],
    );
    const assignees = accounts.filter(
      (user) =>
        (user['isActive'] && user['role'] === 'TECHNICIAN') || user.id === row?.['assigneeId'],
    );
    const fields: Field[] = [
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
          ...categories.map((row) => ({ value: row.id, label: this.categoryName(row.id) })),
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
    if (row && this.secured) {
      return fields.filter((field) => !['status', 'assigneeId', 'categoryId'].includes(field.key));
    }
    return fields;
  }

  private statusOptions(row: Row) {
    const current = row['status'];
    const account = this.session.account();
    const owner = !this.secured || account?.id === row['requesterId'];
    const handling =
      !this.secured ||
      this.session.hasRole('ADMIN') ||
      (this.session.hasRole('TECHNICIAN') && account?.id === row['assigneeId']);
    return ticketStatuses.filter(
      ({ value }) =>
        value === current ||
        (handling && current === 'NEW' && value === 'IN_PROGRESS') ||
        (handling &&
          current === 'IN_PROGRESS' &&
          (value === 'RESOLVED' || value === 'PENDING_CUSTOMER')) ||
        (handling && current === 'PENDING_CUSTOMER' && value === 'IN_PROGRESS') ||
        (owner && current === 'RESOLVED' && (value === 'CLOSED' || value === 'IN_PROGRESS')),
    );
  }

  applyFilters() {
    clearTimeout(this.searchTimer);
    if (this.batchBusy()) return;
    this.applied = {
      search: this.search.trim().slice(0, 100),
      filter: this.filter,
      priority: this.priorityFilter,
      categoryId: this.categoryFilter,
      order: this.order,
    };
    void this.load(1);
  }

  searchChanged(value: string) {
    this.search = value;
    this.searchOpen = true;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 220);
  }

  leaveSearch(event: FocusEvent) {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
      this.searchOpen = false;
  }

  clearFilters() {
    clearTimeout(this.searchTimer);
    this.search = this.filter = this.priorityFilter = '';
    this.categoryFilter = 0;
    this.order = this.isTicket ? 'recent' : 'asc';
    if (
      this.route.snapshot.queryParamMap.has('q') ||
      this.route.snapshot.queryParamMap.has('status')
    ) {
      void this.router.navigate([this.listPath], { queryParams: this.scope });
    } else {
      this.applyFilters();
    }
  }

  async load(page: number, background = false) {
    if (!background) this.selection.clear();
    const request = ++this.request;
    if (!background) this.busy = true;
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
          pageSize: this.pageSize,
          requesterId: this.requesterId,
          assigneeId: this.assigneeId,
          ...this.folderScope,
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
    return this.categoryPaths.get(id) ?? '—';
  }

  slaStatus(deadline: string, completed: string | null) {
    if (completed) return Date.parse(completed) <= Date.parse(deadline) ? 'sla_met' : 'sla_missed';
    return Date.now() <= Date.parse(deadline) ? 'sla_open' : 'sla_overdue';
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
      (this.isTicket && !this.editing && !this.senderId)
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
      this.fields
        .filter((field) => !this.lockedField(field))
        .map((field) => [field.key, this.form[field.key]]),
    );
    if (this.isTicket && !this.editing && !this.secured && this.senderId)
      payload['requesterId'] = this.senderId;
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
      if (this.isTicket && this.secured) {
        if (!this.editing) this.notifications.ticketSubmitted(data.id, ticketReference(data));
        await this.router.navigate([this.listPath, data.id, 'view'], {
          queryParams: this.scope,
          info: this.editing ? { notice, code: ticketReference(data) } : undefined,
        });
        return;
      }
      await this.router.navigate([this.listPath], {
        queryParams: this.scope,
        info: {
          notice,
          ticketId: this.isTicket ? data.id : null,
          code: ticketReference(data),
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
