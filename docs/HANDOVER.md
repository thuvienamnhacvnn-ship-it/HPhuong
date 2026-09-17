# Bàn giao — trạng thái so với KIT 1

## Đã làm & đã kiểm

- 13 màn: Home, Behandlungen, chi tiết, Termin (desktop 3 cột / mobile từng bước), Angebote, Gutschein + Checkout,
  Studio, Kontakt, Beratung (AI), Konto, Home mobile, Termin mobile, Admin — code HTML/CSS thật, ảnh sạch chữ từ `assets/`,
  không dùng screenshot làm giao diện.
- Theo yêu cầu thêm của chủ dự án (17/09): **bỏ thanh menu dọc**, header ngang có logo; **logo tách nền cỡ lớn** bên trái banner Home
  (`assets/brand/logo-emblem.png`, bản raster dẫn xuất — đối chiếu logo gốc trước khi in); **giao diện tối** graphite + hồng đậm
  (nút mặt trăng/mặt trời, nhớ bằng cookie); **hoạ tiết mềm**: nền hoa ly mờ, mảng màu loang, sóng viền vàng, cánh hoa bay nhẹ
  (tắt khi người dùng chọn giảm chuyển động).
- Bộ máy đặt lịch có tài nguyên, buffer, giữ chỗ TTL, pending → duyệt, tự hết hạn, đổi lịch nguyên tử, combo theo chuỗi.
- Voucher: sandbox checkout, webhook HMAC idempotent, cấp 1 lần, ledger, redeem đồng thời an toàn, refund/void có quyền.
- Thông báo: hàng đợi có dedupe, nhắc 24 h, huỷ lịch huỷ nhắc, WhatsApp chỉ khi opt-in + có số, fallback e-mail.
- Trợ lý AI (Claude + tool chỉ-đọc) + chế độ không-AI có nhãn.
- Tài khoản khách bằng magic link; admin có vai trò; audit log; CSRF/origin check; rate limit; token có hạn.
- **23 test nghiệp vụ** (`npm test`) — gồm toàn bộ danh sách "Test nghiệp vụ bắt buộc" của KIT:
  giá 6900/9900, đổi biến thể đổi slot, combo 120' không lọt khe 60', 2 request cùng phòng chỉ 1 thắng (kể cả buffer),
  pending không hiện confirmed, webhook lặp chỉ cấp 1 voucher, redeem 70 € còn 30 €, 2 redeem đồng thời không âm,
  không WhatsApp khi chưa opt-in/thiếu số, huỷ lịch huỷ job nhắc, retry e-mail không trùng voucher, AI không bịa giá, DST.
- `npm run typecheck`, `npm run lint` (0 lỗi), `npm run build` thành công.
- Kiểm tra tay trên Chrome: đặt lịch thật tới trạng thái *Angefragt*, mua voucher 100 € qua sandbox → *Zahlung bestätigt*,
  admin tiêu 70 € còn 30 €, tiêu vượt bị chặn, duyệt lịch; mobile 390 px không tràn ngang.

## Giả lập / sandbox (cần cấu hình thật)

AI (không key), e-mail (hộp thư demo), WhatsApp (tắt), thanh toán (sandbox), Postgres (đang PGlite). Xem `INTEGRATIONS.md`.

## Cần dữ liệu từ chủ tiệm

Địa chỉ, điện thoại, e-mail, giờ mở cửa thật, nhân viên + kỹ năng + ca, phòng/thiết bị, giá & mô tả đã duyệt,
Impressum/Datenschutz/AGB, điều kiện voucher (thời hạn, hoàn tiền), ảnh thật của tiệm, link mạng xã hội/bản đồ,
tên miền + e-mail gửi, tài khoản Stripe/PayPal, WhatsApp Business.

## Giới hạn đã biết

- Kéo-thả trong lịch admin chưa có; đổi lịch làm qua *Verschieben* (engine vẫn kiểm tra).
- Giờ mở cửa / ca / phòng sửa qua seed hoặc DB, chưa có form.
- Chưa có PDF voucher (voucher gửi mã qua e-mail).
- Chế độ tối dùng cùng ảnh sáng; chữ nâu nhỏ "KOSMETICK SPA" trong logo kém nổi hơn trên nền tối (đã tăng sáng + quầng sáng).
- Concurrency test chạy trên PGlite (tuần tự hoá sẵn); với Postgres, khoá `SELECT … FOR UPDATE` trên `business_settings` đảm bảo tuần tự.
