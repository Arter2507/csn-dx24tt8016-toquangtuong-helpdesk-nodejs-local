import express from 'express';
import { profileRoutes } from './modules/accounts/profile.routes.js';
import { taskRoutes } from './modules/tasks/task.routes.js';
import { guardWrites } from './modules/backups/maintenance.js';
import { backupRoutes } from './modules/backups/backup.routes.js';
import { authRoutes, requireAccount, sameOrigin } from './modules/auth/auth.routes.js';
import { requireAdmin, requireMember, requireOwner } from './modules/organizations/permissions.js';
import { memberRoutes, organizationRoutes } from './modules/organizations/organization.routes.js';
import { members } from './modules/organizations/members.repository.js';
import { accountsDirectory, technicianCategories } from './modules/accounts/accounts.routes.js';
import { notificationRoutes } from './modules/notifications/inbox.js';
import { inboundTicketMail } from './modules/notifications/incoming-mail.js';
import { z } from 'zod';
import { registerTicketActions } from './modules/tickets/actions.js';
import { numberRulesRoutes, previewTicketCode } from './modules/tickets/numbering.js';
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
import { tickets, statuses, ticketListFields, ticketInput, ticketEdit, ticketUpdate, createTicket, updateTicket } from './modules/tickets/tickets.js';
import { knowledgeRoutes } from './modules/knowledge/routes.js';
import { ticketsMysql } from './modules/tickets/mysql.repository.js';
import { discardFailedUpload, receiveTicket, sendAttachment } from './modules/tickets/attachments.js';
import { slaRoutes } from './modules/sla/sla.routes.js';

const useMysql = config.dataSource === 'mysql';

export const app = express();
app.use((req, res, next) => { req.id = randomUUID(); res.set('X-Request-Id', req.id); next(); });
app.use('/api/v1', guardWrites);
app.use(express.json({ limit: '100kb' }));

app.get('/api/v1/auth/mode', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ success: true, data: config.dataSource, meta: null });
});
if (useMysql) {
  app.use('/api/v1/knowledge', knowledgeRoutes);
  app.post('/api/v1/mail/inbound', ...inboundTicketMail);
  app.use('/api/v1', sameOrigin, (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1', requireAccount, requireMember);
}
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/categories', categoryRoutes(useMysql ? mysqlRepository : demoRepository, useMysql ? requireAdmin : undefined));
if (useMysql) app.use('/api/v1/settings/ticket-number-rules', requireOwner, numberRulesRoutes);
else app.use('/api/v1/settings/ticket-number-rules', numberRulesRoutes);

app.get('/api/v1/tickets/number-preview', validate(z.object({
  categoryId: z.coerce.number().int().positive().safe(),
}), 'query'), async (req, res) => {
  const code = await previewTicketCode(tickets, req.validated.query.categoryId);
  res.set('Cache-Control', 'no-store').json({ success: true, data: { code }, meta: null });
});

if (useMysql) {
  app.use('/api/v1/settings/sla', requireAdmin, slaRoutes);
  app.get('/api/v1/directory', accountsDirectory);
  app.use('/api/v1/notifications', notificationRoutes);
  app.get('/api/v1/users/:id/categories', requireAdmin, validate(idSchema, 'params'), technicianCategories.list);
  app.put('/api/v1/users/:id/categories', requireAdmin, validate(idSchema, 'params'),
    validate(z.object({ categoryIds: z.array(z.number().int().positive().safe()).max(100) }).strict(), 'body'),
    technicianCategories.update);
  app.use('/api/v1/organizations', organizationRoutes);
  app.use('/api/v1/users', memberRoutes);
  app.get('/api/v1/tickets/:ticketId/attachments/:attachmentId', sendAttachmentFromMysql);
  app.get('/api/v1/tickets/:ticketId/comments', ticketComments.list);
  app.post('/api/v1/tickets/:ticketId/comments', ticketComments.create);
  app.post('/api/v1/tickets/archive', requireAdmin);
  registerTicketActions(app);
  app.use('/api/v1/tickets', asyncResourceRoutes({
    repository: ticketsMysql,
    input: ticketInput,
    updateInput: ticketEdit,
    prepareCreate: (body, account) => ({ ...body, requesterId: account.id }),
    searchable: ['title', 'description'],
    filters: { field: 'status', values: statuses },
    queryFields: ticketListFields,
    receive: receiveTicket,
    archive: true,
  }), discardFailedUpload);
  app.get('/api/v1/backups/snapshot', requireOwner, async (req, res, next) => {
    try {
      const [usersPage, ticketsPage, categoriesPage] = await Promise.all([
        members.list({ search: '', page: 1, pageSize: 1000, sortBy: 'id', sortOrder: 'asc' }, req.account),
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
    extraSearch: row => {
      const category = demoRepository.snapshot().find(category => category.id === row.categoryId);
      return [category?.name, category?.code];
    },
    queryFields: ticketListFields, receive: receiveTicket, archive: true
  }), discardFailedUpload);
  app.get('/api/v1/backups/snapshot', (req, res) => {
    res.set('Cache-Control', 'no-store').json({ success: true, data: {
      version: 1, createdAt: new Date().toISOString(), users, tickets, categories: demoRepository.snapshot(),
    }, meta: null });
  });
}

if (useMysql) app.use('/api/v1/backups', requireOwner, backupRoutes);
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
