# Tổng quan làm việc local

Đây là không gian phát triển của đồ án **Website quản lý yêu cầu hỗ trợ kỹ thuật** của Tô Quang Tường, lớp DX24TT8016, giảng viên hướng dẫn TS. Nguyễn Nhứt Lam. Mục tiêu và thông tin chính thức nằm trong [README.md](README.md); yêu cầu, biểu mẫu và kế hoạch gốc nằm trong `documents/`. Chức năng dự kiến gồm tiếp nhận, phân loại, ưu tiên, phân công, cập nhật trạng thái, tìm kiếm và thống kê yêu cầu.

## Sơ đồ

```text
Dự án gốc/                    Repository báo cáo cá nhân (master)
├── .gitignore                Bỏ qua local/
├── docker/, progress-report/, setup/, soft/, src/, thesis/, README.md
└── local/                    Repository phát triển riêng (nhánh local)
    ├── .ai/rules/            Quy tắc làm việc của các mô hình AI (trên repo -local)
    ├── documents/            Quy định, biểu mẫu, rubric và kế hoạch (trên repo -local)
    ├── docker/               Tệp Docker nếu sử dụng
    ├── progress-report/      Báo cáo tiến độ
    ├── setup/                Cài đặt, dữ liệu thử và triển khai
    ├── soft/                 Phần mềm liên quan
    ├── src/backend/          Node.js / Express, hiện mới có package và lockfile
    ├── src/frontend/         Angular
    ├── thesis/               Tài liệu đồ án và tham khảo
    ├── README.md             Giới thiệu chia sẻ cùng mã nguồn
    └── README.local.md       Hướng dẫn cộng tác trên repo -local
```

Các thư mục rỗng có `.gitkeep` để xuất hiện trong Git. `documents/` gồm `docx/` (mẫu báo cáo), `pdf/` (quy định và rubric), `xlsx/` (đề tài và kế hoạch). Đọc tài liệu gốc khi thực hiện phần liên quan.

## Quy trình

1. Mở terminal trong `local/`, đọc `.ai/rules/working-rules.md`, kiểm tra `git status --short --branch` và `git remote -v`. Làm việc trên nhánh `local`.
2. Repository `-local` công khai là nơi cộng tác, nhận pull request; kiểm tra nội dung trước khi commit/push. Đồng bộ cả `documents/`, `.ai/` và `README.local.md`; không commit secrets, dependencies hay sản phẩm build.
3. Khi cần báo cáo hoặc nộp bài, chỉ sau khi chủ dự án duyệt và yêu cầu push mới đồng bộ các thư mục chia sẻ và `README.md` sang dự án gốc, xem diff, merge và push `master`; không đưa `documents/`, `.ai/` hay `README.local.md` vào repository gốc. Không tự xóa hoặc ghi đè dữ liệu chưa kiểm tra.
4. File lớn phù hợp được quản lý bằng Git LFS theo `.gitattributes`; cài Git LFS trên máy cộng tác và kiểm tra hạn mức lưu trữ/băng thông.

## Môi trường và chạy thử

Công nghệ dự kiến: Angular, Node.js/Express và MySQL. Frontend khai báo `pnpm@12.8.1`; trong `src/frontend/` có thể chạy `pnpm install` rồi `pnpm start` theo README của frontend. Backend khai báo `pnpm@12.16.1` và Express nhưng chưa có lệnh chạy ứng dụng trong `package.json`; chưa có hướng dẫn chạy hệ thống hoàn chỉnh được xác minh. Không giả định MySQL hoặc Docker đã được cấu hình.

## Dành cho AI

Đọc `.ai/rules/working-rules.md` trước mọi thay đổi, cùng `README.md` và các tài liệu liên quan trong `documents/`. `.ai/` là nơi chứa skill và quy chuẩn làm việc nội bộ; chỉ sử dụng skill thực sự tồn tại và phù hợp. Cập nhật tài liệu theo tình trạng đã kiểm chứng.

