# Trạm Mèo

**Có sự cố, có Mèo.** · **v0.2.0**

Website quản lý yêu cầu hỗ trợ kỹ thuật — Tô Quang Tường, DX24TT8016, hướng dẫn TS. Nguyễn Nhứt Lam. Repo cộng tác `-local`, nhánh `local`. Giới thiệu đồ án: [README.md](README.md).

## Cài đặt và khởi động

Cài Docker Desktop hoặc Docker Engine có Compose, cùng Node và pnpm để gọi lệnh. Chạy `pnpm dev` ở thư mục chứa `docker/compose.yaml` và `setup/docker.mjs`. Docker tự cài thư viện của frontend và backend từ lockfile đã lưu. Máy mới chỉ cần lệnh khởi động bên dưới.

```powershell
git clone --branch local https://github.com/Arter2507/csn-dx24tt8016-toquangtuong-helpdesk-nodejs-local.git
Set-Location .\csn-dx24tt8016-toquangtuong-helpdesk-nodejs-local
pnpm dev
```

Mở [http://127.0.0.1:4200/](http://127.0.0.1:4200/). Terminal hiển thị `Local: http://localhost:4200/` và `Network: http://127.0.0.1:4200/` theo cổng cấu hình. Lần đầu build có thể mất vài phút vì Docker tải image và cài thư viện.

`pnpm dev` khởi động Angular, Express và MySQL. Lệnh tự tạo `docker/.env` ở lần chạy đầu và áp dụng Prisma migration. Database trống nhận bộ dữ liệu rà soát khi `MYSQL_SEED_SAMPLE=true`. `pnpm dev:mysql` là tên lệnh tương thích.

Giữ terminal `pnpm dev` mở khi làm việc. Sau khi lưu HTML, CSS hoặc TypeScript trong `src/frontend/src`, Angular tự cập nhật tab trình duyệt. Compose cũng đồng bộ ảnh trong `src/frontend/public`, tự nạp lại Express khi mã backend thay đổi và build lại dịch vụ tương ứng khi đổi dependency hoặc lockfile. Nếu đang chạy cấu hình dev cũ, khởi động lại `pnpm dev` một lần để áp dụng cấu hình theo dõi mới. [Chi tiết cài đặt và live reload](docker/README.md)

### Tài khoản mẫu

| Email | Vai trò |
| --- | --- |
| `user@example.test` | USER |
| `tech@example.test` | USER + TECHNICIAN |
| `admin@example.test` | OWNER |

Mật khẩu của tài khoản mẫu là `password`, dùng cho dữ liệu phát triển cục bộ.

## Lệnh pnpm ở thư mục gốc

| Lệnh | Kết quả |
| --- | --- |
| `pnpm dev` | Chạy API, Angular và MySQL trong Docker. |
| `pnpm build` | Build chung image backend và frontend. |
| `pnpm check` | Typecheck và lint hai gói trong Docker. |
| `pnpm stop` | Dừng Trạm Mèo, giữ volume và đóng Docker Desktop nếu không còn container khác đang chạy. |

Cấu hình cổng, dữ liệu và cách xem log nằm trong [hướng dẫn Docker](docker/README.md). Có thể chạy `pnpm stop` từ terminal khác khi đang xem log dev.

### Rà soát trên dữ liệu thật trong MySQL local

- Đăng nhập bằng tài khoản Chủ sở hữu mẫu. Trong **Cài đặt → Tổ chức → Cơ cấu tổ chức → Sơ đồ cây**, tìm mã `HA-TANG` để xem đơn vị Mạng & Hạ tầng cùng các nhánh cấp trên trong dữ liệu mẫu của bản cài mới. Dùng nút cạnh tên để mở hoặc thu gọn nhánh. Chủ sở hữu có thể thêm, chuyển hoặc ngưng sử dụng đơn vị. Danh sách phân cấp, sơ đồ liên kết và bảng phân quyền vẫn dùng để tra cứu vai trò.
- Trong **Nhân sự**, chọn đơn vị tại phần Thông tin công việc. Tích các tài khoản cấp dưới để khóa hoặc mở khóa cùng lúc. Tại **Danh mục → Loại phiếu**, tích các dòng để bật hoặc ngưng sử dụng. Việc ngưng sử dụng giữ lại liên kết trên các phiếu đã có.
- Mở **Yêu cầu hỗ trợ** và gõ `TM`, `MAU`, `TM-MAU-05` hoặc `mạng` để xem gợi ý và kết quả khi nhập. Các bộ lọc tự áp dụng khi chọn. Đổi cỡ trang tại **Số dòng mỗi trang**. Bộ dữ liệu mới có 10 phiếu rải theo nhiều ngày và tháng.
- Đăng nhập bằng chuyên viên mẫu để xem **Lịch tuần**. Chọn ngày có dấu màu rồi bấm tên nhiệm vụ. Trong **Nhiệm vụ nhóm → Lịch**, ngày hôm nay có nhãn và mỗi nhiệm vụ có trạng thái. Bấm nhiệm vụ để xem trường chi tiết.
- Bộ mẫu này chạy trên MySQL local. [Thiết lập máy chủ production](docker/production.md) và [kế hoạch IAM/RBAC](documents/markdown/ke-hoach-iam-rbac.md) dùng cấu hình riêng.

### Mã phiếu và quy trình xử lý

- Chủ sở hữu vào **Cài đặt → Quy tắc đánh số phiếu**, bấm **Sửa** trên dòng **Mạng**. Nhập tiền tố `PYCM`, giá trị phần số `1`, số ký tự `5` và để trống hậu tố. Sau khi bấm **Lưu thay đổi**, nếu mã chưa được sử dụng, phiếu mới đầu tiên nhận `PYCM00001` và phiếu kế tiếp nhận `PYCM00002`.
- Form tạo phiếu hiện `#0000` trước khi chọn loại. Sau khi chọn, form hiện số tiếp theo theo quy tắc hiện hành. Các loại chưa đặt quy tắc dùng dãy chung bắt đầu từ `#0001`. Hệ thống chốt mã khi gửi phiếu, vì vậy số xem trước có thể đổi nếu có phiếu khác được tạo trước. Có thể tìm phiếu bằng mã đã cấp, có hoặc không có dấu `#`.
- Trên MySQL, quản trị viên hoặc chuyên viên phụ trách có thể chuyển phiếu đang xử lý sang **Chờ người gửi phản hồi** và ghi rõ thông tin còn thiếu. Khi người gửi trả lời trong phiếu, trạng thái tự trở về **Đang xử lý**. Ghi chú nội bộ chỉ quản trị viên và chuyên viên phụ trách xem được.
- Bấm mã, tiêu đề hoặc **Xem** để mở cửa sổ xem nhanh. **Sửa phiếu** dùng để cập nhật nội dung và tệp theo quyền. Ở phần chi tiết, quản trị viên chọn người phụ trách từ danh sách xếp theo chuyên môn và số phiếu đang xử lý. Chuyên viên tiếp nhận và ghi giải pháp khi hoàn tất. Người gửi xác nhận đóng hoặc yêu cầu xử lý lại.
- **Chat hỗ trợ** cập nhật định kỳ khi tab đang mở. Sau khi hoàn tất hoặc đóng phiếu, người xem được gửi thêm trong 24 giờ tính từ lần chuyển trạng thái tương ứng. Hết hạn, lịch sử vẫn xem được. Trợ giúp viên có thể chèn hướng dẫn công khai vào phản hồi và chèn hướng dẫn nội bộ vào ghi chú nội bộ.
- Quy tắc đánh số và bộ đếm lưu trong MySQL. Bản sao ZIP chứa mã phiếu và quy tắc đánh số.
- Chủ sở hữu và Quản trị viên tích phiếu để mở các thao tác ngay trên bảng. Một dòng cho phép sửa hoặc xem theo quyền và xóa mềm. Nhiều dòng cho phép đổi người phụ trách, gộp hoặc xóa mềm qua menu thao tác. Đổi người phụ trách và gộp yêu cầu cùng loại. Khi gộp, chọn phiếu chính chưa đóng trong nhóm cùng người gửi. Phiếu chính liên kết tới các phiếu gốc để xem lại.

## Tiến độ đến 27/11/2026

**Danh mục dịch vụ và SLA.** Admin và Owner tạo danh mục cha–con, chỉnh lịch làm việc và đặt hạn theo mức ưu tiên hoặc nhóm VIP. Trong **Cài đặt → Thời hạn hỗ trợ (SLA)**, bật áp dụng sau khi kiểm tra lịch. Phiếu mới hiện hạn phản hồi và xử lý. [Hướng dẫn và kế hoạch SLA](documents/markdown/ke-hoach-danh-muc-dich-vu-sla.md)

**Cơ cấu tổ chức.** Trong **Sơ đồ cây** hoặc **Sơ đồ liên kết**, Chủ sở hữu mở **Thao tác** trên dòng đơn vị để chọn **Sửa đơn vị** hoặc **Xóa đơn vị**. Xóa mềm áp dụng cho đơn vị đã chuyển hết nhân sự và đơn vị trực thuộc. Menu của dòng nhân sự dùng để sửa hồ sơ hoặc khóa/mở khóa tài khoản theo quyền. Nếu cơ cấu chưa có đơn vị, bấm **Thêm đơn vị** để tạo đơn vị đầu tiên. Trong sơ đồ liên kết, kéo để di chuyển, cuộn hoặc dùng nút để thu phóng và chọn **Vừa khung** để xem toàn bộ.

**Kho hướng dẫn.** Mở **Kho hướng dẫn** từ màn hình đăng nhập hoặc thanh điều hướng. Tìm theo tiêu đề, nội dung hoặc loại phiếu. Bài công khai xuất hiện trong gợi ý khi nhập tiêu đề phiếu. Owner/Admin tạo, sửa và lưu trữ bài. Bài nội bộ mở được với Owner, Admin và Technician. Cài mới có bộ bài hướng dẫn mẫu nếu bật nạp dữ liệu rà soát. Hệ thống chạy migration để tạo bảng trên các database đã có dữ liệu.

Bấm chuông để mở bảng xem nhanh. MySQL lưu thông báo phân công, phản hồi, thay đổi trạng thái và cảnh báo sắp đến hạn SLA. SSE cập nhật chuông, toast và trang Thông báo khi có thay đổi. Có thể bật/tắt toast trong Cài đặt. [Cấu hình Email và Email-to-Ticket](documents/markdown/thong-bao-da-kenh.md)

| Hạng mục | Trạng thái |
| --- | --- |
| UI ba vai trò, ticket, báo cáo, hồ sơ và i18n | Luồng sử dụng chính đọc và ghi MySQL. |
| Môi trường Docker Compose | MySQL là mặc định. Có cấu hình production riêng với frontend tĩnh, HTTPS và API cùng origin. |
| MySQL schema, Prisma migration, seed/sample SQL | Xong (B1) |
| API categories / users / tickets đọc MySQL khi `DATA_SOURCE=mysql` | Xong khung CRUD |
| Tổ chức và nhân sự | Cơ cấu bốn vai trò, bảng cây đơn vị, sơ đồ liên kết, hồ sơ nhân sự, đổi vai trò, khóa và mở khóa từng tài khoản hoặc hàng loạt. |
| Đăng nhập và phiên MySQL | Tự đăng ký, chờ cấp quyền, liên kết tài khoản theo email hoặc đặt mật khẩu bằng liên kết kích hoạt dùng một lần. |
| Bộ nhận diện Trạm Mèo | Logo trên tổng quan, favicon 32/48/64 px, minh họa nét bút ở trang đăng nhập và mascot ở trang chờ cấp quyền. |
| Xử lý yêu cầu MySQL | Tìm trực tiếp theo mã một phần và loại, lọc ngay, phân trang, phân công, trao đổi, xóa mềm và gộp phiếu. |
| Tệp và thông báo MySQL | Tệp lưu trong `UPLOAD_DIR` của backend. Thông báo và trạng thái đã đọc lưu theo tài khoản. |
| Sao lưu | Chủ sở hữu tạo ZIP, tải xuống và khôi phục từ lịch sử. |
| Hồ sơ | Tab thông tin, vai trò, bảo mật và quản lý ảnh đại diện. Người quản lý cấp trên có thể đổi email của nhân sự dưới quyền. |
| Nhiệm vụ nhóm | Bảng kéo thả, lịch tháng, lịch tuần của chuyên viên và chi tiết mở từ lịch. |
| Danh mục chung | Tập trung danh sách người dùng và loại phiếu. |
| Phòng ban và quyền theo phòng | Đơn vị trực thuộc và liên kết hồ sơ đã lưu trong MySQL. Hàng đợi, định tuyến và quyền trên phiếu theo phòng thuộc giai đoạn tiếp theo. |

Xem [báo cáo tiến độ hiện hành](progress-report/bao-cao-tien-do-local-2026-11-27.md), [bảng phân công](documents/markdown/tram-meo-tien-do-va-phan-cong.md) và [nhiệm vụ thiết kế lại giao diện](documents/markdown/nhiem-vu-thiet-ke-lai-giao-dien.md).

### Cấp quyền cho nhân sự

1. Người dùng tự đăng ký ở màn hình đăng nhập. Sau khi đăng nhập, tài khoản ở màn hình **Chờ cấp quyền truy cập**.
2. Chủ sở hữu hoặc Quản trị viên mở **Cài đặt → Tổ chức → Nhân sự → Thêm nhân sự**. Xác nhận người đăng ký đúng là nhân sự trước khi cấp quyền bằng email của họ.
3. Với email đã đăng ký, người dùng đăng nhập lại để mở không gian được cấp. Với email mới, sao chép liên kết kích hoạt đang hiển thị và gửi riêng để người dùng đặt mật khẩu. Liên kết có hạn 24 giờ, dùng một lần và có thể cấp lại từ menu **Thao tác**.
4. Chủ sở hữu quản lý Admin trở xuống. Admin quản lý Chuyên viên và Người dùng. Việc khóa hoặc đổi vai trò thu hồi các phiên hiện hành của tài khoản đó.

Mỗi bản cài đặt phục vụ một tổ chức. Chuyên viên theo dõi phiếu được giao và phiếu mình tạo trong cùng một dashboard. [Mô hình IAM/RBAC, ERD và API](documents/markdown/ke-hoach-iam-rbac.md)

### Thử nhanh trên web

1. **Người dùng → Tạo yêu cầu** (kéo thả tối đa 5 tệp, tổng 50 MB).
2. Trong **Yêu cầu hỗ trợ**, mở phiếu mới, chọn **Phân công / Điều phối lại**, rồi bấm **Tiếp nhận xử lý** bằng tài khoản phụ trách.
3. Mở **Hồ sơ** để thử các tab, tải ảnh và kiểm tra email ở chế độ chỉ đọc. Đổi email của tài khoản khác từ **Người dùng** bằng tài khoản quản trị.
4. Mở **Nhiệm vụ nhóm** bằng vai trò quản trị hoặc chuyên viên để tạo, phân công và chuyển trạng thái. Kiểm tra cùng nhiệm vụ trên **Lịch** và **Danh sách**.
5. Trên dữ liệu thử, tạo bản sao ở **Sao lưu**, sửa một nhiệm vụ rồi chọn **Khôi phục** để kiểm tra kết quả và bản dự phòng.

Với MySQL, Docker nạp ticket mẫu khi khởi tạo database trống theo cấu hình mặc định. Dữ liệu được lưu trong volume MySQL.

### Sao lưu và mức ưu tiên

- Vào **Sao lưu** bằng tài khoản Chủ sở hữu để tạo bản sao thủ công, theo dõi tiến độ và tải ZIP từ lịch sử. Bản ZIP có `data.json` và nội dung tệp đính kèm. Khi chạy Docker, bản sao nằm trong volume `backups`. `BACKUP_DIR` trong container là `/data/backups`. Cấu hình dùng thư mục riêng cho demo và từng cấu hình MySQL. Bản sao chứa dữ liệu nghiệp vụ, gồm cả mục đã lưu trữ. Chọn **Khôi phục** ở một bản ZIP trong lịch sử và xác nhận. Máy chủ tạo bản dự phòng trước khi thay dữ liệu. MySQL giữ thông tin đăng nhập, email và quyền hiện tại, đồng thời yêu cầu các tài khoản được tham chiếu vẫn tồn tại.
- Bật **Sao lưu tự động** và lưu lịch 30 phút, 1 giờ, 3 giờ, 6 giờ hoặc 24 giờ. Nếu đến hạn, hệ thống khởi chạy khi Chủ sở hữu mở web trong phiên đăng nhập. Trang kiểm tra lịch ngay khi mở và mỗi 30 giây. Sau khi khởi chạy, backend thực hiện công việc và lưu kết quả dù người dùng chuyển trang hoặc đóng tab.
- Tên và vai trò người gửi lấy từ phiên đăng nhập. Backend ước lượng mức ưu tiên từ tiêu đề và mô tả lúc tạo yêu cầu. Quản trị viên và chuyên viên phụ trách có thể sửa trên yêu cầu chưa đóng. Chỉnh cụm từ tại [priority-rules.json](src/backend/src/modules/tickets/priority-rules.json).

### Kiểm thử

Xem [lệnh kiểm thử trong Docker](src/README.md#kiểm-thử-thông-qua-docker). Ca tích hợp MySQL tùy chọn cần `HELPDESK_TEST_MYSQL=1` và các biến `DB_*` dành riêng cho kiểm thử. Ca này tạo và dọn schema thử, nên tài khoản kiểm thử cần quyền tạo và xóa schema thử.

Ngày 27/11/2026 đã kiểm tra Angular và Express, quy trình phiếu trên MySQL, quyền của Kho hướng dẫn, khóa chat 24 giờ, khôi phục nội dung bài viết và địa chỉ truy cập trong Docker. [Kết quả kiểm tra hiện hành](progress-report/bao-cao-tien-do-local-2026-11-27.md#kiểm-chứng)

Ngày 26/11/2026 đã kiểm tra hai địa chỉ đăng nhập local, khởi tạo MySQL trống và nâng cấp dữ liệu có sẵn. Edge xác nhận tìm trực tiếp, bộ lọc, cỡ trang, bảng nhân sự và ba chế độ xem tổ chức. MySQL xác nhận phân quyền và thao tác phân công, gộp nhiều phiếu. [Kết quả ngày 26/11](progress-report/bao-cao-tien-do-local-2026-11-26.md#kiểm-chứng)

Ngày 25/11/2026 đã kiểm tra Docker, dữ liệu rà soát, danh mục và lịch. Cấu hình production được thử qua HTTPS cục bộ với dữ liệu riêng. [Kết quả ngày 25/11](progress-report/bao-cao-tien-do-local-2026-11-25.md#kiểm-chứng)

23/11/2026: Đã chạy kiểm thử Angular, API demo và tích hợp MySQL. Bộ Playwright demo có 7 ca. Các lượt kiểm tra riêng trên Edge đã xác nhận ảnh đại diện, ba chế độ xem nhiệm vụ, kéo thả, tích hoàn thành và khôi phục từ lịch sử. Xem [báo cáo nội bộ](progress-report/bao-cao-tien-do-local-2026-11-23.md).

16/11/2026: Angular build OK; 2/2 test Angular; 5/5 test API; 5/5 Playwright. `typecheck:lint` frontend/backend và API MySQL (5 ticket) đã xác nhận. Xem [output/playwright/README.md](output/playwright/README.md).

## Tài liệu

- [Tiến độ và phân công](documents/markdown/tram-meo-tien-do-va-phan-cong.md) · [API](documents/markdown/api-contract-demo.md) · [CSDL](documents/markdown/database-demo.md)
- [Hướng dẫn kỹ thuật](src/README.md) · [Phase -1 UI](documents/Phase-1-Design-UI/)
- Quy tắc: [.ai/rules/working-rules.md](.ai/rules/working-rules.md) · [.ai/rules/source-code.md](.ai/rules/source-code.md)
- Không commit `.env`, `node_modules`, `dist`, `.angular`. Git LFS: `git lfs pull` nếu tài liệu chỉ hiện pointer.
