export const ticketStatuses = [
  { value: 'NEW', label: 'Mới tiếp nhận', tone: 'primary', color: 'new', icon: 'bi-plus-lg' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý', tone: 'info', color: 'progress', icon: 'bi-arrow-repeat' },
  { value: 'RESOLVED', label: 'Chờ xác nhận', tone: 'warning', color: 'resolved', icon: 'bi-clock' },
  { value: 'CLOSED', label: 'Đã đóng', tone: 'success', color: 'closed', icon: 'bi-check-lg' },
] as const;

export const ticketPriorities = [
  { value: 'LOW', label: 'Thấp', tone: 'success', icon: 'bi-chevron-double-down' },
  { value: 'MEDIUM', label: 'Trung bình', tone: 'warning', icon: 'bi-dash-lg' },
  { value: 'HIGH', label: 'Cao', tone: 'danger', icon: 'bi-chevron-double-up' },
  { value: 'URGENT', label: 'Khẩn cấp', tone: 'danger', icon: 'bi-exclamation-lg' },
] as const;

export const userRoles = [
  { value: 'USER', label: 'Người dùng' },
  { value: 'TECHNICIAN', label: 'Kỹ thuật viên' },
  { value: 'ADMIN', label: 'Quản trị viên' },
] as const;
