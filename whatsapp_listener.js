// ==========================================================================
// WhatsApp Web Listener: detects new unread messages when tab is in background
// ==========================================================================
(() => {
  let lastUnreadCount = 0;
  let lastNotifiedKey = '';

  function getUnreadCountFromTitle() {
    const match = document.title.match(/^\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function extractLatestUnreadChat() {
    const pane = document.querySelector('#pane-side');
    if (!pane) return { sender: 'WhatsApp', message: 'New unread message' };

    const badges = pane.querySelectorAll('span[aria-label*="unread"], span[aria-label*="ongelezen"]');
    for (const badge of badges) {
      let row = badge.parentElement;
      for (let i = 0; i < 8 && row; i++) {
        if (row.getAttribute('role') === 'listitem' || row.getAttribute('role') === 'row') {
          break;
        }
        row = row.parentElement;
      }

      if (row) {
        const titleEl = row.querySelector('span[title]');
        const sender = titleEl ? titleEl.getAttribute('title') : 'WhatsApp';

        const textSpans = Array.from(row.querySelectorAll('span[dir="ltr"], span[dir="auto"]'))
          .map((el) => el.textContent.trim())
          .filter((txt) => txt && txt !== sender && !/^\d{1,2}:\d{2}$/.test(txt));

        const message = textSpans.length > 0 ? textSpans[textSpans.length - 1] : 'New message';
        return { sender, message };
      }
    }

    return { sender: 'WhatsApp', message: 'New unread message' };
  }

  function checkWhatsApp() {
    const currentCount = getUnreadCountFromTitle();

    if (currentCount > lastUnreadCount) {
      const latest = extractLatestUnreadChat();
      const key = `${currentCount}|${latest.sender}|${latest.message}`;

      if (key !== lastNotifiedKey) {
        lastNotifiedKey = key;
        chrome.runtime.sendMessage({
          type: 'WHATSAPP_NEW_MESSAGE',
          sender: latest.sender,
          message: latest.message
        }).catch(() => {});
      }
    }

    lastUnreadCount = currentCount;
  }

  const observer = new MutationObserver(() => {
    setTimeout(checkWhatsApp, 500);
  });

  const titleEl = document.querySelector('title');
  if (titleEl) {
    observer.observe(titleEl, { childList: true });
  }

  // Wait for chat sidebar (#pane-side) to mount before observing subtree changes
  const waitForPane = setInterval(() => {
    const pane = document.querySelector('#pane-side');
    if (pane) {
      clearInterval(waitForPane);
      observer.observe(pane, { childList: true, subtree: true });
      lastUnreadCount = getUnreadCountFromTitle();
    }
  }, 2000);

  setInterval(checkWhatsApp, 3000);
})();