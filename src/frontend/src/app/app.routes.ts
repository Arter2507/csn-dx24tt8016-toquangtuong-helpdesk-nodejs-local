import { Routes } from '@angular/router';
import { requireSession } from './session';

const loadWorkspace = () =>
  import('./features/workspace/workspace').then((module) => module.Workspace);
const loadCategories = () => import('./app').then((module) => module.App);
const loadMembers = () => import('./members').then((module) => module.MembersPage);
const loadOnboarding = () => import('./onboarding').then((module) => module.Onboarding);

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
    data: { role: 'user', access: ['USER', 'TECHNICIAN'], crumb: 'requester_workspace' },
  },
  {
    path: 'tickets/:id/view',
    loadComponent: loadWorkspace,
    data: { resource: 'tickets', mode: 'view' },
  },
  ...(['tickets'] as const).flatMap((resource) => [
    {
      path: resource,
      loadComponent: loadWorkspace,
      data: { resource, mode: 'list' },
    },
    {
      path: resource + '/new',
      loadComponent: loadWorkspace,
      data: { resource, mode: 'create' },
    },
    {
      path: resource + '/:id/edit',
      loadComponent: loadWorkspace,
      data: { resource, mode: 'edit' },
    },
  ]),
  ...[
    { path: 'users', mode: 'list' },
    { path: 'users/new', mode: 'create' },
    { path: 'users/:id/edit', mode: 'edit' },
  ].map(({ path, mode }) => ({
    path,
    loadComponent: loadMembers,
    data: { access: 'ADMIN', mode, crumb: 'members' },
  })),
  {
    path: 'categories',
    loadComponent: () => import('./directory-page').then((module) => module.DirectoryPage),
    data: { access: 'ADMIN', crumb: 'categories' },
  },
  {
    path: 'categories/ticket-types',
    loadComponent: loadCategories,
    data: { mode: 'list', access: 'ADMIN', crumb: 'ticket_types' },
  },
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
    data: { access: 'OWNER', crumb: 'backups' },
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile').then((module) => module.ProfilePage),
    data: { crumb: 'profile' },
  },
  {
    path: 'settings/organizations',
    loadComponent: () => import('./organization').then((module) => module.OrganizationPage),
    data: { access: 'ADMIN', crumb: 'organization' },
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
    path: 'register',
    loadComponent: loadOnboarding,
    data: { mode: 'register', crumb: 'register' },
  },
  {
    path: 'activate',
    loadComponent: loadOnboarding,
    data: { mode: 'activate', crumb: 'activate' },
  },
  {
    path: 'pending-assignment',
    loadComponent: loadOnboarding,
    canActivate: [requireSession],
    data: { mode: 'pending', pending: true, crumb: 'pending_assignment' },
  },
  {
    path: 'login',
    loadComponent: () => import('./login').then((module) => module.Login),
    data: { crumb: 'sign_in' },
  },
  ...protectedRoutes.map((route) => ({ ...route, canActivate: [requireSession] })),
];
