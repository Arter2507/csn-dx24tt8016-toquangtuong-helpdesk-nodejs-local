# Cập nhật tiến độ Trạm Hỗ Trợ ngày 29/11/2026

**Đề tài** — Thiết kế website quản lý yêu cầu hỗ trợ kỹ thuật

**Phiên bản** — v1.3.0, nhánh `local`

| Hạng mục | Kết quả |
| --- | --- |
| Trang chủ Help Center | Cả `localhost:4200` và `127.0.0.1:4200` hiển thị Help Center ngay tại `/`. Tìm kiếm ở giữa trang, có lối tắt đến kho hướng dẫn, FAQ và yêu cầu cá nhân. Các bài thường dùng và câu hỏi mở câu trả lời ngay trên trang. |
| Luồng cá nhân | Đăng nhập từ biểu mẫu gửi phiếu sẽ quay về biểu mẫu. Đăng xuất đưa về Help Center. Khách và thành viên có thể chỉnh giao diện, ngôn ngữ và tùy chọn hiển thị. Thành viên mở hồ sơ và thông báo từ menu tài khoản. |
| Hiển thị phiếu | Mục Yêu cầu hỗ trợ của tôi dùng thẻ có mã, trạng thái, mô tả ngắn, thời điểm cập nhật và liên kết tiến độ. Có tìm kiếm, lọc trạng thái và phân trang. |
| Cổng quản lý | `/admin-management` là đường dẫn mới. Owner, Admin và Technician chuyển sang cổng phù hợp trong cùng phiên. Đường dẫn cũ dưới `/management` được chuyển hướng và giữ tham số lọc. |

Playwright đã kiểm tra hai địa chỉ local, mục câu hỏi mở rộng, lưu giao diện của khách, bộ lọc trạng thái trên thẻ, đăng xuất về trang chủ, phân quyền và chuyển cổng. Màn hình rộng 390 px hiển thị danh sách cá nhân không tràn ngang. TypeScript, Prettier và build Angular đều đạt. Gói tải ban đầu khoảng 580 kB, vượt ngưỡng cảnh báo 500 kB.

[Hướng dẫn chạy](../README.local.md) · [Sitemap và quyền](../documents/markdown/giao-dien-v1.3.0.md)
