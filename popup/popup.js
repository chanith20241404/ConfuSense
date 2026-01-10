/**
 * ConfuSense Popup Controller
 */

class PopupController {
  constructor() {
    this.settings = { enabled: true, role: 'student' };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.updateUI();
    this.checkMeetStatus();
    setInterval(() => this.checkMeetStatus(), 2000);
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['confusenseSettings']);
      if (result.confusenseSettings) {
        this.settings = { ...this.settings, ...result.confusenseSettings };
      }
    } catch (e) {
      console.log('[ConfuSense Popup] Using default settings');
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({ confusenseSettings: this.settings });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url?.includes('meet.google.com')) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATE',
            settings: this.settings
          });
        } catch (e) {}
      }
    } catch (e) {
      console.error('[ConfuSense Popup] Failed to save settings');
    }
  }

  bindEvents() {
    document.getElementById('enableToggle').addEventListener('change', (e) => {
      this.settings.enabled = e.target.checked;
      this.saveSettings();
    });
    
    document.getElementById('privacyBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://confusense.app/privacy' });
    });
    
    document.getElementById('supportBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://confusense.app/support' });
    });
  }

  updateUI() {
    document.getElementById('enableToggle').checked = this.settings.enabled;
  }

  async checkMeetStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url?.includes('meet.google.com')) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
          const statusBar = document.getElementById('statusBar');
          const statusText = document.getElementById('statusText');
          
          if (response?.isInMeeting) {
            statusBar.classList.add('visible');
            statusText.textContent = response.role === 'tutor' ? 'Dashboard active' : 'Monitoring active';
          } else {
            statusBar.classList.remove('visible');
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
}

document.addEventListener('DOMContentLoaded', () => new PopupController());
