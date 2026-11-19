// ==========================================================================
// Global Material You Heads-Up Toast (Shadow DOM so host site CSS can't clash)
// ==========================================================================
(() => {
  if (window.__m3ToastInjected) return;
  window.__m3ToastInjected = true;

  let hostEl = null;
  let toastEl = null;
  let hideTimeout = null;

  // Lazily create the Shadow DOM toast container only when needed
  function ensureToastUI() {
    if (hostEl) return;

    hostEl = document.createElement('div');
    hostEl.id = 'm3-global-toast-host';
    hostEl.style.all = 'initial';
    hostEl.style.position = 'fixed';
    hostEl.style.top = '0';
    hostEl.style.left = '0';
    hostEl.style.width = '100%';
    hostEl.style.zIndex = '2147483647';
    hostEl.style.pointerEvents = 'none';

    const shadow = hostEl.attachShadow({ mode: 'open' });

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      .m3-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        width: 92%;
        max-width: 440px;
        background-color: #28302B;
        border: 1px solid rgba(196, 241, 211, 0.18);
        border-radius: 28px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
        font-family: 'Google Sans', 'Segoe UI', Roboto, sans-serif;
        opacity: 1;
        pointer-events: auto;
        transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.1), opacity 0.25s ease;
      }
      .m3-toast.hidden {
        transform: translateX(-50%) translateY(-140%);
        opacity: 0;
        pointer-events: none;
      }
      .toast-content {
        display: flex;
        align-items: center;
        gap: 14px;
        color: #E1E3DF;
        flex: 1;
        min-width: 0;
        cursor: pointer;
      }
      .toast-icon {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background-color: #234E36;
        color: #C4F1D3;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-weight: 700;
        font-size: 16px;
      }
      .toast-icon.whatsapp {
        background-color: #1B5E3A;
        color: #A7F3C6;
      }
      .toast-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .toast-header-line {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12.5px;
        color: #C4F1D3;
        font-weight: 600;
      }
      .toast-sender {
        color: #BFC9C1;
        font-weight: 400;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .toast-subject {
        font-size: 14.5px;
        font-weight: 600;
        color: #E1E3DF;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .toast-close-btn {
        background: transparent;
        border: none;
        color: #BFC9C1;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
      }
      .toast-close-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: #E1E3DF;
      }
    `;

    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.className = 'm3-toast hidden';
    toastEl.setAttribute('role', 'alert');

    const clickArea = document.createElement('div');
    clickArea.id = 'toast-click-area';
    clickArea.className = 'toast-content';

    const iconEl = document.createElement('div');
    iconEl.id = 'toast-icon';
    iconEl.className = 'toast-icon';

    const textBox = document.createElement('div');
    textBox.className = 'toast-text';

    const headerLine = document.createElement('div');
    headerLine.className = 'toast-header-line';

    const appEl = document.createElement('span');
    appEl.id = 'toast-app';

    const dotEl = document.createElement('span');
    dotEl.textContent = '•';

    const senderEl = document.createElement('span');
    senderEl.id = 'toast-sender';
    senderEl.className = 'toast-sender';

    headerLine.append(appEl, dotEl, senderEl);

    const subjectEl = document.createElement('div');
    subjectEl.id = 'toast-subject';
    subjectEl.className = 'toast-subject';

    textBox.append(headerLine, subjectEl);
    clickArea.append(iconEl, textBox);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'toast-close';
    closeBtn.className = 'toast-close-btn';
    closeBtn.title = 'Dismiss';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toastEl.classList.add('hidden');
      clearTimeout(hideTimeout);
    });

    toastEl.append(clickArea, closeBtn);
    shadow.append(styleTag, toastEl);
    document.documentElement.appendChild(hostEl);
  }

  function showToast(payload) {
    ensureToastUI();
    const shadow = hostEl.shadowRoot;

    const appEl = shadow.getElementById('toast-app');
    const senderEl = shadow.getElementById('toast-sender');
    const subjectEl = shadow.getElementById('toast-subject');
    const iconEl = shadow.getElementById('toast-icon');
    const clickArea = shadow.getElementById('toast-click-area');

    const appName = payload.app || 'Notification';
    appEl.textContent = appName;
    senderEl.textContent = payload.sender || '';
    subjectEl.textContent = payload.message || '';
    iconEl.textContent = appName === 'WhatsApp' ? 'W' : 'M';
    iconEl.className = `toast-icon ${appName === 'WhatsApp' ? 'whatsapp' : ''}`;

    clickArea.onclick = () => {
      toastEl.classList.add('hidden');
      if (appName === 'WhatsApp') {
        chrome.runtime.sendMessage({
          type: 'FOCUS_WHATSAPP_TAB',
          tabId: payload.whatsappTabId
        });
      } else if (payload.url) {
        window.open(payload.url, '_blank');
      }
    };

    toastEl.classList.remove('hidden');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 8000);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SHOW_M3_TOAST' && msg.payload) {
      showToast(msg.payload);
    }
  });
})();