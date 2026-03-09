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
