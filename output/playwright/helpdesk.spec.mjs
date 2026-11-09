import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const screenshots = new URL('./screenshots/', import.meta.url);
async function capture(page, filename) {
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL(filename, screenshots)), fullPage: true, animations: 'disabled' });
}

test('desktop: dashboard, dropdown, navigation and blank page', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const stats = page.waitForResponse(r => r.url().includes('/api/v1/categories?') && r.ok());
  await page.goto('/');
  await stats;
  await expect(page.getByRole('heading', { name: 'Tổng quan hỗ trợ' })).toBeVisible();
  await expect(page.locator('.stat strong').last()).toHaveText(/^\d+$/);
  await capture(page, '01-dashboard.png');

  await page.locator('summary').click();
  await expect(page.getByRole('link', { name: 'Hồ sơ' })).toBeVisible();
  await capture(page, '02-dropdown.png');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Hồ sơ' })).toBeHidden();
  await page.getByRole('navigation').getByRole('link', { name: 'Báo cáo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thống kê báo cáo' })).toBeVisible();
  await capture(page, '03-blank-page.png');
  expect(pageErrors).toEqual([]);
});

test('desktop: ticket create, update, and reload through real demo API', async ({ page }) => {
  const title = 'Playwright - lỗi kết nối ' + Date.now();
  await page.goto('/tickets');
  await page.getByRole('link', { name: 'Thêm mới' }).click();
  await page.getByLabel('Tiêu đề').fill(title);
  await page.getByLabel('Mô tả').fill('Kiểm tra gửi yêu cầu qua Angular, proxy và Express.');
  await capture(page, '04-create-ticket.png');

  const created = page.waitForResponse(r => r.url().endsWith('/api/v1/tickets') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Lưu' }).click();
  const post = await created;
  expect(post.status()).toBe(201);
  const { data } = await post.json();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByRole('row').filter({ hasText: title })).toBeVisible();
  await capture(page, '05-ticket-table.png');

  await page.getByRole('row').filter({ hasText: title }).getByRole('link').click();
  await expect(page.getByLabel('Tiêu đề')).toHaveValue(title);
  await page.getByLabel('Kỹ thuật viên').selectOption({ label: 'Kỹ thuật viên mẫu' });
  await page.getByLabel('Trạng thái').selectOption({ label: 'IN_PROGRESS' });
  await capture(page, '06-edit-ticket.png');
  const updated = page.waitForResponse(r => r.url().endsWith('/api/v1/tickets/' + data.id) && r.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Lưu' }).click();
  expect((await updated).status()).toBe(200);
  await expect(page).toHaveURL(/\/tickets$/);
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: title })).toContainText('IN_PROGRESS');
});

test('desktop: user manager and category filter and edit', async ({ page }) => {
  await page.goto('/users');
  await expect(page.getByRole('row').filter({ hasText: 'Kỹ thuật viên mẫu' })).toBeVisible();
  await capture(page, '07-user-manager.png');

  await page.getByRole('navigation').getByRole('link', { name: 'Danh mục' }).click();
  await expect(page.getByRole('cell', { name: 'NETWORK' })).toBeVisible();
  await capture(page, '08-categories.png');
  await page.getByLabel('Tìm kiếm').fill('NETWORK');
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await expect(page.getByRole('row')).toHaveCount(2);
  await page.getByRole('row').filter({ hasText: 'NETWORK' }).getByRole('link', { name: 'Sửa' }).click();
  await expect(page.getByLabel('Tên', { exact: true })).toHaveValue('Mạng');
});

test('mobile: collapsed navigation and layout fit at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tổng quan hỗ trợ' })).toBeVisible();
  await expect(page.locator('.stat strong').last()).toHaveText(/^\d+$/);
  await capture(page, '09-mobile-dashboard.png');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await capture(page, '10-mobile-sidebar.png');
  await page.getByRole('navigation').getByRole('link', { name: 'Yêu cầu hỗ trợ' }).click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('heading', { name: 'Yêu cầu hỗ trợ' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
