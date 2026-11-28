# Hướng dẫn kỹ thuật Trạm Hỗ Trợ

Angular và Express dùng Docker Compose làm môi trường phát triển chung. Chạy lệnh từ thư mục gốc repo thay vì từ một gói con. [Cấu hình Docker](../docker/README.md)

| Việc | Lệnh |
| --- | --- |
| Chạy MySQL, Angular, Express và áp dụng migration | `pnpm dev` |
| Build cả frontend và backend | `pnpm build` |
| Typecheck và lint | `pnpm check` |
| Dừng môi trường | `pnpm stop` |

API trong container lắng nghe tại cổng 3000. Frontend dev server lắng nghe tại cổng 4200 và proxy `/api` tới service `backend`. Biến trong `docker/.env` cấu hình MySQL và origin. Dữ liệu, tệp và bản sao ở các volume riêng. Production phục vụ build Angular qua Caddy và dùng URL cùng origin cho API. [Hướng dẫn production](../docker/production.md)

## Kiểm thử thông qua Docker

Từ thư mục gốc repo, build image rồi chạy các ca kiểm thử trong container.

```powershell
pnpm build
docker compose --env-file docker/.env -f docker/compose.yaml run --rm --no-deps backend pnpm test
docker compose --env-file docker/.env -f docker/compose.yaml run --rm --no-deps frontend pnpm test --watch=false
```

Bộ kiểm thử nhanh API dùng fixture trong bộ nhớ. Ca tích hợp MySQL tạo schema thử riêng với tài khoản có quyền tạo và xóa schema thử. [Tùy chọn kiểm thử MySQL](https://github.com/Arter2507/csn-dx24tt8016-toquangtuong-helpdesk-nodejs-local/blob/local/README.local.md#kiểm-thử) · [Playwright](https://github.com/Arter2507/csn-dx24tt8016-toquangtuong-helpdesk-nodejs-local/blob/local/output/playwright/README.md)

[Bản đồ frontend](frontend/readme.map) · [Bản đồ backend](backend/readme.map)
