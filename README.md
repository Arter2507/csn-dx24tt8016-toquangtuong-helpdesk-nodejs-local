# Website quản lý yêu cầu hỗ trợ kỹ thuật

> Đồ án thực tập cơ sở ngành.

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
| Repository | Nhánh cộng tác `local` |
| Trạng thái | Luồng nghiệp vụ MySQL chạy local, đã chuẩn bị cấu hình máy chủ |

## 2. Giới thiệu

Đề tài "Thiết kế Website quản lý yêu cầu hỗ trợ kỹ thuật" hướng đến xây dựng một hệ thống quản lý các yêu cầu hỗ trợ kỹ thuật từ người dùng khi gặp sự cố về hệ thống phần mềm, phần cứng, mạng hoặc tài khoản.

Website hỗ trợ phân loại yêu cầu hỗ trợ, quản lý mức độ ưu tiên theo loại yêu cầu và phân công người phụ trách xử lý. Hệ thống cũng cung cấp chức năng tìm kiếm, thống kê theo loại yêu cầu, trạng thái hoặc thời gian, giúp người quản lý dễ dàng theo dõi và đánh giá hiệu quả xử lý các yêu cầu hỗ trợ.

## 3. Chức năng hiện hành

- Cho phép người dùng gửi yêu cầu hỗ trợ kỹ thuật.
- Phân loại yêu cầu theo phần mềm, phần cứng, mạng hoặc tài khoản.
- Quản lý mức độ ưu tiên và phân công người phụ trách.
- Xử lý phiếu qua tiếp nhận, đang xử lý, chờ phản hồi, chờ xác nhận và đã đóng.
- Tìm kiếm, phân tích và thống kê theo loại, trạng thái và thời gian.

Ứng dụng có đăng nhập ba không gian, hồ sơ, nhiệm vụ nhóm, lịch tháng/lịch tuần, thông báo và sao lưu. Mở rộng phân quyền theo phòng ban trong [kế hoạch IAM/RBAC](documents/markdown/ke-hoach-iam-rbac.md).

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

Chạy `pnpm dev` từ gốc repo có Docker Compose, Node và pnpm. Mở [Trạm Mèo local](http://127.0.0.1:4200). [Hướng dẫn local và dữ liệu rà soát](README.local.md) · [Triển khai production](docker/production.md)

## 7. Tiến độ và kết quả
### Tuần 1: 04/11/2026 – 10/11/2026

**Ngày 1 — 04/11/2026**

- Xác định đề tài, mục tiêu và phạm vi thực hiện.
- Tạo các thư mục: `docker/`, `progress-report/`, `setup/`, `thesis/`, `soft/` và `src/`.

**Theo dõi tiến độ**

- Báo cáo tiến độ hằng tuần được lưu tại thư mục `progress-report/`.
- Xem [kết quả và phạm vi kiểm thử ngày 26/11/2026](progress-report/bao-cao-tien-do-local-2026-11-26.md).

## 8. Tài liệu tham khảo

Tài liệu tham khảo và các nguồn được sử dụng sẽ được cập nhật trong quá trình thực hiện; các tệp liên quan dự kiến lưu tại `thesis/refs/`.
