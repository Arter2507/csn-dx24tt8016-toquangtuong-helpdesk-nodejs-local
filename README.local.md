# Trạm Mèo

**Có sự cố, có Mèo.** · **v0.2.0 demo**

Trạm Mèo là website quản lý yêu cầu hỗ trợ kỹ thuật của Tô Quang Tường, lớp DX24TT8016, dưới sự hướng dẫn của TS. Nguyễn Nhứt Lam. Nhánh `local` là nơi phát triển và cộng tác. Xem [giới thiệu đồ án](README.md).

## Chạy bản demo trên Windows

Cần **PowerShell 7**, **Node.js** và **pnpm**. Bản hiện tại đã chạy với Node 26.13.0. Angular CLI chấp nhận Node 22 từ 22.22.3, Node 24 từ 24.15.0, hoặc Node từ 26.0.0. Phiên bản pnpm được khai báo trong từng `package.json`. Bản demo chạy trên localhost và không cần MySQL.

Nếu đã có workspace, vào thư mục `local/` chứa file này. Nếu là lần đầu, clone trực tiếp repo cộng tác:

```powershell
git clone --branch local https://github.com/Arter2507/csn-dx24tt8016-toquangtuong-helpdesk-nodejs-local.git
Set-Location .\csn-dx24tt8016-toquangtuong-helpdesk-nodejs-local
```

Mở **hai terminal** tại thư mục chứa file này. Có thể xem phiên bản công cụ bằng `node --version` và `pnpm --version`.

### Terminal 1 — API Express

```powershell
Set-Location .\src\backend
pnpm install --frozen-lockfile
$env:DATA_SOURCE = 'demo'
$env:PORT = '3000'
pnpm dev
```

Đợi log báo API chạy ở cổng `3000`. Hai biến môi trường trên đủ để chạy demo.

### Terminal 2 — Giao diện Angular

```powershell
Set-Location .\src\frontend
pnpm install --frozen-lockfile
Remove-Item Env:PORT -ErrorAction SilentlyContinue
pnpm start --host 127.0.0.1 --port 4200
```

Đợi Angular build xong rồi mở [http://127.0.0.1:4200/](http://127.0.0.1:4200/). Angular chuyển `/api` đến Express ở `127.0.0.1:3000`.

- Nếu pnpm báo `ERR_PNPM_IGNORED_BUILDS` ở frontend, chạy `pnpm approve-builds`, chọn `@parcel/watcher` và `esbuild`, rồi chạy lại lệnh cài đặt. Cấu hình của repo đã ghi hai lựa chọn này.
- Nếu giao diện báo không tải được dữ liệu, mở [API danh mục](http://127.0.0.1:3000/api/v1/categories). Nếu có xung đột cổng, kiểm tra bằng `Get-NetTCPConnection -LocalPort 3000,4200 -State Listen -ErrorAction SilentlyContinue`.
- Dừng từng máy chủ bằng **Ctrl+C**. Khởi động lại Express sẽ đặt lại ticket, lịch sử và tệp đính kèm demo. Ghi chú nhanh và chế độ màu được lưu trên trình duyệt.

## Tiến độ đến 15/11/2026

| Hạng mục | Đã có trong bản demo |
| --- | --- |
| [Quản trị](http://127.0.0.1:4200/) | KPI toàn hệ thống, biểu đồ theo ngày và trạng thái, hàng đợi chưa phân công và lối vào báo cáo. |
| [Chuyên viên kỹ thuật](http://127.0.0.1:4200/dashboard/technician) | Công việc theo ngày cập nhật, lịch tuần tương tác, ghi chú nhanh và lối tắt đến việc được giao. |
| [Người dùng](http://127.0.0.1:4200/dashboard/user) | Yêu cầu đã gửi hôm nay hoặc tuần này, tối đa 5 yêu cầu còn mở có ưu tiên cao nhất, và mục chờ xác nhận. |
| Ticket | Tạo, tìm kiếm, lọc, phân trang, phân công và chuyển trạng thái. Form có kéo thả tệp, timeline và bảng yêu cầu trong ngày theo giờ Việt Nam. |
| Người dùng và danh mục | Tìm kiếm, lọc, tạo, sửa và ngừng hoạt động qua API demo. |
| Báo cáo | Lọc theo ngày tạo, loại và trạng thái, kèm biểu đồ, bảng tổng hợp và xuất CSV. |
| Giao diện Phase -1 | Tên và logo Trạm Mèo, mascot mèo đeo tai nghe, font Chivo có tiếng Việt, sáng/tối, sidebar thu gọn, breadcrumb, dropdown và scrollbar theo chủ đề. |

### Thử một luồng từ đầu đến cuối

1. Vào **Không gian người dùng → Tạo yêu cầu**. Chọn loại và mức ưu tiên. Có thể kéo thả tối đa 5 tệp PNG, JPEG, GIF, WebP hoặc PDF với tổng dung lượng 50 MB.
2. Vào **Tổng quan → Xem yêu cầu chưa phân công**, mở ticket vừa tạo, chọn **Kỹ thuật viên mẫu** và chuyển sang **Đang xử lý**. Vào dashboard chuyên viên để kiểm tra công việc hôm nay và lịch tuần.
3. Từ **Chuyên viên kỹ thuật**, chọn **Sang góc nhìn người gửi**. Dashboard dùng cùng tài khoản **Kỹ thuật viên mẫu**, hiển thị ticket do tài khoản này gửi. Tạo yêu cầu tại đây sẽ dùng sẵn đúng người gửi.
4. Chọn **Xem tiến độ** để kiểm tra timeline hoặc tải lại tệp đính kèm. Vào **Báo cáo**, áp dụng bộ lọc và xuất CSV. Một phiên demo mới bắt đầu với danh sách ticket trống.

### Kiểm thử và phạm vi

Angular build thành công, **2/2** bài kiểm thử Angular, **3/3** bài kiểm thử API và **5/5** ca hồi quy Playwright đã đạt trong đợt kiểm tra ngày 15/11/2026. Kiểm tra bổ sung trên Edge xác nhận luồng chuyển giữa hai góc nhìn, đúng người gửi khi tạo ticket và giao diện ở 320, 390, 768 px. Xem [hướng dẫn chạy lại kiểm thử](output/playwright/README.md).

Đăng nhập, phân quyền thực tế, lưu dữ liệu MySQL cho người dùng và ticket, lưu tệp dài hạn, thông báo, hồ sơ và sao lưu vẫn đang phát triển. Các dashboard hiện dùng tài khoản demo và dữ liệu trong phiên Express.

## Tài liệu và cộng tác

- [Thiết kế Phase -1](documents/Phase-1-Design-UI/), [hướng dẫn kỹ thuật](src/README.md), [bản đồ frontend](src/frontend/readme.map) và [bản đồ backend](src/backend/readme.map).
- Làm việc trên nhánh `local` của repo cộng tác. Repo gốc và nhánh `master` dành cho báo cáo và nộp bài. [Quy tắc làm việc](.ai/rules/working-rules.md) · [Quy tắc mã nguồn](.ai/rules/source-code.md).
- Giữ `.env`, thông tin kết nối, dependencies và sản phẩm build ngoài Git. Dùng Git LFS cho tệp được khai báo trong `.gitattributes`. Nếu tài liệu chỉ hiện nội dung pointer sau khi clone, cài Git LFS và chạy `git lfs pull`.
