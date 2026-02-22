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
    const parts = name.trim().split(/\s+/).filter(n => n.length > 0);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return parts.map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

  // ==================== PDF & CSV REPORT GENERATION ====================

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
      // Also export CSV with raw data
      this._exportSessionCSV();
      // Generate visual PDF
      await this._buildAndDownloadPDF();
    } catch (err) {
      console.error('[ConfuSense] PDF generation error:', err);
      this._exportSessionCSV(); // Fallback: at least give them the CSV
    } finally {
      overlay.remove();
    }
  }

  _getStudentReportData() {
    const studentMap = new Map();
    const BUCKET_MS = 5 * 60 * 1000; // 5 minutes

    // Gather all students from participants + sessionLog
    this.participants.forEach(p => {
      if (p.role === 'student') {
        studentMap.set(p.id, {
          id: p.id,
          name: p.name,
          currentRate: Math.round(p.confusionRate || 0),
          readings: [],
          events: [],
          interventions: []
        });
      }
    });

    // Add data from sessionLog (real readings every ~10s)
    this.sessionLog.forEach(entry => {
      if (!studentMap.has(entry.studentId)) {
        studentMap.set(entry.studentId, {
          id: entry.studentId,
          name: entry.studentName,
          currentRate: entry.confusionRate,
          readings: [],
          events: [],
          interventions: []
        });
      }
      const student = studentMap.get(entry.studentId);
      if (entry.intervention && entry.intervention !== 'None') {
        student.interventions.push(entry);
      } else {
        student.readings.push(entry);
      }
    });

    // Add intervention records
    this.studentInterventions.forEach((interventions, studentId) => {
      if (studentMap.has(studentId)) {
        studentMap.get(studentId).interventions = interventions;
      }
    });

    // Process each student: calculate overall rate + build 5-min bucket events
    studentMap.forEach(student => {
      // Overall confusion rate = average of ALL readings throughout the session
      if (student.readings.length > 0) {
        const sum = student.readings.reduce((s, r) => s + r.confusionRate, 0);
        student.overallRate = Math.round(sum / student.readings.length);
      } else {
        student.overallRate = student.currentRate;
      }

      // Group readings into 5-minute time buckets
      if (student.readings.length > 0) {
        const buckets = new Map(); // bucketKey -> { readings[], startTime, interventionInBucket }

        student.readings.forEach(reading => {
          // Bucket key = floor to nearest 5 min from session start
          const elapsed = reading.timestamp - this.sessionStartTime;
          const bucketIndex = Math.floor(elapsed / BUCKET_MS);
          const bucketStart = this.sessionStartTime + bucketIndex * BUCKET_MS;
          const key = bucketIndex;

          if (!buckets.has(key)) {
            buckets.set(key, {
              startTime: bucketStart,
              endTime: bucketStart + BUCKET_MS,
              readings: [],
              hasIntervention: false,
              interventionBy: null
            });
          }
          buckets.get(key).readings.push(reading);
        });

        // Check which buckets had interventions
        student.interventions.forEach(intv => {
          const elapsed = intv.timestamp - this.sessionStartTime;
          const bucketIndex = Math.floor(elapsed / BUCKET_MS);
          if (buckets.has(bucketIndex)) {
            buckets.get(bucketIndex).hasIntervention = true;
            buckets.get(bucketIndex).interventionBy = intv.tutorName || intv.intervention || 'Tutor';
          }
        });

        // Convert buckets to events: each bucket = one row in the report
        student.events = [];
        const sortedBuckets = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);

        sortedBuckets.forEach(([key, bucket]) => {
          const avgRate = Math.round(
            bucket.readings.reduce((s, r) => s + r.confusionRate, 0) / bucket.readings.length
          );
          // Duration = time span of actual readings in this bucket
          const firstReading = bucket.readings[0].timestamp;
          const lastReading = bucket.readings[bucket.readings.length - 1].timestamp;
          const duration = Math.max(Math.round((lastReading - firstReading) / 1000), 10);

          student.events.push({
            timestamp: bucket.startTime,
            endTimestamp: bucket.endTime,
            rate: avgRate,
            duration: duration,
            intervention: bucket.hasIntervention ? 'Intervened' : 'None',
            interventionBy: bucket.interventionBy
          });
        });
      }

      // Calculate total confusion time: sum of durations where avg rate >= 50
      student.totalConfusionSec = student.events
        .filter(e => e.rate >= 50)
        .reduce((s, e) => s + (e.duration || 0), 0);
    });

    return Array.from(studentMap.values())
      .sort((a, b) => b.overallRate - a.overallRate);
  }

  async _buildAndDownloadPDF() {
    const students = this._getStudentReportData();

    // If no students tracked, use current participants as fallback
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

    // Create offscreen HTML element for rendering
    const reportDiv = document.createElement('div');
    reportDiv.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: 480px; font-family: 'Segoe UI', Arial, sans-serif;
      background: #0a0a18; color: #fff; padding: 24px;
    `;

    // Build the report HTML matching wireframe
    let html = `
      <div style="text-align:center;font-size:20px;font-weight:bold;padding:12px 0 22px;color:#fff;">
        Session Report
      </div>
    `;

    students.forEach(student => {
      const rate = student.overallRate;
      const events = student.events.length > 0 ? student.events.slice(-5) : [];
      const totalM = Math.floor(student.totalConfusionSec / 60);
      const totalS = student.totalConfusionSec % 60;
      const totalStr = `${totalM.toString().padStart(2, '0')}:${totalS.toString().padStart(2, '0')}`;

      // SVG donut
      const circumference = 2 * Math.PI * 21;
      const dashoffset = circumference - (rate / 100) * circumference;

      // Build event rows
      let eventRowsHTML = '';
      if (events.length > 0) {
        events.forEach((ev, i) => {
          // Show as time range (5-min bucket)
          const tStart = new Date(ev.timestamp);
          const tEnd = new Date(ev.endTimestamp || ev.timestamp + 300000);
          const fmtTime = (d) => [d.getHours(), d.getMinutes()].map(v => v.toString().padStart(2, '0')).join(':');
          const timeStr = `${fmtTime(tStart)} – ${fmtTime(tEnd)}`;
          const evRate = ev.rate || rate;
          const barWidth = Math.min(evRate, 100);
          const hasIntervention = ev.intervention && ev.intervention !== 'None';
          const statusColor = hasIntervention ? '#4ade80' : '#ef4444';
          const statusText = hasIntervention
            ? `Intervened (${ev.interventionBy || 'Tutor'})`
            : (evRate >= 70 ? 'High' : evRate >= 50 ? 'Medium' : 'Low');

          const rowBg = i % 2 === 1 ? 'background:rgba(60,60,140,0.15);' : '';
          eventRowsHTML += `
            <tr style="${rowBg}">
              <td style="padding:5px 6px;color:#d0d0e8;font-size:10px;">${timeStr}</td>
              <td style="padding:5px 6px;color:#d0d0e8;font-size:10px;">${evRate}%</td>
              <td style="padding:5px 6px;">
                <div style="width:70px;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
                  <div style="width:${barWidth}%;height:100%;border-radius:3px;background:linear-gradient(to right,#6366f1,#8b5cf6);"></div>
                </div>
              </td>
              <td style="padding:5px 6px;color:${statusColor};font-size:9px;">${statusText}</td>
            </tr>
          `;
        });
      } else {
        // No events recorded yet - show message
        eventRowsHTML = `
          <tr>
            <td colspan="4" style="padding:8px 6px;color:#8888a8;font-size:10px;text-align:center;">
              No confusion events recorded during session
            </td>
          </tr>
        `;
      }

      // Number of readings and interventions
      const readingCount = student.readings.length;
      const interventionCount = student.interventions.length;

      html += `
        <div style="background:rgba(75,70,180,0.25);border:1.5px solid rgba(100,100,230,0.45);border-radius:14px;padding:18px;margin-bottom:24px;">
          <div style="font-size:15px;font-weight:bold;color:#fff;">Student : ${student.name}</div>
          <div style="font-size:11px;color:#a0a0c0;margin-top:4px;">Overall Confusion Rate</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
            <div style="font-size:38px;font-weight:bold;color:#fff;">${rate}%</div>
            <svg width="52" height="52" viewBox="0 0 52 52" style="transform:rotate(-90deg);">
              <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(180,40,40,0.25)" stroke-width="6"/>
              <circle cx="26" cy="26" r="21" fill="none" stroke="#dc2626" stroke-width="6"
                stroke-linecap="round" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${dashoffset.toFixed(2)}"/>
            </svg>
          </div>
          <div style="font-size:11px;font-weight:bold;color:#fff;margin-top:16px;">Confusion Events Log</div>
          <table style="width:100%;border-collapse:collapse;margin-top:8px;">
            <thead>
              <tr style="background:rgba(60,60,140,0.45);">
                <th style="color:#c0c0d8;font-size:8px;font-weight:bold;text-align:left;padding:4px 6px;">Time Period</th>
                <th style="color:#c0c0d8;font-size:8px;font-weight:bold;text-align:left;padding:4px 6px;">Avg Rate</th>
                <th style="color:#c0c0d8;font-size:8px;font-weight:bold;text-align:left;padding:4px 6px;">Confusion Level</th>
                <th style="color:#c0c0d8;font-size:8px;font-weight:bold;text-align:left;padding:4px 6px;">Intervention Status</th>
              </tr>
            </thead>
            <tbody>
              ${eventRowsHTML}
            </tbody>
          </table>
          <div style="color:#8888a8;font-size:10px;margin-top:10px;">
            Total Confusion Time - ${totalStr}(min:sec) | Readings: ${readingCount} | Interventions: ${interventionCount}
          </div>
        </div>
      `;
    });

    reportDiv.innerHTML = html;
    document.body.appendChild(reportDiv);

    // Render HTML to canvas
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const width = 480;
      const height = reportDiv.scrollHeight;
      canvas.width = width * 2;  // 2x for clarity
      canvas.height = height * 2;
      ctx.scale(2, 2);

      // Draw background
      ctx.fillStyle = '#0a0a18';
      ctx.fillRect(0, 0, width, height);

      // Use SVG foreignObject to render HTML into canvas
      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${reportDiv.innerHTML}
            </div>
          </foreignObject>
        </svg>
      `;

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => {
          console.warn('[ConfuSense] SVG render failed, falling back to canvas draw');
          reject(new Error('SVG render failed'));
        };
        img.src = svgUrl;
      });

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);
      reportDiv.remove();

      this._downloadCanvasAsPDF(canvas, `ConfuSense_Session_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (svgErr) {
      console.warn('[ConfuSense] SVG approach failed, using canvas fallback:', svgErr);
      reportDiv.remove();
      // Fallback: use manual canvas rendering
      await this._buildPDFCanvasFallback(students);
    }
  }

  async _buildPDFCanvasFallback(students) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 3x resolution for crisp PDF output
    const SCALE = 3;
    const W = 520;
    const PAD = 28;
    const CARD_PAD = 22;
    const CARD_GAP = 28;
    const CARD_W = W - PAD * 2;
    const ROW_H = 28;
    const TITLE_AREA = 110;  // more room for title + session info

    // Calculate height dynamically
    let totalH = TITLE_AREA;
    students.forEach(s => {
      const eventCount = Math.max(Math.min(s.events.length, 8), 1);
      const cardH = 170 + eventCount * ROW_H + 36;
      totalH += cardH + CARD_GAP;
    });
    totalH += PAD * 2;

    canvas.width = W * SCALE;
    canvas.height = Math.max(totalH, 500) * SCALE;
    ctx.scale(SCALE, SCALE);

    // Enable font smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ── Background ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, totalH);
    bgGrad.addColorStop(0, '#0c0c20');
    bgGrad.addColorStop(0.5, '#080818');
    bgGrad.addColorStop(1, '#060612');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, totalH);

    // Top glow
    const topGlow = ctx.createRadialGradient(W / 2, 0, 20, W / 2, 0, W * 0.7);
    topGlow.addColorStop(0, 'rgba(90, 80, 240, 0.15)');
    topGlow.addColorStop(0.5, 'rgba(60, 60, 180, 0.06)');
    topGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, W, 250);

    // ── ConfuSense branding ──
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ConfuSense', W / 2, 24);

    // ── Title ──
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Segoe UI, sans-serif';
    ctx.fillText('Session Report', W / 2, 52);

    // ── Session info line ──
    const sessionDate = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const sessionDur = this.formatTime(this.sessionTime);
    ctx.fillStyle = '#7878a0';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText(`${sessionDate}  ·  Duration: ${sessionDur}  ·  ${students.length} Student${students.length !== 1 ? 's' : ''}`, W / 2, 72);

    // Thin separator line
    ctx.strokeStyle = 'rgba(100, 100, 220, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(PAD + 30, 85);
    ctx.lineTo(W - PAD - 30, 85);
    ctx.stroke();

    ctx.textAlign = 'left';
    let y = TITLE_AREA;

    students.forEach((student) => {
      const rate = student.overallRate;
      const events = student.events.slice(-8);
      const eventCount = Math.max(Math.min(events.length, 8), 1);
      const CARD_H = 170 + eventCount * ROW_H + 36;
      const cx = PAD;

      // ── Card shadow ──
      ctx.shadowColor = 'rgba(80, 70, 200, 0.15)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // ── Card background gradient ──
      const cardGrad = ctx.createLinearGradient(cx, y, cx, y + CARD_H);
      cardGrad.addColorStop(0, 'rgba(80, 75, 190, 0.3)');
      cardGrad.addColorStop(1, 'rgba(50, 45, 140, 0.18)');
      ctx.fillStyle = cardGrad;
      ctx.strokeStyle = 'rgba(110, 110, 240, 0.4)';
      ctx.lineWidth = 1;
      this._roundRect(ctx, cx, y, CARD_W, CARD_H, 16);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // ── Inner glow at top of card ──
      const innerGlow = ctx.createLinearGradient(cx, y, cx, y + 60);
      innerGlow.addColorStop(0, 'rgba(120, 110, 255, 0.08)');
      innerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGlow;
      ctx.fillRect(cx + 1, y + 1, CARD_W - 2, 58);

      // ── "Student : Name" ──
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Segoe UI, sans-serif';
      ctx.fillText(`Student : ${student.name}`, cx + CARD_PAD, y + 30);

      // ── "Overall Confusion Rate" ──
      ctx.fillStyle = '#9898b8';
      ctx.font = '11px Segoe UI, sans-serif';
      ctx.fillText('Overall Confusion Rate', cx + CARD_PAD, y + 50);

      // ── Big percentage ──
      const rateColor = rate >= 70 ? '#f87171' : rate >= 50 ? '#fbbf24' : '#4ade80';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Segoe UI, sans-serif';
      ctx.fillText(`${rate}%`, cx + CARD_PAD, y + 100);

      // ── Donut ring (right side) ──
      const donutX = cx + CARD_W - 56;
      const donutY = y + 74;
      const donutR = 28;
      const donutWidth = 7;

      // Track background
      ctx.beginPath();
      ctx.arc(donutX, donutY, donutR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 50, 50, 0.15)';
      ctx.lineWidth = donutWidth;
      ctx.stroke();

      // Progress arc
      ctx.beginPath();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (rate / 100) * Math.PI * 2;
      ctx.arc(donutX, donutY, donutR, startAngle, endAngle);
      const donutGrad = ctx.createLinearGradient(donutX - donutR, donutY - donutR, donutX + donutR, donutY + donutR);
      donutGrad.addColorStop(0, '#ef4444');
      donutGrad.addColorStop(1, '#dc2626');
      ctx.strokeStyle = donutGrad;
      ctx.lineWidth = donutWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';

      // Rate text inside donut
      ctx.fillStyle = rateColor;
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${rate}%`, donutX, donutY + 4);
      ctx.textAlign = 'left';

      // ── Divider line ──
      ctx.strokeStyle = 'rgba(100, 100, 220, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + CARD_PAD, y + 115);
      ctx.lineTo(cx + CARD_W - CARD_PAD, y + 115);
      ctx.stroke();

      // ── "Confusion Events Log" ──
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      ctx.fillText('Confusion Events Log', cx + CARD_PAD, y + 132);

      // ── Table header ──
      const tblX = cx + CARD_PAD;
      const tblW = CARD_W - CARD_PAD * 2;
      const tblY = y + 142;

      // Header background with rounded top corners
      ctx.fillStyle = 'rgba(55, 55, 150, 0.5)';
      this._roundRectFill(ctx, tblX, tblY, tblW, 22, 6, true, false);

      ctx.fillStyle = '#b8b8d8';
      ctx.font = 'bold 9px Segoe UI, sans-serif';
      const cols = [0, 100, 155, 290];
      ctx.fillText('Time Period', tblX + cols[0] + 8, tblY + 15);
      ctx.fillText('Avg Rate', tblX + cols[1] + 8, tblY + 15);
      ctx.fillText('Confusion Level', tblX + cols[2] + 8, tblY + 15);
      ctx.fillText('Intervention', tblX + cols[3] + 8, tblY + 15);

      // ── Event rows ──
      if (events.length > 0) {
        events.forEach((ev, i) => {
          const rowY = tblY + 22 + i * ROW_H;
          const tStart = new Date(ev.timestamp);
          const tEnd = new Date(ev.endTimestamp || ev.timestamp + 300000);
          const fmtTime = (d) => [d.getHours(), d.getMinutes()].map(v => v.toString().padStart(2, '0')).join(':');
          const timeStr = `${fmtTime(tStart)} – ${fmtTime(tEnd)}`;
          const evRate = ev.rate || rate;

          // Alternating row background
          if (i % 2 === 0) {
            ctx.fillStyle = 'rgba(50, 50, 130, 0.12)';
          } else {
            ctx.fillStyle = 'rgba(60, 60, 150, 0.2)';
          }
          // Last row gets rounded bottom corners
          if (i === events.length - 1) {
            this._roundRectFill(ctx, tblX, rowY, tblW, ROW_H, 6, false, true);
          } else {
            ctx.fillRect(tblX, rowY, tblW, ROW_H);
          }

          // Text
          ctx.fillStyle = '#d0d0e8';
          ctx.font = '10px Segoe UI, sans-serif';
          ctx.fillText(timeStr, tblX + cols[0] + 8, rowY + 18);
          ctx.fillText(`${evRate}%`, tblX + cols[1] + 14, rowY + 18);

          // Progress bar with rounded ends
          const barX = tblX + cols[2] + 8;
          const barW = 80;
          const barH = 7;
          const barY = rowY + 11;

          // Bar track
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          this._roundRectFill(ctx, barX, barY, barW, barH, 3.5);

          // Bar fill with gradient
          const fillW = Math.max((evRate / 100) * barW, 4);
          const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
          barGrad.addColorStop(0, '#6366f1');
          barGrad.addColorStop(0.6, '#8b5cf6');
          barGrad.addColorStop(1, '#a78bfa');
          ctx.fillStyle = barGrad;
          this._roundRectFill(ctx, barX, barY, fillW, barH, 3.5);

          // Rate text after bar
          ctx.fillStyle = '#9898b8';
          ctx.font = '8px Segoe UI, sans-serif';
          ctx.fillText(`${evRate}%`, barX + barW + 4, rowY + 18);

          // Intervention status
          const hasIntervention = ev.intervention && ev.intervention !== 'None';
          ctx.fillStyle = hasIntervention ? '#4ade80' : (evRate >= 70 ? '#f87171' : evRate >= 50 ? '#fbbf24' : '#6ee7b7');
          ctx.font = '9px Segoe UI, sans-serif';
          const statusText = hasIntervention
            ? `✓ ${ev.interventionBy || 'Tutor'}`
            : (evRate >= 70 ? '⚠ High' : evRate >= 50 ? '● Medium' : '● Low');
          ctx.fillText(statusText, tblX + cols[3] + 8, rowY + 18);
        });
      } else {
        const rowY = tblY + 22;
        ctx.fillStyle = 'rgba(50, 50, 130, 0.12)';
        this._roundRectFill(ctx, tblX, rowY, tblW, ROW_H, 6, false, true);
        ctx.fillStyle = '#7878a0';
        ctx.font = 'italic 10px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No confusion events recorded during session', tblX + tblW / 2, rowY + 18);
        ctx.textAlign = 'left';
      }

      // ── Footer: Total confusion time ──
      const totalM = Math.floor(student.totalConfusionSec / 60);
      const totalS = student.totalConfusionSec % 60;
      const totalStr = `${totalM.toString().padStart(2, '0')}:${totalS.toString().padStart(2, '0')}`;
      ctx.fillStyle = '#7878a0';
      ctx.font = '10px Segoe UI, sans-serif';
      ctx.fillText(`Total Confusion Time – ${totalStr} (min:sec)`, cx + CARD_PAD, y + CARD_H - 16);

      // Readings & interventions count on right
      const metaText = `${student.readings.length} readings · ${student.interventions.length} interventions`;
      ctx.textAlign = 'right';
      ctx.fillText(metaText, cx + CARD_W - CARD_PAD, y + CARD_H - 16);
      ctx.textAlign = 'left';

      y += CARD_H + CARD_GAP;
    });

    // ── Footer ──
    ctx.fillStyle = '#50506a';
    ctx.font = '8px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Generated by ConfuSense · ${new Date().toLocaleString()}`, W / 2, y + 10);
    ctx.textAlign = 'left';

    this._downloadCanvasAsPDF(canvas, `ConfuSense_Session_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Fill-only rounded rect with optional top/bottom rounding
  _roundRectFill(ctx, x, y, w, h, r, roundTop = true, roundBottom = true) {
    const rt = roundTop ? r : 0;
    const rb = roundBottom ? r : 0;
    ctx.beginPath();
    ctx.moveTo(x + rt, y);
    ctx.lineTo(x + w - rt, y);
    if (roundTop) {
      ctx.quadraticCurveTo(x + w, y, x + w, y + rt);
    } else {
      ctx.lineTo(x + w, y);
    }
    ctx.lineTo(x + w, y + h - rb);
    if (roundBottom) {
      ctx.quadraticCurveTo(x + w, y + h, x + w - rb, y + h);
    } else {
      ctx.lineTo(x + w, y + h);
    }
    ctx.lineTo(x + rb, y + h);
    if (roundBottom) {
      ctx.quadraticCurveTo(x, y + h, x, y + h - rb);
    } else {
      ctx.lineTo(x, y + h);
    }
    ctx.lineTo(x, y + rt);
    if (roundTop) {
      ctx.quadraticCurveTo(x, y, x + rt, y);
    } else {
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  _downloadCanvasAsPDF(canvas, filename) {
    // High quality JPEG at 3x resolution = crisp output
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const imgBytes = atob(imgData.split(',')[1]);
    const imgArray = new Uint8Array(imgBytes.length);
    for (let i = 0; i < imgBytes.length; i++) imgArray[i] = imgBytes.charCodeAt(i);

    const width = canvas.width;
    const height = canvas.height;
    const pdfW = 595;
    const scale = pdfW / width;
    const pdfH = Math.ceil(height * scale);

    const objects = [];
    let offset = 0;
    const addObj = (content) => {
      objects.push({ offset, content });
      offset += content.length;
      return objects.length;
    };

    let pdf = '%PDF-1.4\n';
    offset = pdf.length;

    const cat = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    addObj(cat); pdf += cat;
    const pages = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    addObj(pages); pdf += pages;
    const page = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Contents 4 0 R /Resources << /XObject << /Img0 5 0 R >> >> >>\nendobj\n`;
    addObj(page); pdf += page;
    const stream = `q ${pdfW} 0 0 ${pdfH} 0 0 cm /Img0 Do Q`;
    const content = `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`;
    addObj(content); pdf += content;
    const imgHeader = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgArray.length} >>\nstream\n`;
    addObj(imgHeader); pdf += imgHeader;

    const textEncoder = new TextEncoder();
    const pdfBefore = textEncoder.encode(pdf);
    const streamEnd = textEncoder.encode('\nendstream\nendobj\n');
    const xrefOffset = pdfBefore.length + imgArray.length + streamEnd.length;
    const xrefStr = `xref\n0 6\n0000000000 65535 f \n` +
      objects.map(o => `${o.offset.toString().padStart(10, '0')} 00000 n `).join('\n') +
      `\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    const xrefBytes = textEncoder.encode(xrefStr);

    const totalLength = pdfBefore.length + imgArray.length + streamEnd.length + xrefBytes.length;
    const finalPdf = new Uint8Array(totalLength);
    finalPdf.set(pdfBefore, 0);
    finalPdf.set(imgArray, pdfBefore.length);
    finalPdf.set(streamEnd, pdfBefore.length + imgArray.length);
    finalPdf.set(xrefBytes, pdfBefore.length + imgArray.length + streamEnd.length);

    const blob = new Blob([finalPdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  _exportSessionCSV() {
    const students = this._getStudentReportData();
    const sessionDuration = this.formatTime(this.sessionTime);
    const lines = [
      ['ConfuSense Session Report'],
      [`Session Date: ${new Date().toLocaleDateString()}`, `Duration: ${sessionDuration}`],
      [],
      ['Student Name', 'Overall Confusion Rate (%)', 'Total Confusion Time (sec)', 'Confusion Events', 'Interventions', 'Readings Logged']
    ];

    students.forEach(s => {
      lines.push([
        s.name,
        s.overallRate,
        s.totalConfusionSec,
        s.events.length,
        s.interventions.length,
        s.readings.length
      ]);
    });

    lines.push([]);
    lines.push(['--- Detailed Confusion Events ---']);
    lines.push(['Student Name', 'Event Time', 'Duration (sec)', 'Confusion Rate (%)', 'Intervention Status', 'Intervened By']);

    students.forEach(s => {
      s.events.forEach(ev => {
        const t = new Date(ev.timestamp);
        const timeStr = t.toLocaleTimeString();
        lines.push([
          s.name,
          timeStr,
          ev.duration || 0,
          ev.rate || 0,
          ev.intervention || 'None',
          ev.interventionBy || ''
        ]);
      });
    });

    lines.push([]);
    lines.push(['--- Raw Session Log (every 10s) ---']);
    lines.push(['Timestamp', 'Student Name', 'Confusion Rate (%)', 'Confirmed', 'Intervention']);

    this.sessionLog.forEach(entry => {
      lines.push([
        new Date(entry.timestamp).toLocaleTimeString(),
        entry.studentName,
        entry.confusionRate,
        entry.confirmed ? 'Yes' : 'No',
        entry.intervention || 'None'
      ]);
    });

    const csv = lines.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ConfuSense_Session_Data_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // ==================== DRAG ====================

  setupDrag(element, handleSelector = null) {
    const handle = handleSelector ? element.querySelector(handleSelector) : element;
    if (!handle) return;

    let isDragging = false;
    let startX, startY, initialX, initialY;

    handle.style.cursor = 'grab';

    // Clamp element position to stay within viewport
    const clampToViewport = () => {
      const rect = element.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = rect.left;
      let top = rect.top;
      let clamped = false;

      if (left + rect.width > vw) { left = vw - rect.width; clamped = true; }
      if (left < 0) { left = 0; clamped = true; }
      if (top + rect.height > vh) { top = vh - rect.height; clamped = true; }
      if (top < 0) { top = 0; clamped = true; }

      if (clamped) {
        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
      }
    };

    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      handle.style.cursor = 'grabbing';
      startX = e.clientX;
      startY = e.clientY;
      const rect = element.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const newLeft = initialX + e.clientX - startX;
      const newTop = initialY + e.clientY - startY;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = element.getBoundingClientRect();
      element.style.left = `${Math.max(0, Math.min(newLeft, vw - rect.width))}px`;
      element.style.top = `${Math.max(0, Math.min(newTop, vh - rect.height))}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        handle.style.cursor = 'grab';
      }
    });

    // Keep widgets visible when window is resized
    window.addEventListener('resize', clampToViewport);
  }

  // ==================== TIMER ====================

  startSessionTimer() {
    this.sessionStartTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      if (this.state.dashboardVisible && !this.state.dashboardMinimized) {
        const timeEl = this.elements.dashboard?.querySelector('#cs-session-time');
        if (timeEl) timeEl.textContent = this.formatTime(this.sessionTime);
      }
    }, 1000);
  }

  // ==================== CLEANUP ====================

  destroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.popupTimeout) clearTimeout(this.popupTimeout);
    if (this.elements.container) this.elements.container.remove();
  }
}

window.ConfuSenseUI = UIInjector;