import { DatePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, firstValueFrom, forkJoin } from 'rxjs';
import { Category } from '../categories/interfaces/category';
import { ApiResponse, PageMeta } from '../../core/http/api-response';
import { CategoryService } from '../categories/services/category.service';
import { WorkspaceService } from '../../shared/data/workspace.service';
import {
  Invitation,
  Member,
  OrganizationUnit,
  memberRoles,
  memberRoleLabel,
  memberStatuses,
  memberStatusLabel,
} from '../../shared/data/iam';
import { errorKey, I18n, Translate } from '../../core/i18n/i18n';
import { Session } from '../../core/auth/session';
import { RowMenu } from '../../shared/ui/row-menu';
import { BatchStateActions, RowSelection } from '../../shared/ui/batch-state-actions';

const membersUrl = '/api/v1/users';
const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  employeeCode: '',
  unitId: null as number | null,
  position: '',
  customerTier: 'STANDARD' as Member['customerTier'],
  role: 'USER' as Member['role'],
  isActive: true,
};

@Component({
  imports: [DatePipe, FormsModule, RouterLink, Translate, RowMenu, BatchStateActions],
  templateUrl: './members.html',
})
export class MembersPage implements OnInit {
  readonly mode = input.required<'list' | 'create' | 'edit'>();
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(Session);
  private readonly workspace = inject(WorkspaceService);
  private readonly categories = inject(CategoryService);
  readonly i18n = inject(I18n);
  readonly roles = memberRoles;
  readonly statuses = memberStatuses;
  readonly roleLabel = memberRoleLabel;
  readonly statusLabel = memberStatusLabel;
  readonly assignable = memberRoles.filter(
    (role) => role !== 'OWNER' && (role !== 'ADMIN' || this.session.hasRole('OWNER')),
  );
  readonly rows = signal<Member[]>([]);
  readonly selection = new RowSelection();
  readonly rowIds = computed(() => this.rows().map((row) => row.id));
  readonly blockedSelection = computed(() =>
    this.rows().some((row) => this.selection.ids().has(row.id) && !this.canEdit(row)),
  );
  readonly units = signal<OrganizationUnit[]>([]);
  readonly member = signal<Member | null>(null);
  readonly page = signal<PageMeta | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly invitation = signal<(Invitation & { url: string }) | null>(null);
  readonly avatarRevision = signal(0);
  readonly specialties = signal<Category[] | null>(null);
  readonly selected = new Set<number>();
  form = { ...emptyForm };
  search = '';
  role = '';
  status = '';
  file: File | null = null;

  ngOnInit() {
    if (this.mode() === 'list') this.load();
    else
      this.http.get<ApiResponse<OrganizationUnit[]>>('/api/v1/organizations/units').subscribe({
        next: ({ data }) => this.units.set(data),
        error: (error) => this.error.set(errorKey(error)),
      });
    if (this.mode() === 'edit') this.loadMember();
  }

  canEdit(member: Member) {
    return this.assignable.some((role) => role === member.role);
  }

  load(page = 1) {
    this.selection.clear();
    this.busy.set(true);
    this.error.set('');
    let params = new HttpParams().set('page', page).set('pageSize', 15).set('sortBy', 'fullName');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.role) params = params.set('filter', this.role);
    if (this.status) params = params.set('status', this.status);
    this.http
      .get<ApiResponse<Member[]>>(membersUrl, { params })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: ({ data, meta }) => {
          this.rows.set(data);
          this.page.set(meta);
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  loadMember() {
    this.busy.set(true);
    this.error.set('');
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.http
      .get<ApiResponse<Member>>(membersUrl + '/' + id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: ({ data }) => {
          this.member.set(data);
          const {
            fullName,
            email,
            phone,
            employeeCode,
            unitId,
            position,
            role,
            status,
            customerTier,
          } = data;
          this.form = {
            fullName,
            email,
            phone,
            employeeCode: employeeCode ?? '',
            unitId,
            position,
            customerTier,
            role,
            isActive: status !== 'DISABLED',
          };
          this.loadSpecialties(data);
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  async save() {
    if (this.busy()) return;
    const member = this.member();
    const { isActive, unitId, ...profile } = this.form;
    const unitChange = unitId !== member?.unitId ? { unitId } : {};
    this.busy.set(true);
    this.error.set('');
    this.feedback.set('');
    try {
      const request = member
        ? this.http.patch<ApiResponse<Member>>(membersUrl + '/' + member.id, {
            ...profile,
            ...unitChange,
            isActive,
          })
        : this.http.post<ApiResponse<Member>>(membersUrl, { ...profile, unitId });
      const { data } = await firstValueFrom(request);
      this.member.set(data);
      this.feedback.set('member_saved');
      if (data.invitation) this.showInvitation(data.invitation);
      if (data.status !== 'PENDING_ACTIVATION' || (member && data.email !== member.email))
        this.invitation.set(null);
      if (data.role !== member?.role) this.loadSpecialties(data);
      if (this.file) {
        const form = new FormData();
        form.append('avatar', this.file);
        await firstValueFrom(this.http.post<void>(membersUrl + '/' + data.id + '/avatar', form));
        this.member.set({ ...data, hasAvatar: true });
        this.avatarRevision.update((value) => value + 1);
        this.file = null;
      }
    } catch (error) {
      this.error.set(errorKey(error));
    } finally {
      this.busy.set(false);
    }
  }

  changeStatus(member: Member) {
    this.busy.set(true);
    this.error.set('');
    this.feedback.set('');
    this.http
      .patch<ApiResponse<Member>>(membersUrl + '/' + member.id, {
        isActive: member.status === 'DISABLED',
      })
      .subscribe({
        next: ({ data }) => {
          this.rows.update((rows) => rows.map((row) => (row.id === member.id ? data : row)));
          if (this.status && this.status !== data.status) this.load();
          else this.busy.set(false);
          this.feedback.set('member_saved');
          this.invitation.set(null);
        },
        error: (error) => {
          this.error.set(errorKey(error));
          this.busy.set(false);
        },
      });
  }

  batchState(isActive: boolean) {
    const ids = [...this.selection.ids()];
    if (this.busy() || !ids.length || this.blockedSelection()) return;
    this.busy.set(true);
    this.error.set('');
    this.feedback.set('');
    this.http
      .patch<ApiResponse<{ count: number }>>(membersUrl + '/batch-state', { ids, isActive })
      .subscribe({
        next: () => {
          this.invitation.set(null);
          this.feedback.set(isActive ? 'batch_members_enabled' : 'batch_members_disabled');
          this.load();
        },
        error: (error) => {
          this.error.set(errorKey(error));
          this.busy.set(false);
        },
      });
  }

  chooseAvatar(event: Event) {
    this.file = (event.target as HTMLInputElement).files?.item(0) ?? null;
  }

  avatarUrl(member: Member) {
    return membersUrl + '/' + member.id + '/avatar?revision=' + this.avatarRevision();
  }

  invite(member: Member) {
    this.busy.set(true);
    this.error.set('');
    this.http
      .post<ApiResponse<Invitation>>(membersUrl + '/' + member.id + '/invitation', {})
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: ({ data }) => this.showInvitation(data),
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  private showInvitation(invitation: Invitation) {
    this.invitation.set({ ...invitation, url: new URL(invitation.path, document.baseURI).href });
    this.feedback.set('');
  }

  async copyInvitation() {
    const invitation = this.invitation();
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.url);
      this.feedback.set('invitation_copied');
    } catch {
      this.feedback.set('invitation_copy_manual');
    }
  }

  private loadSpecialties(member: Member) {
    this.specialties.set(null);
    this.selected.clear();
    if (member.role !== 'TECHNICIAN' || !this.canEdit(member)) return;
    forkJoin([this.categories.listAll(), this.workspace.specialties(member.id)]).subscribe({
      next: ([categories, { data }]) => {
        this.specialties.set(categories);
        for (const id of data) this.selected.add(id);
      },
      error: (error) => this.error.set(errorKey(error)),
    });
  }

  toggleSpecialty(id: number, checked: boolean) {
    if (checked) this.selected.add(id);
    else this.selected.delete(id);
  }

  saveSpecialties(member: Member) {
    this.busy.set(true);
    this.error.set('');
    this.workspace
      .saveSpecialties(member.id, [...this.selected])
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.feedback.set('specialties_saved'),
        error: (error) => this.error.set(errorKey(error)),
      });
  }
}
