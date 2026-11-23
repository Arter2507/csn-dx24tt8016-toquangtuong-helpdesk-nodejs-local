import express from 'express';
import { profileRoutes } from './modules/accounts/profile.routes.js';
import { taskRoutes } from './modules/tasks/task.routes.js';
import { guardWrites } from './modules/backups/maintenance.js';
import { backupRoutes } from './modules/backups/backup.routes.js';
import { authRoutes, newPassword, requireAccount, requireAdmin, sameOrigin } from './modules/auth/auth.routes.js';
import { accountsDirectory, notificationRoutes, technicianCategories } from './modules/accounts/accounts.routes.js';
import { z } from 'zod';
import { registerTicketActions } from './modules/tickets/actions.js';
import { ticketComments } from './modules/tickets/comments.js';
import { randomUUID } from 'node:crypto';
import { config } from './configs/env.js';
import { errorHandler } from './middlewares/error.js';
import { AppError } from './shared/errors.js';
import { validate } from './middlewares/validate.js';
import { idSchema } from './modules/categories/category.validator.js';
import { categoryRoutes } from './modules/categories/category.routes.js';
import { demoRepository } from './modules/categories/demo.repository.js';
import { mysqlRepository } from './modules/categories/mysql.repository.js';
import { demoResourceRoutes } from './shared/demo-resource.routes.js';
import { asyncResourceRoutes } from './shared/async-resource.routes.js';
import { users, roles, userInput, userUpdate, createUser, updateUser } from './modules/users/users.js';
import { usersMysql } from './modules/users/mysql.repository.js';
import { tickets, statuses, ticketListFields, ticketInput, ticketUpdate, createTicket, updateTicket } from './modules/tickets/tickets.js';
import { ticketsMysql } from './modules/tickets/mysql.repository.js';
import { discardFailedUpload, receiveTicket, sendAttachment } from './modules/tickets/attachments.js';

const useMysql = config.dataSource === 'mysql';

export const app = express();
app.use((req, res, next) => { req.id = randomUUID(); res.set('X-Request-Id', req.id); next(); });
app.use('/api/v1', guardWrites);
app.use(express.json({ limit: '100kb' }));

app.get('/api/v1/auth/mode', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ success: true, data: config.dataSource, meta: null });
});
if (useMysql) {
  app.use('/api/v1', sameOrigin, (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1', requireAccount);
}
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/categories', categoryRoutes(useMysql ? mysqlRepository : demoRepository, useMysql ? requireAdmin : undefined));

if (useMysql) {
  app.get('/api/v1/directory', accountsDirectory);
  app.use('/api/v1/notifications', notificationRoutes);
  app.get('/api/v1/users/:id/categories', requireAdmin, validate(idSchema, 'params'), technicianCategories.list);
  app.put('/api/v1/users/:id/categories', requireAdmin, validate(idSchema, 'params'),
    validate(z.object({ categoryIds: z.array(z.number().int().positive().safe()).max(100) }).strict(), 'body'),
    technicianCategories.update);
  app.use('/api/v1/users', requireAdmin, asyncResourceRoutes({
    repository: usersMysql,
    input: userInput.extend({ password: newPassword }),
    updateInput: userUpdate,
    searchable: ['fullName', 'email'],
    filters: { field: 'role', values: roles },
  }));
  app.get('/api/v1/tickets/:ticketId/attachments/:attachmentId', sendAttachmentFromMysql);
  app.get('/api/v1/tickets/:ticketId/comments', ticketComments.list);
  app.post('/api/v1/tickets/:ticketId/comments', ticketComments.create);
  app.post('/api/v1/tickets/archive', requireAdmin);
  registerTicketActions(app);
  app.use('/api/v1/tickets', asyncResourceRoutes({
    repository: ticketsMysql,
    input: ticketInput,
    updateInput: ticketUpdate.partial().required({ version: true }).extend({ note: z.string().trim().max(2000).optional() }),
    prepareCreate: (body, account) => ({ ...body, requesterId: account.id }),
    searchable: ['title', 'description'],
    filters: { field: 'status', values: statuses },
    queryFields: ticketListFields,
    receive: receiveTicket,
    archive: true,
  }), discardFailedUpload);
  app.get('/api/v1/backups/snapshot', requireAdmin, async (req, res, next) => {
    try {
      const [usersPage, ticketsPage, categoriesPage] = await Promise.all([
        usersMysql.list({ search: '', page: 1, pageSize: 1000, sortBy: 'id', sortOrder: 'asc' }),
        ticketsMysql.list({ search: '', page: 1, pageSize: 1000, sortBy: 'id', sortOrder: 'asc' }),
        mysqlRepository.list({ search: '', page: 1, pageSize: 1000, sortBy: 'id', sortOrder: 'asc', isActive: undefined }),
      ]);
      res.set('Cache-Control', 'no-store').json({
        success: true,
        data: {
          version: 1,
          createdAt: new Date().toISOString(),
          users: usersPage.items,
          tickets: ticketsPage.items,
          categories: categoriesPage.items,
        },
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  });
} else {
  app.get('/api/v1/notifications', validate(z.object({
    account: z.coerce.number().int().positive().safe().default(1),
  }), 'query'), (req, res) => {
    const { account } = req.validated.query;
    const data = tickets.filter(row => !row.archivedAt &&
      (row.requesterId === account || row.assigneeId === account))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id - left.id)
      .slice(0, 100).map(row => ({
        id: [account, row.id, row.version, row.updatedAt].join(':'),
        ticketId: row.id, title: row.title, type: 'STATUS_CHANGED', status: row.status,
        createdAt: row.updatedAt, readAt: null,
        assigned: row.assigneeId === account && row.requesterId !== account,
      }));
    res.set('Cache-Control', 'no-store').json({ success: true, data, meta: null });
  });
  app.use('/api/v1/users', demoResourceRoutes({
    rows: users, input: userInput, updateInput: userUpdate, create: createUser, update: updateUser,
    searchable: ['fullName', 'email'], filters: { field: 'role', values: roles }
  }));
  app.get('/api/v1/tickets/:ticketId/attachments/:attachmentId', (req, res, next) =>
    sendAttachment(tickets, req, res, next));
  app.use('/api/v1/tickets', demoResourceRoutes({
    rows: tickets, input: ticketInput, updateInput: ticketUpdate, create: createTicket, update: updateTicket,
    searchable: ['title', 'description'], filters: { field: 'status', values: statuses },
    queryFields: ticketListFields, receive: receiveTicket, archive: true
  }), discardFailedUpload);
  app.get('/api/v1/backups/snapshot', (req, res) => {
    res.set('Cache-Control', 'no-store').json({ success: true, data: {
      version: 1, createdAt: new Date().toISOString(), users, tickets, categories: demoRepository.snapshot(),
    }, meta: null });
  });
}

if (useMysql) app.use('/api/v1/backups', requireAdmin, backupRoutes);
else app.use('/api/v1/backups', backupRoutes);

app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy API')));
app.use(errorHandler);

async function sendAttachmentFromMysql(req, res, next) {
  try {
    const ticket = await ticketsMysql.find(Number(req.params.ticketId), req.account);
    if (!ticket) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu');
    return sendAttachment([ticket], req, res, next);
  } catch (error) {
    next(error);
  }
}
