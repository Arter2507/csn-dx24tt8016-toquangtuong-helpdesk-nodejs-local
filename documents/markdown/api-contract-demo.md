# THIẾT KẾ QUY CHUẨN VÀ DANH MỤC REST API

**Đề tài:** Thiết kế website quản lý yêu cầu hỗ trợ kỹ thuật  
**Trạng thái:** Thiết kế dự kiến, chưa xác nhận đã triển khai hoặc kiểm thử.  
**Công nghệ:** Angular, Node.js, Express.js, MySQL.  
**Tài liệu liên quan:** `Database_Helpdesk.md`.

## 1. Phạm vi và kiến trúc

Đề tài yêu cầu gửi, phân loại, ưu tiên, phân công, cập nhật trạng thái, tìm kiếm, thống kê, sao lưu và phục hồi. Thiết kế dưới đây bổ sung vai trò, trao đổi và thông báo trong hệ thống để hỗ trợ quy trình. Email và Zalo là hướng mở rộng, chưa mặc định đã triển khai. Quy định nghiệp vụ bên dưới là đề xuất cần đối chiếu thực tế.

Angular gọi HTTP API của Express; Express kiểm tra xác thực, quyền và dữ liệu, sau đó truy cập MySQL. Frontend và backend có thể nằm chung một kho mã nguồn và một project triển khai theo yêu cầu môn học; không đồng nghĩa phải viết chung một tiến trình.

## 2. Vai trò và phạm vi quyền

- **U — USER:** tạo yêu cầu, xem yêu cầu do mình tạo, trao đổi và xác nhận kết quả.
- **T — TECHNICIAN:** thêm vào quyền USER khi có cả hai vai trò; xem và xử lý ticket được phân công, gửi phản hồi.
- **A — ADMIN:** quản lý người dùng, vai trò, danh mục, xem tất cả ticket, phân loại, ưu tiên, phân công và thống kê.
- Một tài khoản có thể có nhiều vai trò; quyền là hợp của các vai trò, nhưng từng ticket vẫn phải kiểm tra quan hệ sở hữu/phân công. Một kỹ thuật viên tạo ticket được xem ticket đó với tư cách người tạo.
- Theo thiết kế mặc định, ADMIN phân công; TECHNICIAN chỉ xử lý ticket đang được phân công. Cần mở rộng quyền qua quy tắc được phê duyệt nếu tổ chức muốn chuyên viên tự tiếp nhận.

## 3. Quy ước chung

| Nội dung | Quy ước đề xuất |
|---|---|
| Base URL | `/api/v1` |
| Giao thức | HTTPS khi triển khai; HTTP chỉ cho môi trường phát triển cục bộ |
| Kiểu dữ liệu | `application/json; charset=utf-8`; upload dùng `multipart/form-data` |
| Tên JSON | `camelCase`; tên bảng/cột MySQL dùng `snake_case` |
| ID | Số nguyên dương trong ví dụ; lấy từ server, không suy luận quyền từ ID |
| Ngày giờ | ISO 8601 UTC, ví dụ `2026-11-10T08:30:00Z` |
| Phân trang | `page` từ 1, `pageSize` mặc định 20, tối đa 100 |
| Sắp xếp | `sortBy`, `sortOrder=asc|desc`; server chỉ chấp nhận trường trong danh sách cho phép |
| Xác thực | Access token trong `Authorization: Bearer <token>`; phiên làm việc và refresh token theo thiết kế dưới đây |
| Không trả dữ liệu | HTTP 204 không có body |

**Phản hồi thành công** (ví dụ 200 hoặc 201):

```json
{"success":true,"data":{"id":12,"status":"NEW"},"meta":null}
```

**Danh sách:**

```json
{"success":true,"data":[],"meta":{"page":1,"pageSize":20,"totalItems":0,"totalPages":0}}
```

**Lỗi:**

```json
{"success":false,"error":{"code":"VALIDATION_ERROR","message":"Dữ liệu không hợp lệ","details":[{"field":"title","message":"Tiêu đề là bắt buộc"}]},"requestId":"9f02a1"}
```

| HTTP | Sử dụng |
|---|---|
| 200 | Truy vấn hoặc cập nhật thành công |
| 201 | Tạo mới thành công, trả `Location` khi có URL tài nguyên |
| 204 | Thành công, không có nội dung trả về |
| 400 | JSON hoặc tham số sai cú pháp |
| 401 | Chưa xác thực, phiên hết hạn hoặc token không hợp lệ; trả `WWW-Authenticate: Bearer` |
| 403 | Đã xác thực nhưng không đủ quyền |
| 404 | Tài nguyên không tồn tại hoặc được ẩn khi không có quyền truy cập |
| 409 | Xung đột trạng thái, phiên bản hoặc dữ liệu trùng |
| 413 | Tệp hoặc request quá lớn |
| 415 | Kiểu nội dung không được hỗ trợ |
| 422 | Cú pháp hợp lệ nhưng dữ liệu không đạt quy tắc nghiệp vụ |
| 429 | Vượt giới hạn yêu cầu |
| 500 | Lỗi hệ thống; không trả stack trace hoặc bí mật |

Ý nghĩa mã HTTP tham khảo [MDN HTTP status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status).

## 4. Xác thực và phiên

Đề xuất đăng nhập bằng email và mật khẩu; quản trị viên tạo tài khoản, không mở đăng ký công khai trong V1. Server cấp access token ngắn hạn và refresh token ngẫu nhiên, chỉ lưu hash refresh token ở `auth_sessions`. Refresh token đặt trong cookie `HttpOnly`, `Secure`, `SameSite` phù hợp; bảo vệ CSRF cho endpoint dùng cookie và kiểm soát origin. Khi refresh, xoay token, thu hồi token cũ theo transaction; logout thu hồi phiên và xóa cookie. Không lưu mật khẩu gốc; dùng Argon2id hoặc bcrypt với cấu hình phù hợp. Trạng thái tài khoản phải được kiểm tra khi xác thực. Access token cần kiểm tra chữ ký, thời hạn, issuer và audience. Để khóa tài khoản có hiệu lực ngay, kiểm tra phiên/trạng thái người dùng ở server cho mỗi request bảo vệ.

| Method | Endpoint | Quyền | Nội dung |
|---|---|---|---|
| POST | `/auth/login` | Công khai | Email, mật khẩu; tạo phiên |
| POST | `/auth/refresh` | Cookie refresh hợp lệ | Xoay refresh token, cấp access token |
| POST | `/auth/logout` | Phiên hiện tại | Thu hồi phiên, xóa cookie; 204 |
| GET | `/auth/me` | Đã đăng nhập | Thông tin tài khoản và các vai trò |
| PATCH | `/auth/me/password` | Đã đăng nhập | `{currentPassword,newPassword}`; xác minh mật khẩu cũ, thu hồi các phiên |

Không phân biệt email không tồn tại và mật khẩu sai trong thông báo đăng nhập. Giới hạn số lần thử, lưu log an toàn, không log token hoặc mật khẩu.

## 5. Trạng thái và chuyển trạng thái

| Giá trị | Ý nghĩa |
|---|---|
| `NEW` | Đã gửi, chờ tiếp nhận/phân công |
| `IN_PROGRESS` | Đang xử lý |
| `RESOLVED` | Chuyên viên báo đã xử lý, chờ người tạo xác nhận |
| `CLOSED` | Người tạo xác nhận hoàn thành |

| Từ | Sang | Người thực hiện và điều kiện |
|---|---|---|
| `NEW` | `IN_PROGRESS` | ADMIN hoặc T được phân công; bắt buộc đã có người phụ trách |
| `IN_PROGRESS` | `RESOLVED` | T được phân công hoặc ADMIN; bắt buộc mô tả kết quả `note` |
| `RESOLVED` | `CLOSED` | Người tạo xác nhận; ADMIN không tự xác nhận thay trong V1 |
| `RESOLVED` | `IN_PROGRESS` | Người tạo phản hồi chưa đạt; bắt buộc `note` |

Chỉ các chuyển đổi trên được chấp nhận; trường hợp khác trả 409. Trạng thái mới tạo luôn là `NEW`. Chuyển trạng thái, lịch sử và thông báo liên quan phải được ghi cùng transaction; dùng `version` để tránh ghi đè khi có thao tác đồng thời. Nếu sai phiên bản trả 409.

## 6. Danh mục API

### 6.1 Người dùng và vai trò

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/users?search=&role=&isActive=&page=1&pageSize=20` | A | Danh sách tài khoản |
| POST | `/users` | A | Tạo tài khoản; email duy nhất |
| GET | `/users/{id}` | A | Chi tiết tài khoản |
| PATCH | `/users/{id}` | A | Sửa họ tên, email, số điện thoại, trạng thái hoạt động |
| PUT | `/users/{id}/roles` | A | Thay toàn bộ vai trò bằng `{roleCodes:["USER","TECHNICIAN"]}` |
| GET | `/roles` | A | Danh sách vai trò |

Chỉ ADMIN được thay vai trò; cần đảm bảo luôn còn ít nhất một tài khoản ADMIN đang hoạt động. Không cung cấp password hash hoặc refresh token qua API. Vô hiệu hóa tài khoản thay vì xóa khi đã có lịch sử.

### 6.2 Danh mục và chuyên môn

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/categories` | U, T, A | Danh mục hoạt động |
| POST | `/categories` | A | Tạo danh mục |
| PATCH | `/categories/{id}` | A | Sửa tên hoặc trạng thái danh mục |
| GET | `/categories/{id}/technicians` | A | Liệt kê chuyên viên đang hoạt động có chuyên môn tương ứng |
| PUT | `/users/{id}/categories` | A | Thay danh mục chuyên môn: `{categoryIds:[1,2]}`; tài khoản phải có TECHNICIAN |

Dữ liệu ban đầu dự kiến: `SOFTWARE`, `HARDWARE`, `NETWORK`, `ACCOUNT`. Không xóa cứng danh mục đã được sử dụng.

### 6.3 Ticket

| Method | Endpoint | Quyền | Nội dung |
|---|---|---|---|
| POST | `/tickets` | U, T, A | Tạo ticket, server tự xác định người tạo |
| GET | `/tickets` | U, T, A | Danh sách theo phạm vi quyền |
| GET | `/tickets/{id}` | Người tạo, T được phân công, A | Chi tiết và phiên bản hiện tại |
| PATCH | `/tickets/{id}` | A | Phân loại, ưu tiên, sửa thông tin mô tả; dùng version |
| PUT | `/tickets/{id}/assignee` | A | Phân công hoặc đổi chuyên viên, dùng version |
| PUT | `/tickets/{id}/classification` | A | Đổi danh mục và chuyên viên trong một thao tác nguyên tử |
| POST | `/tickets/{id}/transitions` | Theo bảng trạng thái | Chuyển trạng thái có kiểm soát |
| GET | `/tickets/{id}/history` | Người tạo, T được phân công, A | Xem lịch sử trong phạm vi được phép |
| GET | `/tickets/{id}/comments` | Người tạo, T được phân công, A | Xem trao đổi |
| POST | `/tickets/{id}/comments` | Người tạo, T được phân công, A | Gửi trao đổi |
| POST | `/tickets/{id}/attachments` | Người tạo, T được phân công, A | Upload tệp đính kèm |
| GET | `/tickets/{id}/attachments/{attachmentId}` | Người tạo, T được phân công, A | Tải tệp sau kiểm tra quyền |

Mặc định `GET /tickets` trả hợp của ticket do người gọi tạo và ticket đang được phân công; ADMIN xem tất cả. Bộ lọc `search`, `categoryId`, `status`, `priority`, `assigneeId`, `createdFrom`, `createdTo`, `page`, `pageSize`, `sortBy`, `sortOrder`; `createdFrom` bao gồm và `createdTo` loại trừ, theo UTC. Server áp dụng quyền trước lọc và phân trang. Sắp xếp cho phép `createdAt`, `updatedAt`, `priority`; thêm `id` làm thứ tự phụ ổn định.

**Tạo ticket** `POST /tickets`:

```json
{"title":"Không đăng nhập được email","description":"Thông báo sai mật khẩu khi đăng nhập.","categoryId":4}
```

Server đặt `requesterId` theo phiên, `status=NEW`, `priority=MEDIUM`, `assigneeId=null`, `version=1`. Tiêu đề 1–200 ký tự, mô tả 1–10.000 ký tự; `categoryId` phải tồn tại và hoạt động. Không chấp nhận client tự đặt requester, trạng thái hay người phụ trách.

**Cập nhật phân loại và ưu tiên** `PATCH /tickets/12`:

```json
{"categoryId":4,"priority":"HIGH","version":1}
```

`priority` thuộc `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Nếu đổi category khiến chuyên viên hiện tại không còn thuộc chuyên môn tương ứng, yêu cầu ADMIN phân công lại trước; nếu không trả 409. Giữ lịch sử cả thay đổi danh mục và mức ưu tiên.

**Đổi đồng thời danh mục và chuyên viên** `PUT /tickets/12/classification`: `{ "categoryId": 2, "assigneeId": 9, "version": 2 }`. Chỉ cho ticket chưa đóng; cả hai giá trị bắt buộc, chuyên viên phải hoạt động và có chuyên môn theo danh mục mới. Server cập nhật cùng transaction, tăng version một lần, ghi hai sự kiện và thông báo người được phân công.

**Phân công** `PUT /tickets/12/assignee`:

```json
{"assigneeId":8,"version":2}
```

Chỉ áp dụng với ticket chưa đóng. Người được phân công phải hoạt động, có vai trò TECHNICIAN và thuộc danh mục ticket. Trả 422 nếu không hợp lệ, 409 nếu sai version. Server ghi lịch sử và thông báo trong ứng dụng cho chuyên viên; thay đổi người phụ trách không tự chuyển trạng thái.

**Chuyển trạng thái** `POST /tickets/12/transitions`:

```json
{"toStatus":"RESOLVED","note":"Đã đặt lại mật khẩu và kiểm tra đăng nhập.","version":3}
```

**Gửi bình luận** `POST /tickets/12/comments`: `{ "body":"Tôi đã thử đăng nhập lại." }`; nội dung 1–10.000 ký tự; chỉ hỗ trợ bình luận hiển thị cho các bên có quyền, không có bình luận nội bộ V1. Lưu nội dung dạng văn bản và escape khi hiển thị.

**Tệp đính kèm:** `multipart/form-data` với trường `file`; ví dụ giới hạn 10 MB/tệp, cho phép PDF, PNG, JPEG. Kiểm tra kích thước, nội dung thực, không tin tên hoặc MIME client, tạo tên lưu ngẫu nhiên, lưu ngoài thư mục public, kiểm tra quyền khi tải; từ chối file không hợp lệ. Quy định này là cấu hình đề xuất, cần kiểm thử và bổ sung quét mã độc nếu triển khai thực tế.

### 6.4 Thông báo

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/notifications?unread=true&page=1&pageSize=20` | Đã đăng nhập | Chỉ xem thông báo của mình |
| PATCH | `/notifications/{id}/read` | Chủ thông báo | Đánh dấu đã đọc; gọi lại vẫn thành công |

Khi tạo ticket, hệ thống thông báo đến **tất cả chuyên viên đang hoạt động có chuyên môn thuộc danh mục được chọn**; nếu không có người phù hợp, thông báo cho ADMIN. Khi phân công, thông báo cho chuyên viên mới; khi `RESOLVED`, thông báo cho người tạo; khi phản hồi chưa đạt, thông báo cho chuyên viên được phân công. Thông báo được tạo trong cùng transaction với thay đổi ticket. Dùng polling để cập nhật giao diện; email/Zalo chưa thuộc V1.

### 6.5 Thống kê

| Method | Endpoint | Quyền | Kết quả |
|---|---|---|---|
| GET | `/reports/tickets?groupBy=status&createdFrom=...&createdTo=...` | A | Số ticket theo `status`, `category`, `priority` hoặc `day` |

Chỉ nhận một `groupBy` trong tập cho phép. Lọc theo thời gian tạo `[createdFrom, createdTo)` UTC. `day` là ngày UTC. Ví dụ: `{"success":true,"data":[{"key":"NEW","label":"Mới","count":5}],"meta":null}`. Giá trị là ví dụ minh họa, không phải số liệu đã đo.

### 6.6 Sao lưu và phục hồi

Phạm vi đề tài yêu cầu sao lưu, phục hồi website và CSDL. Phương án V1: quản trị viên thực hiện qua quy trình vận hành có kiểm soát trên máy chủ, không công khai API chạy lệnh hệ điều hành. Sao lưu mã nguồn/bản build, cấu hình triển khai không chứa bí mật trong kho công khai, CSDL và thư mục tệp đính kèm; khôi phục thử trên môi trường riêng và đối chiếu tính toàn vẹn. Không xem bản sao lưu CSDL đơn lẻ là sao lưu đầy đủ website. Lịch chạy, thời gian giữ và công cụ cụ thể cần xác định theo môi trường triển khai.

## 7. Bảo mật và kiểm thử

- Middleware: kiểm tra request → xác thực → quyền vai trò → quyền trên từng ticket → validate → xử lý → chuẩn hóa lỗi. Sử dụng truy vấn tham số hóa và transaction; kiểm tra phân quyền phía server trên từng endpoint. Tham khảo [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
- Không công bố thông tin kết nối, mật khẩu, token; cấu hình CORS theo origin tin cậy; có rate limit và log có `requestId`.
- Kiểm thử: đăng nhập sai/đúng; tài khoản nhiều vai trò; truy cập ticket người khác bị từ chối; tạo và lọc; phân công sai chuyên môn; toàn bộ chuyển trạng thái hợp lệ/không hợp lệ; xung đột version; thông báo đúng người; tệp sai loại; thống kê; sao lưu và khôi phục thử.

## 8. Nguồn căn cứ

- Tệp đề tài `05-de-tai-do-an-co-so-nganh.xlsx`, dòng đề tài 1; quy định báo cáo `03-01_MOT_SO_QUY_DINH_CHUNG-2026.pdf` và mẫu báo cáo dự án.
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
- [MDN HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status).
