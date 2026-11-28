import { pool } from '../src/database/pool.js';
import { seedSampleFaq } from './seed-faq.js';

const samples = [
  { code: 'TM-MAU-01', category: 'NETWORK', title: 'VPN không kết nối ngoài văn phòng', description: 'Kết nối VPN hết thời gian chờ trên hai máy.', priority: 'URGENT', status: 'NEW', days: 0 },
  { code: 'TM-MAU-02', category: 'HARDWARE', title: 'Máy quét báo lỗi sau khi thay cáp', description: 'Máy quét lên đèn vàng, cần kiểm tra mã lỗi trên màn hình.', priority: 'HIGH', status: 'PENDING_CUSTOMER', days: 3 },
  { code: 'TM-MAU-03', category: 'SOFTWARE', title: 'Excel treo khi mở báo cáo kho', description: 'Bảng tính dùng công thức liên kết với tệp trên ổ mạng.', priority: 'MEDIUM', status: 'IN_PROGRESS', days: 12 },
  { code: 'TM-MAU-04', category: 'ACCOUNT', title: 'Cập nhật quyền xem hộp thư chung', description: 'Đã bổ sung quyền theo phê duyệt, chờ người gửi xác nhận.', priority: 'LOW', status: 'RESOLVED', days: 35 },
  { code: 'TM-MAU-05', category: 'NETWORK', title: 'Mất kết nối mạng kho hàng', description: 'Đã thay dây mạng và xác nhận thiết bị kiểm kê hoạt động.', priority: 'HIGH', status: 'CLOSED', days: 68 },
];
const tasks = [
  ['Rà soát kết nối VPN', 'DOING', 0],
  ['Gửi hướng dẫn chụp mã lỗi máy quét', 'TODO', 0],
  ['Kiểm tra bản vá Excel', 'TODO', 2],
  ['Đối chiếu quyền hộp thư chung', 'DONE', -2],
  ['Kiểm tra mạng sau bảo trì', 'DONE', -7],
  ['Kiểm kê cổng mạng tầng 2', 'DONE', -34],
  ['Lên lịch thay thiết bị dự phòng', 'TODO', 35],
];
const dayKey = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const dayMs = 86_400_000;

export async function seedReviewData() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [accounts] = await conn.query(
      `SELECT id, email FROM users
       WHERE is_active = 1 AND email IN ('admin@example.test', 'tech@example.test', 'user@example.test', 'lan.nguyen@example.test')
       ORDER BY id FOR UPDATE`,
    );
    const ids = new Map(accounts.map(account => [account.email, account.id]));
    const standardAccounts = ['admin@example.test', 'tech@example.test', 'user@example.test'];
    const faqAdded = standardAccounts.every(email => ids.has(email)) ? await seedSampleFaq(conn) : 0;
    if (ids.size !== 4) {
      await conn.commit();
      if (faqAdded) console.log('Đã nạp ' + faqAdded + ' bài hướng dẫn mẫu.');
      return;
    }
    const admin = ids.get('admin@example.test');
    const technician = ids.get('tech@example.test');
    const requester = ids.get('user@example.test');
    const otherRequester = ids.get('lan.nguyen@example.test');
    const [categories] = await conn.query('SELECT id, code FROM categories WHERE is_active = 1');
    const categoryIds = new Map(categories.map(category => [category.code, category.id]));
    const [existing] = await conn.execute(
      `SELECT display_code AS code FROM tickets WHERE display_code IN (${samples.map(() => '?').join(',')})`,
      samples.map(sample => sample.code),
    );
    const existingCodes = new Set(existing.map(row => row.code));
    const now = Date.now();
    let added = 0;
    for (const [index, sample] of samples.entries()) {
      const category = categoryIds.get(sample.category);
      if (!category) continue;
      if (existingCodes.has(sample.code)) continue;
      const owner = index % 2 ? otherRequester : requester;
      const assigned = sample.status === 'NEW' ? null : technician;
      const created = new Date(now - sample.days * dayMs - 20 * 60_000);
      const updated = assigned ? new Date(created.getTime() + 15 * 60_000) : created;
      const closed = sample.status === 'CLOSED' ? updated : null;
      const resolved = sample.status === 'RESOLVED' ? updated : closed ? new Date(updated.getTime() - 60_000) : null;
      const [result] = await conn.execute(
        `INSERT INTO tickets (display_code, category_id, requester_id, assignee_id, title, description,
           priority, status, created_at, updated_at, resolved_at, closed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sample.code, category, owner, assigned, sample.title, sample.description, sample.priority, sample.status, created, updated, resolved, closed],
      );
      const ticketId = result.insertId;
      await conn.execute(
        `INSERT INTO ticket_events (ticket_id, actor_id, event_type, new_value, created_at)
         VALUES (?, ?, 'CREATED', JSON_OBJECT('status', 'NEW'), ?)`,
        [ticketId, owner, created],
      );
      if (assigned) {
        const note = sample.status === 'PENDING_CUSTOMER' ? 'Bạn vui lòng cung cấp ảnh màn hình mã lỗi.' : null;
        await conn.execute(
          `INSERT INTO ticket_events (ticket_id, actor_id, event_type, old_value, new_value, note, created_at)
           VALUES (?, ?, 'STATUS_CHANGED', JSON_OBJECT('status', 'NEW'), JSON_OBJECT('status', ?), ?, ?)`,
          [ticketId, technician, sample.status, note, updated],
        );
        await conn.execute(
          `INSERT INTO notifications (user_id, ticket_id, type, title, body, created_at)
           VALUES (?, ?, 'STATUS_CHANGED', ?, ?, ?)`,
          [owner, ticketId, sample.title, sample.status, updated],
        );
        if (note) {
          await conn.execute(
            `INSERT INTO ticket_comments (ticket_id, author_id, body, is_internal, created_at)
             VALUES (?, ?, ?, FALSE, ?), (?, ?, 'Đối chiếu mã lỗi với tài liệu thiết bị.', TRUE, ?)`,
            [ticketId, technician, note, updated, ticketId, technician, updated],
          );
        }
      }
      added++;
    }
    if (!existingCodes.size && added) {
      for (const [title, status, offset] of tasks) {
        await conn.execute(
          `INSERT INTO task_items (title, description, status, assignee_id, created_by, due_date, version)
           SELECT ?, 'Nhiệm vụ mẫu dùng để kiểm tra lịch và phân công.', ?, ?, ?, ?, 1
           WHERE NOT EXISTS (SELECT id FROM task_items WHERE created_by = ? AND title = ?)`,
          [title, status, technician, admin, dayKey.format(new Date(now + offset * dayMs)), admin, title],
        );
      }
    }
    await conn.commit();
    console.log('Đã bổ sung ' + added + ' phiếu vào bộ dữ liệu rà soát.');
    if (faqAdded) console.log('Đã nạp ' + faqAdded + ' bài hướng dẫn mẫu.');
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
