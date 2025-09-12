// ======================
// RocketBooker Background (Worker-aware)
// ======================

// ===== Worker endpoint config (มี default และรองรับ override ใน storage) =====
const WORKER_BASE_DEFAULT = "https://branch-api.kan-krittapon.workers.dev";

// เก็บ/อ่านฐาน URL ของ Worker (ถ้าอยากเปลี่ยนที่ runtime)
async function setWorkerBase(url) {
  await chrome.storage.local.set({ worker_base: url });
}
async function getWorkerBase() {
  const { worker_base } = await chrome.storage.local.get("worker_base");
  let base = (worker_base || WORKER_BASE_DEFAULT || "").trim();
  if (!/^https?:\/\//i.test(base)) base = "https://" + base;            // กันพลาดลืมใส่ protocol
  if (base.endsWith("/")) base = base.slice(0, -1);                     // ตัด slash ท้าย
  return base;
}
async function buildWorkerEndpoints() {
  const base = await getWorkerBase();
  return {
    branches: `${base}/branches`,
    config:   `${base}/config`,
    log:      `${base}/log`
  };
}

// ===== Local caches (TTL) =====
const BRANCHES_TTL = 5 * 60 * 1000; // 5 นาที
const CONFIG_TTL   = 5 * 60 * 1000; // 5 นาที

// ===== Helpers =====
async function fetchJSON(url, { method = "GET", headers = {}, body = null, timeout = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    // เผื่อ url ไม่ใส่ protocol
    if (!/^https?:\/\//i.test(url)) url = "https://" + url.replace(/^\/+/, "");
    const res = await fetch(url, { method, headers, body, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// ===== API token helpers (อย่า hard-code token ในซอร์ส) =====
async function setApiToken(token) {
  await chrome.storage.local.set({ api_token: token });
}
async function getApiToken() {
  const { api_token } = await chrome.storage.local.get("api_token");
  return api_token ?? "";
}

// รับ /branches จาก Worker แล้ว cache ลง storage
async function refreshBranchesFromWorker() {
  try {
    const EP = await buildWorkerEndpoints();
    const data = await fetchJSON(EP.branches);
    // รองรับ 2 รูปแบบจาก Worker:
    // - { ok:true, data: { rocketbooking:[], botautoq:[], ithitec:[], version, updated_at } }
    // - { ok:true, data: { rocketbooking:[...]} } (ถ้าห่อจาก branch.json เดิม)
    const map = (data?.data && typeof data.data === "object") ? data.data : {};
    if (!Object.keys(map).length) throw new Error("empty branches map");

    const payload = {
      branches: map,
      branches_version: data?.data?.version || Date.now(),
      branches_updated_at: data?.data?.updated_at || Date.now()
    };
    await chrome.storage.local.set(payload);
    return payload;
  } catch (e) {
    console.warn("refreshBranchesFromWorker failed:", e);
    return null;
  }
}

// ——— single-flight กัน refresh ซ้ำ ———
let __branchesRefreshPromise = null;

// map/normalize site key จาก UI → key ของ Worker
function normalizeSiteKey(siteKey) {
  const k = String(siteKey || '').toLowerCase();
  if (k === 'pm' || k === 'botautoq') return 'botautoq';
  if (k === 'ith' || k === 'ithitec') return 'ithitec';
  if (k === 'popmartrock' || k === 'rocketbooking' || k === 'production') return 'rocketbooking';
  return 'rocketbooking';
}

// อ่าน branches จาก cache (สด) หรือดึงใหม่จาก Worker
async function getBranchesForSite(siteKey) {
  const key = normalizeSiteKey(siteKey);

  const stored = await chrome.storage.local.get(['branches', 'branches_updated_at']);
  const bySite = stored.branches || {};
  const fresh = stored.branches_updated_at && (Date.now() - stored.branches_updated_at < BRANCHES_TTL);

  // cache สดและมีข้อมูล
  if (fresh && Array.isArray(bySite[key]) && bySite[key].length) return bySite[key];

  // กันยิงซ้ำระหว่างกำลัง refresh
  if (!__branchesRefreshPromise) __branchesRefreshPromise = refreshBranchesFromWorker().finally(() => { __branchesRefreshPromise = null; });
  const refreshed = await __branchesRefreshPromise;

  if (refreshed && Array.isArray(refreshed.branches?.[key]) && refreshed.branches[key].length) {
    return refreshed.branches[key];
  }

  // fallback สุดท้าย (ของเดิมในเครื่อง ถ้ามี) หรือรายการตั้งต้น
  return bySite[key] || [
    'Terminal 21','Centralworld','Siam Center','Seacon Square','MEGABANGNA',
    'Central Westgate','Central Ladprao','Fashion Island','Emsphere','Central Pattaya',
    'Central Chiangmai','Icon Siam','Central Dusit','Wacky Mart Event'
  ];
}

// รับ /config จาก Worker แล้ว cache ลง storage
async function refreshConfigFromWorker() {
  try {
    const EP = await buildWorkerEndpoints();
    const data = await fetchJSON(EP.config);
    if (!data?.ok || !data?.data) throw new Error('config not ok');
    await chrome.storage.local.set({
      ext_config: data.data,
      ext_config_version: data.version || Date.now(),
      ext_config_updated_at: Date.now()
    });
    return data.data;
  } catch (e) {
    console.warn('refreshConfigFromWorker failed:', e);
    return null;
  }
}

async function getConfig() {
  const { ext_config, ext_config_updated_at } = await chrome.storage.local.get(['ext_config', 'ext_config_updated_at']);
  const fresh = ext_config_updated_at && (Date.now() - ext_config_updated_at < CONFIG_TTL);
  if (fresh && ext_config) return ext_config;
  return (await refreshConfigFromWorker()) || ext_config || {};
}

// ส่ง log ไป Worker /log (D1)
async function postLog(payload = {}) {
  try {
    const EP = await buildWorkerEndpoints();
    const token = await getApiToken();
    const headers = { 'content-type': 'application/json' };
    if (token) headers['authorization'] = `Bearer ${token}`;
    await fetchJSON(EP.log, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, ts: Date.now() }),
      timeout: 4000
    });
    return true;
  } catch (e) {
    console.warn('postLog failed:', e);
    return false;
  }
}

// ===== Background service (คง logic เดิม + เพิ่ม worker-aware cases) =====
class BackgroundService {
  constructor() { this.initializeListeners(); }

  initializeListeners() {
    chrome.runtime.onInstalled.addListener((details) => {
      console.log("🚀 RocketBooker Extension installed (FAST bg)");
      if (details.reason === "install") {
        chrome.storage.local.set({
          site: "rocketbooking", day: "1", round: "1",
          useLineLogin: false, useProfile: false
        });
      }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse); return true;
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url) {
        const supported = ["popmartth.rocket-booking.app","botautoq.web.app","popmart.ithitec.com","access.line.me"]
          .some(host => tab.url.includes(host));
        if (supported) this.ensureContentScript(tabId);
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case "updateStatus":
          this.broadcastStatus(message);
          break;

        case "getBookingStatus": {
          const status = await this.getGlobalBookingStatus();
          sendResponse(status);
          break;
        }

        case "logMessage": {
          console.log(`[${sender.tab?.id}] ${message.message}`);
          // optional: ส่งไป D1 ด้วย
          postLog({ event: "console", level: "info", message: message.message, meta: { tabId: sender.tab?.id } });
          break;
        }

        // ====== NEW: serve branches from Worker/cache ======
        case "getBranches": {
          const site = message.site || "rocketbooking";
          const list = await getBranchesForSite(site);
          sendResponse({ branches: list });
          break;
        }

        // ====== NEW: serve config from Worker/cache ======
        case "getConfig": {
          const cfg = await getConfig();
          sendResponse({ config: cfg });
          break;
        }

        // ====== NEW: post log to Worker/D1 ======
        case "postLog": {
          await postLog(message.payload || {});
          sendResponse({ ok: true });
          break;
        }

        default:
          console.log("Unknown message action:", message.action);
      }
    } catch (e) {
      console.error("Background message handler error:", e);
      try { sendResponse({ error: e.message }); } catch {}
    }
  }

  async ensureContentScript(tabId) {
    try {
      const ping = await chrome.tabs.sendMessage(tabId, { action: "ping" });
      if (ping && ping.pong) return;
    } catch (e) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["simple-content.js"] // <-- match manifest
        });
        console.log(`✅ simple-content.js injected to tab ${tabId}`);
      } catch (injectError) {
        console.error("Failed to inject content script:", injectError);
      }
    }
  }

  broadcastStatus(statusMessage) {
    chrome.runtime.sendMessage(statusMessage).catch(()=>{});
  }

  async getGlobalBookingStatus() {
    try {
      const urlPatterns = [
        "https://popmartth.rocket-booking.app/*",
        "https://botautoq.web.app/*",
        "https://popmart.ithitec.com/*",
        "https://access.line.me/*"
      ];
      for (const url of urlPatterns) {
        const tabs = await chrome.tabs.query({ url });
        for (const tab of tabs) {
          try {
            const resp = await chrome.tabs.sendMessage(tab.id, { action: "getStatus" });
            if (resp && resp.isRunning) return { isRunning: true, tabId: tab.id, message: resp.message };
          } catch {}
        }
      }
      return { isRunning: false };
    } catch (e) {
      console.error("Failed to get global booking status:", e);
      return { isRunning: false };
    }
  }
}

const backgroundService = new BackgroundService();
console.log("🚀 RocketBooker Background Started (FAST)");
