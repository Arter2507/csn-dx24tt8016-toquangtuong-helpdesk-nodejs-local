# Danh mục dịch vụ và thời hạn hỗ trợ

Ngày cập nhật **26/11/2026** · Nhánh `local`

| Mốc | Người 1 | Người 2 | Kết quả trong đợt này |
| --- | --- | --- | --- |
| Danh mục | Form danh mục cha và cây dịch vụ, đường dẫn trên phiếu | Migration, kiểm tra vòng lặp và trạng thái cây | Admin và Owner tự tạo hoặc chuyển danh mục con, hệ thống giữ nguyên ID và dữ liệu phiếu. |
| Lịch làm việc | Giao diện ca theo ngày và ngày nghỉ | Kiểm tra ca giao nhau và tính thời gian làm việc | Lịch dùng giờ Việt Nam. Có nhiều ca một ngày và bỏ qua ngày nghỉ đã nhập. |
| Quy tắc SLA | Giao diện mục tiêu và nhóm trong hồ sơ nhân sự | Lưu chính sách và gắn hai thời hạn trên phiếu | Hỗ trợ bốn mức ưu tiên và hai nhóm thời hạn. |
| Nghiệm thu | Đăng nhập, cây tổ chức, phiếu mới và khung SLA | MySQL, quyền, sao lưu và khôi phục | Dùng dữ liệu riêng khi kiểm tra các thao tác ghi. |

## Cách dùng

1. Vào **Danh mục → Loại phiếu**. Thêm hoặc sửa một loại rồi chọn **Danh mục cha**. Mở **Cây danh mục dịch vụ** để xem các cấp. Khi tạo phiếu, mỗi lựa chọn hiện đủ đường dẫn. Tìm hoặc lọc theo danh mục cha sẽ bao gồm phiếu ở các cấp con. Chuyên viên phụ trách danh mục cha cũng có thể nhận các phiếu thuộc danh mục con.
2. Trong **Cài đặt → Thời hạn hỗ trợ (SLA)**, kiểm tra ca làm việc theo tuần, thêm ngày nghỉ theo từng ngày rồi đặt số phút phản hồi và xử lý. Có thể chừa khoảng nghỉ giữa hai ca.
3. Khi cần chính sách VIP, bật mục riêng cho nhóm VIP và gán nhóm trong **Nhân sự → Sửa hồ sơ → Quyền và trạng thái truy cập**. Nhóm VIP dùng thời hạn tiêu chuẩn nếu cấu hình riêng đang tắt.
4. Bật **Áp dụng thời hạn cho phiếu mới** rồi lưu. Mở một phiếu mới đã gửi để xem hai thời hạn, tình trạng so với hạn và giờ Việt Nam.

## Quy tắc nghiệp vụ

- Hạn tính theo số phút làm việc kể từ lúc tạo phiếu, bỏ qua ngoài ca và ngày nghỉ. Mức Khẩn cấp dùng mã `URGENT` hiện có.
- Phản hồi đầu tiên là trao đổi công khai đầu tiên của nhân viên xử lý, khác người gửi. Hạn xử lý đối chiếu mốc chuyển sang Đã xử lý. Nếu phiếu được mở lại, mốc xử lý sẽ được ghi lại ở lần xử lý kế tiếp.
- Đổi lịch hoặc nhóm chỉ ảnh hưởng lần tính hạn tiếp theo. Khi quản trị viên hoặc chuyên viên có quyền đổi mức ưu tiên, hệ thống tính lại từ lúc tạo phiếu theo cấu hình đang bật. Phiếu tạo trước tính năng không được tự động gán hạn hàng loạt.
- Giữ SLA ở trạng thái tắt sau khi cài mới để quản trị viên kiểm tra lịch và mục tiêu trước khi áp dụng. Hạn tiếp tục chạy trong giờ làm việc khi phiếu ở trạng thái Chờ người gửi.
- Bản ZIP nghiệp vụ chứa cây danh mục, cấu hình lịch và SLA, các mốc trên phiếu. Thông tin nhóm trong hồ sơ nhân sự thuộc dữ liệu quản trị tổ chức đang dùng.

## Mở rộng tiếp theo

1. Báo cáo tỷ lệ đúng hạn theo tháng, loại phiếu và nhóm.
2. Thông báo trước hạn và điều phối phiếu sắp quá hạn.
3. Chốt với nhóm vận hành các trường hợp được tạm dừng SLA và kiểm thử trên môi trường nghiệm thu.
