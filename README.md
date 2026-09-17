# HPHUONG Cosmetic & Spa — Webapp

Website + hệ thống đặt lịch + voucher + trợ lý AI + trang quản trị, dựng theo **KIT 1 · Spa Atelier**
(`docs/KIT-BUILD-PROMPT.md`, `docs/KIT-ASSET-MAP.md`, `docs/kit-demo-data.json`, 13 màn trong `docs/kit-screens/`).

> Đây là bản **demo chạy được**: giá, dịch vụ, nhân sự, giờ mở cửa là dữ liệu mẫu (`is_demo`), thanh toán ở chế độ
> **sandbox**, e-mail vào **hộp thư demo**, WhatsApp **tắt**. Chủ tiệm phải duyệt nội dung/giá/pháp lý trước khi mở bán.

## Chạy local

Yêu cầu: Node ≥ 22.

```bash
npm install
cp .env.example .env.local        # tuỳ chọn, chạy được với file trống
npm run setup                     # migrations + seed demo + sinh ảnh WebP/AVIF
npm run dev                       # http://localhost:3035/de/start
```

- Tài khoản admin demo: `data/demo-credentials.txt` (sinh khi seed) → `http://localhost:3035/admin`
- PGlite chỉ cho **một tiến trình** mở DB: dừng `npm run dev` trước khi chạy `db:push` / `seed`.
- Muốn làm lại dữ liệu từ đầu (chỉ dev): xoá `data/pgdata` rồi `npm run setup`.

| Lệnh | Việc |
|---|---|
| `npm run dev` / `build` / `start` | Next.js 16 (cổng 3035) |
| `npm test` | 23 test nghiệp vụ (DB in-memory) |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:generate` → `db:push` | sửa `src/lib/db/schema.ts` → sinh SQL → áp |
| `npm run seed` | dữ liệu demo từ `kit-demo-data.json` |
| `npm run assets` | ảnh `assets/**.png` → `public/media/*.avif|webp` nhiều cỡ |
| `npm run logo:cutout` | tách nền logo → `assets/brand/logo-emblem.png` |
| `npm run worker` | worker gửi thông báo riêng (khi `INPROCESS_WORKER=0`) |

## Kiến trúc

- **Next.js 16 App Router + React 19 + TypeScript**, CSS thuần theo token (sáng *Spa Atelier* / tối *graphite & hồng đậm*).
- **Drizzle ORM** · PGlite khi dev, PostgreSQL khi đặt `DATABASE_URL` (cùng file SQL trong `drizzle/`).
- Module trong `src/lib/`:
  - `catalog.ts` dịch vụ/biến thể/ưu đãi, báo giá phía server
  - `scheduling.ts` bộ máy xếp lịch: nhân viên có kỹ năng ∩ phòng ∩ thiết bị ∩ giờ mở ∩ ca ∩ ngày nghỉ, buffer trước/sau,
    combo là chuỗi nhiều đoạn; giữ chỗ TTL; submit/duyệt/từ chối/huỷ/đổi lịch/hết hạn trong **một transaction + khoá đặt lịch**
  - `payments.ts` đơn voucher, provider sandbox, webhook HMAC idempotent, cấp voucher 1 lần, ledger, redeem/refund/void
  - `notifications/` hàng đợi job (dedupe key), mẫu DE/EN, adapter Resend / hộp thư demo / WhatsApp Cloud API
  - `assistant/` Claude + tool chỉ-đọc (`search_services`, `get_service`, `get_offer`, `get_availability`, `propose_booking`); không key → bộ lọc gợi ý có nhãn
  - `auth.ts` magic link cho khách, đăng nhập mật khẩu + vai trò cho nhân viên (owner ⊃ manager ⊃ therapist)
- Múi giờ `Europe/Berlin`, lưu UTC; xử lý đổi giờ mùa hè (`src/lib/time.ts`).
- Chống CSRF: `src/proxy.ts` chặn POST/PATCH/DELETE khác origin (trừ webhook có chữ ký). Rate limit trong bộ nhớ.

Chi tiết: `docs/API.md`, `docs/ADMIN-GUIDE.md`, `docs/INTEGRATIONS.md`, `docs/HANDOVER.md`.

## Routes

Công khai (`/de/…` và `/en/…` cùng ID): `start`, `behandlungen?category=`, `behandlungen/[id]?variant=`,
`termin?service=&variant=&date=&time=&staff=`, `termin/[token]`, `angebote`, `angebote/[offerId]`, `gutschein`,
`checkout?amount=`, `checkout/testzahlung/[session]`, `bestellung/[token]`, `studio`, `kontakt`, `beratung`,
`login`, `konto`, `rechtliches/impressum|datenschutz`.
Quản trị: `/admin`, `/admin/kalender`, `/admin/anfragen`, `/admin/behandlungen`, `/admin/gutscheine`, `/admin/kunden`,
`/admin/nachrichten`, `/admin/einstellungen`.
