const WORKER_BASE_DEFAULT = "https://auth-worker.kan-krittapon.workers.dev";
const SESSION_REFRESH_MS = 5 * 60 * 1000;

class PopupAuth {
  constructor() {
    this.state = {
      token: "",
      user: null,
      expiresAt: null,
      lastChecked: null
    };

    this.cacheElements();
    this.bindEvents();
    this.bootstrap();
  }

  cacheElements() {
    this.loginView = document.getElementById("loginView");
    this.registerView = document.getElementById("registerView");
    this.sessionView = document.getElementById("sessionView");
    this.messageEl = document.getElementById("message");

    this.loginForm = document.getElementById("loginForm");
    this.usernameInput = document.getElementById("username");
    this.passwordInput = document.getElementById("password");
    this.loginBtn = document.getElementById("loginBtn");
    this.showRegisterBtn = document.getElementById("showRegisterBtn");

    this.registerForm = document.getElementById("registerForm");
    this.registerUsernameInput = document.getElementById("registerUsername");
    this.registerPasswordInput = document.getElementById("registerPassword");
    this.registerConfirmInput = document.getElementById("registerConfirm");
    this.registerRoleSelect = document.getElementById("registerRole");
    this.registerExpiresInput = document.getElementById("registerExpires");
    this.registerAdminKeyInput = document.getElementById("registerAdminKey");
    this.registerBtn = document.getElementById("registerBtn");
    this.backToLoginBtn = document.getElementById("backToLoginBtn");

    this.sessionName = document.getElementById("sessionName");
    this.sessionRole = document.getElementById("sessionRole");
    this.sessionExpiry = document.getElementById("sessionExpiry");
    this.sessionChecked = document.getElementById("sessionChecked");
    this.sessionLoading = document.getElementById("sessionLoading");
    this.refreshBtn = document.getElementById("refreshSessionBtn");
    this.logoutBtn = document.getElementById("logoutBtn");
  }

  bindEvents() {
    this.loginForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleLogin();
    });

    this.refreshBtn?.addEventListener("click", () => {
      this.refreshSession(false);
    });

    this.logoutBtn?.addEventListener("click", () => {
      this.logout("ออกจากระบบแล้ว");
    });

    this.showRegisterBtn?.addEventListener("click", () => {
      this.clearMessage();
      this.setView("register");
      this.prefillRegisterDefaults();
    });

    this.backToLoginBtn?.addEventListener("click", () => {
      this.clearMessage();
      this.setView("login");
    });

    this.registerForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleRegister();
    });
  }

  async bootstrap() {
    await this.restoreSession();
  }

  async restoreSession() {
    try {
      const stored = await chrome.storage.local.get([
        "api_token",
        "auth_user",
        "auth_expires_at",
        "auth_last_checked"
      ]);

      if (!stored.api_token) {
        this.setView("login");
        this.clearMessage();
        this.state = { token: "", user: null, expiresAt: null, lastChecked: null };
        return;
      }

      this.state.token = stored.api_token;
      this.state.user = stored.auth_user || null;
      this.state.expiresAt = stored.auth_expires_at || null;
      this.state.lastChecked = stored.auth_last_checked || null;

      if (this.state.expiresAt && this.isExpired(this.state.expiresAt)) {
        await this.logout("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
        return;
      }

      this.setView("session");
      this.updateSessionCard();

      const stale = !this.state.lastChecked || (Date.now() - this.state.lastChecked) > SESSION_REFRESH_MS;
      if (!this.state.user || stale) {
        await this.refreshSession(true);
      }
    } catch (error) {
      console.error("restoreSession failed", error);
      this.showMessage("error", "ไม่สามารถอ่านข้อมูลเซสชันท้องถิ่นได้");
      this.setView("login");
    }
  }

  async handleLogin() {
    if (!this.usernameInput || !this.passwordInput || !this.loginBtn) return;
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value;

    if (!username || !password) {
      this.showMessage("error", "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบ");
      return;
    }

    try {
      this.setLoginLoading(true);
      this.showMessage("info", "กำลังเข้าสู่ระบบ...");

      const base = await this.getWorkerBase();
      const response = await fetch(`${base}/api/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.token) {
        const message = data?.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
        this.showMessage("error", message);
        this.passwordInput.value = "";
        this.passwordInput.focus();
        return;
      }

      const user = {
        username,
        role: (data.role || "user")
      };
      await this.saveSession(data.token, user, data.expiresAt || null);
      this.loginForm?.reset();
      this.setView("session");
      await this.refreshSession(true);
      if (this.state.token) this.showMessage("success", "เข้าสู่ระบบสำเร็จ");
    } catch (error) {
      console.error("handleLogin failed", error);
      this.showMessage("error", "ไม่สามารถเชื่อมต่อ Cloudflare Worker ได้");
    } finally {
      this.setLoginLoading(false);
    }
  }

  async handleRegister() {
    if (!this.registerForm || !this.registerBtn) return;
    const username = (this.registerUsernameInput?.value || "").trim();
    const password = this.registerPasswordInput?.value || "";
    const confirm = this.registerConfirmInput?.value || "";
    const role = (this.registerRoleSelect?.value || "user").toLowerCase();
    const expiresValue = this.registerExpiresInput?.value || "";
    const adminKey = this.registerAdminKeyInput?.value?.trim() || "";

    if (!username || !password || !confirm || !expiresValue) {
      this.showMessage("error", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (password !== confirm) {
      this.showMessage("error", "รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }

    const expiresDate = new Date(expiresValue);
    if (Number.isNaN(expiresDate.getTime())) {
      this.showMessage("error", "รูปแบบวันหมดอายุไม่ถูกต้อง");
      return;
    }
    if (expiresDate.getTime() <= Date.now()) {
      this.showMessage("error", "วันหมดอายุต้องอยู่ในอนาคต");
      return;
    }

    try {
      this.setRegisterLoading(true);
      this.showMessage("info", "กำลังลงทะเบียนบัญชี...");

      const base = await this.getWorkerBase();
      const payload = {
        username,
        password,
        role,
        expiresAt: expiresDate.toISOString()
      };
      const headers = { "content-type": "application/json" };
      if (adminKey) headers["x-api-key"] = adminKey;

      const response = await fetch(`${base}/api/register`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        const message = data?.error || "ลงทะเบียนไม่สำเร็จ";
        this.showMessage("error", message);
        return;
      }

      this.registerForm.reset();
      this.setView("login");
      if (this.usernameInput) this.usernameInput.value = username;
      if (this.passwordInput) this.passwordInput.focus();
      this.showMessage("success", "สร้างบัญชีเรียบร้อย กรุณาเข้าสู่ระบบด้วยข้อมูลใหม่");
    } catch (error) {
      console.error("handleRegister failed", error);
      this.showMessage("error", "ไม่สามารถเชื่อมต่อ Cloudflare Worker ได้");
    } finally {
      this.setRegisterLoading(false);
    }
  }

  async refreshSession(silent = false) {
    if (!this.state.token) return;

    try {
      this.setSessionLoading(true);
      if (!silent) this.showMessage("info", "กำลังตรวจสอบเซสชัน...");

      const base = await this.getWorkerBase();
      const result = await this.fetchMe(base, this.state.token);
      if (result.ok && result.user) {
        const user = this.normalizeUser(result.user);
        const expiresAt = this.extractExpiry(result.user) || this.state.expiresAt;
        await this.saveSession(this.state.token, user, expiresAt);
        if (!silent) this.showMessage("success", "อัปเดตเซสชันแล้ว");
        else this.clearMessage();
        return;
      }

      if (result.status === 401) {
        await this.logout("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
        return;
      }

      if (!silent) {
        this.showMessage("error", result.message || "อัปเดตเซสชันไม่สำเร็จ");
      } else {
        console.warn("Silent session refresh failed", result);
      }
    } catch (error) {
      console.error("refreshSession failed", error);
      if (!silent) this.showMessage("error", "ตรวจสอบเซสชันไม่สำเร็จ");
    } finally {
      this.setSessionLoading(false);
    }
  }

  async fetchMe(base, token) {
    try {
      const response = await fetch(`${base}/api/me`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          message: payload?.error || response.statusText
        };
      }
      return { ok: true, status: response.status, user: payload?.user || null };
    } catch (error) {
      return { ok: false, status: 0, message: error?.message || "เครือข่ายขัดข้อง" };
    }
  }

  async saveSession(token, user, expiresAt) {
    const payload = {
      api_token: token,
      auth_user: user,
      auth_expires_at: expiresAt,
      auth_last_checked: Date.now()
    };
    await chrome.storage.local.set(payload);
    this.state.token = token;
    this.state.user = user;
    this.state.expiresAt = expiresAt;
    this.state.lastChecked = payload.auth_last_checked;
    this.updateSessionCard();
  }

  async logout(message) {
    await chrome.storage.local.remove([
      "api_token",
      "auth_user",
      "auth_expires_at",
      "auth_last_checked"
    ]);
    this.state = { token: "", user: null, expiresAt: null, lastChecked: null };
    this.setView("login");
    this.loginForm?.reset();
    this.registerForm?.reset();
    this.setLoginLoading(false);
    this.setRegisterLoading(false);
    if (this.passwordInput) this.passwordInput.value = "";
    if (message) this.showMessage("info", message);
    else this.clearMessage();
  }

  setView(view) {
    const showSession = view === "session";
    const showLogin = view === "login";
    const showRegister = view === "register";
    this.sessionView?.classList.toggle("hidden", !showSession);
    this.loginView?.classList.toggle("hidden", !showLogin);
    this.registerView?.classList.toggle("hidden", !showRegister);
    if (showLogin) {
      this.usernameInput?.focus();
      if (this.showRegisterBtn) this.showRegisterBtn.disabled = false;
    }
    if (showRegister) {
      this.registerUsernameInput?.focus();
      if (this.showRegisterBtn) this.showRegisterBtn.disabled = true;
    }
    if (!showRegister && this.showRegisterBtn) {
      this.showRegisterBtn.disabled = false;
    }
  }

  setLoginLoading(isLoading) {
    if (this.loginBtn) this.loginBtn.disabled = isLoading;
    if (this.usernameInput) this.usernameInput.disabled = isLoading;
    if (this.passwordInput) this.passwordInput.disabled = isLoading;
    if (this.showRegisterBtn) this.showRegisterBtn.disabled = isLoading;
    if (this.loginBtn) this.loginBtn.textContent = isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ";
  }

  setRegisterLoading(isLoading) {
    [
      this.registerUsernameInput,
      this.registerPasswordInput,
      this.registerConfirmInput,
      this.registerRoleSelect,
      this.registerExpiresInput,
      this.registerAdminKeyInput,
      this.registerBtn,
      this.backToLoginBtn
    ].forEach((el) => {
      if (el) el.disabled = isLoading;
    });
    if (this.registerBtn) this.registerBtn.textContent = isLoading ? "กำลังสร้าง..." : "สร้างบัญชี";
  }

  prefillRegisterDefaults() {
    if (!this.registerExpiresInput) return;
    if (this.registerExpiresInput.value) return;
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const local = new Date(future.getTime() - future.getTimezoneOffset() * 60000);
    this.registerExpiresInput.value = local.toISOString().slice(0, 16);
  }

  setSessionLoading(isLoading) {
    this.sessionView?.classList.toggle("loading", isLoading);
    if (this.refreshBtn) this.refreshBtn.disabled = isLoading;
    if (this.logoutBtn) this.logoutBtn.disabled = isLoading;
    if (this.sessionLoading) this.sessionLoading.style.display = isLoading ? "block" : "none";
  }

  updateSessionCard() {
    if (!this.state.user) return;
    if (this.sessionName) this.sessionName.textContent = this.state.user.username || "-";
    if (this.sessionRole) this.sessionRole.textContent = this.state.user.role || "-";
    if (this.sessionExpiry) this.sessionExpiry.textContent = this.formatDateTime(this.state.expiresAt);
    if (this.sessionChecked) this.sessionChecked.textContent = this.formatDateTime(this.state.lastChecked);
  }

  normalizeUser(user) {
    if (!user) return null;
    const username = user.username || user.email || user.sub || "user";
    return {
      username,
      role: user.role || "user",
      id: user.sub || null
    };
  }

  extractExpiry(user) {
    if (!user) return null;
    if (user.expiresAt) return user.expiresAt;
    if (user.exp) return new Date(user.exp * 1000).toISOString();
    return null;
  }

  async getWorkerBase() {
    const stored = await chrome.storage.local.get("worker_base");
    let base = (stored.worker_base || WORKER_BASE_DEFAULT || "").trim();
    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
    base = base.replace(/\/+$/, "");
    return base;
  }

  isExpired(expiresAt) {
    const date = expiresAt ? new Date(expiresAt) : null;
    if (!date || Number.isNaN(date.getTime())) return false;
    return date.getTime() <= Date.now();
  }

  formatDateTime(value) {
    if (!value) return "-";
    const date = typeof value === "number" ? new Date(value) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return "-";
    try {
      return new Intl.DateTimeFormat(navigator.language, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    } catch (error) {
      console.warn("formatDateTime fallback", error);
      return date.toISOString();
    }
  }

  showMessage(type, text) {
    if (!this.messageEl) return;
    if (!text) {
      this.clearMessage();
      return;
    }
    this.messageEl.textContent = text;
    this.messageEl.className = `message show ${type}`;
  }

  clearMessage() {
    if (!this.messageEl) return;
    this.messageEl.textContent = "";
    this.messageEl.className = "message";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PopupAuth();
});


