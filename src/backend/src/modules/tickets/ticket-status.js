const transitions = {
  NEW: ['IN_PROGRESS'],
  IN_PROGRESS: ['PENDING_CUSTOMER', 'RESOLVED'],
  PENDING_CUSTOMER: ['IN_PROGRESS'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

export const statuses = Object.keys(transitions);

export function canUpdateStatus(current, next) {
  return current !== 'CLOSED' && (current === next || transitions[current]?.includes(next));
}

export function needsTransitionNote(current, next) {
  return current !== next && (
    next === 'RESOLVED' || next === 'PENDING_CUSTOMER' ||
    (current === 'RESOLVED' && next === 'IN_PROGRESS')
  );
}
