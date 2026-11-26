import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../configs/env.js';
import { pool } from '../../database/pool.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../shared/errors.js';
import { idSchema } from '../categories/category.validator.js';
import { demoRepository } from '../categories/demo.repository.js';

const affix = z.string().trim().toUpperCase().max(12).regex(/^[A-Z0-9_-]*$/);
const ruleInput = z.object({
  prefix: affix,
  nextNumber: z.number().int().min(1).max(999_999_999),
  digits: z.number().int().min(1).max(9),
  suffix: affix,
}).strict().refine(rule => rule.nextNumber < 10 ** rule.digits, { path: ['nextNumber'] });

const defaultRule = { categoryId: 0, prefix: '', suffix: '', nextNumber: 1, digits: 4 };
const demoRules = new Map([[0, { ...defaultRule }]]);
const demo = config.dataSource === 'demo';
const selectRule = 'SELECT category_id AS categoryId, prefix, next_number AS nextNumber, digits, suffix FROM ticket_number_rules';

export function legacyTicketCode(id) {
  return 'HD-' + String(id).padStart(3, '0');
}

function* candidates(rule) {
  // The shared sequence grows beyond four digits. A custom rule uses its configured width.
  const limit = rule.categoryId === 0 ? 999_999_999 : 10 ** rule.digits - 1;
  for (let number = rule.nextNumber; number <= limit; number++) {
    yield { number, code: rule.prefix + String(number).padStart(rule.digits, '0') + rule.suffix };
  }
}

const exhausted = () => new AppError(409, 'TICKET_NUMBER_EXHAUSTED', 'Hãy tăng độ dài hoặc đổi quy tắc đánh số phiếu');

function availableDemoNumber(tickets, rule) {
  const used = new Set(tickets.map(ticket => ticket.code));
  for (const candidate of candidates(rule)) {
    if (!used.has(candidate.code)) return candidate;
  }
  throw exhausted();
}

export function allocateDemoCode(tickets, categoryId) {
  const rule = demoRules.get(categoryId) ?? demoRules.get(0);
  const { number, code } = availableDemoNumber(tickets, rule);
  rule.nextNumber = number + 1;
  return code;
}

// The shared row serializes allocations across categories, including overlapping formats.
async function lockNumbering(conn) {
  const [[rule]] = await conn.execute(selectRule + ' WHERE category_id = 0 FOR UPDATE');
  return rule;
}

async function availableMysqlNumber(connection, rule) {
  for (const candidate of candidates(rule)) {
    const [[used]] = await connection.execute('SELECT id FROM tickets WHERE display_code = ?', [candidate.code]);
    if (!used) return candidate;
  }
  throw exhausted();
}

export async function allocateMysqlCode(conn, categoryId) {
  const fallback = await lockNumbering(conn);
  const [[custom]] = await conn.execute(selectRule + ' WHERE category_id = ? FOR UPDATE', [categoryId]);
  const rule = custom ?? fallback;
  const { number, code } = await availableMysqlNumber(conn, rule);
  await conn.execute('UPDATE ticket_number_rules SET next_number = ? WHERE category_id = ?', [number + 1, rule.categoryId]);
  return code;
}

export async function previewTicketCode(tickets, categoryId) {
  const invalidCategory = () => new AppError(422, 'INVALID_CATEGORY', 'Danh mục không hoạt động');
  if (demo) {
    if (!demoRepository.isActive(categoryId)) throw invalidCategory();
    return availableDemoNumber(tickets, demoRules.get(categoryId) ?? demoRules.get(0)).code;
  }
  const [[category]] = await pool.execute('SELECT id FROM categories WHERE id = ? AND is_active = 1', [categoryId]);
  if (!category) throw invalidCategory();
  const [[rule]] = await pool.execute(selectRule + ' WHERE category_id IN (0, ?) ORDER BY category_id DESC LIMIT 1', [categoryId]);
  return (await availableMysqlNumber(pool, rule)).code;
}

export function demoNumberRules() {
  return [...demoRules.values()];
}

export function restoreDemoNumberRules(rules) {
  if (!Array.isArray(rules)) return;
  demoRules.clear();
  demoRules.set(0, { ...defaultRule });
  for (const rule of rules) demoRules.set(rule.categoryId, rule);
}

export const numberRulesRoutes = Router();
numberRulesRoutes.get('/', async (req, res) => {
  let categories, rules;
  if (demo) {
    categories = demoRepository.snapshot();
    rules = demoNumberRules();
  } else {
    [categories] = await pool.execute('SELECT id, code, name, is_active AS isActive FROM categories ORDER BY name, id');
    [rules] = await pool.execute(selectRule);
  }
  const byCategory = new Map(rules.map(rule => [Number(rule.categoryId), rule]));
  res.json({ success: true, data: categories.map(category => {
    const categoryId = Number(category.id);
    const stored = byCategory.get(categoryId);
    return {
      ...(stored ?? byCategory.get(0)),
      categoryId,
      category: { ...category, id: categoryId, isActive: Boolean(category.isActive) },
      configured: !!stored,
    };
  }), meta: null });
});

numberRulesRoutes.put('/:id', validate(idSchema, 'params'), validate(ruleInput, 'body'), async (req, res) => {
  const categoryId = req.validated.params.id;
  const { prefix, nextNumber, digits, suffix } = req.validated.body;
  const missing = () => new AppError(404, 'NOT_FOUND', 'Không tìm thấy loại phiếu');
  if (demo) {
    if (!demoRepository.snapshot().some(category => category.id === categoryId)) throw missing();
    demoRules.set(categoryId, { categoryId, prefix, nextNumber, digits, suffix });
  } else {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await lockNumbering(conn);
      const [[category]] = await conn.execute('SELECT id FROM categories WHERE id = ?', [categoryId]);
      if (!category) throw missing();
      await conn.execute(
        `INSERT INTO ticket_number_rules (category_id, prefix, next_number, digits, suffix)
         VALUES (?, ?, ?, ?, ?) AS rule
         ON DUPLICATE KEY UPDATE prefix = rule.prefix, next_number = rule.next_number,
           digits = rule.digits, suffix = rule.suffix`,
        [categoryId, prefix, nextNumber, digits, suffix],
      );
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
  res.status(204).end();
});
