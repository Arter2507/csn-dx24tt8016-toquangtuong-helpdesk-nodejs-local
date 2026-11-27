# Báo cáo tiến độ Trạm Mèo ngày 26/11/2026

Nhánh cộng tác `local` · Phiên bản **v0.2.0**

## Kết quả hiện tại

| Hạng mục | Kết quả |
| --- | --- |
| Môi trường phát triển | `pnpm dev` chạy Angular, Express và MySQL trong Compose, tự chạy migration và nạp dữ liệu rà soát khi database trống. Cài sạch frontend và backend theo lockfile đã thành công trên Windows và trong Docker. |
| Cập nhật khi lưu | Angular cập nhật CSS và tự tải lại trang khi mã đổi. Compose chuyển thay đổi mã, ảnh và proxy vào dịch vụ tương ứng, tự build lại khi lockfile đổi. |
| Đăng nhập | Dev chấp nhận cả `localhost:4200` và `127.0.0.1:4200`. Production giới hạn theo origin đã cấu hình. |
| Tổ chức và nhân sự | Có bốn vai trò Owner, Admin, Technician và User. Bảng cây đọc đơn vị trực thuộc từ MySQL và giữ các cấp cha khi lọc. Có danh sách phân cấp theo vai trò và sơ đồ liên kết. |
| Cấp quyền | Tài khoản tự đăng ký chờ vào tổ chức. Quản lý có thể gán tài khoản hiện có hoặc cấp liên kết kích hoạt dùng một lần, có hạn 24 giờ. |
| Yêu cầu hỗ trợ | Tìm theo mã đầy đủ hoặc một phần, tiêu đề, nội dung và loại phiếu. Bộ lọc cập nhật trực tiếp, gợi ý theo kết quả và phân trang 5, 10, 20, 50 hoặc 100 dòng. |
| Thao tác trên bảng | Thanh thao tác phản hồi theo số dòng đã chọn. Phiếu có xóa mềm, phân công và gộp. Nhân sự khóa hoặc mở khóa nhiều tài khoản theo cấp quyền. Danh mục bật hoặc ngưng sử dụng nhiều loại phiếu trong một lần. |
| Trải nghiệm | Cài đặt chung tự chuyển giữa hai cột và một cột. Mỗi quy tắc đánh số mở trình sửa riêng và xem trước mã. Owner và Admin vào tổng quan quản trị. Khung chào dùng logo, trang đăng nhập có minh họa nét bút từ bộ mascot. |
| Danh mục dịch vụ và SLA | Danh mục có quan hệ cha–con. Admin và Owner đặt ca làm việc, ngày nghỉ và thời hạn phản hồi hoặc xử lý theo ưu tiên và nhóm. Hai thời hạn được lưu và hiển thị trên phiếu. |
| Hoàn thiện giao diện | Đăng nhập dùng chung khung cho form và minh họa. Thanh lọc tự xuống dòng khi thiếu chỗ. Sơ đồ tổ chức có thẻ phân cấp và đường nối. Bảng, trạng thái tải và thông báo có hiệu ứng ngắn. |

## Kiểm chứng

- Build Angular, kiểm tra kiểu và định dạng frontend, lint backend và các bộ test hiện có đều qua. Bundle đầu khoảng 535 kB, vượt ngưỡng cảnh báo 500 kB.
- MySQL chạy migration và ca tích hợp trên schema riêng. Các ca bổ sung kiểm tra quyền theo vai trò, mã đơn vị trùng, chuyển đơn vị gây vòng lặp, giữ tên đơn vị khi ngưng sử dụng, thu hồi phiên khi khóa và giữ nguyên cả lô nếu có bản ghi nằm ngoài quyền quản lý.
- Đợt SLA kiểm thử giờ nghỉ giữa ca, cuối tuần, ngày lễ, hạn theo nhóm VIP và khôi phục cây danh mục cùng cấu hình SLA từ ZIP. Edge kiểm tra đăng nhập 1440 và 390 px, thanh lọc, sửa và xóa đơn vị, nhánh sơ đồ, lưu SLA và toast sau phản hồi mới.
- Edge kiểm tra bốn vai trò và toàn bộ bốn quy tắc đánh số ở 390 và 1024 px. Kiểm tra Cài đặt ở năm chiều rộng, chế độ sáng/tối, VI/EN, bảng cây bằng bàn phím, tìm mã phiếu, bộ lọc, chọn số dòng và các thanh thao tác sau khi chọn.
- Phiên dev kiểm tra cập nhật file CSS, HTML, TypeScript và ảnh khi tab vẫn mở, nạp lại API sau khi lưu mã, cập nhật proxy và tự build lại backend khi đổi lockfile.

## Việc cần hoàn thiện

- Cơ sở dữ liệu hiện phục vụ một tổ chức mỗi bản cài đặt. Hàng đợi, định tuyến và quyền trên phiếu theo phòng ban thuộc giai đoạn sau.
- Thống kê đúng hạn và thông báo sắp quá hạn thuộc mốc tiếp theo trong [kế hoạch SLA](../documents/markdown/ke-hoach-danh-muc-dich-vu-sla.md).
- Chuẩn bị nghiệm thu máy chủ và tên miền đích, sao lưu ngoài máy và xác nhận số liệu báo cáo bằng dữ liệu thực tế.

Chi tiết các đầu việc sửa Cài đặt, thao tác nhiều dòng và bảng cây nằm trong [nhiệm vụ thiết kế lại giao diện](../documents/markdown/nhiem-vu-thiet-ke-lai-giao-dien.md).

[Hướng dẫn chạy local](../README.local.md) · [Phân công dự án](../documents/markdown/tram-meo-tien-do-va-phan-cong.md) · [Mốc trước ngày 25/11](bao-cao-tien-do-local-2026-11-25.md)
