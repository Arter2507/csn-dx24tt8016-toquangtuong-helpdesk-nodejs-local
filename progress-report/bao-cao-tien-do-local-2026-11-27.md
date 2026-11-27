# Báo cáo tiến độ Trạm Mèo ngày 27/11/2026

- **Sinh viên** Tô Quang Tường · **MSSV** DX24TT8016
- **Giảng viên hướng dẫn** TS. Nguyễn Nhứt Lam
- **Phạm vi** Phiên bản 0.2.0, nhánh `local` của kho cộng tác.

## Mục tiêu

Hoàn thiện luồng tiếp nhận, xử lý và xác nhận phiếu trên MySQL. Gắn Kho hướng dẫn với lúc người dùng tìm cách khắc phục sự cố và lúc chuyên viên trả lời. Cải thiện thao tác quản lý cơ cấu tổ chức và đồng bộ tài liệu kỹ thuật.

## Kết quả

| Hạng mục | Kết quả triển khai |
| --- | --- |
| Xử lý phiếu | Form sửa cập nhật tiêu đề, mô tả, mức ưu tiên và tệp theo quyền. Các nút trên chi tiết và cửa sổ xem nhanh xử lý phân công, tiếp nhận, yêu cầu bổ sung, hoàn tất, mở lại và đóng phiếu. Owner hoặc Admin chọn người phụ trách từ gợi ý dựa trên danh mục chuyên môn và khối lượng đang xử lý. Chuyên viên ghi giải pháp khi hoàn tất. Người gửi có thể đóng hoặc yêu cầu xử lý lại. |
| Xem nhanh | Bấm mã phiếu, tiêu đề hoặc **Xem** để đọc mô tả, trạng thái, mức ưu tiên, người gửi, người phụ trách và lịch sử gần đây. Phiếu đã đóng ẩn nút chỉnh sửa. |
| Chat hỗ trợ | Cuộc trao đổi gắn với từng phiếu. Tab đang hiển thị đọc tin nhắn mới mỗi 4 giây. Sau 24 giờ kể từ thời điểm hoàn tất hoặc đóng gần nhất, hệ thống khóa gửi ở cả API và giao diện. Mở lại phiếu đưa chat về trạng thái đang hoạt động. |
| Kho hướng dẫn | Tra cứu tiêu đề và nội dung theo danh mục. Khi nhập tiêu đề phiếu, hệ thống gợi ý bài công khai. Từ chat, chuyên viên chọn một bài để chèn tiêu đề và liên kết. Tài liệu nội bộ chỉ mở được với Owner, Admin và Technician. |
| Dashboard | Người dùng theo dõi phiếu của mình; chuyên viên dùng một dashboard với phiếu được giao, SLA và phiếu tự tạo; Owner/Admin dùng tổng quan quản trị. |
| Tổ chức | Chủ sở hữu sửa thông tin tổ chức. Owner/Admin thêm nhân sự, đổi vai trò hoặc khóa/mở khóa trong phạm vi quyền. Sơ đồ liên kết hỗ trợ kéo, thu phóng bằng nút hoặc cuộn chuột, điều hướng bằng phím mũi tên và đưa sơ đồ về vừa khung. |
| Đăng nhập và chạy local | Màn hình máy tính chia đôi với hình minh họa tràn viền. Màn hình nhỏ xếp hình trên form. Nút đăng xuất cùng chiều rộng với các mục còn lại trong menu. Angular trong Docker hiển thị cả địa chỉ `localhost` và `127.0.0.1` theo cổng cấu hình. |
| Các hạng mục tích hợp cùng đợt | Danh mục cha–con và lịch tính SLA liên kết với phiếu. SSE cập nhật chuông và thông báo trong ứng dụng. Có hàng đợi gửi email và webhook nhận email tạo phiếu. Mã frontend được tổ chức theo `core/`, `layout/`, `shared/` và từng module trong `features/`. |

## Kiểm chứng

| Phần kiểm tra | Kết quả |
| --- | --- |
| Frontend | Qua kiểm tra TypeScript, Prettier và 2 bài test Angular. Build thành công. |
| Backend | Qua ESLint, kiểm tra cú pháp 51 file JavaScript, kiểm tra Prisma schema và 6 bài test mặc định. |
| MySQL 8.4 trong Docker | 3 ca tích hợp đạt, bao gồm migration và dữ liệu thử, quy trình phiếu, lịch sử sửa, quyền xem bài nội bộ, khôi phục Kho hướng dẫn từ bản sao, khóa chat sau 24 giờ, tìm kiếm, thao tác theo lô và phân quyền tổ chức. |
| Terminal Docker | Xác nhận log `Local: http://localhost:4520/` và `Network: http://127.0.0.1:4520/` khi chạy trên cổng kiểm thử. Cổng mặc định là 4200. |
| Microsoft Edge | Đã kiểm tra đăng nhập ở chiều rộng 1.440 px và 390 px, độ rộng nút đăng xuất, dashboard theo vai trò, kéo và thu phóng sơ đồ, bài viết công khai, gợi ý khi nhập tiêu đề, xem nhanh sau phân công và gửi liên kết qua chat. Sau khi chuyên viên hoàn tất, người gửi thấy nút xác nhận và đóng phiếu ngay trong trang đang mở. |

## Phần cần theo dõi

- Gói tải ban đầu là 551,91 kB so với ngưỡng cảnh báo 500 kB của Angular. Build thành công.
- Lượt kiểm tra dùng MySQL trong Docker và dữ liệu riêng. SMTP và webhook cần cấu hình theo môi trường triển khai.
- Quyền xem theo phòng ban và định tuyến phiếu theo hàng đợi còn là hạng mục tiếp theo. Bản hiện tại tra cứu cơ cấu và giới hạn phạm vi phiếu theo người tạo, người phụ trách và vai trò quản trị.

## Chạy lại trên máy phát triển

Chạy `pnpm dev` từ thư mục chứa [package.json](../package.json) và mở [Trạm Mèo local](http://127.0.0.1:4200/). Docker áp dụng migration trước khi khởi động API. Cách dùng dữ liệu thử, tài khoản mẫu và các lệnh kiểm tra được ghi trong [README.local.md](../README.local.md).
