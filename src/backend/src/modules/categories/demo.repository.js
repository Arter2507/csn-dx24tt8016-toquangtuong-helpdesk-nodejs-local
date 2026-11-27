import { AppError } from '../../shared/errors.js';
import { assertCategoryTree } from './hierarchy.js';

let rows = [
  { id: 1, code: 'SOFTWARE', name: 'Phần mềm', isActive: true },
  { id: 2, code: 'HARDWARE', name: 'Phần cứng', isActive: true },
  { id: 3, code: 'NETWORK', name: 'Mạng', isActive: true },
  { id: 4, code: 'ACCOUNT', name: 'Tài khoản', isActive: true }
];
let nextId = 5;
export const demoRepository = {
  batchState(ids, isActive) {
    const selected = rows.filter(row => ids.includes(row.id));
    if (selected.length !== ids.length) throw new AppError(404, 'RECORD_MISSING');
    assertCategoryTree(rows.map(row => ids.includes(row.id) ? { ...row, isActive } : row));
    for (const row of selected) row.isActive = isActive;
    return selected.length;
  },
  snapshot: () => rows,
  replace(restored) { rows = restored; nextId = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1; },
  isActive: id => rows.some(row => row.id === id && row.isActive),
  async list(q) {
    const keyword = q.search.toLocaleLowerCase();
    const filtered = rows.filter(r => (r.code.toLocaleLowerCase().includes(keyword) || r.name.toLocaleLowerCase().includes(keyword)) && (q.isActive === undefined || r.isActive === (q.isActive === 'true')));
    filtered.sort((a, b) => (typeof a[q.sortBy] === 'number' ? a.id - b.id : String(a[q.sortBy]).localeCompare(String(b[q.sortBy]))) * (q.sortOrder === 'asc' ? 1 : -1) || a.id - b.id);
    return { items: filtered.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: filtered.length };
  },
  async find(id) { return rows.find(r => r.id === id); },
  async create(data) {
    if (rows.some(row => row.code === data.code)) throw new AppError(409, 'CONFLICT');
    const row = { id: nextId, parentId: null, ...data, isActive: true };
    assertCategoryTree([...rows, row]);
    nextId++;
    rows.push(row);
    return row;
  },
  async update(id, data) {
    const row = rows.find(item => item.id === id);
    if (!row) return null;
    assertCategoryTree(rows.map(item => item === row ? { ...row, ...data } : item));
    return Object.assign(row, data);
  },
};
