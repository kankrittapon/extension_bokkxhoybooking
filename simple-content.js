console.log('🚀 RocketBooker Loading (FAST)…');

/* ===== Speed profile ===== */
const POLL_MS = 50;                // aggressive polling
const CLICK_JITTER = [5, 15];      // tiny human-ish jitter
const STEP_DELAY = [10, 25];       // very short step delays
const SHORT_DELAY = () => new Promise(r => setTimeout(r, Math.floor(Math.random()*(STEP_DELAY[1]-STEP_DELAY[0]+1))+STEP_DELAY[0]));
const JITTER = () => new Promise(r => setTimeout(r, Math.floor(Math.random()*(CLICK_JITTER[1]-CLICK_JITTER[0]+1))+CLICK_JITTER[0]));

let isRunning = false;

/* ===== Site detection ===== */
function detectSite() {
  const url = window.location.href;
  if (url.includes('popmartth.rocket-booking.app')) return 'popmartrock';
  if (url.includes('botautoq.web.app')) return 'pm';
  if (url.includes('popmart.ithitec.com')) return 'ith';
  return null;
}

/* ===== Branch list ===== */
let BRANCHES = [];

/* ===== Overlay UI ===== */
const overlay = document.createElement('div');
overlay.innerHTML = `
<div id="rb-rocket" style="position:fixed;top:20px;right:20px;z-index:999999999;width:50px;height:50px;background:#667eea;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;font-size:20px;box-shadow:0 4px 20px rgba(0,0,0,0.3);">🚀</div>
<div id="rb-panel" style="position:fixed;top:20px;right:80px;z-index:999999999;width:300px;background:#667eea;border-radius:12px;color:white;padding:20px;display:none;">
  <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
    <span style="font-weight:bold;">🚀 RocketBooker FAST</span>
    <button id="rb-close" style="background:none;border:none;color:white;cursor:pointer;font-size:18px;">×</button>
  </div>

  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-size:12px;font-weight:bold;">โหมด:</label>
    <select id="rb-mode" style="width:100%;padding:8px;border:none;border-radius:6px;color:#333;">
      <option value="trial">ทดลอง</option>
      <option value="production">ใช้งานจริง</option>
    </select>
  </div>

  <div id="rb-production-options" style="display:none;margin-bottom:15px;">
    <div style="margin-bottom:10px;">
      <label style="display:flex;align-items:center;font-size:12px;">
        <input type="checkbox" id="rb-use-delay" style="margin-right:8px;">
        เพิ่ม Delay
      </label>
    </div>
    <div style="margin-bottom:10px;">
      <label style="display:flex;align-items:center;font-size:12px;">
        <input type="checkbox" id="rb-manual-register" style="margin-right:8px;">
        กด Register ด้วยตัวเอง
      </label>
    </div>
  </div>

  <div id="rb-site-section" style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-size:12px;font-weight:bold;">เว็บไซต์:</label>
    <select id="rb-site" style="width:100%;padding:8px;border:none;border-radius:6px;color:#333;">
      <option value="pm">PopMart (botautoq)</option>
      <option value="ith">PopMart (ithitec)</option>
    </select>
  </div>

  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-size:12px;font-weight:bold;">สาขา:</label>
    <select id="rb-branch" style="width:100%;padding:8px;border:none;border-radius:6px;color:#333;"></select>
  </div>

  <div style="margin-bottom:15px%;">
    <label style="display:block;margin-bottom:5px;font-size:12px;font-weight:bold;">วันที่:</label>
    <select id="rb-day" style="width:100%;padding:8px;border:none;border-radius:6px;color:#333;"></select>
  </div>

  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-size:12px;font-weight:bold;">เวลา:</label>
    <select id="rb-time" style="width:100%;padding:8px;border:none;border-radius:6px;color:#333;"></select>
  </div>

  <div id="rb-status" style="text-align:center;padding:12px;border-radius:6px;background:rgba(255,255,255,0.2);font-size:14px;font-weight:bold;margin-bottom:15px;">กำลังตรวจสอบ...</div>

  <button id="rb-start" style="width:100%;padding:12px;border:none;border-radius:6px;background:#28a745;color:white;cursor:pointer;font-weight:bold;font-size:14px;margin-bottom:10px;">เริ่มจอง FAST</button>

  <div style="margin-bottom:10px;">
    <label style="display:block;margin-bottom:5px;font-size:12px;font-weight:bold;">📋 Log:</label>
    <div id="rb-log-content" style="background:rgba(0,0,0,0.5);border-radius:6px;padding:10px;max-height:150px;overflow-y:auto;font-family:monospace;font-size:11px;">
      <div style="color:#87CEEB;">🚀 RocketBooker FAST พร้อมใช้งาน</div>
    </div>
  </div>
</div>
`;
function ensureOverlay() {
  // หา panel ที่คุณสร้างไว้แล้ว (#rb-panel)
  const panel = document.getElementById('rb-panel');
  if (!panel) return null;

  // ถ้ายังไม่มีปุ่ม Stop ให้สร้าง
  let stopBtn = document.getElementById('rb-stop');
  if (!stopBtn) {
    const startBtn = document.getElementById('rb-start');

    stopBtn = document.createElement('button');
    stopBtn.id = 'rb-stop';
    stopBtn.textContent = '⏹️ Stop';
    stopBtn.style.cssText = `
      width:100%;padding:12px;border:none;border-radius:6px;
      background:#dc3545;color:white;cursor:pointer;font-weight:bold;font-size:14px;
    `;
    stopBtn.disabled = true; // เริ่มแรกปิดไว้ก่อน

    stopBtn.addEventListener('click', () => {
      window.isStopped = true;
      isRunning = false;
      try { addLog('⏹️ กด Stop จาก Overlay', '#FFB6C1'); } catch {}
    });

    // แทรกไว้ “ถัดจากปุ่ม Start”
    if (startBtn && startBtn.parentElement) {
      startBtn.parentElement.insertBefore(stopBtn, startBtn.nextSibling);
    } else {
      panel.appendChild(stopBtn);
    }
  }

  return panel;
}
document.body.appendChild(overlay);
ensureOverlay();

// === Overlay status badge ===
function setOverlayStatusBadge() {
  const panel = document.getElementById('rb-panel');
  if (!panel) return;
  let badge = document.getElementById('rb-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'rb-badge';
    badge.style.cssText = 'margin:8px 0;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.25);font-size:12px;';
    panel.insertBefore(badge, panel.firstChild.nextSibling); // ใต้ header
  }
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  const uiManual = document.getElementById('rb-manual-register')?.checked || false;
  const opts = getRBOpts();
  const manualRegister = (mode === 'production' && uiManual) || opts.manualRegister === true;
  const useDelay = (mode === 'production' && (document.getElementById('rb-use-delay')?.checked || false)) || opts.useDelay === true;

  badge.textContent = `Mode: ${mode} | ManualRegister: ${manualRegister ? 'ON' : 'OFF'} | Delay: ${useDelay ? 'ON' : 'OFF'}`;
}
setOverlayStatusBadge();
const useDelayCk = document.getElementById('rb-use-delay');
const manualCk   = document.getElementById('rb-manual-register');
useDelayCk?.addEventListener('change', setOverlayStatusBadge);
manualCk?.addEventListener('change', setOverlayStatusBadge);

// === โหลด branches จาก background แล้วเติมใน overlay ===
// --- helper: map siteKey ให้ตรงกับฝั่ง background/worker
function mapSiteKeyForWorker(raw) {
  const k = String(raw || '').toLowerCase();
  if (k === 'pm' || k === 'botautoq') return 'botautoq';
  if (k === 'ith' || k === 'ithitec') return 'ithitec';
  if (k === 'popmartrock' || k === 'rocketbooking' || k === 'production') return 'rocketbooking';
  return 'rocketbooking';
}

// --- helper: fallback ฮาร์ดโค้ด
function hardcodedBranches() {
  return [
    "Terminal 21","Centralworld","Siam Center","Seacon Square","MEGABANGNA",
    "Central Westgate","Central Ladprao","Fashion Island","Emsphere","Central Pattaya",
    "Central Chiangmai","Icon Siam","Central Dusit","Wacky Mart Event"
  ];
}

// --- (ทางเลือก) ดึงตรงจาก Worker เผื่อ background ไม่ตอบ (มือถือ/Orion)
async function directFetchBranches(siteKey) {
  try {
    const base = 'https://branch-api.kan-krittapon.workers.dev';
    const res = await fetch(`${base}/branches`, { credentials: 'omit', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const bySite = json?.data?.branches || json?.branches || json?.data || json;
    const key = mapSiteKeyForWorker(siteKey);
    const out = Array.isArray(bySite?.[key]) ? bySite[key] : [];
    return out;
  } catch (e) {
    addLog(`⚠ directFetchBranches ล้มเหลว: ${e}`, '#FFB6C1');
    return [];
  }
}

// === โหลด branches แล้วเติมใน overlay (มี fallback ครบ) ===
async function refreshBranchesIntoOverlay() {
  const branchSelect = document.getElementById('rb-branch');
  if (!branchSelect) return;

  // แสดง “กำลังโหลด…”
  branchSelect.innerHTML = '';
  const loadingOpt = document.createElement('option');
  loadingOpt.value = ''; loadingOpt.textContent = 'กำลังโหลด…';
  branchSelect.appendChild(loadingOpt);

  try {
    // map site จาก overlay → key ที่ background/worker เข้าใจ
    const siteSel = document.getElementById('rb-site')?.value || 'pm';
    const siteMap = { pm: 'botautoq', ith: 'ithitec', popmartrock: 'rocketbooking' };
    const siteKey = siteMap[siteSel] || siteSel || 'rocketbooking';

    let list = [];

    // 1) ขอจาก background (ตั้ง timeout กัน service worker ไม่ตอบ)
    try {
      const bg = await new Promise((resolve) => {
        let done = false;
        const tid = setTimeout(() => { if (!done) resolve(null); }, 1200);
        chrome.runtime.sendMessage({ action: 'getBranches', site: siteKey }, (resp) => {
          if (done) return; done = true; clearTimeout(tid);
          resolve(resp);
        });
      });
      if (bg && bg.ok && Array.isArray(bg.branches)) list = bg.branches;
    } catch {}

    // 2) ถ้า background ไม่ได้ ให้ fetch ตรงจาก Worker
    if (!list.length) list = await directFetchBranches(siteKey);

    // 3) ถ้ายังว่าง ลอง cache จาก storage
    if (!list.length) {
      try {
        const { branches } = await chrome.storage.local.get('branches');
        const cached = branches?.[siteKey];
        if (Array.isArray(cached) && cached.length) list = cached;
      } catch {}
    }

    // 4) สุดท้าย → ฮาร์ดโค้ด
    if (!list.length) {
      list = hardcodedBranches();
      addLog('⚠ ใช้สาขาแบบฮาร์ดโค้ด (fallback)', '#FFB6C1');
    }

    // เก็บ cache (งวดหน้าโหลดเร็ว)
    try {
      const { branches = {} } = await chrome.storage.local.get('branches');
      branches[siteKey] = list.slice();
      await chrome.storage.local.set({ branches, branches_updated_at: Date.now() });
    } catch {}

    // render
    branchSelect.innerHTML = '';
    list.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b; opt.textContent = b;
      branchSelect.appendChild(opt);
    });

    // อัปเดตตัวแปรกลาง (ถ้ามีการอ้าง BRANCHES อื่น ๆ)
    try { BRANCHES = list.slice(); } catch {}

    addLog(`✅ โหลดสาขาแล้ว (${siteKey}) : ${list.length} รายการ`, '#90EE90');
  } catch (e) {
    // error หนักมาก → ยัง fallback ได้อยู่
    const list = hardcodedBranches();
    branchSelect.innerHTML = '';
    list.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b; opt.textContent = b;
      branchSelect.appendChild(opt);
    });
    try { BRANCHES = list.slice(); } catch {}
    addLog('⚠ โหลดสาขาไม่สำเร็จทั้งหมด → ใช้ฮาร์ดโค้ด', '#FFB6C1');
  }
}

/* ===== UI wiring ===== */
setTimeout(function() {
  const rocket = document.getElementById('rb-rocket');
  const panel = document.getElementById('rb-panel');
  const closeBtn = document.getElementById('rb-close');
  const modeSelect = document.getElementById('rb-mode');
  const siteSelect = document.getElementById('rb-site');

  rocket?.addEventListener('click', function() {
    if (panel.style.display === 'none' || !panel.style.display) {
      panel.style.display = 'block';
      checkStatus();
      setOverlayStatusBadge();
      refreshBranchesIntoOverlay();
    } else {
      panel.style.display = 'none';
    }
  });
  closeBtn?.addEventListener('click', function(){ panel.style.display = 'none'; });

  modeSelect?.addEventListener('change', function() {
    const mode = this.value;
    const siteSection = document.getElementById('rb-site-section');
    const productionOptions = document.getElementById('rb-production-options');

    if (mode === 'trial') {
      siteSection.style.display = 'block';
      productionOptions.style.display = 'none';
      siteSelect.innerHTML = `
        <option value="pm">PopMart (botautoq)</option>
        <option value="ith">PopMart (ithitec)</option>
      `;
    } else {
      siteSection.style.display = 'none';
      productionOptions.style.display = 'block';
      siteSelect.innerHTML = `<option value="popmartrock">PopMart Thailand</option>`;
    }
    checkStatus();
    setOverlayStatusBadge();
    refreshBranchesIntoOverlay();
  });

  siteSelect?.addEventListener('change', () => {
    checkStatus();
    setOverlayStatusBadge();
    refreshBranchesIntoOverlay();
  });

  // populate selects (day/time)
  refreshBranchesIntoOverlay();
  const daySelect = document.getElementById('rb-day');
  if (daySelect) {
    daySelect.innerHTML = '';
    for (let d=1; d<=31; d++){
      const o=document.createElement('option');
      o.value=o.textContent=String(d);
      daySelect.appendChild(o);
    }
  }
  const timeSelect = document.getElementById('rb-time');
  if (timeSelect) {
    timeSelect.innerHTML = '';
    ['10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
     '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00',
     '19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00']
      .forEach(t => {
        const o=document.createElement('option');
        o.value=t; o.textContent=t;
        timeSelect.appendChild(o);
      });
  }

  document.getElementById('rb-start')?.addEventListener('click', startBooking);

}, 100);


/* ===== Status + Logging ===== */
function checkStatus() {
  const mode = document.getElementById('rb-mode')?.value;
  const site = document.getElementById('rb-site')?.value;
  const currentSite = detectSite();
  const status = document.getElementById('rb-status');
  if (!mode || !status) return;
  const expectedSite = (mode === 'trial') ? site : 'popmartrock';
  if (currentSite === expectedSite) {
    status.textContent = '✅ พร้อมใช้งาน';
    status.style.background = 'rgba(40, 167, 69, 0.8)';
  } else {
    status.textContent = '❌ เว็บไซต์ไม่ตรงกับโหมด';
    status.style.background = 'rgba(220, 53, 69, 0.8)';
  }
}
function addLog(message, color = '#87CEEB') {
  ensureOverlay();
  const logContent = document.getElementById('rb-log-content');
  if (!logContent) return;
  const time = new Date().toLocaleTimeString('th-TH');
  const entry = document.createElement('div');
  entry.style.color = color;
  entry.style.marginBottom = '2px';
  entry.textContent = `[${time}] ${message}`;
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;
}

/* ===== FAST helpers ===== */
window.POLL_MS = typeof POLL_MS === 'number' ? POLL_MS : 80;
if (typeof JITTER !== 'function') {
  window.JITTER = () => new Promise(r => setTimeout(r, 25 + Math.floor(Math.random() * 35)));
}
const isVisible = (el) => !!el && el.offsetParent !== null;
const isEnabled = (el) =>
  !!el && !el.disabled && !el.hasAttribute('disabled') &&
  window.getComputedStyle(el).pointerEvents !== 'none';

function getRBOpts(){ try { return window.RB_OPTS || {}; } catch { return {}; } }

async function waitXPath(xp, timeout = 8000) {
  const t0 = performance.now();
  const evalOne = () =>
    document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  let el = evalOne();
  if (el) return el;

  return await new Promise((resolve, reject) => {
    const poll = setInterval(() => {
      el = evalOne();
      if (el) { clearInterval(poll); resolve(el); }
      else if (performance.now() - t0 > timeout) {
        clearInterval(poll); reject(new Error('Timeout: ' + xp));
      }
    }, window.POLL_MS);
  });
}

async function clickFast(el) {
  if (!el) throw new Error('clickFast(null)');
  if (isVisible(el) && isEnabled(el)) {
    const opts = getRBOpts();
    if (opts && typeof opts.clickDelay === 'number' && opts.clickDelay > 0) {
      await new Promise(r=>setTimeout(r, opts.clickDelay));
    }
    await JITTER(); el.click(); return;
  }

  const t0 = performance.now();
  await new Promise((resolve, reject) => {
    const poll = setInterval(() => {
      if (!document.contains(el)) { clearInterval(poll); reject(new Error('Element replaced/removed')); return; }
      if (isVisible(el) && isEnabled(el)) {
        clearInterval(poll);
        (async ()=>{
          const opts = getRBOpts();
          if (opts && typeof opts.clickDelay === 'number' && opts.clickDelay > 0) {
            await new Promise(r=>setTimeout(r, opts.clickDelay));
          }
          await JITTER(); el.click(); resolve();
        })();
        return;
      }
      if (performance.now() - t0 > 4000) { clearInterval(poll); reject(new Error('Timeout waiting enable')); }
    }, window.POLL_MS);
  });
}

function findButtonByText(texts = []) {
  const all = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'));
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  for (const el of all) {
    const t = norm(el.textContent || el.value);
    if (!t) continue;
    if (texts.some((x) => t.includes(norm(x)))) return el;
  }
  return null;
}
function makeGoldenTicket() {
  // === สูตร brand ตามซอร์สเก่า ===
  const w = [2497, 2468, 2497, 2408, 2025, 2552, 2604];
  const brand = btoa(
    Array.from(String.fromCharCode(...w.map(e => (e - 17 + 104729) * 10127 % 104729)))
      .map(e => e.charCodeAt(0))
      .map(e => (31 * e + 17) % 104729)
      .join(',')
  )
  .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');

  const fakeData = {
    ts: Math.floor(Date.now()/1000),
    d: 1,        // depth/hardness (ตามเก่า)
    acc: 100,    // accuracy
    t: Math.round((3 + Math.random() * 2) * 1000),
    mv: 10 + Math.floor(Math.random() * 5),
    re: 5 + Math.floor(Math.random() * 3),
    brand
  };

  // === golden ticket ===
  return btoa(JSON.stringify(fakeData)).substring(0, 256);
}

// ===== Minigame (ithitec + popmartrock) =====
async function handleMinigame() {
  // ทำงานเฉพาะ 2 โฮสต์นี้เท่านั้น
  if (!/ithitec|rocket-booking/.test(location.hostname)) return false;

  addLog('🎮 ตรวจสอบมินิเกม...', '#87CEEB');

  // 1) 3D Rotation Captcha (ถ้ามี)
  const viewport = document.getElementById('captcha-viewport');
  if (viewport) {
    addLog('🔍 พบ 3D Rotation Captcha', '#87CEEB');
    const solved = await solve3DRotation();
    if (solved) {
      addLog('✅ 3D Rotation แก้แล้ว!', '#90EE90');
      return true;
    }
  }

  // 2) React Minigame + Golden Ticket (ถ้ามี)
  // NOTE: ถ้า prod ใช้คลาสต่างจาก '.sc-623bb80d-0'
  // ให้เพิ่ม selector อื่น ๆ ต่อท้ายได้ตามต้องการ
  const reactContainer =
    document.querySelector('.sc-623bb80d-0') ||
    document.querySelector('[data-minigame-root]') ||
    null;

  if (reactContainer) {
    addLog('🔍 พบ React Minigame', '#87CEEB');
    const ok = await pushGoldenTicketToReact('.sc-623bb80d-0');
    if (ok) {
      addLog('✅ Golden Ticket ส่งสำเร็จ!', '#90EE90');
      return true;
    }
  }

  // 3) Fallback bypass (เผื่อเปลี่ยน implementation)
  const bypassed = await tryBypassReactMinigame();
  if (bypassed) {
    addLog('✅ Minigame bypass สำเร็จ!', '#90EE90');
    return true;
  }

  addLog('✅ ไม่พบมินิเกม', '#90EE90');
  return false;
}

async function solve3DRotation() {
  try {
    const viewport = document.getElementById('captcha-viewport');
    if (!viewport) return false;
    const rect = viewport.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dragDistances = [360, 480, 540];

    for (const dx of dragDistances) {
      viewport.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,pointerType:'mouse',clientX:cx,clientY:cy,buttons:1,bubbles:true}));
      viewport.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,pointerType:'mouse',clientX:cx+dx,clientY:cy,buttons:1,bubbles:true}));
      viewport.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,pointerType:'mouse',clientX:cx+dx,clientY:cy,buttons:0,bubbles:true}));
      await SHORT_DELAY();

      const status = document.getElementById('captcha-status');
      const statusText = status ? status.textContent || '' : '';
      if (statusText.includes('ถูกต้อง')) {
        viewport.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,pointerType:'mouse',clientX:cx,clientY:cy,buttons:1,bubbles:true}));
        await new Promise(r=>setTimeout(r,1500));
        viewport.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,pointerType:'mouse',clientX:cx,clientY:cy,buttons:0,bubbles:true}));
        return true;
      }
    }
    return false;
  } catch { return false; }
}
async function pushGoldenTicketToReact(containerSelector = '.sc-623bb80d-0') {
  const container = document.querySelector(containerSelector);
  if (!container) return false;

  const ticket = makeGoldenTicket();

  // หา React Fiber และ onSuccess ตามซอร์สเก่า
  const key = Object.keys(container).find(k => k.startsWith('__reactFiber$'));
  if (!key) return false;

  let fiber = container[key];
  if (fiber && fiber.return) fiber = fiber.return;
  if (fiber && fiber.return) fiber = fiber.return;

  const onSuccess = fiber?.memoizedProps?.onSuccess;
  if (typeof onSuccess === 'function') {
    onSuccess(ticket);
    console.log('Golden Ticket pushed:', ticket);
    return true;
  }
  return false;
}

async function tryBypassReactMinigame(){
  try{
    const root=document.body, stack=[root];
    while(stack.length){
      const el=stack.pop();
      for (const k in el){
        if (!k.startsWith('__reactFiber$') && !k.startsWith('__reactProps$')) continue;
        const props = el[k]?.pendingProps || el[k];
        if (props && typeof props==='object'){
          const cb = props.onSuccess || props.onsuccess || props.handleSuccess || props.onSolved;
          if (typeof cb === 'function'){ cb({ goldenTicket:true }); return true; }
        }
      }
      if (el.children) for (const c of el.children) stack.push(c);
    }
  } catch {}
  return false;
}

async function waitRegisterReady({
  xpath = "//button[normalize-space()='Register'] | //div//*[normalize-space()='Register'] | //button[normalize-space()='ลงทะเบียน']",
  timeoutMs = 600000 // 10 นาที ปรับได้
} = {}) {
  const disabledLooksGray = (rgb) => {
    // heuristic กันสีเทาหลายเฉด ไม่ผูก 222 เดี่ยว ๆ
    const m = (rgb || '').match(/\d+/g);
    if (!m) return false;
    const [r,g,b] = m.map(Number);
    const close = Math.abs(r-g) < 10 && Math.abs(g-b) < 10;
    return close && r < 200; // โทนเทาเข้ม ๆ = ยังไม่ active
  };

  const nowBtn = () => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

  let btn = nowBtn();
  if (!btn) {
    // รอให้ปุ่มโผล่มาก่อน
    btn = await waitXPath(xpath, 15000); // มีอยู่แล้วในไฟล์นี้
  }

  // พร้อมแล้ว? (ไม่ disabled + ไม่เทา)
  const ok = (node) => {
    if (!node) return false;
    const style = getComputedStyle(node);
    const ariaDisabled = node.getAttribute('aria-disabled') === 'true';
    return !node.disabled && !ariaDisabled && !disabledLooksGray(style.backgroundColor);
  };
  if (ok(btn)) return btn;

  // เฝ้า attributes + re-query กันโดน re-render
  return await new Promise((resolve, reject) => {
    const t0 = performance.now();
    const check = () => {
      const current = nowBtn();
      if (ok(current)) { resolve(current); return true; }
      if (performance.now() - t0 > timeoutMs) { reject(new Error('Timeout waiting Register active')); return true; }
      return false;
    };

    const mo = new MutationObserver(() => { if (check()) mo.disconnect(); });
    // observe โหนดปุ่มแรกที่เจอ; ถ้าเว็บ re-render เราก็ re-query ใน check()
    mo.observe(btn, { attributes: true, attributeFilter: ['class','style','disabled','aria-disabled'] });

    // safety poll เผื่อปุ่มถูกแทนที่ทั้งโหนด
    const iv = setInterval(() => {
      if (check()) { clearInterval(iv); mo.disconnect(); }
    }, 80);
  });
}

/* ===== Booking steps ===== */
async function clickRegister(){
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  const manualRegister = document.getElementById('rb-manual-register')?.checked || false;
  const opts = getRBOpts();

  if ((mode === 'production' && manualRegister) || opts.manualRegister === true) {
    addLog('👆 โหมดกด Register ด้วยตัวเอง - รอให้ผู้ใช้กด...', '#FFB6C1');
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const currentUrl = window.location.href;
      if (currentUrl.includes('/branch') || currentUrl.includes('/booking') || document.querySelector('[data-testid="branch-selection"]')) {
        addLog('✅ ผู้ใช้กด Register แล้ว!', '#90EE90');
        break;
      }
    }
    return;
  }

  addLog('🔍 หา Register…');
	const xp = "//button[normalize-space()='Register'] | //div//*[normalize-space()='Register'] | //button[normalize-space()='ลงทะเบียน']";
	const el = await waitRegisterReady({ xpath: xp, timeoutMs: 600000 }); // รอจน active จริง
	if (opts && typeof opts.registerDelay === 'number' && opts.registerDelay > 0) {
	await new Promise(r=>setTimeout(r, opts.registerDelay));
	}
	await clickFast(el);
  addLog('🎯 Register แล้ว', '#90EE90');
  await SHORT_DELAY();
}

// Detect if branch selection page is visible
function isBranchPageVisibleNow(){
  try {
    if (document.querySelector('[data-testid="branch-selection"]')) return true;
    for (const name of BRANCHES){
      const xp = `//div//*[normalize-space()='${name}']`;
      const el = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (el && el.offsetParent !== null) return true;
    }
  } catch {}
  return false;
}
async function waitBranchPageVisible(timeoutMs = 3000){
  const t0 = performance.now();
  while (performance.now() - t0 < timeoutMs){
    if (isBranchPageVisibleNow()) return true;
    await new Promise(r=>setTimeout(r, 100));
  }
  return false;
}
async function closeAnyModalIfPresent(){
  try {
    const closeXp = "//span[@role='img' and @aria-label='close'] | //button[@aria-label='close'] | //button[normalize-space()='Close'] | //div[contains(@class,'ant-modal-close')]";
    const el = document.evaluate(closeXp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (el && el.offsetParent !== null){ el.click(); await SHORT_DELAY(); }
  } catch {}
}
async function ensureBranchPage(maxRetries = 5){
  for (let i=0;i<maxRetries;i++){
    const ok = await waitBranchPageVisible(2500);
    if (ok) return;
    addLog('🔁 ยังไม่พบหน้าสาขา - ปิดหน้าต่างแล้วลอง Register ใหม่', '#FFB6C1');
    await closeAnyModalIfPresent();
    await new Promise(r => setTimeout(r, 150)); // เหมือน oldsource 150ms
    await clickRegister();
  }
  // last wait
  await waitBranchPageVisible(2000);
}
async function clickNext(){
  addLog('➡️ รอปุ่ม Next เปิดใช้งาน...');
  const xp = "//button[normalize-space()='Next'] | //button[normalize-space()='ถัดไป']";

  let el = null;
  const t0 = performance.now();
  while (performance.now() - t0 < 15000) {
    el = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (el && isVisible(el) && isEnabled(el)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!el || !isEnabled(el)) throw new Error('Next button not enabled - branch may not be selected properly');

  await clickFast(el);
  addLog('✅ Next แล้ว', '#90EE90');
  await SHORT_DELAY();
}
const norm = (s)=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
function quickFindBranch(name){
  const target = norm(name);
  const mode = document.getElementById('rb-mode')?.value || 'trial';

  if (mode === 'production') {
    const smartBtns = document.querySelectorAll('button:not([class*="full"]):not([class*="disabled"]):not([disabled]),[role="button"]:not([class*="full"]):not([class*="disabled"])');
    for (const b of smartBtns){ const t=norm(b.innerText||b.textContent); if (t && (t===target || t.includes(target)) && isVisible(b)) return b; }
    const smartDivs = document.querySelectorAll('div:not([class*="full"]):not([class*="disabled"]),span:not([class*="full"]):not([class*="disabled"])');
    for (const d of smartDivs){ const t=norm(d.innerText||d.textContent); if (t && (t===target || t.includes(target)) && isVisible(d) && d.onclick) return d; }
  } else {
    const btns = document.querySelectorAll('button,[role="button"]');
    for (const b of btns){ const t=norm(b.innerText||b.textContent); if (t && (t===target || t.includes(target)) && isVisible(b) && isEnabled(b)) return b; }
    const divs = document.querySelectorAll('div,span');
    for (const d of divs){ const t=norm(d.innerText||d.textContent); if (t && (t===target || t.includes(target)) && isVisible(d) && d.onclick) return d; }
  }
  return null;
}
async function selectBranch(name){
  addLog(`🏢 เลือกสาขา: ${name}`);

  const currentSite = detectSite();
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  let branchWait = 1000;
  if (mode === 'production') branchWait = 1000; // เร็วขึ้น
  else if (currentSite === 'pm') branchWait = 600;
  await new Promise(r => setTimeout(r, branchWait));

  // ลองหาตรง ๆ ก่อน
  let el = quickFindBranch(name);
  if (!el) {
    addLog(`⚠️ ไม่เจอสาขา ${name} รอสักครู่...`, '#FFB6C1');
    const t0 = performance.now();

    await new Promise((resolve, reject) => {
      let done = false;
      const resolveOnce = (v) => { if (done) return; done = true; resolve(v); };
      const rejectOnce  = (e) => { if (done) return; done = true; reject(e); };

      const poll = setInterval(async () => {
        // เคสหยุดกลางทาง
        if (window.isStopped) { clearInterval(poll); return rejectOnce(new Error('STOPPED')); }

        // re-query ชื่อสาขาเป้าหมาย
        el = quickFindBranch(name);
        if (el) {
          clearInterval(poll);
          addLog(`✅ เจอสาขา ${name} แล้ว!`, '#90EE90');
          return resolveOnce();
        }

        // หมดเวลา 10s → ลองกลยุทธ์พิเศษ + fallback
        if (performance.now() - t0 > 10000) {
          clearInterval(poll);

          // กลยุทธ์พิเศษเฉพาะ production: ปิด modal + คลิกพื้นที่ว่าง + re-check
          if (mode === 'production') {
            addLog('🔄 ปิด popup/Modal และคลิกพื้นที่ว่าง...', '#FFB6C1');
            try {
              // ปิด modal ที่ติดอยู่ (ใช้ util เดิมถ้ามี)
              try { await closeAnyModalIfPresent(); } catch {}
              // เพิ่ม safety ปิดไอคอน close ที่เจอ
              try {
                document.querySelectorAll('span[role="img"][aria-label="close"], button[aria-label="close"]').forEach(x => x.click());
              } catch {}

              // คลิกกลางหน้าจอ 1 ครั้ง
              setTimeout(() => {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                try { document.elementFromPoint(centerX, centerY)?.click(); } catch {}

                // รอสั้น ๆ แล้ว re-check สาขาเป้าหมาย
                setTimeout(() => {
                  el = quickFindBranch(name);
                  if (el) {
                    addLog(`✅ เจอสาขา ${name} หลังคลิกพื้นที่ว่าง!`, '#90EE90');
                    return resolveOnce();
                  }

                  // ไม่เจอ → ลองสาขาทดแทนจากลิสต์
                  for (const branch of BRANCHES) {
                    el = quickFindBranch(branch);
                    if (el) {
                      addLog(`🔄 ใช้สาขาทดแทน: ${branch}`, '#FFB6C1');
                      return resolveOnce();
                    }
                  }
                  return rejectOnce(new Error('Branch not found even after clicking area'));
                }, 250);
              }, 150);
            } catch (e) {
              console.log('Click area error:', e);
              return rejectOnce(e);
            }
          } else {
            // โหมดอื่น: ลองสาขาทดแทนทันที
            for (const branch of BRANCHES) {
              el = quickFindBranch(branch);
              if (el) {
                addLog(`🔄 ใช้สาขาทดแทน: ${branch}`, '#FFB6C1');
                return resolveOnce();
              }
            }
            return rejectOnce(new Error('No branches found'));
          }
        }
      }, POLL_MS);
    });
  }

  if (!el) throw new Error('Branch element not found');

  addLog(`🎯 กำลังคลิกสาขา...`, '#87CEEB');
  await clickFast(el);
  addLog(`✅ คลิกสาขาแล้ว!`, '#90EE90');
  await new Promise(r => setTimeout(r, 500));
}

// ---------- helpers ----------
const TIME_LIST = ['10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'];

function isDisplayedEnabled(el) {
  if (!el) return false;
  if (el.offsetParent === null) return false;
  if (el.disabled || el.hasAttribute('disabled')) return false;
  const css = getComputedStyle(el);
  if (css.pointerEvents === 'none' || css.visibility === 'hidden' || css.display === 'none') return false;
  const aria = el.getAttribute('aria-disabled');
  if (aria === 'true') return false;
  // กันกรณีปุ่ม “เทา” จากคลาส/สไตล์
  const bg = css.backgroundColor || '';
  const m = bg.match(/\d+/g);
  if (m) {
    const [r,g,b] = m.map(Number);
    const grayish = Math.abs(r-g) < 10 && Math.abs(g-b) < 10 && r < 200;
    if (grayish) return false;
  }
  return true;
}

function findEnabledBtnByTextExact(txt) {
  const norm = s => String(s||'').replace(/\s+/g,' ').trim();
  const cand = Array.from(document.querySelectorAll('button,[role="button"]'));
  for (const b of cand) {
    if (norm(b.textContent) === String(txt) && isDisplayedEnabled(b)) return b;
  }
  return null;
}

function listEnabledBtns() {
  return Array.from(document.querySelectorAll('button,[role="button"]')).filter(isDisplayedEnabled);
}

// ---------- วันที่: รองรับ fallback ----------
async function selectDate(day, opts = {}) {
  // opts.allowFallback=true, opts.searchWindow=[0..+2] เป็นต้น
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  const allowFallback = opts.allowFallback !== false; // default true
  const searchWindow = Array.isArray(opts.searchWindow) ? opts.searchWindow : [0,1,2]; // 0=วันนี้(ปุ่มที่เห็นอยู่), +1,+2 วันถัดไป (บน UI เดียวกัน)

  addLog(`📅 เลือกวันที่: ${day}`);

  let targetBtn = null;

  // โหมด production: ใช้ query แบบ “ปุ่มไม่เต็ม ไม่ disabled”
  if (mode === 'production') {
    // 1) exact match ก่อน
    targetBtn = findEnabledBtnByTextExact(day);
    if (targetBtn) {
      await clickFast(targetBtn);
      addLog(`🎯 เลือกวันที่: ${day} แล้ว`, '#90EE90');
      await SHORT_DELAY();
      window.RB_LAST_SELECTION = { ...(window.RB_LAST_SELECTION||{}), day };
      return;
    }

    // 2) fallback (ถ้าอนุญาต)
    if (allowFallback) {
      addLog(`⚠️ วันที่ ${day} ใช้ไม่ได้/ไม่พบ กำลังมองหาวันที่ใกล้เคียง...`, '#FFB6C1');
      // กลยุทธ์: หา “เลขวัน” ใกล้เคียงที่สุดที่มีปุ่ม enabled ในหน้าปัจจุบัน
      const enabled = listEnabledBtns()
        .map(el => ({ el, txt: String((el.textContent||'').trim()) }))
        .filter(x => /^\d{1,2}$/.test(x.txt)); // ปุ่มที่เป็นตัวเลขวัน

      // เรียงโดยระยะห่าง
      const dayNum = Number(day);
      enabled.sort((a,b) => Math.abs(Number(a.txt)-dayNum) - Math.abs(Number(b.txt)-dayNum));

      if (enabled.length) {
        targetBtn = enabled[0].el;
        const picked = enabled[0].txt;
        await clickFast(targetBtn);
        addLog(`🔄 ใช้วันทดแทน: ${picked}`, '#FFB6C1');
        await SHORT_DELAY();
        window.RB_LAST_SELECTION = { ...(window.RB_LAST_SELECTION||{}), day: picked };
        return;
      }
    }
  } else {
    // โหมด trial: ใช้ XPath แบบเดิมก่อน
    const xp = `//button[normalize-space()='${day}']`;
    const el = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (isDisplayedEnabled(el)) {
      el.click();
      addLog(`🎯 เลือกวันที่: ${day} แล้ว`, '#90EE90');
      await SHORT_DELAY();
      window.RB_LAST_SELECTION = { ...(window.RB_LAST_SELECTION||{}), day };
      return;
    }
    if (allowFallback) {
      addLog(`⚠️ วันที่ ${day} ใช้ไม่ได้/ไม่พบ กำลังมองหาวันที่ใกล้เคียง...`, '#FFB6C1');
      const enabled = listEnabledBtns()
        .map(el => ({ el, txt: String((el.textContent||'').trim()) }))
        .filter(x => /^\d{1,2}$/.test(x.txt));
      const dayNum = Number(day);
      enabled.sort((a,b) => Math.abs(Number(a.txt)-dayNum) - Math.abs(Number(b.txt)-dayNum));
      if (enabled.length) {
        targetBtn = enabled[0].el;
        const picked = enabled[0].txt;
        await clickFast(targetBtn);
        addLog(`🔄 ใช้วันทดแทน: ${picked}`, '#FFB6C1');
        await SHORT_DELAY();
        window.RB_LAST_SELECTION = { ...(window.RB_LAST_SELECTION||{}), day: picked };
        return;
      }
    }
  }

  throw new Error(`ไม่พบ/เลือกไม่ได้สำหรับวันที่: ${day}`);
}

// ---------- เวลา/รอบ: รองรับ fallback ----------
async function selectTimeOrRound(timeOrRound, opts = {}) {
  // opts.allowFallback=true, opts.strategy='nearest'|'first'
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  const allowFallback = opts.allowFallback !== false;
  const strategy = opts.strategy || 'nearest';

  addLog(`⏰ เลือกเวลา: ${timeOrRound}`);

  // 1) exact match ก่อน
  let el = findEnabledBtnByTextExact(timeOrRound);
  if (el) {
    await clickFast(el);
    addLog(`🎯 เลือกเวลา: ${timeOrRound} แล้ว`, '#90EE90');
    await SHORT_DELAY();
    window.RB_LAST_SELECTION = { ...(window.RB_LAST_SELECTION||{}), time: timeOrRound };
    return;
  }

  // 2) ถ้า user ส่งเป็น round (index 1-based) → map ไป TIME_LIST
  if (!el && /^\d+$/.test(String(timeOrRound))) {
    const idx = Number(timeOrRound);
    if (idx >= 1 && idx <= TIME_LIST.length) {
      const t = TIME_LIST[idx - 1];
      el = findEnabledBtnByTextExact(t);
      if (el) {
        await clickFast(el);
        addLog(`🎯 เลือกเวลา (รอบ ${idx}): ${t}`, '#90EE90');
        await SHORT_DELAY();
        window.RB_LAST_SELECTION = { ...(window.RB_LAST_SELECTION||{}), time: t };
        return;
      }
    }
  }

  // 3) fallback หาเวลาใกล้เคียง/อันแรกที่ว่าง
  if (allowFallback) {
    addLog(`⚠️ เวลา ${timeOrRound} ใช้ไม่ได้/ไม่พบ กำลังมองหาเวลาทดแทน...`, '#FFB6C1');

    // รวบรวมเวลาที่ “เห็นและคลิกได้”
    const enabled = listEnabledBtns()
      .map(el => ({ el, txt: String((el.textContent||'').trim()) }))
      .filter(x => /^\d{1,2}:\d{2}$/.test(x.txt)); // รูปแบบ HH:MM

    if (!enabled.length) throw new Error(`ไม่พบเวลาใด ๆ ที่เลือกได้ในหน้านี้`);

    let pick = null;

    if (strategy === 'first') {
      pick = enabled[0];
    } else {
      // nearest: หาเวลาที่ใกล้เคียงที่สุดกับ target
      const toMin = (s) => {
        const [h,m] = s.split(':').map(Number);
        return (h*60)+m;
      };
      const targetStr = /^\d{1,2}:\d{2}$/.test(String(timeOrRound))
        ? String(timeOrRound)
        : (() => {
            // ถ้าเป็นเลขรอบ → map เวลา, ถ้าไม่ใช่ → ใช้ค่าแรกใน TIME_LIST
            if (/^\d+$/.test(String(timeOrRound))) {
              const idx = Number(timeOrRound);
              return (idx>=1 && idx<=TIME_LIST.length) ? TIME_LIST[idx-1] : TIME_LIST[0];
            }
            return TIME_LIST[0];
          })();

      const targetMin = toMin(targetStr);
      enabled.sort((a,b) => Math.abs(toMin(a.txt)-targetMin) - Math.abs(toMin(b.txt)-targetMin));
      pick = enabled[0];
    }

    await clickFast(pick.el);
    addLog(`🔄 ใช้เวลาทดแทน: ${pick.txt}`, '#FFB6C1');
    await SHORT_DELAY();
    window.RB_LAST_SELECTION = { ...(window.RB_LAST_SELECTION||{}), time: pick.txt };
    return;
  }

  throw new Error(`ไม่พบเวลา: ${timeOrRound}`);
}

async function waitForElementDynamic(xpath, maxWait = 8000) {
  const maxAttempts = Math.ceil(maxWait/50);
  for (let i = 0; i < maxAttempts; i++) {
    const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (el && el.offsetParent !== null && !el.hasAttribute('disabled')) return el;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Element not found: ${xpath}`);
}
async function confirmDateTime(){
  addLog('✅ ยืนยันวันเวลา...');
  const xp = "//button[normalize-space()='Confirm'] | //button[normalize-space()='ยืนยัน']";
  const el = await waitForElementDynamic(xp);
  await clickFast(el);
  addLog('🎯 ยืนยันวันเวลาแล้ว', '#90EE90');
  await SHORT_DELAY();
}
async function clickCheckbox(){
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  const useDelay = document.getElementById('rb-use-delay')?.checked || false;
  const opts = getRBOpts();

  addLog('☑️ หา checkbox...');
  if ((mode === 'production' && useDelay) || opts.useDelay === true) {
    const waitMs = typeof opts.clickDelay === 'number' && opts.clickDelay > 0 ? opts.clickDelay : 2000;
    addLog('⏳ เพิ่ม Delay ตามตั้งค่า...', '#FFB6C1');
    await new Promise(r=>setTimeout(r, waitMs));
  }

  const xp = "//input[@type='checkbox']";
  let attempts = 0;
  const maxAttempts = 2000;

  while (attempts < maxAttempts) {
    const el = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (el && el.offsetParent !== null && !el.hasAttribute('disabled') && !el.checked) {
      addLog('✅ พบ checkbox!');
      el.click();
      addLog('🎯 ติ๊กแล้ว', '#90EE90');
      await SHORT_DELAY();
      return;
    }
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  addLog('⚠️ ไม่พบ checkbox', '#FFB6C1');
}
async function confirmBookingFinal(){
  try {
    addLog('🎯 ยืนยันการจองขั้นสุดท้าย...');
    const xp = "//button[normalize-space()='Confirm Booking'] | //button[normalize-space()='ยืนยันการจอง']";
    const el = await waitForElementDynamic(xp, 3000);
    await clickFast(el);
    addLog('🎉 ยืนยันการจองแล้ว!', '#90EE90');
  } catch {}
}

/* ===== Main flow ===== */
async function startBooking() {
  if (isRunning) { addLog('⚠️ กำลังทำงานอยู่แล้ว', '#FFB6C1'); return; }

  // === helpers (เฉพาะใน scope นี้) ===
  const stopError = Symbol('STOP');
  const checkStop = () => { if (window.isStopped) throw stopError; };

  async function runStep(label, fn) {
    addLog(`▶️ ${label}...`);
    const t0 = performance.now();
    await fn();
    const dt = Math.round(performance.now() - t0);
    addLog(`✅ ${label} (${dt}ms)`, '#90EE90');
    checkStop();
  }

  // รีเซ็ตสถานะเริ่มต้น
  window.isStopped = false;
  isRunning = true;

  // ปุ่มบน overlay (ถ้ามี)
  const startBtn = document.getElementById('rb-start');
  const stopBtn  = document.getElementById('rb-stop');
  if (startBtn) { startBtn.textContent = 'กำลังจอง ULTRA FAST...'; startBtn.disabled = true; }
  if (stopBtn)  { stopBtn.disabled = false; }

  // อัปเดต badge ให้ตรงกับตัวเลือกตอนเริ่ม
  try { setOverlayStatusBadge?.(); } catch {}

  try {
    // ตรวจว่าอยู่เว็บ/โหมดถูกต้องก่อน
    const mode    = document.getElementById('rb-mode')?.value;
    const siteSel = document.getElementById('rb-site')?.value;
    const expected = (mode === 'trial') ? siteSel : 'popmartrock';
    const actual   = detectSite();

    if (!expected || !actual || actual !== expected) {
      addLog(`❌ เว็บไซต์/โหมดไม่ตรง (expected=${expected || '-'}, actual=${actual || '-'})`, '#FFB6C1');
      throw new Error('SITE_MISMATCH');
    }

    // อ่านค่าจาก UI
    const branch = document.getElementById('rb-branch')?.value;
    const day    = document.getElementById('rb-day')?.value;
    const time   = document.getElementById('rb-time')?.value;

    // ตรวจความครบ (แจ้งผู้ใช้ชัดเจน)
    if (!branch) { addLog('⚠️ ยังไม่ได้เลือกสาขา', '#FFB6C1'); throw new Error('NO_BRANCH'); }
    if (!day)    { addLog('⚠️ ยังไม่ได้เลือกวันที่', '#FFB6C1'); throw new Error('NO_DAY'); }
    if (!time)   { addLog('⚠️ ยังไม่ได้เลือกเวลา', '#FFB6C1'); throw new Error('NO_TIME'); }

    addLog(`⚡ เริ่ม ULTRA FAST MODE… [${branch} | ${day} | ${time}]`);
    checkStop();

    await runStep('หา/รอ Register พร้อมใช้งาน', async () => {
      await clickRegister();
    });

    await runStep('ยืนยันว่าอยู่หน้าสาขา', async () => {
      await ensureBranchPage(6);
    });

    await runStep(`เลือกสาขา: ${branch}`, async () => {
      await selectBranch(branch);
    });

    await runStep('คลิก Next', async () => {
      await clickNext();
    });

    await runStep('จัดการมินิเกม/แคปช่า (ถ้ามี)', async () => {
      await handleMinigame();
    });

    await runStep(`เลือกวันที่: ${day}`, async () => {
      await selectDate(day);
    });

    await runStep(`เลือกเวลา: ${time}`, async () => {
      await selectTimeOrRound(time);
    });

    await runStep('ยืนยันวันเวลา', async () => {
      await confirmDateTime();
    });

    await runStep('ติ๊กยอมรับเงื่อนไข', async () => {
      await clickCheckbox();
    });

    await runStep('ยืนยันการจองสุดท้าย', async () => {
      await confirmBookingFinal();
    });

    addLog('🎉 เสร็จเรียบร้อย!', '#90EE90');

    // (ออปชัน) ยิง log ไป worker/D1 ผ่าน background
    try {
      chrome.runtime?.sendMessage?.({
        action: 'postLog',
        payload: { event: 'booking_done', level: 'info', message: 'success', meta: { branch, day, time } }
      });
    } catch {}
  } catch (err) {
    if (err === stopError) {
      addLog('⏹️ หยุดตามคำสั่งผู้ใช้', '#FFB6C1');
    } else {
      addLog('❌ ' + (err?.message || err), '#FFB6C1');
      // (ออปชัน) ยิง log error ไป worker/D1
      try {
        chrome.runtime?.sendMessage?.({
          action: 'postLog',
          payload: { event: 'booking_error', level: 'error', message: String(err?.message || err) }
        });
      } catch {}
    }
  } finally {
    isRunning = false;
    if (startBtn) { startBtn.textContent = 'เริ่มจอง ⚡ ULTRA FAST'; startBtn.disabled = false; }
    if (stopBtn)  { stopBtn.disabled = true; }
    try { setOverlayStatusBadge?.(); } catch {}
  }
}


/* ===== Public API ===== */
if (!window.rocketBooker) window.rocketBooker = {};
// Allow optional config to drive booking without using the inline UI
window.rocketBooker.startBooking = async function startBookingWithConfig(optionalConfig){
  try {
    if (optionalConfig && typeof optionalConfig === 'object') {
      const { branch, day, time, manualRegister, useDelay, clickDelay, registerDelay } = optionalConfig;
      // store RB override options
      try { window.RB_OPTS = { manualRegister, useDelay, clickDelay, registerDelay }; } catch {}
      const branchSelect = document.getElementById('rb-branch');
      const daySelect = document.getElementById('rb-day');
      const timeSelect = document.getElementById('rb-time');

      if (branch && branchSelect) {
        branchSelect.value = branch;
      }
      if (day && daySelect) {
        daySelect.value = String(day);
      }
      if (time && timeSelect) {
        timeSelect.value = time;
      }
    }
  } catch {}
  return startBooking();
};
window.rocketBooker.addLog = addLog;

setTimeout(checkStatus, 200);

console.log('⚡ RocketBooker ULTRA FAST Ready! (Line-less, Profile-less)');

// ===== Expose RB_SIMPLE_FAST shim for external controllers (e.g., overlay.js)
// RB_SIMPLE_FAST.run(branch, day, round) -> maps to time list by index (1-based)
try {
  if (!window.RB_SIMPLE_FAST) {
    const TIME_LIST = ['10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'];
    window.RB_SIMPLE_FAST = {
      async run(branch, day, round, opts){
        let time = undefined;
        try {
          if (typeof round === 'number' && round >= 1 && round <= TIME_LIST.length) {
            time = TIME_LIST[round - 1];
          }
        } catch {}
        // propagate options
        return window.rocketBooker.startBooking({ branch, day, time, ...(opts||{}) });
      }
    };
  }
} catch {}

// ===== Message handlers for background heartbeat/status
	if (!window.__rbStopHandlerInstalled) {
		window.__rbStopHandlerInstalled = true;
	try {
	chrome.runtime?.onMessage?.addListener((req, sender, sendResponse) => {
    if (req && req.action === 'stopBooking') {
      window.isStopped = true;
      if (typeof isRunning !== 'undefined') isRunning = false;
      try { addLog?.('⏹️ หยุดการทำงานแล้ว', '#FFB6C1'); } catch {}
      sendResponse?.({ ok: true });
      return true;
    }
    if (req && req.action === 'ping') { sendResponse({ pong: true }); return true; }
    if (req && req.action === 'getStatus') { sendResponse({ isRunning, message: isRunning ? 'running' : 'idle' }); return true; }
    return false;
  });
} catch {}
}