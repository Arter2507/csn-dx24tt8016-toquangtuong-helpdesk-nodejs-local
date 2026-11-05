# Quy tắc làm việc với AI

- Công việc thường ngày chỉ thực hiện trong thư mục `local/` của dự án gốc, trên nhánh `local` của repository riêng tại đó. Kiểm tra `git rev-parse --show-toplevel`, nhánh và trạng thái trước khi sửa hoặc chạy lệnh Git.
- Repository gốc và nhánh `master` dành cho báo cáo tiến độ và nộp bài của riêng chủ dự án. Chỉ đồng bộ, merge hoặc push lên `master` khi người dùng duyệt và yêu cầu push cho lần báo cáo đó. Không tự ý cấp quyền cộng tác vào repository gốc.
- Repository có hậu tố `-local` là repository công khai để làm việc với partner; người khác có thể fork và gửi pull request. Quyền ghi trực tiếp chỉ cấp theo chỉ định của chủ repository.
- Khi push repository `-local`, đồng bộ đầy đủ các thư mục dự án, bao gồm `documents/` và `.ai/`, cùng `README.local.md`. Khi báo cáo lên repository gốc, đồng bộ `docker/`, `progress-report/`, `setup/`, `soft/`, `src/`, `thesis/` và `README.md`. Kiểm tra khác biệt và xóa có chủ ý trước khi đồng bộ; không ghi đè công việc chưa được kiểm tra. Git không lưu thư mục rỗng.
- `documents/`, `README.local.md` và `.ai/` được commit và push vào repository `-local` công khai, nhưng không đưa vào repository báo cáo gốc. `local/` phải được bỏ qua trong Git của dự án gốc.
- Không commit dependencies, secrets, cấu hình môi trường riêng hoặc sản phẩm build. Kiểm tra `git status` và nội dung staged trước mỗi commit/push.
- Dùng Git LFS cho file nhị phân lớn phù hợp với cấu hình `.gitattributes`; kiểm tra giới hạn và dung lượng LFS của GitHub. Tài liệu phù hợp trong `documents/` cũng được lưu bằng LFS và công khai trên repository `-local`.
- Đọc `README.local.md`, `README.md`, tài liệu liên quan trong `documents/` và các quy tắc trong `.ai/` trước khi làm việc; xác minh lại thông tin khi cần. Không coi chức năng dự kiến là chức năng đã hoàn thành.

