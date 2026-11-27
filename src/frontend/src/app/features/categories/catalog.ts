import { Category } from './interfaces/category';

export function catalogPaths(rows: Category[], label: (row: Category) => string) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return rows
    .map((row) => {
      const ancestors: Category[] = [];
      const seen = new Set([row.id]);
      for (
        let parent = byId.get(row.parentId ?? 0);
        parent && !seen.has(parent.id);
        parent = byId.get(parent.parentId ?? 0)
      ) {
        ancestors.unshift(parent);
        seen.add(parent.id);
      }
      return { row, ancestors, path: [...ancestors, row].map(label).join(' › ') };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
