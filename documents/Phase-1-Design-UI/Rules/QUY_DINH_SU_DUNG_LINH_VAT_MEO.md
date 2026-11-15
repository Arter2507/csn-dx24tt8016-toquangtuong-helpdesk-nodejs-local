# QUY ĐỊNH SỬ DỤNG STICKER LINH VẬT MÈO

**Dự án:** Website quản lý yêu cầu hỗ trợ kỹ thuật  
**Phiên bản:** 1.0  
**Trạng thái:** Đề xuất áp dụng, chưa xác nhận thiết kế hoặc triển khai  
**Tài liệu liên quan:** `SYSTEM_DESIGN_Design_System_Helpdesk.md`, `UX_UI_Kit_Helpdesk_Cat.md`

> Mục tiêu là tạo điểm nhận diện thân thiện bằng linh vật mèo, duy trì giao diện gọn gàng và dễ sử dụng. Logo, tên gọi, hình dáng và bộ sticker chính thức của dự án **chưa được xác định**. Các mẫu, kích thước và giới hạn trong tài liệu này là quy định thiết kế đề xuất cho dự án, không phải thông số của tài sản đã có.

## 1. Nguyên tắc chung

1. **Phục vụ nội dung:** sticker hỗ trợ nhận diện, phản hồi hoặc minh họa trạng thái; không thay thế thông điệp và chức năng.
2. **Đúng ngữ cảnh:** vui nhẹ với thông báo thành công; trung tính khi tải; nghiêm túc khi xảy ra lỗi hoặc thao tác có thể ảnh hưởng dữ liệu.
3. **Nhất quán:** cùng một nhân vật, phong cách nét vẽ, tỷ lệ và bảng màu trên toàn hệ thống.
4. **Dễ đọc:** không che chữ, biểu đồ, trạng thái, nút bấm, form hoặc focus của bàn phím.
5. **Giới hạn số lượng:** không biến mọi nút, thẻ và thông báo thành vị trí đặt mèo; các màn hình nhiều dữ liệu có thể không dùng sticker.
6. **Hoạt động không phụ thuộc sticker:** khi hình không tải, ẩn trên mobile hoặc người dùng giảm chuyển động, nội dung và thao tác vẫn đầy đủ.
7. **Tôn trọng nhận diện:** không tự ý biến đổi logo chính thức; chỉ ghép mascot với logo theo phương án được nhóm duyệt.

## 2. Thiết kế nhân vật và bộ trạng thái

### 2.1. Nhân vật chính

Đề xuất một nhân vật mèo thống nhất để làm trợ lý hỗ trợ kỹ thuật:

- Hình khối mềm, gương mặt dễ nhận biết, nét rõ và ít chi tiết.
- Phụ kiện chính: **headphone có micro** gợi vai trò tiếp nhận và hỗ trợ.
- Biến thể công việc: cùng nhân vật mặc trang phục kỹ thuật đơn giản, cầm tua vít hoặc dụng cụ sửa chữa phù hợp.
- Tư thế và biểu cảm thay đổi theo tình huống nhưng giữ cùng hình dáng, màu cơ bản và nét vẽ.
- Không đưa chữ nhỏ hoặc chi tiết phức tạp vào hình dùng trong toast; ở kích thước nhỏ phải nhìn được đường viền và nét mặt.

### 2.2. Danh mục sticker đề xuất

| Mã | Biểu cảm / tư thế | Tình huống | Mức độ |
|---|---|---|---|
| `cat-support` | Đeo headphone, vẻ thân thiện | Đăng nhập, chào mừng, nhận diện | Minh họa chính |
| `cat-success` | Mỉm cười nhẹ, có thể giơ tay | Thao tác hoàn tất | Điểm nhấn nhỏ |
| `cat-info` | Trung tính, đang lắng nghe | Thông tin thông thường | Điểm nhấn nhỏ, tùy chọn |
| `cat-warning` | Chú ý, biểu cảm bình tĩnh | Cảnh báo thông thường | Tùy chọn, không thay icon cảnh báo |
| `cat-error` | Nghiêm túc, đang kiểm tra | Lỗi thông thường có thể thử lại | Tùy chọn, không thể hiện vui đùa |
| `cat-loading` | Quan sát hoặc làm việc nhẹ | Tải trang hoặc tác vụ dài | Minh họa tải, khi thực sự cần |
| `cat-repair` | Cầm dụng cụ sửa chữa | Màn hình chờ, trạng thái rỗng liên quan xử lý | Minh họa phụ |
| `cat-empty` | Ngồi cạnh một khung trống | Không có yêu cầu hoặc không có kết quả | Minh họa trạng thái rỗng |

Tên mã là đề xuất để quản lý tài sản, không khẳng định file đã được tạo. Trong bản đầu, ưu tiên `cat-support`, `cat-success`, `cat-loading` và `cat-empty`; có thể bổ sung các trạng thái khác sau khi xét nhu cầu.

## 3. Quy định phối hợp với logo

### 3.1. Các phương án

| Phương án | Cách thể hiện | Vị trí phù hợp |
|---|---|---|
| Logo và mascot đứng cạnh nhau | Giữ nguyên logo; mascot đứng cạnh, cách một khoảng rõ ràng | Đăng nhập, trang giới thiệu |
| Mascot đeo headphone cùng nhận diện | Mascot sử dụng màu hoặc chi tiết gợi logo mà không sửa logo gốc | Đăng nhập, trạng thái rỗng, tài liệu dự án |
| Mascot xuất hiện cạnh khung logo | Mèo nhô nhẹ khỏi khung trang trí riêng, không che biểu tượng/chữ | Banner hoặc khu vực chào khi được duyệt |
| Logo và mascot thành một hình ghép | Thiết kế biến thể nhận diện riêng, xét khả năng đọc và quy tắc thương hiệu | Chỉ sử dụng sau khi có thiết kế và quyết định duyệt |

### 3.2. Quy tắc bắt buộc

- Giữ nguyên tỷ lệ, màu sắc và khoảng trống theo quy định của logo chính thức khi quy định đó đã được xác định.
- Không đặt headphone, dụng cụ hay nét mèo đè lên logo gốc; không kéo giãn, đổi màu hoặc thay nội dung logo khi chưa được duyệt.
- Logo và tên hệ thống phải nhận diện được độc lập khi mascot không xuất hiện.
- Không tạo hai biểu tượng ngang nhau khiến người dùng nhầm mascot với logo chính thức.
- Kiểm tra phiên bản ghép ở kích thước header và mobile. Nếu chi tiết không còn rõ, dùng logo gốc và đặt mascot tại vị trí khác.

## 4. Màu sắc và hòa hợp với giao diện

### 4.1. Màu nền đang đề xuất cho dự án

| Mục đích | Token / màu đề xuất |
|---|---|
| Nền trang | `--ds-bg: #F5F4FA` |
| Nền thẻ, toast | `--ds-surface: #FFFFFF` |
| Nền phụ | `--ds-surface-soft: #F0EDF9` |
| Màu nhận diện chính | `--ds-primary: #5B48B5` |
| Chữ chính | `--ds-text: #1D1B2A` |

### 4.2. Quy định màu sticker

- Chọn màu lông và phụ kiện dịu, tương thích với nền trắng, tím xám và màu nhận diện đã thống nhất; ưu tiên các màu trung tính và điểm nhấn tím.
- Màu của mèo phải tách được khỏi nền: dùng viền rõ hoặc một nền đệm nhạt khi cần; không đặt hình quá nhạt trực tiếp trên nền cùng màu.
- Không thêm nhiều màu bão hòa hoặc bóng sáng mạnh vào cùng một sticker. Màu biểu cảm phải phù hợp loại thông báo nhưng không là dấu hiệu duy nhất của loại thông báo.
- Giữ màu nhận diện chính của nhân vật ổn định giữa các trạng thái; thay biểu cảm hoặc đạo cụ thay vì thay toàn bộ bảng màu.
- Tránh nền sticker dạng ô vuông khác màu nền trang; ưu tiên tệp có nền trong suốt hoặc phiên bản đã thiết kế riêng cho bề mặt đặt.
- Nếu sau này có dark mode, cần thiết kế và kiểm tra phiên bản phù hợp; chưa tự suy ra màu từ giao diện sáng.

Không có bảng màu logo hoặc tài sản mascot chính thức để kiểm tra. Cần kiểm tra trực tiếp trên nền thực tế sau khi có thiết kế.

## 5. Mật độ và thứ tự ưu tiên hiển thị

Các giới hạn sau là **mặc định đề xuất**, áp dụng theo phần màn hình người dùng đang nhìn thấy, nhằm giữ giao diện thoáng:

| Đối tượng | Giới hạn mặc định |
|---|---|
| Logo cố định | Không tính vào số sticker nếu đó là logo độc lập, không có mascot |
| Minh họa mèo lớn | Tối đa 1 hình đang hiển thị trong một viewport |
| Sticker nhỏ ngoài logo | Tối đa 1 hình đang hiển thị cùng lúc trong một viewport |
| Toast chồng nhiều thông báo | Tối đa 1 toast đang hiển thị có sticker; các toast khác dùng icon trạng thái chuẩn |
| Một nhóm card hoặc một bảng | Không lặp mèo trên từng card hoặc từng dòng |
| Mobile | Ưu tiên 1 vị trí mascot trong viewport; có thể ẩn sticker trang trí nếu thiếu không gian |

Một mascot trong logo đã duyệt được xem là **nhận diện cố định**; tránh đặt thêm mascot thường trực ngay cạnh. Một toast được phép xuất hiện tạm thời cùng minh họa lớn nếu không che nội dung, nhưng mặc định **không gắn mèo vào toast** khi đã có hình mèo lớn trong viewport.

**Thứ tự quyết định khi nhiều vị trí cùng xuất hiện:**

1. Giữ nội dung, nút, cảnh báo và khả năng đọc.
2. Giữ nhận diện/logo cố định đã được duyệt.
3. Ưu tiên minh họa chính có ích cho trạng thái hiện tại, ví dụ đăng nhập hoặc không có dữ liệu.
4. Sticker toast là điểm nhấn tạm thời; nếu vượt giới hạn hoặc gây rối thì thay bằng icon chuẩn.
5. Tắt hiệu ứng mèo khi hover trước các yếu tố còn lại.

Các giới hạn chỉ điều chỉnh **đồ họa trang trí**. Không ẩn, trì hoãn vô thời hạn hoặc loại bỏ thông báo, lỗi, nội dung quan trọng để đạt giới hạn sticker.

## 6. Quy định theo vị trí sử dụng

### 6.1. Màn hình đăng nhập

- Có thể đặt một minh họa `cat-support` đeo headphone tại khu vực giới thiệu, cạnh nhận diện hệ thống.
- Logo, tên hệ thống, trường đăng nhập và nút đăng nhập phải rõ ràng và ưu tiên hơn minh họa.
- Desktop: hình có thể nằm trong cột riêng. Mobile: thu nhỏ hoặc ẩn hình nếu form thiếu chỗ; logo và form vẫn đầy đủ.
- Không để hình đè lên trường nhập hoặc biểu thị rằng đăng nhập đã thành công khi chưa có kết quả.
- Kích thước tham khảo: khoảng 160–240 px chiều rộng trên desktop, tùy bố cục; trên mobile không vượt vùng sẵn có. Các giá trị cần kiểm tra bằng thiết kế thực tế.

### 6.2. Toast và thông báo ngắn

**Cấu trúc:** icon trạng thái + tiêu đề/nội dung rõ + hành động hoặc nút đóng khi cần + sticker mèo nhỏ ở một góc nếu phù hợp. Sticker là lớp trang trí, không thay icon hoặc nội dung.

| Loại | Biểu cảm gợi ý | Ví dụ nội dung | Cách dùng |
|---|---|---|---|
| Thành công | `cat-success`, mỉm cười nhẹ | “Đã gửi yêu cầu hỗ trợ.” | Có thể dùng; ưu tiên sau thao tác có ý nghĩa |
| Thông tin | `cat-info`, lắng nghe | “Bạn có thông báo mới.” | Tùy chọn, tránh lặp với sự kiện thường xuyên |
| Cảnh báo | `cat-warning`, chú ý | “Vui lòng kiểm tra thông tin còn thiếu.” | Chỉ dùng nếu không làm giảm mức độ nghiêm túc |
| Lỗi thông thường | `cat-error`, bình tĩnh | “Không thể gửi yêu cầu. Vui lòng thử lại.” | Có thể dùng hình tĩnh; phải có chỉ dẫn xử lý |
| Lỗi nghiêm trọng / mất dữ liệu / phục hồi | Không dùng sticker trang trí | Thông điệp phù hợp tình huống | Ưu tiên icon cảnh báo chuẩn và thông tin rõ ràng |

- Sticker gợi ý 24–32 px; tối đa 40 px khi đủ chỗ. Đặt trong vùng riêng, không đè lên chữ, icon trạng thái, nút đóng hoặc nút hành động.
- Nhiều toast xuất hiện: thông báo vẫn hiển thị theo cơ chế hàng đợi/giới hạn của ứng dụng; chỉ một toast có mèo, các toast khác dùng icon chuẩn. Không bỏ mất thông báo quan trọng.
- Thông báo thành công ngắn có thể tự đóng sau khoảng **5–8 giây** nếu vẫn có cách xem lại khi cần; thời gian là giá trị thiết kế đề xuất, cần kiểm tra theo nội dung và người dùng. Tạm dừng tự đóng khi hover hoặc focus nếu có thể.
- Lỗi quan trọng hoặc thông báo yêu cầu hành động cần tồn tại đủ lâu để đọc và xử lý, hoặc được lưu tại vị trí có thể truy cập lại; không chỉ xuất hiện thoáng qua.
- Nội dung phải được thông báo cho công nghệ trợ giúp phù hợp mức độ; không đưa focus tự động vào toast thông thường. Sticker trang trí không có văn bản thay thế lặp lại nội dung.

### 6.3. Loading và skeleton

| Trường hợp | Quy định |
|---|---|
| Tải bảng, card hoặc dữ liệu cục bộ | Dùng skeleton/spinner và nhãn tải phù hợp; không thêm mèo vào từng khối |
| Tác vụ trang hoặc tác vụ dài | Có thể hiển thị một `cat-loading` nhỏ cùng chữ “Đang tải…” hoặc nội dung tương ứng |
| Có tiến độ thực | Có thể hiển thị giá trị tiến độ theo dữ liệu thật |
| Không biết tiến độ | Dùng trạng thái không xác định; không tạo phần trăm giả |
| Tải lỗi | Thay bằng nội dung lỗi và hành động xử lý; không để hình tiếp tục thể hiện đang tải |

Không chèn sticker vào mỗi skeleton row. Không làm chậm quá trình tải chỉ để hiển thị mascot. Chuyển động phải dừng hoặc giảm khi người dùng yêu cầu giảm chuyển động.

### 6.4. Màn hình trống và không tìm thấy

- Có thể hiển thị một `cat-empty` hoặc `cat-repair` khi chưa có yêu cầu, chưa có kết quả tìm kiếm hoặc trang không tìm thấy.
- Thứ tự nội dung: minh họa → tiêu đề → mô tả → hành động phù hợp quyền.
- Ví dụ: “Bạn chưa có yêu cầu hỗ trợ nào.” + “Tạo yêu cầu”. Với bộ lọc: “Không tìm thấy yêu cầu phù hợp.” + “Xóa bộ lọc”.
- Nếu nhiều khu vực cùng trống trong một viewport, chỉ chọn một khu vực có minh họa; các khu vực còn lại dùng chữ và icon đơn giản.

### 6.5. Dashboard, bảng và biểu đồ

- Có thể có một minh họa nhỏ tại vùng chào mừng hoặc trạng thái rỗng nếu không có mascot nổi bật khác.
- Không đặt mèo trên mọi thẻ KPI, từng dòng ticket hoặc trên vùng dữ liệu của biểu đồ.
- Mascot không che con số, chú giải, nhãn trục, trạng thái hoặc nút thao tác.
- Với trang nhiều dữ liệu, mặc định chỉ dùng logo và biểu tượng chức năng; không bắt buộc có sticker.

### 6.6. Hover vào component

- Mặc định dùng thay đổi nền, viền hoặc bóng nhẹ để thể hiện hover. Mèo chỉ là hiệu ứng phụ tùy chọn trên **một component điểm nhấn**, không áp dụng đại trà.
- Ví dụ phù hợp: tai mèo nhỏ xuất hiện tại góc khu vực chào hoặc mascot nhìn ra từ một thẻ giới thiệu; không che nhãn, biểu tượng hoặc focus.
- Không dùng mèo làm dấu hiệu duy nhất cho hover hoặc focus. Khi dùng bàn phím, component vẫn có focus rõ; tính năng không được phụ thuộc hover.
- Không tạo hiệu ứng hover trên mọi dòng bảng, mọi nút, các nút xóa hoặc cảnh báo quan trọng.
- Chuyển động nhẹ gợi ý 150–200 ms, không nhấp nháy; tắt khi `prefers-reduced-motion: reduce`. Trên thiết bị cảm ứng, giao diện đầy đủ ngay cả khi không có hover.

### 6.7. Thao tác có rủi ro hoặc ảnh hưởng dữ liệu

Đối với xóa, vô hiệu hóa tài khoản, sao lưu thất bại, phục hồi và các lỗi nghiêm trọng: dùng nội dung trực tiếp, icon cảnh báo phù hợp và xác nhận theo quy trình. **Không dùng sticker mèo vui đùa hoặc chuyển động trang trí** trong khu vực cảnh báo và hộp thoại xác nhận.

## 7. Chuyển động và khả năng tiếp cận

- Sticker là trang trí: không là nút bấm trừ khi được thiết kế rõ thành một chức năng và có nhãn truy cập.
- Hình trang trí dùng văn bản thay thế rỗng hoặc được ẩn khỏi trình đọc màn hình; hình mang thông tin cần có mô tả ngắn phù hợp.
- Không dùng biểu cảm mèo hoặc màu đơn lẻ để phân biệt thông báo thành công/lỗi; nội dung và icon trạng thái luôn rõ ràng.
- Hiệu ứng xuất hiện phải nhẹ; không nhấp nháy, không che focus, không kéo dài hoặc lặp vô hạn gây phân tâm.
- Khi giảm chuyển động, thay animation bằng hình tĩnh hoặc ẩn hình; thông báo và trạng thái tải vẫn đầy đủ.
- Khi hình lỗi hoặc bị chặn, khung không gây xô lệch giao diện; dùng icon chuẩn và nội dung văn bản như bình thường.
- Trên nền thực tế, kiểm tra độ tương phản của chữ, icon chức năng và focus theo design system; không coi sticker là phương tiện duy nhất truyền thông tin.

## 8. Quy định quản lý và triển khai tài sản

### 8.1. Tài sản và đặt tên

```text
assets/
  brand/
    logo-primary.svg               # khi có logo được duyệt
  mascot/
    cat-support.svg                # tên ví dụ
    cat-success.svg
    cat-info.svg
    cat-warning.svg
    cat-error.svg
    cat-loading.svg
    cat-repair.svg
    cat-empty.svg
```

Cấu trúc và tên file chỉ là ví dụ. Dùng SVG khi phù hợp với thiết kế và quy trình xuất file; có thể dùng PNG/WebP nền trong suốt khi hình raster phù hợp hơn. Phải kiểm tra chất lượng trên kích thước nhỏ, dung lượng và nguồn/quyền sử dụng tài sản. Không nhúng nội dung SVG không tin cậy trực tiếp vào ứng dụng.

### 8.2. Thành phần dùng chung

Có thể xây dựng `MascotIllustration` và `AppToast` dùng chung với các tham số đề xuất:

| Thuộc tính | Mục đích |
|---|---|
| `variant` | Chọn `support`, `success`, `info`, `warning`, `error`, `loading`, `repair`, `empty` |
| `size` | Chọn kích thước được quy định theo ngữ cảnh |
| `decorative` | Xác định hình trang trí hay có nội dung cần mô tả |
| `motion` | Cho phép chuyển động khi phù hợp cài đặt giảm chuyển động |
| `showMascot` trên toast | Bật/tắt hình trang trí theo mật độ và mức độ thông báo |

Mã, tên component và API chỉ là đề xuất; chức năng thực tế cần kết nối với logic thông báo và kiểm tra quyền của dự án. Không đặt logic lựa chọn hình rải rác tại mỗi trang.

## 9. Ví dụ phối hợp

| Màn hình / tình huống | Nên áp dụng | Tránh |
|---|---|---|
| Đăng nhập | Logo rõ + một mèo đeo headphone cạnh form | Mascot che logo hoặc trường mật khẩu |
| Gửi ticket thành công | Toast có icon thành công, chữ và mèo nhỏ ở góc khi còn đủ chỗ | Mèo thay toàn bộ chữ hoặc nhảy lớn che nút đóng |
| Nhiều toast đồng thời | Một toast có mèo, các toast khác dùng icon; nội dung vẫn được xử lý đầy đủ | Mỗi toast một hình mèo với hiệu ứng khác nhau |
| Dashboard nhiều ticket | Biểu đồ và danh sách rõ; có thể dùng một hình nhỏ ở khối chào | Một mèo trên mỗi KPI và từng dòng |
| Danh sách chưa có yêu cầu | Một mèo ngồi cạnh khung trống + CTA tạo yêu cầu | Nhiều sticker lặp lại trong từng ô trống |
| Tải dữ liệu | Skeleton đúng khối; chỉ một mèo nếu là trạng thái tải toàn trang dài | Một mèo chuyển động trong từng hàng skeleton |
| Hover card giới thiệu | Một chi tiết tai mèo xuất hiện nhẹ nếu không che nội dung | Toàn bộ card đều có mèo nhảy khi rê chuột |
| Khôi phục dữ liệu | Cảnh báo, phạm vi ảnh hưởng và xác nhận | Mèo vui đùa hoặc làm nhẹ mức độ cảnh báo |

## 10. Checklist kiểm tra trước khi đưa vào giao diện

- [ ] Nhân vật và logo dùng đúng bản được duyệt; không biến đổi logo gốc tùy tiện.
- [ ] Biểu cảm phù hợp loại thông báo và mức độ nghiêm trọng.
- [ ] Không vượt giới hạn hiển thị mặc định hoặc đã ghi nhận lý do ngoại lệ.
- [ ] Sticker không che chữ, nút, bảng, biểu đồ, focus hay vùng chạm.
- [ ] Toast vẫn có icon, nội dung và thao tác khi không tải được sticker.
- [ ] Lỗi quan trọng không biến mất trước khi người dùng có thể đọc/xử lý.
- [ ] Loading không tạo tiến độ giả và không trì hoãn nội dung chỉ để hiện mascot.
- [ ] Kiểm tra desktop, tablet, mobile, phóng to nội dung và các nền sáng thực tế.
- [ ] Bàn phím và thiết bị cảm ứng sử dụng được mà không phụ thuộc hover.
- [ ] Hỗ trợ giảm chuyển động; hình trang trí không gây lặp nội dung với trình đọc màn hình.
- [ ] Kiểm tra kích thước, dung lượng và quyền sử dụng tài sản trước khi tích hợp.

**Trạng thái xác minh:** chưa có logo, bộ sticker, bản giao diện hoặc kết quả kiểm thử thực tế được cung cấp trong tài liệu này.
