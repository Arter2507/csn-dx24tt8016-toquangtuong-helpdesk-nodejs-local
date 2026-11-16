import { Routes } from '@angular/router';

const loadWorkspace = () =>
  import('./features/workspace/workspace').then((module) => module.Workspace);
const loadCategories = () => import('./app').then((module) => module.App);

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages').then((module) => module.Dashboard),
  },
  {
    path: 'dashboard/technician',
    loadComponent: () => import('./role-dashboard').then((module) => module.RoleDashboard),
    data: { role: 'technician', crumb: 'technician' },
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
    { path: resource, loadComponent: loadWorkspace, data: { resource, mode: 'list' } },
    { path: resource + '/new', loadComponent: loadWorkspace, data: { resource, mode: 'create' } },
    {
      path: resource + '/:id/edit',
      loadComponent: loadWorkspace,
      data: { resource, mode: 'edit' },
    },
  ]),
  { path: 'categories', loadComponent: loadCategories, data: { mode: 'list' } },
  { path: 'categories/new', loadComponent: loadCategories, data: { mode: 'create' } },
  { path: 'categories/:id/edit', loadComponent: loadCategories, data: { mode: 'edit' } },
  {
    path: 'notifications',
    loadComponent: () => import('./account-pages').then((module) => module.AccountPages),
    data: { page: 'notifications', crumb: 'notifications' },
  },
  { path: 'reports', loadComponent: () => import('./pages').then((module) => module.Reports) },
  {
    path: 'backup',
    loadComponent: () => import('./account-pages').then((module) => module.AccountPages),
    data: { page: 'backup', crumb: 'backups' },
  },
  {
    path: 'profile',
    loadComponent: () => import('./account-pages').then((module) => module.AccountPages),
    data: { page: 'profile', crumb: 'profile' },
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
