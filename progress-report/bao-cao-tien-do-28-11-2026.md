# Báo cáo tiến độ đồ án ngày 28/11/2026

| Thông tin | Nội dung |
| --- | --- |
| Đề tài | Thiết kế website quản lý yêu cầu hỗ trợ kỹ thuật |
| Sản phẩm | Trạm Hỗ Trợ v0.3.0 |
| Học phần | Thực tập đồ án cơ sở ngành |
| Sinh viên thực hiện | Tô Quang Tường, MSSV 170124299, lớp DX24TT8016 |
| Giảng viên hướng dẫn | TS. Nguyễn Nhứt Lam |
| Đợt báo cáo | 24–28/11/2026 |

## 1. Mục tiêu

Hoàn thiện quy trình tiếp nhận, điều phối, xử lý và nghiệm thu phiếu hỗ trợ trên MySQL. Mỗi vai trò cần nhìn thấy đúng dữ liệu và thao tác được cấp quyền. Các màn hình theo dõi phiếu cần nhận thay đổi khi nhiều người làm việc cùng lúc.

## 2. Kết quả thực hiện

| Hạng mục | Kết quả tại mốc báo cáo |
| --- | --- |
| Xác thực và hồ sơ | Đăng nhập bằng email hoặc tên đăng nhập. Form đăng ký gồm họ tên, email, mật khẩu và xác nhận mật khẩu. Người dùng đặt tên đăng nhập trong hồ sơ. MySQL kiểm tra tính duy nhất và migration bổ sung tên cho tài khoản mẫu. |
| Tiếp nhận và phân quyền phiếu | Sau khi gửi, người dùng nhận thông báo thành công và vào trang chi tiết để theo dõi. Người gửi chỉ truy cập phiếu của mình và có 10 phút để sửa nội dung hoặc tệp. API giữ giới hạn này khi nhận yêu cầu cập nhật trực tiếp. |
| Điều phối và xử lý | Quản trị viên xem nhanh, chỉnh mức ưu tiên và phân công từ bảng điều phối. Gợi ý người phụ trách dựa trên chuyên môn và số phiếu đang xử lý. Chuyên viên đang phụ trách có thể chuyển phiếu cho chuyên viên phù hợp. |
| Nghiệm thu | Chuyên viên ghi nguyên nhân và giải pháp khi hoàn tất. Người gửi xác nhận đóng hoặc ghi lý do yêu cầu xử lý lại. Hệ thống giữ lịch sử và khóa gửi tin nhắn sau 24 giờ kể từ lần hoàn tất hoặc đóng gần nhất. |
| Thông báo và cập nhật dữ liệu | Phiếu mới tạo thông báo cho chủ sở hữu, quản trị viên và chuyên viên phù hợp danh mục. SSE cập nhật chuông thông báo, danh sách và bảng điều phối. Các bảng chính có nút tải lại. |
| Tổ chức, danh mục và SLA | Có cơ cấu đơn vị theo cây, quyền quản lý nhân sự, danh mục dịch vụ cha–con, giờ làm việc và thời hạn hỗ trợ. Chủ sở hữu có thể sửa đơn vị và xóa mềm đơn vị trống. |
| Hỗ trợ tự phục vụ và sao lưu | Kho hướng dẫn có bài công khai và bài nội bộ, gợi ý khi nhập tiêu đề phiếu và chèn liên kết vào chat. Sao lưu và khôi phục hỗ trợ dữ liệu nghiệp vụ, nội dung hướng dẫn và tệp đính kèm. |
| Giao diện và nhận diện | Màn hình đăng nhập có ảnh nền bầu trời, biểu tượng tai nghe và bố cục theo độ rộng màn hình. Logo mèo được dùng làm biểu tượng tab. Bảng nhiệm vụ dùng màu để phân biệt trạng thái. |

## 3. Kiểm chứng

| Phần kiểm tra | Kết quả |
| --- | --- |
| Frontend | Typecheck, định dạng và build thành công. Hai bài test Angular đều đạt. Build cảnh báo gói tải ban đầu khoảng 556 kB, vượt ngưỡng 500 kB. |
| Backend | Kiểm tra ESLint, cú pháp JavaScript và định nghĩa Prisma thành công. Sáu bài kiểm thử API mặc định đều đạt. |
| Docker Compose | Cấu hình phát triển và cấu hình máy chủ đều qua kiểm tra với các biến mẫu. |
| MySQL 8.4 trong Docker | Ba ca tích hợp đạt. Đã kiểm tra thông báo sau khi tạo phiếu, giới hạn sửa 10 phút, quyền sửa nội dung, chuyển người phụ trách, nghiệm thu và phạm vi truy cập. Đã xác minh đổi tên đăng nhập, từ chối tên trùng và đăng nhập bằng tên mới. |
| Microsoft Edge | Ba phiên độc lập xác nhận đăng nhập theo vai trò, thông báo sau khi tạo phiếu, cập nhật danh sách khi phiên khác tạo phiếu, mở phiếu từ hàng thông báo và phân công trên bảng điều phối. Chế độ sáng hiển thị khi Edge mô phỏng tùy chọn nền tối. |

Các ca kiểm tra dùng dữ liệu mẫu trên môi trường cục bộ. Kết quả triển khai trên máy chủ và hiển thị trực tiếp trên Cốc Cốc còn chờ xác nhận.

## 4. Trình diễn và công việc tiếp theo

1. Chạy `pnpm dev` và mở ứng dụng. Đăng nhập bằng `user` để gửi phiếu, sau đó theo dõi trạng thái trong trang chi tiết.
2. Đăng nhập bằng `admin` trong phiên riêng. Mở **Nhiệm vụ nhóm → Bảng điều phối phiếu**, xem thông báo mới và phân công từ cửa sổ xem nhanh.
3. Đăng nhập bằng `technical` để tiếp nhận, phản hồi và ghi nguyên nhân cùng giải pháp. Quay lại phiên người gửi để xác nhận đóng hoặc yêu cầu xử lý lại. [Cách chạy và tài khoản mẫu](../README.md#tài-khoản-mẫu)

Đợt tiếp theo sẽ xác nhận hành vi trên Cốc Cốc và môi trường máy chủ thử nghiệm, tối ưu kích thước gói tải ban đầu, đồng thời thiết kế quy tắc tự đóng và khảo sát CSAT. SSO và biểu mẫu động đang ở phạm vi nghiên cứu.
