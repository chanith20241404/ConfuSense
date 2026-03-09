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

