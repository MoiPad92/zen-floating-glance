// Floating Glance: drag, resize and a keyboard shortcut for Zen's Glance panel.
//
// Zen keeps the finished Glance panel in place with `margin: auto` and
// `transform: none !important` (src/zen/glance/zen-glance.css), so the panel
// is moved with the separate CSS `translate` property and sized through custom
// properties that chrome.css reads. Zen resets the inline width on every
// opening, so the saved geometry is applied again each time the panel
// finishes its animation.
//
// The panel behaves like a floating window: clicking outside it does not
// close it. Only the close button (or the shortcut) does.

const PREF = "floating-glance.";
const OVERLAY = ".browserSidebarContainer.zen-glance-overlay";
const PANEL =
  '.browserSidebarContainer.zen-glance-overlay .browserContainer[has-finished-animation="true"]';
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;

const prefString = (name, fallback) => {
  try {
    return Services.prefs.getStringPref(PREF + name, fallback);
  } catch {
    return fallback;
  }
};
const prefBool = (name) => Services.prefs.getBoolPref(PREF + name, false);

const readGeometry = () => {
  try {
    return JSON.parse(prefString("geometry", "null"));
  } catch {
    return null;
  }
};
const saveGeometry = (g) => Services.prefs.setStringPref(PREF + "geometry", JSON.stringify(g));

const setImportant = (el, prop, value) => el.style.setProperty(prop, value, "important");

// The size goes through custom properties because chrome.css declares the
// width and height with !important in the user origin (userChrome), which
// beats an inline !important. A variable set inline still feeds that rule.
function applyGeometry(panel, g) {
  if (!g) return;
  panel.style.setProperty("--floating-glance-width", `${g.w}px`);
  panel.style.setProperty("--floating-glance-height", `${g.h}px`);
  setImportant(panel, "translate", `${g.x}px ${g.y}px`);
}

function currentGeometry(panel) {
  const rect = panel.getBoundingClientRect();
  const [x = "0", y = "0"] = (panel.style.getPropertyValue("translate") || "0px 0px").split(" ");
  return { w: rect.width, h: rect.height, x: parseFloat(x) || 0, y: parseFloat(y) || 0 };
}

// "Ctrl+Alt+G" -> a matcher for keydown events. An unreadable value falls
// back to the default instead of leaving the shortcut dead.
function parseShortcut(text) {
  const parts = String(text || "").split("+").map((p) => p.trim().toLowerCase()).filter(Boolean);
  const key = parts.pop();
  if (!key) return parseShortcut("Ctrl+Alt+G");
  const mods = new Set(parts);
  return (ev) =>
    ev.key.toLowerCase() === key &&
    ev.ctrlKey === (mods.has("ctrl") || mods.has("control")) &&
    ev.altKey === mods.has("alt") &&
    ev.shiftKey === mods.has("shift") &&
    ev.metaKey === (mods.has("meta") || mods.has("super") || mods.has("cmd"));
}

// Pointer capture keeps the drag alive while the pointer crosses the remote
// page, which would otherwise swallow the move events.
function track(handle, panel, onMove) {
  handle.addEventListener("pointerdown", (down) => {
    if (down.button !== 0) return;
    down.preventDefault();
    down.stopPropagation();
    handle.setPointerCapture(down.pointerId);
    const start = currentGeometry(panel);
    const move = (ev) =>
      applyGeometry(panel, onMove(start, ev.screenX - down.screenX, ev.screenY - down.screenY));
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      saveGeometry(currentGeometry(panel));
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  });
  // Stops the overlay from reading the press as a click outside the panel.
  handle.addEventListener("click", (ev) => ev.stopPropagation());
}

// The resize handle is the bottom-left corner, so the right and top edges
// stay put. The panel is centered vertically, so half the extra height moves
// it down; when it is also centered horizontally, half the extra width moves
// it left.
function resized(start, dx, dy) {
  const w = Math.max(MIN_WIDTH, start.w - dx);
  const h = Math.max(MIN_HEIGHT, start.h + dy);
  const shiftX = prefBool("centered") ? -(w - start.w) / 2 : 0;
  return { w, h, x: start.x + shiftX, y: start.y + (h - start.h) / 2 };
}

function decorate(panel) {
  if (panel.querySelector(":scope > .fg-mover")) {
    applyGeometry(panel, readGeometry());
    return;
  }
  const mover = document.createElement("div");
  mover.className = "fg-mover";
  mover.title = "Drag to move · double-click to reset";
  const resizer = document.createElement("div");
  resizer.className = "fg-resizer";
  resizer.title = "Drag to resize";
  panel.append(mover, resizer);

  track(mover, panel, (s, dx, dy) => ({ ...s, x: s.x + dx, y: s.y + dy }));
  track(resizer, panel, resized);

  mover.addEventListener("dblclick", (ev) => {
    ev.stopPropagation();
    Services.prefs.clearUserPref(PREF + "geometry");
    // width/height/translate are legacy inline properties from older versions.
    for (const prop of [
      "--floating-glance-width",
      "--floating-glance-height",
      "width",
      "height",
      "translate",
    ]) {
      panel.style.removeProperty(prop);
    }
  });

  applyGeometry(panel, readGeometry());
}

function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* Light on purpose: the panel floats over dark and light pages alike. */
    ${PANEL} > .fg-mover {
      position: absolute; top: -20px; left: 30%; width: 40%; height: 14px;
      border-radius: 999px; cursor: grab; z-index: 10;
      background: rgba(255, 255, 255, 0.7);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.4);
    }
    ${PANEL} > .fg-mover:hover { background: rgba(255, 255, 255, 0.95); }
    ${PANEL} > .fg-mover:active { cursor: grabbing; }
    ${PANEL} > .fg-resizer {
      position: absolute; bottom: -12px; left: -12px; width: 22px; height: 22px;
      border-radius: 6px; cursor: nesw-resize; z-index: 10;
      background: rgba(255, 255, 255, 0.7);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.4);
    }
    ${PANEL} > .fg-resizer:hover { background: rgba(255, 255, 255, 0.95); }
  `;
  document.documentElement.appendChild(style);
}

async function shortcutPage() {
  const custom = prefString("url", "").trim();
  if (custom) return custom;
  try {
    return (await Services.search.getDefault()).searchForm || "https://www.google.com";
  } catch {
    return "https://www.google.com";
  }
}

async function toggleGlance() {
  if (document.querySelector(".zen-glance-overlay")) {
    document.getElementById("cmd_zenGlanceClose")?.doCommand();
    return;
  }
  const area = gBrowser.tabpanels.getBoundingClientRect();
  gZenGlanceManager.openGlance({
    url: await shortcutPage(),
    clientX: area.width / 2,
    clientY: area.height / 2,
    width: 1,
    height: 1,
    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
  });
}

function init() {
  if (!window.gZenGlanceManager || !window.gBrowser?.tabpanels) return;
  addStyles();

  // Zen closes Glance when a click lands on the overlay itself. Stop that
  // click before it reaches Zen's listener, so the panel stays open until its
  // own close button (or the shortcut) is used.
  gBrowser.tabpanels.addEventListener(
    "click",
    (ev) => {
      const overlay = document.querySelector(OVERLAY);
      if (overlay && ev.target === overlay) ev.stopImmediatePropagation();
    },
    true
  );

  new MutationObserver(() => {
    const panel = document.querySelector(PANEL);
    if (panel) decorate(panel);
  }).observe(gBrowser.tabpanels, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["has-finished-animation", "class"],
  });

  // Read on every press, so a new shortcut works without a restart.
  window.addEventListener(
    "keydown",
    (ev) => {
      if (!parseShortcut(prefString("shortcut", "Ctrl+Alt+G"))(ev)) return;
      ev.preventDefault();
      ev.stopPropagation();
      toggleGlance();
    },
    true
  );
}

if (document.readyState === "complete") init();
else window.addEventListener("load", init, { once: true });
