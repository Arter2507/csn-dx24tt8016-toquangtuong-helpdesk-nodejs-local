import { AppError } from '../../shared/errors.js';
export function categoryService(repository) {
  return {
    async list(query) { const { items, total } = await repository.list(query); return { items, meta: { page: query.page, pageSize: query.pageSize, totalItems: total, totalPages: Math.ceil(total / query.pageSize) } }; },
    async find(id) { const row = await repository.find(id); if (!row) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy danh mục'); return row; },
    async create(data) { try { return await repository.create(data); } catch (error) { if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, 'CONFLICT', 'Mã danh mục đã tồn tại'); throw error; } },
    async update(id, data) { const row = await repository.update(id, data); if (!row) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy danh mục'); return row; }
  };
}
