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
