# Công nghệ & Hướng dẫn Cài đặt — Trạm Hỗ Trợ

> **Nguồn đối chiếu:** `local/package.json`, `local/src/backend/package.json`, `local/src/frontend/package.json`, `local/docker/compose.yaml`, `local/docker/compose.prod.yaml`.

---

## 1. Ngăn xếp Công nghệ (Tech Stack)

### 1.1. Frontend (`local/src/frontend`)
| Thành phần | Công nghệ / Thư viện | Phiên bản (`package.json`) | Vai trò |
| :--- | :--- | :--- | :--- |
| Framework | **Angular** (`@angular/core`, `router`, `forms`, `common`) | `^22.2.0` | SPA Standalone Components, Signals, `httpResource` |
| Build & CLI | **@angular/cli**, **@angular/build** | `^22.2.5` | Biên dịch ứng dụng, dev server tích hợp Vite |
| Ngôn ngữ | **TypeScript** | `~6.0.2` | Kiểm tra kiểu tĩnh nghiêm ngặt (`strict`) |
| Reactive | **RxJS** | `~7.8.0` | Xử lý luồng HTTP, debounce tìm kiếm, interceptor |
| Biểu tượng | **bootstrap-icons** | `^1.13.2` | Bộ icon giao diện |
| Kiểm thử | **Vitest**, **jsdom** | `^5.0.0` / `^30.0.0` | Unit/component test |
| Định dạng | **Prettier** | `^3.8.1` | Format `.ts`, `.html`, `.css`, `.json` |

### 1.2. Backend (`local/src/backend`)
| Thành phần | Công nghệ / Thư viện | Phiên bản (`package.json`) | Vai trò |
| :--- | :--- | :--- | :--- |
| Runtime | **Node.js** (ES Modules `"type": "module"`) | Node 22+ (trong Docker) | Môi trường thực thi JavaScript phía máy chủ |
| Web Framework | **Express** | `^5.3.0` | REST API, routing, xử lý lỗi async tự động |
| Database Driver | **mysql2** | `^3.24.6` | Connection pool & truy vấn SQL tham số hóa, transaction |
| Schema & Migration | **Prisma** (`prisma`, `@prisma/client`) | `^6.19.0` | Quản lý `schema.prisma`, migrations và seed dữ liệu |
| Validation | **Zod** | `^4.6.7` | Kiểm tra & chuẩn hóa `body`, `query`, `params` |
| Xác thực & Bảo mật | **jose** (`^6.2.18`), **bcryptjs** (`^3.0.3`) | `^6.2.18` / `^3.0.3` | Ký/xác minh JWT (HS256) và băm mật khẩu (cost 12) |
| Upload tệp | **Multer** | `2.5.0` | Xử lý `multipart/form-data` (tệp đính kèm, avatar) |
| Email | **Nodemailer**, **Mailparser** | `^10.6.1` / `^3.15.0` | Gửi email thông báo trạng thái & phân tích RFC822 inbound |
| Nén / Giải nén | **yazl**, **yauzl** | `^3.3.1` / `^3.4.0` | Tạo và đọc tệp sao lưu `.zip` |
| Cấu hình | **dotenv** | `^18.0.9` | Nạp biến môi trường từ `.env` |
| Lint & Test | **ESLint** (`^9.39.1`), **node --test** | `^9.39.1` / built-in | Kiểm tra cú pháp, quy tắc mã nguồn và test tích hợp |

### 1.3. Cơ sở dữ liệu & Hạ tầng
| Thành phần | Công nghệ | Phiên bản / Ghi chú |
| :--- | :--- | :--- |
| Hệ quản trị CSDL | **MySQL** | `8.4` (`mysql:8.4` trong Docker Compose), bảng mã `utf8mb4` |
| Reverse Proxy (Prod) | **Caddy** | Phục vụ file tĩnh Angular, tự động HTTPS, reverse proxy `/api/*` |
| Containerization | **Docker** & **Docker Compose** | Điều phối qua `local/setup/docker.mjs` |
| Package Manager | **pnpm** | `12.16.1` (workspace gốc & backend), `12.8.1` (frontend) |

---

## 2. Môi trường Chạy (Development vs Production)

| Tiêu chí | Môi trường Development (`compose.yaml`) | Môi trường Production (`compose.prod.yaml`) |
| :--- | :--- | :--- |
| **Khởi chạy** | `pnpm dev` (tại `local/`) | `docker compose -f docker/compose.prod.yaml up -d --build` |
| **Frontend** | `ng serve` trên cổng `4200` (qua `proxy.docker.conf.json`) | Build tĩnh phục vụ bởi **Caddy** (`80`/`443` HTTPS) |
| **Backend** | `node --watch src/server.js` trên cổng `3000` | `node src/server.js` (cổng nội bộ `3000`, proxy qua Caddy) |
| **Live Reload** | Docker Compose `watch` đồng bộ `src/` và tự rebuild khi đổi `package.json` | Không bật watch; `restart: unless-stopped` |
| **Cookie & CORS** | `NODE_ENV=development`, cho phép `localhost` và `127.0.0.1` | `NODE_ENV=production`, bắt buộc `CORS_ORIGIN` là `https://...`, `secureCookies=true` |
| **Dữ liệu mẫu** | Tự nạp `MYSQL_SEED_SAMPLE=true` khi DB trống | `MYSQL_SEED_SAMPLE=false` (không nạp tài khoản/dữ liệu mẫu) |

---

## 3. Hướng dẫn Cài đặt & Khởi chạy

### 3.1. Chạy nhanh bằng Docker Compose (Khuyến nghị)
**Yêu cầu:** Đã cài Docker Desktop (hoặc Docker Engine + Compose), Node.js và `pnpm`.

```powershell
# Di chuyển vào thư mục local/
Set-Location .\local

# Khởi động toàn bộ stack (MySQL 8.4 + Backend + Frontend)
# Lệnh tự tạo docker/.env ở lần chạy đầu, chạy Prisma migration và seed dữ liệu mẫu
pnpm dev
```

* Truy cập giao diện web: `http://127.0.0.1:4200/`
* Kiểm tra API mode: `http://127.0.0.1:3000/api/v1/auth/mode`

**Các lệnh quản lý khác ở `local/`:**
| Lệnh | Tác dụng |
| :--- | :--- |
| `pnpm dev` | Khởi động môi trường phát triển Docker Compose (tên tương thích: `pnpm dev:mysql`) |
| `pnpm build` | Build image Docker cho cả `backend` và `frontend` |
| `pnpm check` | Chạy `typecheck:lint` cho cả Frontend và Backend bên trong Docker |
| `pnpm stop` | Dừng container, giữ nguyên volume dữ liệu |

### 3.2. Tài khoản Mẫu (Môi trường Dev / Seed)
Khi khởi tạo MySQL trống với `MYSQL_SEED_SAMPLE=true`, mật khẩu mặc định là `password`:
* `admin@example.test` — Vai trò `OWNER` (Chủ sở hữu tổ chức)
* `tech@example.test` — Vai trò `TECHNICIAN` (Chuyên viên kỹ thuật)
* `user@example.test` — Vai trò `USER` (Người gửi yêu cầu)

### 3.3. Chạy Thủ công (Không dùng Docker)
1. **Backend (`local/src/backend`):**
   * Sao chép `.env.example` thành `.env`, cấu hình `DATA_SOURCE=mysql` (hoặc `demo`), `DB_*`, `JWT_SECRET` (tối thiểu 32 byte cho MySQL).
   * Cài đặt & khởi tạo CSDL:
     ```powershell
     pnpm install
     pnpm prisma:generate
     pnpm prisma:deploy
     pnpm prisma:seed
     pnpm dev
     ```
2. **Frontend (`local/src/frontend`):**
   ```powershell
   pnpm install
   pnpm dev
   ```
   (Mặc định `proxy.conf.json` chuyển tiếp `/api/*` tới `http://127.0.0.1:3000`).

### 3.4. Lệnh Kiểm thử & Kiểm tra Chất lượng
* **Backend:** `pnpm --dir src/backend run typecheck:lint`, `pnpm --dir src/backend run build`, `pnpm --dir src/backend run test` (thêm `HELPDESK_TEST_MYSQL=1` nếu chạy test tích hợp MySQL).
* **Frontend:** `pnpm --dir src/frontend run typecheck:lint`, `pnpm --dir src/frontend run build`, `pnpm --dir src/frontend run test`.
* **E2E Playwright (`local/output/playwright`):** Có bộ kiểm thử Playwright kiểm tra các luồng giao diện chính.
