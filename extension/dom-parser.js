/*
 * ConfuSense DOM Parser — Internal State Edition
 *
 * Reads participant data from Google Meet's internal closure state
 * (window.closure_lm_<hash>), which auto-excludes waiting-room users.
 * Falls back to People-panel DOM scan if the internal state is unavailable.
 * Role detection uses stable aria-labels (not obfuscated class names).
 */

(function () {
  'use strict';

  const TAG = '[DOM Parser]';
  const MIN_NAME_LEN = 2;
  const MAX_NAME_LEN = 80;

  // Host-only aria-labels used for role detection
  const HOST_ONLY_ARIA = [
    'End call for everyone',
    'Host controls',
    'Mute all',
    'Breakout rooms',
    'Safety',               // Safety controls — host-only in some versions
  ];

  const EXCLUDE_MARKERS = ['(you)', '(host)', '(organizer)', '(organiser)',
                           '(co-host)', '(cohost)', '(presenter)'];

  const JUNK_WORDS = new Set([
    'microphone', 'camera', 'devices', 'pin', 'unpin', 'mute', 'unmute',
    'remove', 'more', 'options', 'present', 'presentation', 'screen',
    'sharing', 'shared', 'hand', 'raised', 'lower', 'admit', 'deny',
    'waiting', 'join', 'ask', 'everyone', 'controls', 'host', 'organizer',
    'co-host', 'you', 'open', 'the', 'panel', 'people',
  ]);

  const UI_ARTIFACT_PHRASES = [
    'open the people panel', 'open people panel', 'people panel',
    'close people panel', 'open chat', 'close chat',
    'meeting details', 'meeting info', 'activities',
    'turn on captions', 'turn off captions',
    'more actions', 'present now', 'raise hand',
    'host controls', 'breakout rooms',
  ];

  function log(...args)  { console.log(TAG, ...args); }
  function warn(...args) { console.warn(TAG, ...args); }

  // Extract participant name from a DOM element (tries tooltip → leaf text → fallback)
  function nameTextFromEl(el) {
    // 1. data-tooltip — skip tooltips that are UI actions
    const tooltipBlocklist = ['mute', 'remove', 'more', 'open', 'close',
                              'turn', 'pin', 'panel', 'chat', 'present',
                              'send', 'raise', 'lower', 'admit', 'deny'];
    function isNameTooltip(tt) {
      if (!tt || tt.length < MIN_NAME_LEN) return false;
      const lc = tt.toLowerCase();
      return !tooltipBlocklist.some(w => lc.includes(w));
    }

    const tooltip = el.getAttribute('data-tooltip');
    if (isNameTooltip(tooltip)) return tooltip;

    for (const child of el.querySelectorAll('[data-tooltip]')) {
      const tt = child.getAttribute('data-tooltip');
      if (isNameTooltip(tt)) return tt;
    }

    // 2. First leaf text container
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        const tag = node.tagName;
        if (tag === 'BUTTON' || tag === 'SVG' || tag === 'IMG') return NodeFilter.FILTER_REJECT;
        if (node.getAttribute('role') === 'button') return NodeFilter.FILTER_REJECT;
        // Accept if this element has text content and no interactive children
        if ((tag === 'SPAN' || tag === 'DIV') && node.textContent.trim().length >= MIN_NAME_LEN) {
          const hasInteractive = node.querySelector('button, svg, [role="button"], [data-iml]');
          if (!hasInteractive) return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    });
    const firstTextEl = walker.nextNode();
    if (firstTextEl) {
      const t = firstTextEl.textContent.trim();
      if (t.length >= MIN_NAME_LEN) return t;
    }

    // 3. Fallback — first text node outside interactive elements
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('button, svg, img, [role="button"], [role="img"], [data-iml]'))
          return NodeFilter.FILTER_REJECT;
        return (node.textContent.trim().length > 0)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      }
    });
    const firstText = tw.nextNode();
    return firstText ? firstText.textContent.trim() : (el.textContent || '');
  }

  // Clean a raw string into a participant name
  function cleanName(raw) {
    if (!raw || typeof raw !== 'string') return '';

    let s = raw;

    // Strip role markers
    for (const m of EXCLUDE_MARKERS) {
      s = s.replace(new RegExp(m.replace(/[()?]/g, '\\$&'), 'gi'), '');
    }

    s = s.split(/\s+/)
         .filter(w => !JUNK_WORDS.has(w.toLowerCase()))
         .join(' ')
         .trim();

    // Keep only printable letters, spaces, hyphens, apostrophes
    s = s.replace(/[^\p{L}\p{M}\s\-'.]/gu, '').replace(/\s{2,}/g, ' ').trim();

    if (s.length < MIN_NAME_LEN || s.length > MAX_NAME_LEN) return '';

    if (UI_ARTIFACT_PHRASES.includes(s.toLowerCase())) return '';

    return s;
  }

  function hasExcludeMarker(raw) {
    const lc = (raw || '').toLowerCase();
    return EXCLUDE_MARKERS.some(m => lc.includes(m));
  }

  // ── Internal state extraction ──
  // Walks window.closure_lm_<hash> to find participant records keyed by ["spaces/..."]
  let _cachedPath = null;   // array of property keys from closure root → container
  let _cachedRoot = null;   // the closure root object the path was found on

  function followCachedPath(root) {
    if (!_cachedPath || _cachedRoot !== root) return null;
    let cur = root;
    try {
      for (const key of _cachedPath) {
        cur = cur[key];
        if (cur === null || cur === undefined || typeof cur !== 'object') return null;
      }
      // Validate: first key should still start with '["spaces/'
      const firstKey = Object.keys(cur)[0];
      if (firstKey && firstKey.startsWith('["spaces/')) return Object.values(cur);
    } catch (e) { /* path stale */ }
    return null;
  }

  function findParticipantRecords(obj, depth = 0, maxDepth = 8, seen = null, path = null) {
    if (depth > maxDepth) return null;
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return null;
    if (obj === window || obj === document) return null;
    if (obj instanceof Node) return null;

    // Prevent revisiting the same object (cycles / shared refs)
    if (!seen) seen = new WeakSet();
    if (seen.has(obj)) return null;
    seen.add(obj);

    if (!path) path = [];

    let keys;
    try {
      keys = Object.keys(obj);
    } catch (e) {
      return null;
    }

    for (const prop of keys) {
      if (prop.startsWith('["spaces/')) {
        // Cache the path for fast future lookups
        _cachedPath = path.slice();
        _cachedRoot = null; // set by caller
        return Object.values(obj);
      }

      let val;
      try { val = obj[prop]; } catch (e) { continue; }
      if (val === null || val === undefined || typeof val !== 'object') continue;

      path.push(prop);
      const found = findParticipantRecords(val, depth + 1, maxDepth, seen, path);
      if (found !== null) return found;
      path.pop();
    }

    return null;
  }

  function extractNameFromRecord(record) {
    if (!record || typeof record !== 'object') return null;

    for (const prop of Object.keys(record)) {
      const val = record[prop];
      // Pattern: val is an array/object where val[1] is a non-empty string
      if (val && typeof val === 'object' && typeof val[1] === 'string' && val[1].length > 0) {
        return val[1];
      }
    }
    return null;
  }

  function getParticipantNamesFromState() {
    try {
      // Find the closure root
      const closureEntry = Object.entries(window).find(
        ([k]) => k.startsWith('closure_lm_')
      );
      if (!closureEntry) return null;

      const rootState = closureEntry[1];

      // Fast path: use cached path from previous successful lookup
      let records = followCachedPath(rootState);

      // Slow path: full DFS (only runs once, or when path goes stale)
      if (!records) {
        records = findParticipantRecords(rootState);
        if (records) _cachedRoot = rootState; // bind cache to this root
      }

      if (!records || records.length === 0) return null;

      const names = [];
      for (const record of records) {
        const name = extractNameFromRecord(record);
        if (name && !names.includes(name)) {
          names.push(name);
        }
      }

      return names.length > 0 ? names : null;

    } catch (e) {
      warn('Internal state read failed:', e.message);
      // Invalidate cache on error
      _cachedPath = null;
      _cachedRoot = null;
      return null;
    }
  }

  // ── Host & self detection ──

  function detectIsHost() {
    for (const label of HOST_ONLY_ARIA) {
      if (document.querySelector(`[aria-label*="${label}"]`) ||
          document.querySelector(`[data-tooltip*="${label}"]`)) {
        return true;
      }
    }
    return false;
  }

  function detectSelfName() {
    // 1. data-self-name attribute
    const selfAttr = document.querySelector('[data-self-name]');
    if (selfAttr) {
      const n = (selfAttr.getAttribute('data-self-name') || '').trim();
      if (n.length >= MIN_NAME_LEN) return n;
    }

    // 2. data-is-local tile
    const localTile = document.querySelector('[data-participant-id][data-is-local="true"]');
    if (localTile) {
      const n = cleanName(nameTextFromEl(localTile));
      if (n) return n;
    }

    // 3. Any tile whose text includes "(You)"
    for (const tile of document.querySelectorAll('[data-participant-id]')) {
      if (tile.textContent.includes('(You)')) {
        const n = cleanName(nameTextFromEl(tile).replace(/\(You\)/gi, ''));
        if (n) return n;
      }
    }

    // 4. People panel row with "(You)"
    for (const row of document.querySelectorAll('[role="listitem"]')) {
      if (row.textContent.includes('(You)')) {
        const n = cleanName(nameTextFromEl(row).replace(/\(You\)/gi, ''));
        if (n) return n;
      }
    }

    return null;
  }

  function detectHostName() {
    for (const row of document.querySelectorAll('[role="listitem"]')) {
      const t = row.textContent;
      if (t.includes('(Host)') || t.includes('(Organizer)') || t.includes('(Organiser)')) {
        const n = cleanName(nameTextFromEl(row));
        if (n) return n;
      }
    }

    // Check video tiles too
    for (const tile of document.querySelectorAll('[data-participant-id]')) {
      const t = tile.textContent;
      if (t.includes('(Host)') || t.includes('(Organizer)') || t.includes('(Organiser)')) {
        const n = cleanName(nameTextFromEl(tile));
        if (n) return n;
      }
    }

    return null;
  }

  // ── DOM fallback — People Panel scanner ──

  function getParticipantNamesFromDOM() {
    const names = [];

    // Find the People panel
    const panelSelectors = [
      '[aria-label="People"]',
      '[aria-label*="participants" i]',
      '[aria-label*="people" i]',
    ];

    let panel = null;
    for (const sel of panelSelectors) {
      panel = document.querySelector(sel);
      if (panel) break;
    }

    if (!panel) return names;

    let inWaitingSection = false;

    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();

    while (node) {
      const el = node;

      // Section headings separate "In the meeting" from "Waiting to join"
      const isHeading = el.getAttribute('role') === 'heading' ||
                        ['H1','H2','H3','H4'].includes(el.tagName);

      if (isHeading) {
        const headingText = el.textContent.toLowerCase();
        if (headingText.includes('waiting')) {
          inWaitingSection = true;
        } else if (headingText.includes('in the meeting') || headingText.includes('in meeting')) {
          inWaitingSection = false;
        }
        node = walker.nextNode();
        continue;
      }

      if (el.getAttribute('role') !== 'listitem') {
        node = walker.nextNode();
        continue;
      }

      if (inWaitingSection) {
        node = walker.nextNode();
        continue;
      }

      const rawText = nameTextFromEl(el) || '';

      if (hasExcludeMarker(rawText)) {
        node = walker.nextNode();
        continue;
      }

      const lc = rawText.toLowerCase();
      if (lc.includes('waiting') || lc.includes('admit') || lc.includes('deny')) {
        node = walker.nextNode();
        continue;
      }

      const name = cleanName(rawText);
      if (name && !names.includes(name)) {
        names.push(name);
      }

      node = walker.nextNode();
    }

    return names;
  }

  // ── In-meeting detection ──

  const IN_MEETING_SIGNALS = [
    '[data-is-muted]',                              // mic button attribute
    'button[aria-label*="microphone" i]',
    'button[aria-label*="Leave call" i]',
    '[data-tooltip*="Leave call" i]',
    '[jsname="CQylAd"]',                            // Leave button (stable jsname)
  ];

  const PRE_JOIN_SIGNALS = [
    'button[jsname="Qx7uuf"]',                     // "Join now" button
    '[aria-label*="Join now" i]',
    '[aria-label*="Ask to join" i]',
  ];

  function hasMeetingUrl() {
    return /\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(window.location.pathname);
  }

  function hasControls() {
    return IN_MEETING_SIGNALS.some(s => document.querySelector(s));
  }

  function hasPreJoin() {
    return PRE_JOIN_SIGNALS.some(s => document.querySelector(s));
  }

  function isInMeeting() {
    if (!hasMeetingUrl()) return false;
    if (!hasControls()) return false;
    return !hasPreJoin();
  }

  function getMeetingId() {
    const m = window.location.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    return m ? m[1] : `meet_${Date.now()}`;
  }

  // ── Main parser class ──

  class ConfuSenseDOMParser {
    constructor() {
      this.callbacks     = {};
      this.participants  = new Map();   // id → { id, name, role, joinedAt }
      this.selfInfo      = { name: null, isHost: false };
      this.hostName      = null;
      this.inMeeting     = false;
      this.meetingId     = null;
      this._pollTimer    = null;
    }

    setCallbacks(cbs) { this.callbacks = { ...this.callbacks, ...cbs }; }

    init() {
      log('Starting (Internal State Edition)');
      this._tick();
      // Poll every 1s — fast enough to catch joins/leaves promptly
      this._pollTimer = setInterval(() => this._tick(), 1000);
    }

    destroy() {
      clearInterval(this._pollTimer);
      _cachedPath = null;
      _cachedRoot = null;
    }

    isSelfHost()  { return this.selfInfo.isHost; }
    getSelfName() { return this.selfInfo.name; }

    _tick() {
      if (!this.inMeeting) {
        if (isInMeeting()) {
          this.inMeeting = true;
          this.meetingId = getMeetingId();
          this._resolveSelfAndHost();
          this._scanParticipants();
          log(`Entered meeting: ${this.meetingId}`);
          this.callbacks.onMeetingStart?.({
            meetingId: this.meetingId,
            selfName:  this.selfInfo.name,
            isHost:    this.selfInfo.isHost,
          });
        }
        return;
      }

      // Only exit on hard signals (URL change or pre-join reappears)
      if (!hasMeetingUrl() || hasPreJoin()) {
        this.inMeeting = false;
        const id = this.meetingId;
        this.participants.clear();
        this.meetingId = null;
        this.hostName  = null;
        log('Meeting ended');
        this.callbacks.onMeetingEnd?.({ meetingId: id });
        return;
      }

      if (!this.selfInfo.name) this._resolveSelfAndHost();

      if (!this.selfInfo.isHost && detectIsHost()) {
        this.selfInfo.isHost = true;
        log('Host detected late — upgrading role');
        this.callbacks.onHostDetected?.({ name: this.selfInfo.name });
        this.callbacks.onHostUpgrade?.({ name: this.selfInfo.name });
      }

      this._scanParticipants();
    }

    _resolveSelfAndHost() {
      this.selfInfo.name   = detectSelfName();
      this.selfInfo.isHost = detectIsHost();
      this.hostName        = detectHostName() || this.selfInfo.name;

      if (this.selfInfo.name) {
        log(`Self="${this.selfInfo.name}" isHost=${this.selfInfo.isHost}`);
        if (this.selfInfo.isHost) {
          this.callbacks.onHostDetected?.({ name: this.selfInfo.name });
        }
      }
    }

    _scanParticipants() {
      let rawNames = getParticipantNamesFromState();
      const source  = rawNames ? 'state' : 'DOM';

      if (!rawNames) {
        rawNames = getParticipantNamesFromDOM();
        if (rawNames.length > 0 && !this._loggedDomFallback) {
          this._loggedDomFallback = true;
          log(`Using DOM fallback (${rawNames.length} names)`);
        }
      } else {
        this._loggedDomFallback = false;
      }

      if (!rawNames || rawNames.length === 0) return;

      const studentNames = rawNames
        .map(n => cleanName(n))
        .filter(n => n.length >= MIN_NAME_LEN)
        .filter(n => !hasExcludeMarker(n))
        .filter(n => !this._isSelf(n))
        .filter(n => !this._isHost(n));

      const currentIds = new Set();

      for (const name of studentNames) {
        const id = `student_${name.toLowerCase().replace(/\s+/g, '_')}`;
        currentIds.add(id);

        if (!this.participants.has(id)) {
          const p = { id, name, role: 'student', joinedAt: Date.now() };
          this.participants.set(id, p);
          log(`JOIN (${source}): "${name}"`);
          this.callbacks.onParticipantJoin?.(p);
        }
      }

      for (const [id, p] of this.participants) {
        if (!currentIds.has(id)) {
          this.participants.delete(id);
          log(`LEAVE: "${p.name}"`);
          this.callbacks.onParticipantLeave?.(p);
        }
      }
    }

    _isSelf(name) {
      if (!this.selfInfo.name) return false;
      return name.trim().toLowerCase() === this.selfInfo.name.trim().toLowerCase();
    }

    _isHost(name) {
      if (!name) return false;
      const lc = name.trim().toLowerCase();

      // If we detected a host name from the "(Host)" DOM marker, filter that name
      if (this.hostName && lc === this.hostName.trim().toLowerCase()) return true;

      return false;
    }
  }

  window.ConfuSenseDOMParser = ConfuSenseDOMParser;
  log('Loaded (Internal State Edition)');

})();
