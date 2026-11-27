# Nhiệm vụ thiết kế lại giao diện quản trị Trạm Mèo

Ngày cập nhật **26/11/2026** · Trạng thái **Đã triển khai và kiểm thử trên local** · Bản đối chiếu `f205d9d`.

Hai ảnh đầu ghi nhận lỗi bố cục ở Cài đặt chung và Quy tắc đánh số phiếu. Ba ảnh kế tiếp gợi ý cách thay đổi thanh thao tác của bảng khi chọn dòng. Ảnh cuối tham chiếu bảng cây cho cơ cấu tổ chức. Áp dụng các luồng thao tác này với màu sắc, kiểu chữ, biểu tượng, bố cục và nội dung của Trạm Mèo.

## Kết quả thực hiện

| Mã | Kết quả kiểm tra |
| --- | --- |
| UI-01 | Bốn nhóm Cài đặt chung xếp hai cột cân hàng khi đủ chỗ và một cột ở vùng nội dung hẹp. Edge kiểm tra ở 1440, 1280, 1024, 768 và 390 px, có thu gọn thanh bên và tải lại tùy chọn giao diện. |
| UI-02 | Chủ sở hữu lưu và đọc lại cả bốn quy tắc trong form từng dòng ở 390 và 1024 px. Form báo lỗi giá trị không hợp lệ và giữ bản nháp khi mô phỏng API từ chối lưu. Mốc 1024 px mô phỏng chiều rộng CSS của màn hình 1280 px khi zoom 125%. |
| UI-03 | Edge kiểm tra tìm trực tiếp theo mã một phần, lọc loại, cỡ trang, chọn 0/1/nhiều dòng, chặn gộp khác loại, đổi người phụ trách, gộp và xóa mềm qua menu. MySQL kiểm tra xung đột phiên bản. |
| UI-04 | Edge kiểm tra hủy xác nhận ở Danh mục, khóa và mở khóa Nhân sự, chặn Quản trị viên chọn Chủ sở hữu. API kiểm tra cả lô trước khi thay đổi và giữ tham chiếu phiếu sau khi ngưng sử dụng. |
| UI-05 | Bảng cây mở và thu gọn được bằng bàn phím. Tìm theo mã giữ các nhánh tổ tiên. Chủ sở hữu thêm đơn vị con và Quản trị viên xem cơ cấu. Giao diện ở 390 px giữ tên, mã và trạng thái. |
| IAM-02 | MySQL xác nhận phòng ban cũ trùng tên được gắn chung đơn vị và hồ sơ trống giữ trạng thái chưa gán. API chặn mã trùng, vòng lặp và việc gán mới vào đơn vị đã ngưng sử dụng. |
| UI-06 | Edge chạy bốn vai trò và lưu ảnh Cài đặt sáng/tối, form đánh số, cơ cấu và trạng thái chọn phiếu. Build, kiểm tra định dạng và kiểm thử MySQL đã qua. Bundle đầu khoảng 519 kB so với ngưỡng cảnh báo 500 kB. |

## Phân công

| Mã | Nhiệm vụ | Phụ trách đề xuất | Ưu tiên và phụ thuộc |
| --- | --- | --- | --- |
| UI-01 | Cân lại bố cục Cài đặt chung | Người 1 | Cao |
| UI-02 | Sửa bảng Quy tắc đánh số phiếu bị che nút lưu | Người 1, Người 2 kiểm tra API | Cao |
| UI-03 | Thiết kế trạng thái chọn dòng và thanh thao tác bảng phiếu | Người 1, Người 2 kiểm thử quyền | Cao |
| UI-04 | Áp dụng mẫu bảng cho Nhân sự và Danh mục loại phiếu | Người 1 làm UI, Người 2 bổ sung API | Sau UI-03 |
| UI-05 | Thiết kế bảng cây cho Cơ cấu tổ chức | Người 1 | Sau UI-01 |
| IAM-02 | Mô hình đơn vị trực thuộc và dữ liệu cây phòng ban | Người 2 | Sau khi chốt phạm vi đơn vị, song song UI-05 |
| UI-06 | Kiểm thử hồi quy và nghiệm thu hai chủ đề màu | Hai người | Sau UI-01 đến UI-05 |

## UI-01 · Cài đặt chung

- Giữ menu dọc, tiêu đề trang và nút chuyển về Cài đặt. Bố trí bốn nhóm **Ngôn ngữ**, **Chế độ màu**, **Thông báo** và **Tài khoản** theo hai cột trên màn hình đủ rộng. Các card cùng hàng cân chiều cao. Màn hình nhỏ chuyển về một cột.
- Thu gọn khoảng trống và thống nhất độ cao nút, nhãn checkbox, khoảng cách giữa icon và chữ. Mỗi lựa chọn áp dụng ngay và giữ lại khi tải trang.
- Nghiệm thu khi các nhóm thẳng hàng, chữ Việt và Anh không chồng nhau, menu dọc làm việc khi sidebar chính mở hoặc thu gọn và trang không cuộn ngang.

## UI-02 · Quy tắc đánh số phiếu

- Ưu tiên nhìn thấy loại phiếu, bản xem trước và thao tác lưu. Dùng cột ngắn cho số bắt đầu và độ dài mã. Khi không đủ chỗ, mở trình sửa theo dòng hoặc chuyển dòng đang sửa thành form xếp dọc.
- Giữ xem trước mã khi nhập. Báo lỗi cạnh trường tương ứng và giữ dữ liệu đã nhập khi API từ chối lưu. Sau khi lưu, tải lại và đối chiếu mã xem trước với quy tắc từ API.
- Nghiệm thu khi Owner có thể lưu từng loại ở 390 px và 1280 px với zoom 125%. Admin và các vai trò khác giữ đúng quyền hiện hành.

## UI-03 · Thanh công cụ và trạng thái chọn phiếu

| Trạng thái | Giao diện và hành vi |
| --- | --- |
| Chưa chọn dòng | Thanh gọn có tìm trực tiếp, bộ lọc và nút tạo phiếu. Tích chọn ở cột đầu. Số dòng mỗi trang và nút chuyển trang đặt cùng chân bảng. |
| Chọn một dòng | Tô nền nhẹ cho dòng đã chọn, hiện **Đã chọn 1** và **Bỏ chọn**. Hành động sửa hoặc xóa theo quyền của dòng. |
| Chọn nhiều dòng | Dùng chung vị trí thanh công cụ và hiện số đã chọn, **Bỏ chọn**, **Đổi người phụ trách**, **Gộp phiếu** và menu hành động bổ sung. Xóa mềm có xác nhận gồm số lượng phiếu. |
| Chọn sai điều kiện | Vô hiệu hóa thao tác cần cùng loại kèm lý do. Gộp còn cần cùng người gửi và một phiếu chính chưa đóng. Phiếu đã đóng không đổi được người phụ trách. |
| Đang xử lý hoặc lỗi | Khóa thao tác đang chạy, giữ lựa chọn khi lỗi để thử lại. Làm mới bảng sau khi thành công. |

- Checkbox đầu bảng chọn các dòng của trang hiện tại và có trạng thái chọn một phần. Xóa lựa chọn khi đổi bộ lọc hoặc trang để tránh tác động tới dòng đang ẩn. Giữ gợi ý mã một phần, bộ lọc trực tiếp và cỡ trang 5/10/20/50/100.
- Bảo toàn quyền theo vai trò và kiểm tra phía API. Luồng mới tái sử dụng xóa mềm, phân công và gộp hiện có. Nghiệm thu đủ ca chọn 0, 1, nhiều dòng, khác loại, xung đột phiên bản và dùng bàn phím.

## UI-04 · Nhân sự và Danh mục

- Dùng mẫu thanh công cụ và cột thao tác chung. Khi chọn hợp lệ, hiển thị **Sử dụng** hoặc **Ngưng sử dụng** cho danh mục, **Mở khóa** hoặc **Khóa tài khoản** cho nhân sự. Giữ tham chiếu tới bản ghi đã ngưng sử dụng trong lịch sử phiếu.
- API cần kiểm tra toàn bộ lựa chọn trước khi cập nhật. Owner quản lý từ Admin trở xuống. Admin chỉ quản lý Technician và User. Khi chọn lẫn tài khoản cấp trên hoặc ngang cấp, hiển thị lý do và giữ nguyên cả lô.
- Nghiệm thu thao tác từng dòng và nhiều dòng, chọn lẫn quyền, hủy xác nhận, thử lại khi lỗi và đăng nhập bằng tài khoản đã bị khóa.

## UI-05 · Bảng cây Cơ cấu tổ chức

- Thêm bảng cây có cột tên thụt cấp, mã, thuộc nhóm hoặc đơn vị, cấp và trạng thái. Dòng có nhánh dùng nút mở hoặc thu gọn với nhãn truy cập. Giữ tìm kiếm và bộ lọc trên cùng, trạng thái phân trang hoặc số kết quả ở chân bảng.
- Biểu diễn tổ chức, đơn vị và thành viên bằng quan hệ đang lưu. Hiển thị trạng thái ở dòng có dữ liệu trạng thái. Phần tìm kiếm giữ đường dẫn tổ tiên của kết quả để người xem hiểu cấp bậc. Giữ danh sách phân cấp, sơ đồ liên kết và bảng phân quyền để xem vai trò.
- Nghiệm thu khi có thể dùng bàn phím để mở, thu gọn và lọc cây. Nhãn dài có thể đọc đủ và trạng thái được diễn đạt bằng chữ. Với màn hình nhỏ, giữ tên và trạng thái dễ tiếp cận.

## IAM-02 · Dữ liệu đơn vị trực thuộc

- Thiết kế bảng đơn vị có mã, tên, trạng thái và quan hệ cha con, cùng phương án gán thành viên theo khóa. Xác định cách chuyển từ trường phòng ban dạng chữ trong hồ sơ.
- Chốt ràng buộc mã duy nhất trong tổ chức, cấm vòng lặp khi chuyển đơn vị và giữ lịch sử khi ngưng sử dụng. Khi API có dữ liệu đơn vị thật, nối bảng cây UI-05 vào nguồn này.

## UI-06 · Nghiệm thu

- So sánh trước và sau trên Edge ở 1440, 1280, 768 và 390 px, thêm ca zoom 125%. Chạy chế độ sáng/tối và VI/EN. Ghi hình các trạng thái chưa chọn, chọn một, chọn nhiều và mở/thu gọn cây bằng dữ liệu rà soát của Trạm Mèo.
- Thử Owner, Admin, Technician và User. Đối chiếu kết quả thao tác qua API và dữ liệu MySQL thử. Mỗi hạng mục hoàn thành khi tiêu chí đạt và có ảnh hoặc kết quả kiểm thử tương ứng.

[Báo cáo bản đối chiếu](../../progress-report/bao-cao-tien-do-local-2026-11-26.md) · [Phân công dự án](tram-meo-tien-do-va-phan-cong.md) · [Thiết kế IAM/RBAC](ke-hoach-iam-rbac.md)
