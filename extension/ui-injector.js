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
          <div class="cs-overall-label">Overall Class Confusion</div>
          <div id="cs-overall-rate" class="cs-overall-value" style="color: ${this.getColor(this.overallConfusion)}">${this.overallConfusion}%</div>
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

  updateDashboard(participants = null) {
    if (participants) this.participants = participants;
    if (!this.elements.dashboard) return;

    const sorted = [...this.participants]
      .filter(p => p.role === 'student')
      .sort((a, b) => (b.confusionRate || 0) - (a.confusionRate || 0));

    // Calculate overall
    if (sorted.length > 0) {
      this.overallConfusion = Math.round(
        sorted.reduce((sum, p) => sum + (p.confusionRate || 0), 0) / sorted.length
      );
    } else {
      this.overallConfusion = 0;
    }

    // Update overall rate
    const overallEl = this.elements.dashboard.querySelector('#cs-overall-rate');
    if (overallEl) {
      overallEl.textContent = `${this.overallConfusion}%`;
      overallEl.style.color = this.getColor(this.overallConfusion);
    }

    // Update time
    const timeEl = this.elements.dashboard.querySelector('#cs-session-time');
    if (timeEl) timeEl.textContent = this.formatTime(this.sessionTime);

    // Update participants
    const listEl = this.elements.dashboard.querySelector('#cs-participants');
    if (listEl) {
      if (sorted.length === 0) {
        listEl.innerHTML = '<div class="cs-no-students">No students with detection enabled</div>';
      } else {
        listEl.innerHTML = sorted.map(s => this.getParticipantHTML(s)).join('');
        // Bind intervene buttons on cards
        sorted.forEach(s => {
          const btn = listEl.querySelector(`#cs-card-intervene-${CSS.escape(s.id)}`);
          if (btn) {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (this.callbacks.onIntervene) this.callbacks.onIntervene(s);
              this.confirmedConfusions.delete(s.id);
              this.activeInterventions.add(s.id);
              this.updateDashboard();
              // Clear "Intervening" label after 30 seconds
              setTimeout(() => {
                this.activeInterventions.delete(s.id);
                this.updateDashboard();
              }, 30000);
            });
          }
        });
      }
    }

    // Track real confusion data per student
    const now = Date.now();
    sorted.forEach(s => {
      const rate = Math.round(s.confusionRate || 0);
      const lastLog = this.lastLogTime.get(s.id) || 0;

      // Log a reading every 10 seconds
      if (now - lastLog >= 10000) {
        this.lastLogTime.set(s.id, now);

        // Always log to sessionLog for CSV/PDF export
        this.sessionLog.push({
          timestamp: now,
          studentId: s.id,
          studentName: s.name,
          confusionRate: rate,
          confirmed: this.confirmedConfusions.has(s.id),
          intervention: 'None'
        });

        // Track confusion periods: start when rate >= 50, end when drops below
        if (rate >= 50 && !this.confusionStartTimes.has(s.id)) {
          this.confusionStartTimes.set(s.id, now);
        } else if (rate < 50 && this.confusionStartTimes.has(s.id)) {
          const startTime = this.confusionStartTimes.get(s.id);
          const duration = Math.round((now - startTime) / 1000);
          this.confusionStartTimes.delete(s.id);

          if (!this.confusionEvents.has(s.id)) this.confusionEvents.set(s.id, []);
          this.confusionEvents.get(s.id).push({
            timestamp: startTime,
            endTimestamp: now,
            rate: rate,
            duration: duration,
            intervention: this.confirmedConfusions.has(s.id) ? 'Confirmed' : 'None',
            interventionBy: null
          });
        }

        // Also log a confusion event snapshot every 30s if rate is high (>= 60)
        // This ensures we always have events in the report even if rate never drops below 50
        if (rate >= 60) {
          if (!this.confusionEvents.has(s.id)) this.confusionEvents.set(s.id, []);
          const events = this.confusionEvents.get(s.id);
          const lastEvent = events.length > 0 ? events[events.length - 1] : null;
          if (!lastEvent || now - lastEvent.timestamp >= 30000) {
            events.push({
              timestamp: now,
              endTimestamp: now,
              rate: rate,
              duration: lastEvent ? Math.round((now - lastEvent.timestamp) / 1000) : 10,
              intervention: this.confirmedConfusions.has(s.id) ? 'Confirmed' : 'None',
              interventionBy: null
            });
          }
        }
      }
    });

    this.updateBubble();
  }

  getParticipantHTML(student) {
    const rate = Math.round(student.confusionRate || 0);
    const color = this.getColor(rate);
    const confusionClass = rate >= 70 ? 'high-confusion' : '';
    const hasConfirmed = this.confirmedConfusions.has(student.id);
    const isIntervening = this.activeInterventions.has(student.id);

    let actionHTML = '';
    if (isIntervening) {
      actionHTML = `<span class="cs-card-intervening-label">Intervening</span>`;
    } else if (hasConfirmed) {
      actionHTML = `<button class="cs-card-intervene-btn" id="cs-card-intervene-${student.id}">Intervene</button>`;
    }

    return `
      <div class="cs-participant ${confusionClass}" data-id="${student.id}">
        <div class="cs-avatar" style="background:${this.getAvatarColor(student.name)}">${this.getInitials(student.name)}</div>
        <div class="cs-participant-info">
          <div class="cs-participant-name">${student.name}</div>
          <div class="cs-progress-bar">
            <div class="cs-progress-fill" style="width:${rate}%;background:${color}"></div>
          </div>
        </div>
        <span class="cs-confusion-rate" style="color:${color}">${rate}%</span>
        ${actionHTML}
      </div>
    `;
  }

  hideDashboard() {
    if (this.elements.dashboard) {
      this.elements.dashboard.classList.add('cs-hidden');
      this.state.dashboardVisible = false;
    }
    if (this.elements.dashboardBubble) {
      this.elements.dashboardBubble.classList.add('cs-hidden');
    }
    this.state.dashboardMinimized = false;
  }

  minimizeDashboard() {
    if (this.elements.dashboard) {
      this.elements.dashboard.classList.add('cs-hidden');
    }

    if (!this.elements.dashboardBubble) {
      this.elements.dashboardBubble = document.createElement('div');
      this.elements.dashboardBubble.className = 'cs-dashboard-bubble';
      this.elements.dashboardBubble.innerHTML = `
        <span class="cs-bubble-logo">CS</span>
        <span class="cs-bubble-rate">${this.overallConfusion}%</span>
      `;
      this.elements.container.appendChild(this.elements.dashboardBubble);
      this.elements.dashboardBubble.addEventListener('click', () => this.expandDashboard());
      this.setupDrag(this.elements.dashboardBubble);
    }

    this.elements.dashboardBubble.classList.remove('cs-hidden');
    this.updateBubble();
    this.state.dashboardVisible = false;
    this.state.dashboardMinimized = true;
  }

  expandDashboard() {
    if (this.elements.dashboardBubble) {
      this.elements.dashboardBubble.classList.add('cs-hidden');
    }
    if (this.elements.dashboard) {
      this.elements.dashboard.classList.remove('cs-hidden');
      this.updateDashboard();
    }
    this.state.dashboardVisible = true;
    this.state.dashboardMinimized = false;
  }

  updateBubble() {
    if (!this.elements.dashboardBubble) return;
    const rateEl = this.elements.dashboardBubble.querySelector('.cs-bubble-rate');
    if (rateEl) rateEl.textContent = `${this.overallConfusion}%`;
  }

  bindDashboardEvents() {
    const d = this.elements.dashboard;
    if (!d) return;

    d.querySelector('#cs-minimize')?.addEventListener('click', () => this.minimizeDashboard());
    d.querySelector('#cs-collapse')?.addEventListener('click', () => {
      d.querySelector('.cs-body')?.classList.toggle('cs-hidden');
    });
    d.querySelector('#cs-close')?.addEventListener('click', () => this.minimizeDashboard());

    d.querySelector('#cs-export')?.addEventListener('click', () => {
      this.generatePDFReport();
    });
  }

  // ==================== STUDENT CONFIRMED CONFUSION ====================

  markStudentConfirmed(studentId) {
    this.confirmedConfusions.set(studentId, Date.now());
    this.updateDashboard();
  }

  clearStudentConfirmed(studentId) {
    this.confirmedConfusions.delete(studentId);
    this.updateDashboard();
  }

  // Record an intervention event with real data
  recordIntervention(studentId, studentName, tutorName) {
    const now = Date.now();
    if (!this.studentInterventions.has(studentId)) {
      this.studentInterventions.set(studentId, []);
    }
    this.studentInterventions.get(studentId).push({
      timestamp: now,
      tutorName: tutorName || 'Tutor',
      studentName: studentName
    });

    // Also mark the most recent confusion event as having intervention
    if (this.confusionEvents.has(studentId)) {
      const events = this.confusionEvents.get(studentId);
      if (events.length > 0) {
        events[events.length - 1].intervention = 'Intervened';
        events[events.length - 1].interventionBy = tutorName || 'Tutor';
      }
    }

    // Log to sessionLog
    this.sessionLog.push({
      timestamp: now,
      studentId: studentId,
      studentName: studentName,
      confusionRate: 0,
      confirmed: true,
      intervention: tutorName || 'Tutor'
    });
  }

  // ==================== STUDENT STATUS WIDGET ====================

  showStudentStatus(enabled = true) {
    if (this.elements.studentStatus) {
      this.elements.studentStatus.remove();
    }

    this.state.detectionEnabled = enabled;

    this.elements.studentStatus = document.createElement('div');
    this.elements.studentStatus.className = 'cs-student-status';
    this.elements.studentStatus.innerHTML = `
      <div class="cs-status-header">
        <span class="cs-logo" style="font-size:13px;"><span class="cs-logo-purple">Confu</span><span class="cs-logo-white">Sense</span></span>
      </div>
      <div class="cs-status-body">
        <div class="cs-toggle-row">
          <span class="cs-toggle-label">Confusion detection ON/OFF</span>
          <div class="cs-toggle-container">
            <span class="cs-toggle-text ${enabled ? 'cs-on' : 'cs-off'}">${enabled ? 'On' : 'Off'}</span>
            <div class="cs-toggle-switch ${enabled ? 'on' : 'off'}">
              <div class="cs-toggle-knob"></div>
            </div>
          </div>
        </div>
        <div class="cs-status-info">We analyse micro-expressions only during active calls.</div>
        <div class="cs-status-buttons">
          <button class="cs-link-btn">Privacy Policy</button>
          <button class="cs-link-btn cs-primary">Support</button>
        </div>
      </div>
    `;

    this.elements.container.appendChild(this.elements.studentStatus);
    this.state.studentStatusVisible = true;

    const toggleSwitch = this.elements.studentStatus.querySelector('.cs-toggle-switch');
    toggleSwitch?.addEventListener('click', () => {
      this.state.detectionEnabled = !this.state.detectionEnabled;
      this.updateStudentStatusUI(this.state.detectionEnabled);
      if (this.callbacks.onToggleDetection) {
        this.callbacks.onToggleDetection(this.state.detectionEnabled);
      }
    });

    this.setupDrag(this.elements.studentStatus, '.cs-status-header');
  }

  updateStudentStatus(enabled) {
    this.state.detectionEnabled = enabled;
    this.updateStudentStatusUI(enabled);
  }

  updateStudentStatusUI(enabled) {
    if (!this.elements.studentStatus) return;
    const toggleSwitch = this.elements.studentStatus.querySelector('.cs-toggle-switch');
    const toggleText = this.elements.studentStatus.querySelector('.cs-toggle-text');
    if (toggleSwitch) toggleSwitch.className = `cs-toggle-switch ${enabled ? 'on' : 'off'}`;
    if (toggleText) {
      toggleText.textContent = enabled ? 'On' : 'Off';
      toggleText.className = `cs-toggle-text ${enabled ? 'cs-on' : 'cs-off'}`;
    }
  }

  hideStudentStatus() {
    if (this.elements.studentStatus) {
      this.elements.studentStatus.remove();
      this.elements.studentStatus = null;
      this.state.studentStatusVisible = false;
    }
  }

  // ==================== POPUP ====================

  showStudentPopup(onResponse = null) {
    if (this.elements.popup) this.elements.popup.remove();
    if (this.popupTimeout) clearTimeout(this.popupTimeout);

    this.elements.popup = document.createElement('div');
    this.elements.popup.className = 'cs-popup';
    this.elements.popup.innerHTML = `
      <div class="cs-popup-header">
        <span class="cs-logo" style="font-size:14px;"><span class="cs-logo-purple">Confu</span><span class="cs-logo-white">Sense</span></span>
      </div>
      <div class="cs-popup-body">
        <span class="cs-popup-emoji">🤔</span>
        <span class="cs-popup-message">We detected confusion.<br>Are you confused?</span>
      </div>
      <div class="cs-popup-actions">
        <button id="cs-yes-btn" class="cs-popup-btn cs-btn-yes">YES</button>
        <button id="cs-no-btn" class="cs-popup-btn cs-btn-no">NO</button>
      </div>
    `;

    this.elements.container.appendChild(this.elements.popup);
    this.state.popupVisible = true;

    this.elements.popup.querySelector('#cs-yes-btn')?.addEventListener('click', () => {
      this.hideStudentPopup();
      if (onResponse) onResponse(true, false);
      else if (this.callbacks.onPopupResponse) this.callbacks.onPopupResponse(true, false);
    });

    this.elements.popup.querySelector('#cs-no-btn')?.addEventListener('click', () => {
      this.hideStudentPopup();
      if (onResponse) onResponse(false, false);
      else if (this.callbacks.onPopupResponse) this.callbacks.onPopupResponse(false, false);
    });

    this.popupTimeout = setTimeout(() => {
      this.hideStudentPopup();
      if (onResponse) onResponse(true, true);
    }, 15000);
  }

  hideStudentPopup() {
    if (this.popupTimeout) clearTimeout(this.popupTimeout);
    if (this.elements.popup) {
      this.elements.popup.remove();
      this.elements.popup = null;
      this.state.popupVisible = false;
    }
  }

  hidePopup() { this.hideStudentPopup(); }

  // ==================== ALERT ====================

  showTutorAlert(student) {
    if (this.elements.alert) this.elements.alert.remove();

    this.elements.alert = document.createElement('div');
    this.elements.alert.className = 'cs-alert';
    this.elements.alert.innerHTML = `
      <div class="cs-alert-header">
        <div class="cs-alert-icon">⚠️</div>
        <div class="cs-alert-title">
          <h3>Sustained Confusion Alert</h3>
          <p>Intervention recommended</p>
        </div>
        <button id="cs-alert-close" class="cs-alert-close">×</button>
      </div>
      <div class="cs-alert-body">
        <p><strong>${student.name}</strong> has exhibited a confusion rate above 70% for 20 seconds. Recommended intervention is advised.</p>
