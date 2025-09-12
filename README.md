# 🚀 RocketBooker Extension

Chrome Extension สำหรับจองบัตร PopMart Thailand แบบอัตโนมัติ รองรับทั้งโหมดทดลอง (Trial) และใช้งานจริง (Production)  
มาพร้อม Overlay UI ที่ควบคุมการทำงานได้โดยตรง ไม่จำเป็นต้องใช้ popup action panel  

---

## ✨ Features
- **Overlay UI**  
  กดที่ปุ่ม 🚀 บนหน้าเว็บเพื่อเปิด Overlay สำหรับควบคุมทั้งหมด (เลือกโหมด, เว็บไซต์, สาขา, วันเวลา)
- **Trial Mode / Production Mode**  
  - Trial: ใช้กับ botautoq / ithitec  
  - Production: ใช้กับ popmartth.rocket-booking.app
- **Branch Management**  
  - ดึงข้อมูลสาขาแบบสดจาก Cloudflare Worker (KV JSON)  
  - มี cache ใน background และ fallback hardcoded (กันกรณี worker ไม่ตอบ)  
- **Booking Flow**  
  - Auto-click Register → Branch → Next → Minigame → Date → Time → Confirm  
  - รองรับโหมดกด Register ด้วยตนเอง และ Delay เพิ่มเติมใน production
- **Minigame Bypass**  
  - 3D Rotation Captcha solver  
  - React Minigame Golden Ticket injection  
  - Generic React bypass fallback
- **Logging**  
  - Overlay แสดง log แบบเรียลไทม์  
  - ส่ง log กลับไปที่ Worker `/log` เพื่อบันทึกลง D1 Database
- **Config API**  
  - โหลดค่า config (จาก KV: `config_all.json`)  
  - ใช้สำหรับตั้งค่าต่าง ๆ โดยไม่ต้องแก้โค้ด extension

---

## 🗂 Project Structure
