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
Copy-Item .env.example .env

Set-Location ..\frontend
pnpm install --frozen-lockfile
Set-Location ..\..
```

Nếu pnpm báo `ERR_PNPM_IGNORED_BUILDS`: frontend duyệt `@parcel/watcher`, `esbuild`; backend duyệt `@prisma/client`, `@prisma/engines`, `prisma`.

## Chạy nhanh (hai chế độ)

### A. Demo bộ nhớ (không cần MySQL)

Hai terminal tại thư mục chứa file này:

```powershell
# Terminal 1 — API
Set-Location .\src\backend
$env:DATA_SOURCE = 'demo'
$env:PORT = '3000'
pnpm dev

# Terminal 2 — UI
Set-Location .\src\frontend
Remove-Item Env:PORT -ErrorAction SilentlyContinue
pnpm dev
```

Mở [http://127.0.0.1:4200/](http://127.0.0.1:4200/). Proxy `/api` → `127.0.0.1:3000`. Khởi động lại Express sẽ làm mới ticket demo trong bộ nhớ.

### B. MySQL thật (đã migration + dữ liệu mẫu)

1. Điền `.env`: `DATA_SOURCE=mysql`, `DB_*`, `DATABASE_URL` (ký tự đặc biệt trong mật khẩu phải URL-encode). **Không commit `.env`.**
2. Tạo database trống (ví dụ `tram_meo_helpdesk_db`).
3. Trong `src/backend`:

```powershell
pnpm exec prisma migrate deploy
pnpm db:sample
$env:DATA_SOURCE = 'mysql'
$env:PORT = '3000'
pnpm dev
```

4. Terminal UI: `pnpm dev` trong `src/frontend` như trên.

Hoặc import tay bằng DBeaver/Navicat: [`src/backend/sql/helpdesk-sample-data.sql`](src/backend/sql/helpdesk-sample-data.sql) (sau khi đã có schema). Schema đầy đủ một file: [`helpdesk-schema.sql`](src/backend/sql/helpdesk-schema.sql).

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
| `pnpm typecheck:lint-frontend` / `-backend` | Kiểm tra kiểu + lint |
| `pnpm build-frontend` / `build-backend` | Build UI / kiểm tra cú pháp API |
| `pnpm re-build-frontend` / `re-build-backend` | Xóa cache rồi build lại |
| `pnpm dev-frontend` / `dev-backend` | Chạy phát triển |

Trong từng gói cũng có `pnpm typecheck:lint`, `build`, `re-build`, `dev`. Backend thêm: `pnpm prisma:migrate`, `pnpm db:sample`, `pnpm prisma:studio`.

Gặp lỗi cổng: `Get-NetTCPConnection -LocalPort 3000,4200 -State Listen`. Kiểm tra API: [http://127.0.0.1:3000/api/v1/categories](http://127.0.0.1:3000/api/v1/categories).

## Tiến độ đến 16/11/2026

| Hạng mục | Trạng thái |
| --- | --- |
| UI ba vai trò, ticket, báo cáo, hồ sơ, i18n, Phase -1 | Demo chạy được trên web |
| Script pnpm typecheck / build / re-build / dev | Xong |
| MySQL schema, Prisma migration, seed/sample SQL | Xong (B1) |
| API categories / users / tickets đọc MySQL khi `DATA_SOURCE=mysql` | Xong khung CRUD |
| Đăng nhập JWT, phân quyền thật, thông báo server, tệp dài hạn | Chưa (B2–B5) |

Chi tiết phân công: [tram-meo-tien-do-va-phan-cong.md](documents/markdown/tram-meo-tien-do-va-phan-cong.md).

### Thử nhanh trên web

1. **Người dùng → Tạo yêu cầu** (kéo thả tối đa 5 tệp, tổng 50 MB).
2. **Tổng quan → chưa phân công** → chọn kỹ thuật viên → **Đang xử lý**.
3. Dashboard chuyên viên / góc nhìn người gửi / timeline / **Báo cáo** + CSV.

Với MySQL, ticket mẫu đã có sẵn sau `pnpm db:sample`; không mất khi restart API.

### Kiểm thử

16/11/2026: Angular build OK; 2/2 test Angular; 5/5 test API; 5/5 Playwright. `typecheck:lint` frontend/backend và API MySQL (5 ticket) đã xác nhận. Xem [output/playwright/README.md](output/playwright/README.md).

## Tài liệu

- [Tiến độ và phân công](documents/markdown/tram-meo-tien-do-va-phan-cong.md) · [API](documents/markdown/api-contract-demo.md) · [CSDL](documents/markdown/database-demo.md)
- [Hướng dẫn kỹ thuật](src/README.md) · [Phase -1 UI](documents/Phase-1-Design-UI/)
- Quy tắc: [.ai/rules/working-rules.md](.ai/rules/working-rules.md) · [.ai/rules/source-code.md](.ai/rules/source-code.md)
- Không commit `.env`, `node_modules`, `dist`, `.angular`. Git LFS: `git lfs pull` nếu tài liệu chỉ hiện pointer.
