# Trạm Mèo — chức năng, tiến độ và phân công

Cập nhật **16/11/2026** · Nhánh cộng tác `local` · Bản demo **v0.2.0**

## Chức năng hiện có

| Hạng mục | Phạm vi đã chạy được trong demo |
| --- | --- |
| Quản trị | Tổng quan toàn hệ thống, biểu đồ trạng thái, hàng đợi yêu cầu mới chưa phân công. |
| Chuyên viên | Công việc theo ngày cập nhật, lịch tuần, ghi chú lưu trên trình duyệt, lối tắt đến việc được giao. Một kỹ thuật viên có thể chuyển sang góc nhìn người gửi với cùng tài khoản mẫu. |
| Người dùng | Danh sách gửi hôm nay hoặc tuần này, năm yêu cầu mở ưu tiên cao nhất, mục chờ xác nhận, tạo yêu cầu và xem tiến độ. |
| Quản lý yêu cầu | Tìm kiếm, lọc, phân trang, sửa, phân công, chuyển trạng thái, timeline. Form hỗ trợ kéo thả tối đa 5 ảnh hoặc PDF, tổng 50 MB. Có xóa mềm từng dòng hoặc nhiều dòng, kèm xác nhận. Tệp đã gỡ được giữ thông tin lưu trữ trong phiên demo. |
| Người dùng và danh mục | Tạo, sửa, chọn **Bật sử dụng** hoặc **Ngưng sử dụng** ngay trên bảng. Yêu cầu cũ giữ liên kết và lịch sử. Yêu cầu mới dùng danh mục và tài khoản đang hoạt động. Hệ thống giữ ít nhất một quản trị viên hoạt động. |
| Báo cáo | Lọc theo ngày tạo, loại và trạng thái, biểu đồ, bảng tổng hợp và CSV. |
| Hồ sơ, cài đặt và thông báo | Sửa tên/email tài khoản mẫu, chọn giao diện, giảm chuyển động và ngôn ngữ, xem cập nhật của yêu cầu và đánh dấu đã đọc trên trình duyệt. |
| Sao lưu | Tải JSON chứa dữ liệu phiên demo, gồm dữ liệu lưu trữ và thông tin tệp. Nội dung tệp đính kèm cần một cơ chế sao lưu riêng khi triển khai lưu trữ lâu dài. |
| Giao diện | Thiết kế Phase -1, nhận diện Trạm Mèo, tiếng Việt/Anh qua một tệp JSON, sáng/tối, trạng thái tải, chuyển trang và animation sidebar. |

Express demo giữ dữ liệu trong bộ nhớ, tệp tại thư mục tạm. Đăng nhập, phân quyền thật, thông báo lưu máy chủ và phục hồi đang ở giai đoạn phát triển.

## Phân công cho hai người

Tên người phụ trách có thể điền sau. Mỗi đầu việc có một người chịu trách nhiệm chính để tránh trùng công sức. Dùng trạng thái **Chờ làm**, **Đang làm**, **Chờ kiểm tra** và **Xong** khi cập nhật tiến độ.

| Mã | Phụ trách | Việc còn lại | Điều kiện hoàn thành | Phụ thuộc |
| --- | --- | --- | --- | --- |
| A1 | Người 1 | Hoàn thiện UI và tài liệu sử dụng cho ba vai trò. Viết rõ trạng thái rỗng, tải, lỗi, không đủ quyền, thay đổi trạng thái và xóa mềm. Rà tiếng Việt/Anh, giao diện sáng/tối, bàn phím và màn hình hẹp. | Mỗi màn hình có điều hướng và phản hồi đầy đủ. Kiểm tra trên Edge desktop/mobile và một trình duyệt khác. | Có thể làm song song B1. |
| A2 | Người 1 | Tạo trang đăng nhập, đăng xuất và phục hồi phiên. Lấy vai trò hiện tại từ API, quản lý chuyển vai trò và trạng thái hết phiên. | Đăng nhập với ba vai trò, một tài khoản có hai vai trò, hết phiên và đăng xuất đều chạy qua API thật. | B2. |
| A3 | Người 1 | Hoàn thiện luồng ticket gồm phản hồi của người gửi, trao đổi, xác nhận kết quả, phân công theo quyền, tệp và timeline. Nối thông báo với dữ liệu máy chủ. | Chạy từ tạo đến phân công, xử lý, phản hồi, chốt yêu cầu. Thao tác trái quyền bị API từ chối và UI giải thích được. | B3, B4. |
| A4 | Người 1 | Nối dashboard, báo cáo, cấu hình tài khoản và sao lưu với API thật. Hiển thị kết quả và lỗi cho tác vụ sao lưu/phục hồi. Cập nhật bản dịch cho chức năng mới. | Các chỉ số khớp dữ liệu nguồn, bộ lọc và CSV nhất quán. Màn hình phục hồi báo rõ kết quả. | B2, B5. |
| A5 | Người 1 | Viết bộ kiểm thử Playwright cho luồng nghiệp vụ và kịch bản nghiệm thu. Chuẩn bị ảnh minh họa, tài liệu sử dụng, slide và kịch bản trình bày. | Kịch bản chạy lại được, có chứng cứ desktop/mobile và các bước demo giao cho người khác. | A2–A4, B6. |
| B1 | Người 2 | Viết migration và seed MySQL, ràng buộc và chỉ mục từ thiết kế dữ liệu. Tách cấu hình demo và MySQL. | Tạo được cơ sở dữ liệu trống bằng migration, nạp dữ liệu mẫu và chạy thử tính toàn vẹn. | Chốt ERD và hợp đồng dữ liệu với Người 1. |
| B2 | Người 2 | Hoàn thiện xác thực, phiên, phân quyền nhiều vai trò và phạm vi dữ liệu. Kết nối tài khoản, hồ sơ, danh mục và chuyên môn với MySQL. | Kiểm thử API quyền hợp lệ/trái quyền. Thành viên không xem được ticket của người khác. Tài khoản hoặc danh mục ngưng sử dụng vẫn hiện đúng trong lịch sử. | B1. |
| B3 | Người 2 | Hoàn thiện API ticket, phân công, kiểm tra chuyển trạng thái, trao đổi và lịch sử theo transaction. Triển khai xóa mềm và truy vấn loại dữ liệu đã lưu trữ. | Kiểm thử chuyển trạng thái, cập nhật đồng thời, quyền theo chủ sở hữu, phân trang và tính toàn vẹn khi xóa mềm. | B1, B2. |
| B4 | Người 2 | Lưu tệp đính kèm dài hạn có kiểm tra người truy cập và dung lượng. Lưu và truy vấn thông báo theo tài khoản, đồng bộ đã đọc. | Tệp tải lên/tải xuống đúng quyền, gỡ tệp giữ lịch sử. Thông báo còn sau khi tải lại và đổi trình duyệt. | B2, B3. |
| B5 | Người 2 | Thống kê trên MySQL, xuất dữ liệu, lập quy trình sao lưu/phục hồi gồm tệp đính kèm và audit. | Kiểm tra kết quả lọc bằng dữ liệu biết trước. Sao lưu và khôi phục thành công trên môi trường thử riêng. | B1, B3, B4. |
| B6 | Người 2 | Chuẩn hóa `.env.example`, tài liệu cài đặt, cách chạy kiểm thử và môi trường triển khai demo. Rà quyền, bí mật, log và kết nối MySQL. | Người 1 clone và chạy được theo tài liệu. Build, test API và kịch bản nghiệm thu chạy với cùng cấu hình đã ghi. | B2–B5. |

## Mốc bàn giao chung

1. **Chốt hợp đồng.** Hai người cập nhật chung route, payload, mã lỗi, ma trận quyền, trạng thái ticket và dữ liệu mẫu trước khi nối giao diện vào API MySQL.
2. **Tích hợp luồng cốt lõi.** Người 2 cung cấp xác thực và API theo hợp đồng. Người 1 nối các màn hình ưu tiên. Cả hai chạy thử người dùng tạo yêu cầu, quản trị phân công và kỹ thuật viên xử lý.
3. **Hoàn thiện dữ liệu và báo cáo.** Hai người đối chiếu lịch sử, tệp, thông báo, thống kê, sao lưu và phục hồi trên dữ liệu thử có thể kiểm tra lại.
4. **Nghiệm thu và nộp bài.** Người 1 chuẩn bị ảnh, slide và luồng trình bày. Người 2 chuẩn bị ERD, tài liệu API, hướng dẫn dựng môi trường và chứng cứ kiểm thử. Hai người rà chéo trước khi đồng bộ báo cáo theo quy trình dự án.

[Hướng dẫn chạy](../../README.local.md) · [Thiết kế API](api-contract-demo.md) · [Thiết kế CSDL](database-demo.md) · [Mẫu giao diện](../Phase-1-Design-UI/) · [Kiểm thử trình duyệt](../../output/playwright/README.md)
