# Tích hợp: trạng thái & cách bật

`GET /api/health` và *Admin → Einstellungen → Integrationen* luôn cho biết cái nào đang thật, sandbox hay giả lập.

| Tích hợp | Trạng thái bàn giao | Cách bật thật |
|---|---|---|
| **Trợ lý AI** | Tắt (chưa có key) → trang `/beratung` và nút *AI Beauty* chạy **Auswahlhilfe (ohne KI)** có nhãn rõ | Đặt `ANTHROPIC_API_KEY`. Model mặc định `claude-opus-5` (đổi bằng `ASSISTANT_MODEL`), effort `low`. Bật sẵn `fallbacks: "default"` khi model từ chối. Tool chỉ đọc; giá trong thẻ gợi ý luôn lấy từ DB; câu hỏi sức khoẻ → chuyển nhân viên; e-mail/số điện thoại bị xoá trước khi gửi model. |
| **E-mail** | Hộp thư demo (Admin → Nachrichten), **không gửi** | `RESEND_API_KEY` + `MAIL_FROM` (domain đã xác minh). Mỗi job có Idempotency-Key. |
| **WhatsApp** | Tắt | Tài khoản **WhatsApp Business Cloud API** chính thức, template đã duyệt (xác nhận / nhắc lịch / đổi lịch / huỷ, 3 tham số: tên, dịch vụ, thời gian). Đặt `WHATSAPP_*` rồi bật trong Einstellungen. Chỉ gửi khi khách tick đồng ý **và** có số điện thoại; thiếu cấu hình → bỏ qua, e-mail vẫn gửi. Không dùng phiên WhatsApp cá nhân / máy tính phải luôn bật. |
| **Thanh toán voucher** | **Sandbox**: trang *Testkasse* nội bộ, gửi webhook có chữ ký HMAC qua đúng đường xử lý thật | Cài adapter Stripe Checkout / PayPal Orders theo interface `PaymentProvider` trong `src/lib/payments.ts` + verify chữ ký webhook của nhà cung cấp trong `api/webhooks/payments/[provider]`. Chỉ bật khi chủ tiệm đã duyệt giá, thuế, điều kiện bán, AGB. Không lưu số thẻ. |
| **Đặt cọc lịch hẹn** | Không bật (trả tại tiệm, đúng KIT) | Xem mục "Thông tin và thanh toán dịch vụ" trong KIT: chỉ gửi link sau khi duyệt, có hold TTL. Chưa triển khai. |
| **Database** | PGlite (file trong `data/pgdata`) | PostgreSQL: `DATABASE_URL=…`, chạy `npm run db:push`, `npm run seed` (chỉ lần đầu). Backup: `pg_dump` hằng ngày + diễn tập restore. |
| **Bản đồ / mạng xã hội** | Ẩn (chưa có link thật) | Nhập URL trong Einstellungen. |
| **Video dịch vụ** | Không có (nút video ẩn) | Nhập URL WebM/MP4 trong Behandlungen. |

## Triển khai production (gợi ý)

1. `APP_SECRET` ngẫu nhiên, `APP_URL=https://…`, `TRUST_PROXY=1` sau nginx, `DATABASE_URL` Postgres.
2. `npm ci && npm run db:push && npm run assets && npm run build && npm start` (hoặc pm2/systemd).
3. Nhiều instance: `INPROCESS_WORKER=0` và chạy `npm run worker` đúng **một** tiến trình.
4. Cookie `secure` tự bật khi `NODE_ENV=production`. Trang admin và link khách đều `noindex`.
