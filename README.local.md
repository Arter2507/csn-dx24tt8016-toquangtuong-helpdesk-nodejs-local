# Trạm Mèo

**Có sự cố, có Mèo.** · **v0.2.0**

Website quản lý yêu cầu hỗ trợ kỹ thuật — Tô Quang Tường, DX24TT8016, hướng dẫn TS. Nguyễn Nhứt Lam. Repo cộng tác `-local`, nhánh `local`. Giới thiệu đồ án: [README.md](README.md).

## Yêu cầu môi trường

- PowerShell 7, Node.js (đã chạy với 26.13.0; Angular CLI nhận Node 22.22.3+, 24.15.0+ hoặc 26+), pnpm theo từng `package.json`
- MySQL 8 chỉ cần khi `DATA_SOURCE=mysql` (DBeaver / Navicat tùy chọn)

Clone repo cộng tác:

```powershell
git clone --branch local https://github.com/Arter2507/csn-dx24tt8016-toquangtuong-helpdesk-nodejs-local.git
Set-Location .\csn-dx24tt8016-toquangtuong-helpdesk-nodejs-local
```

## Cài đặt lần đầu

```powershell
Set-Location .\src\backend
pnpm install --frozen-lockfile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

Set-Location ..\frontend
pnpm install --frozen-lockfile
Set-Location ..\..
```

Nếu pnpm báo `ERR_PNPM_IGNORED_BUILDS`: frontend duyệt `@parcel/watcher`, `esbuild`; backend duyệt `@prisma/client`, `@prisma/engines`, `prisma`.

## Chạy nhanh (hai chế độ)

### A. Demo bộ nhớ

Sau khi cài thư viện ở bước trên, chạy một lệnh tại thư mục chứa `README.local.md`:

```powershell
pnpm dev
```

Lệnh khởi động API tại cổng 3000, đợi API lắng nghe rồi mở máy chủ giao diện tại [http://127.0.0.1:4200/](http://127.0.0.1:4200/). Nhấn Ctrl+C để dừng cả hai. Angular tự cập nhật khi sửa giao diện. Có thể chạy riêng `pnpm dev-backend` khi cần theo dõi và chạy lại API mỗi lần sửa backend. Khởi động lại API sẽ đưa dữ liệu demo về trạng thái ban đầu.

### B. MySQL

1. Trong `src/backend/.env`, điền `DB_*` và `DATABASE_URL` trỏ tới cùng database. Mã hóa URL ký tự đặc biệt trong mật khẩu khi đưa vào `DATABASE_URL`.
2. Đặt `JWT_SECRET` bằng chuỗi ngẫu nhiên ít nhất 32 byte và giữ riêng trên máy. Tạo chuỗi bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Đặt `CORS_ORIGIN=http://127.0.0.1:4200`.
3. Chạy migration và, nếu cần, nạp mẫu vào một database riêng chưa có dữ liệu.

```powershell
Set-Location .\src\backend
pnpm exec prisma migrate deploy
# Chỉ chạy dòng kế tiếp nếu database thử chưa có dữ liệu.
pnpm db:sample
Set-Location ..\..\
pnpm dev:mysql
```

Với database đã có dữ liệu, chạy lại `pnpm exec prisma migrate deploy` trong `src/backend` để thêm bảng hồ sơ và nhiệm vụ. Chỉ nạp bộ mẫu vào database thử trống.

Mở [http://127.0.0.1:4200/](http://127.0.0.1:4200/) để đăng nhập. Sau lần cấu hình đầu tiên, chỉ cần chạy `pnpm dev:mysql` từ thư mục gốc nhánh `local`.

Hoặc import tay bằng DBeaver/Navicat: [`src/backend/sql/helpdesk-sample-data.sql`](src/backend/sql/helpdesk-sample-data.sql) (chọn database thử trống đã được tạo cấu trúc bằng Prisma). Schema kèm dữ liệu khởi tạo một file: [`helpdesk-schema.sql`](src/backend/sql/helpdesk-schema.sql).

Tài khoản mẫu — mật khẩu `password`:

| Email | Vai trò |
| --- | --- |
| `user@example.test` | USER |
| `tech@example.test` | USER + TECHNICIAN |
| `admin@example.test` | USER + ADMIN |

Dữ liệu mẫu: 5 user, 4 danh mục, 5 ticket (NEW / IN_PROGRESS / RESOLVED / CLOSED).

## Lệnh pnpm từ thư mục gốc repo

| Lệnh | Việc |
| --- | --- |
| `pnpm dev` / `pnpm dev:mysql` | Khởi động cả API và giao diện theo chế độ đã chọn |
| `pnpm typecheck:lint-frontend` / `-backend` | Kiểm tra kiểu + lint |
| `pnpm build-frontend` / `build-backend` | Build UI / kiểm tra cú pháp API |
| `pnpm re-build-frontend` / `re-build-backend` | Xóa cache rồi build lại |
| `pnpm dev-frontend` / `dev-backend` | Chạy phát triển |

Trong từng gói cũng có `pnpm typecheck:lint`, `build`, `re-build`, `dev`. Backend thêm: `pnpm prisma:migrate`, `pnpm db:sample`, `pnpm prisma:studio`.

Gặp lỗi cổng: `Get-NetTCPConnection -LocalPort 3000,4200 -State Listen`. Kiểm tra API: [http://127.0.0.1:3000/api/v1/categories](http://127.0.0.1:3000/api/v1/categories).

## Tiến độ đến 23/11/2026

Bấm chuông để mở bảng xem nhanh. Thông báo mới xuất hiện dưới dạng toast khi web đang mở và tab hiển thị. Giao diện kiểm tra cập nhật mỗi 15 giây hoặc khi quay lại cửa sổ. Trong Cài đặt có thể bật/tắt toast và để nền sáng/tối theo thiết bị.

| Hạng mục | Trạng thái |
| --- | --- |
| UI ba vai trò, ticket, báo cáo, hồ sơ, i18n, Phase -1 | Demo chạy được trên web |
| Script pnpm typecheck / build / re-build / dev | Xong |
| MySQL schema, Prisma migration, seed/sample SQL | Xong (B1) |
| API categories / users / tickets đọc MySQL khi `DATA_SOURCE=mysql` | Xong khung CRUD |
| Đăng nhập và phiên MySQL | Đăng nhập, làm mới phiên, đăng xuất, hồ sơ, đổi mật khẩu và kiểm tra vai trò. |
| Xử lý yêu cầu MySQL | Phân công theo chuyên môn, phạm vi theo tài khoản, chuyển trạng thái, trao đổi, lịch sử và xóa mềm. |
| Tệp và thông báo MySQL | Tệp lưu trong `UPLOAD_DIR` của backend. Thông báo và trạng thái đã đọc lưu theo tài khoản. |
| Sao lưu | Tạo ZIP, tải xuống và khôi phục từ lịch sử. |
| Hồ sơ | Tab thông tin, vai trò, bảo mật và quản lý ảnh đại diện. Chỉ quản trị viên khác được đổi email. |
| Nhiệm vụ nhóm | Bảng kéo thả, lịch tháng, danh sách và phân công cho quản trị viên/chuyên viên. |

Xem [báo cáo tiến độ nội bộ ngày 23/11/2026](progress-report/bao-cao-tien-do-local-2026-11-23.md) và [bảng phân công](documents/markdown/tram-meo-tien-do-va-phan-cong.md).

### Thử nhanh trên web

1. **Người dùng → Tạo yêu cầu** (kéo thả tối đa 5 tệp, tổng 50 MB).
2. **Tổng quan → chưa phân công** → chọn kỹ thuật viên → **Đang xử lý**.
3. Mở **Hồ sơ** để thử các tab, tải ảnh và kiểm tra email ở chế độ chỉ đọc. Đổi email của tài khoản khác từ **Người dùng** bằng tài khoản quản trị.
4. Mở **Nhiệm vụ nhóm** bằng vai trò quản trị hoặc chuyên viên để tạo, phân công và chuyển trạng thái. Kiểm tra cùng nhiệm vụ trên **Lịch** và **Danh sách**.
5. Trên dữ liệu thử, tạo bản sao ở **Sao lưu**, sửa một nhiệm vụ rồi chọn **Khôi phục** để kiểm tra kết quả và bản dự phòng.

Với MySQL, ticket mẫu đã có sẵn sau `pnpm db:sample`; không mất khi restart API.

### Sao lưu và mức ưu tiên

- Vào **Sao lưu** bằng tài khoản quản trị để tạo bản sao thủ công, theo dõi tiến độ và tải ZIP từ lịch sử. Bản ZIP có `data.json` và nội dung tệp đính kèm. Thư mục `BACKUP_DIR` mặc định là `src/backend/backups/` khi chạy bằng pnpm. Cấu hình dùng thư mục riêng cho demo và từng cấu hình MySQL. Bản sao chứa dữ liệu nghiệp vụ, gồm cả mục đã lưu trữ, và loại trừ mật khẩu, phiên đăng nhập. Chọn **Khôi phục** ở một bản ZIP trong lịch sử và xác nhận. Máy chủ tạo bản dự phòng trước khi thay dữ liệu. MySQL giữ thông tin đăng nhập, email và quyền hiện tại, đồng thời yêu cầu các tài khoản được tham chiếu vẫn tồn tại.
- Bật **Sao lưu tự động** và lưu lịch 30 phút, 1 giờ, 3 giờ, 6 giờ hoặc 24 giờ. Nếu đến hạn, hệ thống khởi chạy khi quản trị viên mở web trong phiên đăng nhập. Trang kiểm tra lịch ngay khi mở và mỗi 30 giây. Sau khi khởi chạy, backend thực hiện công việc và lưu kết quả dù quản trị viên chuyển trang hoặc đóng tab.
- Tên và vai trò người gửi được lấy từ tài khoản đăng nhập. Chế độ demo dùng tài khoản của không gian đang xem hoặc tài khoản mặc định trong **Cài đặt**. Backend ước lượng mức ưu tiên từ tiêu đề và mô tả lúc tạo yêu cầu. Quản trị viên và chuyên viên phụ trách có thể sửa trên yêu cầu chưa đóng. Chỉnh cụm từ tại [priority-rules.json](src/backend/src/modules/tickets/priority-rules.json).

### Kiểm thử

Chạy `pnpm test` trong `src/backend` cho ca demo. Đặt `$env:HELPDESK_TEST_MYSQL='1'` trước lệnh để chạy thêm ca MySQL. Ca này dùng kết nối trong `.env`, tạo một schema thử riêng, chạy migration và dữ liệu mẫu rồi dọn schema thử. Tài khoản kết nối dùng trong ca kiểm thử cần quyền tạo và xóa schema thử.

23/11/2026: Đã chạy kiểm thử Angular, API demo và tích hợp MySQL. Bộ Playwright demo có 7 ca. Các lượt kiểm tra riêng trên Edge đã xác nhận ảnh đại diện, ba chế độ xem nhiệm vụ, kéo thả, tích hoàn thành và khôi phục từ lịch sử. Xem [báo cáo nội bộ](progress-report/bao-cao-tien-do-local-2026-11-23.md).

16/11/2026: Angular build OK; 2/2 test Angular; 5/5 test API; 5/5 Playwright. `typecheck:lint` frontend/backend và API MySQL (5 ticket) đã xác nhận. Xem [output/playwright/README.md](output/playwright/README.md).

## Tài liệu

- [Tiến độ và phân công](documents/markdown/tram-meo-tien-do-va-phan-cong.md) · [API](documents/markdown/api-contract-demo.md) · [CSDL](documents/markdown/database-demo.md)
- [Hướng dẫn kỹ thuật](src/README.md) · [Phase -1 UI](documents/Phase-1-Design-UI/)
- Quy tắc: [.ai/rules/working-rules.md](.ai/rules/working-rules.md) · [.ai/rules/source-code.md](.ai/rules/source-code.md)
- Không commit `.env`, `node_modules`, `dist`, `.angular`. Git LFS: `git lfs pull` nếu tài liệu chỉ hiện pointer.
