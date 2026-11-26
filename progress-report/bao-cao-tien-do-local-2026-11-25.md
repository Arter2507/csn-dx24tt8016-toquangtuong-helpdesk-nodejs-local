# Báo cáo tiến độ Trạm Mèo ngày 25/11/2026

Nhánh cộng tác `local` · Phiên bản **v0.2.0**

## Cập nhật ngày 26/11/2026

Đã triển khai nhận diện Trạm Mèo mới và phân hệ Tổ chức, Nhân sự trên MySQL. Owner, Admin, Technician và User nhận quyền từ thành viên tổ chức. Trang Tổ chức có danh sách phân cấp, sơ đồ cây và bảng quyền. Nhân sự có bộ lọc, hồ sơ công việc, ảnh đại diện, đổi vai trò và khóa hoặc mở khóa tài khoản.

Kiểm tra tích hợp xác nhận tài khoản tự đăng ký phải chờ cấp quyền và Admin chỉ thay đổi nhân sự cấp dưới. Edge đã đi qua luồng đăng ký, thêm tài khoản theo email, tạo lại link mời và kích hoạt kỹ thuật viên. Migration đã thử trên database trống và database có phiếu, tài khoản và hồ sơ cũ.

Giai đoạn tiếp theo bổ sung danh mục phòng ban và quyền theo phòng. Phạm vi triển khai hiện tại là một tổ chức mỗi bản cài đặt. [ERD, ma trận quyền và API](../documents/markdown/ke-hoach-iam-rbac.md)

## Kết quả đợt cập nhật

| Hạng mục | Kết quả |
| --- | --- |
| Giao diện | Màu xanh sáng hơn ở chế độ sáng. Chế độ tối dùng nền xám tro và điểm nhấn xanh. |
| Môi trường chạy | `pnpm dev` dựng Angular, Express và MySQL trong cùng Compose, tự chạy migration. Phiên demo đang mở đã có bản ZIP lưu trong volume trước khi chuyển local sang MySQL. |
| Dữ liệu rà soát | 10 phiếu trên 8 ngày thuộc 3 tháng, bao phủ 5 trạng thái và 4 mức ưu tiên. Có 7 nhiệm vụ với 3 trạng thái. Chạy lại seed giữ nguyên các phiếu rà soát đã có. |
| Lịch | Lịch tháng đánh dấu hôm nay và hiện tên, trạng thái nhiệm vụ trong từng ô. Lịch tuần của chuyên viên đánh dấu ngày có việc và mở chi tiết nhiệm vụ được giao. |
| Danh mục | Một mục điều hướng tập trung danh sách người dùng và danh mục loại phiếu. Trang và API quản trị giữ kiểm tra vai trò. |
| Production | Có Compose riêng gồm Caddy, Angular build tĩnh, Express, MySQL, cấu hình origin và lưu trữ qua volume. Bộ production khởi tạo DB trống và có lệnh cấp tài khoản quản trị. |
| IAM/RBAC | Đã lập ma trận quyền dự kiến cho Requester, Agent, trưởng nhóm và Admin, phương án migration, định tuyến theo phòng và phân công hai người. |

## Kiểm chứng

- Edge chạy ba tài khoản mẫu. Đã thử màu chế độ sáng, mở hai danh mục từ trang chung, tìm phiếu theo mã, lọc kết hợp trạng thái/ưu tiên, lọc ngày, mở cùng nhiệm vụ từ lịch tháng và lịch tuần. Tài khoản người gửi được chuyển về trang của mình khi mở URL danh mục quản trị.
- MySQL local trả đủ 10 phiếu và 7 nhiệm vụ. Chạy lại quá trình khởi tạo giữ số bản ghi mẫu.
- Cấu hình production đã chạy trên mạng cục bộ với chứng chỉ Caddy. Đã kiểm tra database trống trước khi cấp quản trị viên, cookie Secure, tải trực tiếp URL chi tiết, upload và tải lại ảnh đại diện cùng tệp đính kèm. Ảnh và tệp vẫn có sau khi khởi động lại backend.

## Việc tiếp theo

1. Triển khai danh mục phòng, thành viên, vai trò trưởng nhóm và phạm vi hàng đợi. Mở rộng kiểm tra quyền cho báo cáo, tệp và lịch theo phòng.
2. Xác nhận máy chủ và tên miền đích. Kiểm tra chứng chỉ công khai, sao lưu ngoài máy, khôi phục thử và nghiệm thu theo vai trò trước khi cấp tài khoản thật.
3. Đối chiếu báo cáo theo các khoảng ngày trên bộ MySQL local. Ghi nhận phản hồi giao diện và kiểm tra trên thiết bị thật.

[Hướng dẫn local](../README.local.md) · [Triển khai production](../docker/production.md) · [Kế hoạch IAM/RBAC](../documents/markdown/ke-hoach-iam-rbac.md)
