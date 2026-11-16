# Khung sườn Helpdesk

Khung sườn chạy thử gồm Danh mục, Người dùng và Ticket. Ba màn hình gọi API Express qua proxy Angular. Mỗi màn hình có danh sách, tạo, sửa, tìm kiếm, lọc, sắp xếp và phân trang. Người dùng và danh mục được vô hiệu hóa để giữ dữ liệu tham chiếu.

## Lệnh pnpm thường dùng

Từ thư mục `local/` (cha của `src/`):

| Lệnh | Việc |
| --- | --- |
| `pnpm typecheck:lint-frontend` / `pnpm typecheck:lint-backend` | Kiểm tra kiểu và lint |
| `pnpm build-frontend` / `pnpm build-backend` | Build frontend hoặc kiểm tra cú pháp backend |
| `pnpm re-build-frontend` / `pnpm re-build-backend` | Xóa cache/build cũ rồi build lại |
| `pnpm dev-frontend` / `pnpm dev-backend` | Chạy phát triển |

Trong từng gói cũng có `pnpm typecheck:lint`, `pnpm build`, `pnpm re-build`, `pnpm dev`.

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
pnpm dev
```

Mở địa chỉ Angular được in trong terminal. Proxy mặc định chuyển `/api` đến backend tại cổng 3000; nếu đổi cổng backend, sửa `proxy.conf.json`. Chế độ `DATA_SOURCE=demo` lưu dữ liệu trong bộ nhớ và mất khi khởi động lại.

Nếu pnpm báo `ERR_PNPM_IGNORED_BUILDS`, xem xét các build script bị chặn bằng `pnpm approve-builds` theo chính sách của máy rồi chạy lại cài đặt.

## Chuẩn bị MySQL

`.env.example` liệt kê thông số kết nối và `DATABASE_URL` cho Prisma.

**Cách khuyến nghị cho hai người (DBeaver / Navicat):** import một lần file [`backend/sql/helpdesk-schema.sql`](backend/sql/helpdesk-schema.sql). File tạo database `helpdesk`, toàn bộ bảng theo thiết kế, chỉ mục, FK và dữ liệu seed (mật khẩu tài khoản mẫu: `password`).

**Cách Prisma:** điền `DATABASE_URL`, rồi trong `backend/`:

```powershell
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Các file `sql/categories.sql` và `sql/users-tickets.sql` chỉ giữ tương thích tài liệu cũ; dùng `helpdesk-schema.sql` cho schema đầy đủ.

**Chưa thể sử dụng dữ liệu MySQL chỉ bằng cách cung cấp kết nối.** Với `DATA_SOURCE=mysql`, API hiện trả 503 có chủ ý: đăng nhập JWT, xác thực, phân quyền theo vai trò và các quy tắc nghiệp vụ còn chưa được triển khai. Hoàn thiện và kiểm thử các phần đó trước khi mở truy cập dữ liệu thật. Runtime hiện vẫn dùng `mysql2`; Prisma phục vụ migrate/seed. Server hiện chỉ lắng nghe localhost; mẫu này không dành cho production.

Trong demo, người dùng có một vai trò và người tạo ticket được chọn trên form. Ticket hỗ trợ phân công cho kỹ thuật viên đang hoạt động, chuyển trạng thái cơ bản và kiểm tra phiên bản khi cập nhật. Các API demo dùng chung PATCH để thử thao tác. Tổng quan và báo cáo lọc theo ngày tạo từ dữ liệu demo hiện có. Trang báo cáo có thể tải bảng tổng hợp dưới dạng CSV. Demo lưu lịch sử trạng thái và hỗ trợ tối đa 5 ảnh PNG, JPEG, GIF, WebP hoặc PDF với tổng dung lượng 50 MB mỗi ticket. Tệp ở thư mục tạm của tiến trình Express và chỉ truy cập được trong phiên demo. Khi triển khai theo hợp đồng chính thức, tách API phân công và chuyển trạng thái, lấy người tạo từ phiên, kiểm tra quyền và chuyên môn, ghi lịch sử và thông báo trong transaction. Repository MySQL cho người dùng và ticket, xác thực JWT, lịch sử nghiệp vụ đầy đủ, thông báo, lưu trữ tệp lâu dài và API thống kê cho dữ liệu thật vẫn là các phần cần triển khai. Không commit `.env` hoặc bí mật.
