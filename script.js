document.addEventListener('DOMContentLoaded', () => {
  // ========================================================================
  // 0. Configuration & Persistence (localStorage + chrome.storage.local)
  // ========================================================================
  const STORAGE_KEY = 'materials_sjoe_config_v3';
  let config = {
    theme: 'sage',
    mode: 'dark',
    widgetOrder: ['clock', 'calendar', 'keep', 'search', 'apps'],
    widgetStates: {
      clock: { hidden: false, span: 1 },
      weather: { hidden: false, span: 1 },
      calendar: { hidden: false, span: 2 },
      keep: { hidden: false, span: 2 },
      search: { hidden: false, span: 3 },
      apps: { hidden: false, span: 3 }
    },
    customApps: null
  };

  function loadConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        config = { ...config, ...parsed };
        if (parsed.widgetStates) {
          config.widgetStates = { ...config.widgetStates, ...parsed.widgetStates };
        }
      }
    } catch {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        if (res && res[STORAGE_KEY]) {
          const synced = res[STORAGE_KEY];
          config = { ...config, ...synced };
          if (synced.widgetStates) {
            config.widgetStates = { ...config.widgetStates, ...synced.widgetStates };
          }
          applySavedLayout();
          applyTheme(config.theme, config.mode);
          renderApps();
        }
      });
    }
  }

  function saveConfig(patch) {
    config = {
      ...config,
      ...patch,
      widgetStates: patch.widgetStates
        ? { ...config.widgetStates, ...patch.widgetStates }
        : config.widgetStates
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: config }).catch(() => {});
    }
  }

  loadConfig();

  // ========================================================================
  // 1. Live Clock & Date Updater
  // ========================================================================
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');

    if (timeEl) timeEl.textContent = `${hours}:${minutes}`;
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  }
  updateClock();
  setInterval(updateClock, 1000);
  // ========================================================================
  // 1B. Live Google-Style Weather Widget (Aalst, Belgium: 50.9378° N, 4.0410° E)
  // ========================================================================
  const WMO_CODES = {
    0: ['Clear sky', '☀️', '🌙'],
    1: ['Mainly clear', '🌤️', '🌙'],
    2: ['Partly cloudy', '⛅', '☁️'],
    3: ['Overcast', '☁️', '☁️'],
    45: ['Fog', '🌫️', '🌫️'],
    48: ['Rime fog', '🌫️', '🌫️'],
    51: ['Light drizzle', '🌦️', '🌧️'],
    53: ['Drizzle', '🌦️', '🌧️'],
    55: ['Dense drizzle', '🌧️', '🌧️'],
    61: ['Light rain', '🌦️', '🌧️'],
    63: ['Rain', '🌧️', '🌧️'],
    65: ['Heavy rain', '⛈️', '⛈️'],
    71: ['Light snow', '🌨️', '🌨️'],
    73: ['Snow', '❄️', '❄️'],
    75: ['Heavy snow', '❄️', '❄️'],
    80: ['Rain showers', '🌦️', '🌧️'],
    81: ['Showers', '🌧️', '🌧️'],
    82: ['Heavy showers', '⛈️', '⛈️'],
    95: ['Thunderstorm', '⛈️', '⛈️']
  };

  function renderWeatherData(data) {
    const tempEl = document.getElementById('weather-temp');
    const condEl = document.getElementById('weather-condition');
    const iconEl = document.getElementById('weather-icon');
    const hiloEl = document.getElementById('weather-hilo');
    const windEl = document.getElementById('weather-wind');
    if (!tempEl || !data || !data.current) return;

    const code = data.current.weather_code;
    const isDay = data.current.is_day === 1;
    const [label, dayIcon, nightIcon] = WMO_CODES[code] || ['Cloudy', '⛅', '☁️'];

    tempEl.textContent = `${Math.round(data.current.temperature_2m)}°`;
    condEl.textContent = label;
    iconEl.textContent = isDay ? dayIcon : nightIcon;
    windEl.textContent = `Wind ${Math.round(data.current.wind_speed_10m)} km/h`;

    if (data.daily && data.daily.temperature_2m_max && data.daily.temperature_2m_min) {
      const hi = Math.round(data.daily.temperature_2m_max[0]);
      const lo = Math.round(data.daily.temperature_2m_min[0]);
      hiloEl.textContent = `H:${hi}° L:${lo}°`;
    }
  }

  async function updateWeather() {
    const WEATHER_CACHE_KEY = 'materials_sjoe_weather_aalst';
    try {
      const cachedRaw = localStorage.getItem(WEATHER_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        renderWeatherData(cached.data);
        // Refresh at most once every 15 minutes
        if (Date.now() - cached.timestamp < 15 * 60 * 1000) return;
      }
    } catch {}

    try {
      const url =
        'https://api.open-meteo.com/v1/forecast?latitude=50.9378&longitude=4.0410' +
        '&current=temperature_2m,is_day,weather_code,wind_speed_10m' +
        '&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FBrussels&forecast_days=1';
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      renderWeatherData(data);
      try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
      } catch {}
    } catch {}
  }

  updateWeather();

  // ========================================================================
  // 2. App Shortcuts Data & Icon Resolver
  // ========================================================================
  const defaultApps = [
    { name: 'PlayStation', url: 'https://www.playstation.com/nl-be/', icon: 'playstation.com' },
    { name: 'Last.fm', url: 'https://www.last.fm/user/Sjoeken', icon: 'last.fm' },
    { name: 'Spotify', url: 'https://open.spotify.com/', icon: 'open.spotify.com' },
    { name: 'YouTube', url: 'https://www.youtube.com/', icon: 'youtube.com' },
    { name: 'TikTok', url: 'https://www.tiktok.com/', icon: 'tiktok.com' },
    { name: 'Instagram', url: 'https://www.instagram.com/', icon: 'instagram.com' },
    { name: 'Netflix', url: 'https://www.netflix.com/browse', icon: 'netflix.com' },
    { name: 'Gmail', url: 'https://mail.google.com/', icon: 'mail.google.com' },
    { name: 'Messages', url: 'https://messages.google.com/web/conversations', icon: 'messages.google.com' },
    { name: 'WhatsApp', url: 'https://web.whatsapp.com/', icon: 'web.whatsapp.com' },
    { name: 'Drive', url: 'https://drive.google.com/drive/my-drive', icon: 'drive.google.com' },
    { name: 'Calendar', url: 'https://calendar.google.com/calendar/u/0/r?tab=oc', icon: 'calendar.google.com' },
    { name: 'GitHub', url: 'https://github.com/', icon: 'github.com' },
    { name: 'Extension', url: 'chrome-extension://hdpcadigjkbcpnlcpbcohpafiaefanki/index.html#', icon: 'extension-svg' },
    { name: 'KBC Touch', url: 'https://kbctouch.kbc.be/LAE-P/A044/resources/0001/en/authenticated/payments/payment-dashboard/personal/dashboard', icon: 'kbc.be' },
    { name: 'Luminus', url: 'https://secure.luminus.be/nl/klantenzone/', icon: 'luminus.be' },
    { name: 'MyFarys', url: 'https://klant.farys.be/sites/myfarys#Home-Display', icon: 'farys.be' },
    { name: 'ILvA Kalender', url: 'https://afvalkalender.ilva.be/nl/', icon: 'ilva.be' },
    { name: 'Mijn Container', url: 'https://ilva.mijncontainer.be/', icon: 'ilva.be' },
    { name: 'Burgerprofiel', url: 'https://www.burgerprofiel.be/overzicht', icon: 'vlaanderen.be' },
    { name: 'Tax-on-web', url: 'https://eservices.minfin.fgov.be/taxonweb2023/app/citizen/private/taxform/getPds.do', icon: 'financien.belgium.be' },
    { name: 'Calidris', url: 'https://www.socialsecurity.be/citizen/nl/static/applics/calidris/index.htm', icon: 'socialsecurity.be' }
  ];

  function getApps() {
    return Array.isArray(config.customApps) ? config.customApps : [...defaultApps];
  }

  function createAppIconElement(app) {
    const wrapper = document.createElement('div');
    wrapper.className = 'app-icon';

    const fallback = document.createElement('span');
    fallback.className = 'placeholder-icon';
    fallback.textContent = (app.name || '?').slice(0, 2).toUpperCase();

    if (app.icon === 'extension-svg') {
      fallback.textContent = '🧩';
      wrapper.appendChild(fallback);
      return wrapper;
    }

    let imgUrl = '';
    if (app.icon && app.icon.startsWith('http')) {
      imgUrl = app.icon;
    } else {
      let domain = app.icon || app.url;
      if (domain && !domain.startsWith('http')) domain = 'https://' + domain;
      try {
        const hostname = new URL(domain).hostname;
        imgUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=256`;
      } catch {}
    }

    if (imgUrl) {
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = app.name;
      img.loading = 'lazy';
      img.onerror = () => {
        img.remove();
        wrapper.appendChild(fallback);
      };
      wrapper.appendChild(img);
    } else {
      wrapper.appendChild(fallback);
    }

    return wrapper;
  }

  // ========================================================================
  // 3. App Grid Rendering, Pointer Drag-to-Reorder & Modal
  // ========================================================================
  const appGridEl = document.getElementById('app-grid');
  const modalBackdrop = document.getElementById('app-modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const nameInput = document.getElementById('edit-app-name');
  const urlInput = document.getElementById('edit-app-url');
  const iconInput = document.getElementById('edit-app-icon');
  const deleteAppBtn = document.getElementById('delete-app-btn');

  let editingIndex = null;
  let isEditMode = false;
  let appDragState = null;

  function clearAppDragHighlights() {
    appGridEl.querySelectorAll('.app-item').forEach((el) => {
      el.classList.remove('app-dragging', 'app-drag-over');
    });
  }

  function startAppPointerDrag(e, sourceIndex, sourceItem) {
    if (e.button !== 0 || !isEditMode) return;
    e.preventDefault();

    const rect = sourceItem.getBoundingClientRect();
    const ghost = sourceItem.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.zIndex = '1200';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.92';
    ghost.style.transform = 'scale(1.08)';
    document.body.appendChild(ghost);

    sourceItem.classList.add('app-dragging');

    appDragState = {
      sourceIndex,
      sourceItem,
      ghost,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false,
      dropIndex: null
    };

    window.addEventListener('pointermove', onAppPointerMove);
    window.addEventListener('pointerup', onAppPointerUp);
  }

  function onAppPointerMove(e) {
    if (!appDragState) return;
    const dx = e.clientX - appDragState.startX;
    const dy = e.clientY - appDragState.startY;
    if (Math.hypot(dx, dy) > 5) {
      appDragState.hasMoved = true;
    }

    appDragState.ghost.style.left = `${e.clientX - appDragState.offsetX}px`;
    appDragState.ghost.style.top = `${e.clientY - appDragState.offsetY}px`;

    appGridEl.querySelectorAll('.app-item').forEach((el) => el.classList.remove('app-drag-over'));
    appDragState.dropIndex = null;

    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.app-item[data-app-index]');
    if (target) {
      const idx = parseInt(target.dataset.appIndex, 10);
      if (!isNaN(idx) && idx !== appDragState.sourceIndex) {
        target.classList.add('app-drag-over');
        appDragState.dropIndex = idx;
      }
    }
  }

  function onAppPointerUp() {
    if (!appDragState) return;
    const { sourceIndex, dropIndex, hasMoved, ghost } = appDragState;

    ghost.remove();
    clearAppDragHighlights();
    appDragState = null;

    window.removeEventListener('pointermove', onAppPointerMove);
    window.removeEventListener('pointerup', onAppPointerUp);

    if (hasMoved && dropIndex !== null && dropIndex !== sourceIndex) {
      const updated = [...getApps()];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(dropIndex, 0, moved);
      saveConfig({ customApps: updated });
      renderApps();
      return;
    }

    // Treat a click without dragging as opening the app editor modal
    if (!hasMoved && isEditMode) {
      openAppModal(sourceIndex);
    }
  }

  function renderApps() {
    const apps = getApps();
    appGridEl.innerHTML = '';

    apps.forEach((app, index) => {
      const item = document.createElement('a');
      item.href = app.url;
      item.className = 'app-item';
      item.draggable = false;
      item.dataset.appIndex = String(index);

      const iconEl = createAppIconElement(app);

      const labelEl = document.createElement('span');
      labelEl.className = 'app-label';
      labelEl.textContent = app.name;

      const badgeEl = document.createElement('div');
      badgeEl.className = 'app-edit-badge';
      badgeEl.textContent = '✎';

      item.append(iconEl, labelEl, badgeEl);

      item.addEventListener('pointerdown', (e) => {
        if (isEditMode) {
          startAppPointerDrag(e, index, item);
        }
      });

      item.addEventListener('click', (e) => {
        if (isEditMode) {
          e.preventDefault();
          return;
        }
        if (app.url.startsWith('chrome-extension://')) {
          e.preventDefault();
          if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.update({ url: app.url });
          } else {
            window.location.href = app.url;
          }
        }
      });

      appGridEl.appendChild(item);
    });

    if (isEditMode) {
      const addTile = document.createElement('button');
      addTile.type = 'button';
      addTile.className = 'app-item app-add-tile';
      addTile.style.background = 'transparent';
      addTile.style.border = 'none';

      const iconBox = document.createElement('div');
      iconBox.className = 'app-icon';
      iconBox.textContent = '+';

      const label = document.createElement('span');
      label.className = 'app-label';
      label.textContent = 'Add App';

      addTile.append(iconBox, label);
      addTile.addEventListener('click', () => openAppModal(null));
      appGridEl.appendChild(addTile);
    }
  }

  function openAppModal(index = null) {
    editingIndex = index;
    const apps = getApps();

    if (index !== null && apps[index]) {
      modalTitle.textContent = 'Edit Shortcut';
      nameInput.value = apps[index].name;
      urlInput.value = apps[index].url;
      iconInput.value = (apps[index].icon && apps[index].icon !== 'extension-svg') ? apps[index].icon : '';
      deleteAppBtn.classList.remove('hidden');
    } else {
      modalTitle.textContent = 'Add New Shortcut';
      nameInput.value = '';
      urlInput.value = 'https://';
      iconInput.value = '';
      deleteAppBtn.classList.add('hidden');
    }
    modalBackdrop.classList.remove('hidden');
    nameInput.focus();
  }

  document.getElementById('add-app-btn').addEventListener('click', () => openAppModal(null));
  document.getElementById('cancel-modal-btn').addEventListener('click', () => modalBackdrop.classList.add('hidden'));

  document.getElementById('save-app-btn').addEventListener('click', () => {
    const name = nameInput.value.trim() || 'App';
    let url = urlInput.value.trim() || 'https://google.com';
    if (!/^https?:\/\//i.test(url) && !url.startsWith('chrome-extension://')) {
      url = 'https://' + url;
    }
    const icon = iconInput.value.trim();

    const apps = [...getApps()];
    if (editingIndex !== null) {
      apps[editingIndex] = { name, url, icon };
    } else {
      apps.push({ name, url, icon });
    }
    saveConfig({ customApps: apps });
    renderApps();
    modalBackdrop.classList.add('hidden');
  });

  deleteAppBtn.addEventListener('click', () => {
    if (editingIndex !== null) {
      const apps = [...getApps()];
      apps.splice(editingIndex, 1);
      saveConfig({ customApps: apps });
      renderApps();
    }
    modalBackdrop.classList.add('hidden');
  });

  renderApps();

  // ========================================================================
  // 4. Bento Grid Engine: Drag-to-Move, Smooth Drag-to-Resize & Snap Guides
  // ========================================================================
  const gridEl = document.getElementById('widget-grid');
  let draggedWidget = null;
  let resizeData = null;

  const snapOverlay = document.createElement('div');
  snapOverlay.className = 'grid-snap-overlay';
  const snapCols = document.createElement('div');
  snapCols.className = 'snap-columns';
  for (let col = 1; col <= 3; col++) {
    const guide = document.createElement('div');
    guide.className = 'snap-col-guide';
    guide.dataset.col = String(col);
    snapCols.appendChild(guide);
  }
  snapOverlay.appendChild(snapCols);
  document.body.appendChild(snapOverlay);

  function highlightSnapColumns(spanCount) {
    snapOverlay.querySelectorAll('.snap-col-guide').forEach((guide) => {
      const colNum = parseInt(guide.dataset.col, 10);
      guide.classList.toggle('highlighted', colNum <= spanCount);
    });
  }

  function setWidgetSpan(widget, span) {
    const clamped = Math.min(3, Math.max(1, parseInt(span, 10) || 1));
    widget.classList.remove('span-1', 'span-2', 'span-3');
    widget.classList.add(`span-${clamped}`);
    widget.setAttribute('data-span', clamped);
    return clamped;
  }

  function applySavedLayout() {
    if (Array.isArray(config.widgetOrder)) {
      config.widgetOrder.forEach((id) => {
        const el = gridEl.querySelector(`[data-widget-id="${id}"]`);
        if (el) gridEl.appendChild(el);
      });
    }

    const states = config.widgetStates || {};
    gridEl.querySelectorAll('.grid-widget').forEach((w) => {
      const id = w.getAttribute('data-widget-id');
      const st = states[id];
      if (st) {
        w.classList.toggle('hidden', Boolean(st.hidden));
        if (st.span) {
          setWidgetSpan(w, st.span);
        }
      }
    });
    renderWidgetToggleChips();
  }

  function saveLayoutState() {
    const order = Array.from(gridEl.querySelectorAll('.grid-widget')).map((el) =>
      el.getAttribute('data-widget-id')
    );
    const states = {};
    gridEl.querySelectorAll('.grid-widget').forEach((w) => {
      const id = w.getAttribute('data-widget-id');
      states[id] = {
        hidden: w.classList.contains('hidden'),
        span: parseInt(w.getAttribute('data-span'), 10) || 1
      };
    });
    saveConfig({ widgetOrder: order, widgetStates: states });
  }

  gridEl.querySelectorAll('.grid-widget').forEach((widget) => {
    const handle = widget.querySelector('.widget-toolbar');
    if (handle) {
      handle.addEventListener('mousedown', () => {
        if (isEditMode && !resizeData) {
          widget.setAttribute('draggable', 'true');
        }
      });
      handle.addEventListener('mouseup', () => {
        widget.setAttribute('draggable', 'false');
      });
    }

    widget.addEventListener('dragstart', (e) => {
      if (!isEditMode || resizeData || appDragState !== null || e.target.closest('.app-item')) {
        e.preventDefault();
        return;
      }
      draggedWidget = widget;
      e.dataTransfer.effectAllowed = 'move';
      widget.classList.add('dragging');
    });

    widget.addEventListener('dragend', () => {
      widget.classList.remove('dragging');
      widget.setAttribute('draggable', 'false');
      draggedWidget = null;
      saveLayoutState();
    });

    widget.addEventListener('dragover', (e) => {
      if (!isEditMode || !draggedWidget || draggedWidget === widget) return;
      e.preventDefault();
      const rect = widget.getBoundingClientRect();
      if (e.clientX < rect.left + rect.width / 2) {
        gridEl.insertBefore(draggedWidget, widget);
      } else {
        gridEl.insertBefore(draggedWidget, widget.nextSibling);
      }
    });

    const resizeHandle = widget.querySelector('.resize-handle-e');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', (e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        const gridRect = gridEl.getBoundingClientRect();
        const widgetRect = widget.getBoundingClientRect();
        const gap = 24;
        const singleColWidth = (gridRect.width - gap * 2) / 3;
        const maxWidth = gridRect.width;
        const minWidth = singleColWidth;

        const startX = e.clientX;
        const startWidth = widgetRect.width;

        resizeData = {
          widget,
          startX,
          startWidth,
          minWidth,
          maxWidth,
          singleColWidth,
          gap,
          targetSpan: parseInt(widget.getAttribute('data-span'), 10) || 1
        };

        widget.classList.add('resizing');
        widget.style.width = `${startWidth}px`;
        snapOverlay.classList.add('active');
        highlightSnapColumns(resizeData.targetSpan);

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }

    const removeBtn = widget.querySelector('.remove-widget-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        widget.classList.add('hidden');
        saveLayoutState();
        renderWidgetToggleChips();
      });
    }
  });

  function onMouseMove(e) {
    if (!resizeData) return;
    const { widget, startX, startWidth, minWidth, maxWidth, singleColWidth, gap } = resizeData;

    const rawWidth = startWidth + (e.clientX - startX);
    const clampedWidth = Math.min(maxWidth, Math.max(minWidth, rawWidth));
    widget.style.width = `${clampedWidth}px`;

    const approxCols = (clampedWidth + gap) / (singleColWidth + gap);
    const nearestSpan = Math.min(3, Math.max(1, Math.round(approxCols)));
    resizeData.targetSpan = nearestSpan;
    highlightSnapColumns(nearestSpan);
  }

  function onMouseUp() {
    if (resizeData) {
      const { widget, targetSpan } = resizeData;
      widget.classList.remove('resizing');
      widget.style.width = '';
      setWidgetSpan(widget, targetSpan);
      snapOverlay.classList.remove('active');
      snapOverlay.querySelectorAll('.snap-col-guide').forEach((g) => g.classList.remove('highlighted'));
      resizeData = null;
      saveLayoutState();
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  applySavedLayout();

  // ========================================================================
  // 5. Widget Visibility Toggle Chips in Customize Dock
  // ========================================================================
  function renderWidgetToggleChips() {
    const container = document.getElementById('widget-toggle-chips');
    container.innerHTML = '';
    gridEl.querySelectorAll('.grid-widget').forEach((w) => {
      const id = w.getAttribute('data-widget-id');
      const isHidden = w.classList.contains('hidden');
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `m3-chip ${isHidden ? '' : 'active'}`;
      chip.textContent = id.charAt(0).toUpperCase() + id.slice(1);
      chip.addEventListener('click', () => {
        w.classList.toggle('hidden');
        saveLayoutState();
        renderWidgetToggleChips();
      });
      container.appendChild(chip);
    });
  }

  // ========================================================================
  // 6. Theme Palette & Dark/Light Mode Switcher
  // ========================================================================
  const swatches = document.querySelectorAll('.color-swatch');
  const darkBtn = document.getElementById('mode-dark-btn');
  const lightBtn = document.getElementById('mode-light-btn');

  function applyTheme(theme, mode) {
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-mode', mode);
    saveConfig({ theme, mode });

    swatches.forEach((s) => {
      s.classList.toggle('active', s.getAttribute('data-set-theme') === theme);
    });
    darkBtn.classList.toggle('active', mode === 'dark');
    lightBtn.classList.toggle('active', mode === 'light');
  }

  swatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const theme = swatch.getAttribute('data-set-theme');
      const currentMode = document.body.getAttribute('data-mode') || 'dark';
      applyTheme(theme, currentMode);
    });
  });

  darkBtn.addEventListener('click', () => {
    applyTheme(document.body.getAttribute('data-theme') || 'sage', 'dark');
  });

  lightBtn.addEventListener('click', () => {
    applyTheme(document.body.getAttribute('data-theme') || 'sage', 'light');
  });

  applyTheme(config.theme, config.mode);

  // ========================================================================
  // 7. Customize Mode Toggle & Reset
  // ========================================================================
  const toggleBtn = document.getElementById('toggle-customize-btn');
  const drawer = document.getElementById('customize-drawer');
  const fabLabel = document.getElementById('fab-label');

  toggleBtn.addEventListener('click', () => {
    isEditMode = !isEditMode;
    document.body.classList.toggle('editing', isEditMode);
    drawer.classList.toggle('hidden', !isEditMode);
    fabLabel.textContent = isEditMode ? 'Done' : 'Customize';
    renderApps();
  });

  document.getElementById('reset-all-btn').addEventListener('click', () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove([STORAGE_KEY]).catch(() => {});
    }
    location.reload();
  });
});