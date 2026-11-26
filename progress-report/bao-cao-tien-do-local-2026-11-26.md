# Báo cáo tiến độ Trạm Mèo ngày 26/11/2026

Nhánh cộng tác `local` · Phiên bản **v0.2.0**

## Kết quả hiện tại

| Hạng mục | Kết quả |
| --- | --- |
| Môi trường phát triển | `pnpm dev` chạy Angular, Express và MySQL trong Compose, tự chạy migration và nạp dữ liệu rà soát khi database trống. Cài sạch frontend và backend theo lockfile đã thành công trên Windows và trong Docker. |
| Cập nhật khi lưu | Angular cập nhật CSS và tự tải lại trang khi mã đổi. Compose chuyển thay đổi mã, ảnh và proxy vào dịch vụ tương ứng, tự build lại khi lockfile đổi. |
| Đăng nhập | Dev chấp nhận cả `localhost:4200` và `127.0.0.1:4200`. Production giới hạn theo origin đã cấu hình. |
| Tổ chức và nhân sự | Có bốn vai trò Owner, Admin, Technician và User. Tổ chức có danh sách phân cấp, cây thu gọn và sơ đồ liên kết. Nhân sự có bộ lọc, chỉnh hồ sơ, phân vai trò và khóa hoặc mở khóa theo quyền quản lý. |
| Cấp quyền | Tài khoản tự đăng ký chờ vào tổ chức. Quản lý có thể gán tài khoản hiện có hoặc cấp liên kết kích hoạt dùng một lần, có hạn 24 giờ. |
| Yêu cầu hỗ trợ | Tìm theo mã đầy đủ hoặc một phần, tiêu đề, nội dung và loại phiếu. Bộ lọc cập nhật trực tiếp, gợi ý theo kết quả và phân trang 5, 10, 20, 50 hoặc 100 dòng. |
| Thao tác nhiều phiếu | Có xóa mềm, phân công và gộp. Phân công và gộp cần cùng loại. Gộp còn cần cùng người gửi và một phiếu chính chưa đóng. Có liên kết xem lại phiếu đã gộp cùng dữ liệu gốc. |
| Trải nghiệm | Cài đặt có menu dọc. Owner và Admin vào tổng quan quản trị. Khung chào dùng logo, trang đăng nhập có minh họa nét bút từ bộ mascot. |

## Kiểm chứng

- Build Angular, kiểm tra kiểu và định dạng frontend, lint backend và các bộ test hiện có đều qua. Ngưỡng cảnh báo bundle đầu là 500 kB. Kết quả build khoảng 514 kB.
- MySQL kiểm tra migration trên database trống và dữ liệu cũ, giữ liên kết tài khoản, mã phiếu và người phụ trách. Ca tích hợp kiểm tra phạm vi của bốn vai trò, kích hoạt, phiên, phân công/gộp và đọc lại phiếu đã gộp. Các thao tác thay đổi dữ liệu kiểm thử dùng schema riêng.
- Edge xác nhận đăng nhập, tìm mã một phần và loại phiếu, bộ lọc trực tiếp, chọn số dòng, hộp thoại phân công/gộp, menu Nhân sự và ba chế độ xem Tổ chức. Kiểm tra giao diện Tổ chức ở chiều rộng 390 px.
- Phiên dev kiểm tra cập nhật file CSS, HTML, TypeScript và ảnh khi tab vẫn mở, nạp lại API sau khi lưu mã, cập nhật proxy và tự build lại backend khi đổi lockfile.

## Việc cần hoàn thiện

- Cài đặt chung cần bố trí lại bốn nhóm tùy chọn để tránh hàng lệch. Bảng Quy tắc đánh số phiếu cần giữ nút lưu dễ tiếp cận ở chiều rộng thông dụng và trên màn hình nhỏ.
- Giao diện bảng cần thống nhất trạng thái chưa chọn, đã chọn và nhóm thao tác theo quyền. Cơ cấu tổ chức cần cách trình bày dạng bảng cây dễ đọc trên dữ liệu nhiều cấp.
- Cơ sở dữ liệu hiện phục vụ một tổ chức mỗi bản cài đặt. Danh mục đơn vị trực thuộc, hàng đợi và phạm vi theo phòng ban thuộc giai đoạn sau.
- Chuẩn bị nghiệm thu máy chủ và tên miền đích, sao lưu ngoài máy và xác nhận số liệu báo cáo bằng dữ liệu thực tế.

[Hướng dẫn chạy local](../README.local.md) · [Phân công dự án](../documents/markdown/tram-meo-tien-do-va-phan-cong.md) · [Mốc trước ngày 25/11](bao-cao-tien-do-local-2026-11-25.md)
