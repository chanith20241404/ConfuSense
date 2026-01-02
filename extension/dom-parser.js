/**
 * ConfuSense DOM Parser
 * Extracts participant information from Google Meet's DOM
 * Added: Host detection for tutor/student role assignment
 */

class DOMParser {
  constructor() {
    this.participants = new Map();
    this.selfInfo = null;
    this.hostInfo = null;  // Added for host detection
    this.hostNotified = false;  // Prevent re-firing host callback
    this.meetingId = null;
    this.isInMeeting = false;
    this.wasHost = false;  // Track if we were ever host
    this.observers = [];
    
    this.callbacks = {
      onParticipantJoin: null,
      onParticipantLeave: null,
      onMeetingStart: null,
      onMeetingEnd: null,
      onHostDetected: null  // Added callback
    };
    
    // Google Meet DOM selectors (2024)
    this.selectors = {
      meetingControls: '[data-is-muted], [aria-label*="microphone" i]',
      participantPanel: '[aria-label*="participant" i], [aria-label*="people" i]',
      participantItem: '[role="listitem"]',
      videoTiles: '[data-participant-id], [data-requested-participant-id]',
      nameElements: '[class*="ZjFb7c"], [class*="zWGUib"], [data-self-name]'
    };
  }

  init() {
    console.log('[ConfuSense DOM] Initializing...');
    this.detectMeetingState();
    this.setupObservers();
    this.startPeriodicCheck();
    return this;
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  detectMeetingState() {
    const wasInMeeting = this.isInMeeting;
    
    // Check for meeting indicators
    const hasControls = !!document.querySelector(this.selectors.meetingControls);
    const hasVideoTiles = document.querySelectorAll(this.selectors.videoTiles).length > 0;
    
    this.isInMeeting = hasControls || hasVideoTiles;
    
    // Extract meeting ID from URL
    const urlMatch = window.location.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    if (urlMatch) {
      this.meetingId = urlMatch[1];
