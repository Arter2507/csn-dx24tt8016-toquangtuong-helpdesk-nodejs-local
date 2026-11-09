let rows = [
  { id: 1, code: 'SOFTWARE', name: 'Phần mềm', isActive: true },
  { id: 2, code: 'HARDWARE', name: 'Phần cứng', isActive: true },
  { id: 3, code: 'NETWORK', name: 'Mạng', isActive: true },
  { id: 4, code: 'ACCOUNT', name: 'Tài khoản', isActive: true }
];
let nextId = 5;
export const demoRepository = {
  async list(q) {
    const keyword = q.search.toLocaleLowerCase();
    const filtered = rows.filter(r => (r.code.toLocaleLowerCase().includes(keyword) || r.name.toLocaleLowerCase().includes(keyword)) && (q.isActive === undefined || r.isActive === (q.isActive === 'true')));
    filtered.sort((a, b) => (typeof a[q.sortBy] === 'number' ? a.id - b.id : String(a[q.sortBy]).localeCompare(String(b[q.sortBy]))) * (q.sortOrder === 'asc' ? 1 : -1) || a.id - b.id);
    return { items: filtered.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: filtered.length };
  },
  async find(id) { return rows.find(r => r.id === id); },
  async create(data) { if (rows.some(r => r.code === data.code)) { const e = new Error(); e.code = 'ER_DUP_ENTRY'; throw e; } const row = { id: nextId++, ...data, isActive: true }; rows.push(row); return row; },
  async update(id, data) { const row = rows.find(r => r.id === id); if (!row) return null; Object.assign(row, data); return row; }
};
