# Docker trong dự án Trạm Hỗ Trợ

## Cấu hình đang dùng

Môi trường local chạy Angular, Express và MySQL 8.4 bằng một file Compose. Express chờ database sẵn sàng và áp dụng Prisma migration trước khi mở cổng. [Cấu hình production trên máy chủ](production.md)

Chạy các lệnh từ thư mục gốc nhánh `local`.

| Lệnh | Kết quả |
| --- | --- |
| `pnpm dev` | Khởi động Angular, Express và MySQL. Tạo cấu hình cục bộ ở lần chạy đầu. |
| `pnpm build` | Build chung hai image, gồm Angular build và kiểm tra cú pháp backend. |
| `pnpm check` | Kiểm tra kiểu và định dạng frontend, lint backend trong container. |
| `pnpm stop` | Dừng và gỡ container của Trạm Hỗ Trợ, giữ các volume. Đóng Docker Desktop cục bộ khi không có container khác đang chạy. |

Máy cần Docker Engine với **Docker Compose 2.23 trở lên** và Node/pnpm để gọi lệnh. Trên Docker Desktop, các lệnh khởi động và build có thể mở Desktop tự động khi đang chọn context Desktop. Với Docker Engine, khởi động engine theo cách của hệ điều hành.

Mở [http://127.0.0.1:4200/](http://127.0.0.1:4200/). `compose.yaml` công bố cổng frontend trên loopback của máy và truyền cổng này vào `src/frontend/scripts/serve-docker.mjs`. Script chạy Angular với `--host 0.0.0.0` trong container và in hai địa chỉ truy cập của máy theo cổng đã công bố. API mở tại `127.0.0.1:3000` và Angular chuyển `/api` đến `backend:3000`. MySQL chỉ dùng trong mạng Compose. Có thể đổi `FRONTEND_PORT` và `API_PORT` trong `docker/.env`.

```text
Local:   http://localhost:4200/
Network: http://127.0.0.1:4200/
```

### Cài thư viện trên máy mới

`pnpm dev` cài thư viện trong hai image bằng `pnpm install --frozen-lockfile`. Mỗi image dùng phiên bản pnpm ghi trong `package.json` của gói. Chính sách `allowBuilds` nằm trong `pnpm-workspace.yaml` của từng gói. Frontend cho phép `@parcel/watcher` và `esbuild`, từ chối script của `lmdb` và `msgpackr-extract`. Điều này xử lý trường hợp cài đặt trước đây dừng với `ERR_PNPM_IGNORED_BUILDS`. [Mã lỗi pnpm](https://pnpm.io/errors)

### Cập nhật khi lưu file

Giữ terminal `pnpm dev` và tab ở địa chỉ web local mở. Compose đồng bộ file vào container. Angular kiểm tra thay đổi mỗi giây, cập nhật CSS và template ngay khi có thể, hoặc tự tải lại trang sau khi biên dịch. [Angular CLI](https://angular.dev/cli/serve) · [Docker Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/)

| Thay đổi | Xử lý trong phiên dev đang mở |
| --- | --- |
| Mã frontend trong `src/frontend/src` | Angular biên dịch lại và tự cập nhật trình duyệt. |
| Tài nguyên trong `src/frontend/public` | Angular nhận cả file mới thêm, cập nhật và xóa sau khi Compose đồng bộ. |
| Mã Express trong `src/backend/src` | Node tự nạp lại API khi file đang dùng thay đổi. |
| Migration Prisma, cấu hình Angular, TypeScript hoặc proxy Docker của frontend | Compose đồng bộ và khởi động lại dịch vụ tương ứng. |
| `package.json`, `pnpm-lock.yaml` hoặc `pnpm-workspace.yaml` | Compose tự build lại image của gói thay đổi. Có thể mất vài phút khi cài lại thư viện. Khi đổi dependency, lưu manifest cùng lockfile tương ứng. |

Khởi động lại `pnpm dev` một lần khi cập nhật chính file Compose, Dockerfile hoặc biến trong `docker/.env`. Các thay đổi mã nguồn tiếp theo được xử lý trong cùng phiên dev.

### Dữ liệu và cấu hình

- Lần đầu chạy MySQL, script tạo mật khẩu và khóa JWT ngẫu nhiên vào `docker/.env` nếu file chưa có. File này hợp nhất cấu hình Compose. [Các biến hỗ trợ](.env.example)
- `MYSQL_SEED_SAMPLE=true` nạp tài khoản, 10 phiếu và 7 nhiệm vụ khi khởi tạo database local trống. Nếu bộ tài khoản mẫu đã có, quá trình seed chỉ bổ sung các bản ghi rà soát còn thiếu. Các giá trị mẫu dùng để thử bộ lọc và lịch. [Tài khoản mẫu](../README.md#tài-khoản-mẫu)
- FAQ mẫu được nạp khi cơ sở dữ liệu phát triển có tài khoản mẫu, chế độ nạp mẫu đang bật và bảng FAQ chưa từng có bài. Bài do quản trị viên tạo hoặc lưu trữ vẫn được giữ. Tên dự án Compose `tram-meo` là mã kỹ thuật dùng để nhận diện các volume đang có.
- Named volumes `mysql_data`, `uploads` và `backups` lần lượt giữ database, tệp của API MySQL và bản sao ZIP. `pnpm stop` giữ các volume này.
- MySQL trong Docker khởi tạo volume riêng. Nếu đang có dữ liệu trên MySQL cài trực tiếp, dùng quy trình chuyển dữ liệu riêng trước khi chuyển sang volume Docker.
- Các cổng ứng dụng chỉ lắng nghe trên loopback của máy host. Docker setup này dùng cho phát triển cục bộ.

### Xem trạng thái và log

```powershell
docker compose --env-file docker/.env -f docker/compose.yaml ps
docker compose --env-file docker/.env -f docker/compose.yaml logs -f backend
```

Có thể chạy `pnpm stop` ở terminal khác trong lúc lệnh dev đang hiển thị log.

## Đề xuất ban đầu phục vụ đối chiếu

### 1. Mục đích

Trạm Hỗ Trợ gồm Angular frontend, Express API, Prisma và MySQL. Docker có thể đóng gói môi trường chạy để các máy phát triển, máy kiểm thử và máy triển khai dùng cùng phiên bản dịch vụ, giảm khác biệt do cài đặt MySQL hoặc cấu hình máy.

Docker không thay thế mã nguồn, migration, kiểm thử hay sao lưu. Image chứa phần mềm; dữ liệu MySQL, tệp đính kèm và bản sao lưu cần được lưu riêng bằng volume hoặc dịch vụ lưu trữ phù hợp.

### 2. Mức độ khuyến nghị

| Mức | Phạm vi | Khuyến nghị |
| --- | --- | --- |
| 1 — Database local | Chạy MySQL trong container; tiếp tục chạy Angular và API bằng pnpm trên máy | **Nên làm trước.** Ít thay đổi quy trình hiện tại, dùng được cho `DATA_SOURCE=mysql`, migration và kiểm thử tích hợp. |
| 2 — Môi trường phát triển đầy đủ | Compose chạy MySQL, Express API và Angular | Chỉ thêm khi cần khởi động demo bằng một lệnh hoặc onboarding nhiều máy. Cần cấu hình hot reload, cổng và volume mã nguồn. |
| 3 — Đóng gói triển khai | Image riêng cho API và frontend; database ở dịch vụ MySQL quản lý | Dùng khi nơi triển khai yêu cầu container. Không nên đưa database production vào cùng vòng đời container ứng dụng. |

Hiện tại nên ưu tiên **Mức 1**. Project đã có chế độ demo trong bộ nhớ và hướng dẫn chạy pnpm; container hóa toàn bộ ứng dụng ngay sẽ tăng cấu hình mà chưa mang lại lợi ích tương xứng.

### 3. Tính khả biến và giới hạn

Docker giúp môi trường nhất quán giữa Windows, Linux, CI và máy chủ có Docker. Có thể ghim phiên bản Node/MySQL, mô tả service bằng Compose và tái tạo môi trường mà không cần cài MySQL trực tiếp trên máy.

Tính khả biến không có nghĩa là mọi thứ tự động giống hệt nhau:

- Máy vẫn cần Docker Engine/Desktop; image phải hỗ trợ kiến trúc CPU của máy hoặc được build cho kiến trúc đích.
- Cấu hình riêng như mật khẩu, `JWT_SECRET`, URL database và CORS phải được cung cấp cho từng môi trường, không đóng cứng vào image.
- Dữ liệu trong container có thể mất khi container bị thay thế. MySQL cần volume; `UPLOAD_DIR` và `BACKUP_DIR` cũng cần lưu bền nếu API chạy trong container.
- Khi API chạy trên máy host, database thường ở `127.0.0.1`; khi API chạy trong Compose, nó kết nối bằng tên service, ví dụ `db`. Không dùng `localhost` để API container gọi sang container database.
- Trình duyệt của người dùng truy cập frontend/API qua cổng đã publish trên host; URL nội bộ giữa các container không dùng được trực tiếp từ trình duyệt.
- Volume, quyền truy cập tệp và phân biệt chữ hoa/thường có thể khác giữa Windows và Linux. Cần kiểm tra upload, backup và build trên đúng môi trường triển khai.

Docker đóng gói ứng dụng và dịch vụ, không tự chuyển dữ liệu từ máy này sang máy khác. Muốn chuyển dữ liệu phải dùng backup/restore hoặc quy trình migration.

### 4. Cấu hình đề xuất cho Mức 1

Tạo Compose file trong thư mục này (ví dụ `compose.yaml`) để chỉ chạy MySQL 8.4. Đây là cấu hình tham khảo, chưa được thêm hoặc kiểm thử như cấu hình chạy thực tế:

```yaml
services:
  db:
    image: mysql:8.4
    environment:
      MYSQL_DATABASE: ${MYSQL_DATABASE:?Set MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER:?Set MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:?Set MYSQL_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?Set MYSQL_ROOT_PASSWORD}
    ports:
      - "127.0.0.1:3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "mysqladmin ping -h 127.0.0.1 -u root -p\"$${MYSQL_ROOT_PASSWORD}\" --silent",
        ]
      interval: 5s
      timeout: 5s
      retries: 20

volumes:
  mysql_data:
```

Giá trị `MYSQL_*` được đọc từ file `.env` cạnh Compose file; chỉ dùng mật khẩu thử nghiệm cục bộ và không commit file này. Cổng chỉ bind vào loopback để tránh mở MySQL ra mạng. Volume `mysql_data` giữ dữ liệu khi container được tạo lại.

Khi API chạy trên máy host, cấu hình backend `src/backend/.env` trỏ đến `127.0.0.1:3306`, chọn `DATA_SOURCE=mysql`, và đặt `DATABASE_URL` cùng database/tài khoản với Compose. Ví dụ định dạng:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=helpdesk
DB_USER=helpdesk_app
DB_PASSWORD=<mật-khẩu-cục-bộ>
DATABASE_URL=mysql://helpdesk_app:<mật-khẩu-đã-URL-encode>@127.0.0.1:3306/helpdesk
DATA_SOURCE=mysql
```

Thay placeholder bằng giá trị cục bộ; không dùng nội dung ví dụ làm thông tin xác thực thực. Mật khẩu có ký tự đặc biệt phải URL-encode trong `DATABASE_URL`. Giữ `JWT_SECRET` riêng trong `.env`, không đưa vào image hoặc Git.

Sau khi database báo healthy, chạy migration từ `src/backend` bằng `pnpm exec prisma migrate deploy`; chỉ nạp dữ liệu mẫu vào database thử nghiệm trống. Dừng database bằng `docker compose down`; lệnh này giữ volume. `docker compose down -v` xóa volume và toàn bộ dữ liệu MySQL — chỉ dùng khi chủ ý xóa dữ liệu local.

### 5. Nếu nâng lên Mức 2 hoặc Mức 3

- Mức 2: thêm API và frontend thành service riêng; khai báo healthcheck/điều kiện database sẵn sàng, cấu hình API nhận `DATABASE_URL` qua tên service `db`, và publish frontend/API theo luồng hiện có. Với phát triển, giữ hot reload và mount mã nguồn; không mount đè `node_modules`.
- Mức 3: build frontend Angular thành static assets và phục vụ bằng web server; chạy API bằng image Node riêng, dùng user không phải root và chỉ cài dependency cần cho runtime. Đưa MySQL ra dịch vụ quản lý hoặc máy chủ database riêng.
- Nếu API được container hóa, mount thư mục riêng cho `UPLOAD_DIR` và `BACKUP_DIR`; đặt giới hạn truy cập, sao lưu định kỳ, và không public các thư mục này. Backup có thể chứa thông tin ticket và tệp người dùng.
- Build image theo kiến trúc môi trường đích, không chép `.env`, backup hoặc upload vào image. Cấp secrets từ môi trường triển khai; không ghi secrets vào Dockerfile, Compose file đã commit hoặc log.

### 6. Kết luận

Docker có giá trị thực tế nhất với dự án hiện tại ở việc cung cấp **MySQL local có phiên bản và dữ liệu nhất quán**. Giữ frontend/backend chạy pnpm trước; chỉ container hóa toàn hệ thống khi cần chạy demo một lệnh, kiểm thử CI hoặc triển khai trên nền tảng yêu cầu Docker.
