import express from 'express';
import { randomUUID } from 'node:crypto';
import { config } from './configs/env.js';
import { errorHandler } from './middlewares/error.js';
import { AppError } from './shared/errors.js';
import { categoryRoutes } from './modules/categories/category.routes.js';
import { demoRepository } from './modules/categories/demo.repository.js';
import { mysqlRepository } from './modules/categories/mysql.repository.js';
import { demoResourceRoutes } from './shared/demo-resource.routes.js';
import { users, roles, userInput, userUpdate, createUser, updateUser } from './modules/users/users.js';
import { tickets, statuses, ticketInput, ticketUpdate, createTicket, updateTicket } from './modules/tickets/tickets.js';
export const app = express();
app.use((req, res, next) => { req.id = randomUUID(); res.set('X-Request-Id', req.id); next(); });
app.use(express.json({ limit: '100kb' }));
app.use('/api/v1/categories', categoryRoutes(config.dataSource === 'mysql' ? mysqlRepository : demoRepository, config.dataSource === 'demo'));
const demoOnly = (req, res, next) => config.dataSource === 'demo'
  ? next()
  : next(new AppError(503, 'AUTH_NOT_IMPLEMENTED', 'Chế độ MySQL chưa hỗ trợ tài nguyên này'));
app.use('/api/v1/users', demoOnly, demoResourceRoutes({
  rows: users, input: userInput, updateInput: userUpdate, create: createUser, update: updateUser,
  searchable: ['fullName', 'email'], filters: { field: 'role', values: roles }
}));
app.use('/api/v1/tickets', demoOnly, demoResourceRoutes({
  rows: tickets, input: ticketInput, updateInput: ticketUpdate, create: createTicket, update: updateTicket,
  searchable: ['title', 'description'], filters: { field: 'status', values: statuses }
}));
app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy API')));
app.use(errorHandler);
