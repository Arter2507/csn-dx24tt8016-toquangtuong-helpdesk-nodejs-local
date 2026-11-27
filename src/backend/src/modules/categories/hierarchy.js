import { AppError } from '../../shared/errors.js';

export function assertCategoryTree(rows) {
  const byId = new Map(rows.map(row => [row.id, row]));
  for (const row of rows) {
    const seen = new Set([row.id]);
    for (let id = row.parentId; id != null;) {
      if (seen.has(id)) throw new AppError(422, 'CATEGORY_CYCLE');
      const parent = byId.get(id);
      if (!parent) throw new AppError(422, 'CATEGORY_PARENT_MISSING');
      if (row.isActive && !parent.isActive) throw new AppError(409, 'CATEGORY_PARENT_INACTIVE');
      seen.add(id);
      id = parent.parentId;
    }
  }
}
