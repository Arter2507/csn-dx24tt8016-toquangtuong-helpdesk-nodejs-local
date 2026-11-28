# Thiết kế giao diện v1.3.0

**Đề tài** — Thiết kế website quản lý yêu cầu hỗ trợ kỹ thuật

## Kiến trúc và điều hướng

| Không gian | Đường dẫn | Nội dung |
| --- | --- | --- |
| Trung tâm hỗ trợ | `/help-center` | Tìm bài hướng dẫn, mở FAQ, gửi yêu cầu và xem các phiếu mới nhất do mình gửi. |
| Yêu cầu của tôi | `/help-center/tickets` | Danh sách cá nhân, tạo phiếu tại `/new`, xem chi tiết tại `/:id/view`. Nội dung chi tiết có tiến độ, trò chuyện, xác nhận xử lý hoặc yêu cầu xử lý lại. |
| Hỗ trợ tự phục vụ | `/help-center/knowledge`, `/help-center/faq` | Khách truy cập và thành viên tra cứu bài công khai cùng nguồn dữ liệu. |
| Tài khoản cá nhân | `/help-center/profile`, `/help-center/notifications`, `/help-center/settings` | Hồ sơ, thông báo cá nhân và tùy chọn. |
| Cổng quản lý | `/management`, `/management/dashboard/technician` | Owner và Admin có tổng quan điều phối. Kỹ thuật viên có phiếu được giao, lịch tuần, ghi chú và liên kết tới công việc. |
| Nghiệp vụ quản lý | `/management/tickets`, `/management/tickets/folders`, `/management/tasks`, `/management/knowledge` | Bảng phiếu, thư mục, nhiệm vụ và kho kiến thức theo quyền. |
| Quản trị | `/management/users`, `/management/categories`, `/management/reports`, `/management/backup`, `/management/settings` | Nhân sự, cơ cấu và danh mục, báo cáo, sao lưu và phục hồi, cấu hình hệ thống. |
| Xác thực | `/login`, `/register`, `/activate`, `/forgot-password`, `/reset-password` | Xác thực dùng chung. Tài khoản chưa thuộc tổ chức được chuyển đến màn hình chờ khi mở trang nghiệp vụ. |

Các đường dẫn cũ tới phiếu, cấu hình và kho hướng dẫn vẫn được điều hướng đến trang tương ứng. Hai cổng dùng một bản build Angular, một API Express và một database MySQL.

## Luồng yêu cầu và quyền

1. Người gửi tìm hướng dẫn hoặc đăng nhập để gửi phiếu. Help Center giới hạn danh sách theo tài khoản hiện tại.
2. Owner hoặc Admin phân loại và phân công trong cổng quản lý. Kỹ thuật viên tiếp nhận, trao đổi và ghi kết quả.
3. Người gửi có thể yêu cầu xử lý lại hoặc xác nhận đóng. Điểm 1–5 và góp ý là tùy chọn. Điểm được lưu cùng sự kiện đóng trong lịch sử phiếu.
4. Người dùng cuối có thể tra cứu Help Center. Kỹ thuật viên chuyển được giữa hai cổng và chỉ thấy phiếu được giao hoặc phiếu do mình gửi theo quy tắc hiện có. Owner và Admin thực hiện thao tác quản lý theo quyền đã được API kiểm tra.
5. Thư mục dùng loại phiếu trực tiếp để tránh đếm trùng danh mục cha và con. Năm và tháng dựa theo ngày tạo tại múi giờ Việt Nam. Nhóm phòng ban theo đơn vị hiện tại của người gửi, với nhóm riêng cho người chưa gán đơn vị. Mở thư mục sẽ chuyển sang bảng đã lọc.

## Giao diện

- Help Center dùng điều hướng ngang, ô tìm hướng dẫn và các liên kết gửi hoặc theo dõi phiếu. Cổng quản lý có thanh bên sát mép trái, nối liền với header qua một góc cong trên màn hình rộng. Mục hiện hành có chỉ dấu màu và nối vào vùng nội dung.
- Tám bộ màu gồm navy, cam đào, hồng phấn, lavender, xanh lá dịu, vàng mật ong, xám khói và xanh ngọc. Mỗi bộ có màu dùng riêng cho sáng và tối.
- Kính mờ dùng bốn ảnh sáng và năm ảnh tối trong `documents/Update/`. Frontend xoay 90° khi hiển thị ảnh nền và khung xem trước. Các khung dùng bề mặt bán trong suốt, với lớp mờ ở vùng cần đọc nội dung. Trình duyệt ghi nhớ bộ màu, chế độ hiển thị và ảnh đã chọn.
- Xem thêm [quy tắc thiết kế](../Phase-1-Design-UI/Rules/SYSTEM_DESIGN_Design_System_Helpdesk.md) và [kiến trúc hệ thống](../../docs/system-design/SYSTEM_ARCHITECTURE.md).

## Kịch bản nghiệm thu

| Kịch bản | Kết quả mong đợi |
| --- | --- |
| Khách mở Help Center và tìm hướng dẫn | Thấy nội dung công khai. Mở trang gửi phiếu được dẫn đến đăng nhập và quay lại biểu mẫu. |
| USER mở cổng quản lý hoặc API thư mục | Giao diện chuyển về Help Center, API trả 403. |
| Technician chuyển cổng rồi mở yêu cầu của tôi | Giữ nguyên phiên và chỉ thấy phiếu do mình gửi trong Help Center. |
| Duyệt cùng loại qua năm và tháng, hoặc mở phòng ban | Bảng giữ đúng phạm vi từ thư mục. Phiếu đã lưu trữ vắng mặt trong kết quả. |
| Người gửi mở phiếu đã xử lý | Có thể yêu cầu xử lý lại, hoặc đóng và gửi đánh giá tùy chọn. |
| Đổi sáng/tối và đổi ảnh nền rồi tải lại | Mỗi chế độ dùng ảnh và màu tương ứng. Lựa chọn được ghi nhớ. |
| Đặt lại mật khẩu bằng liên kết đã nhận | Liên kết chỉ dùng một lần. Phiên cũ bị thu hồi. SMTP phải được bật để gửi email. |
