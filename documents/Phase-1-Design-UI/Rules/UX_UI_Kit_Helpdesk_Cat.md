# UX/UI KIT TEMPLATE — WEBSITE HỖ TRỢ KỸ THUẬT

**Phiên bản:** 1.0 · **Loại tài liệu:** Đề xuất thiết kế · **Phạm vi:** website quản lý yêu cầu hỗ trợ kỹ thuật

> Nguồn cảm hứng là ảnh dashboard do người dùng cung cấp. Các giá trị màu, kích thước và bố cục dưới đây là thông số đề xuất để triển khai, không phải số đo trích xuất chính xác từ ảnh. “Cat mosco” được diễn giải tạm thời là phong cách có linh vật mèo (*cat mascot*) nhẹ nhàng; chưa có hình mẫu nhân vật cụ thể để đối chiếu.

## 1. Định hướng thiết kế

### 1.1. Mục tiêu

Thiết kế giao diện quản lý hỗ trợ kỹ thuật có cảm giác **hiện đại, thân thiện, gọn gàng và dễ theo dõi**. Người dùng nhìn thấy nhanh yêu cầu của mình; chuyên viên biết việc cần xử lý; quản trị viên nhận diện yêu cầu chưa phân công và theo dõi tình hình chung.

**Từ khóa:** Dashboard mềm mại · kỹ thuật đáng tin cậy · mèo thân thiện · dữ liệu dễ đọc · thao tác rõ ràng.

### 1.2. Phân tích ảnh tham khảo

| Thành phần nhìn thấy trong ảnh | Đặc điểm | Cách áp dụng cho Helpdesk |
|---|---|---|
| Nền tổng thể | Nền rất sáng pha tím/xám; các khối nội dung màu trắng tách khỏi nền | Nền tím xám nhạt, bề mặt trắng; giảm màu nền ở các trang biểu mẫu dài |
| Thanh trên | Thanh trắng bo tròn mạnh; có điều hướng, tìm kiếm, thông báo, nút chính và tài khoản | Tên hệ thống, tìm kiếm ticket, thông báo, tạo yêu cầu và tài khoản |
| Thanh bên | Thanh hẹp, dạng viên thuốc, chủ yếu dùng biểu tượng | Giữ dáng bo tròn; bổ sung nhãn khi mở rộng và tên truy cập cho từng biểu tượng |
| Vùng chào | Lời chào, thông tin ngắn và nút thao tác | Tóm tắt việc cần xử lý theo vai trò; CTA phù hợp quyền |
| Thẻ chỉ số | Nền trắng, bo góc lớn, biểu tượng tròn có màu, số nổi bật | Thống kê ticket; màu biểu tượng dùng tiết chế, con số có nhãn rõ |
| Biểu đồ | Các khối trắng lớn, biểu đồ đơn giản, sử dụng tím nổi bật | Biểu đồ theo trạng thái, thời gian hoặc loại yêu cầu, kèm bảng/tóm tắt bằng chữ |
| Khoảng trắng và bóng | Các khối cách nhau tương đối rộng; bóng mờ nhẹ | Hệ thống khoảng cách nhất quán, bóng nhẹ, không làm giảm khả năng đọc |

**Giữ tinh thần:** thẻ trắng, góc tròn, tím chủ đạo, khoảng trắng thoáng, thanh điều hướng mềm. **Điều chỉnh cho nghiệp vụ:** bảng ticket dễ quét, mức ưu tiên và trạng thái có chữ, biểu mẫu rõ ràng, giao diện phù hợp từng vai trò.

### 1.3. Nguyên tắc sử dụng hình tượng mèo

- Dùng linh vật mèo nét đơn giản, hình khối tròn, nét viền mềm, màu trung tính; có thể thêm tai nghe hoặc phụ kiện hỗ trợ kỹ thuật.
- Vị trí phù hợp: màn hình đăng nhập, trạng thái rỗng, thông báo thành công, trang không tìm thấy và hình minh họa nhỏ trên dashboard.
- Hình minh họa chỉ hỗ trợ nội dung: luôn có tiêu đề, mô tả và nút thao tác rõ ràng. Không đặt mèo cạnh từng dòng trong bảng hoặc che biểu đồ.
- Không dùng hình tượng vui đùa trong cảnh báo nghiêm trọng, lỗi mất dữ liệu, thao tác khôi phục hoặc xóa.
- Mèo, logo và tên hệ thống bên dưới là **đề xuất**, không phải tài sản thương hiệu có sẵn. Chưa xác định thiết kế nhân vật chính thức.

## 2. Cấu trúc nội dung và vai trò

### 2.1. Điều hướng theo quyền

| Khu vực | Người dùng | Chuyên viên | Quản trị viên |
|---|---|---|---|
| Tổng quan | Ticket của tôi, trạng thái, kết quả | Ticket được giao, việc cần xử lý | Toàn bộ yêu cầu, chưa phân công, thống kê |
| Yêu cầu hỗ trợ | Tạo, xem và phản hồi ticket của mình | Xem ticket được giao và xử lý theo quyền | Xem, phân loại và phân công |
| Thông báo | Thay đổi liên quan ticket của mình | Ticket được giao, phản hồi | Yêu cầu mới và sự kiện quản trị theo cấu hình |
| Tài khoản và vai trò | Hồ sơ cá nhân | Hồ sơ cá nhân | Quản lý tài khoản và vai trò |
| Thống kê, báo cáo | Không đề xuất mặc định | Có thể xem phần thuộc quyền | Xem, lọc và tổng hợp |
| Sao lưu và phục hồi | Không | Không | Truy cập theo quyền quản trị được cấp |

Một tài khoản có thể có cả vai trò người dùng và chuyên viên. Điều hướng hiển thị các chức năng theo quyền đã cấp; màn hình tổng quan cho phép chuyển phạm vi **“Yêu cầu của tôi” / “Việc được giao”**. Ẩn điều hướng không thay thế kiểm tra quyền ở máy chủ.

### 2.2. Luồng nghiệp vụ đề xuất

1. Người dùng tạo yêu cầu, xem mã và trạng thái sau khi hệ thống ghi nhận.
2. Quản trị viên xem yêu cầu mới, phân loại và phân công chuyên viên.
3. Chuyên viên tiếp nhận, xử lý và cập nhật tiến độ/kết quả.
4. Người dùng xem kết quả, xác nhận hài lòng hoặc gửi phản hồi để xử lý tiếp.
5. Khi hoàn tất theo quy trình được chọn, ticket được đóng. Lịch sử cập nhật và người thực hiện cần hiển thị theo quyền.

**Quy ước trạng thái đề xuất cho giao diện:** Mới tiếp nhận → Đang xử lý → Chờ xác nhận → Đã đóng; phản hồi chưa hài lòng đưa ticket trở lại Đang xử lý. Đây là đề xuất UX, cần thống nhất với nghiệp vụ và mô hình dữ liệu trước khi lập trình. Phân công là thông tin riêng, không bắt buộc là một trạng thái.

## 3. Design tokens

### 3.1. Màu sắc

| Token | Mã đề xuất | Sử dụng |
|---|---|---|
| `--color-bg` | `#F5F4FA` | Nền ứng dụng |
| `--color-surface` | `#FFFFFF` | Thẻ, bảng, form |
| `--color-surface-soft` | `#F0EDF9` | Nền phụ, trạng thái hover nhẹ |
| `--color-primary` | `#5B48B5` | Nút chính, liên kết, trạng thái chọn |
| `--color-primary-hover` | `#493896` | Hover của nút chính |
| `--color-primary-soft` | `#EDE9FA` | Nền biểu tượng và badge tím |
| `--color-text` | `#1D1B2A` | Nội dung chính |
| `--color-text-muted` | `#5F5C70` | Nội dung phụ trên nền sáng |
| `--color-border` | `#E2DFEB` | Viền thẻ, input, đường phân cách |
| `--color-success` | `#087A55` | Thành công, đã hoàn thành |
| `--color-warning` | `#8A5700` | Cần chú ý, mức ưu tiên cao |
| `--color-danger` | `#B4232C` | Lỗi, mức ưu tiên khẩn |
| `--color-info` | `#2457A7` | Đang xử lý, thông tin |

Màu trên là điểm xuất phát; kiểm tra tương phản với nền thực tế ở mọi trạng thái. Mục tiêu: chữ thông thường tối thiểu **4,5:1**, chữ lớn và thành phần giao diện quan trọng tối thiểu **3:1**. Không dùng màu đơn lẻ để truyền đạt trạng thái.

### 3.2. Typography

- Font gợi ý: **Inter** hoặc **Be Vietnam Pro** nếu sử dụng được trong dự án; luôn kiểm tra hiển thị dấu tiếng Việt và có font dự phòng `system-ui, sans-serif`.
- Cỡ chữ gợi ý: tiêu đề trang 28/36 px; tiêu đề khối 18/28 px; số liệu nổi bật 28/36 px; nội dung 16/24 px; nhãn phụ 14/20 px; nhãn nhỏ 12/18 px chỉ cho thông tin không quan trọng.
- Font weight: 400 cho nội dung, 500–600 cho nhãn, 700 cho tiêu đề và số liệu. Không dùng chữ quá mảnh hoặc màu quá nhạt như một số chi tiết trong ảnh tham khảo.

### 3.3. Khoảng cách, bo góc, bóng

| Nhóm | Giá trị đề xuất |
|---|---|
| Thang khoảng cách | 4, 8, 12, 16, 24, 32, 48 px |
| Padding thẻ | 20–24 px desktop; 16 px mobile |
| Khoảng cách giữa thẻ | 16–24 px desktop; 12–16 px mobile |
| Bo góc | Input 12 px; thẻ 20 px; modal 24 px; nút viên thuốc `999px` |
| Bóng thẻ | `0 8px 24px rgba(35, 27, 65, 0.06)` |
| Bóng nút chính | `0 6px 16px rgba(91, 72, 181, 0.22)` |
| Viền focus | 2 px màu tím, offset 2 px; không xóa focus mặc định nếu chưa có thay thế |

### 3.4. Token CSS mẫu

```css
:root {
  --color-bg: #f5f4fa;
  --color-surface: #fff;
  --color-surface-soft: #f0edf9;
  --color-primary: #5b48b5;
  --color-primary-hover: #493896;
  --color-primary-soft: #ede9fa;
  --color-text: #1d1b2a;
  --color-text-muted: #5f5c70;
  --color-border: #e2dfeb;
  --color-success: #087a55;
  --color-warning: #8a5700;
  --color-danger: #b4232c;
  --color-info: #2457a7;
  --radius-input: 12px;
  --radius-card: 20px;
  --radius-pill: 999px;
  --shadow-card: 0 8px 24px rgba(35, 27, 65, .06);
  --focus-ring: 2px solid #5b48b5;
}
```

## 4. Bố cục tổng thể và responsive

### 4.1. Desktop

- Chiều rộng nội dung tối đa đề xuất: 1440 px, căn giữa; padding cạnh 24–32 px.
- Header cao khoảng 68–72 px. Sidebar khi mở rộng khoảng 240 px; khi thu gọn khoảng 72 px. Giao diện cần tên chức năng nhìn thấy được khi mở rộng.
- Hệ lưới 12 cột, khoảng cách 24 px. Dashboard: dải chào và thao tác; tiếp theo 4 KPI; tiếp theo vùng biểu đồ và danh sách việc; phần cuối là ticket gần đây.
- Với tài khoản có nhiều vai trò, chuyển phạm vi nội dung ở đầu dashboard, không tạo hai tài khoản bắt buộc.

### 4.2. Tablet và điện thoại

| Chiều rộng viewport đề xuất | Bố trí |
|---|---|
| ≥ 1280 px | Sidebar và dashboard dạng nhiều cột; bảng đầy đủ |
| 768–1279 px | Sidebar thu gọn hoặc dạng menu; KPI 2 cột; vùng biểu đồ xếp theo không gian |
| < 768 px | Header gọn, menu mở bằng nút; KPI 1–2 cột; form một cột; thẻ ticket hoặc bảng cuộn ngang có báo hiệu |

Đây là các điểm bắt đầu để thử nghiệm, không phải kích thước bắt buộc. Nút và vùng chạm khuyến nghị ít nhất 44 × 44 px; không để thanh điều hướng che nội dung cuối trang. Thiết kế từ 320 px trở lên, kiểm tra ở kích thước thực tế.

## 5. Danh mục UI components

### 5.1. Button

| Biến thể | Cách dùng | Hình thức |
|---|---|---|
| Primary | Tạo yêu cầu, lưu kết quả | Nền tím, chữ trắng, nhãn rõ; mỗi vùng chỉ nên có một hành động chính |
| Secondary | Xem chi tiết, hủy thay đổi | Nền trắng, viền nhạt, chữ đậm |
| Tertiary | Xem tất cả, mở bộ lọc | Chữ hoặc icon kèm nhãn; không dùng cho hành động khó nhận biết |
| Destructive | Xóa, phục hồi dữ liệu | Nhấn mạnh cảnh báo; xác nhận và nêu rõ hậu quả |
| Icon button | Thông báo, menu | Có tên truy cập; tooltip là bổ sung, không thay nhãn truy cập |

Trạng thái cần thiết: mặc định, hover, focus, active, disabled, đang xử lý. Nút đang xử lý hiển thị chữ và khóa gửi lặp; lỗi trả về giữ lại dữ liệu đã nhập khi có thể.

### 5.2. Input, select và form

- Label đặt trên trường; không dùng placeholder thay label. Có mô tả khi cần và ghi rõ trường bắt buộc.
- Chiều cao đề xuất 44–48 px; viền trung tính; focus rõ. Thông báo lỗi nằm sát trường, mô tả lỗi và cách sửa.
- Form tạo ticket: tiêu đề, mô tả, loại yêu cầu, mức ưu tiên, đính kèm tùy chọn; người tạo lấy từ phiên đăng nhập khi phù hợp. Quy định kích thước và định dạng tệp chỉ hiển thị sau khi hệ thống xác định giới hạn thực tế.
- Bảo toàn dữ liệu khi nhập lỗi hoặc gửi thất bại; khi gửi thành công hiển thị mã ticket và đường dẫn tới trang chi tiết.

### 5.3. Badge trạng thái và mức ưu tiên

| Nhóm | Nhãn đề xuất | Màu chỉ báo |
|---|---|---|
| Trạng thái | Mới tiếp nhận | Xanh dương |
| Trạng thái | Đang xử lý | Tím |
| Trạng thái | Chờ xác nhận | Cam/nâu |
| Trạng thái | Đã đóng | Xanh lá |
| Ưu tiên | Thấp / Trung bình | Xám / xanh dương |
| Ưu tiên | Cao / Khẩn cấp | Cam/nâu / đỏ |

Badge có chữ và có thể kèm icon; màu nền nhạt cùng chữ đậm đủ tương phản. Mức ưu tiên và trạng thái là hai trường khác nhau; không dùng cùng ý nghĩa.

### 5.4. Card, bảng, timeline

- **Card KPI:** tiêu đề → con số → mô tả phạm vi/kỳ → icon. Ví dụ: “Chưa phân công · 5 yêu cầu · tính đến hiện tại”. Số liệu mẫu phải được gắn nhãn dữ liệu mẫu.
- **Bảng ticket:** mã, tiêu đề, loại, ưu tiên, trạng thái, người phụ trách, thời gian cập nhật, thao tác. Khi thiếu chỗ, ưu tiên mã, tiêu đề, trạng thái và thời gian; bảo đảm xem được toàn bộ thông tin qua chi tiết.
- **Bộ lọc:** trạng thái, mức ưu tiên, loại, thời gian và người phụ trách theo quyền; có nút xóa bộ lọc và thể hiện bộ lọc đang áp dụng.
- **Timeline:** mỗi mục hiển thị hành động, người thực hiện, thời điểm, nội dung liên quan và tệp nếu có; quyền xem tuân theo phân quyền hệ thống.
- **Modal xác nhận:** tiêu đề, hậu quả cụ thể, nút hủy và nút xác nhận. Sau khi đóng modal, trả focus về thành phần kích hoạt.

### 5.5. Skeleton loading và các trạng thái

Skeleton là khung giả khi đang tải, dựa theo hình dạng nội dung thật; không hiển thị số liệu giả như dữ liệu thật. Dùng các khối xám nhạt với chuyển động nhẹ, tắt hoặc giảm chuyển động khi người dùng yêu cầu. Với màn hình tải lâu cần có chữ “Đang tải…” phù hợp, hỗ trợ đọc bằng công nghệ trợ giúp.

| Tình huống | Nội dung gợi ý | Hành động |
|---|---|---|
| Không có ticket | “Bạn chưa có yêu cầu hỗ trợ nào.” | “Tạo yêu cầu” |
| Không có kết quả lọc | “Không tìm thấy yêu cầu phù hợp.” | “Xóa bộ lọc” |
| Đang tải | “Đang tải danh sách yêu cầu…” | Skeleton tương ứng bảng/thẻ |
| Lỗi tải | “Không thể tải dữ liệu. Vui lòng thử lại.” | “Thử lại” |
| Thành công | “Đã gửi yêu cầu. Mã: HD-0001.” | “Xem yêu cầu” |
| Không có quyền | “Bạn không có quyền xem nội dung này.” | “Quay lại” |

`HD-0001` là mã ví dụ minh họa, không phải quy ước đã triển khai.

## 6. Template màn hình

### 6.1. Đăng nhập

- Trái: logo/tên hệ thống, một câu mô tả ngắn, minh họa mèo hỗ trợ kỹ thuật.
- Phải: tên đăng nhập hoặc email theo yêu cầu hệ thống, mật khẩu, nút đăng nhập và thông báo lỗi rõ ràng.
- Mobile: minh họa thu nhỏ hoặc ẩn khi thiếu chỗ; form đứng trước; không tiết lộ thông tin nhạy cảm qua thông báo lỗi.

### 6.2. Dashboard người dùng

**Khối chào:** “Xin chào, [tên]” · “Theo dõi yêu cầu hỗ trợ của bạn tại đây.” · nút **Tạo yêu cầu**.

**KPI:** Tổng yêu cầu của tôi · Đang xử lý · Chờ xác nhận · Đã đóng. Có ghi rõ phạm vi và không trộn dữ liệu của người khác.

**Nội dung:** Yêu cầu gần đây; việc cần xác nhận; thông báo mới. Trạng thái rỗng có mèo nhỏ và nút tạo yêu cầu.

### 6.3. Dashboard chuyên viên

**Khối chào:** “Công việc được giao” · tóm tắt số ticket theo phạm vi hiện tại.

**KPI:** Được giao · Đang xử lý · Phản hồi cần xử lý · Chờ người dùng xác nhận. Danh sách ưu tiên hiển thị theo quy tắc sắp xếp được nêu rõ, chẳng hạn mức ưu tiên rồi thời gian tạo; không tự tuyên bố quá hạn nếu chưa có quy tắc hạn xử lý.

**Nội dung:** Ticket cần xử lý, cập nhật gần đây, biểu đồ số lượng theo trạng thái khi có dữ liệu. Nút chính **Xem việc được giao**.

### 6.4. Dashboard quản trị viên

**KPI:** Yêu cầu mới · Chưa phân công · Đang xử lý · Chờ xác nhận. Mỗi số phải có phạm vi thời gian và điều kiện tính minh bạch.

**Nội dung:** Danh sách chưa phân công; thống kê theo trạng thái/loại; danh sách hoạt động gần đây. Thao tác nhanh: **Phân công**, **Xem báo cáo**, tùy theo quyền thực tế.

### 6.5. Danh sách ticket

- Trên cùng: tiêu đề, mô tả phạm vi, CTA theo quyền.
- Hàng công cụ: tìm theo mã hoặc tiêu đề, bộ lọc, xóa lọc; cho thấy số kết quả.
- Nội dung: bảng trên desktop, thẻ hoặc bảng cuộn trên mobile. Cho phép sắp xếp khi chức năng được hỗ trợ; phân trang hoặc tải thêm khi cần.
- Không thay thế phân quyền bằng bộ lọc trên giao diện.

### 6.6. Tạo yêu cầu

1. Điền tiêu đề ngắn, mô tả cụ thể và loại sự cố.
2. Chọn mức ưu tiên; hiển thị mô tả ngắn giúp người dùng lựa chọn.
3. Đính kèm minh họa nếu hệ thống hỗ trợ; cho phép xóa tệp trước khi gửi.
4. Kiểm tra dữ liệu, gửi và nhận mã ticket; thông báo lỗi tại trường và tập trung đến lỗi đầu tiên.

### 6.7. Chi tiết và xử lý ticket

- Header: mã, tiêu đề, trạng thái, ưu tiên, ngày tạo.
- Cột chính: nội dung yêu cầu, tệp đính kèm, timeline và kết quả xử lý.
- Cột bên: người tạo, loại yêu cầu, người phụ trách, thao tác hợp lệ theo quyền.
- Chuyên viên cập nhật tiến độ/kết quả; người dùng xác nhận hoặc phản hồi khi ticket đang chờ xác nhận. Khi phản hồi, hệ thống ghi nhận và thông báo cho người xử lý theo chức năng được triển khai.
- Trên mobile, xếp thành một cột; hành động quan trọng nằm trong vùng dễ tiếp cận và không che nội dung.

### 6.8. Quản trị tài khoản, báo cáo, sao lưu và phục hồi

- **Tài khoản và vai trò:** bảng tài khoản, tìm kiếm, trạng thái, danh sách vai trò; form gán nhiều vai trò khi được phép. Hiển thị rõ thay đổi trước khi lưu.
- **Báo cáo:** chọn kỳ và tiêu chí; mỗi biểu đồ kèm tiêu đề, đơn vị, chú giải và bảng hoặc tóm tắt số liệu. Không biểu diễn phần trăm khi mẫu số bằng 0 mà không giải thích.
- **Sao lưu:** mô tả phạm vi bản sao, thời điểm và kết quả khi chức năng thực sự hỗ trợ; không tự hứa khả năng phục hồi.
- **Phục hồi:** màn hình riêng với bản sao được chọn, phạm vi ảnh hưởng và cảnh báo; yêu cầu xác nhận rõ trước khi thực hiện. Chỉ hiển thị cho người có quyền.

## 7. Icon, hình ảnh và nội dung

- Icon đề xuất: Lucide cùng một kiểu nét và kích thước 18–20 px, icon trong KPI 20–24 px. Biểu tượng kỹ thuật gợi ý: `Headset`, `Ticket`, `Monitor`, `Network`, `Shield`, `Chart` tùy bộ icon thực tế.
- Dùng icon + chữ cho điều hướng chính; icon trang trí có thể ẩn khỏi trình đọc màn hình. Tên icon cụ thể cần kiểm tra theo thư viện và phiên bản dự án khi triển khai.
- Giọng văn: ngắn, lịch sự và cụ thể. Ví dụ: “Mô tả sự cố”, “Gửi yêu cầu”, “Đã cập nhật kết quả”. Tránh thuật ngữ kỹ thuật khó hiểu trong màn hình người dùng thông thường.
- Không dùng mèo làm biểu tượng duy nhất của cảnh báo, nút bấm hay trạng thái. Tạo bản minh họa có nền trong suốt và bản đơn sắc khi chuẩn hóa bộ nhận diện.

## 8. Accessibility và chất lượng tương tác

- Có thứ tự tab hợp lý, điều khiển được bằng bàn phím, focus nhìn thấy rõ, nhãn cho trường và nút icon.
- Chữ và thành phần quan trọng cần đạt mục tiêu tương phản ở mục 3.1; kiểm tra cả trạng thái hover, focus và disabled.
- Không chỉ dùng màu để phân biệt trạng thái/ưu tiên. Biểu đồ có chú giải và dữ liệu thay thế bằng văn bản hoặc bảng.
- Thông báo lỗi/thành công có nội dung rõ; thông báo quan trọng được trình đọc màn hình nhận biết; không tự biến mất quá nhanh.
- Kiểm tra phóng to nội dung 200%, màn hình hẹp, tiếng Việt có dấu dài và tùy chọn giảm chuyển động.
- Khi không có dữ liệu, hiển thị “Chưa có dữ liệu” thay vì số liệu giả; dashboard chỉ hiển thị dữ liệu đúng quyền.

## 9. Gợi ý triển khai với Angular

### 9.1. Thành phần gợi ý

```text
app-shell/
  header, sidebar, mobile-navigation
shared/ui/
  button, card, badge, input, select, dialog, empty-state,
  skeleton, data-table, pagination, toast, avatar
shared/feedback/
  error-state, loading-state, confirmation-dialog
features/
  auth, dashboard, tickets, notifications,
  users-roles, reports, backup-restore
```

Tên thư mục chỉ là mẫu. Component dùng lại nên có API đầu vào rõ ràng cho nhãn, trạng thái và dữ liệu; không hard-code quyền hoặc gọi API quản trị trực tiếp từ component trình bày. Angular CDK có thể hỗ trợ các mẫu tương tác; lựa chọn thư viện giao diện cần kiểm tra phiên bản và tính tương thích trước khi cài đặt. Đây là hướng dẫn thiết kế, chưa xác nhận package nào tương thích.

### 9.2. Thứ tự thực hiện đề xuất

1. Chốt màu, kiểu chữ, thiết kế mascot và danh sách trạng thái với nhóm dự án.
2. Dựng token, app shell, button, input, card, badge và responsive.
3. Làm đăng nhập → danh sách ticket → tạo ticket → chi tiết và phản hồi.
4. Bổ sung phân công/xử lý và dashboard theo vai trò.
5. Bổ sung báo cáo, quản trị, sao lưu/phục hồi theo phạm vi đề tài thực tế.
6. Kiểm tra phân quyền, nội dung, khả năng dùng bàn phím, tương phản và luồng hoàn chỉnh.

## 10. Checklist bàn giao

### Thiết kế

- [ ] Bố cục giữ được tinh thần thẻ trắng, tím nhạt, bo tròn của ảnh tham khảo.
- [ ] Mascot mèo phù hợp ngữ cảnh, không che nội dung và không làm khó đọc.
- [ ] Định nghĩa các trạng thái bình thường, hover, focus, lỗi, loading, rỗng và không quyền.
- [ ] Có mẫu desktop, tablet và mobile cho từng màn hình ưu tiên.
- [ ] Nhãn trạng thái, mức ưu tiên và điều kiện chuyển trạng thái được thống nhất.

### Nghiệp vụ và kỹ thuật

- [ ] Một tài khoản nhiều vai trò sử dụng được các chức năng theo quyền.
- [ ] Ticket có thể tạo, phân công, xử lý, xem kết quả và phản hồi theo quy trình đã chốt.
- [ ] Dashboard và biểu đồ nêu phạm vi, thời gian, nguồn dữ liệu và cách tính phù hợp.
- [ ] Thành phần form, thông báo và dữ liệu rỗng có nội dung rõ ràng.
- [ ] Các thao tác nhạy cảm có xác nhận, kiểm tra quyền ở máy chủ.
- [ ] Kiểm tra bàn phím, độ tương phản, zoom và kích thước màn hình.

---

**Ghi chú:** Tài liệu là bản hướng dẫn và bộ quy tắc đề xuất, không phải bản thiết kế Figma, sản phẩm đã lập trình, hoặc kết quả kiểm thử thực tế.
