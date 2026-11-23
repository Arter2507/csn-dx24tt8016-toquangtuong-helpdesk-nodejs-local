import { Routes } from '@angular/router';
import { requireSession } from './session';

const loadWorkspace = () =>
  import('./features/workspace/workspace').then((module) => module.Workspace);
const loadCategories = () => import('./app').then((module) => module.App);

const protectedRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: { access: 'ADMIN' },
    loadComponent: () => import('./pages').then((module) => module.Dashboard),
  },
  {
    path: 'dashboard/technician',
    loadComponent: () => import('./role-dashboard').then((module) => module.RoleDashboard),
    data: { role: 'technician', access: 'TECHNICIAN', crumb: 'technician' },
  },
  {
    path: 'dashboard/user',
    loadComponent: () => import('./role-dashboard').then((module) => module.RoleDashboard),
    data: { role: 'user', crumb: 'requester_workspace' },
  },
  {
    path: 'tickets/:id/view',
    loadComponent: loadWorkspace,
    data: { resource: 'tickets', mode: 'view' },
  },
  ...(['tickets', 'users'] as const).flatMap((resource) => [
    {
      path: resource,
      loadComponent: loadWorkspace,
      data: { resource, mode: 'list', access: resource === 'users' ? 'ADMIN' : undefined },
    },
    {
      path: resource + '/new',
      loadComponent: loadWorkspace,
      data: { resource, mode: 'create', access: resource === 'users' ? 'ADMIN' : undefined },
    },
    {
      path: resource + '/:id/edit',
      loadComponent: loadWorkspace,
      data: { resource, mode: 'edit', access: resource === 'users' ? 'ADMIN' : undefined },
    },
  ]),
  { path: 'categories', loadComponent: loadCategories, data: { mode: 'list', access: 'ADMIN' } },
  {
    path: 'categories/new',
    loadComponent: loadCategories,
    data: { mode: 'create', access: 'ADMIN' },
  },
  {
    path: 'categories/:id/edit',
    loadComponent: loadCategories,
    data: { mode: 'edit', access: 'ADMIN' },
  },
  {
    path: 'notifications',
    loadComponent: () => import('./account-pages').then((module) => module.AccountPages),
    data: { page: 'notifications', crumb: 'notifications' },
  },
  {
    path: 'tasks',
    loadComponent: () => import('./tasks').then((module) => module.TasksPage),
    data: { access: ['ADMIN', 'TECHNICIAN'], crumb: 'team_tasks' },
  },
  {
    path: 'reports',
    data: { access: 'ADMIN' },
    loadComponent: () => import('./pages').then((module) => module.Reports),
  },
  {
    path: 'backup',
    loadComponent: () => import('./backups').then((module) => module.BackupPage),
    data: { access: 'ADMIN', crumb: 'backups' },
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile').then((module) => module.ProfilePage),
    data: { crumb: 'profile' },
  },
  {
    path: 'settings',
    loadComponent: () => import('./account-pages').then((module) => module.AccountPages),
    data: { page: 'settings', crumb: 'settings' },
  },
  {
    path: '**',
    loadComponent: () => import('./pages').then((module) => module.BlankPage),
    data: { title: 'page_not_found', message: 'check_the_address_or_go_back_to_the_overview' },
  },
];

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login').then((module) => module.Login),
    data: { crumb: 'sign_in' },
  },
  ...protectedRoutes.map((route) => ({ ...route, canActivate: [requireSession] })),
];
