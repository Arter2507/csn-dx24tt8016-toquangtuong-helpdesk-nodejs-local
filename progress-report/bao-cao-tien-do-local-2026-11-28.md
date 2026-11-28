# Báo cáo tiến độ Trạm Hỗ Trợ ngày 28/11/2026

| Thông tin | Nội dung |
| --- | --- |
| Đề tài | Thiết kế website quản lý yêu cầu hỗ trợ kỹ thuật |
| Sinh viên | Tô Quang Tường, MSSV 170124299, lớp DX24TT8016 |
| Giảng viên hướng dẫn | TS. Nguyễn Nhứt Lam |
| Phạm vi | v1.3.0, nhánh `local` của kho cộng tác |

## Kết quả thực hiện

| Hạng mục | Kết quả |
| --- | --- |
| Trung tâm hỗ trợ | Khách có thể tìm hướng dẫn và FAQ công khai. Thành viên gửi và theo dõi phiếu cá nhân, xem lịch sử, phản hồi, mở lại hoặc đánh giá khi đóng phiếu. |
| Cổng quản lý | Có tổng quan quản trị, bàn làm việc kỹ thuật và thư mục phiếu theo loại, năm, tháng hoặc phòng ban người gửi. Thư mục mở đúng bộ lọc của bảng. Hai cổng dùng chung phiên đăng nhập, API và MySQL. |
| Giao diện | Menu bên trái nối liền với header ở bố cục màn hình rộng. Tám bộ màu có biến thể sáng và tối. Kính mờ hiển thị chín ảnh bầu trời xoay ngang cả ở nền và khung xem trước. Các bề mặt chính bán trong suốt để thấy ảnh nền. |
| Xác thực | Bổ sung đặt lại mật khẩu qua liên kết email dùng một lần, hết hạn sau 30 phút. Đổi mật khẩu thu hồi các phiên cũ. |
| Dữ liệu hướng dẫn | Môi trường phát triển nạp FAQ mẫu cho database đủ điều kiện khi bảng còn trống. Bài đã tạo hoặc lưu trữ được giữ. |
| Tài liệu | Cập nhật hướng dẫn khởi chạy, kiến trúc hai cổng, đường dẫn, quyền và kịch bản nghiệm thu. |

## Kiểm chứng

| Hạng mục | Kết quả |
| --- | --- |
| Giao diện trên Microsoft Edge | Playwright kiểm tra header nối liền với sidebar ở cả trạng thái mở và thu gọn. Chín ảnh tải thành công và hiển thị ngang. Kiểm tra bề mặt kính mờ ở chế độ sáng và tối, vùng hiển thị 1.440 × 900 px và 390 × 844 px, cùng khả năng ghi nhớ ảnh sau khi tải lại. |
| Luồng qua hai cổng | Kiểm tra tuyến tra cứu công khai, đăng nhập rồi trở lại biểu mẫu gửi phiếu, giới hạn truy cập của người dùng cuối, chuyển cổng của kỹ thuật viên và mở thư mục theo tháng hoặc phòng ban. |
| MySQL và email | Kiểm thử tích hợp xác nhận đánh giá khi đóng phiếu, bộ lọc thư mục theo quyền và đặt lại mật khẩu qua SMTP mô phỏng. Liên kết đã dùng bị từ chối và phiên cũ bị thu hồi. |
| Build | Qua kiểm tra TypeScript, Prettier và build Angular. Gói tải ban đầu khoảng 576 kB so với ngưỡng cảnh báo 500 kB. |

## Điều kiện vận hành

Chạy `pnpm dev` tại thư mục dự án để khởi động Angular, Express và MySQL. Gửi email đặt lại mật khẩu trên môi trường sử dụng cần SMTP của đơn vị triển khai. Xem [hướng dẫn chạy](../README.local.md) và [thiết kế v1.3.0](../documents/markdown/giao-dien-v1.3.0.md).
