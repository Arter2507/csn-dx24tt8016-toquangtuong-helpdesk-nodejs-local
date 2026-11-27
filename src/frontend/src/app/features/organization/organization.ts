import { HttpClient } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { ApiResponse } from '../../core/http/api-response';
import { WorkspaceService } from '../../shared/data/workspace.service';
import {
  memberRoleLabel,
  memberRoles,
  memberStatusLabel,
  MemberRole,
  MemberStatus,
  OrganizationUnit,
} from '../../shared/data/iam';
import { errorKey, Translate } from '../../core/i18n/i18n';
import { Session } from '../../core/auth/session';
import { SettingsNav } from '../settings/settings-nav';
import { TreeMember, UnitTree } from './unit-tree';
import { RowMenu } from '../../shared/ui/row-menu';

interface Organization {
  id: number;
  name: string;
  code: string;
  description: string;
  ownerName: string | null;
}

@Component({
  imports: [FormsModule, NgTemplateOutlet, RouterLink, RowMenu, Translate, SettingsNav, UnitTree],
  templateUrl: './organization.html',
})
export class OrganizationPage {
  private readonly http = inject(HttpClient);
  private readonly workspace = inject(WorkspaceService);
  readonly session = inject(Session);
  readonly roles = memberRoles;
  readonly roleLabel = memberRoleLabel;
  readonly statusLabel = memberStatusLabel;
  readonly organization = signal<Organization | null>(null);
  readonly units = signal<OrganizationUnit[]>([]);
  readonly hierarchy = signal<
    {
      role: MemberRole;
      members: (TreeMember & { department: string })[];
    }[]
  >([]);
  readonly treeMembers = computed(() => this.hierarchy().flatMap((group) => group.members));
  readonly view = signal<'list' | 'tree' | 'graph' | 'permissions'>('tree');
  readonly editing = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly saved = signal(false);
  readonly pendingMember = signal<TreeMember | null>(null);
  private readonly organizationName = viewChild<ElementRef<HTMLInputElement>>('organizationName');
  form = { name: '', code: '', description: '' };

  constructor() {
    this.load();
  }

  load() {
    this.busy.set(true);
    this.error.set('');
    forkJoin([
      this.http.get<ApiResponse<Organization>>('/api/v1/organizations'),
      this.workspace.listAll('users'),
      this.http.get<ApiResponse<OrganizationUnit[]>>('/api/v1/organizations/units'),
    ])
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: ([{ data }, rows, { data: units }]) => {
          this.organization.set(data);
          this.units.set(units);
          this.hierarchy.set(
            this.roles.map((role) => ({
              role,
              members: rows
                .filter((row) => row['role'] === role)
                .map((row) => ({
                  id: Number(row['id']),
                  name: String(row['fullName']),
                  employeeCode: row['employeeCode'] == null ? null : String(row['employeeCode']),
                  unitId: row['unitId'] == null ? null : Number(row['unitId']),
                  role,
                  department: String(row['department'] ?? ''),
                  status: row['status'] as MemberStatus,
                })),
            })),
          );
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  edit(organization: Organization) {
    this.form = {
      name: organization.name,
      code: organization.code,
      description: organization.description,
    };
    this.editing.set(true);
    this.saved.set(false);
    this.error.set('');
    requestAnimationFrame(() => this.organizationName()?.nativeElement.focus());
  }

  canManageMember(member: TreeMember) {
    return (
      member.role !== 'OWNER' &&
      (this.session.hasRole('OWNER') || (this.session.hasRole('ADMIN') && member.role !== 'ADMIN'))
    );
  }

  changeMemberStatus(member: TreeMember) {
    if (this.busy() || !this.canManageMember(member)) return;
    this.busy.set(true);
    this.error.set('');
    this.http
      .patch('/api/v1/users/' + member.id, { isActive: member.status === 'DISABLED' })
      .subscribe({
        next: () => this.load(),
        error: (error) => {
          this.error.set(errorKey(error));
          this.busy.set(false);
        },
      });
  }

  save() {
    this.busy.set(true);
    this.error.set('');
    this.http
      .put<ApiResponse<Organization>>('/api/v1/organizations', this.form)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: ({ data }) => {
          this.organization.set(data);
          this.editing.set(false);
          this.saved.set(true);
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }
}
