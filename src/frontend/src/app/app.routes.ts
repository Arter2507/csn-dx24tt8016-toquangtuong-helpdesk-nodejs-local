import { Routes } from '@angular/router';
import { requireSession } from './core/auth/session';

const loadWorkspace = () =>
  import('./features/workspace/workspace').then((module) => module.Workspace);
const loadCategories = () =>
  import('./features/categories/categories-page').then((module) => module.CategoriesPage);
const loadMembers = () =>
  import('./features/organization/members').then((module) => module.MembersPage);
const loadOnboarding = () =>
  import('./features/auth/onboarding').then((module) => module.Onboarding);

const protectedRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: { access: 'ADMIN' },
    loadComponent: () => import('./features/overview/pages').then((module) => module.Dashboard),
  },
  {
    path: 'dashboard/technician',
    loadComponent: () =>
      import('./features/overview/role-dashboard').then((module) => module.RoleDashboard),
    data: { role: 'technician', access: 'TECHNICIAN', crumb: 'technician' },
  },
  {
    path: 'dashboard/user',
    loadComponent: () =>
      import('./features/overview/role-dashboard').then((module) => module.RoleDashboard),
    data: { role: 'user', access: 'USER', crumb: 'requester_workspace' },
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
    loadComponent: () =>
      import('./features/directory/directory-page').then((module) => module.DirectoryPage),
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
    loadComponent: () =>
      import('./features/notifications/inbox-page').then((module) => module.InboxPage),
    data: { crumb: 'notifications' },
  },
  {
    path: 'tasks',
    loadComponent: () => import('./features/tasks/tasks').then((module) => module.TasksPage),
    data: { access: ['ADMIN', 'TECHNICIAN'], crumb: 'team_tasks' },
  },
  {
    path: 'reports',
    data: { access: 'ADMIN' },
    loadComponent: () => import('./features/overview/pages').then((module) => module.Reports),
  },
  {
    path: 'backup',
    loadComponent: () => import('./features/backups/backups').then((module) => module.BackupPage),
    data: { access: 'OWNER', crumb: 'backups' },
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then((module) => module.ProfilePage),
    data: { crumb: 'profile' },
  },
  {
    path: 'settings/sla',
    loadComponent: () =>
      import('./features/settings/sla-settings').then((module) => module.SlaSettings),
    data: { access: 'ADMIN', crumb: 'sla_settings' },
  },
  {
    path: 'settings/organizations',
    loadComponent: () =>
      import('./features/organization/organization').then((module) => module.OrganizationPage),
    data: { access: 'ADMIN', crumb: 'organization' },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings-page').then((module) => module.SettingsPage),
    data: { crumb: 'settings' },
  },
  {
    path: '**',
    loadComponent: () => import('./features/overview/pages').then((module) => module.BlankPage),
    data: { title: 'page_not_found', message: 'check_the_address_or_go_back_to_the_overview' },
  },
];

export const routes: Routes = [
  ...['knowledge', 'knowledge/:id'].map((path) => ({
    path,
    loadComponent: () =>
      import('./features/knowledge/knowledge-page').then((module) => module.KnowledgePage),
    data: { crumb: 'knowledge' },
  })),
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
    loadComponent: () => import('./features/auth/login').then((module) => module.Login),
    data: { crumb: 'sign_in' },
  },
  ...protectedRoutes.map((route) => ({ ...route, canActivate: [requireSession] })),
];
