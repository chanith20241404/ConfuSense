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
