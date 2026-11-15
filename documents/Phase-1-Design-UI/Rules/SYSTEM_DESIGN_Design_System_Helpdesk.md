# SYSTEM DESIGN — QUY ĐỊNH CHUNG VỀ DESIGN SYSTEM

## Thông tin tài liệu

| Nội dung | Giá trị |
|---|---|
| Dự án | Website quản lý yêu cầu hỗ trợ kỹ thuật |
| Tài liệu | Quy định chung về hệ thống thiết kế giao diện |
| Phiên bản | 1.0 |
| Trạng thái | **Đề xuất áp dụng, chưa xác nhận triển khai** |
| Công nghệ định hướng | Angular, Tailwind CSS, Angular CDK, Lucide Angular |
| Phạm vi | Giao diện web cho người dùng, chuyên viên hỗ trợ và quản trị viên |
| Tài liệu tham chiếu | UX_UI_Kit_Helpdesk_Cat.md; ảnh dashboard do người dùng cung cấp |

> Tài liệu này quy định cách thiết kế giao diện. Các giá trị, tên component, vai trò, trạng thái và quy trình dưới đây được xác định cho bản đề xuất này; chúng không chứng minh rằng chức năng đã được lập trình hoặc kiểm thử. Ngữ nghĩa nghiệp vụ và quyền thực tế phải thống nhất với đặc tả hệ thống trước khi triển khai.

## 1. Mục đích, phạm vi và thuật ngữ

### 1.1. Mục đích

- Thống nhất màu sắc, chữ, bố cục, component, biểu tượng và hành vi tương tác.
- Giúp người thiết kế và người lập trình áp dụng cùng một cách thể hiện trên các màn hình.
- Giữ giao diện dễ đọc, thân thiện, có sắc thái kỹ thuật và linh vật mèo nhẹ nhàng.
- Giảm lặp lại giao diện và thuận tiện cho việc sửa đổi về sau.

### 1.2. Mức độ yêu cầu

| Thuật ngữ | Cách hiểu trong tài liệu |
|---|---|
| **Phải** | Quy định chung cần thực hiện trên giao diện thuộc phạm vi áp dụng. |
| **Nên** | Mặc định lựa chọn; có thể điều chỉnh khi có lý do được ghi lại. |
| **Có thể** | Tùy chọn; chỉ dùng khi phù hợp với màn hình. |
| **Đề xuất** | Chưa xác nhận là nghiệp vụ hoặc chức năng đã triển khai. |

### 1.3. Phạm vi

Áp dụng cho trang đăng nhập; dashboard; danh sách, tạo và chi tiết ticket; thông báo; quản lý tài khoản và vai trò; thống kê; sao lưu và phục hồi nếu các chức năng này thuộc phạm vi được thực hiện. Thiết kế phục vụ desktop, tablet và điện thoại.

**Design system** là các quy tắc, token và component dùng chung. **UI kit** là tập ví dụ và hướng dẫn trực quan áp dụng các quy tắc đó. Tài liệu này không thay thế tài liệu API, CSDL, mô tả nghiệp vụ hoặc kiểm thử.

## 2. Nguyên tắc thiết kế

1. **Rõ việc cần làm:** tiêu đề, trạng thái và hành động chính phải dễ tìm.
2. **Thống nhất:** cùng một ý nghĩa phải có cùng nhãn, màu và hành vi trên các màn hình.
3. **Ưu tiên nội dung:** thông tin ticket, người phụ trách và tiến độ phải dễ đọc hơn phần trang trí.
4. **Phản hồi đầy đủ:** các hành động gửi, lưu, tải dữ liệu và lỗi phải cho người dùng biết kết quả.
5. **Phù hợp vai trò:** nội dung và thao tác hiển thị theo quyền; máy chủ phải kiểm tra quyền độc lập với giao diện.
6. **Truy cập được:** dùng được bằng bàn phím, có nhãn rõ và không dựa duy nhất vào màu sắc.
7. **Thân thiện có kiểm soát:** mascot và bo góc mềm tạo cảm giác gần gũi; không cản trở nghiệp vụ.

## 3. Định hướng hình ảnh

### 3.1. Bản sắc

| Yếu tố | Quy định |
|---|---|
| Phong cách | Dashboard hiện đại, nền tím xám sáng, thẻ trắng, bo tròn, khoảng trắng thoáng |
| Màu nhấn | Tím là màu hành động chính và nhận diện hệ thống |
| Sắc thái | Chuyên nghiệp, dễ tiếp cận, nhẹ nhàng, có liên hệ đến hỗ trợ kỹ thuật |
| Bố cục | Phân cấp theo nhiệm vụ; dashboard dùng thẻ, bảng và biểu đồ rõ nhãn |
| Trang trí | Ít, nhẹ; ưu tiên nội dung và dữ liệu |
| Tên, logo | Chưa có quy định chính thức; dùng tên dự án tạm thời đến khi được xác định |

Ảnh tham khảo định hướng bố cục và cảm giác thị giác; các mã màu và kích thước của tài liệu này là đề xuất, không phải số đo chính xác lấy từ ảnh.

### 3.2. Mascot mèo

“Cat mosco” được hiểu tạm thời là phong cách sử dụng **linh vật mèo**; chưa có mẫu nhân vật cụ thể được xác nhận.

- Mascot có thể dùng trong đăng nhập, trạng thái rỗng, thông báo hoàn tất và trang không tìm thấy.
- Hình minh họa nên có nét tròn đơn giản, màu dịu; phụ kiện như tai nghe hoặc dụng cụ hỗ trợ có thể gợi chủ đề kỹ thuật.
- Mascot không thay thế biểu tượng cảnh báo, chữ, nhãn hoặc hướng dẫn; không phủ nội dung hay chiếm diện tích quan trọng trên mobile.
- Không sử dụng cách thể hiện vui đùa cho lỗi nghiêm trọng, xóa, sao lưu hoặc phục hồi.
- Tài sản mascot, kích thước và tên chính thức: **chưa xác định**. Không giả định hình ảnh đã tồn tại.

## 4. Hệ thống design tokens

### 4.1. Quy tắc sử dụng

- Giá trị dưới đây là **bộ token đề xuất cho giao diện sáng**. Tên token biểu thị mục đích sử dụng, không đặt tên theo từng màn hình.
- Dùng token dùng chung thay vì tự tạo mã màu, bo góc hoặc bóng mới cho mỗi component.
- Nếu có thay đổi, cập nhật tài liệu và triển khai token tương ứng; kiểm tra các component liên quan.
- Chế độ tối chưa được đặc tả và chưa được xác nhận triển khai; không tự đảo màu giao diện sáng thành dark mode.

### 4.2. Màu sắc

| Token | Giá trị | Mục đích |
|---|---|---|
| `--ds-bg` | `#F5F4FA` | Nền ứng dụng |
| `--ds-surface` | `#FFFFFF` | Nền thẻ, form, bảng, hộp thoại |
| `--ds-surface-soft` | `#F0EDF9` | Nền phụ và vùng nhấn nhẹ |
| `--ds-primary` | `#5B48B5` | Hành động chính, liên kết, chọn |
| `--ds-primary-hover` | `#493896` | Nền nút chính khi hover |
| `--ds-primary-soft` | `#EDE9FA` | Vùng nhấn tím nhạt |
| `--ds-on-primary` | `#FFFFFF` | Chữ và icon trên nút chính |
| `--ds-text` | `#1D1B2A` | Chữ chính |
| `--ds-text-muted` | `#5F5C70` | Chữ phụ, mô tả |
| `--ds-border` | `#E2DFEB` | Viền trang trí, đường phân cách |
| `--ds-success` | `#087A55` | Chữ/icon báo thành công |
| `--ds-warning` | `#8A5700` | Chữ/icon báo cần chú ý |
| `--ds-danger` | `#B4232C` | Chữ/icon báo lỗi, hành động nguy hiểm |
| `--ds-info` | `#2457A7` | Chữ/icon thông tin |
| `--ds-focus` | `#5B48B5` | Đường viền focus trên bề mặt sáng phù hợp |

**Quy tắc:** màu ngữ nghĩa phải đi cùng chữ hoặc icon; không đồng nhất màu đỏ với mọi sự kiện cần chú ý. Token viền trang trí không mặc định đủ tương phản để làm dấu hiệu duy nhất cho ranh giới input hoặc focus; phải kiểm tra ở ngữ cảnh sử dụng.

**Mục tiêu kiểm tra:** chữ thông thường tối thiểu 4,5:1; chữ lớn và chỉ báo giao diện quan trọng tối thiểu 3:1 so với nền liền kề. Chỉ tiêu này là mục tiêu thiết kế cho dự án, không tuyên bố toàn bộ website đã đạt chuẩn. Các cặp đề xuất dưới đây được tính theo giá trị màu đặc, chưa bao gồm ảnh nền, độ mờ hay trạng thái khác:

| Cặp màu | Tỷ lệ xấp xỉ |
|---|---:|
| Chữ chính `#1D1B2A` trên trắng | 16,90:1 |
| Chữ phụ `#5F5C70` trên trắng | 6,46:1 |
| Chữ trắng trên nút `#5B48B5` | 6,91:1 |
| Success / warning / danger / info trên trắng | 5,35 / 6,10 / 6,53 / 7,01:1 |

Không suy rộng kết quả trên cho các cặp màu hoặc trạng thái khác; phải kiểm tra giao diện thực tế.

### 4.3. Typography

| Vai trò | Cỡ chữ / line-height đề xuất | Trọng lượng |
|---|---|---:|
| Tiêu đề trang | 28 / 36 px | 700 |
| Tiêu đề khối | 18 / 28 px | 600 |
| Chỉ số nổi bật | 28 / 36 px | 700 |
| Nội dung chính | 16 / 24 px | 400 |
| Nhãn và nội dung phụ | 14 / 20 px | 400–600 |
| Chú thích nhỏ | 12 / 18 px | 400–500 |

- Font định hướng: **Be Vietnam Pro** hoặc **Inter**, kèm `system-ui, sans-serif`. Việc lựa chọn font chính thức, nguồn cung cấp và quyền sử dụng chưa được xác nhận.
- Giao diện tiếng Việt phải hiển thị đầy đủ dấu; ưu tiên câu ngắn, không viết hoa toàn bộ đoạn dài.
- Chú thích 12 px không dùng cho nội dung quan trọng hoặc hướng dẫn bắt buộc.

### 4.4. Spacing, radius, shadow và chuyển động

| Nhóm | Giá trị đề xuất | Sử dụng |
|---|---|---|
| Spacing | 4, 8, 12, 16, 24, 32, 48 px | Sắp xếp các khối theo thang khoảng cách |
| Padding card | 24 px desktop; 16 px mobile | Thẻ nội dung |
| Khoảng cách card | 24 px desktop; 16 px mobile | Khoảng trống giữa thẻ |
| Radius input | 12 px | Trường nhập, select |
| Radius card | 20 px | Card, bảng trong khung |
| Radius dialog | 24 px | Hộp thoại |
| Radius pill | `999px` | Nút, badge phù hợp |
| Shadow card | `0 8px 24px rgba(35, 27, 65, .06)` | Tách thẻ khỏi nền |
| Shadow primary | `0 6px 16px rgba(91, 72, 181, .22)` | Nhấn nhẹ nút chính |
| Chuyển động | Khoảng 150–200 ms | Hover, mở/đóng nhẹ; không cản trở thao tác |

Tắt hoặc giảm chuyển động không cần thiết khi `prefers-reduced-motion: reduce`. Không để hiệu ứng chặn thao tác hoặc che trạng thái tải.

### 4.5. CSS token mẫu

```css
:root {
  --ds-bg: #f5f4fa;
  --ds-surface: #fff;
  --ds-surface-soft: #f0edf9;
  --ds-primary: #5b48b5;
  --ds-primary-hover: #493896;
  --ds-primary-soft: #ede9fa;
  --ds-on-primary: #fff;
  --ds-text: #1d1b2a;
  --ds-text-muted: #5f5c70;
  --ds-border: #e2dfeb;
  --ds-success: #087a55;
  --ds-warning: #8a5700;
  --ds-danger: #b4232c;
  --ds-info: #2457a7;
  --ds-focus: #5b48b5;
  --ds-space-1: 4px;
  --ds-space-2: 8px;
  --ds-space-3: 12px;
  --ds-space-4: 16px;
  --ds-space-6: 24px;
  --ds-space-8: 32px;
  --ds-space-12: 48px;
  --ds-radius-input: 12px;
  --ds-radius-card: 20px;
  --ds-radius-dialog: 24px;
  --ds-radius-pill: 999px;
  --ds-shadow-card: 0 8px 24px rgba(35, 27, 65, .06);
  --ds-shadow-primary: 0 6px 16px rgba(91, 72, 181, .22);
}

:focus-visible {
  outline: 2px solid var(--ds-focus);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Đây là mẫu nền tảng, không phải mã nguồn đã được tích hợp. Vòng focus cần biến thể phù hợp nếu đặt trên nền tím hoặc nền không đủ tương phản.

## 5. Bố cục và responsive

### 5.1. App shell

| Khu vực | Quy định |
|---|---|
| Header | Nhận diện hệ thống, tìm kiếm nếu được hỗ trợ, thông báo và tài khoản; hành động chính theo quyền |
| Sidebar | Các mục điều hướng theo quyền; dùng icon và nhãn ở chế độ mở rộng |
| Nội dung | Có tiêu đề trang, mô tả khi cần, hành động chính, nội dung và trạng thái dữ liệu |
| Khu vực tài khoản | Truy cập hồ sơ và đăng xuất; các hành động khác tùy chức năng thực tế |
| Thông báo | Nội dung và liên kết phù hợp quyền, nếu chức năng thông báo được triển khai |

Đề xuất: nội dung tối đa 1440 px; padding ngoài 24–32 px desktop; header khoảng 68–72 px; sidebar mở rộng khoảng 240 px, thu gọn khoảng 72 px. Các giá trị là điểm bắt đầu, phải kiểm tra với nội dung thực tế.

### 5.2. Breakpoint đề xuất

| Viewport | Quy tắc |
|---|---|
| `≥ 1280px` | Sidebar mở rộng khi đủ chỗ; dashboard nhiều cột; bảng đầy đủ |
| `768–1279px` | Sidebar thu gọn hoặc menu; KPI ưu tiên 2 cột |
| `< 768px` | Menu dạng nút mở; nội dung và form một cột; KPI 1–2 cột khi đủ chỗ |
| Từ `320px` | Tránh tràn ngang toàn trang; bảng có thể cuộn ngang trong vùng riêng có dấu hiệu rõ |

Sidebar thu gọn vẫn phải có tên truy cập cho icon; khi menu mobile mở, người dùng điều khiển được bằng bàn phím và có cách đóng. Vùng chạm mục tiêu nên đạt tối thiểu 44 × 44 px. Không che thông tin bởi header hoặc thanh hành động cố định.

### 5.3. Lưới và nội dung

- Desktop: lưới gợi ý 12 cột, gap 24 px; tablet/mobile thay số cột theo không gian, gap 16 px.
- Dashboard nên theo thứ tự: tiêu đề và phạm vi → việc cần làm → KPI → danh sách hoặc biểu đồ.
- Nội dung có cùng mức ưu tiên được đặt cùng một hàng khi còn đủ chỗ; chuyển thành cột khi hẹp.
- Không dùng độ rộng cố định gây cắt chữ khi phóng to hoặc khi tiêu đề tiếng Việt dài.

## 6. Quy định component dùng chung

### 6.1. Trạng thái chung

Mỗi component tương tác phải quy định ít nhất: mặc định, hover khi có chuột, focus bằng bàn phím, active khi phù hợp, disabled và lỗi nếu áp dụng. Component xử lý bất đồng bộ cần có loading, thành công và thất bại. Không thể hiện disabled chỉ bằng màu; dùng thuộc tính tương ứng và giải thích khi cần.

### 6.2. Button

| Biến thể | Sử dụng | Nội dung và hành vi |
|---|---|---|
| Primary | Hành động chính trong một vùng | Nền tím, chữ trắng; nhãn là động từ rõ ràng: “Tạo yêu cầu”, “Lưu thay đổi” |
| Secondary | Hành động phụ | Bề mặt sáng, nhãn rõ; ví dụ “Hủy”, “Xem chi tiết” |
| Tertiary | Hành động ít nhấn mạnh | Liên kết hoặc nút ít nền; vẫn có focus rõ |
| Destructive | Hành động có thể gây mất dữ liệu | Màu cảnh báo phù hợp, nhãn cụ thể và xác nhận khi cần |
| Icon-only | Menu, đóng, thông báo | Có tên truy cập; không chỉ dựa vào tooltip |

Chiều cao khuyến nghị tối thiểu 44 px. Nút đang gửi phải cho biết đang xử lý và ngăn gửi lặp; khi lỗi giữ nội dung form nếu khả thi. Mỗi vùng nên có một hành động primary nổi bật.

### 6.3. Form và trường nhập

- Label phải nằm cùng trường; placeholder chỉ là ví dụ, không thay label. Trường bắt buộc có chỉ dẫn rõ.
- Input/select đề xuất cao 44–48 px; label, trợ giúp và lỗi gắn đúng trường; nội dung lỗi nói rõ cách khắc phục.
- Validate khi gửi và có thể validate sau khi rời trường. Sau khi gửi lỗi, đưa focus tới lỗi đầu tiên hoặc phần tóm tắt lỗi phù hợp.
- Không tự đặt quy định mật khẩu, dung lượng hay định dạng đính kèm khi chưa xác định từ hệ thống; hiển thị theo cấu hình thật.
- Với tệp đính kèm, hiển thị tên tệp và cách xóa trước khi gửi; lỗi tệp không làm mất nội dung khác nếu khả thi.

### 6.4. Badge, card và avatar

- **Badge:** có chữ; màu phụ trợ, không dựa vào màu riêng lẻ. Trạng thái và mức ưu tiên là hai thông tin độc lập.
- **Card:** nền trắng, radius 20 px; tiêu đề và nội dung theo phân cấp. KPI phải có tên, số, phạm vi và thời điểm/kỳ khi có liên quan.
- **Avatar:** dùng ảnh hoặc ký tự thay thế; ảnh không được cung cấp thì vẫn nhận biết được tên tài khoản bằng chữ.
- **Tooltip:** chỉ bổ sung thông tin; thông tin bắt buộc không được chỉ xuất hiện khi hover.

### 6.5. Bảng dữ liệu và bộ lọc

Bảng ticket gợi ý các cột: mã, tiêu đề, loại, ưu tiên, trạng thái, người phụ trách, thời gian cập nhật, thao tác. Thông tin hiển thị thực tế phụ thuộc quyền và dữ liệu được triển khai.

- Header bảng rõ ràng; nếu sắp xếp được phải thể hiện tiêu chí và chiều sắp xếp.
- Bộ lọc cho biết các điều kiện đang áp dụng, có cách xóa lọc; tìm kiếm nêu phạm vi tìm khi cần.
- Có trạng thái đang tải, không dữ liệu, không có kết quả và lỗi. Phân trang/tải thêm khi hệ thống hỗ trợ.
- Mobile: hiển thị thẻ hoặc vùng cuộn ngang riêng; giữ đường vào chi tiết và thông tin thiết yếu.
- Không dùng dữ liệu mẫu trên màn hình thật như thể là dữ liệu hệ thống.

### 6.6. Dialog, toast, thông báo

| Thành phần | Quy định |
|---|---|
| Dialog | Có tiêu đề, mô tả, nút đóng hoặc hủy; focus nằm trong hộp khi mở và trả về nơi kích hoạt khi đóng |
| Dialog xác nhận | Nêu đối tượng, hành động và ảnh hưởng; nút xác nhận ghi rõ hành động; hủy là lựa chọn dễ nhận biết |
| Toast | Phản hồi ngắn sau thao tác; lỗi cần có nội dung đọc được và hướng xử lý; không là nơi duy nhất chứa thông tin thiết yếu |
| Thông báo | Có nội dung, thời gian và trạng thái đọc nếu hỗ trợ; không tiết lộ dữ liệu ngoài quyền |

### 6.7. Skeleton, empty state và lỗi

| Tình huống | Mẫu nội dung | Hành động |
|---|---|---|
| Đang tải | “Đang tải yêu cầu…” | Skeleton theo cấu trúc nội dung; không giả số liệu |
| Chưa có yêu cầu | “Bạn chưa có yêu cầu hỗ trợ nào.” | “Tạo yêu cầu” nếu có quyền |
| Không có kết quả | “Không tìm thấy yêu cầu phù hợp.” | “Xóa bộ lọc” |
| Không tải được | “Không thể tải dữ liệu. Vui lòng thử lại.” | “Thử lại” |
| Không có quyền | “Bạn không có quyền xem nội dung này.” | “Quay lại” |
| Thành công | “Đã gửi yêu cầu.” | “Xem yêu cầu” nếu đã có dữ liệu |

## 7. Quy định nội dung, biểu tượng và biểu đồ

### 7.1. Ngôn ngữ

- Ngôn ngữ mặc định của tài liệu thiết kế: tiếng Việt; thống nhất “yêu cầu hỗ trợ” trong giao diện người dùng, có thể dùng “ticket” trong tài liệu kỹ thuật.
- Nút dùng động từ cụ thể: “Gửi yêu cầu”, “Phân công”, “Lưu kết quả”. Không dùng “OK” cho thao tác quan trọng.
- Thông báo lỗi nêu điều xảy ra và hướng xử lý; không hiển thị thông tin nội bộ hoặc chi tiết nhạy cảm.
- Ngày/giờ hiển thị thống nhất theo cấu hình hệ thống; gợi ý `dd/MM/yyyy HH:mm`, múi giờ Việt Nam khi phạm vi sử dụng là Việt Nam. Lưu trữ và quy đổi thời gian theo thiết kế kỹ thuật được thống nhất.
- Mã ticket, số liệu, tên người và ngày trong mockup phải được đánh dấu là ví dụ.

### 7.2. Icon

- Lucide Angular là lựa chọn định hướng; tên icon và tương thích phiên bản cần xác minh khi cài đặt.
- Dùng một hệ icon nhất quán; kích thước thông thường 18–20 px, trong thẻ KPI 20–24 px.
- Icon trang trí không cần thông báo riêng cho trình đọc màn hình; icon là nút phải có tên truy cập.

### 7.3. Biểu đồ

- Phải có tiêu đề, đơn vị, khoảng thời gian, chú giải và phạm vi dữ liệu khi áp dụng.
- Có bản tóm tắt hoặc bảng số liệu tương đương; không dựa vào màu duy nhất để phân biệt chuỗi dữ liệu.
- Không hiển thị tỷ lệ khi không có mẫu số mà không giải thích; có trạng thái không dữ liệu.
- Chart.js là lựa chọn định hướng; cần kiểm tra sự tương thích thực tế trước khi tích hợp.

## 8. Quy tắc theo nghiệp vụ và vai trò

### 8.1. Vai trò

| Màn hình | Người dùng | Chuyên viên | Quản trị viên |
|---|---|---|---|
| Tổng quan | Yêu cầu của mình | Việc được giao | Thông tin quản trị trong phạm vi được cấp |
| Ticket | Tạo, theo dõi, phản hồi yêu cầu của mình | Xử lý ticket được phân công theo quyền | Phân loại, phân công, quản lý theo quyền |
| Tài khoản và vai trò | Hồ sơ cá nhân | Hồ sơ cá nhân | Quản lý theo quyền |
| Báo cáo | Theo quyền được cấp | Theo quyền được cấp | Theo quyền được cấp |
| Sao lưu/phục hồi | Không mặc định | Không mặc định | Theo quyền quản trị được cấp |

Một tài khoản có thể đồng thời là người dùng và chuyên viên. Giao diện nên cho phép chuyển giữa “Yêu cầu của tôi” và “Việc được giao”; không yêu cầu tạo hai tài khoản chỉ để đổi góc nhìn. Ma trận này là đề xuất để thiết kế giao diện, không thay thế chính sách phân quyền cuối cùng.

### 8.2. Trạng thái ticket và ưu tiên

| Nhóm | Nhãn giao diện đề xuất | Ý nghĩa thể hiện |
|---|---|---|
| Trạng thái | Mới tiếp nhận | Hệ thống đã ghi nhận yêu cầu |
| Trạng thái | Đang xử lý | Yêu cầu đang được xử lý |
| Trạng thái | Chờ xác nhận | Đã có kết quả, chờ người dùng phản hồi/xác nhận |
| Trạng thái | Đã đóng | Quy trình đóng đã hoàn tất |
| Ưu tiên | Thấp, Trung bình, Cao, Khẩn cấp | Mức độ ưu tiên riêng với trạng thái |

Luồng đề xuất: **Mới tiếp nhận → Đang xử lý → Chờ xác nhận → Đã đóng**; nếu người dùng chưa hài lòng, chuyển về **Đang xử lý** để tiếp tục. Các trạng thái, điều kiện và người được phép chuyển trạng thái **phải được chốt với đặc tả nghiệp vụ**. Phân công là thông tin riêng, không mặc định là trạng thái. Không gắn nhãn “quá hạn” nếu chưa có quy tắc hạn xử lý.

### 8.3. Tình huống thao tác quan trọng

- **Tạo:** yêu cầu cần có tiêu đề và các trường theo đặc tả; khi thành công, hiển thị kết quả và mã thực tế từ hệ thống.
- **Phân công:** hiển thị người được chọn; chỉ người được phép thực hiện mới thấy hoặc dùng được thao tác.
- **Xử lý:** hiển thị tiến độ, người cập nhật và thời điểm theo dữ liệu thực tế; không suy đoán kết quả.
- **Xác nhận/phản hồi:** mô tả rõ tác động của lựa chọn; giữ lịch sử phản hồi theo chính sách hệ thống.
- **Phục hồi:** có màn hình cảnh báo phạm vi ảnh hưởng và xác nhận rõ; quyền và cơ chế phục hồi phải được kiểm tra ở máy chủ.

## 9. Mẫu bố cục màn hình

| Màn hình | Thành phần bắt buộc theo mẫu | Nội dung bổ sung nếu hỗ trợ |
|---|---|---|
| Đăng nhập | Tên hệ thống, form, lỗi, nút đăng nhập | Minh họa mèo |
| Dashboard | Tiêu đề, phạm vi, các thẻ chỉ số và khu vực công việc phù hợp quyền | Biểu đồ, thông báo, mascot nhỏ |
| Danh sách ticket | Tiêu đề, tìm/lọc theo chức năng có thật, danh sách, trạng thái rỗng/lỗi | Sắp xếp, phân trang |
| Tạo ticket | Label và trường theo đặc tả, lỗi, gửi/hủy | Đính kèm |
| Chi tiết ticket | Mã, tiêu đề, trạng thái, nội dung, thông tin xử lý và hành động hợp lệ | Timeline, tệp, đánh giá |
| Quản lý tài khoản | Tìm kiếm, danh sách, thao tác theo quyền | Gán nhiều vai trò |
| Báo cáo | Tiêu chí, phạm vi và bảng/tóm tắt | Biểu đồ |
| Sao lưu/phục hồi | Mô tả phạm vi, trạng thái, hành động được cấp quyền | Lịch sử bản sao nếu hỗ trợ |

Không bắt buộc triển khai tính năng chỉ vì nó xuất hiện trong bảng mẫu. Mỗi màn hình phải có loading, rỗng, lỗi và không quyền khi tình huống tương ứng có thể xảy ra.

## 10. Quy định tiếp cận và kiểm tra

### 10.1. Yêu cầu

- Đi qua được các thao tác chính bằng bàn phím; có thứ tự focus hợp lý và focus nhìn thấy được.
- Mỗi trường có label; nút icon có tên truy cập; vùng cập nhật quan trọng được thông báo phù hợp cho công nghệ trợ giúp.
- Không chỉ dùng màu để truyền đạt trạng thái, mức ưu tiên hoặc lỗi.
- Kiểm tra mục tiêu tương phản ở mục 4.2; kiểm tra thực tế từng cặp chữ/nền và dấu hiệu điều khiển.
- Hỗ trợ phóng to nội dung 200%, kiểm tra mobile từ 320 px, không làm mất chức năng do tràn hoặc che khuất.
- Bảo đảm có cách đóng dialog/menu; respect `prefers-reduced-motion`.
- Thông tin quan trọng không chỉ nằm trong thông báo tự biến mất hoặc tooltip.

### 10.2. Ma trận kiểm tra đề xuất

| Nội dung | Kiểm tra |
|---|---|
| Visual | So sánh với token; kiểm tra dấu tiếng Việt, khoảng cách, trạng thái và dữ liệu dài |
| Responsive | Kiểm tra ở 320, 375, 768, 1280 và 1440 px; xoay thiết bị nếu cần |
| Bàn phím | Tab, Shift+Tab, Enter, Space và Escape theo loại component; focus rõ và hợp lý |
| Form | Trống, dữ liệu sai, đang gửi, gửi lỗi, gửi thành công, gửi lặp |
| Danh sách | Đang tải, rỗng, không khớp bộ lọc, lỗi, nhiều dòng và tên dài |
| Quyền | Một vai trò, nhiều vai trò, không có quyền; xác nhận kiểm tra quyền phía máy chủ |
| Tương phản | Từng cặp màu chữ/nền, badge, focus và điều khiển ở bối cảnh thực tế |
| Nghiệp vụ | Tạo → phân công → xử lý → xác nhận hoặc phản hồi theo quy trình đã chốt |

Đây là checklist lập kế hoạch; **chưa có kết quả kiểm thử thực tế**.

## 11. Tổ chức triển khai Angular

### 11.1. Cấu trúc gợi ý

```text
src/
  app/
    core/                    # dịch vụ nền tảng, xác thực, quyền
    layout/                  # app shell, header, sidebar
    shared/
      ui/                    # button, input, card, badge, dialog...
      feedback/              # loading, empty, error
    features/
      auth/
      dashboard/
      tickets/
      notifications/
      users-roles/
      reports/
      backup-restore/
  styles/
    tokens.css               # token gốc của design system
    global.css               # thiết lập toàn cục
```

Cấu trúc mang tính đề xuất, cần điều chỉnh theo mã nguồn thực tế. Component dùng chung không tự quyết định quyền hoặc gắn dữ liệu mẫu vào môi trường thật.

### 11.2. Ranh giới công cụ và tính thống nhất

- Angular đảm nhiệm cấu trúc component, điều hướng và liên kết dữ liệu; Tailwind CSS có thể dùng để áp dụng token hoặc utility một cách thống nhất.
- Angular CDK có thể hỗ trợ hành vi điều hướng/focus; thư viện component và icon dùng theo lựa chọn thực tế của nhóm.
- Nếu dùng Spartan UI và Taiga UI cùng lúc, trước tiên xác định component nào do thư viện nào cung cấp; chuẩn hóa kiểu và hành vi qua lớp dùng chung. Không giả định các thư viện hoặc phiên bản đã tương thích.
- Không sao chép trực tiếp giá trị màu vào từng feature; không tạo nhiều phiên bản button cho cùng một mục đích nếu chưa có lý do rõ.
- Tên thư viện, phiên bản, cấu hình Tailwind và API cụ thể cần kiểm tra theo tài liệu tương ứng trước khi cài đặt.

### 11.3. Ví dụ API component, không phải mã đã triển khai

| Component | Đầu vào gợi ý | Sự kiện / nội dung |
|---|---|---|
| Button | `variant`, `disabled`, `loading`, `type` | Nội dung nút, sự kiện thao tác |
| Badge | `kind`, `label` | Nhãn có thể đọc được |
| Card KPI | `title`, `value`, `description` | Giá trị và phạm vi dữ liệu |
| Empty state | `title`, `description`, `actionLabel` | Hành động tùy chọn |
| Data table | Cột, dữ liệu, trạng thái tải | Sắp xếp, phân trang, chọn dòng theo nhu cầu |

Tên input và event trên chỉ minh họa định hướng, chưa phải hợp đồng code chính thức.

## 12. Quản lý thay đổi

1. Đề xuất thay đổi, nêu vấn đề, màn hình bị ảnh hưởng và ảnh/mockup nếu có.
2. Kiểm tra tác động tới token, component, responsive, accessibility và nghiệp vụ.
3. Thống nhất trong nhóm; cập nhật tài liệu và nguồn token/component dùng chung.
4. Kiểm tra các màn hình liên quan trước khi áp dụng rộng.
5. Ghi phiên bản, ngày và mô tả thay đổi; người phê duyệt và quy trình chính thức do nhóm xác định.

| Phiên bản | Nội dung | Trạng thái |
|---|---|---|
| 1.0 | Đề xuất quy định chung dựa trên UI kit và ảnh tham khảo | Chưa xác nhận triển khai |

## 13. Checklist áp dụng cho mỗi màn hình

- [ ] Có tên trang, nội dung chính và hành động phù hợp quyền.
- [ ] Dùng đúng màu, chữ, spacing, radius và component dùng chung.
- [ ] Hiển thị đúng ngữ nghĩa trạng thái, ưu tiên và phạm vi dữ liệu.
- [ ] Có trạng thái tải, rỗng, lỗi, không quyền khi phù hợp.
- [ ] Có focus, nhãn trường, tên nút icon và hỗ trợ bàn phím.
- [ ] Kiểm tra tương phản và không dùng màu là dấu hiệu duy nhất.
- [ ] Kiểm tra desktop, tablet, điện thoại và nội dung dài.
- [ ] Thao tác quan trọng có phản hồi; dữ liệu nhập được bảo toàn khi gặp lỗi nếu khả thi.
- [ ] Phân quyền được kiểm tra ở máy chủ; giao diện không tiết lộ dữ liệu không được phép.
- [ ] Mascot được dùng đúng ngữ cảnh, không che nội dung.
- [ ] Dữ liệu minh họa được ghi rõ, không thể hiện như dữ liệu thật.

## 14. Điểm cần thống nhất trước khi phát triển

1. Tên hệ thống, logo và mẫu mascot mèo chính thức.
2. Font chính thức và nguồn cung cấp font.
3. Danh sách trạng thái ticket, điều kiện chuyển trạng thái và quyền thực hiện.
4. Ma trận quyền chi tiết, phạm vi dashboard và định nghĩa các chỉ số.
5. Các chức năng được đưa vào phiên bản đồ án, bao gồm đính kèm, biểu đồ và sao lưu/phục hồi.
6. Thư viện giao diện được chọn, phiên bản tương thích và ranh giới sử dụng giữa các thư viện.
7. Giới hạn tệp đính kèm, định dạng ngày giờ và các quy tắc dữ liệu thực tế.
