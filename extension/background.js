// ConfuSense Service Worker v9.0

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case 'GET_SETTINGS': {
        const data = await chrome.storage.local.get(['confusenseSettings']);
        sendResponse(data.confusenseSettings || {});
        break;
      }

      case 'SAVE_SETTINGS': {
        await chrome.storage.local.set({ confusenseSettings: msg.settings });
        const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATE', settings: msg.settings }).catch(() => {});
        }
        sendResponse({ ok: true });
        break;
      }

      case 'API_FETCH': {
        try {
          const opts = { method: msg.method || 'GET' };
          if (msg.headers) opts.headers = msg.headers;
          if (msg.body) opts.body = msg.body;
          const res = await fetch(msg.url, opts);
          const text = await res.text();
          let json = null;
          try { json = JSON.parse(text); } catch {}
          sendResponse({ ok: res.ok, status: res.status, json, text });
        } catch (err) {
          sendResponse({ ok: false, status: 0, error: err.message });
        }
        break;
      }

      default:
        sendResponse({ ok: false });
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ConfuSense] Extension installed/updated v9.0.0');

  chrome.storage.local.get(['uuid'], ({ uuid }) => {
    if (!uuid) {
      const newUuid = crypto.randomUUID();
      chrome.storage.local.set({ uuid: newUuid });
      console.log('[ConfuSense] UUID generated:', newUuid);
    }
  });

  chrome.storage.local.get(['confusenseSettings'], (data) => {
    if (!data.confusenseSettings) {
      chrome.storage.local.set({
        confusenseSettings: {
          enabled: true,
          serverUrl: 'http://localhost:3000',
          confusionThreshold: 0.60,
          sustainedDurationMs: 20000
        }
      });
    }
  });
});
