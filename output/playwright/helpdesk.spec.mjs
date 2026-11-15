import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, sep } from 'node:path';

const screenshots = process.env.HELPDESK_SCREENSHOTS
  ? pathToFileURL(resolve(process.env.HELPDESK_SCREENSHOTS) + sep)
  : new URL('./screenshots/', import.meta.url);
async function capture(page, filename) {
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL(filename, screenshots)), fullPage: true, animations: 'disabled' });
}

test('desktop: dashboard, dropdown, theme persistence and sidebar', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const demo = await page.request.post('/api/v1/tickets', {
    data: { title: 'Kiểm tra kết nối mạng nội bộ', description: 'Yêu cầu minh họa dashboard.', categoryId: 3, requesterId: 1 },
  });
  expect(demo.status()).toBe(201);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tổng quan hỗ trợ' })).toBeVisible();
  await expect(page.locator('.stat strong').last()).toHaveText(/^\d+$/);
  await expect(page.getByRole('heading', { name: 'Yêu cầu theo ngày' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Số yêu cầu theo trạng thái' })).toBeVisible();
  await expect(page.locator('.column-fill')).toHaveCount(7);
  await capture(page, '01-dashboard.png');

  await page.locator('summary').click();
  await expect(page.getByRole('link', { name: 'Hồ sơ' })).toBeVisible();
  await capture(page, '02-dropdown.png');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Hồ sơ' })).toBeHidden();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Báo cáo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Báo cáo & thống kê' })).toBeVisible();
  await page.getByRole('button', { name: 'Giao diện tối' }).click();
  await page.getByRole('button', { name: 'Thu gọn thanh bên' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Mở rộng thanh bên' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Báo cáo', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan', exact: true }).click();
  await expect(page.locator('.stat strong').first()).toHaveText(/^\d+$/);
  await capture(page, '11-dashboard-dark.png');
  expect(pageErrors).toEqual([]);
});

test('desktop: ticket create, update, and reload through real demo API', async ({ page }) => {
  test.setTimeout(60000);
  const title = 'Playwright - lỗi kết nối ' + Date.now();
  await page.goto('/tickets');
  await page.getByRole('link', { name: 'Tạo yêu cầu' }).click();
  await page.getByLabel('Tiêu đề').fill(title);
  await page.getByLabel('Mô tả sự cố').fill('Kiểm tra gửi yêu cầu qua Angular, proxy và Express.');
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
  await expect(page.getByLabel('Loại yêu cầu')).toBeFocused();
  await expect(page.getByLabel('Loại yêu cầu')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Loại yêu cầu').selectOption({ label: 'Mạng' });
  await page.getByLabel('Mức ưu tiên').selectOption({ label: 'Cao' });
  await capture(page, '04-create-ticket.png');

  const created = page.waitForResponse(r => r.url().endsWith('/api/v1/tickets') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
  const post = await created;
  expect(post.status()).toBe(201);
  const { data } = await post.json();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByText('Đã gửi yêu cầu ' + data.code + '.', { exact: true })).toBeVisible();
  expect(data.priority).toBe('HIGH');
  await expect(page.getByRole('row').filter({ hasText: title })).toBeVisible();
  await capture(page, '05-ticket-table.png');

  await page.getByRole('row').filter({ hasText: title }).getByRole('link').click();
  await expect(page.getByLabel('Tiêu đề')).toHaveValue(title);
  await page.getByLabel('Kỹ thuật viên').selectOption({ label: 'Kỹ thuật viên mẫu' });
  await page.getByLabel('Trạng thái').selectOption({ label: 'Đang xử lý' });
  await capture(page, '06-edit-ticket.png');
  const updated = page.waitForResponse(r => r.url().endsWith('/api/v1/tickets/' + data.id) && r.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  expect((await updated).status()).toBe(200);
  await expect(page).toHaveURL(/\/tickets$/);
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: title })).toContainText('Đang xử lý');
  await page.getByRole('searchbox', { name: 'Tìm nhanh yêu cầu' }).fill(data.code);
  await page.getByRole('searchbox', { name: 'Tìm nhanh yêu cầu' }).press('Enter');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
  await expect(page.getByRole('row').filter({ hasText: title })).toContainText(data.code);
  await page.getByRole('combobox', { name: 'Ưu tiên', exact: true }).selectOption('LOW');
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await expect(page.getByText('Không tìm thấy kết quả phù hợp.')).toBeVisible();
  await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: title })).toBeVisible();
});

test('desktop: user manager and category filter and edit', async ({ page }) => {
  await page.goto('/users');
  await expect(page.getByRole('row').filter({ hasText: 'Kỹ thuật viên mẫu' })).toBeVisible();
  await capture(page, '07-user-manager.png');

  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Danh mục' }).click();
  await expect(page.getByRole('cell', { name: 'NETWORK' })).toBeVisible();
  await capture(page, '08-categories.png');
  await page.getByLabel('Tìm kiếm').fill('NETWORK');
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await expect(page.getByRole('row')).toHaveCount(2);
  await page.getByRole('row').filter({ hasText: 'NETWORK' }).getByRole('link', { name: 'Sửa' }).click();
  await expect(page.getByRole('textbox', { name: 'Tên', exact: true })).toHaveValue('Mạng');
});

test('mobile and tablet: menu and responsive layout', async ({ page }) => {
  test.setTimeout(60000);
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
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Yêu cầu hỗ trợ' }).click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('heading', { name: 'Yêu cầu hỗ trợ' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/', '/tickets', '/tickets/new', '/reports', '/users', '/categories']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('main').locator('[role=status]').filter({ hasText: 'Đang tải' })).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('.stat strong').first().waitFor();
  await page.locator('html').evaluate(html => { html.style.fontSize = '200%'; });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test('reports: filters and exports data from the demo API', async ({ page }) => {
  const created = await page.request.post('/api/v1/tickets', {
    data: { title: 'Kiểm thử báo cáo ' + Date.now(), description: 'Kiểm tra tổng hợp theo loại.', categoryId: 2, requesterId: 1 },
  });
  expect(created.status()).toBe(201);
  await page.goto('/reports');
  await page.getByLabel('Loại yêu cầu').selectOption({ label: 'Phần cứng' });
  await page.getByLabel('Khoảng thời gian').selectOption({ label: '7 ngày gần đây' });
  await page.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
  await expect(page.getByRole('cell', { name: 'Phần cứng' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất CSV' }).click();
  expect((await download).suggestedFilename()).toBe('bao-cao-helpdesk.csv');
  await capture(page, '12-reports.png');
  await page.getByRole('combobox', { name: 'Trạng thái', exact: true }).selectOption('CLOSED');
  await page.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(page.getByText('Không có yêu cầu phù hợp.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xuất CSV' })).toBeDisabled();
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await expect(page.getByRole('button', { name: 'Xuất CSV' })).toBeEnabled();
});
