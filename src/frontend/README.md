# Giao diện Angular của Trạm Hỗ Trợ

Chạy `pnpm dev` ở gốc repo để mở frontend cùng Express và MySQL. Mở [Trạm Hỗ Trợ local](http://127.0.0.1:4200). Đăng nhập theo [tài khoản rà soát](../../README.local.md#tài-khoản-mẫu).

- Trang và quyền điều hướng nằm trong `src/app/app.routes.ts`, `src/app/session.ts` và `src/app/shell.ts`.
- Tiếng Việt và tiếng Anh lưu trong `src/app/messages.json`. Màu sáng và tối dùng token trong `src/styles.css`.
- Mở danh sách người dùng và loại phiếu qua `src/app/directory-page.ts`. Lịch tháng và lịch tuần sử dụng API nhiệm vụ, ngày theo múi giờ Việt Nam và ID nhiệm vụ từ dữ liệu.
- API gọi bằng đường dẫn cùng origin. Dev dùng proxy Angular, production dùng Caddy. Frontend tạo URL màn hình từ Angular Router và lấy tệp qua API có quyền.

Từ gốc repo, `pnpm build` build hai gói và `pnpm check` chạy kiểm tra kiểu, định dạng và lint. [Kiểm thử Docker](../README.md#kiểm-thử-thông-qua-docker) · [Bản đồ mã nguồn frontend](readme.map) · [Cấu hình production](../../docker/production.md)
