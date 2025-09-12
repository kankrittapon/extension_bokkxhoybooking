// === worker endpoints (เติม https:// อัตโนมัติ)
const RAW_WORKER_BASE = "branch-api.kan-krittapon.workers.dev";
function buildWorkerEndpoints() {
  const base = RAW_WORKER_BASE.startsWith('http') ? RAW_WORKER_BASE : `https://${RAW_WORKER_BASE}`;
  return {
    branches: `${base}/branches`,
    config:   `${base}/config`,
    log:      `${base}/log`
  };
}

// cache TTL
const BRANCHES_TTL = 5 * 60 * 1000;
const CONFIG_TTL   = 5 * 60 * 1000;

async function fetchJSON(url, opts={}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout || 8000);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

async function refreshBranchesFromWorker() {
  try {
    const EP = buildWorkerEndpoints();
    const data = await fetchJSON(EP.branches);
    if (!data?.ok || !Array.isArray(data.data)) {
      // data.data อาจเป็น object { rocketbooking: [], ... } ก็รองรับ
      if (data?.data && typeof data.data === 'object') {
        await chrome.storage.local.set({
          branches: data.data,
          branches_updated_at: Date.now()
        });
        return { branches: data.data };
      }
      throw new Error('BAD_BRANCHES');
    }
    // ถ้า worker ส่ง array เดียวทั้งระบบ → ใส่ key "rocketbooking"
    const map = { rocketbooking: data.data };
    await chrome.storage.local.set({ branches: map, branches_updated_at: Date.now() });
    return { branches: map };
  } catch (e) {
    console.warn('refreshBranchesFromWorker fail', e);
    return null;
  }
}

async function getBranchesForSite(siteKey) {
  const key = ({ rocketbooking: "rocketbooking", botautoq: "botautoq", ithitec: "ithitec" }[siteKey]) || "rocketbooking";

  try {
    const refreshed = await refreshBranchesFromWorker();
    if (refreshed && Array.isArray(refreshed.branches?.[key])) return refreshed.branches[key];
  } catch (e) {
    console.warn("fetch branches failed:", e);
  }

  // fallback (PC/Mobile safe)
  return [
    "Terminal 21","Centralworld","Siam Center","Seacon Square","MEGABANGNA",
    "Central Westgate","Central Ladprao","Fashion Island","Emsphere","Central Pattaya",
    "Central Chiangmai","Icon Siam","Central Dusit","Wacky Mart Event"
  ];
}

// === message router
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  (async () => {
    try {
      if (req?.action === 'getBranches') {
        const list = await getBranchesForSite(req.site || 'rocketbooking');
        sendResponse({ ok: true, branches: list });
        return;
      }
      // …(action อื่น ๆ ของคุณเช่น getConfig / postLog)…
      sendResponse({ ok: false, error: 'NO_ACTION' });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true; // สำคัญ: บอกว่าจะตอบ async
});

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
