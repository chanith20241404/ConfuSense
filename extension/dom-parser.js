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

