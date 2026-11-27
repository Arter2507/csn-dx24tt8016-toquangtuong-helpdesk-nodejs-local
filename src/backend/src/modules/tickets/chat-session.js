export function chatExpiresAt(ticket) {
  const value = ticket.closedAt ?? (ticket.status === 'RESOLVED' ? ticket.resolvedAt : null);
  return value ? new Date(new Date(value).getTime() + 86400000) : null;
}
