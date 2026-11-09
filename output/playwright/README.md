# Báo cáo kiểm thử Helpdesk

Ngày 10/11/2026. Playwright chạy trên Microsoft Edge với viewport desktop 1440 × 900 và mobile mô phỏng 390 × 844. Kết quả **4/4 ca đạt**.

| Ca kiểm thử | Bằng chứng |
| --- | --- |
| Dashboard, dropdown và trang giữ chỗ | Dashboard đọc số liệu từ API. Menu hồ sơ mở và đóng bằng Escape. Điều hướng tới Báo cáo hiển thị đúng tiêu đề. |
| Tạo và sửa ticket | Angular gửi POST qua proxy, Express trả 201. Sau khi phân công và chuyển trạng thái, PATCH trả 200. Tải lại vẫn thấy IN_PROGRESS trong bảng của phiên demo. |
| Người dùng và danh mục | Bảng người dùng hiển thị kỹ thuật viên mẫu. Tìm NETWORK lọc còn một dòng và trang sửa nạp tên Mạng. |
| Bố cục mobile | Sidebar mở rồi tự thu khi chọn mục. Trang ticket có chiều rộng tài liệu đúng 390 px. |

## Ảnh chụp

- [Dashboard](screenshots/01-dashboard.png), [dropdown](screenshots/02-dropdown.png), [trang giữ chỗ](screenshots/03-blank-page.png)
- [Tạo ticket](screenshots/04-create-ticket.png), [bảng ticket](screenshots/05-ticket-table.png), [sửa ticket](screenshots/06-edit-ticket.png)
- [Quản lý người dùng](screenshots/07-user-manager.png), [danh mục](screenshots/08-categories.png)
- [Dashboard mobile](screenshots/09-mobile-dashboard.png), [sidebar mobile](screenshots/10-mobile-sidebar.png)

Quan sát ảnh ở 390 px cho thấy nhãn tài khoản xuống hai dòng. Sidebar mở phía trên nội dung và đẩy dashboard xuống. Bảng điều khiển hiển thị số ticket cao hơn trong ảnh mobile vì ảnh chụp sau ca tạo ticket.

## Chạy lại

1. Khởi chạy Express ở cổng 3000 với DATA_SOURCE=demo và Angular ở cổng 4200. Giữ biến PORT của backend trong terminal riêng để Angular không lấy cổng 3000.
2. Trong thư mục này, chạy `npm ci` rồi `npx playwright test`. Máy cần có Microsoft Edge.
3. Chạy `npx playwright show-report report` để mở báo cáo HTML. Script ở [helpdesk.spec.mjs](helpdesk.spec.mjs), cấu hình ở [playwright.config.mjs](playwright.config.mjs).

Bộ test tạo ticket mẫu trong bộ nhớ, được xóa khi khởi động lại backend. Kết quả áp dụng cho chế độ demo và viewport mô phỏng. MySQL, phân quyền và thiết bị thật chưa được kiểm thử.
