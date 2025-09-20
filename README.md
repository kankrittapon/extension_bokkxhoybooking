# RocketBooker Extension

ส่วนขยาย Chrome สำหรับช่วยจอง PopMart Thailand โดยมีระบบล็อกอิน/กำหนดสิทธิ์ และควบคุมการทำงานผ่าน overlay บนหน้าเว็บ

## ภาพรวมระบบ
- **Popup (ภาษาไทยเต็มรูปแบบ)** – ใช้สมัครสมาชิก/เข้าสู่ระบบกับ Cloudflare Worker, จัดการสถานะเซสชัน และแสดงข้อมูลสิทธิ์ของผู้ใช้
- **Background service** – ติดต่อ Cloudflare Worker (/branches, /config, /log), แคชข้อมูล และจัดการการฝัง content script
- **Content script (`simple-content.js`)** – แสดงปุ่ม 🚀 บนเว็บ PopMart, มี overlay สำหรับตั้งค่าและเริ่มจอง (รองรับ Trial / Production) พร้อมบันทึก log แบบเรียลไทม์
- **Cloudflare Worker (auth + API)** – ให้บริการ API สำหรับล็อกอิน ลงทะเบียน ตรวจสิทธิ์ และ (เดิม) ดึงรายการสาขา/ตั้งค่า; จำเป็นต้อง deploy ก่อนใช้งานจริง

## สถาปัตยกรรมโดยย่อ
```
┌──────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│ Chrome Popup │ ─────▶ │ Background Service │ ─────▶ │ Cloudflare Worker  │
└──────────────┘         │  (background.js)   │         │  (auth-worker ...) │
        │                └─────────────────────┘         └─────────────────────┘
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Content Script                                                             │
│  • Overlay UI (simple-content.js)                                          │
│  • ตรวจสิทธิ์ผ่าน chrome.storage.local (api_token, auth_user ฯลฯ)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## เตรียม Cloudflare Worker
1. สร้างไฟล์ Worker จาก `workersource.js` (อยู่ใน repo หรือบริเวณเดียวกัน) แล้วตั้งค่า `wrangler.toml` เช่น
   ```toml
   name = "auth-worker"
   main = "workersource.js"
   compatibility_date = "2024-09-01"

   [[d1_databases]]
   binding = "USERS_DB"
   database_name = "rocketbooker_users"
   database_id = "<D1_DATABASE_ID>"
   ```
2. สร้างตาราง `users` สำหรับจัดเก็บข้อมูลสมาชิก (worker จะใช้คำสั่ง `INSERT/UPDATE` ตามคอลัมน์: username, password_hash, salt, role, expires_at, active, created_at, updated_at)
3. ตั้งค่า Secrets
   ```bash
   wrangler secret put ADMIN_API_KEY
   wrangler secret put JWT_SECRET
   wrangler secret put JWT_ISSUER
   ```
4. Deploy
   ```bash
   wrangler publish
   ```
5. ตรวจสอบให้ endpoint ทำงาน: 
   - `POST /api/login` – ล็อกอิน
   - `POST /api/register` – สมัครสมาชิก (ต้องใช้ `x-api-key` หลังจากสร้างบัญชีแรก)
   - `GET /api/me` – ตรวจสอบ token
   - (ตามโค้ดเสริม) `/branches`, `/config`, `/log`
6. ส่วนขยายตั้งค่า Worker base เป็นค่าเริ่มต้นที่ `https://auth-worker.kan-krittapon.workers.dev` สามารถเปลี่ยนได้ใน DevTools:
   ```js
   chrome.storage.local.set({ worker_base: 'https://<domain>.workers.dev' })
   ```

## ติดตั้งส่วนขยาย (โหมดนักพัฒนา)
1. เปิด Chrome → `chrome://extensions`
2. เปิด **Developer mode**
3. เลือก **Load unpacked** แล้วชี้ไปยังโฟลเดอร์โปรเจกต์
4. ตรวจสอบว่า manifest โหลดสำเร็จ (ชื่อ `BokkChoYxBooking` / icon rocket)

## วิธีใช้งาน
1. คลิก icon ส่วนขยาย → popup ภาษาไทยจะแสดงหน้าล็อกอิน/สมัครสมาชิก
   - **admin** – มีสิทธิ์จัดการผู้ใช้ (ผ่าน Worker API) และใช้งานจองได้เต็มรูปแบบ
   - **user** – ใช้งานจองได้เต็มรูปแบบ
   - **viewer** – เปิด overlay ได้แต่ปุ่ม “เริ่มจอง” จะถูกล็อก
2. หลังเข้าสู่ระบบ เปิดเว็บที่รองรับ (เช่น `https://popmartth.rocket-booking.app`) จะเห็นปุ่ม 🚀 ซ้ายบน
3. คลิกปุ่ม 🚀 เพื่อเปิด overlay
   - เลือกโหมด Trial / Production, เว็บไซต์, สาขา, วัน, เวลา
   - ปุ่ม “เริ่มจอง ⚡ ULTRA FAST” จะใช้งานได้เฉพาะผู้ใช้สิทธิ์ `user` ขึ้นไป
   - มี log panel บอกสถานะทุกขั้นตอน และส่ง log กลับไปที่ Worker (ถ้าตั้งค่าไว้)
4. สามารถหยุดการทำงานได้จาก overlay หรือ popup (ปุ่ม “ออกจากระบบ”)

## ค่าที่เก็บใน chrome.storage.local
| คีย์ | ใช้เพื่อ |
| --- | --- |
| `api_token` | JWT จาก Worker สำหรับเรียก API | 
| `auth_user` | ข้อมูลผู้ใช้ (username, role, expiresAt) | 
| `auth_expires_at` | ISO string ของวันหมดอายุ | 
| `auth_last_checked` | เวลาเช็กสถานะล่าสุด (ms) | 
| `worker_base` | URL Worker ที่ override (ถ้าไม่มีจะใช้ค่า default) | 
| `branches` | แคชรายชื่อสาขา (แบ่งตาม site key) | 
| `ext_config` | แคช config จาก Worker (ถ้ามี) |

## โครงสร้างสำคัญ
```
.
├── background.js        // จัดการ message, cache, และการยิง Worker API
├── popup.html           // Popup UI (ภาษาไทย)
├── popup.js             // ล็อกอิน/ลงทะเบียน/สถานะเซสชัน
├── simple-content.js    // Overlay + Booking automation
├── manifest.json        // Chrome manifest (MV3)
└── workersource.js      // (ตัวอย่าง) Cloudflare Worker API
```

## เคล็ดลับสำหรับนักพัฒนา
- ปรับค่า Worker ได้แบบ runtime โดยเปลี่ยน `worker_base` ผ่าน DevTools (ไม่ต้อง rebuild)
- ถ้า popup ไม่ตอบสนอง ให้เปิด DevTools (ปุ่ม `Inspect views` ในหน้า extensions) เพื่อตรวจ log/network
- overlay จะซ่อนตัวถ้าไม่พบ token หรือ token หมดอายุ เพื่อให้แน่ใจว่าต้องล็อกอินผ่าน popup ก่อนเสมอ
- ระวังสิทธิ์ host ใน `manifest.json` ต้องครอบคลุมโดเมนใหม่ ๆ ที่ Worker หรือเว็บไซต์หลักใช้งาน

## License
โปรเจกต์นี้เผยแพร่เพื่อใช้งานภายใน (internal/experimental use) โปรดตรวจสอบนโยบายของ PopMart ก่อนใช้งานในระบบจริง