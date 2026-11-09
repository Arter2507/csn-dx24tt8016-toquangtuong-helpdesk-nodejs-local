# Báo cáo tiến độ Helpdesk · 10/11/2026

Bản theo dõi của nhánh `local`, dùng làm nguồn đối chiếu khi soạn báo cáo nộp chính thức. Mốc này nối tiếp [báo cáo khởi tạo](bao-cao-tien-do-11-10-2026.md).

## Phần đã thực hiện

- Xây dựng API Express chạy với dữ liệu trong bộ nhớ cho danh mục, người dùng và ticket. Có validation, phản hồi lỗi chung, tìm kiếm, lọc, sắp xếp và phân trang. Ticket mẫu hỗ trợ phân công, chuyển trạng thái và kiểm tra xung đột phiên bản.
- Dựng khung Angular gồm header, sidebar, menu thả xuống, dashboard và bảng quản lý. Ticket, người dùng và danh mục có đường dẫn riêng cho danh sách, tạo và sửa. Báo cáo, thông báo, sao lưu và hồ sơ có trang giữ chỗ. Biểu tượng lấy từ Bootstrap Icons, favicon dùng SVG.
- Chuẩn bị cấu hình mẫu, schema MySQL cho các bảng chính và hai bản đồ mã nguồn để tra cứu khi bảo trì. [Backend](../src/backend/readme.map) · [Frontend](../src/frontend/readme.map) · [Hướng dẫn chạy](../src/README.md).

## Kiểm chứng

- Angular build thành công, 2 bài kiểm thử frontend và 2 bài kiểm thử backend đã đạt trong các lượt kiểm tra tương ứng.
- Playwright trên Edge đạt 4/4 ca với desktop 1440 × 900 và mobile mô phỏng 390 × 844. Tạo và sửa ticket qua API trả HTTP 201 và 200. Tải lại trang vẫn thấy trạng thái cập nhật trong phiên demo. Đã kiểm tra dropdown, điều hướng, lọc danh mục và sidebar mobile.
- Ở 390 px, nhãn tài khoản xuống hai dòng và sidebar đẩy nội dung xuống khi mở. Trang ticket không tràn ngang ở kích thước đã thử. [Báo cáo Playwright và 10 ảnh](../output/playwright/README.md) · [Báo cáo HTML](../output/playwright/report/index.html).

## Công việc còn lại

- Tích hợp MySQL cho người dùng và ticket, chạy thử schema trên MySQL thực, bổ sung xác thực và phân quyền trước khi mở truy cập dữ liệu thật.
- Hoàn thiện nghiệp vụ theo tài liệu thiết kế, gồm lịch sử, thông báo, thống kê và sao lưu. Dữ liệu kiểm thử hiện mất khi khởi động lại backend.
- Kiểm tra giao diện trên thiết bị thật và nghiệm thu các luồng theo vai trò trước khi lập báo cáo chính thức.
