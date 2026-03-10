// ConfuSense Main Orchestrator v9.0

class ConfuSenseApp {
  constructor() {
    this.domParser   = null;
    this.videoProc   = null;
    this.ui          = null;
    this.uuid        = null;

    this.settings = {
      enabled:              true,
      serverUrl:            'http://localhost:3000',
      confusionThreshold:   0.60,
      sustainedDurationMs:  20000,
    };

    this.state = {
      role:               'student',
      isInMeeting:        false,
      meetingId:          null,
      selfName:           null,
      sessionStartTime:   null,

      // Student confusion tracking
      confusionStartTime:       null,
      popupShowing:             false,
      popupCooldownUntil:       0,
      totalConfusedMs:          0,
      confusionEvents:          [],
      currentConfusionStart:    null,

      // Tutor state — map of id → studentData
      students: new Map(),
    };

    this.scoreBuffer = [];
    this._pollIntervalId = null;
    this._dashboardPollId = null;

    this._uuidMap = new Map();
    this.disabledStudentNames = new Set();
    this.pendingDetectionStatuses = new Map();
    this._interventionCooldownUntil = 0;
    this._framePauseUntil = 0;
    this._framePauseTimerId = null;
  }

  async post(path, body) {
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'API_FETCH',
        url: `${this.settings.serverUrl}${path}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res?.ok) console.warn('[ConfuSense] POST', path, 'status', res?.status, res?.json || res?.text);
      return res?.ok ? (res?.json ?? null) : null;
    } catch (err) {
      console.warn('[ConfuSense] POST failed:', path, err.message);
      return null;
    }
  }

  async get(path) {
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'API_FETCH',
        url: `${this.settings.serverUrl}${path}`,
        method: 'GET',
      });
      if (!res?.ok) return null;
      return res?.json ?? null;
    } catch {
      return null;
    }
  }

  async init() {
    console.log('[ConfuSense] Initialising v9.0.0');

    const stored = await chrome.storage.local.get(['uuid']);
    this.uuid = stored.uuid;
    if (!this.uuid) {
      console.error('[ConfuSense] No UUID found — extension may need reinstall');
      return;
    }

    await this.loadSettings();

    this.ui = new window.ConfuSenseUI();
    this.ui.setCallbacks({
      onIntervene:         (s) => this.handleIntervene(s),
      onStopIntervention:  (s) => this.handleStopIntervention(s),
      onDismiss:           (s) => this.handleDismiss(s),
      onExportAnalytics:   ()  => this.showAnalyticsOverlay(),
      onToggleDetection:   async (enabled) => {
        this.settings.enabled = enabled;
        chrome.storage.local.set({ confusenseSettings: this.settings });

        if (enabled && this.state.role === 'student' && this.state.isInMeeting) {
          // Start camera without recreating the widget (toggle UI already updated)
          if (!this.videoProc) {
            try {
              this.videoProc = new window.ConfuSenseVideoProcessor();
              this.videoProc.onCameraLost = () => this.handleCameraLost();
              await this.videoProc.start(this.uuid, this.state.meetingId, this.settings.serverUrl);
              console.log('[ConfuSense] Video processing started');
              // Re-apply intervention pause if still active
              if (Date.now() < this._framePauseUntil) {
                this.videoProc.pause();
              }
            } catch (e) {
              console.error('[ConfuSense] Camera access denied:', e.message);
              this.videoProc = null;
              this.settings.enabled = false;
              chrome.storage.local.set({ confusenseSettings: this.settings });
              this.ui.updateStudentStatus(false);
              return;
            }
          }
        } else if (!enabled) {
          if (this.videoProc) { this.videoProc.stop(); this.videoProc = null; }
          this.state.confusionStartTime = null;
          if (this.state.popupShowing) {
            this.ui.hidePopup?.();
            this.state.popupShowing = false;
          }
        }
        // Sync detection status to backend so tutor dashboard shows it
        if (this.state.isInMeeting && this.state.meetingId) {
          this.syncDetectionStatus(enabled);
        }
      }
    });
    this.ui.init();

    this.domParser = new window.ConfuSenseDOMParser();
    this.domParser.setCallbacks({
      onMeetingStart:    (d) => this.onMeetingStart(d),
      onMeetingEnd:      (d) => this.onMeetingEnd(d),
      onParticipantJoin: (p) => this.onParticipantJoin(p),
      onParticipantLeave:(p) => this.onParticipantLeave(p),
      onHostDetected:    (h) => this.onHostDetected(h),
      onHostUpgrade:     ()  => this.onHostUpgrade()
    });

    this.domParser.init();

    chrome.runtime.onMessage.addListener((msg, _, respond) => {
      this.handleExtensionMessage(msg, respond);
      return true;
    });

    console.log('[ConfuSense] Initialised, UUID:', this.uuid.slice(0, 8) + '…');
  }

  async loadSettings() {
    try {
      const res = await chrome.storage.local.get(['confusenseSettings']);
      if (res.confusenseSettings) {
        this.settings = { ...this.settings, ...res.confusenseSettings };
      }
    } catch (e) { /* use defaults */ }
  }

  onMeetingStart(data) {
    console.log('[ConfuSense] Meeting started:', data.meetingId);
    this.state.isInMeeting    = true;
    this.state.meetingId      = data.meetingId;
    this.state.selfName       = data.selfName;
    this.state.sessionStartTime = Date.now();

    this.state.role = data.isHost ? 'tutor' : 'student';
    console.log('[ConfuSense] Role:', this.state.role);

    // Reset popup state so stale cooldowns from previous meetings don't block
    this.state.popupShowing       = false;
    this.state.popupCooldownUntil = 0;
    this.state.confusionStartTime = null;

    this.registerSession();

    // Retry name resolution — DOM parser's selfName is often null at start
    this._nameRetryId = setInterval(() => {
      const name = this.domParser?.getSelfName?.();
      if (name && name !== this.state.selfName) {
        this.state.selfName = name;
        console.log('[ConfuSense] Name resolved, re-registering:', name);
        this.registerSession();
      }
      if (this.state.selfName) {
        clearInterval(this._nameRetryId);
        this._nameRetryId = null;
      }
    }, 1500);

    if (this.state.role === 'student') {
      this.ui.showStudentWidget(this.settings.enabled);
      this.activateStudentMode();
      this.startNotificationPolling();
    } else {
      this.activateTutorMode();
    }
  }

  onMeetingEnd(data) {
    console.log('[ConfuSense] Meeting ended');

    if (this.state.role === 'tutor' && this.state.students.size > 0) {
      console.log('[ConfuSense] Auto-downloading analytics on meeting end...');
      const sessionDurationMs = this.state.sessionStartTime
        ? Date.now() - this.state.sessionStartTime
        : 1;
      const students = this.getStudentsArray().map(s => ({
        name: s.name,
        overallConfusionPct: s.sessionConfusionPct || 0,
        events: (s.confusionEvents || []).map(e => ({
          timestamp:        e.timestamp,
          durationMs:       e.durationMs || 30000,
          confirmationRate: e.confirmationRate || 0.75,
          intervened:       e.intervened || false,
          intervenedAt:     e.intervenedAt || null,
          stoppedAt:        e.stoppedAt || null,
        }))
      }));
      this.downloadCSV(students, sessionDurationMs);
    }

    if (this.videoProc) { this.videoProc.stop(); this.videoProc = null; }
    if (this._nameRetryId) { clearInterval(this._nameRetryId); this._nameRetryId = null; }

    this.stopPolling();
    this.ui.destroy();
    this.ui.init();

    this.state.isInMeeting        = false;
    this.state.students.clear();
    this._uuidMap.clear();
    this.disabledStudentNames.clear();
    this.pendingDetectionStatuses.clear();
    this.state.confusionStartTime = null;
    this.state.popupShowing       = false;
    this._interventionCooldownUntil = 0;
    this._framePauseUntil = 0;
    if (this._framePauseTimerId) { clearTimeout(this._framePauseTimerId); this._framePauseTimerId = null; }
    this.scoreBuffer = [];
  }

  onParticipantJoin(p) {
    if (this.state.role !== 'tutor') return;
    if (this.state.students.has(p.id)) return;

    const existingId = this.findStudentByName(p.name);
    if (existingId) return;

    const nameKey = p.name?.toLowerCase().trim();
    const pending = this.pendingDetectionStatuses.get(nameKey);
    const detectionOn = pending !== undefined ? pending : true; // default ON until server says otherwise
    if (pending !== undefined) this.pendingDetectionStatuses.delete(nameKey);

    // Check if there's a UUID in the map that points to this student name
    // (from server data received before DOM detected them)
    let linkedUuid = null;
    for (const [uuid, localId] of this._uuidMap) {
      if (localId === p.id) { linkedUuid = uuid; break; }
    }

    this.state.students.set(p.id, {
      ...p,
      uuid:                linkedUuid,
      isConfused:          false,
      detectionEnabled:    detectionOn,
      sessionConfusionPct: 0,
      confirmedEvents:     0,
      confusionEvents:     [],
      showAlert:           false,
      alertDismissed:      false,
      dismissedUntil:      0,
    });
    this.ui.updateDashboard(this.getStudentsArray());
  }

  onParticipantLeave(p) {
    if (this.state.role !== 'tutor') return;
    let removedId = null;
    if (this.state.students.has(p.id)) {
      removedId = p.id;
    } else {
      removedId = this.findStudentByName(p.name);
    }
    if (removedId) {
      // Clean UUID map entries pointing to this student
      const student = this.state.students.get(removedId);
      if (student?.uuid) this._uuidMap.delete(student.uuid);
      this.state.students.delete(removedId);
    }
    this.ui.updateDashboard(this.getStudentsArray());
  }

  onHostDetected(h) {
    if (this.state.isInMeeting && this.state.role !== 'tutor') {
      this.upgradeToTutor();
    }
  }

  onHostUpgrade() {
    if (this.state.isInMeeting && this.state.role !== 'tutor') {
      this.upgradeToTutor();
    }
  }

  upgradeToTutor() {
    console.log('[ConfuSense] Host detected — upgrading to tutor role');
    this.state.role = 'tutor';

    if (this.videoProc) { this.videoProc.stop(); this.videoProc = null; }
    this.ui.showStudentWidget?.(false);

    // Re-register as host
    this.registerSession();
    this.activateTutorMode();
  }

  async registerSession() {
    await this.post('/api/sessions/join', {
      uuid:        this.uuid,
      role:        this.state.role === 'tutor' ? 'host' : 'student',
      meetingId:   this.state.meetingId,
      name:        this.state.selfName || undefined,
      detectionOn: this.settings.enabled,
    });
    console.log('[ConfuSense] Session registered');
  }

  async syncDetectionStatus(enabled) {
    if (!this.uuid || !this.state.meetingId) {
      console.warn('[ConfuSense] Cannot sync detection: missing uuid or meetingId');
      return;
    }
    const result = await this.post('/api/sessions/detection', {
      uuid:        this.uuid,
      meetingId:   this.state.meetingId,
      detectionOn: enabled,
    });
    if (result) {
      console.log('[ConfuSense] Detection status synced:', enabled ? 'ON' : 'OFF');
    } else {
      console.warn('[ConfuSense] Failed to sync detection status');
    }
  }

  startNotificationPolling() {
    if (this._pollIntervalId) return;
    this._pollIntervalId = setInterval(() => this.pollNotifications(), 2000);
  }

  startDashboardPolling() {
    if (this._dashboardPollId) return;
    this._dashboardPollId = setInterval(() => this.pollDashboard(), 3000);
    this.pollDashboard();
  }

  stopPolling() {
    if (this._pollIntervalId) { clearInterval(this._pollIntervalId); this._pollIntervalId = null; }
    if (this._dashboardPollId) { clearInterval(this._dashboardPollId); this._dashboardPollId = null; }
  }

  async pollNotifications() {
    if (!this.uuid || !this.state.isInMeeting) return;

    const role = this.state.role === 'tutor' ? 'host' : 'student';
    const data = await this.get(`/api/notifications/${this.uuid}?role=${role}`);
    if (!data?.notifications?.length) return;

    for (const notif of data.notifications) {
      if (notif.type === 'low_engagement' && this.state.role === 'student') {
        if (!this.settings.enabled) continue;
        if (!this.state.popupShowing && Date.now() > this.state.popupCooldownUntil) {
          this.triggerConfusionPopup();
        }
      } else if (notif.type === 'confusion_confirmed' && this.state.role === 'tutor') {
        this.onConfusionNotification(notif.payload);
      } else if (notif.type === 'intervention' && this.state.role === 'student') {
        this.onInterventionReceived(notif.payload);
      } else if (notif.type === 'intervention_stopped' && this.state.role === 'student') {
        this.onInterventionStopped(notif.payload);
      } else if (notif.type === 'student_disengaged' && this.state.role === 'tutor') {
        this.onDisengagementNotification(notif.payload);
      } else if (notif.type === 'detection_status' && this.state.role === 'tutor') {
        this.onDetectionStatus(notif.payload);
      }
    }
  }

  async pollDashboard() {
    if (this.state.role !== 'tutor' || !this.state.meetingId) return;

    const data = await this.get(`/api/dashboard/${this.state.meetingId}`);
    if (!data?.students) return;

    const matchedLocalIds = new Set();

    for (const serverStudent of data.students) {
      let localId = null;

      // 1. Check persistent UUID map
      if (this._uuidMap.has(serverStudent.uuid)) {
        const mapped = this._uuidMap.get(serverStudent.uuid);
        if (this.state.students.has(mapped)) {
          localId = mapped;
        }
      }

      // 2. Match by UUID
      if (!localId) {
        for (const [id, s] of this.state.students) {
          if (s.uuid === serverStudent.uuid) { localId = id; break; }
        }
      }

      // 3. Match by name
      if (!localId && serverStudent.name) {
        const needle = serverStudent.name.toLowerCase().trim();
        for (const [id, s] of this.state.students) {
          if (matchedLocalIds.has(id)) continue;
          const sName = s.name?.toLowerCase().trim();
          if (sName && sName === needle) { localId = id; break; }
        }
        // Fuzzy fallback
