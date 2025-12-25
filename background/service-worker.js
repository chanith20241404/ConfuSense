// ConfuSense Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ConfuSense] Extension installed');
  chrome.storage.local.set({
    confusenseSettings: { enabled: true, role: 'student' }
  });
});
