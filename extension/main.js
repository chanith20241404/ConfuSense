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
