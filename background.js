// ==========================================================================
// MaterialSjoe Background Service Worker
// Polls Gmail Atom feed for the active session and routes WhatsApp alerts
// ==========================================================================

function ensureGmailAlarm() {
  chrome.alarms.get('checkGmailAlarm', (existing) => {
    if (!existing) {
      // 1-minute interval balances timeliness with low CPU/network overhead
      chrome.alarms.create('checkGmailAlarm', { periodInMinutes: 1 });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureGmailAlarm();
  checkNewGmail();
});

chrome.runtime.onStartup.addListener(() => {
  ensureGmailAlarm();
  checkNewGmail();
});

// Re-check when switching tabs so idle service workers stay responsive
chrome.tabs.onActivated.addListener(() => {
  ensureGmailAlarm();
  checkNewGmail();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkGmailAlarm') {
    checkNewGmail();
  }
});

// Send toast payload to active tab(s), skipping restricted internal pages
async function broadcastToActiveTab(payload) {
  try {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      if (tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome://newtab')) {
        continue;
      }
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_M3_TOAST',
        payload
      }).catch(() => {});
    }
  } catch {}
}

// Fetch the Atom feed for the currently signed-in Gmail account (/u/0)
async function checkNewGmail() {
  try {
    const res = await fetch('https://mail.google.com/mail/u/0/feed/atom', {
      credentials: 'include',
      cache: 'no-store'
    });
    if (!res.ok) return;

    const xmlText = await res.text();
    const entryMatch = xmlText.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return;

    const entry = entryMatch[1];
    const idMatch = entry.match(/<id>([^<]+)<\/id>/);
    const titleMatch = entry.match(/<title>([^<]*)<\/title>/);
    const authorMatch = entry.match(/<author>[\s\S]*?<name>([^<]+)<\/name>/);
    const linkMatch = entry.match(/<link[^>]+href="([^"]+)"/);

    if (!idMatch) return;

    const emailId = idMatch[1].trim();
    const decodeEntities = (str) =>
      str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    const subject = titleMatch && titleMatch[1] ? decodeEntities(titleMatch[1]) : '(No subject)';
    const sender = authorMatch && authorMatch[1] ? decodeEntities(authorMatch[1]) : 'New Email';
    const url = linkMatch && linkMatch[1] ? decodeEntities(linkMatch[1]) : 'https://mail.google.com/';

    const stored = await chrome.storage.local.get(['last_seen_gmail_id']);

    // Seed baseline ID on first run without triggering a notification for old mail
    if (!stored.last_seen_gmail_id) {
      await chrome.storage.local.set({ last_seen_gmail_id: emailId });
      return;
    }

    if (emailId !== stored.last_seen_gmail_id) {
      await chrome.storage.local.set({ last_seen_gmail_id: emailId });
      broadcastToActiveTab({
        app: 'Gmail',
        sender,
        message: subject,
        url
      });
    }
  } catch {}
}

// Handle messages from WhatsApp Web listener, test triggers, and tab focus requests
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'WHATSAPP_NEW_MESSAGE') {
    if (!sender.tab || !sender.tab.active) {
      broadcastToActiveTab({
        app: 'WhatsApp',
        sender: msg.sender || 'WhatsApp',
        message: msg.message || 'New message received',
        url: 'https://web.whatsapp.com/',
        whatsappTabId: sender.tab ? sender.tab.id : null
      });
    }
  }

  if (msg.type === 'TEST_M3_TOAST' && msg.payload) {
    broadcastToActiveTab(msg.payload);
  }

  if (msg.type === 'FOCUS_WHATSAPP_TAB') {
    if (msg.tabId) {
      chrome.tabs.update(msg.tabId, { active: true });
    } else {
      chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
        } else {
          chrome.tabs.create({ url: 'https://web.whatsapp.com/' });
        }
      });
    }
  }
});