export const memberRoles = ['OWNER', 'ADMIN', 'TECHNICIAN', 'USER'] as const;
export type MemberRole = (typeof memberRoles)[number];
export const memberStatuses = ['ACTIVE', 'PENDING_ACTIVATION', 'DISABLED'] as const;
export type MemberStatus = (typeof memberStatuses)[number];
export const memberRoleLabel = (role: MemberRole) => 'member_role_' + role.toLowerCase();
export const memberStatusLabel = (status: MemberStatus) => 'member_status_' + status.toLowerCase();

export interface Invitation {
  path: string;
  expiresAt: string;
}

export interface Member {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  employeeCode: string | null;
  department: string;
  unitId: number | null;
  position: string;
  customerTier: 'STANDARD' | 'VIP';
  role: MemberRole;
  status: MemberStatus;
  hasAvatar: boolean;
  invitation?: Invitation | null;
}

export interface OrganizationUnit {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  isActive: boolean;
}
