# Bàn giao — trạng thái so với KIT 1

## Đã làm & đã kiểm

- 13 màn: Home, Behandlungen, chi tiết, Termin (desktop 3 cột / mobile từng bước), Angebote, Gutschein + Checkout,
  Studio, Kontakt, Beratung (AI), Konto, Home mobile, Termin mobile, Admin — code HTML/CSS thật, ảnh sạch chữ từ `assets/`,
  không dùng screenshot làm giao diện.
- Theo yêu cầu thêm của chủ dự án (17/09): **bỏ thanh menu dọc**, header ngang có logo; **logo tách nền cỡ lớn** bên trái banner Home
  (`assets/brand/logo-emblem.png`, bản raster dẫn xuất — đối chiếu logo gốc trước khi in); **giao diện tối** graphite + hồng đậm
  (nút mặt trăng/mặt trời, nhớ bằng cookie); **hoạ tiết mềm**: sóng viền vàng, cánh hoa bay nhẹ, hoạ tiết góc thẻ
  (tắt khi người dùng chọn giảm chuyển động).
- **Khung toàn màn hình (yêu cầu 17/09):** trên máy tính (rộng > 900px, cao ≥ 560px) mỗi trang là 1 hoặc nhiều khung cao đúng 1 màn hình,
  cuộn dừng khít từng khung (`scroll-snap`). Header cố định, footer nằm trong khung cuối. Kontakt = 2 khung, các trang khác = 1 khung.
  Đã đo tự động ở 1920×1080, 1440×900, 1536×864, 1366×768, 1366×657: không phần nào bị cắt, không khung nào cuộn bên trong.
  Màn thấp (≤ 780px) tự chuyển chế độ gọn. Điện thoại giữ cuộn tự nhiên (form đặt lịch không thể nằm trong 1 màn điện thoại).
  Code: `src/components/Frame.tsx`, `src/styles/frames.css`.
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

## Cập nhật 06/10/2026 — dữ liệu thật từ 2 tờ flyer của tiệm

- Thông tin tiệm (địa chỉ, 2 số điện thoại, e-mail, giờ mở Mo–Fr 9:30–18:30, thứ Bảy "nach Vereinbarung") và **toàn bộ
  bảng giá 67 dòng / 9 nhóm** lấy từ flyer, nằm ở một chỗ: `src/lib/flyer-data.ts`. Sửa giá/tên → sửa file đó rồi
  `npm run catalog:sync` (dừng `npm run dev` trước khi chạy với PGlite), hoặc sửa trong `/admin/behandlungen`.
- 25 dòng có thời lượng → đặt lịch online. 42 dòng flyer không ghi thời lượng → chỉ hiện tên + giá, nút đặt thay bằng
  "Termin telefonisch oder per WhatsApp". Không có số phút nào tự đặt (`minutes = null`).
- 4 dịch vụ demo cũ + combo "Pflege & Ruhe" + thiết bị Head-Spa: trong DB cũ được **ẩn** (`visible=false`, combo `active=false`),
  không xoá; DB mới seed thì không có. Dữ liệu demo cũ nay chỉ còn là fixture của test (`tests/fixture.ts`).
- **Vẫn là demo** (chưa có nguồn): nhân viên "Mitarbeitende A/B" + ca làm, 2 phòng, buffer 15' sau mỗi liệu trình, phân loại
  phòng cho từng dịch vụ, tài khoản admin, Impressum/Datenschutz, mệnh giá voucher. Thanh "Demo-Version…" và
  `publicLaunchEnabled=false` giữ nguyên.
- DB production (nếu đã seed bản demo): `npm run db:push` (áp `0002_flyer_catalog.sql`) rồi `npm run catalog:sync` —
  **chưa chạy**, chờ chủ dự án quyết.
- Test: 33 (23 cũ chạy trên fixture + 10 test mới cho catalog flyer trong `tests/flyer.test.ts`).
  Đối chiếu dữ liệu đang chạy với flyer: `node _w-agent/kiem-flyer.mjs` (phải ra 67/67).
