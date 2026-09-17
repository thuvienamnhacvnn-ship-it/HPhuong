# HPHUONG — KIT 1 / Asset map

13 ảnh trang và 12 tài nguyên ảnh gồm logo gốc, logo tách nền và 10 ảnh sử dụng trong giao diện.

Ảnh là concept. Không suy diễn dịch vụ, giá, địa chỉ, đánh giá hoặc nhân sự thật từ ảnh. BUILD-PROMPT.md và demo-data.json có ưu tiên hơn chi tiết chữ tự sinh trong mockup. Bộ này là thiết kế, không chứa webapp đã lập trình.

## Tài nguyên

| File | Kích thước | Dùng cho |
|---|---|---|
| `assets/brand/logo-medallion.png` | 1254 × 1254 | Logo raster derivative; ngoài hình tròn trong suốt |
| `assets/brand/logo-original.png` | 1254 × 1254 | Logo gốc người dùng cung cấp |
| `assets/images/decor-lily.png` | 1254 × 1254 | Hoa trang trí, nền trong suốt; alt rỗng |
| `assets/images/gift-card-blank.png` | 1536 × 1024 | Thẻ quà tặng; giá và chữ là HTML |
| `assets/images/hero-desktop.png` | 1659 × 948 | Hero ngang, khoảng trống dành cho HTML bên trái |
| `assets/images/hero-mobile.png` | 1024 × 1536 | Hero dọc cho màn hình nhỏ |
| `assets/images/ritual-still-life.png` | 1536 × 1024 | Ưu đãi và liên hệ |
| `assets/images/service-facial.png` | 1122 × 1402 | Dịch vụ chăm sóc da mặt |
| `assets/images/service-footcare.png` | 1122 × 1402 | Chăm sóc bàn chân wellness |
| `assets/images/service-headspa.png` | 1122 × 1402 | Dịch vụ head spa |
| `assets/images/service-massage.png` | 1122 × 1402 | Dịch vụ massage thư giãn |
| `assets/images/studio-interior.png` | 1660 × 948 | Không gian concept, không phải ảnh tiệm thật |
| `screens/01-home.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/02-services.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/03-treatment.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/04-booking.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/05-offers.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/06-checkout.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/07-studio.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/08-contact.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/09-ai.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/10-account.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/11-mobile-home.png` | 1024 × 1536 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/12-mobile-booking.png` | 1024 × 1536 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |
| `screens/13-admin.png` | 1536 × 1024 | Ảnh minh họa giao diện; không dùng làm nền thay cho HTML |

## Chú ý khi triển khai

- Giữ logo gốc; logo-medallion là raster tách nền, không phải vector chuẩn thương hiệu. Descriptor UI dùng Cosmetic & Spa; không tự sửa chữ trên file gốc.
- Mobile 11/12 là tham chiếu màu sắc và thành phần. Ở 360–390 px phải ẩn thanh rail desktop, dùng header thu gọn và dock dưới; không thu nhỏ nguyên screenshot.
- Ngày, giá, menu active, badge và số liệu admin lấy từ dữ liệu. Form đặt lịch phải ghi nhân viên đúng nhãn.
- Không gắn ảnh AI thành nhân viên hay nội thất thật. Không dùng review/rating/chứng nhận giả.
- Voucher overlay bằng HTML; không rasterize giá hoặc thông tin giao dịch.
- Nếu chưa có video thật thì ẩn nút video.
- Ảnh sạch chữ trong assets/images; ảnh bố cục trong screens.