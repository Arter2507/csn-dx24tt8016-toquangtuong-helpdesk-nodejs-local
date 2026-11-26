import { Row } from './workspace.types';

export function formatTicketCode(code: string) {
  return /^\d+$/.test(code) ? '#' + code : code;
}

export function ticketReference(row: Row) {
  return formatTicketCode(String(row['code'] ?? row.id));
}

export const ticketStatuses = [
  { value: 'NEW', label: 'new', tone: 'primary', color: 'new', icon: 'bi-plus-lg' },
  {
    value: 'IN_PROGRESS',
    label: 'in_progress',
    tone: 'info',
    color: 'progress',
    icon: 'bi-arrow-repeat',
  },
  {
    value: 'PENDING_CUSTOMER',
    label: 'waiting_for_customer',
    tone: 'warning',
    color: 'pending',
    icon: 'bi-chat-dots',
  },
  {
    value: 'RESOLVED',
    label: 'waiting_for_you_to_review',
    tone: 'warning',
    color: 'resolved',
    icon: 'bi-clock',
  },
  { value: 'CLOSED', label: 'closed', tone: 'success', color: 'closed', icon: 'bi-check-lg' },
] as const;

export const ticketPriorities = [
  { value: 'LOW', label: 'low', tone: 'success', icon: 'bi-chevron-double-down' },
  { value: 'MEDIUM', label: 'medium', tone: 'warning', icon: 'bi-dash-lg' },
  { value: 'HIGH', label: 'high', tone: 'danger', icon: 'bi-chevron-double-up' },
  { value: 'URGENT', label: 'urgent', tone: 'danger', icon: 'bi-exclamation-lg' },
] as const;

export const userRoles = [
  { value: 'USER', label: 'role_user' },
  { value: 'TECHNICIAN', label: 'technician_2' },
  { value: 'ADMIN', label: 'administrator' },
] as const;
