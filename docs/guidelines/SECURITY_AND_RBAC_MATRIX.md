# Ma trận Phân quyền & Bảo mật (Security & RBAC Matrix) — Trạm Mèo

> **Nguồn đối chiếu thực tế:** `local/src/backend/src/modules/organizations/permissions.js`, `local/src/backend/src/modules/tickets/ticket-access.js`, `local/src/backend/src/app.js`, `local/src/frontend/src/app/app.routes.ts`, `local/src/frontend/src/app/core/auth/session.ts`.

---

## 1. Hệ thống Vai trò & Trạng thái Tài khoản

| Trạng thái / Vai trò | Điều kiện xác định trong CSDL (`auth.repository.js`) | Ý nghĩa |
| :--- | :--- | :--- |
| **Guest** | Chưa có cookie hợp lệ | Chỉ truy cập trang đăng nhập, đăng ký, kích hoạt và KB `PUBLIC` |
| **`UNASSIGNED`** | `users.is_active = 1`, chưa có dòng trong `organization_members` | Đã đăng ký nhưng chờ `OWNER`/`ADMIN` cấp quyền vào tổ chức |
| **`USER`** | `organization_members.role = 'USER'` (rank 3) | Người dùng cuối gửi và theo dõi yêu cầu của chính mình |
| **`TECHNICIAN`** | `organization_members.role = 'TECHNICIAN'` (rank 2) | Chuyên viên xử lý phiếu được gán, xem KB nội bộ và nhiệm vụ nhóm |
| **`ADMIN`** | `organization_members.role = 'ADMIN'` (rank 1) | Quản trị viên điều phối phiếu, nhân sự cấp dưới, danh mục, SLA, KB |
| **`OWNER`** | `organization_members.role = 'OWNER'` (rank 0) | Chủ sở hữu tổ chức, toàn quyền hệ thống và sao lưu/khôi phục |

---

## 2. Ma trận Phân quyền Theo Tài nguyên & API (`DATA_SOURCE=mysql`)

Ký hiệu: **✅** Được phép · **🔒** Giới hạn theo sở hữu/phụ trách (Row-level) · **❌** Bị từ chối (`403 FORBIDDEN` / `401`)

| Tài nguyên / Thao tác | Guest | `UNASSIGNED` | `USER` | `TECHNICIAN` | `ADMIN` | `OWNER` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Xác thực & Hồ sơ cá nhân** | | | | | | |
| Đăng ký / Kích hoạt / Đăng nhập (`/auth/*`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem/Sửa tên & đổi mật khẩu (`/auth/me*`) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem/Sửa hồ sơ & Avatar (`/profile*`) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Tổ chức & Nhân sự** | | | | | | |
| Xem thông tin tổ chức & đơn vị (`GET /organizations*`) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Sửa tổ chức & Thêm/Sửa/Xóa đơn vị (`/organizations/units`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xem/Thêm/Sửa/Khóa/Mời lại nhân sự (`/users*`) | ❌ | ❌ | ❌ | ❌ | 🔒 *(Tech/User)* | 🔒 *(Admin trở xuống)* |
| Gán chuyên môn KTV (`PUT /users/:id/categories`) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xem danh bạ thu gọn (`GET /directory`) | ❌ | ❌ | 🔒 *(Liên quan ticket)* | 🔒 *(Liên quan ticket)* | ✅ | ✅ |
| **Danh mục, Quy tắc & SLA** | | | | | | |
| Xem danh mục (`GET /categories`) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Tạo/Sửa/Bật-tắt danh mục (`/categories*`) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Cấu hình quy tắc đánh số (`/settings/ticket-number-rules*`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xem/Sửa cấu hình SLA (`/settings/sla`) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Yêu cầu Hỗ trợ (Tickets)** | | | | | | |
| Tạo phiếu (`POST /tickets`) & Xem trước mã | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Xem danh sách & chi tiết phiếu (`GET /tickets*`) | ❌ | ❌ | 🔒 *(Của mình)* | 🔒 *(Của mình / Được gán)* | ✅ | ✅ |
| Sửa `title`, `description` | ❌ | ❌ | 🔒 *(Của mình)* | 🔒 *(Được gán)* | ✅ | ✅ |
| Sửa `priority` | ❌ | ❌ | ❌ | 🔒 *(Được gán)* | ✅ | ✅ |
| Phân công KTV / Đổi danh mục (`assignee`, `classification`, `batch`) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xóa mềm phiếu (`POST /tickets/archive`) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Chuyển `NEW → IN_PROGRESS → PENDING_CUSTOMER → RESOLVED` | ❌ | ❌ | ❌ | 🔒 *(Được gán)* | ✅ | ✅ |
| Chuyển `RESOLVED → CLOSED` hoặc mở lại `IN_PROGRESS` | ❌ | ❌ | 🔒 *(Người gửi)* | 🔒 *(Nếu là người gửi)* | 🔒 *(Nếu là người gửi)* | 🔒 *(Nếu là người gửi)* |
| Xem/Gửi bình luận công khai (`internal: false`) | ❌ | ❌ | 🔒 *(Của mình)* | 🔒 *(Của mình / Được gán)* | ✅ | ✅ |
| Xem/Gửi ghi chú nội bộ (`internal: true`) | ❌ | ❌ | ❌ | 🔒 *(Được gán)* | ✅ | ✅ |
| **Cơ sở tri thức, Nhiệm vụ, Thông báo & Sao lưu** | | | | | | |
| Xem bài viết KB `PUBLIC` (`/knowledge*`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem bài viết KB `INTERNAL` (`/knowledge*`) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Tạo/Sửa/Xóa bài viết KB (`/knowledge*`) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xem/Tạo/Sửa nhiệm vụ nhóm (`/tasks*`) | ❌ | ❌ | ❌ | 🔒 *(Người tạo / Được gán)* | ✅ | ✅ |
| Xem/Đọc thông báo & SSE (`/notifications*`) | ❌ | ❌ | 🔒 *(Của mình)* | 🔒 *(Của mình)* | 🔒 *(Của mình)* | 🔒 *(Của mình)* |
| Sao lưu, Lập lịch & Khôi phục (`/backups*`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Cơ chế Bảo vệ Route & Kiểm soát Truy cập Dữ liệu

### 3.1. Bảo vệ Route ở Frontend (`app.routes.ts` + `session.ts`)
* Guard `requireSession` được gắn cho toàn bộ `protectedRoutes` và `/pending-assignment`:
  1. Gọi `session.initialize()` để xác định `mode` (`mysql` hoặc `demo`) và tải `/api/v1/auth/me` (tự động `refresh()` nếu gặp `401`).
  2. Nếu chưa đăng nhập → chuyển hướng `/login`.
  3. Nếu `organizationId === null` (`UNASSIGNED`) → khóa ở `/pending-assignment`.
  4. Kiểm tra `route.data['access']` (`'OWNER'`, `'ADMIN'`, `'TECHNICIAN'`, `'USER'` hoặc mảng `['ADMIN', 'TECHNICIAN']`) qua `session.hasRole()`. Lưu ý: `OWNER` tự động thỏa mãn quyền `'ADMIN'`; nếu thiếu quyền → chuyển hướng về `session.home`.

### 3.2. Bảo vệ Route & Dữ liệu ở Backend (`app.js` + Repositories)
1. **Chuỗi Middleware Toàn cục (Chế độ `mysql`):**
   * Ngoại trừ `/api/v1/auth/mode`, `/api/v1/knowledge` (`GET`), và `/api/v1/mail/inbound` (dùng Bearer token riêng), tất cả API đều đi qua:
     `sameOrigin` → `/api/v1/auth` (public login/register/activate/refresh/logout) → `requireAccount` → `requireMember` (chặn `UNASSIGNED` bằng `403 ORGANIZATION_REQUIRED`).
   * Các router đặc quyền gắn thêm `requireAdmin` hoặc `requireOwner`.
2. **Kiểm soát Truy cập Cấp Dòng (Row-Level Security):**
   * **Tickets (`mysql.repository.js`):** Truy vấn `list` và `find` tự động thêm điều kiện `(requester_id = ? OR (? = 1 AND assignee_id = ?))` khi actor không phải `ADMIN`/`OWNER`.
   * **Comments (`comments.js`):** Người gửi (`USER`) bị lọc `c.is_internal = FALSE` khi đọc và bị từ chối `403` nếu gửi `internal: true`.
   * **Members (`members.repository.js`):** Mọi thao tác trên nhân sự đều đi qua `manageOrganization()` (khóa dòng `organizations FOR UPDATE` + kiểm tra lại quyền actor trong cùng transaction) và `manageableMember()` (kiểm tra `canManage(actor, member.role)`).
   * **Tasks (`task.routes.js`):** `TECHNICIAN` chỉ sửa được task do mình tạo (`createdBy`) hoặc được giao (`assigneeId`).
