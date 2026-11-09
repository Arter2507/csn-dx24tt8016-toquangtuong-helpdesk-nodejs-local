import { Routes } from '@angular/router';

import { App } from './app';
import { Workspace } from './features/workspace/workspace';
import { BlankPage, Dashboard } from './pages';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Dashboard, title: 'Tổng quan · Helpdesk' },
  ...(['tickets', 'users'] as const).flatMap(resource => [
    { path: resource, component: Workspace, data: { resource, mode: 'list' } },
    { path: resource + '/new', component: Workspace, data: { resource, mode: 'create' } },
    { path: resource + '/:id/edit', component: Workspace, data: { resource, mode: 'edit' } },
  ]),
  { path: 'categories', component: App, data: { mode: 'list' }, title: 'Danh mục · Helpdesk' },
  { path: 'categories/new', component: App, data: { mode: 'create' } },
  { path: 'categories/:id/edit', component: App, data: { mode: 'edit' } },
  { path: 'notifications', component: BlankPage, data: { title: 'Thông báo' } },
  { path: 'reports', component: BlankPage, data: { title: 'Thống kê báo cáo' } },
  { path: 'backup', component: BlankPage, data: { title: 'Sao lưu dữ liệu' } },
  { path: 'profile', component: BlankPage, data: { title: 'Hồ sơ' } },
  { path: '**', component: BlankPage, data: { title: 'Không tìm thấy trang', message: 'Kiểm tra lại đường dẫn hoặc quay về tổng quan.' } },
];
