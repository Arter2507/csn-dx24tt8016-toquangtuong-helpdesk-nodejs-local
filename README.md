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
| Repository | [Điền đường dẫn GitHub] |
| Trạng thái | Đang chuẩn bị và tổ chức thư mục đồ án |

## 2. Giới thiệu

Đề tài "Thiết kế Website quản lý yêu cầu hỗ trợ kỹ thuật" hướng đến xây dựng một hệ thống quản lý các yêu cầu hỗ trợ kỹ thuật từ người dùng khi gặp sự cố về hệ thống phần mềm, phần cứng, mạng hoặc tài khoản.

Website hỗ trợ phân loại yêu cầu hỗ trợ, quản lý mức độ ưu tiên theo loại yêu cầu và phân công người phụ trách xử lý. Hệ thống cũng cung cấp chức năng tìm kiếm, thống kê theo loại yêu cầu, trạng thái hoặc thời gian, giúp người quản lý dễ dàng theo dõi và đánh giá hiệu quả xử lý các yêu cầu hỗ trợ.

## 3. Chức năng dự kiến

- Cho phép người dùng gửi yêu cầu hỗ trợ kỹ thuật.
- Phân loại yêu cầu theo phần mềm, phần cứng, mạng hoặc tài khoản.
- Quản lý mức độ ưu tiên và phân công người phụ trách.
- Cập nhật trạng thái yêu cầu (ticket): Tiếp nhận, Đang xử lý, Hoàn thành.
- Tìm kiếm, phân tích và thống kê theo loại, trạng thái và thời gian.

Các chức năng trên là dự kiến và sẽ được cập nhật theo kết quả phân tích, thiết kế và thực hiện.

## 4. Công nghệ dự kiến

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện | Angular |
| Máy chủ | Node.js, Express.js |
| Cơ sở dữ liệu | MySQL |

Phiên bản và các công cụ bổ sung sẽ được ghi nhận sau khi lựa chọn và cài đặt.

## 5. Cấu trúc thư mục

```text
.
├── docker/            # Chứa các tệp tin liên quan đến triển khai ứng dụng trên docker (Nếu sử dụng)
├── progress-report/   # Báo cáo tiến độ hằng tuần
├── setup/             # Tệp cài đặt, dữ liệu thử và hướng dẫn triển khai
├── soft/              # Phần mềm liên quan, nếu có
├── src/               # Mã nguồn và tài nguyên của chương trình
├── thesis/            # Tài liệu đồ án và tài liệu tham khảo
└── README.md          # Giới thiệu và hướng dẫn đồ án
```

Các thư mục con trong `thesis/` sẽ được tổ chức theo quy định: `doc/` cho tài liệu Word, `pdf/` cho tài liệu PDF, `html/` cho tài liệu web, `abs/` cho bài trình bày và tư liệu báo cáo, `refs/` cho tài liệu tham khảo, tùy theo tài liệu thực tế.

## 6. Cài đặt và chạy chương trình

Đồ án đang trong giai đoạn nghiên cứu và xác định đề tài. Hướng dẫn cài đặt và chạy chương trình sẽ được cập nhật sau khi hoàn thành xây dựng hệ thống.

<!-- Chưa có hướng dẫn chạy được xác minh. Sau khi mã nguồn và môi trường được thiết lập, mục này sẽ cập nhật:

1. Yêu cầu môi trường và phiên bản phần mềm.
2. Cách lấy mã nguồn và cài đặt các thư viện.
3. Cách cấu hình môi trường và cơ sở dữ liệu.
4. Lệnh khởi chạy giao diện và máy chủ.
5. Cách nạp dữ liệu thử và kiểm tra kết quả.
6. Hướng dẫn Docker và sơ đồ triển khai, nếu sử dụng. -->

==

## 7. Tiến độ và kết quả
### Tuần 1: 04/11/2026 – 10/11/2026

**Ngày 1 — 04/11/2026**

- Xác định đề tài, mục tiêu và phạm vi thực hiện.
- Tạo các thư mục: `docker/`, `progress-report/`, `setup/`, `thesis/`, `soft/` và `src/`.

**Theo dõi tiến độ**

- Báo cáo tiến độ hằng tuần được lưu tại thư mục `progress-report/`.
- Kết quả thiết kế, chức năng hoàn thành, cách kiểm thử và hình ảnh minh họa sẽ được cập nhật theo tiến độ thực tế.

## 8. Tài liệu tham khảo

Tài liệu tham khảo và các nguồn được sử dụng sẽ được cập nhật trong quá trình thực hiện; các tệp liên quan dự kiến lưu tại `thesis/refs/`.
