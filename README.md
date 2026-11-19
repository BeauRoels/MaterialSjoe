# MaterialSjoe

A lightweight, privacy-first **Material You (Material 3)** New Tab dashboard and cross-tab notification Chrome Extension (Manifest V3) built with vanilla HTML, CSS, and JavaScript.

---

## Features

- **Material You Dynamic Theming:** Switch between 5 tonal palettes (*Sage, Pixel Blue, Lavender, Peach, Monochrome*) and **Dark / Light** surface modes with persistent state.
- **Customizable 3-Column Bento Grid:**
  - Toggle widgets on or off from the bottom customization dock.
  - Drag and drop widgets to rearrange your layout.
  - Smooth drag-to-resize right-edge handles with soft snap-point column guides (`1`, `2`, or `3` columns).
- **Built-in Widgets:**
  - **Clock & Date:** Live 24-hour digital clock in a Material 3 primary container pill.
  - **Live Weather:** Local forecast powered by the keyless Open-Meteo API with 15-minute caching and dynamic day/night weather glyphs.
  - **Google Calendar:** Embedded agenda view synced to your Google account.
  - **Google Keep Notes:** Quick-access notes synced with your signed-in Google session.
  - **Google Search Pill:** Clean Material 3 omnibox search bar.
  - **Android-Style App Launcher Grid:** Scrollable squircle shortcut grid with pointer-based drag-to-reorder, custom icon/domain support, automatic monogram fallbacks, and an inline Add/Edit/Delete modal.
- **Cross-Tab Heads-Up Notifications:**
  - **Gmail Poller:** Background service worker checks your active Gmail Atom feed and displays a floating Material You banner across any open tab when new mail arrives.
  - **WhatsApp Web Listener:** Monitors an open `web.whatsapp.com` background tab for incoming messages and surfaces a clickable heads-up toast on your active tab.
- **Zero External Frameworks:** Pure vanilla ES6+, Shadow DOM toast isolation, and `localStorage` + `chrome.storage.local` persistence for instant startup and minimal memory footprint.

---

## Project Structure

```text
MaterialSjoe/
├── manifest.json          # Manifest V3 extension configuration & permissions
├── newtab.html            # Main New Tab dashboard layout & customization modals
├── style.css              # Material 3 design tokens, bento grid, and component styles
├── script.js              # Clock, weather, drag-to-move/resize grid, and app editor logic
├── background.js          # Service worker for Gmail Atom polling & message routing
├── content.js             # Shadow DOM global heads-up notification banner
├── whatsapp_listener.js   # Content script observer for background WhatsApp Web tabs
├── icon.png               # 128x128 extension icon
└── README.md              # Project documentation
```

---

## Installation (Load Unpacked in Chrome)

1. **Download or clone this repository** into a permanent local folder on your computer (do not delete or move the folder after loading it):
   ```bash
   git clone [https://github.com/your-username/MaterialSjoe.git](https://github.com/your-username/MaterialSjoe.git)
   ```
   *(Or click **Code → Download ZIP** on GitHub and extract the folder.)*
2. **Verify your icon file:** Ensure `icon.png` (128×128 PNG) is present in the root of the `MaterialSjoe` folder alongside `manifest.json`.
3. **Open Chrome Extensions:** Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
4. **Enable Developer Mode:** Toggle the **Developer mode** switch **ON** in the top-right corner of the page.
5. **Load the Extension:** Click **Load unpacked** in the top-left toolbar and select your `MaterialSjoe` folder.
6. **Launch:** Open a new tab (`Ctrl + T` on Windows/Linux or `Cmd + T` on macOS). If Chrome asks whether you want to keep changes to your New Tab page, click **Keep it**.

### Updating After Edits
Whenever you modify any file in the `MaterialSjoe` folder:
1. Go back to `chrome://extensions/`.
2. Click the **Reload** (circular arrow) icon on the **MaterialSjoe** card.
3. Refresh any open tabs (such as WhatsApp Web) so updated content scripts take effect.

---

## Usage & Customization

1. Click the **Customize** floating action button in the bottom-right corner to enter edit mode.
2. **Show / Hide Widgets:** Click the widget pills (`Clock`, `Weather`, `Calendar`, `Keep`, `Search`, `Apps`) in the bottom dock or click `✕` on a widget's toolbar to hide it.
3. **Reorder Widgets:** Drag any widget by its top pill toolbar (`⋮⋮`) to swap positions on the grid.
4. **Resize Widgets:** Drag the `↔` handle on the right edge of any widget to preview column snap guides and resize across 1, 2, or 3 columns.
5. **Manage App Shortcuts:**
   - Click any app icon in edit mode to edit its name, destination URL, or custom icon domain/image URL, or to delete it.
   - Click **+ Add App** in the bottom dock (or the `+` tile at the end of the grid) to add new shortcuts.
   - Click and drag any app icon directly over another slot to reorder them.
   - Scroll vertically inside the app launcher grid when you add more rows of apps.
6. **Change Colors & Surface Mode:** Select any of the 5 accent swatches or toggle between **Dark** and **Light** mode in the bottom dock.
7. Click **Done** to exit edit mode (all changes are saved automatically).

---

## Configuration Notes

- **Google Calendar Embed:** To display your personal calendar events in the Calendar widget, open `newtab.html` and set the `src` parameter on `#gcal-iframe` to include your calendar ID / Gmail address (`%40` encoded instead of `@`), e.g.:
  ```html
  src="[https://calendar.google.com/calendar/embed?mode=AGENDA&showTitle=0&showNav=0&showDate=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&hl=en&ctz=Europe%2FBrussels&src=your.email%40gmail.com](https://calendar.google.com/calendar/embed?mode=AGENDA&showTitle=0&showNav=0&showDate=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&hl=en&ctz=Europe%2FBrussels&src=your.email%40gmail.com)"
  ```
- **Weather Location:** Default coordinates in `script.js` (`updateWeather`) are set to Aalst, Belgium (`latitude=50.9378`, `longitude=4.0410`, `timezone=Europe%2FBrussels`). Update those values in `script.js` if you want forecasts for another city.
- **Cross-Tab Notifications:**
  - **Gmail:** Automatically polls `/mail/u/0/feed/atom` using your active browser session—no API key or hardcoded email required.
  - **WhatsApp Web:** Requires `https://web.whatsapp.com/` to be open in a background tab in the same Chrome profile.

---

## Troubleshooting

- **New Tab looks blank or unstyled:** Confirm `newtab.html`, `style.css`, and `script.js` are all directly inside the root folder you selected during **Load unpacked** (not nested inside an extra subfolder).
- **Google Calendar or Google Keep shows a login/403 prompt:** Make sure you are signed into your primary Google account (`/u/0/`) in the same Chrome profile and third-party cookies are not blocked for `google.com`.
- **Resetting Everything:** Open **Customize** and click **Reset Defaults** in the bottom dock to restore the default widgets, theme, and app list.

---

## Privacy & Security

- **Local-First Storage:** All layout configurations, theme preferences, and custom shortcuts are stored locally in your browser (`localStorage` and `chrome.storage.local`).
- **No Third-Party Analytics or Tracking:** Network requests are limited strictly to Google Search, your signed-in Google services (Gmail Atom feed, Calendar, Keep), Google's favicon service, and Open-Meteo for weather forecasts.
- **Isolated Toast Injection:** Cross-tab notifications render inside an isolated Shadow DOM container so host webpage styles cannot interfere with the UI.

---

## License

MIT License — feel free to fork, modify, and customize for your own workflow.
