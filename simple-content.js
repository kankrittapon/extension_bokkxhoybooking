// === RocketBooker ULTRA FAST (clean syntax) ===

// ---------- Log panel ----------
if (!document.getElementById('rb-log-panel')) {
  const logPanel = document.createElement('div');
  logPanel.id = 'rb-log-panel';
  logPanel.style.cssText = `
    position:fixed;top:20px;right:40px;z-index:999999999;width:340px;
    background:#222;border-radius:12px;color:white;padding:18px;
    box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:monospace;
    max-height:80vh;overflow-y:auto;display:block;
  `;
  logPanel.innerHTML = `
    <div style="font-weight:bold;font-size:15px;margin-bottom:10px;">📋 Log</div>
    <div id="rb-log-content" style="background:rgba(0,0,0,0.5);border-radius:6px;padding:10px;max-height:60vh;overflow-y:auto;font-size:13px;text-align:left;">
      <div style="color:#87CEEB;">🚀 RocketBooker FAST พร้อมใช้งาน</div>
    </div>
    <button id="rb-export-log" style="margin-top:12px;width:100%;padding:8px;border:none;border-radius:6px;background:#444;color:white;cursor:pointer;font-size:14px;">Export Log</button>
  `;
  document.body.appendChild(logPanel);
}

console.log('🚀 RocketBooker Loading (FAST)…');

// ---------- Speed profile ----------
const POLL_MS = 50;
const CLICK_JITTER = [5, 15];
const STEP_DELAY = [10, 25];
const SHORT_DELAY = () =>
  new Promise(r => setTimeout(r, Math.floor(Math.random()*(STEP_DELAY[1]-STEP_DELAY[0]+1))+STEP_DELAY[0]));
const JITTER = () =>
  new Promise(r => setTimeout(r, Math.floor(Math.random()*(CLICK_JITTER[1]-CLICK_JITTER[0]+1))+CLICK_JITTER[0]));

let isRunning = false;

// ---------- Site detection ----------
function detectSite() {
  const url = window.location.href;
  if (url.includes('popmartth.rocket-booking.app')) return 'popmartrock';
  if (url.includes('botautoq.web.app') || url.includes('pmrocketbotautoq.web.app')) return 'pm';
  if (url.includes('popmart.ithitec.com')) return 'ith';
  return null;
}

// ---------- Branch list ----------
let BRANCHES = [];

// ---------- Overlay UI ----------
const overlay = document.createElement('div');
overlay.innerHTML = `
<div id="rb-rocket" style="position:fixed;top:20px;left:20px;z-index:999999999;width:50px;height:50px;background:#667eea;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;font-size:20px;box-shadow:0 4px 20px rgba(0,0,0,0.3);">🚀</div>
<div id="rb-panel" style="position:fixed;top:20px;left:80px;z-index:999999999;width:320px;background:#667eea;border-radius:12px;color:white;padding:20px;display:none;">
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
        <input type="checkbox" id="rb-loop-mode" style="margin-right:8px;">
        วนซ้ำ (Loop Mode)
      </label>
    </div>
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

  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-size:12px;font-weight:bold;">วันที่:</label>
    <select id="rb-day" style="width:100%;padding:8px;border:none;border-radius:6px;color:#333;"></select>
  </div>

  <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:5px;font-size:12px;font-weight:bold;">เวลา:</label>
    <select id="rb-time" style="width:100%;padding:8px;border:none;border-radius:6px;color:#333;"></select>
  </div>

  <div id="rb-status" style="text-align:center;padding:12px;border-radius:6px;background:rgba(255,255,255,0.2);font-size:14px;font-weight:bold;margin-bottom:15px;">กำลังตรวจสอบ...</div>

  <button id="rb-start" style="width:100%;padding:12px;border:none;border-radius:6px;background:#28a745;color:white;cursor:pointer;font-weight:bold;font-size:14px;margin-bottom:10px;">เริ่มจอง FAST</button>
</div>
`;
document.body.appendChild(overlay);

function ensureOverlay() {
  const panel = document.getElementById('rb-panel');
  if (!panel) return null;

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
    stopBtn.disabled = true;
    stopBtn.addEventListener('click', () => {
      window.isStopped = true;
      isRunning = false;
      try { addLog('⏹️ กด Stop จาก Overlay', '#FFB6C1'); } catch {}
    });
    if (startBtn && startBtn.parentElement) {
      startBtn.parentElement.insertBefore(stopBtn, startBtn.nextSibling);
    } else {
      panel.appendChild(stopBtn);
    }
  }
  return panel;
}
ensureOverlay();

// ---------- Overlay badge ----------
function setOverlayStatusBadge() {
  const panel = document.getElementById('rb-panel');
  if (!panel) return;
  let badge = document.getElementById('rb-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'rb-badge';
    badge.style.cssText = 'margin:8px 0;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.25);font-size:12px;';
    panel.insertBefore(badge, panel.firstChild.nextSibling);
  }
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  const uiManual = document.getElementById('rb-manual-register')?.checked || false;
  const opts = getRBOpts();
  const manualRegister = (mode === 'production' && uiManual) || opts.manualRegister === true;
  const useDelay = (mode === 'production' && (document.getElementById('rb-use-delay')?.checked || false)) || opts.useDelay === true;
  const loopMode = document.getElementById('rb-loop-mode')?.checked || false;

  badge.textContent = `Mode: ${mode} | ManualRegister: ${manualRegister ? 'ON' : 'OFF'} | Delay: ${useDelay ? 'ON' : 'OFF'} | Loop: ${loopMode ? 'ON' : 'OFF'}`;
}
setOverlayStatusBadge();
document.getElementById('rb-use-delay')?.addEventListener('change', setOverlayStatusBadge);
document.getElementById('rb-manual-register')?.addEventListener('change', setOverlayStatusBadge);
document.getElementById('rb-loop-mode')?.addEventListener('change', setOverlayStatusBadge);

// ---------- helpers (site/map/branches) ----------
function mapSiteKeyForWorker(raw) {
  const k = String(raw || '').toLowerCase();
  if (k === 'pm' || k === 'botautoq') return 'botautoq';
  if (k === 'ith' || k === 'ithitec') return 'ithitec';
  if (k === 'popmartrock' || k === 'rocketbooking' || k === 'production') return 'rocketbooking';
  return 'rocketbooking';
}
function hardcodedBranches() {
  return [
    "Terminal 21","Centralworld","Siam Center","Seacon Square","MEGABANGNA",
    "Central Westgate","Central Ladprao","Fashion Island","Emsphere","Central Pattaya",
    "Central Chiangmai","Icon Siam","Central Dusit","Wacky Mart Event"
  ];
}
async function directFetchBranches(siteKey) {
  try {
    const base = 'https://branch-api.kan-krittapon.workers.dev';
    const res = await fetch(`${base}/branches`, { credentials: 'omit', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const bySite = json?.data?.branches || json?.branches || json?.data || json;
    const key = mapSiteKeyForWorker(siteKey);
    return Array.isArray(bySite?.[key]) ? bySite[key] : [];
  } catch (e) {
    addLog(`⚠ directFetchBranches ล้มเหลว: ${e}`, '#FFB6C1');
    return [];
  }
}

// Keep last selection
let RB_LAST_SELECTION = { siteKey: null, branch: null, day: null, time: null };
async function loadLastSelection() {
  try {
    const { rb_last_selection } = await chrome.storage?.local.get('rb_last_selection') || {};
    if (rb_last_selection && typeof rb_last_selection === 'object') RB_LAST_SELECTION = rb_last_selection;
  } catch {}
}
async function saveLastSelection() {
  try {
    const siteSel = document.getElementById('rb-site')?.value || 'pm';
    const siteKey = mapSiteKeyForWorker(siteSel);
    const branch = document.getElementById('rb-branch')?.value || '';
    const day    = document.getElementById('rb-day')?.value || '';
    const time   = document.getElementById('rb-time')?.value || '';
    RB_LAST_SELECTION = { siteKey, branch, day, time };
    await chrome.storage?.local.set({ rb_last_selection: RB_LAST_SELECTION });
  } catch {}
}

// Cached branches
let BRANCH_CACHE = { data: {}, ts: 0 };

async function refreshBranchesIntoOverlay({ preserveSelection = true, force = false } = {}) {
  const branchSelect = document.getElementById('rb-branch');
  if (!branchSelect) return;

  await loadLastSelection();

  const siteSel = document.getElementById('rb-site')?.value || 'pm';
  const siteKey = mapSiteKeyForWorker(siteSel);

  const prevUI = branchSelect.value || '';
  const prevStored = (RB_LAST_SELECTION.siteKey === siteKey) ? (RB_LAST_SELECTION.branch || '') : '';

  const showLoading = () => {
    branchSelect.innerHTML = '';
    const loadingOpt = document.createElement('option');
    loadingOpt.value = '';
    loadingOpt.textContent = 'กำลังโหลด…';
    branchSelect.appendChild(loadingOpt);
  };

  const now = Date.now();
  let list = [];
  if (!force && BRANCH_CACHE.data[siteKey] && (now - BRANCH_CACHE.ts) < 60000) {
    list = BRANCH_CACHE.data[siteKey].slice();
  } else {
    showLoading();
    try {
      // 1) background
      try {
        const bg = await new Promise((resolve) => {
          let done = false;
          const tid = setTimeout(() => { if (!done) resolve(null); }, 1000);
          chrome.runtime?.sendMessage?.({ action: 'getBranches', site: siteKey }, (resp) => {
            if (done) return; done = true; clearTimeout(tid);
            resolve(resp);
          });
        });
        if (bg && bg.ok && Array.isArray(bg.branches)) list = bg.branches;
      } catch {}

      // 2) direct worker
      if (!list.length) list = await directFetchBranches(siteKey);

      // 3) local cache
      if (!list.length) {
        try {
          const { branches } = await chrome.storage?.local.get('branches') || {};
          const cached = branches?.[siteKey];
          if (Array.isArray(cached) && cached.length) list = cached;
        } catch {}
      }

      // 4) fallback
      if (!list.length) {
        list = hardcodedBranches();
        addLog('⚠ ใช้สาขาแบบฮาร์ดโค้ด (fallback)', '#FFB6C1');
      }

      // update caches
      try {
        const { branches = {} } = await chrome.storage?.local.get('branches') || {};
        branches[siteKey] = list.slice();
        await chrome.storage?.local.set({ branches, branches_updated_at: Date.now() });
      } catch {}
      BRANCH_CACHE.data[siteKey] = list.slice();
      BRANCH_CACHE.ts = Date.now();
    } catch (e) {
      list = hardcodedBranches();
      addLog('⚠ โหลดสาขาไม่สำเร็จทั้งหมด → ใช้ฮาร์ดโค้ด', '#FFB6C1');
    }
  }

  const keep = preserveSelection ? (prevUI || prevStored) : '';
  branchSelect.innerHTML = '';
  list.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b; opt.textContent = b;
    branchSelect.appendChild(opt);
  });

  if (keep && list.includes(keep)) branchSelect.value = keep;
  else if (preserveSelection && prevUI && list.includes(prevUI)) branchSelect.value = prevUI;
  else if (preserveSelection && prevStored && list.includes(prevStored)) branchSelect.value = prevStored;

  try { BRANCHES = list.slice(); } catch {}
  await saveLastSelection();
  addLog(`✅ โหลดสาขาแล้ว (${siteKey}) : ${list.length} รายการ`, '#90EE90');
}

// ---------- Status + Logging ----------
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

  if (!window._rbLogLines) window._rbLogLines = [];
  window._rbLogLines.push(`[${time}] ${message}`);

  setTimeout(() => {
    const exportBtn = document.getElementById('rb-export-log');
    if (exportBtn) {
      exportBtn.onclick = function() {
        const lines = window._rbLogLines || [];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rocketbooker-log.txt';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      };
    }
  }, 300);
}

// ---------- FAST helpers ----------
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
  const w = [2497, 2468, 2497, 2408, 2025, 2552, 2604];
  const brand = btoa(
    Array.from(String.fromCharCode(...w.map(e => (e - 17 + 104729) * 10127 % 104729)))
      .map(e => e.charCodeAt(0))
      .map(e => (31 * e + 17) % 104729)
      .join(',')
  ).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');

  const fakeData = {
    ts: Math.floor(Date.now()/1000),
    d: 1, acc: 100,
    t: Math.round((3 + Math.random() * 2) * 1000),
    mv: 10 + Math.floor(Math.random() * 5),
    re: 5 + Math.floor(Math.random() * 3),
    brand
  };
  return btoa(JSON.stringify(fakeData)).substring(0, 256);
}

// ---------- React/Shadow helpers ----------
function forEachNodeDeep(root, visit) {
  const stack = [root];
  const seen  = new Set();
  while (stack.length) {
    const el = stack.pop();
    if (!el || seen.has(el)) continue;
    seen.add(el);
    try { visit(el); } catch {}
    const sr = el.shadowRoot;
    if (sr && sr.children) for (const c of sr.children) stack.push(c);
    if (el.children) for (const c of el.children) stack.push(c);
  }
}

function collectReactSuccessCallbacks(limit = 50) {
  const out = [];
  forEachNodeDeep(document.body, (el) => {
    for (const k in el) {
      if (!k.startsWith('__reactFiber$') && !k.startsWith('__reactProps$')) continue;
      const fiber = el[k]?.return?.return || el[k]?.return || el[k];
      const props = fiber?.memoizedProps || fiber?.pendingProps || el[k]?.memoizedProps || el[k]?.pendingProps;
      const cb = props && (props.onSuccess || props.onSolved || props.onsuccess || props.handleSuccess);
      if (typeof cb === 'function') {
        out.push({ el, cb });
        if (out.length >= limit) return;
      }
    }
  });
  return out;
}

async function pushGoldenTicketGlobally(limit = 80) {
  const ticket = (typeof makeGoldenTicket === 'function') ? makeGoldenTicket() : 'ticket';
  const cbs = collectReactSuccessCallbacks(limit);
  let fired = false;
  for (const { cb } of cbs) {
    try { cb(ticket); fired = true; } catch {}
    if (!fired) { try { cb({ goldenTicket: true, ticket }); fired = true; } catch {} }
  }
  return fired;
}

async function findMinigameHostDeep(selectors, maxWaitMs = 1500) {
  let found = null;
  const scan = () => {
    forEachNodeDeep(document.documentElement, (el) => {
      if (found) return;
      for (const s of selectors) {
        try { if (el.matches?.(s)) { found = el; return; } } catch {}
      }
    });
  };
  scan();
  if (found) return found;
  return await new Promise((resolve) => {
    const mo = new MutationObserver(() => {
      if (found) return;
      scan();
      if (found) { mo.disconnect(); resolve(found); }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { mo.disconnect(); resolve(found); }, maxWaitMs);
  });
}

function extractOnSuccessFromElement(el) {
  try {
    if (!el) return null;
    const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
    if (!key) return null;
    let fiber = el[key];
    if (fiber && fiber.return) fiber = fiber.return;
    if (fiber && fiber.return) fiber = fiber.return;
    const props = fiber?.memoizedProps || fiber?.pendingProps || el[key]?.memoizedProps || el[key]?.pendingProps;
    const cb = props && (props.onSuccess || props.onSolved || props.onsuccess || props.handleSuccess);
    return typeof cb === 'function' ? cb : null;
  } catch { return null; }
}
async function pushOnSuccessFromElement(el, ticket) {
  try {
    const cb = extractOnSuccessFromElement(el);
    if (typeof cb === 'function') { cb(ticket); return true; }
  } catch {}
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

async function pushGoldenTicketToReact(containerSelector = '.sc-623bb80d-0') {
  const container = document.querySelector(containerSelector);
  if (!container) return false;
  const ticket = makeGoldenTicket();
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

// ---------- Minigame handlers ----------
async function handleMinigame() {
  const now = Date.now();
  if (window.__rbMinigameScanTs && (now - window.__rbMinigameScanTs) < 400) return false;
  window.__rbMinigameScanTs = now;

  const site = detectSite();

  if (site === 'ith') {
    addLog('🎮 ตรวจสอบมินิเกม (ithitec: 3D rotation/React)...', '#87CEEB');

    const viewport = document.getElementById('captcha-viewport');
    if (viewport) {
      addLog('🔍 พบ 3D Rotation Captcha', '#87CEEB');
      const solved = await solve3DRotation();
      if (solved) { addLog('✅ 3D Rotation แก้แล้ว!', '#90EE90'); return true; }
    }

    const reactContainer = document.querySelector('.sc-623bb80d-0');
    if (reactContainer) {
      addLog('🔍 พบ React Minigame (ithitec)', '#87CEEB');
      const ok = await pushGoldenTicketToReact('.sc-623bb80d-0');
      if (ok) { addLog('✅ Golden Ticket ส่งสำเร็จ!', '#90EE90'); return true; }
      const bypassed = await tryBypassReactMinigame();
      if (bypassed) { addLog('✅ Minigame bypass สำเร็จ!', '#90EE90'); return true; }
    }

    addLog('✅ ไม่พบมินิเกม (ithitec)', '#90EE90');
    return false;
  }

  if (site === 'popmartrock') {
    addLog('🎮 ตรวจสอบมินิเกม (popmartrock: React - fast path)...', '#87CEEB');
    const selectors = [
      '.sc-623bb80d-0','[data-minigame-root]','.react-captcha-root',
      '[class*="captcha"]','[class*="minigame"]','[id*="captcha"]','[id*="minigame"]'
    ];

    const ticket = makeGoldenTicket();
    try {
      for (const sel of selectors) {
        const nodes = document.querySelectorAll(sel);
        for (const node of nodes) {
          if (!node || node.offsetParent === null) continue;
          if (await pushOnSuccessFromElement(node, ticket)) { addLog('✅ onSuccess สำเร็จจาก host ตื้น', '#90EE90'); return true; }
          const p1 = node.parentElement;
          if (p1 && await pushOnSuccessFromElement(p1, ticket)) { addLog('✅ onSuccess สำเร็จจาก parent', '#90EE90'); return true; }
          const p2 = p1?.parentElement;
          if (p2 && await pushOnSuccessFromElement(p2, ticket)) { addLog('✅ onSuccess สำเร็จจาก grandparent', '#90EE90'); return true; }
        }
      }
    } catch {}

    const firedGlobal = await pushGoldenTicketGlobally(40);
    if (firedGlobal) { addLog('✅ Golden Ticket (global, limited) สำเร็จ!', '#90EE90'); return true; }

    const host = await findMinigameHostDeep(selectors, 800);
    if (host) {
      addLog('🔍 พบ React Minigame host (deep)', '#87CEEB');
      if (await pushOnSuccessFromElement(host, ticket)) { addLog('✅ onSuccess (deep) ส่งสำเร็จ!', '#90EE90'); return true; }
      const ok = await pushGoldenTicketToReact('.sc-623bb80d-0')
             ||  await pushGoldenTicketToReact('[data-minigame-root]')
             ||  await pushGoldenTicketToReact('.react-captcha-root');
      if (ok) { addLog('✅ Golden Ticket (host selector) ส่งสำเร็จ!', '#90EE90'); return true; }
    }

    const bypassed = await tryBypassReactMinigame();
    if (bypassed) { addLog('✅ Minigame bypass สำเร็จ!', '#90EE90'); return true; }

    addLog('✅ ไม่พบมินิเกม (popmartrock)', '#90EE90');
    return false;
  }

  addLog('🎮 ไม่มีมินิเกมสำหรับไซต์นี้', '#87CEEB');
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

// ---------- Booking primitives ----------
function resolveClickable(el) {
  if (!el) return el;
  return el.closest?.('button,[role="button"],.ant-btn') || el;
}
function looksDisabled(el) {
  if (!el) return true;
  const cs = getComputedStyle(el);
  const ariaDis = el.getAttribute('aria-disabled') === 'true';
  const byAttr  = !!el.disabled;
  const byClass = /\b(disabled|ant-btn-disabled|loading)\b/i.test(el.className);
  const peNone  = cs.pointerEvents === 'none';
  const notAllowed = cs.cursor === 'not-allowed';
  return ariaDis || byAttr || byClass || peNone || notAllowed;
}

async function waitRegisterReady({
  xpath =
    "//*[normalize-space(text())='Register' or normalize-space(text())='ลงทะเบียน']/ancestor-or-self::button | " +
    "//*[normalize-space(text())='Register' or normalize-space(text())='ลงทะเบียน' and @role='button'] | " +
    "//button[normalize-space()='Register' or normalize-space()='ลงทะเบียน']",
  timeoutMs = 600000
} = {}) {
  const t0 = performance.now();

  const evalOne = () => {
    const n = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    return resolveClickable(n);
  };

  let btn = evalOne();
  if (!btn) {
    const textNode = await waitXPath("//*[normalize-space(text())='Register' or normalize-space(text())='ลงทะเบียน']", 15000);
    btn = resolveClickable(textNode);
  }
  function isBotAutoQEnabled(el) {
    if (!el) return false;
    const cs = window.getComputedStyle(el);
    const notGray = cs.backgroundColor !== 'rgb(222, 222, 222)';
    return notGray && !el.disabled;
  }
  if (btn && isBotAutoQEnabled(btn)) return btn;

  return await new Promise((resolve, reject) => {
    const check = () => {
      const current = evalOne();
      if (current && isBotAutoQEnabled(current)) { resolve(current); return true; }
      if (performance.now() - t0 > timeoutMs) { reject(new Error('Timeout waiting Register active')); return true; }
      return false;
    };
    const mo = new MutationObserver(() => { check() && mo.disconnect(); });
    mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
    const iv = setInterval(() => { if (check()) { clearInterval(iv); mo.disconnect(); } }, 80);
  });
}

async function clickRegister(){
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  const manualRegister = document.getElementById('rb-manual-register')?.checked || false;
  const opts = getRBOpts();

  if ((mode === 'production' && manualRegister) || opts.manualRegister === true) {
    addLog('👆 โหมดกด Register ด้วยตัวเอง - รอให้ผู้ใช้กด...', '#FFB6C1');
    while (true) {
      await new Promise(r => setTimeout(r, 500));
      const currentUrl = window.location.href;
      if (currentUrl.includes('/branch') || currentUrl.includes('/booking') || document.querySelector('[data-testid="branch-selection"]')) {
        addLog('✅ ผู้ใช้กด Register แล้ว!', '#90EE90');
        break;
      }
    }
    return;
  }

  addLog('🔍 หา Register…');
  const el = await waitRegisterReady({ timeoutMs: 600000 });
  if (opts && typeof opts.registerDelay === 'number' && opts.registerDelay > 0) {
    await new Promise(r=>setTimeout(r, opts.registerDelay));
  }
  await clickFast(el);
  addLog('🎯 Register แล้ว', '#90EE90');
  await SHORT_DELAY();
}

function isBranchPageVisibleNow(){
  try {
    if (document.querySelector('[data-testid="branch-selection"]')) return true;
    if (document.querySelector('div.branch-item')) return true;
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
    await SHORT_DELAY();
    await clickRegister();
  }
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
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  if (!el || !isEnabled(el)) throw new Error('Next button not enabled - branch may not be selected properly');
  await clickFast(el);
  addLog('✅ Next แล้ว', '#90EE90');
  await SHORT_DELAY();
}

const norm = (s)=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
function findBranchElementByName(name) {
  const target = norm(name);
  const branchItems = document.querySelectorAll("div.branch-item:not([class*='full']):not([class*='disabled'])");
  for (const el of branchItems) {
    const t = norm(el.textContent);
    if (t && (t === target || t.includes(target))) return resolveClickable(el);
  }
  const btns = document.querySelectorAll("button:not([class*='full']):not([class*='disabled']):not([disabled]), [role='button']");
  for (const b of btns) {
    const t = norm(b.textContent || b.innerText);
    if (t && (t === target || t.includes(target))) return resolveClickable(b);
  }
  const nodes = document.querySelectorAll("div,span,li,a");
  for (const d of nodes) {
    const t = norm(d.textContent || d.innerText);
    if (t && (t === target || t.includes(target))) return resolveClickable(d);
  }
  return null;
}
async function selectBranch(name){
  addLog(`🏢 เลือกสาขา: ${name}`);
  const currentSite = detectSite();
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  let branchWait = 1000;
  if (mode === 'production') branchWait = 2000;
  else if (currentSite === 'pm') branchWait = 600;
  await new Promise(r => setTimeout(r, branchWait));

  let el = findBranchElementByName(name);
  if (!el) {
    addLog(`⚠️ ไม่เจอสาขา ${name} รอสักครู่...`, '#FFB6C1');
    const t0 = performance.now();

    await new Promise((resolve, reject) => {
      let done = false;
      const resolveOnce = (v) => { if (done) return; done = true; resolve(v); };
      const rejectOnce  = (e) => { if (done) return; done = true; reject(e); };

      const poll = setInterval(async () => {
        if (window.isStopped) { clearInterval(poll); return rejectOnce(new Error('STOPPED')); }
        el = findBranchElementByName(name);
        if (el) {
          clearInterval(poll);
          addLog(`✅ เจอสาขา ${name} แล้ว!`, '#90EE90');
          return resolveOnce();
        }
        if (performance.now() - t0 > 10000) {
          clearInterval(poll);
          try { await closeAnyModalIfPresent(); } catch {}
          setTimeout(() => {
            el = findBranchElementByName(name);
            if (el) {
              addLog(`✅ เจอสาขา ${name} หลังปิด modal!`, '#90EE90');
              return resolveOnce();
            }
            const any = document.querySelector("div.branch-item:not([class*='full']):not([class*='disabled'])");
            if (any) {
              el = any;
              addLog('🔄 ไม่เจอชื่อเป๊ะ ใช้สาขาทดแทนตัวแรก (not full)', '#FFB6C1');
              return resolveOnce();
            }
            return rejectOnce(new Error('Branch not found'));
          }, 150);
        }
      }, POLL_MS);
    });
  }

  if (!el) throw new Error('Branch element not found');
  try { el.scrollIntoView({ block:'center' }); } catch {}
  await clickFast(el);
  addLog(`✅ คลิกสาขาแล้ว!`, '#90EE90');
  await new Promise(r => setTimeout(r, 500));
}

async function selectDate(day){
  addLog(`📅 เลือกวันที่: ${day}`);
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  let el = null;
  let attempts = 0;
  const maxAttempts = 2000;
  while (attempts < maxAttempts) {
    if (mode === 'production') {
      el = Array.from(document.querySelectorAll('button:not([class*="full"]):not([class*="disabled"]):not([disabled])'))
        .find(b => b.textContent.trim() === String(day) && b.offsetParent !== null);
      if (el) { await clickFast(el); addLog(`🎯 เลือกวันที่: ${day} แล้ว`, '#90EE90'); await SHORT_DELAY(); return; }
    } else {
      const xp = `//button[normalize-space()='${day}']`;
      el = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (el && el.offsetParent !== null && !el.hasAttribute('disabled')) { el.click(); addLog(`🎯 เลือกวันที่: ${day} แล้ว`, '#90EE90'); await SHORT_DELAY(); return; }
    }
    attempts++; await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error(`ไม่พบวันที่: ${day}`);
}

async function selectTimeOrRound(timeOrRound){
  addLog(`⏰ เลือกเวลา: ${timeOrRound}`);
  const mode = document.getElementById('rb-mode')?.value || 'trial';
  let el = null;
  let attempts = 0;
  const maxAttempts = 2000;
  while (attempts < maxAttempts) {
    if (mode === 'production') {
      el = Array.from(document.querySelectorAll('button:not([class*="full"]):not([class*="disabled"]):not([disabled])'))
        .find(b => b.textContent.trim() === String(timeOrRound) && b.offsetParent !== null);
      if (el) { await clickFast(el); addLog(`🎯 เลือกเวลา: ${timeOrRound} แล้ว`, '#90EE90'); await SHORT_DELAY(); return; }
    } else {
      const xp = `//button[normalize-space()='${timeOrRound}']`;
      el = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (el && el.offsetParent !== null && !el.hasAttribute('disabled')) { el.click(); addLog(`🎯 เลือกเวลา: ${timeOrRound} แล้ว`, '#90EE90'); await SHORT_DELAY(); return; }
    }
    attempts++; await new Promise(resolve => setTimeout(resolve, 30));
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

// ---------- Main flow ----------
async function startBooking() {
  if (isRunning) { addLog('⚠️ กำลังทำงานอยู่แล้ว', '#FFB6C1'); return; }

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

  window.isStopped = false;
  isRunning = true;

  const startBtn = document.getElementById('rb-start');
  const stopBtn  = document.getElementById('rb-stop');
  if (startBtn) { startBtn.textContent = 'กำลังจอง ULTRA FAST...'; startBtn.disabled = true; }
  if (stopBtn)  { stopBtn.disabled = false; }

  try { setOverlayStatusBadge?.(); } catch {}

  try {
    const mode    = document.getElementById('rb-mode')?.value;
    const siteSel = document.getElementById('rb-site')?.value;
    const expected = (mode === 'trial') ? siteSel : 'popmartrock';
    const actual   = detectSite();

    if (!expected || !actual || actual !== expected) {
      addLog(`❌ เว็บไซต์/โหมดไม่ตรง (expected=${expected || '-'}, actual=${actual || '-'})`, '#FFB6C1');
      throw new Error('SITE_MISMATCH');
    }

    const branch = document.getElementById('rb-branch')?.value;
    const day    = document.getElementById('rb-day')?.value;
    const time   = document.getElementById('rb-time')?.value;
    const loopMode = document.getElementById('rb-loop-mode')?.checked || false;

    if (!branch) { addLog('⚠️ ยังไม่ได้เลือกสาขา', '#FFB6C1'); throw new Error('NO_BRANCH'); }
    if (!day)    { addLog('⚠️ ยังไม่ได้เลือกวันที่', '#FFB6C1'); throw new Error('NO_DAY'); }
    if (!time)   { addLog('⚠️ ยังไม่ได้เลือกเวลา', '#FFB6C1'); throw new Error('NO_TIME'); }

    let round = 0;
    do {
      round++;
      addLog(`⚡ เริ่ม ULTRA FAST MODE… [${branch} | ${day} | ${time}] (รอบที่ ${round})`);
      checkStop();

      await runStep('หา/รอ Register พร้อมใช้งาน', async () => { await clickRegister(); });
      await runStep('ยืนยันว่าอยู่หน้าสาขา', async () => { await ensureBranchPage(6); });
      await runStep(`เลือกสาขา: ${branch}`, async () => { await selectBranch(branch); });
      await runStep('คลิก Next', async () => { await clickNext(); });
      await runStep('จัดการมินิเกม/แคปช่า (ถ้ามี)', async () => { await handleMinigame(); });
      await runStep(`เลือกวันที่: ${day}`, async () => { await selectDate(day); });
      await runStep(`เลือกเวลา: ${time}`, async () => { await selectTimeOrRound(time); });
      await runStep('ยืนยันวันเวลา', async () => { await confirmDateTime(); });
      await runStep('ติ๊กยอมรับเงื่อนไข', async () => { await clickCheckbox(); });
      await runStep('ยืนยันการจองสุดท้าย', async () => { await confirmBookingFinal(); });

      addLog('🎉 เสร็จเรียบร้อย!', '#90EE90');

      try { chrome.runtime?.sendMessage?.({ action: 'clearBadge' }); } catch {}
      try {
        chrome.runtime?.sendMessage?.({
          action: 'postLog',
          payload: { event: 'booking_done', level: 'info', message: 'success', meta: { branch, day, time } }
        });
      } catch {}
    } while (loopMode && !window.isStopped);
  } catch (err) {
    if (err && typeof err === 'symbol') {
      addLog('⏹️ หยุดตามคำสั่งผู้ใช้', '#FFB6C1');
    } else if (err && err.message === 'STOPPED') {
      addLog('⏹️ หยุดการทำงาน', '#FFB6C1');
    } else {
      addLog('❌ ' + (err?.message || err), '#FFB6C1');
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

// ---------- Public API / wiring ----------
if (!window.rocketBooker) window.rocketBooker = {};
window.rocketBooker.startBooking = async function startBookingWithConfig(optionalConfig){
  try {
    if (optionalConfig && typeof optionalConfig === 'object') {
      const { branch, day, time, manualRegister, useDelay, clickDelay, registerDelay } = optionalConfig;
      try { window.RB_OPTS = { manualRegister, useDelay, clickDelay, registerDelay }; } catch {}
      const branchSelect = document.getElementById('rb-branch');
      const daySelect = document.getElementById('rb-day');
      const timeSelect = document.getElementById('rb-time');
      if (branch && branchSelect) branchSelect.value = branch;
      if (day && daySelect) daySelect.value = String(day);
      if (time && timeSelect) timeSelect.value = time;
    }
  } catch {}
  return startBooking();
};
window.rocketBooker.addLog = addLog;

setTimeout(checkStatus, 200);
console.log('⚡ RocketBooker ULTRA FAST Ready! (Line-less, Profile-less)');

try {
  if (!window.RB_SIMPLE_FAST) {
    const TIME_LIST = ['10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'];
    window.RB_SIMPLE_FAST = {
      async run(branch, day, round, opts){
        let time;
        try {
          if (typeof round === 'number' && round >= 1 && round <= TIME_LIST.length) time = TIME_LIST[round - 1];
        } catch {}
        return window.rocketBooker.startBooking({ branch, day, time, ...(opts||{}) });
      }
    };
  }
} catch {}

if (!window.__rbStopHandlerInstalled) {
  window.__rbStopHandlerInstalled = true;
  try {
    chrome.runtime?.onMessage?.addListener((req, sender, sendResponse) => {
      if (req && req.action === 'stopBooking') {
        window.isStopped = true;
        if (typeof isRunning !== 'undefined') isRunning = false;
        try { addLog('⏹️ หยุดการทำงานแล้ว', '#FFB6C1'); } catch {}
        sendResponse?.({ ok: true });
        return true;
      }
      if (req && req.action === 'ping') { sendResponse({ pong: true }); return true; }
      if (req && req.action === 'getStatus') { sendResponse({ isRunning, message: isRunning ? 'running' : 'idle' }); return true; }
      return false;
    });
  } catch {}
}

// ---------- UI wiring ----------
setTimeout(function() {
  const rocket     = document.getElementById('rb-rocket');
  const panel      = document.getElementById('rb-panel');
  const closeBtn   = document.getElementById('rb-close');
  const modeSelect = document.getElementById('rb-mode');
  const siteSelect = document.getElementById('rb-site');

  rocket?.addEventListener('click', function() {
    if (panel.style.display === 'none' || !panel.style.display) {
      panel.style.display = 'block';
      checkStatus();
      setOverlayStatusBadge();
      refreshBranchesIntoOverlay({ preserveSelection: true, force: false });
      (async () => {
        await loadLastSelection();
        const daySel  = document.getElementById('rb-day');
        const timeSel = document.getElementById('rb-time');
        const siteSel = document.getElementById('rb-site')?.value || 'pm';
        const siteKey = mapSiteKeyForWorker(siteSel);
        if (RB_LAST_SELECTION.siteKey === siteKey) {
          if (daySel && RB_LAST_SELECTION.day)  daySel.value  = String(RB_LAST_SELECTION.day);
          if (timeSel && RB_LAST_SELECTION.time) timeSel.value = RB_LAST_SELECTION.time;
        }
      })();
    } else {
      panel.style.display = 'none';
    }
  });

  closeBtn?.addEventListener('click', function(){ panel.style.display = 'none'; });

  modeSelect?.addEventListener('change', function() {
    const mode = this.value;
    const siteSection       = document.getElementById('rb-site-section');
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
    refreshBranchesIntoOverlay({ preserveSelection: true, force: true });
  });

  siteSelect?.addEventListener('change', () => {
    checkStatus();
    setOverlayStatusBadge();
    refreshBranchesIntoOverlay({ preserveSelection: true, force: true });
  });

  refreshBranchesIntoOverlay({ preserveSelection: true, force: false });

  const daySelect = document.getElementById('rb-day');
  if (daySelect) {
    daySelect.innerHTML = '';
    for (let d = 1; d <= 31; d++) {
      const o = document.createElement('option');
      o.value = o.textContent = String(d);
      daySelect.appendChild(o);
    }
  }

  const timeSelect = document.getElementById('rb-time');
  if (timeSelect) {
    timeSelect.innerHTML = '';
    [
      '10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
      '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00',
      '19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'
    ].forEach(t => {
      const o = document.createElement('option');
      o.value = t; o.textContent = t;
      timeSelect.appendChild(o);
    });
  }

  (async () => {
    await loadLastSelection();
    const daySel  = document.getElementById('rb-day');
    const timeSel = document.getElementById('rb-time');
    const siteSel = document.getElementById('rb-site')?.value || 'pm';
    const siteKey = mapSiteKeyForWorker(siteSel);
    if (RB_LAST_SELECTION.siteKey === siteKey) {
      if (daySel && RB_LAST_SELECTION.day)  daySel.value  = String(RB_LAST_SELECTION.day);
      if (timeSel && RB_LAST_SELECTION.time) timeSel.value = RB_LAST_SELECTION.time;
    }
  })();

  document.getElementById('rb-start')?.addEventListener('click', startBooking);
  document.getElementById('rb-branch')?.addEventListener('change', saveLastSelection);
  document.getElementById('rb-day')?.addEventListener('change', saveLastSelection);
  document.getElementById('rb-time')?.addEventListener('change', saveLastSelection);
}, 100);
