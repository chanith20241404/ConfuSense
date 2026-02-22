/**
 * ConfuSense Main Content Script — WebSocket Only
 * ================================================
 * Loads Socket.IO from the server itself (not CDN) to avoid CSP issues
 */

class ConfuSenseApp {
  constructor() {
    this.domParser = null;
    this.detector = null;
    this.ui = null;
    this.socket = null;
    
    this.settings = {
      enabled: true,
      role: 'student',
      confusionThreshold: 70,
      sustainedDuration: 20000,
      serverUrl: 'https://confusensetest.onrender.com'
    };
    
    this.state = {
      isInitialized: false,
      isInMeeting: false,
      meetingId: null,
      sessionId: null,
      participants: new Map(),
      activeStudents: new Map(),
      dismissedAlerts: new Set(),
      eventLog: [],
      sessionStartTime: null,
      selfParticipantId: null,
      wasEverHost: false,
      socketConnected: false,
      nameResolved: false,
      hasJoinedRoom: false
    };

    this.cooldowns = new Map();
    this.syncInterval = null;
    this.simulationInterval = null;
    this.nameResolveInterval = null;
  }

  async init() {
    console.log('[ConfuSense] Initializing v4.0.0...');
    
    try {
      await this.loadSettings();
      this.initModules();
      this.setupMessageListeners();
      this.startMeetingDetection();
      
      this.state.isInitialized = true;
      console.log('[ConfuSense] Initialized successfully');
    } catch (error) {
      console.error('[ConfuSense] Initialization error:', error);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['confusenseSettings']);
      if (result.confusenseSettings) {
        this.settings = { ...this.settings, ...result.confusenseSettings };
      }
    } catch (e) {
      console.log('[ConfuSense] Using default settings');
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({ confusenseSettings: this.settings });
    } catch (e) {
      console.error('[ConfuSense] Failed to save settings');
    }
  }

  initModules() {
    // DOM Parser - REQUIRED
    if (window.ConfuSenseDOMParser) {
      this.domParser = new window.ConfuSenseDOMParser();
      this.domParser.setCallbacks({
        onMeetingStart: (data) => this.onMeetingStart(data),
        onMeetingEnd: (data) => this.onMeetingEnd(data),
        onParticipantJoin: (p) => this.onParticipantJoin(p),
        onParticipantLeave: (p) => this.onParticipantLeave(p),
        onHostDetected: (host) => this.onHostDetected(host)
      });
    } else {
      console.error('[ConfuSense] DOM Parser not loaded!');
      return;
    }
    
    // UI Injector - REQUIRED
    if (window.ConfuSenseUI) {
      this.ui = new window.ConfuSenseUI();
      this.ui.setCallbacks({
        onPopupResponse: (confirmed, timeout) => this.onPopupResponse(confirmed, timeout),
        onIntervene: (student) => this.onIntervene(student),
        onDismissAlert: (student, duration) => this.onDismissAlert(student, duration),
        onExportCSV: () => this.exportSessionData(),
        onStudentSelect: (student) => console.log('[ConfuSense] Selected:', student.name),
        onToggleDetection: (enabled) => this.onToggleDetection(enabled)
      });
    } else {
      console.error('[ConfuSense] UI Injector not loaded!');
      return;
    }
    
    // Confusion Detector - OPTIONAL
    if (window.ConfuSenseDetector) {
      try {
        this.detector = new window.ConfuSenseDetector({
          confusionThreshold: this.settings.confusionThreshold,
          sustainedDuration: this.settings.sustainedDuration
        });
        this.detector.onConfusionUpdate = (data) => this.onConfusionUpdate(data);
        this.detector.onConfusionAlert = (data) => this.onConfusionAlert(data);
        console.log('[ConfuSense] Detector module loaded');
      } catch (e) {
        this.detector = null;
      }
    }
  }

  // ==================== WEBSOCKET CONNECTION ====================

  async connectWebSocket() {
    // Socket.IO is bundled with the extension via manifest.json content_scripts
    if (typeof io === 'undefined') {
      console.error('[ConfuSense] Socket.IO not available — library failed to load');
      return false;
    }

    if (this.socket && this.socket.connected) {
      console.log('[ConfuSense] WebSocket already connected');
      return true;
    }
    
    console.log('[ConfuSense] Connecting WebSocket to:', this.settings.serverUrl);
    
    try {
      this.socket = io(this.settings.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      this.socket.on('connect', () => {
        console.log('[ConfuSense] ✓ WebSocket CONNECTED');
        this.state.socketConnected = true;

        // Only join if name is already resolved; otherwise the name resolution loop handles it
        if (this.state.meetingId && this.domParser?.selfInfo?.name) {
          this.joinMeetingRoom();
        }

        // Send any queued status update that failed before connection was ready
        if (this._pendingStatusUpdate !== undefined) {
          console.log('[ConfuSense] Sending queued status update');
          this.sendStatusUpdate(this._pendingStatusUpdate);
          this._pendingStatusUpdate = undefined;
        }
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('[ConfuSense] WebSocket disconnected:', reason);
        this.state.socketConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.warn('[ConfuSense] WebSocket error:', error.message);
      });
      
      this.socket.on('connected', (data) => {
        console.log('[ConfuSense] Server confirmed:', data);
      });
      
      // KEY: When another participant's status changes
      this.socket.on('participant_status_changed', (data) => {
        console.log('[ConfuSense] *** RECEIVED participant_status_changed ***', data);
        this.handleRemoteStatusChange(data);
      });
      
      this.socket.on('participant_joined', (data) => {
        console.log('[ConfuSense] Participant joined via WS:', data);
        this.handleRemoteParticipantJoin(data);
      });
      
      this.socket.on('participant_left', (data) => {
        console.log('[ConfuSense] Participant left via WS:', data);
        this.handleRemoteParticipantLeave(data);
      });
      
      this.socket.on('participants_list', (data) => {
        console.log('[ConfuSense] Received participants list:', data);
        this.handleParticipantsList(data);
      });
      
      this.socket.on('student_confusion_update', (data) => {
        this.handleRemoteConfusionUpdate(data);
      });

      // v4.0: Listen for confirmed confusion (tutor receives this)
      this.socket.on('confusion_confirmed', (data) => {
        this.handleRemoteConfusionConfirmed(data);
      });

      // v4.0: Listen for intervention (student receives this)
      this.socket.on('intervention', (data) => {
        this.handleRemoteIntervention(data);
      });

      return true;
    } catch (error) {
      console.error('[ConfuSense] WebSocket creation failed:', error);
      return false;
    }
  }

  // ==================== WEBSOCKET HELPERS ====================

  joinMeetingRoom() {
    if (!this.socket || !this.socket.connected) return;

    const selfName = this.domParser?.selfInfo?.name;
    if (!selfName) {
      console.log('[ConfuSense] Skipping join — name not yet available, will retry');
      return;
    }

    console.log('[ConfuSense] Joining meeting room:', this.state.meetingId, 'as', selfName);

    this.socket.emit('join_meeting', {
      meeting_id: this.state.meetingId,
      participant_id: this.state.selfParticipantId,
      participant_name: selfName,
      role: this.settings.role,
      detection_enabled: this.settings.enabled
    });
    this.state.hasJoinedRoom = true;
  }

  leaveMeetingRoom() {
    if (!this.socket) return;
    
    const selfName = this.domParser?.selfInfo?.name || 'Unknown';
    
    this.socket.emit('leave_meeting', {
      meeting_id: this.state.meetingId,
      participant_id: this.state.selfParticipantId,
      participant_name: selfName
    });
  }

  // ==================== WEBSOCKET EVENT HANDLERS ====================

  handleRemoteStatusChange(data) {
    const { participant_id, participant_name, detection_enabled } = data;
    
    console.log(`[ConfuSense] Remote status: ${participant_name} -> ${detection_enabled ? 'ON' : 'OFF'}`);
    
    if (this.isTutor()) {
      if (detection_enabled) {
        if (!this.state.activeStudents.has(participant_id)) {
          const student = {
            id: participant_id,
            name: participant_name,
            confusionRate: Math.floor(Math.random() * 40) + 30,
            detectionEnabled: true,
            role: 'student'
          };
          this.state.activeStudents.set(participant_id, student);
          console.log('[ConfuSense] Added student:', participant_name);
        } else {
          const student = this.state.activeStudents.get(participant_id);
          student.detectionEnabled = true;
        }
      } else {
        if (this.state.activeStudents.has(participant_id)) {
          this.state.activeStudents.delete(participant_id);
          console.log('[ConfuSense] *** REMOVED student:', participant_name);
        }
      }
      
      this.ui?.updateDashboard(this.getActiveStudentsArray());
    }
  }

  handleRemoteParticipantJoin(data) {
    const { participant_id, participant_name, role, detection_enabled } = data;
    
    if (participant_id === this.state.selfParticipantId) return;
    if (role === 'tutor') return;
    
    if (this.isTutor() && detection_enabled) {
      const student = {
        id: participant_id,
        name: participant_name,
        confusionRate: Math.floor(Math.random() * 40) + 30,
        detectionEnabled: detection_enabled,
        role: 'student'
      };
      this.state.activeStudents.set(participant_id, student);
      this.ui?.updateDashboard(this.getActiveStudentsArray());
      console.log('[ConfuSense] Student joined (WS):', participant_name);
    }
  }

  handleRemoteParticipantLeave(data) {
    const { participant_id, participant_name } = data;
    
    if (this.isTutor()) {
      this.state.activeStudents.delete(participant_id);
      this.state.participants.delete(participant_id);
      this.ui?.updateDashboard(this.getActiveStudentsArray());
      console.log('[ConfuSense] Student left (WS):', participant_name);
    }
  }

  handleParticipantsList(data) {
    const { participants } = data;
    
    if (this.isTutor()) {
      participants.forEach(p => {
        if (p.role !== 'tutor' && p.detection_enabled && p.participant_id !== this.state.selfParticipantId) {
          const student = {
            id: p.participant_id,
            name: p.participant_name,
            confusionRate: Math.floor(Math.random() * 40) + 30,
            detectionEnabled: p.detection_enabled,
            role: 'student'
          };
          this.state.activeStudents.set(p.participant_id, student);
        }
      });
      this.ui?.updateDashboard(this.getActiveStudentsArray());
    }
  }

  handleRemoteConfusionUpdate(data) {
    const { participant_id, confusion_rate } = data;

    if (this.isTutor() && this.state.activeStudents.has(participant_id)) {
      const student = this.state.activeStudents.get(participant_id);
      student.confusionRate = confusion_rate;
      this.ui?.updateDashboard(this.getActiveStudentsArray());
    }
  }

  handleRemoteConfusionConfirmed(data) {
    const { participant_id, participant_name, confirmed, confusion_rate } = data;
    console.log(`[ConfuSense] Confusion confirmed by ${participant_name}: ${confirmed}`);

    if (this.isTutor() && confirmed) {
      // Update confusion rate if provided
      if (this.state.activeStudents.has(participant_id)) {
        const student = this.state.activeStudents.get(participant_id);
        if (confusion_rate) student.confusionRate = confusion_rate;
      }
      // Mark student as confirmed on dashboard — shows Intervene button
      this.ui?.markStudentConfirmed(participant_id);
    }
  }

  handleRemoteIntervention(data) {
    const { participant_id, tutor_name, cooldown_duration } = data;
    console.log(`[ConfuSense] Intervention by ${tutor_name} for ${participant_id}`);

    // Student side: show notification and start cooldown
    if (this.isStudent() && participant_id === this.state.selfParticipantId) {
      console.log(`[ConfuSense] Tutor ${tutor_name} is helping me — cooldown ${cooldown_duration}ms`);
      this.ui?.hideStudentPopup();
      this.startInterventionCooldown(cooldown_duration || 300000);
    }

    // Tutor side: clear confirmed state
    if (this.isTutor()) {
      this.ui?.clearStudentConfirmed(participant_id);
    }
  }

  startInterventionCooldown(duration) {
    this.state.interventionCooldownUntil = Date.now() + duration;
    console.log(`[ConfuSense] Cooldown active for ${duration / 1000}s`);
  }

  // ==================== SEND STATUS UPDATE ====================

  sendStatusUpdate(enabled) {
    const selfName = this.domParser?.selfInfo?.name;
    if (!selfName) {
      console.log('[ConfuSense] Deferring status — name not yet available');
      return;
    }

    console.log(`[ConfuSense] Sending status: ${enabled ? 'ON' : 'OFF'} as ${selfName}`);

    if (this.socket && this.socket.connected) {
      this.socket.emit('participant_status_update', {
        meeting_id: this.state.meetingId,
        participant_id: this.state.selfParticipantId,
        participant_name: selfName,
        detection_enabled: enabled
      });
      console.log('[ConfuSense] ✓ Status sent via WebSocket');
    } else {
      console.log('[ConfuSense] WebSocket not connected yet — queuing status update');
      this._pendingStatusUpdate = enabled;
    }
  }

  // ==================== ROLE HELPERS ====================

  isTutor() {
    return this.settings.role === 'tutor' || this.state.wasEverHost;
  }

  isStudent() {
    return !this.isTutor();
  }

  isHostParticipant(participant) {
    if (!participant) return false;
    if (participant.isHost) return true;
    
    const hostName = this.domParser?.hostInfo?.name;
    const selfName = this.domParser?.selfInfo?.name;
    
    if (this.isTutor() && selfName && participant.name === selfName) return true;
    if (hostName && participant.name === hostName) return true;
    
    return false;
  }

  // ==================== MESSAGE LISTENERS ====================

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      switch (msg.type) {
        case 'SETTINGS_UPDATE':
          this.updateSettings(msg.settings);
          sendResponse({ success: true });
          break;
        case 'GET_STATE':
          sendResponse({
            isInMeeting: this.state.isInMeeting,
            role: this.settings.role,
            enabled: this.settings.enabled,
            socketConnected: this.state.socketConnected,
            participants: this.getActiveStudentsArray()
          });
          break;
        case 'SET_ROLE':
          this.setRole(msg.role);
          sendResponse({ success: true });
          break;
        default:
          sendResponse({ success: true });
      }
      return true;
    });
  }

  startMeetingDetection() {
    this.domParser?.init();
  }

  updateSettings(newSettings) {
    const wasEnabled = this.settings.enabled;
    const wasRole = this.settings.role;
    
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    if (newSettings.enabled !== undefined && newSettings.enabled !== wasEnabled) {
      this.toggleDetection(newSettings.enabled);
    }
    
    if (newSettings.role !== undefined && newSettings.role !== wasRole) {
      this.setRole(newSettings.role);
    }
  }

  toggleDetection(enabled) {
    this.settings.enabled = enabled;
    
    if (enabled && this.state.isInMeeting && this.settings.role === 'student') {
      if (this.detector) {
        this.startDetection();
      }
    } else if (this.detector) {
      this.detector.stop();
    }
  }

  onToggleDetection(enabled) {
    console.log('[ConfuSense] Student toggled:', enabled);
    this.settings.enabled = enabled;
    this.saveSettings();
    this.sendStatusUpdate(enabled);

    // Start/stop student simulation when toggling detection
    if (this.isStudent()) {
      if (enabled) {
        this.startStudentSimulation();
      } else {
        this.stopStudentSimulation();
      }
    }
  }

  setRole(role) {
    console.log('[ConfuSense] Setting role:', role);
    this.settings.role = role;
    
    if (role === 'tutor') {
      this.state.wasEverHost = true;
    }
    
    this.saveSettings();
    
    if (this.state.isInMeeting) {
      if (role === 'tutor') {
        this.setupTutorUI();
      } else {
        this.setupStudentUI();
      }
    }
  }

  setupTutorUI() {
    console.log('[ConfuSense] Setting up TUTOR UI');
    
    if (this.detector) this.detector.stop();
    
    this.ui?.hideStudentPopup();
    this.ui?.hideStudentStatus();
    
    this.ui?.showDashboard(this.getActiveStudentsArray());

    this.startSimulation();
    this.startSyncInterval();
  }

  setupStudentUI() {
    console.log('[ConfuSense] Setting up STUDENT UI');

    this.ui?.hideDashboard();
    this.ui?.hideTutorAlert();
    this.stopSimulation();
    this.stopSyncInterval();
    this.stopStudentSimulation();

    this.ui?.showStudentStatus(this.settings.enabled);

    if (this.settings.enabled && this.detector) {
      this.startDetection();
    }

    // Start student-side confusion simulation (works alongside or as fallback to real detector)
    if (this.settings.enabled) {
      this.startStudentSimulation();
    }

    // Send initial status
    setTimeout(() => {
      this.sendStatusUpdate(this.settings.enabled);
    }, 1000);
  }

  async startDetection() {
    if (!this.detector) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.style.display = 'none';
      document.body.appendChild(video);
      
      await this.detector.initialize();
      this.detector.start(video);
    } catch (e) {
      console.warn('[ConfuSense] Detection start failed:', e.message);
    }
  }

  // ==================== SIMULATION ====================

  startSimulation() {
    if (this.simulationInterval) return;
    
    this.simulationInterval = setInterval(() => {
      this.state.activeStudents.forEach(student => {
        const change = (Math.random() - 0.5) * 10;
        student.confusionRate = Math.max(0, Math.min(100, (student.confusionRate || 50) + change));
      });
      
      if (this.isTutor()) {
        this.ui?.updateDashboard(this.getActiveStudentsArray());
      }
    }, 3000);
  }

  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  // ==================== STUDENT CONFUSION SIMULATION ====================

  startStudentSimulation() {
    if (this.studentSimInterval) return;
    if (!this.isStudent()) return;

    this.confusionHistory = [];  // rolling window of { timestamp, score }
    this.studentConfusionScore = Math.floor(Math.random() * 40) + 30; // start 30-70

    console.log('[ConfuSense] Starting student confusion simulation');

    this.studentSimInterval = setInterval(() => {
      if (!this.settings.enabled) return;

      // Generate a random confusion score with drift
      const change = (Math.random() - 0.45) * 15; // slight upward bias
      this.studentConfusionScore = Math.max(0, Math.min(100, this.studentConfusionScore + change));
      const score = Math.round(this.studentConfusionScore);
      const now = Date.now();

      // Store in rolling history
      this.confusionHistory.push({ timestamp: now, score });

      // Keep only last 20 seconds of history
      const windowStart = now - 20000;
      this.confusionHistory = this.confusionHistory.filter(e => e.timestamp >= windowStart);

      // Send confusion_update to server so tutor sees the rate
      const selfName = this.domParser?.selfInfo?.name;
      if (selfName && this.socket && this.socket.connected) {
        this.socket.emit('confusion_update', {
          meeting_id: this.state.meetingId,
          participant_id: this.state.selfParticipantId,
          participant_name: selfName,
          confusion_rate: score
        });
      }

      // Calculate 20-second rolling average
      const avg = this.confusionHistory.reduce((sum, e) => sum + e.score, 0) / this.confusionHistory.length;

      // Check if average exceeds threshold (70%) over the 20s window
      // Only trigger if we have enough data points (at least 6 readings ≈ 18 seconds)
      if (avg > 70 && this.confusionHistory.length >= 6) {
        this.triggerConfusionAlert(score, avg);
      }
    }, 3000);
  }

  triggerConfusionAlert(currentScore, average) {
    // Skip if in intervention cooldown
    if (this.state.interventionCooldownUntil && Date.now() < this.state.interventionCooldownUntil) {
      console.log('[ConfuSense] Suppressing alert — intervention cooldown active');
      return;
    }

    // Skip if popup is already showing
    if (this.ui?.state?.popupVisible) return;

    // Skip if alert was recently shown (minimum 30s gap)
    if (this._lastAlertTime && Date.now() - this._lastAlertTime < 30000) return;

    console.log(`[ConfuSense] Confusion alert triggered — avg: ${Math.round(average)}%, current: ${currentScore}%`);
    this._lastAlertTime = Date.now();

    // Store current score for the confirmation event
    this._lastConfusionScore = currentScore;

    this.ui?.showStudentPopup((confirmed, timeout) => {
      this.onPopupResponse(confirmed, timeout);
    });
  }

  stopStudentSimulation() {
    if (this.studentSimInterval) {
      clearInterval(this.studentSimInterval);
      this.studentSimInterval = null;
    }
    this.confusionHistory = [];
  }

  startSyncInterval() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      this.syncParticipantsFromDOM();
    }, 5000);
  }

  stopSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  syncParticipantsFromDOM() {
    if (!this.domParser) return;
    
    const domParticipants = this.domParser.parseAllParticipants();
    
    domParticipants.forEach(p => {
      if (this.isHostParticipant(p)) return;
      
      if (!this.state.participants.has(p.id)) {
        const newParticipant = {
          ...p,
          role: 'student',
          confusionRate: Math.floor(Math.random() * 40) + 30,
          detectionEnabled: true
        };
        this.state.participants.set(p.id, newParticipant);
      }
    });
  }

  // ==================== EVENT HANDLERS ====================

  onMeetingStart(data) {
    console.log('[ConfuSense] Meeting started:', data.meetingId);

    this.state.isInMeeting = true;
    this.state.meetingId = data.meetingId;
    this.state.sessionStartTime = Date.now();
    this.state.nameResolved = false;
    this.state.hasJoinedRoom = false;
    this.state.selfParticipantId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    this.ui?.init();
    this.logEvent('SESSION_START', { meetingId: data.meetingId });

    try {
      chrome.runtime.sendMessage({ type: 'SESSION_START', meetingId: data.meetingId });
    } catch (e) {}

    const isHost = data.self?.isHost || this.domParser?.isSelfHost();
    console.log('[ConfuSense] Am I host?', isHost);

    // Connect WebSocket (non-blocking)
    this.connectWebSocket();

    // Set role and show UI immediately (non-blocking)
    if (isHost) {
      this.setRole('tutor');
    } else {
      this.setRole('student');
    }

    // Start background name resolution — retries until name is found,
    // then joins the room and sends status with the real name
    this.startNameResolution();
  }

  startNameResolution() {
    // If name already available, send immediately
    if (this.domParser?.selfInfo?.name) {
      this.state.nameResolved = true;
      console.log('[ConfuSense] Name already available:', this.domParser.selfInfo.name);
      return;
    }

    console.log('[ConfuSense] Starting background name resolution...');
    let attempts = 0;

    this.nameResolveInterval = setInterval(() => {
      attempts++;
      this.domParser?.identifySelf();

      let name = this.domParser?.selfInfo?.name;

      // Fallback: after 5 failed attempts, try to extract name from video tiles
      if (!name && attempts >= 5) {
        name = this.extractSelfNameFallback();
        if (name) {
          this.domParser._setSelfInfo(name);
          console.log('[ConfuSense] Name found via fallback:', name);
        }
      }

      if (name) {
        console.log('[ConfuSense] ✓ Name resolved on attempt', attempts, ':', name);
        this.state.nameResolved = true;
        clearInterval(this.nameResolveInterval);
        this.nameResolveInterval = null;

        // Now that we have a name, join room and send status
        if (!this.state.hasJoinedRoom) {
          this.joinMeetingRoom();
        }
        if (this.isStudent()) {
          this.sendStatusUpdate(this.settings.enabled);
        }
      } else if (attempts >= 60) {
        console.warn('[ConfuSense] Could not resolve name after 60 attempts');
        clearInterval(this.nameResolveInterval);
        this.nameResolveInterval = null;
      }
    }, 2000);
  }

  /**
   * Fallback name extraction: scrapes name from Google Meet's video tile name labels.
   * Finds the name shown on the self video by looking for name elements
   * that are NOT other known participants and NOT the host.
   */
  extractSelfNameFallback() {
    const nameEls = document.querySelectorAll('[class*="ZjFb7c"], [class*="zWGUib"]');
    const hostName = this.domParser?.hostInfo?.name;
    const knownNames = new Set();

    // Collect known participant names
    this.state.participants.forEach(p => knownNames.add(p.name));
    this.state.activeStudents.forEach(s => knownNames.add(s.name));
    if (hostName) knownNames.add(hostName);

    for (const el of nameEls) {
      const raw = el.textContent?.trim();
      if (!raw || raw.length < 2) continue;

      const name = this.domParser?.cleanName(raw);
      if (!name || name.length < 2) continue;

      // Skip "You" standalone
      if (name === 'You' || name === 'you') continue;
      // Skip known other participants
      if (knownNames.has(name)) continue;
      // Skip host name
      if (name === hostName) continue;

      // This is likely our self name
      console.log('[ConfuSense] Fallback found candidate name:', name);
      return name;
    }

    // Last resort: check all video tiles for any name-like text
    const tiles = document.querySelectorAll('[data-participant-id], [data-requested-participant-id]');
    for (const tile of tiles) {
      const nameEl = tile.querySelector('[class*="ZjFb7c"], [class*="zWGUib"]');
      if (nameEl) {
        const name = this.domParser?.cleanName(nameEl.textContent);
        if (name && name.length >= 2 && name !== 'You' && !knownNames.has(name) && name !== hostName) {
          console.log('[ConfuSense] Fallback found name from tile:', name);
          return name;
        }
      }
    }

    // Guest fallback: look for any visible name element that could be the user
    // Google Meet sometimes shows guest names in tooltip or aria-label on the self video
    const allTiles = document.querySelectorAll('[data-participant-id]');
    for (const tile of allTiles) {
      const ariaLabel = tile.getAttribute('aria-label') || '';
      if (ariaLabel && ariaLabel.length >= 2 && ariaLabel.length < 60) {
        const name = this.domParser?.cleanName(ariaLabel);
        if (name && name.length >= 2 && name !== 'You' && !knownNames.has(name) && name !== hostName) {
          console.log('[ConfuSense] Guest fallback found name from aria-label:', name);
          return name;
        }
      }
    }

    // Last chance: if there are only 2 tiles and we know the other person's name,
    // grab the remaining tile's name
    if (allTiles.length <= 2 && knownNames.size >= 1) {
      for (const tile of allTiles) {
        const nameEl = tile.querySelector('[class*="ZjFb7c"], [class*="zWGUib"]');
        if (nameEl) {
          const raw = nameEl.textContent?.trim();
          const name = this.domParser?.cleanName(raw);
          // Accept even if it's a short name (guest names can be short)
          if (name && name.length >= 1 && name !== 'You' && !knownNames.has(name)) {
            console.log('[ConfuSense] Guest fallback (2-tile): found name:', name);
            return name;
          }
        }
      }
    }

    return null;
  }

  onMeetingEnd(data) {
    console.log('[ConfuSense] Meeting ended');
    
    this.leaveMeetingRoom();
    
    if (this.detector) this.detector.stop();
    
    this.ui?.hideDashboard();
    this.ui?.hideStudentPopup();
    this.ui?.hideTutorAlert();
    this.ui?.hideStudentStatus();
    
    this.stopSimulation();
    this.stopStudentSimulation();
    this.stopSyncInterval();

    if (this.nameResolveInterval) {
      clearInterval(this.nameResolveInterval);
      this.nameResolveInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.logEvent('SESSION_END', {});

    try {
      chrome.runtime.sendMessage({ type: 'SESSION_END' });
    } catch (e) {}

    this.state.isInMeeting = false;
    this.state.sessionId = null;
    this.state.socketConnected = false;
    this.state.nameResolved = false;
    this.state.hasJoinedRoom = false;
    this.state.participants.clear();
    this.state.activeStudents.clear();
    this.state.dismissedAlerts.clear();
  }

  onParticipantJoin(participant) {
    console.log('[ConfuSense] Participant joined (DOM):', participant.name);
    
    if (this.isHostParticipant(participant)) return;
    
    const newParticipant = {
      ...participant,
      role: 'student',
      confusionRate: Math.floor(Math.random() * 60) + 20,
      detectionEnabled: true
    };
    
    this.state.participants.set(participant.id, newParticipant);
    this.logEvent('PARTICIPANT_JOIN', { name: participant.name });
  }

  onParticipantLeave(participant) {
    console.log('[ConfuSense] Participant left (DOM):', participant.name);
    
    this.state.participants.delete(participant.id);
    this.state.activeStudents.delete(participant.id);
    
    if (this.isTutor()) {
      this.ui?.updateDashboard(this.getActiveStudentsArray());
    }
    
    this.logEvent('PARTICIPANT_LEAVE', { name: participant.name });
  }

  onHostDetected(host) {
    console.log('[ConfuSense] Host detected:', host.name);
    
    if (this.domParser?.isSelfHost() && this.settings.role !== 'tutor') {
      this.setRole('tutor');
    }
  }

  onConfusionUpdate(data) {
    if (this.settings.role !== 'student') return;
    const selfName = this.domParser?.selfInfo?.name;
    if (!selfName) return;

    if (this.socket && this.socket.connected) {
      this.socket.emit('confusion_update', {
        meeting_id: this.state.meetingId,
        participant_id: this.state.selfParticipantId,
        participant_name: selfName,
        confusion_rate: data.confusionScore
      });
    }
  }

  onConfusionAlert(data) {
    if (this.settings.role !== 'student') return;

    // v4.0: Skip if in intervention cooldown
    if (this.state.interventionCooldownUntil && Date.now() < this.state.interventionCooldownUntil) {
      console.log('[ConfuSense] Suppressing alert — intervention cooldown active');
      return;
    }

    this.ui?.showStudentPopup((confirmed, timeout) => {
      this.onPopupResponse(confirmed, timeout);
    });
  }

  onPopupResponse(confirmed, timeout) {
    this.logEvent('POPUP_RESPONSE', { confirmed, timeout });

    // v4.0: Emit confusion_confirmed to server
    if (this.socket && this.socket.connected) {
      const selfName = this.domParser?.selfInfo?.name;
      const confusionRate = this.detector?.lastConfusionScore || this._lastConfusionScore || this.studentConfusionScore || 0;
      this.socket.emit('confusion_confirmed', {
        meeting_id: this.state.meetingId,
        participant_id: this.state.selfParticipantId,
        participant_name: selfName || 'Unknown',
        confirmed: confirmed,
        confusion_rate: Math.round(confusionRate)
      });
      console.log(`[ConfuSense] Sent confusion_confirmed: ${confirmed}, rate: ${Math.round(confusionRate)}%`);
    }

    // If student said NO, reset the confusion score downward to avoid re-triggering immediately
    if (!confirmed && this.studentConfusionScore !== undefined) {
      this.studentConfusionScore = Math.max(0, this.studentConfusionScore - 30);
      this.confusionHistory = [];
    }
  }

  onIntervene(student) {
    this.logEvent('INTERVENTION', { studentName: student.name });

    // v4.0: Emit intervention to server
    if (this.socket && this.socket.connected) {
      const selfName = this.domParser?.selfInfo?.name || 'Tutor';
      this.socket.emit('intervention', {
        meeting_id: this.state.meetingId,
        participant_id: student.id,
        tutor_name: selfName,
        cooldown_duration: 300000
      });
      console.log(`[ConfuSense] Sent intervention for ${student.name}`);
    }
  }

  onDismissAlert(student, duration) {
    this.state.dismissedAlerts.add(student.id);
  }

  // ==================== UTILITIES ====================

  getParticipantsArray() {
    return Array.from(this.state.participants.values());
  }

  getActiveStudentsArray() {
    const students = [];
    const hostName = this.domParser?.hostInfo?.name;
    const selfName = this.domParser?.selfInfo?.name;
    
    this.state.activeStudents.forEach(student => {
      if (student.name === hostName) return;
      if (this.isTutor() && student.name === selfName) return;
      if (this.isHostParticipant(student)) return;
      
      students.push(student);
    });
    
    return students.sort((a, b) => (b.confusionRate || 0) - (a.confusionRate || 0));
  }

  logEvent(type, data) {
    this.state.eventLog.push({ type, timestamp: Date.now(), ...data });
  }

  exportSessionData() {
    const students = this.getActiveStudentsArray();
    const sessionDuration = this.state.sessionStartTime
      ? Math.round((Date.now() - this.state.sessionStartTime) / 1000)
      : 0;
    const csv = [
      ['Name', 'Confusion Rate', 'Detection Enabled', 'Session Duration (s)', 'Timestamp'],
      ...students.map(s => [
        s.name,
        Math.round(s.confusionRate || 0),
        s.detectionEnabled ? 'Yes' : 'No',
        sessionDuration,
        new Date().toISOString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `confusense_${this.state.meetingId || 'session'}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.confuSenseApp = new ConfuSenseApp();
    window.confuSenseApp.init();
  });
} else {
  window.confuSenseApp = new ConfuSenseApp();
  window.confuSenseApp.init();
}

// Debug
window.csDebug = {
  getState: () => window.confuSenseApp?.state,
  getSettings: () => window.confuSenseApp?.settings,
  isConnected: () => window.confuSenseApp?.state?.socketConnected,
  showDashboard: () => window.confuSenseApp?.ui?.showDashboard(window.confuSenseApp?.getActiveStudentsArray()),
  showStudentWidget: () => window.confuSenseApp?.ui?.showStudentStatus(true),
  setTutor: () => window.confuSenseApp?.setRole('tutor'),
  setStudent: () => window.confuSenseApp?.setRole('student'),
  testOff: () => window.confuSenseApp?.sendStatusUpdate(false),
  testOn: () => window.confuSenseApp?.sendStatusUpdate(true)
};

console.log('[ConfuSense] Script loaded. Debug: csDebug.getState()');