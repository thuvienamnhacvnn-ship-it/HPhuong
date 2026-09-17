# Hướng dẫn quản trị (Studio Verwaltung)

Đăng nhập: `/admin/login`. Vai trò:

| Vai trò | Được làm |
|---|---|
| **Inhaber:in** (owner) | mọi thứ + sửa giá/biến thể, hoàn tiền, khoá voucher, cài đặt, nhật ký |
| **Leitung** (manager) | duyệt/từ chối/đổi/huỷ lịch, tạo lịch tay, chặn lịch, sửa mô tả dịch vụ, khách hàng, tin nhắn |
| **Mitarbeitende** (therapist) | xem tổng quan & lịch (chỉ tên gọi khách), tiêu voucher tại tiệm |

## Việc hằng ngày

1. **Übersicht** — lịch trong ngày theo *Räume* hoặc *Mitarbeitende*. Ô sọc = đang *Angefragt* (vẫn giữ chỗ tới khi quyết định).
2. **Anfragen** — yêu cầu mới:
   - *Bestätigen* → khách nhận e-mail xác nhận, lịch nhắc 24 h được lên.
   - *Andere Zeit* → chọn ngày, chỉ hiện giờ hợp lệ (nhân viên, phòng, thiết bị, buffer).
   - *Ablehnen* → giải phóng chỗ, khách được báo.
   - Yêu cầu không ai xử lý sẽ **tự hết hạn** sau số giờ trong cài đặt (mặc định 24 h) và trả chỗ.
   - Gói *Pflege & Ruhe*: bấm *Paket einplanen* → hệ thống xếp chuỗi 2 dịch vụ liên tiếp, không nhét vào khe 60 phút.
3. **Kalender** — tuần theo nhân viên; *Termin manuell anlegen* (khách gọi điện); *Abwesenheit / Blockierung* (nghỉ phép, bảo trì phòng, đóng cửa).
   Chặn lịch **không xoá** lịch đã có — hệ thống báo lịch bị trùng để anh/chị dời.
4. **Gutscheine** — nhập mã khách đưa → *Prüfen* → nhập số tiền → *Abbuchen*. Không thể trừ quá số dư, kể cả khi hai máy trừ cùng lúc.
   Hoàn tiền: chỉ chủ tiệm; voucher đã dùng một phần phải chọn *Restguthaben erstatten* có chủ đích.
5. **Nachrichten** — trạng thái e-mail/WhatsApp thật (không bao giờ hiện "đã gửi" khi chưa có nhà cung cấp), tin nhắn liên hệ, hộp thư demo.

## Trước khi mở bán thật

- Nhập **địa chỉ, điện thoại, e-mail, mạng xã hội** trong *Einstellungen* (để trống thì website ẩn mục đó).
- Duyệt **giá, thời lượng, buffer, mô tả** từng dịch vụ trong *Behandlungen*, tick *Beschreibung freigegeben*.
- Cập nhật **giờ mở cửa, ca nhân viên, phòng, thiết bị** (hiện là dữ liệu demo trong seed — xem `src/lib/seed-data.ts`).
- Thay **Impressum / Datenschutz** (bảng `content_pages`) bằng bản đã được luật sư/tư vấn duyệt.
- Thay ảnh concept nội thất bằng ảnh thật của tiệm (giữ id, chạy `npm run assets`).
- Đổi mật khẩu các tài khoản demo, xoá dữ liệu demo (`is_demo = true`).
