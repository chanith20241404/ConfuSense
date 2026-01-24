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
