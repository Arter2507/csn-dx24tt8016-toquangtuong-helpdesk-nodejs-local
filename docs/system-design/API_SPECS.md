# Đặc tả REST API (`/api/v1`) — Trạm Mèo

> **Nguồn đối chiếu:** `local/src/backend/src/app.js` và toàn bộ route files trong `local/src/backend/src/modules/*`.

---

## 1. Quy ước Chung

* **Base URL:** `/api/v1`
* **Xác thực (Chế độ `mysql`):** Sử dụng Cookie `HttpOnly` (`tram_meo_access` JWT 15p và `tram_meo_refresh` 64-hex). Mọi request ghi (`POST`, `PUT`, `PATCH`, `DELETE`) bắt buộc có header `Origin` khớp `CORS_ORIGIN`.
* **Định dạng Phản hồi Thành công:**
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": null
  }
  ```
  *(Với API phân trang danh sách, `meta` chứa `{ "page": 1, "pageSize": 20, "totalItems": 100, "totalPages": 5 }`)*.
* **Định dạng Phản hồi Lỗi:**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Dữ liệu không hợp lệ",
      "details": []
    },
    "requestId": "uuid-v4"
  }
  ```

---

## 2. Danh sách Endpoints Chi tiết

### 2.1. Xác thực & Tài khoản (`/api/v1/auth`)
| Method | Endpoint | Auth / Role | Request Body / Query | Response / Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/auth/mode` | Public | — | `200` `{ data: "mysql" \| "demo" }` |
| `POST` | `/auth/register` | Public | `{ email, fullName, password (>=12) }` | `201` `{ data: { status: "UNASSIGNED" } }` |
| `POST` | `/auth/activate` | Public | `{ token (64 hex), password (>=12) }` | `204 No Content` |
| `POST` | `/auth/login` | Public | `{ email, password }` | `200` Account + Set Cookies |
| `POST` | `/auth/refresh` | Cookie Refresh | — | `200` Account + Rotate Cookies |
| `POST` | `/auth/logout` | Cookie | — | `204` Revoke session & Clear Cookies |
| `GET` | `/auth/me` | `requireAccount` | — | `200` Account (gồm `UNASSIGNED`) |
| `PATCH` | `/auth/me` | `requireAccount` | `{ fullName, email (khớp email hiện tại) }` | `200` Account |
| `PATCH` | `/auth/me/password` | `requireAccount` | `{ currentPassword, newPassword (>=12) }` | `204` & Clear Cookies |

### 2.2. Tổ chức, Đơn vị & Nhân sự (`/api/v1/organizations`, `/api/v1/users`)
*(Yêu cầu `requireAccount` + `requireMember` + `requireAdmin`, riêng chỉnh tổ chức/đơn vị yêu cầu `requireOwner`)*.

| Method | Endpoint | Role tối thiểu | Mô tả & Payload | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/organizations` | `ADMIN` | Lấy thông tin tổ chức hiện tại | `200` |
| `PUT` | `/organizations` | `OWNER` | Cập nhật `{ name, code, description }` | `200` |
| `GET` | `/organizations/units` | `ADMIN` | Danh sách đơn vị chưa xóa mềm | `200` |
| `POST` | `/organizations/units` | `OWNER` | Tạo đơn vị `{ name, code, parentId, isActive }` | `201` |
| `PUT` | `/organizations/units/:id` | `OWNER` | Sửa đơn vị `{ name, code, parentId, isActive }` | `200` |
| `DELETE` | `/organizations/units/:id` | `OWNER` | Xóa mềm đơn vị trống | `204` |
| `GET` | `/users` | `ADMIN` | Danh sách nhân sự (`search`, `filter` role, `status`, phân trang) | `200` |
| `GET` | `/users/:id` | `ADMIN` | Chi tiết nhân sự | `200` |
| `POST` | `/users` | `ADMIN` | Thêm nhân sự (chỉ role thấp hơn actor); trả kèm `invitation` nếu user mới | `201` |
| `PATCH` | `/users/:id` | `ADMIN` | Cập nhật thông tin, role, `isActive`, `unitId`, `customerTier` | `200` |
| `PATCH` | `/users/batch-state` | `ADMIN` | Khóa/mở khóa hàng loạt `{ ids: number[], isActive: boolean }` | `200` |
| `POST` | `/users/:id/invitation` | `ADMIN` | Cấp lại liên kết kích hoạt 24h | `200` |
| `GET` / `POST` | `/users/:id/avatar` | `ADMIN` | Lấy hoặc tải lên avatar nhân sự (`multipart` field `avatar`, ≤ 2 MB) | `200` / `204` |
| `GET` / `PUT` | `/users/:id/categories` | `ADMIN` | Xem / gán chuyên môn `{ categoryIds: number[] }` cho `TECHNICIAN` | `200` |

### 2.3. Hồ sơ cá nhân & Danh bạ (`/api/v1/profile`, `/api/v1/directory`)
| Method | Endpoint | Auth / Role | Mô tả & Payload | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/directory` | `ACTIVE` Member | Danh bạ thu gọn (lọc theo phạm vi ticket của User/Tech) | `200` |
| `GET` | `/profile` | `ACTIVE` Member | Lấy hồ sơ cá nhân + `details` JSON | `200` |
| `PATCH` | `/profile` | `ACTIVE` Member | Cập nhật `{ fullName, phone, department, jobTitle, location, birthDate, bio }` | `200` |
| `GET` / `POST` | `/profile/avatar` | `ACTIVE` Member | Tải ảnh đại diện (`?download=1` để tải file) / Upload (`avatar`, ≤ 2 MB) | `200` / `204` |

### 2.4. Danh mục Dịch vụ & Cài đặt (`/api/v1/categories`, `/api/v1/settings/*`)
| Method | Endpoint | Auth / Role | Mô tả & Payload | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/categories` | `ACTIVE` Member | Danh sách danh mục (`search`, `isActive`, `page`, `pageSize`, `sortBy`, `sortOrder`) | `200` |
| `GET` | `/categories/:id` | `ACTIVE` Member | Chi tiết danh mục | `200` |
| `POST` | `/categories` | `ADMIN` | Tạo `{ code, name, parentId }` | `201` |
| `PATCH` | `/categories/:id` | `ADMIN` | Sửa `{ name?, isActive?, parentId? }` | `200` |
| `PATCH` | `/categories/batch-state` | `ADMIN` | Bật/tắt hàng loạt `{ ids, isActive }` | `200` |
| `GET` | `/settings/ticket-number-rules` | `OWNER` | Danh sách quy tắc đánh số theo loại phiếu | `200` |
| `PUT` | `/settings/ticket-number-rules/:id` | `OWNER` | Cập nhật `{ prefix, nextNumber, digits, suffix }` | `204` |
| `GET` / `PUT` | `/settings/sla` | `ADMIN` | Đọc / cập nhật chính sách SLA (`enabled`, `week`, `holidays`, `rules`) | `200` |

### 2.5. Yêu cầu Hỗ trợ (Tickets) (`/api/v1/tickets`)
| Method | Endpoint | Auth / Role | Mô tả & Payload | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/tickets/number-preview` | `ACTIVE` Member | Query `?categoryId=...` → `{ code }` | `200` |
| `GET` | `/tickets/technicians` | `ADMIN` | Query `?categoryId=...` → Gợi ý KTV phù hợp | `200` |
| `GET` | `/tickets` | `ACTIVE` Member | Danh sách phiếu (lọc `search`, `filter` status, `priority`, `categoryId`, `createdOn`, `requesterId`, `assigneeId`) | `200` |
| `GET` | `/tickets/:id` | Owner/Tech/Admin | Chi tiết phiếu (kèm `attachments`, `history`, `chatExpiresAt`, `mergedInto`/`mergedTickets`) | `200` |
| `POST` | `/tickets` | `ACTIVE` Member | Tạo phiếu: JSON hoặc `multipart/form-data` (`ticket` JSON + tối đa 5 `attachments` ≤ 50 MB) | `201` |
| `PATCH` | `/tickets/:id` | Owner/Tech/Admin | Sửa `{ title?, description?, priority?, removeAttachments?, version }` | `200` |
| `PUT` | `/tickets/:id/assignee` | `ADMIN` | Phân công `{ assigneeId (nullable), version }` | `200` |
| `PUT` | `/tickets/:id/classification` | `ADMIN` | Đổi loại & KTV `{ categoryId, assigneeId, version }` | `200` |
| `POST` | `/tickets/:id/transitions` | Owner/Tech/Admin | Chuyển trạng thái `{ toStatus, note?, version }` | `200` |
| `GET` | `/tickets/:id/history` | Owner/Tech/Admin | Lịch sử tối đa 100 sự kiện gần nhất | `200` |
| `POST` | `/tickets/batch` | `ADMIN` | `{ selection: [{ id, version }...], update: { assigneeId } \| { targetId } }` | `200` |
| `POST` | `/tickets/archive` | `ADMIN` | Xóa mềm `{ ids: number[] }` | `200` |
| `GET` | `/tickets/:ticketId/attachments/:attachmentId` | Owner/Tech/Admin | Tải/xem tệp đính kèm | `200` |
| `GET` | `/tickets/:ticketId/comments` | Owner/Tech/Admin | Lấy tối đa 100 bình luận (lọc `is_internal` nếu là `USER`) + `meta` chat | `200` |
| `POST` | `/tickets/:ticketId/comments` | Owner/Tech/Admin | Gửi `{ body, internal }` (chặn nếu quá 24h hoặc chứa link KB `INTERNAL`) | `201` |

### 2.6. Cơ sở Tri thức, Thông báo, Nhiệm vụ, Mail & Sao lưu
| Method | Endpoint | Auth / Role | Mô tả | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/knowledge` | Public / Staff | Tìm kiếm bài viết (`q`, `categoryId`, `publicOnly`, `limit`, `before`) | `200` |
| `GET` | `/knowledge/categories` | Public | Danh sách danh mục đang hoạt động | `200` |
| `GET` | `/knowledge/:id` | Public / Staff | Chi tiết bài viết (`INTERNAL` chỉ cho Staff) | `200` |
| `POST` / `PUT` / `DELETE` | `/knowledge` & `/knowledge/:id` | `ADMIN` | Tạo / cập nhật / xóa mềm bài viết KB | `201`/`200`/`204` |
| `GET` | `/notifications/stream` | `ACTIVE` Member | Kết nối SSE nhận sự kiện `event: inbox` | `200` |
| `GET` | `/notifications` | `ACTIVE` Member | Lấy tối đa 100 thông báo của tài khoản | `200` |
| `PATCH` | `/notifications/read` | `ACTIVE` Member | Đánh dấu đã đọc `{ ids: number[] }` | `204` |
| `GET` / `POST` / `PATCH` | `/tasks` & `/tasks/:id` | `ADMIN` / `TECHNICIAN` | Quản lý nhiệm vụ nhóm (cần `version` khi `PATCH`) | `200` / `201` |
| `POST` | `/mail/inbound` | Bearer `INBOUND_MAIL_TOKEN` | Nhận email `message/rfc822` tạo ticket tự động | `202` / `204` |
| `GET` / `POST` | `/backups` | `OWNER` | Lịch sử sao lưu & tạo bản sao lưu thủ công | `200` / `202` |
| `PUT` / `POST` | `/backups/schedule` & `/check` | `OWNER` | Lưu lịch tự động & kiểm tra kích hoạt | `200` / `202` / `204` |
| `GET` / `POST` | `/backups/:id/download` & `/restore` | `OWNER` | Tải tệp ZIP / Khôi phục dữ liệu (`{ confirmed: true }`) | `200` |
| `GET` | `/backups/snapshot` | `OWNER` | Xuất JSON snapshot `users`, `tickets`, `categories` | `200` |

---

## 3. Bảng Mã Lỗi Chuẩn (`error.code`)

| HTTP Status | `error.code` | Ngữ cảnh phát sinh |
| :---: | :--- | :--- |
| `400` | `BAD_REQUEST` / `INVALID_UPLOAD` | JSON body sai cú pháp hoặc không đọc được dữ liệu upload |
| `401` | `UNAUTHENTICATED` / `INVALID_CREDENTIALS` | Chưa đăng nhập, token hết hạn, sai mật khẩu hoặc sai `INBOUND_MAIL_TOKEN` |
| `403` | `FORBIDDEN` / `ORGANIZATION_REQUIRED` | Sai `Origin`, không đủ quyền vai trò hoặc tài khoản ở trạng thái `UNASSIGNED` |
| `404` | `NOT_FOUND` / `RECORD_MISSING` | Không tìm thấy tài nguyên hoặc API endpoint |
| `409` | `CONFLICT` / `CHAT_EXPIRED` / `MEMBER_DUPLICATE` / `UNIT_CODE_DUPLICATE` / `UNIT_IN_USE` / `TICKET_NUMBER_EXHAUSTED` | Xung đột `version`/trạng thái, chat quá hạn 24h, trùng email/mã NV/mã đơn vị, đơn vị đang dùng, cạn dãy số |
| `413` | `ATTACHMENT_SIZE` / `INVALID_UPLOAD` | Tệp đính kèm vượt quá 50 MB |
| `422` | `VALIDATION_ERROR` / `NOTE_REQUIRED` / `INVALID_ASSIGNEE` / `INVALID_CATEGORY` / `INVALID_REQUESTER` / `INVALID_FILE_TYPE` / `ATTACHMENT_COUNT` / `AVATAR_INVALID` / `INVITATION_INVALID` / `UNIT_UNAVAILABLE` / `UNIT_CYCLE` / `BATCH_CATEGORY` / `BATCH_TARGET` / `BATCH_REQUESTER` / `BATCH_CLOSED` / `KB_INTERNAL_LINK` / `MAIL_SENDER_UNVERIFIED` | Dữ liệu không qua Zod schema hoặc vi phạm ràng buộc nghiệp vụ (thiếu note chuyển trạng thái, link KB nội bộ trong chat công khai, gộp phiếu khác loại/người gửi...) |
| `429` | `LOGIN_LIMIT` | Vượt quá giới hạn thử đăng nhập / đăng ký / kích hoạt |
| `503` | `MAINTENANCE` *(từ `maintenance.js`)* | Hệ thống đang khóa ghi tạm thời để khôi phục sao lưu |
| `500` | `INTERNAL_ERROR` | Lỗi hệ thống không mong muốn |
