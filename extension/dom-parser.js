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
    }

    if (this.isInMeeting && !wasInMeeting) {
      console.log('[ConfuSense DOM] Meeting started:', this.meetingId);
      this.identifySelf();
      this.identifyHost();  // Added
      this.parseAllParticipants();
      
      // Check if self is host
      const isHost = this.isSelfHost();
      if (this.selfInfo) {
        this.selfInfo.isHost = isHost;
      }
      
      if (this.callbacks.onMeetingStart) {
        this.callbacks.onMeetingStart({
          meetingId: this.meetingId,
          self: this.selfInfo,
          participants: this.getParticipantsArray()
        });
      }
    } else if (!this.isInMeeting && wasInMeeting) {
      console.log('[ConfuSense DOM] Meeting ended');
      if (this.callbacks.onMeetingEnd) {
        this.callbacks.onMeetingEnd({ meetingId: this.meetingId });
      }
    }

    return this.isInMeeting;
  }

  // ==================== HOST DETECTION ====================

  isSelfHost() {
    // If we were ever host, we stay host
    if (this.wasHost) return true;
    
    // Method 1: Check for host-only controls
    const hostControls = document.querySelector('[aria-label="Host controls"]') ||
                        document.querySelector('[data-tooltip="Host controls"]') ||
                        document.querySelector('[aria-label="End call for everyone"]');
    
    if (hostControls) {
      console.log('[ConfuSense DOM] Host controls found - user is host');
      this.wasHost = true;
      return true;
    }
    
    // Method 2: Check if self has "(Host)" or "(Organizer)" label
    if (this.selfInfo) {
      const selfElements = document.querySelectorAll('[data-self-name], [aria-label*="(You)"]');
      for (const el of selfElements) {
        const text = el.textContent || el.getAttribute('aria-label') || '';
        if (text.includes('(Host)') || text.includes('(Organizer)')) {
          console.log('[ConfuSense DOM] Self has host label');
          this.wasHost = true;
          return true;
        }
      }
    }
    
    return false;
  }

  identifyHost() {
    // Only fire the callback once per meeting
    if (this.hostNotified) return;

    // Look for "(Host)" or "(Organizer)" label in participant list
    const allElements = document.querySelectorAll('*');

    for (const el of allElements) {
      const text = el.textContent || '';

      // Skip if it's about self
      if (text.includes('(You)')) continue;

      // Look for host indicator
      if ((text.includes('(Host)') || text.includes('(Organizer)')) && text.length < 100) {
        const name = this.cleanName(text);
        if (name && name.length > 1 && name.length < 50) {
          this.hostInfo = {
            name: name,
            isHost: true,
            isSelf: false
          };
          this.hostNotified = true;
          console.log('[ConfuSense DOM] Host identified:', this.hostInfo.name);

          if (this.callbacks.onHostDetected) {
            this.callbacks.onHostDetected(this.hostInfo);
          }
          return;
        }
      }
    }

    // If no external host found and we have host controls, we are the host
    if (this.isSelfHost() && this.selfInfo) {
      this.hostInfo = {
        name: this.selfInfo.name,
        isHost: true,
        isSelf: true
      };
      this.hostNotified = true;
      console.log('[ConfuSense DOM] Self is host:', this.hostInfo.name);

      if (this.callbacks.onHostDetected) {
        this.callbacks.onHostDetected(this.hostInfo);
      }
    }
  }

  // ==================== SELF IDENTIFICATION ====================

  identifySelf() {
    // Method 1: data-self-name attribute
    const selfNameEl = document.querySelector('[data-self-name]');
    if (selfNameEl) {
      const name = selfNameEl.getAttribute('data-self-name');
      if (name) {
        this._setSelfInfo(name);
        return;
      }
    }

    // Method 2: aria-label containing "(You)" on any element
    const youElements = document.querySelectorAll('[aria-label*="(You)"]');
    for (const el of youElements) {
      const label = el.getAttribute('aria-label') || '';
      const name = this.cleanName(label);
      if (name && name.length >= 2) {
        this._setSelfInfo(name);
        return;
      }
    }

    // Method 3: Look for "(You)" in participant list items
    const listItems = document.querySelectorAll(this.selectors.participantItem);
    for (const item of listItems) {
      const text = item.textContent || '';
      if (text.includes('(You)')) {
        const name = this.cleanName(text);
        if (name && name.length >= 2) {
          this._setSelfInfo(name);
          return;
        }
      }
    }

    // Method 4: Walk the DOM tree to find the INNERMOST element containing "(You)"
    // This avoids grabbing huge parent textContent
    const treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode: (node) => {
        const text = node.textContent || '';
        return text.includes('(You)') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }}
    );
    let textNode;
    while (textNode = treeWalker.nextNode()) {
      // Get the parent element's direct text
      const parent = textNode.parentElement;
      if (parent) {
        // Use only this element's own text, not children
        const ownText = Array.from(parent.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent)
          .join('');
        if (ownText.includes('(You)')) {
          const name = this.cleanName(ownText);
          if (name && name.length >= 2 && name !== 'You') {
            this._setSelfInfo(name);
            return;
          }
        }
        // Also try the parent's full textContent if it's small
        const fullText = parent.textContent || '';
        if (fullText.includes('(You)') && fullText.length < 100) {
          const name = this.cleanName(fullText);
          if (name && name.length >= 2 && name !== 'You') {
            this._setSelfInfo(name);
            return;
          }
        }
      }
    }

    // Method 5: Guest name input field (guests type their name before joining)
    const nameInputs = document.querySelectorAll('input[type="text"]');
    for (const input of nameInputs) {
      const label = (input.getAttribute('aria-label') || '').toLowerCase();
      if (label.includes('name') || label.includes('your name')) {
        const name = input.value?.trim();
        if (name && name.length >= 2) {
          this._setSelfInfo(name);
          return;
        }
      }
    }

    // Method 6: Google Meet name display classes — find name elements with "(You)" nearby
    const nameEls = document.querySelectorAll('[class*="ZjFb7c"], [class*="zWGUib"]');
    for (const el of nameEls) {
      const text = el.textContent?.trim() || '';
      // Check if this element or a nearby sibling/parent has "(You)"
      const parentText = el.parentElement?.textContent || '';
      if (parentText.includes('(You)') || text.includes('(You)')) {
        const name = this.cleanName(text.includes('(You)') ? text : parentText);
        if (name && name.length >= 2 && name !== 'You') {
          this._setSelfInfo(name);
          return;
        }
      }
    }

    // Method 7: Look for "You" as a standalone text in video tile name labels
    for (const el of nameEls) {
      const text = el.textContent?.trim() || '';
      if (text === 'You' || text === 'you') {
        // This is the self tile but Google doesn't show the full name here
        // Check data attributes on parent tile
        const tile = el.closest('[data-participant-id], [data-requested-participant-id]');
        if (tile) {
          const tileName = tile.getAttribute('data-participant-name') ||
                          tile.getAttribute('aria-label');
          if (tileName) {
            const name = this.cleanName(tileName);
            if (name && name.length >= 2) {
              this._setSelfInfo(name);
              return;
            }
          }
        }
      }
    }

    // Method 8: Guest users — look for the self-view indicator and nearby name
    // Google Meet shows a small "You" badge or microphone icon on the self tile
    const selfIndicators = document.querySelectorAll(
      '[data-self-name], [data-is-self="true"], [data-is-local="true"]'
    );
    for (const indicator of selfIndicators) {
      const tile = indicator.closest('[data-participant-id], [data-requested-participant-id]') || indicator;
      const nameEl = tile.querySelector('[class*="ZjFb7c"], [class*="zWGUib"]');
      if (nameEl) {
        const name = this.cleanName(nameEl.textContent);
        if (name && name.length >= 2 && name !== 'You') {
          this._setSelfInfo(name);
          return;
        }
      }
      // Also check aria-label on the tile itself
      const ariaName = tile.getAttribute('aria-label');
      if (ariaName) {
        const name = this.cleanName(ariaName);
        if (name && name.length >= 2 && name !== 'You') {
          this._setSelfInfo(name);
          return;
