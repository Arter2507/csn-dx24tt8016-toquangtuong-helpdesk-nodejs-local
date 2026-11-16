# Trạm Mèo — chức năng, tiến độ và phân công

Cập nhật **16/11/2026** · Nhánh cộng tác `local` · Bản **v0.2.0**

## Chức năng hiện có

| Hạng mục | Phạm vi đã chạy được |
| --- | --- |
| Quản trị | Tổng quan, biểu đồ trạng thái, hàng đợi chưa phân công. |
| Chuyên viên | Công việc theo ngày, lịch tuần, ghi chú trình duyệt, lối tắt việc được giao; chuyển góc nhìn người gửi. |
| Người dùng | Gửi hôm nay/tuần này, năm yêu cầu mở ưu tiên cao, chờ xác nhận, tạo yêu cầu và xem tiến độ. |
| Quản lý yêu cầu | Tìm kiếm, lọc, phân trang, sửa, phân công, trạng thái, timeline, kéo thả tệp, xóa mềm. |
| Người dùng và danh mục | Tạo/sửa, bật/ngưng sử dụng; giữ liên kết lịch sử; luôn còn ít nhất một ADMIN hoạt động. |
| Báo cáo | Lọc ngày tạo / loại / trạng thái, biểu đồ, bảng, CSV. |
| Hồ sơ, cài đặt, thông báo | Sửa tên/email mẫu, giao diện, giảm chuyển động, ngôn ngữ; thông báo trên trình duyệt (demo). |
| Sao lưu | Tải JSON phiên (demo hoặc snapshot MySQL cơ bản). |
| Giao diện | Phase -1, Trạm Mèo, VI/EN, sáng/tối, loading, chuyển trang, sidebar. |
| Công cụ & CSDL | Lệnh pnpm typecheck/build/re-build/dev; Prisma migration; SQL schema + sample ~5 ticket; API CRUD categories/users/tickets với `DATA_SOURCE=mysql`. |

`DATA_SOURCE=demo` dùng bộ nhớ; `DATA_SOURCE=mysql` đọc MySQL. Đăng nhập JWT, phân quyền theo phiên, thông báo máy chủ và tệp lưu dài hạn vẫn đang làm.

## Phân công cho hai người

Trạng thái: **Chờ làm** · **Đang làm** · **Chờ kiểm tra** · **Xong**.

| Mã | Phụ trách | Việc | Trạng thái | Điều kiện hoàn thành | Phụ thuộc |
| --- | --- | --- | --- | --- | --- |
| A1 | Người 1 | Hoàn thiện UI và tài liệu sử dụng ba vai trò; trạng thái rỗng/tải/lỗi/quyền; i18n; sáng/tối; responsive. | Đang làm | Mỗi màn hình phản hồi đủ; kiểm tra Edge + một trình duyệt khác. | Song song B1 |
| A2 | Người 1 | Trang đăng nhập / đăng xuất / phục hồi phiên; lấy vai trò từ API. | Chờ làm | Ba vai trò + tài khoản đa vai trò qua API thật. | B2 |
| A3 | Người 1 | Luồng ticket đầy đủ: phản hồi, trao đổi, xác nhận, phân công theo quyền, tệp, timeline; thông báo server. | Chờ làm | End-to-end; trái quyền bị từ chối và UI giải thích được. | B3, B4 |
| A4 | Người 1 | Nối dashboard, báo cáo, tài khoản, sao lưu với API thật. | Chờ làm | Chỉ số khớp nguồn; phục hồi báo rõ kết quả. | B2, B5 |
| A5 | Người 1 | Playwright nghiệp vụ + nghiệm thu; ảnh, slide, kịch bản trình bày. | Đang làm | Chạy lại được; có chứng cứ desktop/mobile. | A2–A4, B6 |
| B1 | Người 2 | Migration + seed MySQL, ràng buộc, chỉ mục; tách demo/MySQL; sample SQL; API CRUD MySQL cơ bản. | **Xong** | Tạo DB bằng migrate, nạp mẫu, web đọc được ticket/user/category từ MySQL. | ERD đã chốt |
| B2 | Người 2 | Xác thực, phiên, phân quyền đa vai trò; nối tài khoản/hồ sơ/danh mục/chuyên môn MySQL. | Chờ làm | Kiểm thử quyền hợp lệ/trái quyền. | B1 |
| B3 | Người 2 | API ticket đầy đủ theo contract: phân công, transition, comment, history, soft-delete. | Đang làm | Transaction, version, quyền sở hữu. Khung CRUD MySQL đã có; chưa đủ theo API contract. | B1, B2 |
| B4 | Người 2 | Tệp đính kèm dài hạn + thông báo theo tài khoản trên server. | Chờ làm | Upload/download đúng quyền; thông báo bền sau reload. | B2, B3 |
| B5 | Người 2 | Thống kê MySQL, xuất liệu, sao lưu/phục hồi gồm tệp. | Chờ làm | Lọc đúng dữ liệu biết trước; khôi phục thử thành công. | B1, B3, B4 |
| B6 | Người 2 | Chuẩn hóa `.env.example`, README chạy máy, kiểm thử, triển khai demo. | **Xong** (phần môi trường) | Clone + chạy theo README; còn rà thêm sau B2–B5. | Một phần độc lập B1 |

### Ghi chú hoàn thành 16/11/2026

- **B1:** `prisma/migrations`, `sql/helpdesk-schema.sql`, `sql/helpdesk-sample-data.sql`, `pnpm db:sample`, repository MySQL users/tickets/categories, `DATA_SOURCE=mysql` đã chạy với 5 ticket trên web.
- **B6 (môi trường):** README.local, `.env.example`, script pnpm gốc repo (`typecheck:lint` / `build` / `re-build` / `dev`).

## Mốc bàn giao chung

1. **Chốt hợp đồng.** Route, payload, mã lỗi, ma trận quyền, trạng thái ticket, dữ liệu mẫu — trước khi nối UI vào auth MySQL.
2. **Tích hợp luồng cốt lõi.** Auth + API theo contract; UI ưu tiên; thử tạo → phân công → xử lý.
3. **Hoàn thiện dữ liệu và báo cáo.** Lịch sử, tệp, thông báo, thống kê, sao lưu/phục hồi.
4. **Nghiệm thu và nộp bài.** Ảnh, slide, ERD, tài liệu API, hướng dẫn môi trường, chứng cứ kiểm thử.

[Hướng dẫn chạy](../../README.local.md) · [Thiết kế API](api-contract-demo.md) · [Thiết kế CSDL](database-demo.md) · [Mẫu giao diện](../Phase-1-Design-UI/) · [Kiểm thử trình duyệt](../../output/playwright/README.md)
