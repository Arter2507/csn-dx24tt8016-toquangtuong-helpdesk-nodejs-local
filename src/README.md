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

## Khởi động cùng lúc

Sau khi cài thư viện cho hai gói, chạy `pnpm dev` từ thư mục gốc nhánh `local` để mở API và giao diện demo. Dùng `pnpm dev:mysql` sau khi cấu hình MySQL theo [README.local.md](../README.local.md).

## Chạy riêng từng phần ở chế độ demo

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

**Cách khuyến nghị cho hai người (DBeaver / Navicat):** import một lần file [`backend/sql/helpdesk-schema.sql`](backend/sql/helpdesk-schema.sql). File tạo database `tram_meo_helpdesk_db`, các bảng, chỉ mục, khóa ngoại và dữ liệu khởi tạo. Chọn phương án Prisma bên dưới nếu muốn nạp bộ ticket mẫu vào một database trống.

**Cách Prisma:** điền `DATABASE_URL`, rồi trong `backend/`:

```powershell
pnpm prisma:generate
pnpm exec prisma migrate deploy
# Dùng database trống để chạy dòng kế tiếp.
pnpm db:sample
```

Các file `sql/categories.sql` và `sql/users-tickets.sql` chỉ giữ tương thích tài liệu cũ; dùng `helpdesk-schema.sql` cho schema đầy đủ.

Với `DATA_SOURCE=mysql`, đặt `JWT_SECRET` ngẫu nhiên tối thiểu 32 byte và cấu hình `CORS_ORIGIN` theo địa chỉ frontend. Đăng nhập bằng tài khoản trong MySQL để sử dụng dữ liệu. Với database được quản lý bằng Prisma, chạy `pnpm exec prisma migrate deploy` trước khi khởi động để áp dụng migration chưa chạy. Runtime dùng `mysql2`. Prisma quản lý migration và seed.

Demo tiếp tục cho phép chọn tài khoản mẫu. Trong MySQL, server xác định người tạo từ phiên đăng nhập và giới hạn danh sách, chi tiết, trao đổi và tải tệp theo quyền. Tệp MySQL lưu trong `UPLOAD_DIR` của backend. Xem [hướng dẫn cấu hình](../README.local.md).
