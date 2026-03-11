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
