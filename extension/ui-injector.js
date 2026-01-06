/**
 * ConfuSense UI Injector v4.0
 * Matches wireframe designs exactly
 * Features: Dashboard, Student Widget, Popup, Alert, PDF Export
 */

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

  // ==================== COLORS & UTILS ====================

  getColor(rate) {
    if (rate >= 70) return '#ef4444';
    if (rate >= 50) return '#f59e0b';
    return '#4ade80';
  }

  getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name) {
    // Wireframe uses distinct colors: red, green, yellow, teal, pink, blue
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
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // ==================== DASHBOARD ====================

  showDashboard(participants = []) {
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
