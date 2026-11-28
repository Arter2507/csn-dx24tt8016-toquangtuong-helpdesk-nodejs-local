# Thông báo đa kênh

## Thông báo trên web

- Khi phân công phiếu hoặc có phản hồi, MySQL lưu thông báo cho tài khoản liên quan. Sau khi giao dịch lưu thành công, kết nối SSE báo cho trình duyệt tải hộp thư mới. Chuông, toast và trang Thông báo dùng chung trạng thái đã đọc. Mở thông báo sẽ đến phiếu tương ứng theo quyền hiện hành.
- Sau mỗi 15 giây, backend kiểm tra phiếu sắp đến hạn phản hồi hoặc xử lý. Cảnh báo được tạo một lần cho mỗi mốc hạn trong cửa sổ 30 phút trước hạn. Nếu chưa có chuyên viên đang hoạt động, cảnh báo đến nhóm quản trị. SLA dùng hạn đã tính theo lịch làm việc trong [cấu hình SLA](ke-hoach-danh-muc-dich-vu-sla.md).
- Trình duyệt mở `GET /api/v1/notifications/stream` bằng phiên đăng nhập. Nếu mất kết nối, hệ thống tải lại hộp thư và kết nối lại. Kết nối có tín hiệu định kỳ để kiểm tra phiên và nhận thông báo từ tiến trình khác.

## Email trạng thái

| Biến môi trường | Ý nghĩa |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT` | Máy chủ và cổng gửi. Mặc định 587. Cổng 465 dùng TLS ngay khi kết nối. Production yêu cầu STARTTLS trên các cổng khác. |
| `SMTP_USER`, `SMTP_PASSWORD` | Thông tin đăng nhập nếu relay yêu cầu. |
| `MAIL_FROM` | Hộp thư gửi đã được hệ thống SMTP cho phép. |
| `MAIL_LANGUAGE` | `vi` hoặc `en`, mặc định `vi`. |

Đặt các biến trong `docker/.env` khi chạy local hoặc file môi trường riêng của production. Khi có máy chủ SMTP và địa chỉ gửi, thay đổi trạng thái phiếu sẽ đưa email cho người gửi vào hàng đợi MySQL. Hàng đợi tự thử lại tối đa năm lần. Email có mã phiếu, trạng thái và liên kết theo địa chỉ web đã cấu hình. Mẫu nằm trong `src/backend/src/modules/notifications/mail-templates.json`. Sau khi khôi phục ZIP, các email cũ đang chờ được dừng để tránh gửi trạng thái từ dữ liệu đã thay thế.

## Nhận email tạo phiếu

1. Cấu hình một địa chỉ hỗ trợ trên cổng nhận thư của tổ chức. Đặt `INBOUND_MAIL_TOKEN` là chuỗi ngẫu nhiên tối thiểu 32 ký tự và `INBOUND_MAIL_CATEGORY_ID` là ID của loại phiếu đang dùng.
2. Cấu hình relay để xác thực người gửi rồi chuyển MIME gốc bằng `POST /api/v1/mail/inbound` qua HTTPS. Relay phải tự thiết lập `X-Verified-Sender` từ danh tính đã xác thực và gắn `Authorization: Bearer <INBOUND_MAIL_TOKEN>`. Xóa mọi header cùng tên do người gửi cung cấp. Body dùng `Content-Type: message/rfc822`, tối đa 256 KB.
3. Trạm Hỗ Trợ đối chiếu địa chỉ đã xác thực với `From` và tài khoản đang hoạt động. Tiêu đề và nội dung chữ trở thành phiếu trong danh mục đã chọn. Phiếu nhận mã, ưu tiên và SLA từ luồng tạo phiếu chung. Email tự động được bỏ qua. Message-ID giúp relay thử lại mà giữ một phiếu duy nhất.

Email đến hiện lấy nội dung chữ của thư. Tệp đính kèm có thể bổ sung qua trang phiếu. Việc nhận thư từ địa chỉ công khai phụ thuộc vào cấu hình cổng nhận thư của tổ chức.
