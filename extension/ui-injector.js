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
      POPUP_RESP:  entry.response === 'YES' ? '#ef4444' : '#4ade80',
      INTERVENE:   '#3b82f6',
      SESSION_START: '#a78bfa',
      SESSION_END:   '#a78bfa'
    };
    const color = typeColors[entry.type] || '#9ca3af';

    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #1f2937';
    row.innerHTML = `
      <td style="padding:2px 5px;color:#9ca3af">${mm}:${ss}</td>
      <td style="padding:2px 5px;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${entry.studentName || '—'}</td>
      <td style="padding:2px 5px;text-align:center">${entry.au4  !== null && entry.au4  !== undefined ? entry.au4  : '—'}</td>
      <td style="padding:2px 5px;text-align:center">${entry.au7  !== null && entry.au7  !== undefined ? entry.au7  : '—'}</td>
      <td style="padding:2px 5px;text-align:center">${entry.au12 !== null && entry.au12 !== undefined ? entry.au12 : '—'}</td>
      <td style="padding:2px 5px;text-align:center;color:${this.getColor(entry.confusionRate || 0)}">${entry.confusionRate ?? '—'}%</td>
      <td style="padding:2px 5px;color:${color}">${entry.type}</td>
      <td style="padding:2px 5px">${entry.response || ''}</td>
    `;
    tbody.appendChild(row);

    // Auto-scroll to latest
    const wrap = this.elements.dashboard?.querySelector('#cs-log-table-wrap');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  }

  updateDashboard(participants = null) {
    if (participants) this.participants = participants;
    if (!this.elements.dashboard) return;

    const sorted = [...this.participants]
      .filter(p => p.role === 'student')
      .sort((a, b) => {
        // Confused students first, then detection-off last
        const aOff = a.detectionEnabled === false;
        const bOff = b.detectionEnabled === false;
        if (aOff !== bOff) return aOff ? 1 : -1;
        if (a.isConfused !== b.isConfused) return b.isConfused ? 1 : -1;
        return 0;
      });

    const activeStudents  = sorted.filter(s => s.detectionEnabled !== false);
    const confusedCount   = activeStudents.filter(s => s.isConfused).length;
    this.overallConfusion = activeStudents.length > 0 ? Math.round((confusedCount / activeStudents.length) * 100) : 0;

    const overallEl = this.elements.dashboard.querySelector('#cs-overall-rate');
    if (overallEl) {
      overallEl.textContent = `${confusedCount} / ${activeStudents.length}`;
      overallEl.style.color = confusedCount > 0 ? '#ef4444' : '#4ade80';
    }

    const timeEl = this.elements.dashboard.querySelector('#cs-session-time');
    if (timeEl) timeEl.textContent = this.formatTime(this.sessionTime);

    const listEl = this.elements.dashboard.querySelector('#cs-participants');
    if (listEl) {
      if (sorted.length === 0) {
        listEl.innerHTML = '<div class="cs-no-students">No students with detection enabled</div>';
      } else {
        listEl.innerHTML = sorted.map(s => this.getParticipantHTML(s)).join('');
        sorted.forEach(s => {
          const interveneBtn = listEl.querySelector(`#cs-card-intervene-${CSS.escape(s.id)}`);
          if (interveneBtn) {
            interveneBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (this.callbacks.onIntervene) this.callbacks.onIntervene(s);
              this.confirmedConfusions.delete(s.id);
              this.activeInterventions.add(s.id);
              this.updateDashboard();
            });
          }
          const stopBtn = listEl.querySelector(`#cs-card-stop-${CSS.escape(s.id)}`);
          if (stopBtn) {
            stopBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (this.callbacks.onStopIntervention) this.callbacks.onStopIntervention(s);
              this.activeInterventions.delete(s.id);
              this.updateDashboard();
            });
          }
        });
      }
    }

    const now = Date.now();
    sorted.forEach(s => {
      if (s.detectionEnabled === false) return;
      const lastLog = this.lastLogTime.get(s.id) || 0;

      if (now - lastLog >= 10000) {
        this.lastLogTime.set(s.id, now);

        this.sessionLog.push({
          timestamp: now,
          studentId: s.id,
          studentName: s.name,
          confused: !!s.isConfused,
          confirmed: this.confirmedConfusions.has(s.id),
          intervention: 'None'
        });

        if (s.isConfused && !this.confusionStartTimes.has(s.id)) {
          this.confusionStartTimes.set(s.id, now);
        } else if (!s.isConfused && this.confusionStartTimes.has(s.id)) {
          const startTime = this.confusionStartTimes.get(s.id);
          const duration = Math.round((now - startTime) / 1000);
          this.confusionStartTimes.delete(s.id);

          if (!this.confusionEvents.has(s.id)) this.confusionEvents.set(s.id, []);
          this.confusionEvents.get(s.id).push({
            timestamp: startTime,
            endTimestamp: now,
            duration,
            intervention: this.confirmedConfusions.has(s.id) ? 'Confirmed' : 'None',
            interventionBy: null
          });
        }
      }
    });

    this.updateBubble();
  }

  getParticipantHTML(student) {
    const detectionOff = student.detectionEnabled === false;
    const isConfused   = !detectionOff && student.isConfused;
    const isIntervening = this.activeInterventions.has(student.id);

    const dotHTML = detectionOff
      ? `<span class="cs-detection-dot cs-dot-off" title="Detection Off"></span>`
      : `<span class="cs-detection-dot cs-dot-on" title="Detection On"></span>`;

    let statusHTML = '';
    let actionHTML = '';

    if (detectionOff) {
      statusHTML = `<span style="font-size:11px;color:#ef4444;font-weight:600;flex-shrink:0;">Detection Off</span>`;
    } else if (isIntervening) {
      statusHTML = `<span style="font-size:11px;color:#3b82f6;font-weight:600;flex-shrink:0;">Intervening</span>`;
      actionHTML = `<button class="cs-card-stop-btn" id="cs-card-stop-${student.id}" style="margin-left:6px;background:#ef4444;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;cursor:pointer;">Stop</button>`;
    } else if (isConfused) {
      statusHTML = `<span style="font-size:11px;color:#ef4444;font-weight:600;flex-shrink:0;">Confused</span>`;
      actionHTML = `<button class="cs-card-intervene-btn" id="cs-card-intervene-${student.id}" style="margin-left:6px;">Intervene</button>`;
    } else {
      statusHTML = `<span style="font-size:11px;color:#4ade80;flex-shrink:0;">Not Confused</span>`;
    }

    return `
      <div class="cs-participant${isConfused ? ' high-confusion' : ''}${detectionOff ? ' detection-off' : ''}" data-id="${student.id}" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;${detectionOff ? 'background:rgba(239,68,68,0.08);border-left:3px solid #ef4444;' : ''}">
        <span style="display:flex;align-items:center;flex:1;overflow:hidden;">
          ${dotHTML}
          <span class="cs-participant-name" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${detectionOff ? 'color:#9ca3af;' : ''}">${student.name}</span>
        </span>
        <span style="margin-left:8px;display:flex;align-items:center;flex-shrink:0;">${statusHTML}${actionHTML}</span>
      </div>
    `;
  }

  flashParticipant(studentId, color) {
    if (!this.elements.dashboard) return;
    const el = this.elements.dashboard.querySelector(`[data-id="${CSS.escape(studentId)}"]`);
    if (!el) return;
    el.style.transition = 'box-shadow 0.3s ease';
    el.style.boxShadow  = `inset 0 0 0 2px ${color}`;
    setTimeout(() => { el.style.boxShadow = 'none'; }, 1500);
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
        <span class="cs-bubble-rate">0</span>
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
    if (rateEl) {
      const active   = this.participants.filter(p => p.role === 'student' && p.detectionEnabled !== false);
      const confused = active.filter(s => s.isConfused).length;
      rateEl.textContent = `${confused}`;
      rateEl.style.color = confused > 0 ? '#ef4444' : '#4ade80';
    }
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


  markStudentConfirmed(studentId) {
    this.confirmedConfusions.set(studentId, Date.now());
    this.updateDashboard();
  }

  clearStudentConfirmed(studentId) {
    this.confirmedConfusions.delete(studentId);
    this.updateDashboard();
  }

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

    if (this.confusionEvents.has(studentId)) {
      const events = this.confusionEvents.get(studentId);
      if (events.length > 0) {
        events[events.length - 1].intervention = 'Intervened';
        events[events.length - 1].interventionBy = tutorName || 'Tutor';
      }
    }

    this.sessionLog.push({
      timestamp: now,
      studentId: studentId,
      studentName: studentName,
      confusionRate: 0,
      confirmed: true,
      intervention: tutorName || 'Tutor'
    });
  }


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
    }, 20000);
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
      </div>
      <div class="cs-alert-actions">
        <button id="cs-intervene-btn" class="cs-alert-btn cs-btn-intervene">Intervene Now</button>
        <button id="cs-dismiss-btn" class="cs-alert-btn cs-btn-dismiss">Dismiss for 5 mins</button>
      </div>
    `;

    this.elements.container.appendChild(this.elements.alert);
    this.state.alertVisible = true;

    this.elements.alert.querySelector('#cs-intervene-btn')?.addEventListener('click', () => {
      if (this.callbacks.onIntervene) this.callbacks.onIntervene(student);
      this.hideTutorAlert();
    });

    this.elements.alert.querySelector('#cs-dismiss-btn')?.addEventListener('click', () => {
      if (this.callbacks.onDismissAlert) this.callbacks.onDismissAlert(student, 300000);
      this.hideTutorAlert();
    });

    this.elements.alert.querySelector('#cs-alert-close')?.addEventListener('click', () => this.hideTutorAlert());
  }

  hideTutorAlert() {
    if (this.elements.alert) {
      this.elements.alert.remove();
      this.elements.alert = null;
      this.state.alertVisible = false;
    }
  }

  showAlert(student) { this.showTutorAlert(student); }
  hideAlert() { this.hideTutorAlert(); }


  async generatePDFReport() {
    // Show loading
    const overlay = document.createElement('div');
    overlay.className = 'cs-pdf-overlay';
    overlay.innerHTML = `
      <div class="cs-pdf-loading">
        <div class="cs-pdf-loading-spinner"></div>
        <div>Generating Session Report...</div>
      </div>
    `;
    this.elements.container.appendChild(overlay);

    try {
        this._exportSessionCSV();
      // Generate visual PDF
      await this._buildAndDownloadPDF();
    } catch (err) {
      console.error('[ConfuSense] PDF generation error:', err);
      this._exportSessionCSV();
    } finally {
      overlay.remove();
    }
  }

  _getStudentReportData() {
    const sessionDurationMs = Math.max(Date.now() - this.sessionStartTime, 1);
    const sessionStartMs = this.sessionStartTime || Date.now();
    const students = [];

    // participants are all students (from state.students Map)
    this.participants.forEach(p => {
      const events = (p.confusionEvents || []).map(e => ({
        timestamp:  e.timestamp || 0,
        durationMs: e.durationMs || 30000,
        intervened: !!e.intervened,
      }));

      const interventionCount = events.filter(e => e.intervened).length;
      const totalConfusionSec = events.reduce((s, e) => s + (e.durationMs / 1000), 0);
      const overallRate = Math.min(100, Math.round((totalConfusionSec / (sessionDurationMs / 1000)) * 100));

      students.push({
        id:               p.id,
        name:             p.name,
        timesConfused:    events.length,
        overallRate:      p.sessionConfusionPct != null ? p.sessionConfusionPct : overallRate,
        totalConfusionSec,
        events,
        interventions:    events.filter(e => e.intervened),
        sessionStartMs,
      });
    });

    return students.sort((a, b) => b.timesConfused - a.timesConfused);
  }

  async _buildAndDownloadPDF() {
    const students = this._getStudentReportData();

    if (students.length === 0) {
      const fallback = this.participants.filter(p => p.role === 'student');
      if (fallback.length === 0) {
        console.warn('[ConfuSense] No student data to report');
        return;
      }
      fallback.forEach(p => {
        students.push({
          id: p.id, name: p.name,
          overallRate: Math.round(p.confusionRate || 0),
          currentRate: Math.round(p.confusionRate || 0),
          readings: [], events: [], interventions: [],
          totalConfusionSec: 0
        });
      });
    }

    const reportDiv = document.createElement('div');
    reportDiv.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: 480px; font-family: 'Segoe UI', Arial, sans-serif;
      background: #0a0a18; color: #fff; padding: 24px;
    `;

    let html = `
      <div style="text-align:center;font-size:20px;font-weight:bold;padding:12px 0 22px;color:#fff;">
        Session Report
      </div>
    `;

    const sessionStart = this.sessionStartTime || Date.now();
    students.forEach(student => {
      const rate = student.overallRate;
      const totalM = Math.floor(student.totalConfusionSec / 60);
      const totalS = Math.round(student.totalConfusionSec % 60);
      const totalStr = `${totalM.toString().padStart(2, '0')}:${totalS.toString().padStart(2, '0')}`;
      const interventionCount = student.interventions.length;

      let eventsHTML = '';
      if (student.events && student.events.length > 0) {
        const rows = student.events.map(evt => {
          const elapsed = Math.max(0, Math.floor((evt.timestamp - sessionStart) / 1000));
          const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
          const ss = String(elapsed % 60).padStart(2, '0');
          const dur = Math.round((evt.durationMs || 0) / 1000);
          return `<tr><td style="color:#c0c0d0;padding:2px 8px;">${mm}:${ss}</td><td style="padding:2px 8px;">${dur}s</td><td style="color:${evt.intervened ? '#3b82f6' : '#6b7280'};padding:2px 8px;">${evt.intervened ? 'Yes' : 'No'}</td></tr>`;
        }).join('');
        eventsHTML = `<div style="margin-top:10px;"><div style="font-size:9px;color:#9898b8;font-weight:bold;margin-bottom:4px;">Event Log</div><table style="font-size:9px;color:#a0a0c0;"><tr><th style="text-align:left;padding:2px 8px;color:#7878a0;">Time</th><th style="padding:2px 8px;color:#7878a0;">Duration</th><th style="padding:2px 8px;color:#7878a0;">Intervened</th></tr>${rows}</table></div>`;
      }

      html += `
        <div style="background:rgba(75,70,180,0.25);border:1.5px solid rgba(100,100,230,0.45);border-radius:14px;padding:18px;margin-bottom:24px;">
          <div style="font-size:15px;font-weight:bold;color:#fff;">Student : ${student.name}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
            <div>
              <div style="font-size:11px;color:#a0a0c0;">Times Confused</div>
              <div style="font-size:38px;font-weight:bold;color:#fff;">${student.timesConfused}</div>
            </div>
            <div>
              <div style="font-size:11px;color:#a0a0c0;">Avg Confusion</div>
              <div style="font-size:38px;font-weight:bold;color:${rate >= 70 ? '#f87171' : rate >= 50 ? '#fbbf24' : '#4ade80'};">${rate}%</div>
            </div>
          </div>
          <div style="color:#8888a8;font-size:10px;margin-top:12px;">
            Total Confusion Time: ${totalStr} (min:sec) · Interventions: ${interventionCount}
          </div>
          ${eventsHTML}
        </div>
      `;
    });

    const totalDetections = students.reduce((s, st) => s + st.timesConfused, 0);
    const classAvgRate = students.length > 0
      ? Math.round(students.reduce((s, st) => s + st.overallRate, 0) / students.length)
      : 0;

    html += `
      <div style="background:rgba(90,80,200,0.3);border:1.5px solid rgba(130,120,255,0.5);border-radius:14px;padding:18px;margin-top:8px;">
        <div style="font-size:13px;font-weight:bold;color:#fff;">Class Summary</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
          <div>
            <div style="font-size:10px;color:#a0a0c0;">Total Detections</div>
            <div style="font-size:28px;font-weight:bold;color:#fff;">${totalDetections}</div>
          </div>
          <div>
            <div style="font-size:10px;color:#a0a0c0;">Class Avg Confusion</div>
            <div style="font-size:28px;font-weight:bold;color:${classAvgRate >= 70 ? '#f87171' : classAvgRate >= 50 ? '#fbbf24' : '#4ade80'};">${classAvgRate}%</div>
          </div>
          <div>
            <div style="font-size:10px;color:#a0a0c0;">Students</div>
            <div style="font-size:28px;font-weight:bold;color:#fff;">${students.length}</div>
          </div>
        </div>
      </div>
    `;

    reportDiv.innerHTML = html;
    document.body.appendChild(reportDiv);
    reportDiv.remove();

    await this._buildPDFCanvasFallback(students);
  }

  async _buildPDFCanvasFallback(students) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const SCALE = 3;
    const W = 520;
    const PAD = 28;
    const CARD_PAD = 22;
    const CARD_GAP = 28;
    const CARD_W = W - PAD * 2;
    const TITLE_AREA = 110;
    const CARD_BASE_H = 150;
    const EVENT_ROW_H = 16;
    const EVENT_HEADER_H = 22;
    const MAX_EVENTS_SHOWN = 5;
    const SUMMARY_H = 120;

    // Calculate per-student card heights (dynamic based on events)
    const cardHeights = students.map(s => {
      const eventCount = Math.min((s.events || []).length, MAX_EVENTS_SHOWN);
      return eventCount > 0 ? CARD_BASE_H + EVENT_HEADER_H + eventCount * EVENT_ROW_H + 8 : CARD_BASE_H;
    });

    // Calculate height dynamically
    let totalH = TITLE_AREA + cardHeights.reduce((s, h) => s + h + CARD_GAP, 0) + SUMMARY_H + PAD * 2 + 30;

    canvas.width = W * SCALE;
    canvas.height = Math.max(totalH, 500) * SCALE;
    ctx.scale(SCALE, SCALE);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const bgGrad = ctx.createLinearGradient(0, 0, 0, totalH);
    bgGrad.addColorStop(0, '#0c0c20');
    bgGrad.addColorStop(0.5, '#080818');
    bgGrad.addColorStop(1, '#060612');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, totalH);

    const topGlow = ctx.createRadialGradient(W / 2, 0, 20, W / 2, 0, W * 0.7);
    topGlow.addColorStop(0, 'rgba(90, 80, 240, 0.15)');
    topGlow.addColorStop(0.5, 'rgba(60, 60, 180, 0.06)');
    topGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, W, 250);

    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ConfuSense', W / 2, 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Segoe UI, sans-serif';
    ctx.fillText('Session Report', W / 2, 52);

    const sessionDate = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const sessionDur = this.formatTime(this.sessionTime);
    ctx.fillStyle = '#7878a0';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText(`${sessionDate}  ·  Duration: ${sessionDur}  ·  ${students.length} Student${students.length !== 1 ? 's' : ''}`, W / 2, 72);

    ctx.strokeStyle = 'rgba(100, 100, 220, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(PAD + 30, 85);
    ctx.lineTo(W - PAD - 30, 85);
    ctx.stroke();

    ctx.textAlign = 'left';
    let y = TITLE_AREA;

    students.forEach((student, si) => {
      const rate = student.overallRate;
      const cx = PAD;
      const CARD_H = cardHeights[si];

      ctx.shadowColor = 'rgba(80, 70, 200, 0.15)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      const cardGrad = ctx.createLinearGradient(cx, y, cx, y + CARD_H);
      cardGrad.addColorStop(0, 'rgba(80, 75, 190, 0.3)');
      cardGrad.addColorStop(1, 'rgba(50, 45, 140, 0.18)');
      ctx.fillStyle = cardGrad;
      ctx.strokeStyle = 'rgba(110, 110, 240, 0.4)';
      ctx.lineWidth = 1;
      this._roundRect(ctx, cx, y, CARD_W, CARD_H, 16);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      const innerGlow = ctx.createLinearGradient(cx, y, cx, y + 60);
      innerGlow.addColorStop(0, 'rgba(120, 110, 255, 0.08)');
      innerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGlow;
      ctx.fillRect(cx + 1, y + 1, CARD_W - 2, 58);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Segoe UI, sans-serif';
      ctx.fillText(`Student : ${student.name}`, cx + CARD_PAD, y + 30);

      ctx.fillStyle = '#9898b8';
      ctx.font = '11px Segoe UI, sans-serif';
      ctx.fillText('Times Confused', cx + CARD_PAD, y + 52);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Segoe UI, sans-serif';
      ctx.fillText(`${student.timesConfused}`, cx + CARD_PAD, y + 100);

      ctx.fillStyle = '#9898b8';
      ctx.font = '11px Segoe UI, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Avg Confusion', cx + CARD_W - CARD_PAD - 60, y + 52);
      ctx.textAlign = 'left';

      const rateColor = rate >= 70 ? '#f87171' : rate >= 50 ? '#fbbf24' : '#4ade80';
      ctx.fillStyle = rateColor;
      ctx.font = 'bold 32px Segoe UI, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${rate}%`, cx + CARD_W - CARD_PAD - 64, y + 90);
      ctx.textAlign = 'left';

      const donutX = cx + CARD_W - 50;
      const donutY = y + 76;
      const donutR = 24;
      const donutWidth = 6;

      ctx.beginPath();
      ctx.arc(donutX, donutY, donutR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 50, 50, 0.15)';
      ctx.lineWidth = donutWidth;
      ctx.stroke();

      ctx.beginPath();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (rate / 100) * Math.PI * 2;
      ctx.arc(donutX, donutY, donutR, startAngle, endAngle);
      ctx.strokeStyle = rateColor;
      ctx.lineWidth = donutWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';

      ctx.fillStyle = rateColor;
      ctx.font = 'bold 11px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${rate}%`, donutX, donutY + 4);
      ctx.textAlign = 'left';

      const totalM = Math.floor(student.totalConfusionSec / 60);
      const totalS = Math.round(student.totalConfusionSec % 60);
      const totalStr = `${totalM.toString().padStart(2, '0')}:${totalS.toString().padStart(2, '0')}`;
      ctx.fillStyle = '#7878a0';
      ctx.font = '10px Segoe UI, sans-serif';
      ctx.fillText(`Total Confusion Time: ${totalStr} (min:sec)`, cx + CARD_PAD, y + CARD_BASE_H - 16);

      ctx.textAlign = 'right';
      ctx.fillText(`${student.interventions.length} intervention${student.interventions.length !== 1 ? 's' : ''}`, cx + CARD_W - CARD_PAD, y + CARD_BASE_H - 16);
      ctx.textAlign = 'left';

      // ── Event timeline rows ──────────────────────────────────
      const eventsToShow = (student.events || []).slice(-MAX_EVENTS_SHOWN);
      if (eventsToShow.length > 0) {
        let ey = y + CARD_BASE_H + 2;
        const sessionStart = student.sessionStartMs || this.sessionStartTime || Date.now();

        // Section header
        ctx.fillStyle = '#9898b8';
        ctx.font = 'bold 9px Segoe UI, sans-serif';
        ctx.fillText('Event Log', cx + CARD_PAD, ey + 10);

        ctx.fillStyle = '#50506a';
        ctx.font = '8px Segoe UI, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Time', cx + CARD_PAD + 60, ey + 10);
        ctx.fillText('Duration', cx + CARD_PAD + 130, ey + 10);
        ctx.fillText('Intervened', cx + CARD_W - CARD_PAD, ey + 10);
        ctx.textAlign = 'left';

        // Divider
        ctx.strokeStyle = 'rgba(100, 100, 220, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + CARD_PAD, ey + 15);
        ctx.lineTo(cx + CARD_W - CARD_PAD, ey + 15);
        ctx.stroke();

        ey += EVENT_HEADER_H;

        eventsToShow.forEach((evt) => {
          const elapsedSec = Math.max(0, Math.floor((evt.timestamp - sessionStart) / 1000));
          const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
          const ss = String(elapsedSec % 60).padStart(2, '0');

