import { HttpClient } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { I18n, Translate, errorKey } from '../../core/i18n/i18n';
import {
  MemberRole,
  MemberStatus,
  OrganizationUnit,
  memberRoleLabel,
  memberStatusLabel,
} from '../../shared/data/iam';
import { Session } from '../../core/auth/session';
import { RowMenu } from '../../shared/ui/row-menu';
import { OrgCanvas } from './org-canvas';

export interface TreeMember {
  id: number;
  name: string;
  employeeCode: string | null;
  unitId: number | null;
  role: MemberRole;
  status: MemberStatus;
}

interface TreeNode {
  key: string;
  name: string;
  code?: string;
  type: string;
  status?: MemberStatus;
  unit?: OrganizationUnit;
  member?: TreeMember;
  children: TreeNode[];
}

const url = '/api/v1/organizations/units';
const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd');
const empty = { name: '', code: '', parentId: null as number | null, isActive: true };

function byParent<T>(rows: T[], parent: (row: T) => number | null) {
  const grouped = new Map<number | null, T[]>();
  for (const row of rows) {
    const key = parent(row);
    const siblings = grouped.get(key);
    if (siblings) siblings.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}

@Component({
  selector: 'app-unit-tree',
  imports: [FormsModule, NgTemplateOutlet, RowMenu, Translate, OrgCanvas],
  templateUrl: './unit-tree.html',
})
export class UnitTree {
  readonly organization = input.required<{
    name: string;
    code: string;
    ownerName: string | null;
  }>();
  readonly chart = input(false);
  readonly units = input.required<OrganizationUnit[]>();
  readonly members = input.required<TreeMember[]>();
  readonly memberActions =
    input.required<TemplateRef<{ $implicit: TreeMember; compact: boolean }>>();
  readonly changed = output<void>();
  readonly editOrganization = output<void>();
  readonly session = inject(Session);
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18n);
  readonly statusLabel = memberStatusLabel;
  readonly search = signal('');
  readonly status = signal('');
  readonly collapsed = signal(new Set<string>());
  readonly editing = signal<number | null | undefined>(undefined);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly saved = signal('');
  readonly editor = viewChild<ElementRef<HTMLFormElement>>('unitEditor');
  readonly removeDialog = viewChild.required<ElementRef<HTMLDialogElement>>('removeDialog');
  readonly pendingRemoval = signal<OrganizationUnit | null>(null);
  form = { ...empty };

  readonly tree = computed(() => {
    const unitsByParent = byParent(this.units(), (unit) => unit.parentId);
    const membersByUnit = byParent(this.members(), (member) => member.unitId);
    const byUnit = (id: number | null): TreeNode[] =>
      (membersByUnit.get(id) ?? []).map((member) => ({
        key: 'member-' + member.id,
        name: member.name,
        code: member.employeeCode ?? undefined,
        type: memberRoleLabel(member.role),
        status: member.status,
        member,
        children: [],
      }));
    const branch = (parentId: number | null): TreeNode[] =>
      (unitsByParent.get(parentId) ?? []).map((unit) => ({
        key: 'unit-' + unit.id,
        name: unit.name,
        code: unit.code,
        type: 'unit_type',
        status: unit.isActive ? 'ACTIVE' : 'DISABLED',
        unit,
        children: [...branch(unit.id), ...byUnit(unit.id)],
      }));
    const root: TreeNode = {
      key: 'organization',
      ...this.organization(),
      type: 'organization',
      children: [
        ...branch(null),
        ...((membersByUnit.get(null)?.length ?? 0)
          ? [
              {
                key: 'unassigned',
                name: this.i18n.text('unit_unassigned'),
                type: 'members',
                children: byUnit(null),
              },
            ]
          : []),
      ],
    };
    const term = normalize(this.search().trim());
    const status = this.status();
    const filter = (node: TreeNode, ancestorMatches = false): TreeNode | null => {
      const matchesText =
        ancestorMatches || normalize(node.name + ' ' + (node.code ?? '')).includes(term);
      const children = node.children
        .map((child) => filter(child, matchesText))
        .filter((child) => child !== null);
      return (matchesText && (!status || node.status === status)) || children.length
        ? { ...node, children }
        : null;
    };
    return filter(root);
  });

  readonly rows = computed(() => {
    const rows: { node: TreeNode; parent: string; depth: number }[] = [];
    const flatten = (node: TreeNode, parent = '', depth = 0) => {
      rows.push({ node, parent, depth });
      if (!this.collapsed().has(node.key)) {
        for (const child of node.children) flatten(child, node.name, depth + 1);
      }
    };
    const filtered = this.tree();
    if (filtered) flatten(filtered);
    return rows;
  });

  parentOptions() {
    const byId = new Map(this.units().map((unit) => [unit.id, unit]));
    return this.units().filter((unit) => {
      if (!unit.isActive && unit.id !== this.form.parentId) return false;
      for (
        let ancestor: OrganizationUnit | undefined = unit;
        ancestor;
        ancestor = byId.get(ancestor.parentId ?? 0)
      ) {
        if (ancestor.id === this.editing()) return false;
      }
      return true;
    });
  }

  setFilter(field: 'search' | 'status', value: string) {
    this[field].set(value);
    this.collapsed.set(new Set());
  }

  toggle(key: string) {
    const next = new Set(this.collapsed());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.collapsed.set(next);
  }

  edit(unit?: OrganizationUnit) {
    this.editing.set(unit?.id ?? null);
    this.form = { ...empty };
    if (unit) {
      const { code, name, parentId, isActive } = unit;
      this.form = { code, name, parentId, isActive };
    }
    this.error.set('');
    this.saved.set('');
    requestAnimationFrame(() => {
      this.editor()?.nativeElement.querySelector('input')?.focus();
    });
  }

  save() {
    if (this.busy()) return;
    const id = this.editing();
    const request = id ? this.http.put(url + '/' + id, this.form) : this.http.post(url, this.form);
    this.write(request, 'unit_saved');
  }

  askRemove(unit: OrganizationUnit) {
    if (this.busy()) return;
    this.pendingRemoval.set(unit);
    this.removeDialog().nativeElement.showModal();
  }

  remove(unit: OrganizationUnit) {
    this.removeDialog().nativeElement.close();
    this.write(this.http.delete(url + '/' + unit.id), 'unit_deleted');
  }

  private write(request: ReturnType<HttpClient['delete']>, notice: string) {
    this.busy.set(true);
    this.error.set('');
    this.saved.set('');
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.editing.set(undefined);
        this.saved.set(notice);
        this.changed.emit();
      },
      error: (error) => this.error.set(errorKey(error)),
    });
  }
}
