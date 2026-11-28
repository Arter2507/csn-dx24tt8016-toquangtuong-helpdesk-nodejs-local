import { inject } from '@angular/core';
import { CanActivateFn, RedirectFunction, Router, Routes } from '@angular/router';
import { requireSession, Session } from './core/auth/session';

const loadWorkspace = () =>
  import('./features/workspace/workspace').then((module) => module.Workspace);
const loadCategories = () =>
  import('./features/categories/categories-page').then((module) => module.CategoriesPage);
const loadMembers = () =>
  import('./features/organization/members').then((module) => module.MembersPage);
const loadOnboarding = () =>
  import('./features/auth/onboarding').then((module) => module.Onboarding);

const managementPages: Routes = [
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
    path: 'tickets/folders',
    loadComponent: () =>
      import('./features/workspace/ticket-folders').then((module) => module.TicketFolders),
    data: { crumb: 'ticket_folders' },
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
  ...knowledgePages(false),
];

function knowledgePages(helpCenter: boolean): Routes {
  return ['knowledge', 'knowledge/:id', ...(helpCenter ? ['faq'] : [])].map((path) => ({
    path,
    loadComponent: () =>
      import('./features/knowledge/knowledge-page').then((module) => module.KnowledgePage),
    data: { crumb: path === 'faq' ? 'frequently_asked' : 'knowledge', publicOnly: helpCenter },
  }));
}

const staff = ['OWNER', 'ADMIN', 'TECHNICIAN'];

const helpPages: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/help-center/help-home').then((module) => module.HelpHome),
    data: { crumb: 'help_center' },
  },
  ...knowledgePages(true),
];

const helpAccountPages: Routes = managementPages
  .filter(
    (route) =>
      route.data?.['resource'] === 'tickets' ||
      ['notifications', 'profile', 'settings'].includes(route.path ?? ''),
  )
  .map((route) => ({
    ...route,
    ...(route.path === 'tickets'
      ? {
          loadComponent: () =>
            import('./features/help-center/my-requests').then((module) => module.MyRequests),
        }
      : {}),
    data: { ...route.data, personal: true },
  }));

const legacyPortal: CanActivateFn = async (_, state) => {
  const session = inject(Session);
  const router = inject(Router);
  try {
    await session.initialize();
  } catch {
    return router.parseUrl('/login');
  }
  return router.parseUrl(
    (staff.some((role) => session.allows(role)) ? '/admin-management' : '/help-center') + state.url,
  );
};

function legacyRedirect(base: string, skip = 0): RedirectFunction {
  return ({ url, queryParams, fragment }) =>
    inject(Router).createUrlTree([base, ...url.slice(skip).map((segment) => segment.path)], {
      queryParams,
      fragment: fragment ?? undefined,
    });
}

const managementRoutes: Routes = managementPages.map((route) => ({
  ...route,
  path: route.path ? 'admin-management/' + route.path : 'admin-management',
  canActivate: [requireSession],
  data: { access: staff, ...route.data, portal: 'management' },
}));

const helpRoutes: Routes = [...helpPages, ...helpAccountPages].map((route) => ({
  ...route,
  path: route.path ? 'help-center/' + route.path : '',
  canActivate: route.data?.['personal'] && route.path !== 'settings' ? [requireSession] : undefined,
  data: { ...route.data, portal: 'help' },
}));

export const routes: Routes = [
  ...['forgot-password', 'reset-password'].map((path) => ({
    path,
    loadComponent: () =>
      import('./features/auth/password-recovery').then((module) => module.PasswordRecovery),
    data: {
      resetting: path === 'reset-password',
      crumb: path === 'reset-password' ? 'reset_password' : 'forgot_password',
    },
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
  ...helpRoutes,
  ...managementRoutes,
  { path: 'help-center', pathMatch: 'full', redirectTo: '/' },
  { path: 'dashboard/user', redirectTo: '/' },
  { path: 'management', pathMatch: 'full', redirectTo: '/admin-management' },
  ...managementPages
    .filter((route) => route.path)
    .map((route) => ({
      path: 'management/' + route.path,
      pathMatch: 'full' as const,
      redirectTo: legacyRedirect('/admin-management', 1),
    })),
  ...['knowledge', 'knowledge/:id'].map((path) => ({
    path,
    pathMatch: 'full' as const,
    redirectTo: legacyRedirect('/help-center'),
  })),
  ...managementPages
    .filter((route) => route.path && !route.path.startsWith('knowledge'))
    .map((route) =>
      helpAccountPages.some((page) => page.path === route.path)
        ? { ...route, canActivate: [legacyPortal] }
        : {
            path: route.path,
            pathMatch: 'full' as const,
            redirectTo: legacyRedirect('/admin-management'),
          },
    ),
  {
    path: '**',
    loadComponent: () => import('./features/overview/pages').then((module) => module.BlankPage),
    data: { title: 'page_not_found', message: 'check_the_address_or_go_back_to_the_overview' },
  },
];
