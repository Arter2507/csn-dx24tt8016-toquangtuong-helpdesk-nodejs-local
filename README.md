# Trạm Hỗ Trợ v1.3.0

> Tiếp nhận hỗ trợ yêu cầu kỹ thuật

## 1. Thông tin đồ án

| Thông tin | Nội dung |
| --- | --- |
| Tên đề tài | Thiết kế website quản lý yêu cầu hỗ trợ kỹ thuật |
| Môn học | Thực tập đồ án cơ sở ngành |
| Sinh viên thực hiện | Tô Quang Tường |
| Mã số sinh viên | 170124299 |
| Lớp | DX24TT8016 |
| Chuyên ngành | Công nghệ thông tin |
| Giảng viên hướng dẫn | TS. Nguyễn Nhứt Lam |
| Email sinh viên | 170124299@rdi.tvu.vn |
| Email liên hệ | toquangtuong250703.it@gmail.com |
| Số điện thoại | 0917895327 |
| Repository | [Repo đồ án](https://github.com/Arter2507/csn-dx24tt8016-toquangtuong-helpdesk-nodejs) và [repo cộng tác](https://github.com/Arter2507/csn-dx24tt8016-toquangtuong-helpdesk-nodejs-local/tree/local) |
| Trạng thái | Luồng nghiệp vụ MySQL chạy local, đã chuẩn bị cấu hình máy chủ |

## 2. Giới thiệu

Đề tài "Thiết kế Website quản lý yêu cầu hỗ trợ kỹ thuật" hướng đến xây dựng một hệ thống quản lý các yêu cầu hỗ trợ kỹ thuật từ người dùng khi gặp sự cố về hệ thống phần mềm, phần cứng, mạng hoặc tài khoản.

Website hỗ trợ phân loại yêu cầu hỗ trợ, quản lý mức độ ưu tiên theo loại yêu cầu và phân công người phụ trách xử lý. Hệ thống cũng cung cấp chức năng tìm kiếm, thống kê theo loại yêu cầu, trạng thái hoặc thời gian, giúp người quản lý dễ dàng theo dõi và đánh giá hiệu quả xử lý các yêu cầu hỗ trợ.

## 3. Chức năng hiện hành

- Gửi phiếu, đính kèm tệp và theo dõi trạng thái. Người gửi có 10 phút để sửa phiếu thuộc phạm vi của mình.
- Điều phối theo chuyên môn và mức ưu tiên. Chuyên viên có thể chuyển phiếu, trao đổi và ghi kết quả. Người gửi xác nhận đóng hoặc yêu cầu xử lý lại.
- Nhận thông báo và cập nhật danh sách phiếu theo thời gian thực. Theo dõi thời hạn hỗ trợ trên bảng điều phối.
- Tra cứu Kho hướng dẫn, quản lý cơ cấu tổ chức, danh mục, nhiệm vụ nhóm, báo cáo và sao lưu.

Ứng dụng hỗ trợ đăng nhập bằng email hoặc tên đăng nhập và phân quyền theo vai trò. Phạm vi mở rộng theo phòng ban được lưu trong repo cộng tác. [Kế hoạch IAM/RBAC](https://github.com/Arter2507/csn-dx24tt8016-toquangtuong-helpdesk-nodejs-local/blob/local/documents/markdown/ke-hoach-iam-rbac.md)

## 4. Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện | Angular |
| Máy chủ | Node.js, Express.js |
| Cơ sở dữ liệu | MySQL |

Docker Compose dựng môi trường MySQL 8.4 với migration Prisma. Cấu hình production phục vụ Angular tĩnh qua Caddy.

## 5. Cấu trúc thư mục

```text
.
├── docker/            # Cấu hình local và production
├── progress-report/   # Báo cáo tiến độ hằng tuần
├── setup/             # Tệp cài đặt, dữ liệu thử và hướng dẫn triển khai
├── soft/              # Phần mềm liên quan, nếu có
├── src/               # Mã nguồn và tài nguyên của chương trình
├── thesis/            # Tài liệu đồ án và tài liệu tham khảo
└── README.md          # Giới thiệu và hướng dẫn đồ án
```

Các thư mục con trong `thesis/` sẽ được tổ chức theo quy định: `doc/` cho tài liệu Word, `pdf/` cho tài liệu PDF, `html/` cho tài liệu web, `abs/` cho bài trình bày và tư liệu báo cáo, `refs/` cho tài liệu tham khảo, tùy theo tài liệu thực tế.

## 6. Cài đặt và chạy chương trình

Chạy `pnpm dev` từ thư mục gốc khi đã cài Docker Compose, Node và pnpm. [Mở ứng dụng local](http://127.0.0.1:4200/) · [Hướng dẫn cài đặt](src/README.md) · [Cấu hình máy chủ](docker/production.md)

### Tài khoản mẫu

| Tên đăng nhập | Email | Vai trò |
| --- | --- | --- |
| `admin` | `admin@example.test` | Chủ sở hữu |
| `technical` | `tech@example.test` | Chuyên viên kỹ thuật |
| `user` | `user@example.test` | Người gửi |

Mật khẩu mẫu là `password` khi chạy local với dữ liệu mẫu.

## 7. Tiến độ và kết quả
### Tuần 1: 04/11/2026 – 10/11/2026

**Ngày 1 — 04/11/2026**

- Xác định đề tài, mục tiêu và phạm vi thực hiện.
- Tạo các thư mục: `docker/`, `progress-report/`, `setup/`, `thesis/`, `soft/` và `src/`.

**Theo dõi tiến độ**

- Báo cáo tiến độ hằng tuần được lưu tại thư mục `progress-report/`.
- [Báo cáo ngày 28/11/2026](progress-report/bao-cao-tien-do-28-11-2026.md)
- [Báo cáo ngày 23/11/2026](https://github.com/Arter2507/csn-dx24tt8016-toquangtuong-helpdesk-nodejs/blob/master/progress-report/bao-cao-tien-do-23-11-2026.md)
- [Báo cáo khởi tạo](progress-report/bao-cao-tien-do-11-10-2026.md)

## 8. Tài liệu tham khảo

Tài liệu tham khảo được cập nhật cùng đồ án. Các tệp tham khảo lưu tại `thesis/refs/` khi có.
