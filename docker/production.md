# Triển khai Trạm Mèo trên máy chủ

Trạm Mèo chạy một bộ Docker Compose gồm Caddy, Express và MySQL 8.4. Caddy phục vụ Angular đã build, giữ đường dẫn SPA khi tải lại trang và chuyển `/api/*` sang Express trong mạng nội bộ. Frontend gọi API cùng origin nên đổi tên miền hoặc cổng triển khai không cần sửa mã nguồn. [Cấu hình SPA và reverse proxy trong Caddy](https://caddyserver.com/docs/caddyfile/patterns)

## Khởi động

1. Trỏ tên miền tới máy chủ, cho Caddy nhận kết nối cổng 80 và 443. Caddy xin và gia hạn chứng chỉ HTTPS cho tên miền hợp lệ. [Yêu cầu của Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
2. Sao chép `.env.production.example` thành `.env.production` trong thư mục `docker/`. Điền `APP_DOMAIN`, mật khẩu ứng dụng MySQL, mật khẩu root MySQL và `JWT_SECRET` riêng. Khóa JWT cần tối thiểu 32 ký tự ngẫu nhiên. Git bỏ qua file có giá trị thật.
3. Từ gốc repo, kiểm tra cấu hình và khởi động. Backend đợi MySQL rồi áp dụng migration.

```powershell
docker compose --env-file docker/.env.production -f docker/compose.prod.yaml config --quiet
docker compose --env-file docker/.env.production -f docker/compose.prod.yaml up -d --build
docker compose --env-file docker/.env.production -f docker/compose.prod.yaml ps
```

Chỉ Caddy mở cổng host. MySQL và Express liên lạc trong mạng Compose. Nếu cổng HTTPS ngoài khác cổng 443, cấu hình `HTTPS_PORT` và `PUBLIC_ORIGIN` chính xác theo URL công khai.

## Tạo Chủ sở hữu đầu tiên

Migration khởi tạo tổ chức mặc định. Với database mới, chạy lệnh sau trên máy chủ để gán Chủ sở hữu đầu tiên. Với database đang nâng cấp, migration chọn quản trị viên đang hoạt động có ID nhỏ nhất. Sau khi đăng nhập, sửa tên tổ chức ở **Cài đặt → Tổ chức** và thêm người ở **Nhân sự**.

```powershell
$env:APP_ADMIN_EMAIL = Read-Host 'Email Chủ sở hữu'
$env:APP_ADMIN_NAME = Read-Host 'Tên Chủ sở hữu'
$env:APP_ADMIN_PASSWORD = Read-Host 'Mật khẩu tối thiểu 12 ký tự' -MaskInput
try {
  docker compose --env-file docker/.env.production -f docker/compose.prod.yaml exec -T -e APP_ADMIN_EMAIL -e APP_ADMIN_NAME -e APP_ADMIN_PASSWORD backend node scripts/create-admin.js
} finally {
  Remove-Item Env:APP_ADMIN_PASSWORD
}
```

Liên kết kích hoạt dùng tên miền hiện tại và có hạn 24 giờ. Chủ sở hữu hoặc Quản trị viên sao chép liên kết từ trang Nhân sự để gửi riêng. Với tài khoản tự đăng ký, xác minh danh tính người đăng ký trước khi gán quyền theo email.

## Dữ liệu và đường dẫn

- Phiên sử dụng cookie HttpOnly, Secure và SameSite. Express kiểm tra origin của yêu cầu ghi và quyền theo tài nguyên.
- Điều hướng Angular tạo URL từ route và ID thực. Tệp đính kèm dùng route ticket có kiểm tra quyền. Ảnh đại diện lấy qua API hồ sơ, lưu nội dung trong MySQL và tạo URL hiển thị theo phiên. Chủ sở hữu thao tác bản sao qua API.
- Các volume production `mysql_data`, `uploads`, `backups` và `caddy_data` giữ database, tệp, ZIP và chứng chỉ. Dùng `docker compose down` để dừng dịch vụ và giữ các volume. Sao lưu volume và database ra thiết bị hoặc kho khác để khôi phục khi mất máy chủ.
- Bản ZIP nghiệp vụ phục hồi dữ liệu do ứng dụng quản lý. Bản sao CSDL cấp máy chủ cần thiết để phục hồi đầy đủ tài khoản và quyền trên máy mới.

## Nghiệm thu trên máy chủ đích

Kiểm tra DNS và chứng chỉ công khai, tải lại một URL chi tiết, đăng nhập từng vai trò, thử truy cập phiếu/tệp ngoài phạm vi, upload và tải lại sau khi restart. Xác nhận tạo và khôi phục bản sao trên CSDL kiểm thử rồi mới đưa tài khoản thật vào. [Kế hoạch IAM và phạm vi quyền theo phòng ban](../documents/markdown/ke-hoach-iam-rbac.md)
