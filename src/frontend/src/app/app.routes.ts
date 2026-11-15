import { Routes } from '@angular/router';

import { App } from './app';
import { Workspace } from './features/workspace/workspace';
import { BlankPage, Dashboard, Reports } from './pages';

const loadWorkspace = () => import('./features/workspace/workspace').then(module => module.Workspace);
const loadCategories = () => import('./app').then(module => module.App);

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Dashboard, title: 'Tổng quan · Trạm Mèo' },
  { path: 'dashboard/technician', loadComponent: () => import('./role-dashboard').then(module => module.RoleDashboard), data: { role: 'technician', crumb: 'Chuyên viên kỹ thuật' }, title: 'Chuyên viên kỹ thuật · Trạm Mèo' },
  { path: 'dashboard/user', loadComponent: () => import('./role-dashboard').then(module => module.RoleDashboard), data: { role: 'user', crumb: 'Không gian người dùng' }, title: 'Không gian người dùng · Trạm Mèo' },
  { path: 'tickets/:id/view', loadComponent: loadWorkspace, data: { resource: 'tickets', mode: 'view' }, title: 'Chi tiết yêu cầu · Trạm Mèo' },
  ...(['tickets', 'users'] as const).flatMap(resource => [
    { path: resource, loadComponent: loadWorkspace, data: { resource, mode: 'list' } },
    { path: resource + '/new', loadComponent: loadWorkspace, data: { resource, mode: 'create' } },
    { path: resource + '/:id/edit', loadComponent: loadWorkspace, data: { resource, mode: 'edit' } },
  ]),
  { path: 'categories', loadComponent: loadCategories, data: { mode: 'list' }, title: 'Danh mục · Trạm Mèo' },
  { path: 'categories/new', loadComponent: loadCategories, data: { mode: 'create' } },
  { path: 'categories/:id/edit', loadComponent: loadCategories, data: { mode: 'edit' } },
  { path: 'notifications', component: BlankPage, data: { title: 'Thông báo', icon: 'bi-bell' } },
  { path: 'reports', component: Reports, title: 'Báo cáo & thống kê · Trạm Mèo' },
  { path: 'backup', component: BlankPage, data: { title: 'Sao lưu dữ liệu', icon: 'bi-database' } },
  { path: 'profile', component: BlankPage, data: { title: 'Hồ sơ', icon: 'bi-person-circle' } },
  { path: '**', component: BlankPage, data: { title: 'Không tìm thấy trang', message: 'Kiểm tra lại đường dẫn hoặc quay về tổng quan.' } },
];
