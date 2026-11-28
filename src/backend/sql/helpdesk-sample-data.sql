-- Dữ liệu mẫu ~5 ticket để xem trên web (Trạm Mèo)
-- Chạy SAU khi đã có schema (prisma migrate hoặc helpdesk-schema.sql).
-- Chọn một database thử mới tạo, đã migrate và chưa có dữ liệu.
--
-- Tài khoản mẫu (mật khẩu: password):
--   user@example.test  — Người gửi
--   tech@example.test  — Kỹ thuật viên
--   admin@example.test — Chủ sở hữu

SET NAMES utf8mb4;
START TRANSACTION;

SET @now = UTC_TIMESTAMP(3);
SET @password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

INSERT INTO roles (id, code, name) VALUES
  (1, 'USER', 'Người dùng'),
  (2, 'TECHNICIAN', 'Chuyên viên kỹ thuật'),
  (3, 'ADMIN', 'Quản trị viên');

INSERT INTO categories (id, code, name, is_active, created_at, updated_at) VALUES
  (1, 'SOFTWARE', 'Phần mềm', 1, @now, @now),
  (2, 'HARDWARE', 'Phần cứng', 1, @now, @now),
  (3, 'NETWORK', 'Mạng', 1, @now, @now),
  (4, 'ACCOUNT', 'Tài khoản', 1, @now, @now);

INSERT INTO knowledge_articles (category_id, title, body, visibility) VALUES
  (3, 'Kiểm tra khi máy tính mất kết nối Wi-Fi', 'Kiểm tra chế độ máy bay và thử kết nối lại Wi-Fi. Nếu nhiều thiết bị cùng mất kết nối, hãy ghi tên mạng, khu vực và thời điểm sự cố vào phiếu hỗ trợ.', 'PUBLIC'),
  (4, 'Cần làm gì khi không đăng nhập được email?', 'Kiểm tra địa chỉ email và bộ gõ rồi thử lại. Nếu vẫn không được, gửi ảnh lỗi đã che thông tin cá nhân. Không đính kèm mật khẩu hoặc mã xác minh.', 'PUBLIC'),
  (2, 'Thông tin cần thu thập khi máy in kẹt giấy', 'Ghi mã thiết bị, loại giấy và vị trí kẹt. Kiểm tra theo hướng dẫn của nhà sản xuất. Ghi kết quả in thử vào phiếu trước khi hoàn tất xử lý.', 'INTERNAL');

INSERT INTO users (id, email, password_hash, full_name, phone, is_active, created_at, updated_at) VALUES
  (1, 'user@example.test', @password_hash, 'Người gửi mẫu', NULL, 1, @now, @now),
  (2, 'tech@example.test', @password_hash, 'Kỹ thuật viên mẫu', '0901000002', 1, @now, @now),
  (3, 'admin@example.test', @password_hash, 'Quản trị mẫu', NULL, 1, @now, @now),
  (4, 'lan.nguyen@example.test', @password_hash, 'Nguyễn Thị Lan', '0901000004', 1, @now, @now),
  (5, 'minh.tran@example.test', @password_hash, 'Trần Văn Minh', '0901000005', 1, @now, @now);

UPDATE users SET username = CASE id WHEN 1 THEN 'user' WHEN 2 THEN 'technical' WHEN 3 THEN 'admin' END
WHERE id IN (1, 2, 3);

INSERT INTO user_roles (user_id, role_id, created_at) VALUES
  (1, 1, @now),
  (2, 1, @now),
  (2, 2, @now),
  (3, 1, @now),
  (3, 3, @now),
  (4, 1, @now),
  (5, 1, @now),
  (5, 2, @now);

INSERT INTO technician_categories (user_id, category_id, created_at) VALUES
  (2, 1, @now),
  (2, 2, @now),
  (2, 3, @now),
  (2, 4, @now),
  (5, 1, @now),
  (5, 3, @now);

UPDATE organizations SET owner_id = 3 WHERE id = 1 AND owner_id IS NULL;
INSERT INTO organization_units (id, organization_id, parent_id, code, name) VALUES
  (1, 1, NULL, 'DIEU-HANH', 'Điều hành');
INSERT INTO organization_units (id, organization_id, parent_id, code, name) VALUES
  (2, 1, 1, 'VAN-PHONG', 'Văn phòng'),
  (3, 1, 1, 'HO-TRO', 'Hỗ trợ kỹ thuật');
INSERT INTO organization_units (id, organization_id, parent_id, code, name) VALUES
  (4, 1, 3, 'HA-TANG', 'Mạng & Hạ tầng');
INSERT INTO organization_members (user_id, organization_id, employee_code, department, position, role, joined_at) VALUES
  (1, 1, 'NV001', 'Văn phòng', 'Nhân viên', 'USER', @now),
  (2, 1, 'NV002', 'Hỗ trợ kỹ thuật', 'Chuyên viên', 'TECHNICIAN', @now),
  (3, 1, 'NV003', 'Điều hành', 'Chủ sở hữu', 'OWNER', @now),
  (4, 1, 'NV004', 'Văn phòng', 'Nhân viên', 'USER', @now),
  (5, 1, 'NV005', 'Mạng & Hạ tầng', 'Chuyên viên', 'TECHNICIAN', @now);
UPDATE organization_members m JOIN organization_units unit
  ON unit.organization_id = m.organization_id AND unit.name = m.department
SET m.unit_id = unit.id;

-- 5 yêu cầu mẫu (trạng thái khác nhau để dashboard/báo cáo có dữ liệu)
INSERT INTO tickets (
  id, display_code, requester_id, assignee_id, category_id, title, description,
  priority, status, version, resolved_at, closed_at, archived_at, created_at, updated_at
) VALUES
  (
    1, 'HD-001', 1, NULL, 4,
    'Không đăng nhập được email công ty',
    'Khi nhập mật khẩu hệ thống báo sai dù đã đổi mật khẩu hôm qua.',
    'HIGH', 'NEW', 1, NULL, NULL, NULL,
    DATE_SUB(@now, INTERVAL 2 HOUR), DATE_SUB(@now, INTERVAL 2 HOUR)
  ),
  (
    2, 'HD-002', 4, 2, 1,
    'Phần mềm kế toán bị treo khi xuất báo cáo',
    'Mở module báo cáo tháng thì ứng dụng không phản hồi khoảng 2 phút rồi thoát.',
    'MEDIUM', 'IN_PROGRESS', 2, NULL, NULL, NULL,
    DATE_SUB(@now, INTERVAL 1 DAY), DATE_SUB(@now, INTERVAL 3 HOUR)
  ),
  (
    3, 'HD-003', 1, 2, 3,
    'Mất kết nối Wi-Fi phòng họp tầng 3',
    'Máy tính xách tay không nhận được SSID nội bộ từ sáng nay.',
    'URGENT', 'RESOLVED', 3, DATE_SUB(@now, INTERVAL 1 HOUR), NULL, NULL,
    DATE_SUB(@now, INTERVAL 2 DAY), DATE_SUB(@now, INTERVAL 1 HOUR)
  ),
  (
    4, 'HD-004', 4, 5, 2,
    'Máy in hành chính kẹt giấy liên tục',
    'Đã thử lấy giấy ra nhưng đèn cảnh báo vẫn sáng, không in được phiếu.',
    'LOW', 'CLOSED', 4, DATE_SUB(@now, INTERVAL 2 DAY), DATE_SUB(@now, INTERVAL 1 DAY), NULL,
    DATE_SUB(@now, INTERVAL 5 DAY), DATE_SUB(@now, INTERVAL 1 DAY)
  ),
  (
    5, 'HD-005', 1, NULL, 1,
    'Cần cài đặt bộ Office cho máy mới',
    'Máy bàn vừa nhận chưa có Word/Excel. Ưu tiên trong tuần này.',
    'MEDIUM', 'NEW', 1, NULL, NULL, NULL,
    DATE_SUB(@now, INTERVAL 30 MINUTE), DATE_SUB(@now, INTERVAL 30 MINUTE)
  );

INSERT INTO ticket_events (ticket_id, actor_id, event_type, old_value, new_value, note, created_at) VALUES
  (1, 1, 'CREATED', NULL, JSON_OBJECT('status', 'NEW'), NULL, DATE_SUB(@now, INTERVAL 2 HOUR)),
  (2, 4, 'CREATED', NULL, JSON_OBJECT('status', 'NEW'), NULL, DATE_SUB(@now, INTERVAL 1 DAY)),
  (2, 3, 'ASSIGNEE_CHANGED', JSON_OBJECT('assigneeId', NULL), JSON_OBJECT('assigneeId', 2), NULL, DATE_SUB(@now, INTERVAL 20 HOUR)),
  (2, 2, 'STATUS_CHANGED', JSON_OBJECT('status', 'NEW'), JSON_OBJECT('status', 'IN_PROGRESS'), NULL, DATE_SUB(@now, INTERVAL 3 HOUR)),
  (3, 1, 'CREATED', NULL, JSON_OBJECT('status', 'NEW'), NULL, DATE_SUB(@now, INTERVAL 2 DAY)),
  (3, 3, 'ASSIGNEE_CHANGED', JSON_OBJECT('assigneeId', NULL), JSON_OBJECT('assigneeId', 2), NULL, DATE_SUB(@now, INTERVAL 40 HOUR)),
  (3, 2, 'STATUS_CHANGED', JSON_OBJECT('status', 'NEW'), JSON_OBJECT('status', 'IN_PROGRESS'), NULL, DATE_SUB(@now, INTERVAL 36 HOUR)),
  (3, 2, 'STATUS_CHANGED', JSON_OBJECT('status', 'IN_PROGRESS'), JSON_OBJECT('status', 'RESOLVED'), 'Đã reset AP và kiểm tra kết nối lại ổn định.', DATE_SUB(@now, INTERVAL 1 HOUR)),
  (4, 4, 'CREATED', NULL, JSON_OBJECT('status', 'NEW'), NULL, DATE_SUB(@now, INTERVAL 5 DAY)),
  (4, 3, 'ASSIGNEE_CHANGED', JSON_OBJECT('assigneeId', NULL), JSON_OBJECT('assigneeId', 5), NULL, DATE_SUB(@now, INTERVAL 4 DAY)),
  (4, 5, 'STATUS_CHANGED', JSON_OBJECT('status', 'NEW'), JSON_OBJECT('status', 'IN_PROGRESS'), NULL, DATE_SUB(@now, INTERVAL 4 DAY)),
  (4, 5, 'STATUS_CHANGED', JSON_OBJECT('status', 'IN_PROGRESS'), JSON_OBJECT('status', 'RESOLVED'), 'Thay khay giấy và vệ sinh cảm biến.', DATE_SUB(@now, INTERVAL 2 DAY)),
  (4, 4, 'STATUS_CHANGED', JSON_OBJECT('status', 'RESOLVED'), JSON_OBJECT('status', 'CLOSED'), 'Đã xác nhận in bình thường.', DATE_SUB(@now, INTERVAL 1 DAY)),
  (5, 1, 'CREATED', NULL, JSON_OBJECT('status', 'NEW'), NULL, DATE_SUB(@now, INTERVAL 30 MINUTE));

INSERT INTO ticket_comments (ticket_id, author_id, body, created_at) VALUES
  (2, 2, 'Đã nhận máy, đang thu thập log lỗi xuất báo cáo.', DATE_SUB(@now, INTERVAL 3 HOUR)),
  (3, 2, 'AP tầng 3 đã được khởi động lại, vui lòng thử lại Wi-Fi.', DATE_SUB(@now, INTERVAL 1 HOUR)),
  (4, 5, 'Máy in đã chạy thử 10 bản, không còn kẹt giấy.', DATE_SUB(@now, INTERVAL 2 DAY));

INSERT INTO notifications (user_id, ticket_id, type, title, body, read_at, created_at) VALUES
  (2, 1, 'TICKET_CREATED', 'Yêu cầu mới: tài khoản', 'Không đăng nhập được email công ty', NULL, DATE_SUB(@now, INTERVAL 2 HOUR)),
  (2, 2, 'ASSIGNED', 'Được phân công xử lý', 'Phần mềm kế toán bị treo khi xuất báo cáo', NULL, DATE_SUB(@now, INTERVAL 20 HOUR)),
  (1, 3, 'RESOLVED', 'Yêu cầu đã xử lý', 'Mất kết nối Wi-Fi phòng họp tầng 3', NULL, DATE_SUB(@now, INTERVAL 1 HOUR)),
  (5, 4, 'ASSIGNED', 'Được phân công xử lý', 'Máy in hành chính kẹt giấy liên tục', DATE_SUB(@now, INTERVAL 3 DAY), DATE_SUB(@now, INTERVAL 4 DAY)),
  (2, 5, 'TICKET_CREATED', 'Yêu cầu mới: phần mềm', 'Cần cài đặt bộ Office cho máy mới', NULL, DATE_SUB(@now, INTERVAL 30 MINUTE));

COMMIT;
