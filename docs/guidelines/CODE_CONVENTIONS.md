# Quy chuẩn Mã nguồn & Vận hành (Code Conventions) — Trạm Hỗ Trợ

> **Nguồn đối chiếu:** `local/.ai/rules/source-code.md`, `local/.ai/rules/working-rules.md`, `local/src/backend/eslint.config.js`, `local/src/frontend/.prettierrc`.

---

## 1. Nguyên tắc Kiến trúc & Thiết kế Chung

* **SRP, DRY, KISS:** Tách biệt trách nhiệm rõ ràng, không nhân bản logic trùng lặp, không tự thêm các mẫu phức tạp không cần thiết (không dùng CQRS, Event Sourcing, Microservice hay DDD nặng nề).
* **Backend phân lớp:** Tuân thủ luồng `Route → Controller → Service → Repository → MySQL` (hoặc dùng factory `asyncResourceRoutes` cho các resource CRUD chuẩn). Tách riêng middleware cho validation (`validate.js`), xác thực (`auth.routes.js`), phân quyền (`permissions.js`) và xử lý lỗi (`error.js`).
* **Frontend tách lớp:** Tách giao diện (`.html` / `.ts`), `service`, `interface` (`*.types.ts`) và sử dụng Angular Dependency Injection (`inject()`).
* **Không xóa cứng dữ liệu có lịch sử:** Phiếu yêu cầu (`tickets`), tệp đính kèm (`ticket_attachments`), đơn vị tổ chức (`organization_units`) và bài viết KB (`knowledge_articles`) đều dùng cơ chế xóa mềm (`archived_at` hoặc `deleted_at`) hoặc tắt trạng thái (`is_active = false`).

---

## 2. Quy tắc Đặt tên & Định dạng

### 2.1. Tên File & Thư mục
* **Backend (Node.js ESM):** `kebab-case.js` theo vai trò hoặc module, ví dụ: `ticket-status.js`, `members.repository.js`, `category.validator.js`, `async-resource.routes.js`.
* **Frontend (Angular 22):** `kebab-case.ts` / `kebab-case.html` / `kebab-case.spec.ts` (không bắt buộc hậu tố `.component` ở các feature mới như `workspace.ts`, `quick-ticket.ts`, `knowledge-page.ts`).
* **Database (MySQL / Prisma):** Tên bảng và tên cột dùng `snake_case` (VD: `organization_units`, `display_code`, `created_at`). Khi trả về JSON DTO ở API, ánh xạ sang `camelCase` bằng SQL alias (`AS displayCode`, `AS createdAt`).

### 2.2. Tên Biến, Hàm, Class & Component
* **Biến & Hàm:** `camelCase` (VD: `estimatePriority`, `allocateMysqlCode`, `chatLocked`).
* **Class / Component / Interface / Type:** `PascalCase` (VD: `WorkspaceService`, `QuickTicket`, `TicketDetails`, `AppError`).
* **Enum & Hằng số nghiệp vụ:** `UPPER_SNAKE_CASE` cho giá trị enum (`OWNER`, `IN_PROGRESS`, `PENDING_CUSTOMER`, `PUBLIC`, `INTERNAL`).
* **Lint & Format:**
  * **Backend (ESLint 9, `ecmaVersion: 2024`, ESM):** Cấm biến không dùng (`no-unused-vars`, trừ tham số bắt đầu bằng `_`).
  * **Frontend (Prettier 3.8 + TypeScript strict):** `printWidth: 100`, `singleQuote: true`, parser `angular` cho `*.html`. Kiểm tra trước khi commit bằng `pnpm check`.

---

## 3. Quy chuẩn Tổ chức State & Xử lý Bất đồng bộ

### 3.1. Frontend (Angular 22)
* **State cục bộ & chia sẻ:** Dùng Angular Signals (`signal()`, `linkedSignal()`, `httpResource()`) thay cho `BehaviorSubject` ở các state đơn giản; dùng `inject()` thay cho constructor injection.
* **Hủy đăng ký RxJS:** Mọi `subscribe()` trong component phải gắn `takeUntilDestroyed(this.destroy)` hoặc chuyển sang `firstValueFrom()` trong hàm `async` có `try/catch/finally` để đặt lại cờ `saving`/`loading` và chống gọi trùng (`commentsRequestInFlight`).
* **Đa ngôn ngữ (i18n):** Không hard-code chuỗi hiển thị người dùng trực tiếp trong template; dùng pipe `| t` và khóa thông điệp trong `core/i18n/messages.json`, ánh xạ mã lỗi API qua `errorKey(error)`.

### 3.2. Backend (Express 5 + MySQL2)
* **Bất đồng bộ & Transaction:** Express 5 tự động bắt lỗi Promise reject từ `async` route handlers. Mọi thao tác ghi nhiều bảng hoặc cần nhất quán phải bọc trong `conn.beginTransaction()` → `try { ... await conn.commit(); } catch { await conn.rollback(); throw error; } finally { conn.release(); }`.
* **Chống Race Condition:** Dùng `SELECT ... FOR UPDATE` (hoặc `FOR UPDATE SKIP LOCKED` cho tác vụ nền) kết hợp khóa lạc quan `WHERE id = ? AND version = ?` trên `tickets` và `task_items`.
* **Validation & Error:** Mọi input từ `body`, `query`, `params` đều phải đi qua middleware `validate(zodSchema, target)` với `.strict()` để chặn trường lạ. Lỗi nghiệp vụ luôn ném `new AppError(status, code, message, details)`.

---

## 4. Quy tắc Bảo mật Cấu hình & Git Workflow (`local/`)

* **Bảo mật cấu hình:** Không hard-code mật khẩu, `JWT_SECRET` hoặc chuỗi kết nối DB; chỉ đọc qua `src/configs/env.js` và khai báo mẫu trong `.env.example`. Không commit `.env`, `node_modules/`, `dist/`, `.angular/`.
* **Phạm vi làm việc (`local/.ai/rules/working-rules.md`):**
  * Công việc phát triển hằng ngày chỉ thực hiện trong thư mục `local/` trên nhánh `local`.
  * Repository gốc và nhánh `master` chỉ dành cho báo cáo tiến độ/nộp bài khi được chủ dự án duyệt.
  * Kiểm tra `git status` và chạy `pnpm check` trước khi commit/push.
* **Quy ước Commit Message (khuyến nghị):** Sử dụng Conventional Commits ngắn gọn, rõ ràng theo phân hệ:
  * `feat(tickets): ...` — Thêm tính năng mới
  * `fix(auth): ...` — Sửa lỗi
  * `docs(specs): ...` — Cập nhật tài liệu kỹ thuật
  * `refactor(organizations): ...` — Tái cấu trúc mã nguồn không đổi hành vi
  * `test(sla): ...` — Bổ sung hoặc cập nhật kiểm thử
