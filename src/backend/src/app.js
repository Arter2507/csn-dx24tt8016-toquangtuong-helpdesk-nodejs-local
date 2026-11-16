import express from 'express';
import { randomUUID } from 'node:crypto';
import { config } from './configs/env.js';
import { errorHandler } from './middlewares/error.js';
import { AppError } from './shared/errors.js';
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
app.use(express.json({ limit: '100kb' }));

app.use('/api/v1/categories', categoryRoutes(useMysql ? mysqlRepository : demoRepository));

if (useMysql) {
  app.use('/api/v1/users', asyncResourceRoutes({
    repository: usersMysql,
    input: userInput,
    updateInput: userUpdate,
    searchable: ['fullName', 'email'],
    filters: { field: 'role', values: roles },
  }));
  app.get('/api/v1/tickets/:ticketId/attachments/:attachmentId', (req, res, next) =>
    sendAttachmentFromMysql(req, res, next));
  app.use('/api/v1/tickets', asyncResourceRoutes({
    repository: ticketsMysql,
    input: ticketInput,
    updateInput: ticketUpdate,
    searchable: ['title', 'description'],
    filters: { field: 'status', values: statuses },
    queryFields: ticketListFields,
    receive: receiveTicket,
    archive: true,
  }), discardFailedUpload);
  app.get('/api/v1/backups/snapshot', async (req, res, next) => {
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

app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy API')));
app.use(errorHandler);

async function sendAttachmentFromMysql(req, res, next) {
  try {
    const ticket = await ticketsMysql.find(Number(req.params.ticketId));
    if (!ticket) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu');
    return sendAttachment([ticket], req, res, next);
  } catch (error) {
    next(error);
  }
}
