// ConfuSense UI Injector v4.0

class UIInjector {
  constructor() {
    this.elements = {
      container: null,
      dashboard: null,
      dashboardBubble: null,
      studentStatus: null,
      popup: null,
      alert: null
    };
    this.state = {
      dashboardVisible: false,
      dashboardMinimized: false,
      studentStatusVisible: false,
      popupVisible: false,
      alertVisible: false,
      detectionEnabled: true
    };
    this.callbacks = {};
    this.participants = [];
    this.confirmedConfusions = new Map(); // track which students confirmed confusion
    this.overallConfusion = 0;
    this.sessionTime = 0;
    this.sessionStartTime = Date.now();
    this.confusionEvents = new Map(); // student id -> array of events
    // Real session data log: every confusion reading per student
    this.sessionLog = [];  // { timestamp, studentId, studentName, confusionRate, confirmed, intervention }
    this.lastLogTime = new Map(); // student id -> last log timestamp (throttle to every 10s)
    this.confusionStartTimes = new Map(); // student id -> when confusion started (for duration calc)
    this.studentInterventions = new Map(); // student id -> array of intervention records
    this.activeInterventions = new Set(); // student ids currently being intervened
  }

  init() {
    this.createContainer();
    this.startSessionTimer();
    return this;
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  createContainer() {
    if (this.elements.container) return;
    this.elements.container = document.createElement('div');
    this.elements.container.id = 'confusense-root';
    document.body.appendChild(this.elements.container);
  }


  getColor(rate) {
    if (rate >= 70) return '#ef4444';
    if (rate >= 50) return '#f59e0b';
    return '#4ade80';
  }

  getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/).filter(n => n.length > 0);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return parts.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name) {
    const colors = ['#ef4444', '#4ade80', '#fbbf24', '#2dd4bf', '#ec4899', '#3b82f6', '#f97316', '#8b5cf6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  formatTimeMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }


  showDashboard(participants = [], sessionStartTime = null) {
    if (sessionStartTime) this.sessionStartTime = sessionStartTime;
    this.participants = participants;

    if (this.state.dashboardMinimized && this.elements.dashboardBubble) {
      this.updateBubble();
      return;
    }

    if (this.elements.dashboardBubble) {
      this.elements.dashboardBubble.classList.add('cs-hidden');
    }

    if (this.elements.dashboard) {
      this.updateDashboard();
      this.elements.dashboard.classList.remove('cs-hidden');
      return;
    }

    this.elements.dashboard = document.createElement('div');
    this.elements.dashboard.className = 'cs-dashboard';
    this.elements.dashboard.innerHTML = this.getDashboardHTML();

    this.elements.container.appendChild(this.elements.dashboard);
    this.state.dashboardVisible = true;

    this.bindDashboardEvents();
    this.updateDashboard();
    this.setupDrag(this.elements.dashboard, '.cs-header');
  }

  getDashboardHTML() {
    return `
      <div class="cs-header">
        <span class="cs-logo"><span class="cs-logo-purple">Confu</span><span class="cs-logo-white">Sense</span></span>
        <div class="cs-traffic-buttons">
          <button class="cs-traffic-btn cs-btn-yellow" id="cs-minimize" title="Minimize"></button>
          <button class="cs-traffic-btn cs-btn-orange" id="cs-collapse" title="Collapse"></button>
          <button class="cs-traffic-btn cs-btn-red" id="cs-close" title="Close"></button>
        </div>
      </div>
      <div class="cs-body">
        <div class="cs-dashboard-title">Dashboard</div>
        <div class="cs-overall-card">
          <div class="cs-overall-label">Students Confused</div>
          <div id="cs-overall-rate" class="cs-overall-value" style="color: #9ca3af">0 / 0</div>
        </div>
        <div class="cs-session-info">
          <span class="cs-session-dot"></span>
          <span>Live Session</span>
          <span id="cs-session-time" class="cs-session-time">00:00</span>
        </div>

        <div id="cs-participants" class="cs-participants"></div>

        <button id="cs-export" class="cs-export-btn">📊 Download Analytics</button>
      </div>
    `;
  }

  appendLogRow(entry) {
    const tbody = this.elements.dashboard?.querySelector('#cs-log-tbody');
    if (!tbody) return;

    const t0 = this.sessionStartTime || Date.now();
    const elapsed = Math.max(0, Math.floor((entry.timestamp - t0) / 1000));
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');

    const typeColors = {
      DETECTION:   '#6b7280',
      POPUP_SHOWN: '#f59e0b',
