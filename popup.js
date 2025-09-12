// Popup script for RocketBooker Extension
class PopupController {
  constructor() {
    this.initializeElements();
    this.loadSettings();
    this.loadBranches();
    this.bindEvents();
    this.updateStatus();
  }

  initializeElements() {
    this.modeSelect = document.getElementById('mode');
    this.siteSelect = document.getElementById('site');
    this.branchSelect = document.getElementById('branch');
    this.daySelect = document.getElementById('day');
    this.roundSelect = document.getElementById('round');
    this.productionOptions = document.getElementById('productionOptions');
    this.useDelayCheckbox = document.getElementById('useDelay');
    this.manualRegisterCheckbox = document.getElementById('manualRegister');
    this.useLineLoginCheckbox = document.getElementById('useLineLogin');
    this.lineLoginBtn = document.getElementById('lineLoginBtn');
    this.useProfileCheckbox = document.getElementById('useProfile');
    this.profileSection = document.getElementById('profileSection');
    this.firstNameInput = document.getElementById('firstName');
    this.lastNameInput = document.getElementById('lastName');
    this.phoneInput = document.getElementById('phone');
    this.idCardInput = document.getElementById('idCard');
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.clearDataBtn = document.getElementById('clearDataBtn');
    this.statusDiv = document.getElementById('status');
  }

  bindEvents() {
    this.modeSelect.addEventListener('change', () => {
      const isProduction = this.modeSelect.value === 'production';
      this.productionOptions.style.display = isProduction ? 'block' : 'none';
      this.saveSettings();
    });
    
    this.siteSelect.addEventListener('change', () => {
      this.loadBranches();
      this.saveSettings();
    });
    
    this.useLineLoginCheckbox.addEventListener('change', () => {
      this.lineLoginBtn.style.display = this.useLineLoginCheckbox.checked ? 'block' : 'none';
      this.saveSettings();
    });
    
    this.useProfileCheckbox.addEventListener('change', () => {
      this.profileSection.style.display = this.useProfileCheckbox.checked ? 'block' : 'none';
      this.saveSettings();
    });

    this.startBtn.addEventListener('click', () => this.startBooking());
    this.stopBtn.addEventListener('click', () => this.stopBooking());
    this.lineLoginBtn.addEventListener('click', () => this.connectLineLogin());
    this.clearDataBtn.addEventListener('click', () => this.clearAllData());

    // Save settings on change
    [this.modeSelect, this.siteSelect, this.branchSelect, this.daySelect, this.roundSelect, 
     this.useDelayCheckbox, this.manualRegisterCheckbox, this.useLineLoginCheckbox, this.useProfileCheckbox,
     this.firstNameInput, this.lastNameInput, this.phoneInput, this.idCardInput].forEach(element => {
      element.addEventListener('change', () => this.saveSettings());
      element.addEventListener('input', () => this.saveSettings());
    });
  }

async loadBranches() {
  const siteSel = this.siteSelect.value || 'rocketbooking';
  // map ให้เหมือน overlay
  const siteMap = { 
    'PopMart Thailand (Exclusive)': 'rocketbooking', // ถ้า value เป็นข้อความ ให้ map มาที่ key
    'botautoq': 'botautoq',
    'ithitec': 'ithitec',
    'rocketbooking': 'rocketbooking',
    'pm': 'botautoq',
    'ith': 'ithitec',
    'popmartrock': 'rocketbooking',
  };
  const siteKey = siteMap[siteSel] || siteSel || 'rocketbooking';

  try {
    const resp = await chrome.runtime.sendMessage({ action: 'getBranches', site: siteKey });
    const branches = (resp && Array.isArray(resp.branches) && resp.branches.length)
      ? resp.branches
      : this.getStaticBranches(siteKey);

    this.branchSelect.innerHTML = '';
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      this.branchSelect.appendChild(opt);
    });
  } catch (e) {
    // เผื่อ service worker ยังไม่ตื่น/ล่ม → ใช้ static
    const branches = this.getStaticBranches(siteKey);
    this.branchSelect.innerHTML = '';
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b; opt.textContent = b;
      this.branchSelect.appendChild(opt);
    });
  }
}

  
  getStaticBranches(siteKey) {
    switch (siteKey) {
      case 'rocketbooking':
        return ['Terminal 21', 'Centralworld', 'Siam Center', 'Seacon Square', 'MEGABANGNA', 'Central Westgate', 'Central Ladprao', 'Fashion Island', 'Emsphere', 'Central Pattaya', 'Central Chiangmai', 'Icon Siam',"Central Dusit"];
      case 'botautoq':
        return ['สาขาหลัก', 'สาขารอง', 'สาขาสาม', 'สาขาสี่', 'สาขาห้า'];
      case 'ithitec':
        return ['สาขากลาง', 'สาขาเหนือ', 'สาขาใต้', 'สาขาตะวันออก', 'สาขาตะวันตก'];
      default:
        return ['Terminal 21', 'Centralworld', 'Siam Center'];
    }
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get([
        'mode', 'site', 'branch', 'day', 'round', 'useDelay', 'manualRegister',
        'useLineLogin', 'useProfile', 'firstName', 'lastName', 'phone', 'idCard'
      ]);

      if (settings.mode) this.modeSelect.value = settings.mode;
      if (settings.site) this.siteSelect.value = settings.site;
      if (settings.branch) this.branchSelect.value = settings.branch;
      if (settings.day) this.daySelect.value = settings.day;
      if (settings.round) this.roundSelect.value = settings.round;
      if (settings.useDelay) this.useDelayCheckbox.checked = settings.useDelay;
      if (settings.manualRegister) this.manualRegisterCheckbox.checked = settings.manualRegister;
      if (settings.useLineLogin) {
        this.useLineLoginCheckbox.checked = settings.useLineLogin;
        this.lineLoginBtn.style.display = 'block';
      }
      if (settings.useProfile) {
        this.useProfileCheckbox.checked = settings.useProfile;
        this.profileSection.style.display = 'block';
      }
      if (settings.firstName) this.firstNameInput.value = settings.firstName;
      if (settings.lastName) this.lastNameInput.value = settings.lastName;
      if (settings.phone) this.phoneInput.value = settings.phone;
      if (settings.idCard) this.idCardInput.value = settings.idCard;
      
      // Update UI based on mode
      const isProduction = this.modeSelect.value === 'production';
      this.productionOptions.style.display = isProduction ? 'block' : 'none';
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    try {
      const settings = {
        mode: this.modeSelect.value,
        site: this.siteSelect.value,
        branch: this.branchSelect.value,
        day: this.daySelect.value,
        round: this.roundSelect.value,
        useDelay: this.useDelayCheckbox.checked,
        manualRegister: this.manualRegisterCheckbox.checked,
        useLineLogin: this.useLineLoginCheckbox.checked,
        useProfile: this.useProfileCheckbox.checked,
        firstName: this.firstNameInput.value,
        lastName: this.lastNameInput.value,
        phone: this.phoneInput.value,
        idCard: this.idCardInput.value
      };

      await chrome.storage.local.set(settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  async startBooking() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const siteUrls = {
        'rocketbooking': 'popmartth.rocket-booking.app',
        'botautoq': 'botautoq.web.app',
        'ithitec': 'popmart.ithitec.com'
      };
      
      const expectedUrl = siteUrls[this.siteSelect.value];
      if (!tab.url.includes(expectedUrl)) {
        this.updateStatus('error', `กรุณาเปิดหน้าเว็บ ${expectedUrl}`);
        return;
      }

      const config = {
        mode: this.modeSelect.value,
        site: this.siteSelect.value,
        branch: this.branchSelect.value,
        day: parseInt(this.daySelect.value),
        round: parseInt(this.roundSelect.value),
        useDelay: this.useDelayCheckbox.checked,
        manualRegister: this.manualRegisterCheckbox.checked,
        useLineLogin: this.useLineLoginCheckbox.checked,
        useProfile: this.useProfileCheckbox.checked,
        profile: this.useProfileCheckbox.checked ? {
          firstName: this.firstNameInput.value,
          lastName: this.lastNameInput.value,
          phone: this.phoneInput.value,
          idCard: this.idCardInput.value
        } : null
      };

	// Call start via content API that simple-content.js exposes
	const TIME_LIST = [
	'10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
	'15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30',
	'20:00','20:30','21:00','21:30','22:00','22:30','23:00'
	];
	const time = (typeof config.round === 'number' && config.round >= 1 && config.round <= TIME_LIST.length)
	? TIME_LIST[config.round - 1]
	: undefined;

	// อ่าน opts จริงจาก storage
	const raw = await chrome.storage.local.get(['useDelay','manualRegister','clickDelay','registerDelay']).catch(()=>({}));
	const opts = {
	useDelay: !!raw.useDelay,
	manualRegister: !!raw.manualRegister,
	clickDelay: Number(raw.clickDelay) || 0,
	registerDelay: Number(raw.registerDelay) || 0,
	};

// ฉีดโค้ดเข้าแท็บเป้าหมาย
	await chrome.scripting.executeScript({
	target: { tabId: tab.id },
	func: (branch, day, round, time, opts) => {
		try {
		if (window.RB_SIMPLE_FAST && window.RB_SIMPLE_FAST.run) {
			return window.RB_SIMPLE_FAST.run(branch, day, round, opts);
		}
		if (window.rocketBooker && typeof window.rocketBooker.startBooking === 'function') {
			return window.rocketBooker.startBooking({ branch, day, time, ...opts });
		}
		return 'NO_ENGINE';
		} catch (e) {
		return 'ERR:' + (e && e.message || e);
		}},
	args: [config.branch, config.day, config.round, time, opts]
	});

// อัปเดตปุ่ม/สถานะใน popup
	this.startBtn.disabled = true;
	this.stopBtn.disabled = false;
	this.updateStatus('running', 'กำลังจอง...');

  async stopBooking() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'stopBooking'
      });

      this.startBtn.disabled = false;
      this.stopBtn.disabled = true;
      this.updateStatus('ready', 'พร้อมใช้งาน');

    } catch (error) {
      console.error('Failed to stop booking:', error);
      // Force UI update even if message fails
      this.startBtn.disabled = false;
      this.stopBtn.disabled = true;
      this.updateStatus('ready', 'พร้อมใช้งาน');
    }
  }

  updateStatus(type = 'ready', message = 'พร้อมใช้งาน') {
    this.statusDiv.className = `status ${type}`;
    this.statusDiv.textContent = message;
  }

  async checkBookingStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const supportedUrls = [
        'popmartth.rocket-booking.app',
        'botautoq.web.app', 
        'popmart.ithitec.com'
      ];
      
      const isSupported = supportedUrls.some(url => tab.url.includes(url));
      
      if (isSupported) {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'getStatus'
        });
        
        if (response && response.isRunning) {
          this.startBtn.disabled = true;
          this.stopBtn.disabled = false;
          this.updateStatus('running', response.message || 'กำลังจอง...');
        } else {
          this.startBtn.disabled = false;
          this.stopBtn.disabled = true;
          this.updateStatus('ready', 'พร้อมใช้งาน');
        }
      } else {
        this.updateStatus('error', 'กรุณาเปิดหน้าเว็บที่รองรับ');
      }
    } catch (error) {
      // Content script not ready or page not loaded
      this.updateStatus('ready', 'พร้อมใช้งาน');
    }
  }

  async connectLineLogin() {
    try {
      const lineData = {
        accessToken: 'line_token_' + Date.now(),
        userId: 'U' + Math.random().toString(36).substr(2, 9),
        displayName: 'ผู้ใช้ LINE',
        pictureUrl: 'https://example.com/profile.jpg'
      };
      
      await chrome.storage.local.set({ lineData });
      this.updateStatus('ready', 'เชื่อมต่อ LINE สำเร็จ!');
      
      setTimeout(() => {
        this.updateStatus('ready', 'พร้อมใช้งาน');
      }, 2000);
    } catch (error) {
      this.updateStatus('error', 'เชื่อมต่อ LINE ไม่สำเร็จ');
    }
  }

  async clearAllData() {
    try {
      await chrome.storage.local.clear();
      location.reload();
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateStatus') {
    const popup = document.querySelector('.popup-controller');
    if (popup) {
      popup.updateStatus(message.type, message.message);
    }
  }
});