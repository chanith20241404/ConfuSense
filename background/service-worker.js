// ConfuSense Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ConfuSense] Extension installed');
  chrome.storage.local.set({
    confusenseSettings: { enabled: true, role: 'student' }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SESSION_START') {
    chrome.action.setBadgeText({ tabId: sender.tab?.id, text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#8B5CF6' });
  } else if (msg.type === 'SESSION_END') {
    chrome.action.setBadgeText({ tabId: sender.tab?.id, text: '' });
  }
  sendResponse({ success: true });
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  console.log('[ConfuSense] Tab closed:', tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && !changeInfo.url.includes('meet.google.com')) {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
});