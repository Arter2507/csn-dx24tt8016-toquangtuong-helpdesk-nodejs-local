import { z } from 'zod';
export const idSchema = z.object({ id: z.coerce.number().int().positive().safe() });
export const listSchema = z.object({
  search: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['id', 'code', 'name']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  isActive: z.enum(['true', 'false']).optional()
});
export const createSchema = z.object({ code: z.string().trim().min(1).max(30).regex(/^[A-Z0-9_]+$/), name: z.string().trim().min(1).max(100) }).strict();
export const updateSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), isActive: z.boolean().optional() }).strict().refine(value => Object.keys(value).length > 0, 'Cần ít nhất một trường');
