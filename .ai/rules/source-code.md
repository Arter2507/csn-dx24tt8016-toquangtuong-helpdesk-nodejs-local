# Quy tắc mã nguồn

Áp dụng SRP, DRY, KISS và tách trách nhiệm. Backend theo Route → Controller → Service → Repository → MySQL; dùng middleware cho validation, xác thực, phân quyền và lỗi. Frontend tách giao diện, service, interface và dùng Angular dependency injection.

Tuân thủ thiết kế trong documents/markdown: API /api/v1, response thống nhất, validation, tìm kiếm, lọc, sắp xếp theo danh sách cho phép, phân trang và phân quyền. Không xóa cứng dữ liệu có lịch sử. Không coi mẫu demo là hệ thống an toàn để triển khai.

Không hard-code bí mật, thông tin kết nối hoặc URL API; dùng cấu hình môi trường và .env.example, không commit .env. Chuẩn bị MySQL ngay cả khi chưa có kết nối; ghi rõ bước tạo schema và chức năng chưa triển khai. Không tự thêm CQRS, event sourcing, microservice hay DDD phức tạp. Tái sử dụng khi thực sự dùng chung và kiểm thử thay đổi có ý nghĩa.
