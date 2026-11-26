# Báo cáo tiến độ nội bộ Trạm Mèo ngày 23/11/2026

Mốc đối chiếu ngày 23/11. Xem [báo cáo hiện hành ngày 25/11/2026](bao-cao-tien-do-local-2026-11-25.md) để lấy lệnh chạy và tiến độ mới nhất.

Nhánh cộng tác `local`, phiên bản giao diện v0.2.0. Phạm vi báo cáo gồm cấu hình chạy cục bộ, chức năng đã triển khai và kết quả kiểm thử trên dữ liệu mẫu.

| Hạng mục | Kết quả | Kiểm chứng |
| --- | --- | --- |
| Môi trường | Một lệnh khởi động API và Angular. `pnpm dev` chạy demo, `pnpm dev:mysql` dùng cấu hình MySQL. | Đã thử cả hai lệnh và kiểm tra proxy. |
| Tài khoản và phân quyền | Đăng nhập, làm mới phiên, đăng xuất, đổi mật khẩu. Chuyên viên kiêm người gửi dùng cùng một tài khoản. | API kiểm tra quyền theo vai trò và theo yêu cầu. Đã thử đăng nhập ba vai trò trên Edge với schema riêng. |
| Yêu cầu hỗ trợ | Người gửi lấy từ phiên, ưu tiên theo quy tắc nội dung, quản trị viên và chuyên viên được giao có thể chỉnh. Có timeline, trao đổi, phân công theo chuyên môn, đính kèm và xóa mềm. | Đã thử luồng MySQL, từ tạo đến xác nhận hoàn thành và kiểm tra truy cập trái quyền. |
| Giao diện và thông báo | Logo mèo tam thể, bố cục rộng theo màn hình, menu từng dòng. Bảng chuông và trang thông báo dùng chung trạng thái đã đọc. Có toast và chế độ giao diện theo thiết bị. | Playwright trên Edge kiểm tra luồng demo, bảng chuông tại 320 px và bố cục sao lưu tại 1920 px. |
| Hồ sơ | Khung ảnh đại diện, thông tin tóm tắt và ba tab. Quản trị viên có thể đổi email của tài khoản khác từ trang Người dùng. | Đã thử tải lên, xem và tải ảnh trên Edge. Ca MySQL kiểm tra từ chối tự đổi email và cho phép quản trị viên đổi email người khác. |
| Nhiệm vụ nhóm | Bảng kéo thả giữa ba trạng thái, lịch tháng và danh sách. Có tạo nhiệm vụ, phân công, hạn và đánh dấu hoàn thành. | Đã thử trên Edge, đồng thời kiểm tra quyền, lưu trạng thái và phát hiện xung đột trên MySQL. |
| Sao lưu và khôi phục | Tạo ZIP thủ công hoặc theo lịch. Khôi phục từ lịch sử tạo một bản dự phòng trước khi thay dữ liệu. Khi dùng MySQL, giữ email, mật khẩu và quyền hiện tại. | Đã thử hoàn nguyên trạng thái nhiệm vụ trên Edge và khôi phục nhiệm vụ, hồ sơ trên schema MySQL riêng. |

## Công việc tiếp theo

- Nghiệm thu báo cáo và bộ lọc thống kê với bộ dữ liệu MySQL có kết quả đối chiếu.
- Kiểm tra luồng chính trên trình duyệt thứ hai và thiết bị thật. Chuẩn bị ảnh minh chứng và kịch bản trình bày.
- Kiểm thử sao lưu và khôi phục với dữ liệu lớn hơn. Luồng hiện tại khôi phục từ bản sao có trong lịch sử máy chủ.

[Hướng dẫn chạy](../README.local.md) · [Tiến độ và phân công](../documents/markdown/tram-meo-tien-do-va-phan-cong.md) · [API](../documents/markdown/api-contract-demo.md)
