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
  await page.getByLabel('Mô tả sự cố').fill('Không đăng nhập được vào mạng làm việc.');
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
  await expect(page.getByLabel('Loại yêu cầu')).toBeFocused();
  await expect(page.getByLabel('Loại yêu cầu')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Loại yêu cầu').selectOption({ label: 'Mạng' });
  await expect(page.getByText('Người gửi mẫu', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Mức ưu tiên')).toHaveCount(0);
  await capture(page, '04-create-ticket.png');

  const created = page.waitForResponse(r => r.url().endsWith('/api/v1/tickets') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
  const post = await created;
  expect(post.status()).toBe(201);
  const { data } = await post.json();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByText('Đã gửi yêu cầu ' + data.code + '.', { exact: true })).toBeVisible();
  expect(data.priority).toBe('HIGH');
  expect(data.requesterId).toBe(1);
  await expect(page.getByRole('row').filter({ hasText: title })).toBeVisible();
  await capture(page, '05-ticket-table.png');

  const ticketRow = page.getByRole('row').filter({ hasText: title });
  await ticketRow.getByRole('button', { name: /^Thao tác cho/ }).click();
  await ticketRow.getByRole('link', { name: 'Sửa', exact: true }).click();
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
  const categoryRow = page.getByRole('row').filter({ hasText: 'NETWORK' });
  await categoryRow.getByRole('button', { name: /^Thao tác cho/ }).click();
  await categoryRow.getByRole('link', { name: 'Sửa', exact: true }).click();
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

test('notifications: bell opens in place, toast follows new updates and preferences', async ({ page }) => {
  const feed = (response) => response.url().includes('/api/v1/notifications') && response.request().method() === 'GET';
  const refreshInbox = () => Promise.all([
    page.waitForResponse(feed),
    page.evaluate(() => window.dispatchEvent(new Event('focus'))),
  ]);
  const makeTicket = async (title) => {
    const result = await page.request.post('/api/v1/tickets', {
      data: { title, description: 'Kiểm tra thông báo trên trình duyệt.', categoryId: 3, requesterId: 1 },
    });
    expect(result.status()).toBe(201);
  };
  const title = 'Thông báo thử ' + Date.now();
  await Promise.all([page.waitForResponse(feed), page.goto('/')]);
  const bell = page.getByRole('button', { name: 'Thông báo', exact: true });
  const preview = page.getByRole('region', { name: 'Thông báo', exact: true }).filter({ has: page.getByRole('heading') });
  const toast = page.locator('.notification-toast').filter({ hasText: title });
  await makeTicket(title);
  await refreshInbox();
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Đóng thông báo' }).click();
  await expect(toast).toHaveCount(0);
  await bell.click();
  await expect(preview.getByRole('link', { name: title })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();
  await expect(bell).toBeFocused();

  await page.setViewportSize({ width: 320, height: 750 });
  await bell.click();
  await expect(preview).toBeVisible();
  const bounds = await preview.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  await expect(preview.getByRole('link', { name: 'Xem tất cả thông báo' })).toBeInViewport();
  await capture(page, 'bang-thong-bao-320px.png');
  await preview.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
  await expect(preview.locator('li.unread')).toHaveCount(0);
  await preview.getByRole('link', { name: 'Xem tất cả thông báo' }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  await expect(page.locator('.portal-updates li.unread')).toHaveCount(0);

  await page.goto('/settings');
  const toastSetting = page.getByRole('checkbox', { name: 'Hiện thông báo nổi khi có cập nhật mới' });
  await toastSetting.uncheck();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByRole('button', { name: 'Theo thiết bị' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await Promise.all([page.waitForResponse(feed), page.reload()]);
  await expect(toastSetting).not.toBeChecked();
  await makeTicket(title + ' đã tắt toast');
  await refreshInbox();
  await expect(page.locator('.notification-toast')).toHaveCount(0);
  await bell.click();
  await expect(preview.getByRole('link', { name: title + ' đã tắt toast' })).toBeVisible();
});

test('wide layout and manual and scheduled backups', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1920, height: 960 });
  await page.goto('/backup');
  const toolbar = await page.locator('.topbar').boundingBox();
  expect(toolbar.width).toBeGreaterThan(1820);
  const start = page.getByRole('button', { name: 'Sao lưu ngay' });
  await expect(start).toBeEnabled();
  await start.click();
  const history = page.getByRole('table');
  const manual = history.getByRole('row').filter({ hasText: 'Sao lưu thủ công' }).first();
  await expect(manual.getByRole('link', { name: 'Tải ZIP' })).toBeVisible({ timeout: 25000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    manual.getByRole('link', { name: 'Tải ZIP' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/);

  await page.getByRole('checkbox', { name: 'Bật sao lưu tự động' }).check();
  await page.getByLabel('Lặp lại mỗi').selectOption({ label: '30 phút' });
  await page.getByRole('button', { name: 'Lưu lịch sao lưu' }).click();
  await expect(history.getByRole('row').filter({ hasText: 'Sao lưu tự động' }).first().getByRole('link')).toBeVisible({ timeout: 25000 });
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Bật sao lưu tự động' })).toBeChecked();
  await expect(page.getByLabel('Lặp lại mỗi').locator('option:checked')).toHaveText('30 phút');
  await expect(page.getByText('Lần chạy kế tiếp', { exact: false })).toBeVisible();
  await capture(page, 'sao-luu-man-hinh-rong.png');
  await page.getByRole('checkbox', { name: 'Bật sao lưu tự động' }).uncheck();
  await page.getByRole('button', { name: 'Lưu lịch sao lưu' }).click();
  await expect(page.getByText('Đã lưu lịch sao lưu.')).toBeVisible();
});
