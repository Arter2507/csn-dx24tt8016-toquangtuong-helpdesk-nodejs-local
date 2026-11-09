# Khung sườn Helpdesk

Khung sườn chạy thử gồm Danh mục, Người dùng và Ticket. Ba màn hình gọi API Express qua proxy Angular. Mỗi màn hình có danh sách, tạo, sửa, tìm kiếm, lọc, sắp xếp và phân trang. Người dùng và danh mục được vô hiệu hóa để giữ dữ liệu tham chiếu.

## Chạy mẫu không cần MySQL

Trong PowerShell 7, tại thư mục `local/src/backend`:

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm dev
```

Trong terminal khác tại `local/src/frontend`:

```powershell
pnpm install --frozen-lockfile
pnpm start
```

Mở địa chỉ Angular được in trong terminal. Proxy mặc định chuyển `/api` đến backend tại cổng 3000; nếu đổi cổng backend, sửa `proxy.conf.json`. Chế độ `DATA_SOURCE=demo` lưu dữ liệu trong bộ nhớ và mất khi khởi động lại.

Nếu pnpm báo `ERR_PNPM_IGNORED_BUILDS`, xem xét các build script bị chặn bằng `pnpm approve-builds` theo chính sách của máy rồi chạy lại cài đặt.

## Chuẩn bị MySQL

`.env.example` liệt kê thông số kết nối; tạo database riêng và áp dụng `backend/sql/categories.sql` cho bảng mẫu. Repository MySQL dùng truy vấn tham số hóa và chưa được kiểm thử với MySQL thực. Schema này chỉ bao gồm danh mục, không phải migration toàn bộ thiết kế.

**Chưa thể sử dụng dữ liệu MySQL chỉ bằng cách cung cấp kết nối.** Với `DATA_SOURCE=mysql`, API hiện trả 503 có chủ ý: đăng nhập JWT, xác thực, phân quyền theo vai trò và các quy tắc nghiệp vụ còn chưa được triển khai. Hoàn thiện và kiểm thử các phần đó trước khi mở truy cập dữ liệu thật. Server hiện chỉ lắng nghe localhost; mẫu này không dành cho production.

Sau bảng danh mục, có thể áp dụng `backend/sql/users-tickets.sql` để tạo các bảng người dùng, vai trò và ticket. SQL chưa được chạy với MySQL thực.

Trong demo, người dùng có một vai trò và người tạo ticket được chọn trên form. Ticket hỗ trợ phân công cho kỹ thuật viên đang hoạt động, chuyển trạng thái cơ bản và kiểm tra phiên bản khi cập nhật. Các API demo dùng chung PATCH để thử thao tác. Khi triển khai theo hợp đồng chính thức, tách API phân công và chuyển trạng thái, lấy người tạo từ phiên, kiểm tra quyền và chuyên môn, ghi lịch sử và thông báo trong transaction. Repository MySQL cho người dùng và ticket, xác thực JWT, lịch sử, thông báo, tệp đính kèm và thống kê vẫn là các phần cần triển khai. Không commit `.env` hoặc bí mật.
