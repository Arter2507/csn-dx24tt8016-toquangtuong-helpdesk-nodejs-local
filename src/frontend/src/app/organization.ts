import { NgTemplateOutlet } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { ApiResponse } from './features/categories/interfaces/category';
import { WorkspaceService } from './features/workspace/workspace.service';
import { memberRoleLabel, memberRoles, memberStatusLabel, MemberRole, MemberStatus } from './iam';
import { errorKey, Translate } from './i18n';
import { Session } from './session';
import { SettingsNav } from './settings-nav';

interface Organization {
  id: number;
  name: string;
  code: string;
  description: string;
  ownerName: string | null;
}

@Component({
  imports: [NgTemplateOutlet, FormsModule, RouterLink, Translate, SettingsNav],
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
  readonly hierarchy = signal<
    {
      role: MemberRole;
      members: { id: number; name: string; department: string; status: MemberStatus }[];
    }[]
  >([]);
  readonly view = signal<'list' | 'tree' | 'graph'>('list');
  readonly graphRole = signal<MemberRole>('OWNER');
  readonly editing = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly saved = signal(false);
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
    ])
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: ([{ data }, rows]) => {
          this.organization.set(data);
          this.hierarchy.set(
            this.roles.map((role) => ({
              role,
              members: rows
                .filter((row) => row['role'] === role)
                .map((row) => ({
                  id: Number(row['id']),
                  name: String(row['fullName']),
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
