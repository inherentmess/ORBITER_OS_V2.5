const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.content-section');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const fullscreenToggleBtn = document.getElementById('fullscreenToggleBtn');
const readableModeBtn = document.getElementById('readableModeBtn');
const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
const themeAccentSelect = document.getElementById('themeAccentSelect');

function detectEmbedMode() {
  if (window.ORBITER_EMBED_MODE) return true;
  try {
    const value = (new URLSearchParams(window.location.search).get('embed') || '').toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
  } catch {
    return false;
  }
}

const EMBED_MODE = detectEmbedMode();
const FULLSCREEN_PREF_KEY = 'orbiterFullscreenPreferred';
const READABLE_MODE_KEY = 'orbiterReadableMode';
const SIDEBAR_COLLAPSED_KEY = 'orbiterSidebarCollapsed';
const ACCENT_THEME_KEY = 'orbiterAccentTheme';
const NAV_ORDER_KEY = 'orbiterNavOrder';
const MOVABLE_NAV_SECTIONS = ['dashboard', 'trackers', 'market'];
const STATIC_NAV_SECTIONS = ['codex'];
const PINNED_NAV_SECTION = 'arsenal';

function isFullscreenActive() {
  return Boolean(
    document.fullscreenElement
    || document.webkitFullscreenElement
    || document.msFullscreenElement
  );
}

function readFullscreenPreference() {
  return localStorage.getItem(FULLSCREEN_PREF_KEY) === 'true';
}

function writeFullscreenPreference(value) {
  localStorage.setItem(FULLSCREEN_PREF_KEY, value ? 'true' : 'false');
}

function updateFullscreenToggleUi() {
  if (!fullscreenToggleBtn) return;
  const active = isFullscreenActive();
  const preferred = readFullscreenPreference();
  fullscreenToggleBtn.textContent = active ? 'Exit Fullscreen' : 'Fullscreen';
  fullscreenToggleBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
  fullscreenToggleBtn.setAttribute('aria-label', active ? 'Exit Fullscreen' : 'Fullscreen');
  fullscreenToggleBtn.setAttribute('title', preferred && !active ? 'Fullscreen preferred (click to enter)' : (active ? 'Exit Fullscreen' : 'Fullscreen'));
}

function readReadableModePreference() {
  return localStorage.getItem(READABLE_MODE_KEY) === '1';
}

function readSidebarCollapsedPreference() {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
}

function readAccentThemePreference() {
  const raw = String(localStorage.getItem(ACCENT_THEME_KEY) || 'green').toLowerCase().trim();
  if (raw === 'red' || raw === 'yellow' || raw === 'blue' || raw === 'green') return raw;
  return 'green';
}

function applyReadableMode(enabled) {
  document.body.classList.toggle('readable-mode', Boolean(enabled));
  localStorage.setItem(READABLE_MODE_KEY, enabled ? '1' : '0');
  if (!readableModeBtn) return;
  readableModeBtn.textContent = enabled ? 'Readable On' : 'Readable';
  readableModeBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  readableModeBtn.setAttribute('title', enabled ? 'Disable Readable Mode' : 'Enable Readable Mode');
}

function applySidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', Boolean(collapsed));
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  if (!sidebarCollapseBtn) return;
  sidebarCollapseBtn.textContent = collapsed ? 'Expand' : 'Collapse';
  sidebarCollapseBtn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
  sidebarCollapseBtn.setAttribute('title', collapsed ? 'Expand Sidebar' : 'Collapse Sidebar');
}

function applyAccentTheme(theme) {
  const next = (theme === 'red' || theme === 'yellow' || theme === 'blue' || theme === 'green') ? theme : 'green';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(ACCENT_THEME_KEY, next);
  if (themeAccentSelect && themeAccentSelect.value !== next) themeAccentSelect.value = next;
}

function initSidebarReorder() {
  const navContainer = document.getElementById('navButtons');
  if (!navContainer) return;

  const readStoredOrder = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(NAV_ORDER_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .map(value => String(value || '').toLowerCase().trim())
        .filter(section => MOVABLE_NAV_SECTIONS.includes(section));
    } catch {
      return [];
    }
  };

  const writeStoredOrder = (order) => {
    const clean = order.filter(section => MOVABLE_NAV_SECTIONS.includes(section));
    localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(clean));
  };

  const getButton = (section) => navContainer.querySelector(`.nav-btn[data-section="${section}"]`);
  const currentMovableOrder = () => Array.from(navContainer.querySelectorAll('.nav-btn[data-section]'))
    .map(btn => String(btn.dataset.section || '').toLowerCase())
    .filter(section => MOVABLE_NAV_SECTIONS.includes(section));

  const applyVisualAffordances = () => {
    Array.from(navContainer.querySelectorAll('.nav-btn[data-section]')).forEach((btn) => {
      const section = String(btn.dataset.section || '').toLowerCase();
      if (MOVABLE_NAV_SECTIONS.includes(section)) {
        btn.classList.add('nav-reorderable');
        btn.setAttribute('draggable', 'true');
        if (!btn.querySelector('.nav-drag-handle')) {
          const handle = document.createElement('span');
          handle.className = 'nav-drag-handle';
          handle.textContent = '⋮⋮';
          handle.setAttribute('aria-hidden', 'true');
          btn.appendChild(handle);
        }
        if (!btn.querySelector('.nav-move-controls')) {
          const controls = document.createElement('span');
          controls.className = 'nav-move-controls';
          controls.innerHTML = '<span class="nav-move-btn" data-nav-move="up" role="button" tabindex="0" aria-label="Move up">▲</span><span class="nav-move-btn" data-nav-move="down" role="button" tabindex="0" aria-label="Move down">▼</span>';
          btn.appendChild(controls);
        }
      } else if (section === PINNED_NAV_SECTION) {
        btn.classList.add('nav-pinned');
        btn.setAttribute('draggable', 'false');
        if (!btn.querySelector('.nav-pin-badge')) {
          const badge = document.createElement('span');
          badge.className = 'nav-pin-badge';
          badge.textContent = 'PINNED';
          btn.appendChild(badge);
        }
      } else {
        btn.setAttribute('draggable', 'false');
      }
    });
  };

  const applyOrder = (orderedMovableSections) => {
    const known = orderedMovableSections.filter(section => MOVABLE_NAV_SECTIONS.includes(section));
    const mergedMovable = [...known, ...MOVABLE_NAV_SECTIONS.filter(section => !known.includes(section))];
    const navSequence = [...mergedMovable, ...STATIC_NAV_SECTIONS, PINNED_NAV_SECTION];
    navSequence.forEach((section) => {
      const btn = getButton(section);
      if (btn) navContainer.appendChild(btn);
    });
    applyVisualAffordances();
  };

  applyOrder(readStoredOrder());

  let dragSection = '';

  navContainer.addEventListener('dragstart', (event) => {
    const btn = event.target.closest('.nav-btn[data-section]');
    if (!btn) return;
    const section = String(btn.dataset.section || '').toLowerCase();
    if (!MOVABLE_NAV_SECTIONS.includes(section)) {
      event.preventDefault();
      return;
    }
    dragSection = section;
    btn.classList.add('nav-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', section);
    }
  });

  navContainer.addEventListener('dragover', (event) => {
    const target = event.target.closest('.nav-btn[data-section]');
    if (!target || !dragSection) return;
    const targetSection = String(target.dataset.section || '').toLowerCase();
    if (!MOVABLE_NAV_SECTIONS.includes(targetSection) || targetSection === dragSection) return;
    event.preventDefault();
    target.classList.add('nav-drop-target');
  });

  navContainer.addEventListener('dragleave', (event) => {
    const target = event.target.closest('.nav-btn[data-section]');
    if (target) target.classList.remove('nav-drop-target');
  });

  navContainer.addEventListener('drop', (event) => {
    const target = event.target.closest('.nav-btn[data-section]');
    if (!target || !dragSection) return;
    const targetSection = String(target.dataset.section || '').toLowerCase();
    if (!MOVABLE_NAV_SECTIONS.includes(targetSection) || targetSection === dragSection) return;
    event.preventDefault();
    const order = currentMovableOrder();
    const from = order.indexOf(dragSection);
    const to = order.indexOf(targetSection);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, dragSection);
    applyOrder(order);
    writeStoredOrder(order);
  });

  navContainer.addEventListener('dragend', () => {
    dragSection = '';
    navContainer.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('nav-dragging', 'nav-drop-target'));
  });

  navContainer.addEventListener('click', (event) => {
    const controlBtn = event.target.closest('.nav-move-btn');
    if (!controlBtn) return;
    const row = event.target.closest('.nav-btn[data-section]');
    if (!row) return;
    const section = String(row.dataset.section || '').toLowerCase();
    if (!MOVABLE_NAV_SECTIONS.includes(section)) return;
    event.preventDefault();
    event.stopPropagation();
    const direction = controlBtn.dataset.navMove === 'up' ? -1 : 1;
    const order = currentMovableOrder();
    const index = order.indexOf(section);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    applyOrder(order);
    writeStoredOrder(order);
  });

  navContainer.addEventListener('keydown', (event) => {
    const controlBtn = event.target.closest('.nav-move-btn');
    if (!controlBtn) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    controlBtn.click();
  });
}

function toggleFullscreen() {
  if (EMBED_MODE) return;
  const root = document.documentElement;
  console.log('Fullscreen click triggered');
  if (!isFullscreenActive()) {
    if (root.requestFullscreen) {
      root.requestFullscreen()
        .then(() => writeFullscreenPreference(true))
        .catch(err => console.error('Fullscreen failed:', err))
        .finally(updateFullscreenToggleUi);
      return;
    }
    if (root.webkitRequestFullscreen) {
      try {
        root.webkitRequestFullscreen();
        writeFullscreenPreference(true);
      } catch (err) {
        console.error('Fullscreen failed:', err);
      }
      updateFullscreenToggleUi();
      return;
    }
    if (root.msRequestFullscreen) {
      try {
        root.msRequestFullscreen();
        writeFullscreenPreference(true);
      } catch (err) {
        console.error('Fullscreen failed:', err);
      }
      updateFullscreenToggleUi();
      return;
    }
    console.error('Fullscreen failed: API unavailable');
    return;
  }

  if (document.exitFullscreen) {
    document.exitFullscreen()
      .then(() => writeFullscreenPreference(false))
      .catch(err => console.error('Fullscreen failed:', err))
      .finally(updateFullscreenToggleUi);
    return;
  }
  if (document.webkitExitFullscreen) {
    try {
      document.webkitExitFullscreen();
      writeFullscreenPreference(false);
    } catch (err) {
      console.error('Fullscreen failed:', err);
    }
    updateFullscreenToggleUi();
    return;
  }
  if (document.msExitFullscreen) {
    try {
      document.msExitFullscreen();
      writeFullscreenPreference(false);
    } catch (err) {
      console.error('Fullscreen failed:', err);
    }
    updateFullscreenToggleUi();
  }
}
function normalizeApiBase(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isAbsoluteHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

const API_BASE = "https://orbiter-market-proxy.jrque.workers.dev";
const API_BASE_URL = normalizeApiBase(
  window.ORBITER_API_BASE_URL ||
  document.querySelector('meta[name="orbiter-api-base"]')?.content ||
  API_BASE
);
const DEFAULT_MARKET_PROXY_URL = 'https://orbiter-market-proxy.jrque.workers.dev';
const configuredMarketProxy = normalizeApiBase(
  window.ORBITER_MARKET_PROXY_URL
  || document.querySelector('meta[name="orbiter-market-proxy-url"]')?.content
  || DEFAULT_MARKET_PROXY_URL
);
const MARKET_PROXY_URL = isAbsoluteHttpUrl(configuredMarketProxy)
  ? configuredMarketProxy
  : DEFAULT_MARKET_PROXY_URL;
const CODEX_WORKER_BASE_URL = normalizeApiBase(
  document.querySelector('meta[name="orbiter-market-proxy-url"]')?.content
    || DEFAULT_MARKET_PROXY_URL
) || DEFAULT_MARKET_PROXY_URL;
const MARKET_DEBUG = (new URLSearchParams(window.location.search).get('market_debug') || '').toLowerCase() === '1'
  || localStorage.getItem('orbiter_market_debug') === '1';
const TRACKER_DEBUG = (new URLSearchParams(window.location.search).get('tracker_debug') || '').toLowerCase() === '1'
  || localStorage.getItem('orbiter_tracker_debug') === '1';

if (MARKET_DEBUG) console.log('[MARKET_DEBUG] market proxy base', MARKET_PROXY_URL || '(missing)');
if (TRACKER_DEBUG) console.log('[TRACKER_DEBUG] enabled');
console.log('[CODEX] environment hostname:', window.location.hostname || '(unknown)');
console.log('[CODEX] environment href:', window.location.href || '(unknown)');
console.log('[CODEX] worker base URL:', MARKET_PROXY_URL || '(missing)');
console.log('[CODEX] codex worker base URL:', CODEX_WORKER_BASE_URL || '(missing)');

function buildApiUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildMarketProxyUrl(path) {
  if (!MARKET_PROXY_URL) throw new Error('Market proxy required');
  return `${MARKET_PROXY_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildMarketOrdersPath(urlName, options = {}) {
  const encoded = encodeURIComponent(String(urlName || '').trim());
  const routeBase = '/api/market/orders/';
  const query = [];
  if (options.refresh) query.push('refresh=1');
  if (options.t) query.push(`t=${encodeURIComponent(String(options.t))}`);
  const qs = query.length ? `?${query.join('&')}` : '';
  return `${routeBase}${encoded}${qs}`;
}

function marketDebugLog(step, detail = '') {
  if (!MARKET_DEBUG) return;
  console.log(`[MARKET_DEBUG] ${step}${detail ? ` | ${detail}` : ''}`);
}

function marketNow() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

function hydrateApiLinks() {
  document.querySelectorAll('[data-api-path]').forEach(link => {
    const path = link.getAttribute('data-api-path') || '';
    if (!API_BASE_URL || !path) {
      link.setAttribute('href', '#');
      link.setAttribute('title', 'Configure window.ORBITER_API_BASE_URL to open this API endpoint.');
      return;
    }
    link.setAttribute('href', buildApiUrl(path));
  });
}

function createSoundSystem() {
  const STORAGE_KEY = 'orbiter_sound_muted';
  const state = {
    muted: localStorage.getItem(STORAGE_KEY) === '1',
    unlocked: false,
    lastPlay: new Map(),
    audio: {
      click: new Audio('sounds/click.wav'),
      type: new Audio('sounds/type.wav'),
      boot: new Audio('sounds/boot.wav')
    }
  };

  Object.values(state.audio).forEach(a => {
    a.preload = 'auto';
    a.volume = 0.5;
  });
  state.audio.type.volume = 0.22;
  state.audio.boot.volume = 0.45;

  function setMuted(muted) {
    state.muted = Boolean(muted);
    localStorage.setItem(STORAGE_KEY, state.muted ? '1' : '0');
    if (soundToggleBtn) {
      soundToggleBtn.textContent = state.muted ? 'volume_off' : 'volume_up';
      soundToggleBtn.setAttribute('aria-pressed', state.muted ? 'true' : 'false');
    }
  }

  async function tryPlay(name, { cooldownMs = 0 } = {}) {
    if (state.muted) return false;
    const audio = state.audio[name];
    if (!audio) return false;

    const now = Date.now();
    const last = state.lastPlay.get(name) || 0;
    if (cooldownMs && now - last < cooldownMs) return false;
    state.lastPlay.set(name, now);

    try {
      audio.pause();
      audio.currentTime = 0;
      await audio.play();
      state.unlocked = true;
      return true;
    } catch (error) {
      // Autoplay restrictions or blocked audio: silently ignore, but mark as locked.
      state.unlocked = false;
      return false;
    }
  }

  function ensureUnlocked() {
    if (state.unlocked) return;
    const unlock = async () => {
      // Attempt a tiny sound once on first interaction to unlock playback.
      await tryPlay('click', { cooldownMs: 0 });
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
  }

  setMuted(state.muted);
  ensureUnlocked();

  return {
    get muted() { return state.muted; },
    setMuted,
    play: tryPlay
  };
}

const Sound = createSoundSystem();

const MOBILE_ACCORDION_QUERY = '(max-width: 900px)';
const accordionMql = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_ACCORDION_QUERY) : null;
const touchMql = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null;
const isMobileOrTouch = () => Boolean(accordionMql?.matches || touchMql?.matches || navigator.maxTouchPoints > 0);
const sectionAccordionState = {
  enabled: Boolean(accordionMql?.matches),
  bodies: new Map(),
  toggles: new Map()
};
let mobileTrackerObserver = null;

let currentSectionName = 'dashboard';
let bootComplete = false;
const sectionNames = Array.from(sections)
  .map(section => String(section.id || '').replace(/^section-/, ''))
  .filter(Boolean);

let lastCopiedWhisperBtn = null;
let lastCopiedWhisperText = 'Copy Whisper';

function animateDetailPopin(el) {
  if (!el) return;
  el.classList.remove('popout-leave');
  el.classList.add('popout-enter');
  const clear = () => {
    el.removeEventListener('animationend', clear);
    el.classList.remove('popout-enter');
  };
  el.addEventListener('animationend', clear);
}

function animateDetailPopout(el) {
  return new Promise(resolve => {
    if (!el) return resolve();
    el.classList.remove('popout-enter');
    el.classList.add('popout-leave');
    const done = () => {
      el.removeEventListener('animationend', done);
      resolve();
    };
    el.addEventListener('animationend', done);
    window.setTimeout(done, 260);
  });
}

function cssEscapeValue(value) {
  try {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(String(value));
  } catch {}
  return String(value).replace(/[^a-zA-Z0-9_-]/g, match => `\\${match}`);
}

function runBootSequence() {
  const overlay = document.getElementById('bootOverlay');
  const linesEl = document.getElementById('bootLines');
  const hintEl = document.getElementById('bootHint');
  const continueBtn = document.getElementById('bootContinueBtn');
  const closeBtn = document.getElementById('bootCloseBtn');
  if (EMBED_MODE) {
    bootComplete = true;
    document.documentElement.classList.add('boot-complete');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.remove();
    }
    return;
  }
  if (!overlay || !linesEl) {
    bootComplete = true;
    document.documentElement.classList.add('boot-complete');
    return;
  }
  if (sessionStorage.getItem('orbiter_boot_closed') === '1') {
    bootComplete = true;
    document.documentElement.classList.add('boot-complete');
    overlay.classList.add('hidden');
    overlay.remove();
    return;
  }

  // First-load/session-visible reset: ensure the overlay is shown and starts clean.
  overlay.classList.remove('hidden', 'closing', 'opening');
  linesEl.textContent = '';
  if (hintEl && hintEl.firstChild) hintEl.firstChild.textContent = '';

  const lines = [
    '[LINK_ESTABLISHED]  Cephalon_Link online',
    '[MOUNT]  archives://tenno',
    '[SYNC]  backend API proxy handshake',
    '[INIT]  market catalog cache',
    '[READY]  enter command'
  ];

  let cancelled = false;
  let closed = false;
  let bootVisible = true;
  let lineIndex = 0;
  let charIndex = 0;

  const closeOverlay = () => {
    if (cancelled || closed || !bootVisible) return;
    bootVisible = false;
    closed = true;
    cancelled = true;
    sessionStorage.setItem('orbiter_boot_closed', '1');
    teardownInputHandlers();

    // Animate out via CSS, then remove only after it completes.
    overlay.classList.remove('opening');
    overlay.classList.add('closing');
    const finalize = () => {
      overlay.removeEventListener('animationend', finalize);
      overlay.classList.add('hidden');
      overlay.remove();
      bootComplete = true;
      document.documentElement.classList.add('boot-complete');
    };
    overlay.addEventListener('animationend', finalize);
    // Fallback in case animationend doesn't fire (older browsers / interrupted).
    window.setTimeout(finalize, 520);
  };

  const setHint = (text) => {
    if (!hintEl) return;
    hintEl.firstChild ? (hintEl.firstChild.textContent = text) : (hintEl.textContent = text);
  };

  // Only explicit interactions should close the welcome screen.
  if (continueBtn) continueBtn.addEventListener('click', closeOverlay);
  if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
  const closeFromTap = (e) => {
    if (e.type === 'touchstart') e.preventDefault();
    closeOverlay();
  };
  const handleBootKey = (e) => {
    const overlayVisible = overlay.isConnected && !overlay.classList.contains('hidden') && !closed && bootVisible;
    if (!overlayVisible) return;
    const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter';
    if (isEnter) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      closeOverlay();
    }
  };
  const teardownInputHandlers = () => {
    overlay.removeEventListener('touchstart', closeFromTap);
    overlay.removeEventListener('click', closeFromTap);
    overlay.removeEventListener('keydown', handleBootKey);
    document.removeEventListener('keydown', handleBootKey, true);
  };
  overlay.addEventListener('touchstart', closeFromTap, { passive: false });
  overlay.addEventListener('click', closeFromTap);
  overlay.addEventListener('keydown', handleBootKey);
  document.addEventListener('keydown', handleBootKey, true);
  overlay.setAttribute('tabindex', '-1');

  Sound.play('boot', { cooldownMs: 5000 }).catch(() => {});

  const step = () => {
    if (cancelled) return;
    const current = lines[lineIndex] || '';
    const prefix = lines.slice(0, lineIndex).join('\n');
    const typed = current.slice(0, charIndex);
    const nextText = (prefix ? `${prefix}\n` : '') + typed;
    linesEl.textContent = nextText;

    if (charIndex < current.length) {
      charIndex += 1;
      window.setTimeout(step, 18);
      return;
    }

    lineIndex += 1;
    charIndex = 0;
    if (lineIndex >= lines.length) {
      // Do not auto-hide; stay visible until the user presses Enter or clicks Continue/Close.
      setHint('press enter to continue');
      overlay.focus();
      return;
    }
    window.setTimeout(step, 140);
  };

  overlay.classList.add('opening');
  overlay.addEventListener('animationend', () => overlay.classList.remove('opening'), { once: true });
  setHint('initializing audio (unlocks on interaction)');
  try { overlay.focus({ preventScroll: true }); } catch { try { overlay.focus(); } catch {} }
  window.setTimeout(step, 120);
}

    function logClientError(action, error, extra = {}) {
      console.error(`[orbiter] ${action} failed`, {
        message: error?.message || String(error),
        ...extra
      });
    }

    function logRequest(label, url) {
      console.log(`[orbiter] ${label} request URL`, url);
    }

    function logResponse(label, response) {
      console.log(`[orbiter] ${label} response status`, response.status, response.statusText);
    }

    function logJson(label, json) {
      console.log(`[orbiter] ${label} parsed JSON`, json);
    }

    async function parseJsonResponse(response, label) {
      const contentType = response.headers.get('content-type') || '';
      console.log(`[orbiter] ${label} content-type`, contentType);
      const text = await response.text();
      if (!text.trim()) {
        throw new Error(`empty response body from ${response.url || 'unknown URL'}`);
      }
      try {
        const parsed = JSON.parse(text);
        logJson(label, parsed);
        return parsed;
      } catch (error) {
        const preview = text.slice(0, 200).replace(/\s+/g, ' ').trim();
        throw new Error(`parse error: ${error.message}; preview="${preview}"`);
      }
    }

    function setSectionOpen(sectionName, open, { scrollIntoView = false } = {}) {
      const section = document.getElementById(`section-${sectionName}`);
      const body = sectionAccordionState.bodies.get(sectionName);
      const toggle = sectionAccordionState.toggles.get(sectionName);
      if (!section || !body || !toggle) return;

      body.dataset.open = open ? '1' : '0';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'collapse' : 'expand';

      if (open) {
        body.style.opacity = '1';
        body.style.maxHeight = `${body.scrollHeight}px`;
        window.setTimeout(() => {
          if (body.dataset.open === '1') body.style.maxHeight = 'none';
        }, 260);
        if (scrollIntoView) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      body.style.maxHeight = `${body.scrollHeight}px`;
      body.getBoundingClientRect();
      body.style.maxHeight = '0px';
      body.style.opacity = '0';
    }

    function setupSectionAccordion() {
      if (!sectionAccordionState.enabled) return;

      sections.forEach(section => {
        section.classList.remove('hidden-panel');
      });

      sections.forEach(section => {
        const sectionName = String(section.id || '').replace(/^section-/, '');
        if (!sectionName) return;
        if (sectionAccordionState.bodies.has(sectionName)) return;

        const headerBlock = section.firstElementChild;
        if (!headerBlock) return;

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'section-toggle-btn border border-terminal px-4 py-2 text-xs uppercase tracking-widest hover:bg-terminal hover:text-black';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.dataset.sectionToggle = sectionName;
        toggle.textContent = 'expand';
        headerBlock.insertAdjacentElement('afterend', toggle);

        const body = document.createElement('div');
        body.id = `section-body-${sectionName}`;
        body.className = 'section-body space-y-6';
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        toggle.insertAdjacentElement('afterend', body);
        toggle.setAttribute('aria-controls', body.id);

        let cursor = body.nextSibling;
        while (cursor) {
          const next = cursor.nextSibling;
          body.appendChild(cursor);
          cursor = next;
        }

        sectionAccordionState.bodies.set(sectionName, body);
        sectionAccordionState.toggles.set(sectionName, toggle);

        toggle.addEventListener('click', () => {
          const isOpen = body.dataset.open === '1';
          setSectionOpen(sectionName, !isOpen);
        });
      });

      setSectionOpen('dashboard', true);
      ['trackers', 'arsenal', 'market', 'codex'].forEach(name => setSectionOpen(name, false));
    }

    function syncAccordionMode() {
      const shouldEnable = Boolean(accordionMql?.matches);
      if (shouldEnable === sectionAccordionState.enabled) return;
      sectionAccordionState.enabled = shouldEnable;

      if (sectionAccordionState.enabled) {
        // Mobile/tablet: accordion mode, keep all sections in the DOM flow.
        setupSectionAccordion();
        sections.forEach(section => section.classList.remove('hidden-panel'));
        sectionNames.forEach(name => setSectionOpen(name, name === currentSectionName));
        setupMobileTrackerAutoLoad();
        return;
      }

      // Desktop: restore single-panel navigation.
      sectionAccordionState.bodies.forEach((body, name) => {
        // Leave bodies expanded so if CSS changes later, content is still accessible.
        body.dataset.open = '1';
        body.style.opacity = '1';
        body.style.maxHeight = 'none';
        const toggle = sectionAccordionState.toggles.get(name);
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'true');
          toggle.textContent = 'collapse';
        }
      });
      sections.forEach(section => section.classList.toggle('hidden-panel', section.id !== `section-${currentSectionName}`));
      setupMobileTrackerAutoLoad();
    }

function showSection(sectionName) {
      currentSectionName = sectionName || 'dashboard';
      navButtons.forEach(btn => btn.classList.toggle('nav-active', btn.dataset.section === sectionName));

      if (sectionAccordionState.enabled) {
        // Mobile/tablet: treat nav buttons as "open this panel" (not toggle).
        sectionNames.forEach(name => setSectionOpen(name, name === sectionName));
        setSectionOpen(sectionName, true, { scrollIntoView: true });
      } else {
        const targetId = `section-${sectionName}`;
        const targetSection = document.getElementById(targetId);
        const activeSection = Array.from(sections).find(section => !section.classList.contains('hidden-panel'));
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canAnimate = bootComplete
          && !prefersReducedMotion
          && targetSection
          && activeSection
          && activeSection !== targetSection;

        if (!canAnimate) {
          sections.forEach(section => {
            section.classList.remove('section-enter', 'section-exit', 'section-active');
            section.classList.toggle('hidden-panel', section.id !== targetId);
          });
        } else {
          targetSection.classList.remove('hidden-panel');
          targetSection.classList.remove('section-exit');
          targetSection.classList.add('section-enter');

          activeSection.classList.remove('section-enter');
          activeSection.classList.add('section-exit');

          requestAnimationFrame(() => {
            targetSection.classList.add('section-active');
            targetSection.classList.remove('section-enter');
          });

          window.setTimeout(() => {
            activeSection.classList.add('hidden-panel');
            activeSection.classList.remove('section-exit', 'section-enter', 'section-active');
            targetSection.classList.remove('section-enter', 'section-exit');
            targetSection.classList.add('section-active');
          }, 220);
        }
      }

      if (searchInput) searchInput.value = '';
      clearHighlights();
      if (sectionName === 'market') {
        ensureMarketCatalog().catch(error => logClientError('market catalog preload', error));
      }
      if (sectionName === 'trackers') {
        maybeShowTrackerDragTooltip();
        refreshDashboardTrackers();
      }
      if (sectionName === 'codex') {
        const codexGroup = document.querySelector('[data-subtabs="codex"]');
        const codexTab = codexGroup?.querySelector('.subtab-btn.subtab-active') || codexGroup?.querySelector('.subtab-btn');
        if (codexTab) codexTab.click();
      }
    }

    function setupSubtabs() {
      document.querySelectorAll('[data-subtabs]').forEach(group => {
        const buttons = group.querySelectorAll('.subtab-btn');
        buttons.forEach(button => {
          button.addEventListener('click', () => {
            const parentSection = group.closest('.content-section');
            if (!parentSection) {
              logClientError('subtab parent lookup', new Error('Missing parent section'), { group: group.dataset.subtabs || 'unknown' });
              return;
            }
            parentSection.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('subtab-active'));
            button.classList.add('subtab-active');
            parentSection.querySelectorAll('.subpanel').forEach(panel => panel.classList.add('hidden-panel'));
            const target = parentSection.querySelector(`#${button.dataset.target}`);
            if (!target) {
              logClientError('subtab target lookup', new Error('Missing subpanel target'), { target: button.dataset.target || 'missing' });
              return;
            }
            target.classList.remove('hidden-panel');
          });
        });
      });
    }

    function clearHighlights() {
      document.querySelectorAll('[data-searchable]').forEach(el => el.classList.remove('ring-1','ring-terminal'));
    }

    function setupMobileTrackerAutoLoad() {
      if (mobileTrackerObserver) {
        mobileTrackerObserver.disconnect();
        mobileTrackerObserver = null;
      }
      if (!sectionAccordionState.enabled || typeof IntersectionObserver !== 'function') return;
      const trackerSection = document.getElementById('section-trackers');
      if (!trackerSection) return;
      mobileTrackerObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          // Mobile only: when Trackers enters view, make sure the panel opens and data is refreshed.
          setSectionOpen('trackers', true);
          maybeShowTrackerDragTooltip();
          refreshDashboardTrackers();
        });
      }, { root: null, threshold: 0.15 });
      mobileTrackerObserver.observe(trackerSection);
    }

    setupSectionAccordion();
    hydrateApiLinks();
    if (accordionMql) {
      // Keep behavior correct across resize/orientation changes.
      if (typeof accordionMql.addEventListener === 'function') accordionMql.addEventListener('change', syncAccordionMode);
      else if (typeof accordionMql.addListener === 'function') accordionMql.addListener(syncAccordionMode);
    }
    syncAccordionMode();
    setupMobileTrackerAutoLoad();
    initSidebarReorder();
    navButtons.forEach(btn => btn.addEventListener('click', () => {
      const targetSection = btn.dataset.section;
      if (targetSection !== 'trackers' && typeof closeTrackerModal === 'function') closeTrackerModal();
      showSection(targetSection);
    }));
    showSection(currentSectionName);

    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        const nextMuted = !Sound.muted;
        Sound.setMuted(nextMuted);
        if (!nextMuted) Sound.play('click', { cooldownMs: 0 }).catch(() => {});
      });
    }
    applyReadableMode(readReadableModePreference());
    applySidebarCollapsed(readSidebarCollapsedPreference());
    applyAccentTheme(readAccentThemePreference());
    if (readableModeBtn) {
      readableModeBtn.addEventListener('click', () => {
        const next = !document.body.classList.contains('readable-mode');
        applyReadableMode(next);
      });
    }
    if (sidebarCollapseBtn) {
      sidebarCollapseBtn.addEventListener('click', () => {
        const next = !document.body.classList.contains('sidebar-collapsed');
        applySidebarCollapsed(next);
      });
    }
    if (themeAccentSelect) {
      themeAccentSelect.addEventListener('change', () => {
        applyAccentTheme(themeAccentSelect.value);
      });
    }
    updateFullscreenToggleUi();
    if (fullscreenToggleBtn) {
      fullscreenToggleBtn.addEventListener('click', toggleFullscreen);
    }
    document.addEventListener('fullscreenchange', updateFullscreenToggleUi);
    document.addEventListener('fullscreenchange', () => {
      console.log('Fullscreen state:', !!document.fullscreenElement);
    });
    document.addEventListener('webkitfullscreenchange', () => {
      console.log('Fullscreen state:', !!(document.webkitFullscreenElement || document.fullscreenElement));
      updateFullscreenToggleUi();
    });
    document.addEventListener('MSFullscreenChange', () => {
      console.log('Fullscreen state:', !!(document.msFullscreenElement || document.fullscreenElement));
      updateFullscreenToggleUi();
    });
    document.addEventListener('fullscreenerror', updateFullscreenToggleUi);

    // Subtle click sounds only for primary terminal actions.
    const CLICK_SELECTOR = [
      '.nav-btn',
      '.subtab-btn',
      '.section-toggle-btn',
      '#refreshBtn',
      '#bootContinueBtn',
      '#bootCloseBtn',
      '#marketSearchBtn',
      '#marketViewSellBtn',
      '#marketViewBuyBtn',
      '#marketModalClose',
      '#trackerModalClose',
      '#marketModalTabSell',
      '#marketModalTabBuy',
      '#codexSearchBtn',
      '#codexOpenBtn',
      'button[data-dashboard-detail-select]',
      'button[data-dashboard-detail-close]',
      '.market-whisper-copy',
      '.terminal-link',
      '.clickable'
    ].join(',');

    document.addEventListener('click', (e) => {
      const hit = e.target?.closest?.(CLICK_SELECTOR);
      if (!hit) return;
      if (hit === soundToggleBtn) return;
      Sound.play('click', { cooldownMs: 90 }).catch(() => {});
    }, true);

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        showSection('trackers');
        document.querySelectorAll('.subtab-btn').forEach(btn => {
          btn.classList.remove('subtab-active');
        });
        document.querySelectorAll('[data-subtabs]').forEach(group => {
          const firstBtn = group.querySelector('.subtab-btn');
          if (firstBtn) firstBtn.click();
        });
      });
    } else {
      logClientError('refresh button binding', new Error('refreshBtn not found'));
    }

    if (searchInput) {
      const searchSuggestHost = searchInput.closest('.relative');
      const searchSuggestBox = document.createElement('div');
      searchSuggestBox.className = 'archive-suggest';
      searchSuggestBox.id = 'archiveSuggest';
      if (searchSuggestHost) searchSuggestHost.appendChild(searchSuggestBox);

      const navLookup = [
        { title: 'Dashboard', kind: 'section', section: 'dashboard', terms: ['dashboard', 'home', 'overview'] },
        { title: 'Trackers', kind: 'section', section: 'trackers', terms: ['tracker', 'trackers', 'track'] },
        { title: 'Market', kind: 'section', section: 'market', terms: ['market', 'mar'] },
        { title: 'Arsenal', kind: 'section', section: 'arsenal', terms: ['arsenal', 'build', 'weapon'] },
        { title: 'Codex', kind: 'section', section: 'codex', terms: ['codex', 'wiki', 'guide'] },
        { title: 'Invasions', kind: 'tracker', section: 'trackers', terms: ['invasion', 'invasions', 'inv'] },
        { title: 'Events', kind: 'tracker', section: 'trackers', terms: ['event', 'events'] },
        { title: 'Factions', kind: 'tracker', section: 'trackers', terms: ['faction', 'factions'] },
        { title: 'Projects', kind: 'tracker', section: 'trackers', terms: ['project', 'projects'] }
      ];
      let navSuggestItems = [];
      let navSuggestIndex = -1;
      let navSuggestOpen = false;

      const closeNavSuggest = () => {
        navSuggestOpen = false;
        navSuggestItems = [];
        navSuggestIndex = -1;
        searchSuggestBox.innerHTML = '';
        searchSuggestBox.classList.remove('is-open');
      };

      const setNavSuggestActive = (index) => {
        navSuggestIndex = index;
        searchSuggestBox.querySelectorAll('.archive-suggest__item').forEach((el, i) => {
          el.classList.toggle('is-active', i === index);
        });
      };

      const pickTrackerDetailByText = (queryText) => {
        const q = String(queryText || '').toLowerCase().trim();
        const buttons = Array.from(document.querySelectorAll('button[data-dashboard-detail-select]'));
        const match = buttons.find(btn => String(btn.innerText || '').toLowerCase().includes(q));
        if (match) match.click();
      };

      const applyNavSuggestion = (item) => {
        if (!item) return;
        showSection(item.section);
        if (item.kind === 'tracker') {
          window.setTimeout(() => pickTrackerDetailByText(item.title), 40);
        }
        searchInput.value = item.title;
        closeNavSuggest();
      };

      const renderNavSuggest = (query) => {
        const q = String(query || '').toLowerCase().trim();
        if (!q) {
          closeNavSuggest();
          return;
        }
        const ranked = navLookup
          .map(item => {
            const title = item.title.toLowerCase();
            let score = -1;
            if (title === q) score = 100;
            else if (title.startsWith(q)) score = 80;
            else if (title.includes(q)) score = 60;
            else {
              const termScore = item.terms.reduce((best, t) => {
                if (t === q) return Math.max(best, 90);
                if (t.startsWith(q)) return Math.max(best, 70);
                if (t.includes(q)) return Math.max(best, 50);
                return best;
              }, -1);
              score = termScore;
            }
            return { item, score };
          })
          .filter(entry => entry.score >= 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        navSuggestItems = ranked.map(entry => entry.item);
        if (!navSuggestItems.length) {
          closeNavSuggest();
          return;
        }
        searchSuggestBox.innerHTML = navSuggestItems.map((entry, idx) => `
          <button type="button" class="archive-suggest__item${idx === 0 ? ' is-active' : ''}" data-nav-suggest-index="${idx}">
            <span class="archive-suggest__title">${entry.title}</span>
            <span class="archive-suggest__meta">${entry.kind === 'tracker' ? 'Tracker Section' : 'Section'}</span>
          </button>
        `).join('');
        navSuggestIndex = 0;
        navSuggestOpen = true;
        searchSuggestBox.classList.add('is-open');
      };

      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        renderNavSuggest(q);
        const activeSections = sectionAccordionState.enabled
          ? sectionNames
              .filter(name => sectionAccordionState.bodies.get(name)?.dataset.open === '1')
              .map(name => document.getElementById(`section-${name}`))
              .filter(Boolean)
          : [document.querySelector('.content-section:not(.hidden-panel)')].filter(Boolean);

        activeSections.forEach(activeSection => {
          activeSection.querySelectorAll('.panel-card, a, li, p, h1, h2, h3, div').forEach(el => {
            if (!q) return el.classList.remove('ring-1', 'ring-terminal');
            const text = (el.innerText || '').toLowerCase();
            if (text.includes(q) && text.length < 500) {
              el.classList.add('ring-1', 'ring-terminal');
            } else {
              el.classList.remove('ring-1', 'ring-terminal');
            }
          });
        });
      });

      searchInput.addEventListener('keydown', (e) => {
        if (!navSuggestOpen || !navSuggestItems.length) {
          if (e.key === 'Enter') {
            const q = String(searchInput.value || '').trim().toLowerCase();
            const first = navLookup.find(item =>
              item.title.toLowerCase().includes(q) || item.terms.some(t => t.includes(q))
            );
            if (first) {
              e.preventDefault();
              applyNavSuggestion(first);
            }
          }
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (navSuggestIndex + 1) % navSuggestItems.length;
          setNavSuggestActive(next);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const next = (navSuggestIndex - 1 + navSuggestItems.length) % navSuggestItems.length;
          setNavSuggestActive(next);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          applyNavSuggestion(navSuggestItems[navSuggestIndex] || navSuggestItems[0]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closeNavSuggest();
        }
      });

      searchSuggestBox.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-nav-suggest-index]');
        if (!btn) return;
        const idx = Number(btn.dataset.navSuggestIndex);
        if (!Number.isFinite(idx)) return;
        applyNavSuggestion(navSuggestItems[idx]);
      });

      searchInput.addEventListener('blur', () => {
        window.setTimeout(() => {
          if (!searchSuggestBox.matches(':hover')) closeNavSuggest();
        }, 120);
      });
    } else {
      logClientError('global search binding', new Error('searchInput not found'));
    }

    // Typing sound: only for major terminal/search inputs (with a small cooldown).
    const TYPING_IDS = new Set(['searchInput', 'marketItemSearch', 'codexSearchInput']);
    document.addEventListener('beforeinput', (e) => {
      const t = e.target;
      if (!t || !(t instanceof HTMLElement)) return;
      if (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') return;
      if (!TYPING_IDS.has(t.id)) return;
      if (typeof e.inputType === 'string' && !e.inputType.startsWith('insert')) return;
      Sound.play('type', { cooldownMs: 32 }).catch(() => {});
    }, true);

    runBootSequence();

    const dashboardTrackerGrid = document.getElementById('dashboardTrackerGrid');
    const dashboardTrackerStatus = document.getElementById('dashboardTrackerStatus');
    const dashResetSummary = document.getElementById('dashResetSummary');
    const dashDailyStatus = document.getElementById('dashDailyStatus');
    const dashTrackerHighlights = document.getElementById('dashTrackerHighlights');
    const dashCodexRecent = document.getElementById('dashCodexRecent');
    const dashMarketQuickInput = document.getElementById('dashMarketQuickInput');
    const dashMarketQuickSuggest = document.getElementById('dashMarketQuickSuggest');
    const dashMarketQuickGo = document.getElementById('dashMarketQuickGo');
    const dashboardCardModal = document.getElementById('dashboardCardModal');
    const dashboardCardModalTitle = document.getElementById('dashboardCardModalTitle');
    const dashboardCardModalSub = document.getElementById('dashboardCardModalSub');
    const dashboardCardModalBody = document.getElementById('dashboardCardModalBody');
    const dashboardCardModalClose = document.getElementById('dashboardCardModalClose');
    const dashboardCardModalOpenSection = document.getElementById('dashboardCardModalOpenSection');
    const trackerModal = document.getElementById('trackerModal');
    const trackerModalTitle = document.getElementById('trackerModalTitle');
    const trackerModalSub = document.getElementById('trackerModalSub');
    const trackerModalBody = document.getElementById('trackerModalBody');
    const trackerModalClose = document.getElementById('trackerModalClose');
    const trackerDragTooltip = document.getElementById('trackerDragTooltip');
    const trackerSortMode = document.getElementById('trackerSortMode');
    const trackerResetOrderBtn = document.getElementById('trackerResetOrderBtn');
    const TRACKER_ORDER_KEY = 'orbiter_tracker_category_order';
    const TRACKER_SORT_KEY = 'orbiter_tracker_sort_mode';
    const TRACKER_DRAG_TOOLTIP_SEEN_KEY = 'orbiter_tracker_drag_tooltip_seen';
    const trackerDefaultOrder = ['environments', 'missions', 'bounties', 'syndicate-missions', 'utility'];
    const dashboardTrackerState = {
      categories: [],
      customOrder: loadTrackerOrder(),
      sortMode: localStorage.getItem(TRACKER_SORT_KEY) || 'default',
      selectedDetailCategoryId: '',
      selectedDetailId: '',
      source: '',
      syncedAt: null,
      lastFetchAt: 0,
      lastData: null
    };
    const trackerModalState = {
      open: false,
      detailId: '',
      categoryId: '',
      detailType: '',
      prevBodyOverflow: ''
    };
    const dashboardCardModalState = {
      open: false,
      section: '',
      cardType: '',
      prevBodyOverflow: ''
    };

    const SOLNODE_LOOKUP_URL = 'https://raw.githubusercontent.com/WFCD/warframe-worldstate-data/master/data/solNodes.json';
    const dashboardNodeLookupState = {
      loaded: false,
      loading: false,
      error: null,
      map: null,
      promise: null
    };

    function setDashboardTrackerStatus(text) {
      if (dashboardTrackerStatus) dashboardTrackerStatus.textContent = text;
    }

    function loadTrackerOrder() {
      try {
        const value = JSON.parse(localStorage.getItem(TRACKER_ORDER_KEY) || '[]');
        return Array.isArray(value) ? value.filter(Boolean) : [];
      } catch {
        return [];
      }
    }

    function saveTrackerOrder(order) {
      dashboardTrackerState.customOrder = Array.isArray(order) ? order.filter(Boolean) : [];
      localStorage.setItem(TRACKER_ORDER_KEY, JSON.stringify(dashboardTrackerState.customOrder));
    }

    function setTrackerSortMode(mode) {
      dashboardTrackerState.sortMode = mode || 'default';
      localStorage.setItem(TRACKER_SORT_KEY, dashboardTrackerState.sortMode);
      if (trackerSortMode) trackerSortMode.value = dashboardTrackerState.sortMode;
    }

    if (trackerSortMode) {
      trackerSortMode.value = dashboardTrackerState.sortMode;
      trackerSortMode.addEventListener('change', () => {
        setTrackerSortMode(trackerSortMode.value);
        dashboardTrackerState.categories = orderDashboardCategories(dashboardTrackerState.categories);
        renderDashboardTrackerCards();
        updateDashboardCountdowns();
      });
    }

    if (trackerResetOrderBtn) {
      trackerResetOrderBtn.addEventListener('click', () => {
        saveTrackerOrder([]);
        setTrackerSortMode('default');
        dashboardTrackerState.categories = orderDashboardCategories(dashboardTrackerState.categories);
        renderDashboardTrackerCards();
        updateDashboardCountdowns();
      });
    }

    let trackerDragTooltipShown = false;
    function maybeShowTrackerDragTooltip() {
      if (!trackerDragTooltip || trackerDragTooltipShown) return;
      trackerDragTooltipShown = true;
      try {
        if (localStorage.getItem(TRACKER_DRAG_TOOLTIP_SEEN_KEY) === '1') return;
        localStorage.setItem(TRACKER_DRAG_TOOLTIP_SEEN_KEY, '1');
      } catch {}
      trackerDragTooltip.classList.add('is-visible');
      window.setTimeout(() => {
        trackerDragTooltip.classList.add('is-fading');
      }, 2200);
      window.setTimeout(() => {
        trackerDragTooltip.classList.remove('is-visible', 'is-fading');
      }, 2700);
    }

    function ensureDashboardNodeLookup() {
      if (dashboardNodeLookupState.loaded) return Promise.resolve(dashboardNodeLookupState.map);
      if (dashboardNodeLookupState.promise) return dashboardNodeLookupState.promise;
      dashboardNodeLookupState.loading = true;
      dashboardNodeLookupState.error = null;
      dashboardNodeLookupState.promise = (async () => {
        try {
          logRequest('dashboard node lookup', SOLNODE_LOOKUP_URL);
          const response = await fetch(SOLNODE_LOOKUP_URL, { cache: 'force-cache' });
          logResponse('dashboard node lookup', response);
          if (!response.ok) throw new Error(`node lookup HTTP ${response.status}`);
          const json = await response.json();
          logJson('dashboard node lookup', { keys: Object.keys(json || {}).slice(0, 10), total: Object.keys(json || {}).length });
          if (!json || typeof json !== 'object') throw new Error('node lookup JSON was not an object map');
          dashboardNodeLookupState.map = json;
          dashboardNodeLookupState.loaded = true;
          return json;
        } catch (error) {
          dashboardNodeLookupState.error = error;
          console.warn('[orbiter] dashboard node lookup failed', error);
          return null;
        } finally {
          dashboardNodeLookupState.loading = false;
        }
      })();
      return dashboardNodeLookupState.promise;
    }

    const LOCAL_NODE_FALLBACK = {
      // Minimal fallback samples in case the external node map is blocked.
      // Keep this small; prefer the WFCD solNodes.json lookup for full coverage.
      SettlementNode11: { value: 'Cetus (Earth)', type: 'Hub' },
      ClanNode10: { value: 'Dojo', type: 'Hub' }
    };

    function resolveReadableNode(nodeId) {
      const map = dashboardNodeLookupState.map;
      const entry = (map && nodeId && map[nodeId]) ? map[nodeId] : (LOCAL_NODE_FALLBACK[nodeId] || null);
      const location = entry?.value ? String(entry.value) : '';
      const missionType = entry?.type ? String(entry.type) : '';
      const enemy = entry?.enemy ? String(entry.enemy) : '';
      return {
        nodeId: String(nodeId || ''),
        location,
        missionType,
        enemy
      };
    }

    function apiUrl(path) {
      return buildApiUrl(path);
    }

    let dashboardWorldstateRequest = null;

    async function fetchDashboardWorldstateJson(options = {}) {
      if (dashboardWorldstateRequest) return dashboardWorldstateRequest;
      dashboardWorldstateRequest = (async () => {
        const backendUrl = API_BASE_URL ? apiUrl(`/api/worldstate${options.refresh ? '?refresh=1' : ''}`) : '';
        if (backendUrl) {
          try {
            logRequest('dashboard backend worldstate', backendUrl);
            const response = await fetch(backendUrl, { cache: 'no-store' });
            logResponse('dashboard backend worldstate', response);
            if (!response.ok) throw new Error(`worldstate proxy HTTP ${response.status} from ${backendUrl}`);
            const json = await parseJsonResponse(response, 'dashboard backend worldstate');
            if (!json?.data || typeof json.data !== 'object') throw new Error('worldstate proxy response missing data object');
            logJson('dashboard backend worldstate summary', { source: json.source, keys: Object.keys(json.data || {}).slice(0, 20) });
            return json;
          } catch (error) {
            logClientError('dashboard backend worldstate', error, { backendUrl });
          }
        }

        throw new Error('WarframeStat.us worldstate proxy is not configured.');
      })();
      try {
        return await dashboardWorldstateRequest;
      } finally {
        dashboardWorldstateRequest = null;
      }
    }

    const dashboardCategoryDefs = [
      { id: 'environments', title: 'Cycles', source: '/api/worldstate (WarframeStat.us)' },
      { id: 'missions', title: 'Missions & Rotations', source: '/api/worldstate (WarframeStat.us)' },
      { id: 'bounties', title: 'Bounties', source: '/api/worldstate (WarframeStat.us)' },
      { id: 'syndicate-missions', title: 'Nightwave & Events', source: '/api/worldstate (WarframeStat.us)' },
      { id: 'utility', title: 'Utility / Info', source: '/api/worldstate (WarframeStat.us)' }
    ];

    function browseDate(value) {
      if (!value) return '';
      if (typeof value === 'string' || typeof value === 'number') {
        const numeric = Number(value);
        const date = new Date(Number.isFinite(numeric) ? numeric : value);
        return Number.isFinite(date.getTime()) ? date.toISOString() : '';
      }
      const raw = value?.$date?.$numberLong || value?.$date;
      if (!raw) return '';
      const date = new Date(Number(raw));
      return Number.isFinite(date.getTime()) ? date.toISOString() : '';
    }

    function worldstateExpiry(entry, preferActivation = false) {
      if (!entry) return '';
      if (preferActivation) return browseDate(entry.Activation || entry.activation);
      return browseDate(entry.Expiry || entry.expiry || entry.Expiration || entry.expiration || entry.Activation || entry.activation);
    }

    function soonestExpiry(items = []) {
      return items
        .map(item => worldstateExpiry(item))
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b))[0] || '';
    }

    function activeBrowseItems(items = []) {
      return items.filter(item => {
        const expiry = worldstateExpiry(item);
        return !expiry || new Date(expiry).getTime() > Date.now();
      });
    }

    function firstActive(items = []) {
      return activeBrowseItems(items)[0] || items[0] || null;
    }

    function trackerCard(id, label, title, state, expiresAt, detail, meta = {}) {
      return { id, label, title, state: state || 'Unknown', expiresAt: expiresAt || '', detail: detail || 'No live detail returned.', ...meta };
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[match]));
    }

    function dashboardToken(value) {
      return String(value || '')
        .split('/')
        .pop()
        .replace(/^(SORTIE_BOSS_|MT_|FC_|Void|CT_|CD_|DT_)/, '')
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim() || 'Unknown';
    }

    function dashboardNowMs(worldstate) {
      const seconds = Number(worldstate?.Time);
      return Number.isFinite(seconds) ? seconds * 1000 : Date.now();
    }

    function cycleTrackerCard(id, title, states, totalSeconds, offsetSeconds, nowMs, detail, label = 'Environment') {
      const elapsed = ((Math.floor(nowMs / 1000) - offsetSeconds) % totalSeconds + totalSeconds) % totalSeconds;
      let cursor = 0;
      let current = states[0];
      for (const state of states) {
        cursor += state.seconds;
        if (elapsed < cursor) {
          current = state;
          break;
        }
      }
      const remainingSeconds = Math.max(1, cursor - elapsed);
      return trackerCard(id, label, title, current.name, new Date(Date.now() + remainingSeconds * 1000).toISOString(), detail);
    }

    function parseSpIncursions(text, nowMs) {
      const entries = String(text || '').split(/\r?\n/).map(line => {
        const [epoch, nodes] = line.split(';');
        const start = Number(epoch);
        return {
          start,
          nodes: (nodes || '').split(',').map(item => item.trim()).filter(Boolean)
        };
      }).filter(entry => Number.isFinite(entry.start) && entry.nodes.length);
      const nowSeconds = Math.floor(nowMs / 1000);
      const active = entries.find(entry => entry.start <= nowSeconds && nowSeconds < entry.start + 86400)
        || [...entries].reverse().find(entry => entry.start <= nowSeconds)
        || entries[0];
      if (!active) return null;
      return {
        nodes: active.nodes,
        expiresAt: new Date((active.start + 86400) * 1000).toISOString()
      };
    }

    function parseArbitrationFromArbys(text, nowMs) {
      const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const rows = lines.map(line => {
        const [epochRaw, node] = line.split(',');
        const start = Number(epochRaw);
        return { start, nodeId: (node || '').trim() };
      }).filter(row => Number.isFinite(row.start) && row.nodeId);
      if (!rows.length) return null;
      const nowSec = Math.floor(nowMs / 1000);
      let currentIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].start <= nowSec) currentIndex = i;
        else break;
      }
      if (currentIndex < 0) return null;
      const current = rows[currentIndex];
      const next = rows[currentIndex + 1] || null;
      const resolved = resolveReadableNode(current.nodeId);
      return {
        nodeId: current.nodeId,
        location: resolved.location,
        missionType: resolved.missionType,
        enemy: resolved.enemy,
        activation: new Date(current.start * 1000).toISOString(),
        expiresAt: next ? new Date(next.start * 1000).toISOString() : ''
      };
    }

    function parseArbitrationDetail(text, nowMs) {
      const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const rows = lines.map(line => {
        const [epochRaw, node] = line.split(',');
        const start = Number(epochRaw);
        return { start, nodeId: (node || '').trim() };
      }).filter(row => Number.isFinite(row.start) && row.nodeId);
      if (!rows.length) return {
        id: 'arbitration',
        type: 'arbitration',
        title: 'Arbitration',
        source: 'browse.wf/arbys.txt',
        expiresAt: '',
        row: null
      };
      const nowSec = Math.floor(nowMs / 1000);
      let currentIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].start <= nowSec) currentIndex = i;
        else break;
      }
      const current = currentIndex >= 0 ? rows[currentIndex] : rows[0];
      const next = rows[currentIndex + 1] || null;
      const resolved = resolveReadableNode(current.nodeId);
      const expiresAt = next ? new Date(next.start * 1000).toISOString() : '';
      return {
        id: 'arbitration',
        type: 'arbitration',
        title: 'Arbitration',
        source: 'browse.wf/arbys.txt + solNodes lookup',
        expiresAt,
        row: {
          id: 'arby-current',
          nodeId: current.nodeId,
          location: resolved.location,
          missionType: resolved.missionType,
          enemy: resolved.enemy,
          startsAt: new Date(current.start * 1000).toISOString(),
          expiresAt
        }
      };
    }

    function parseAlertsDetail(alerts = []) {
      return {
        id: 'alerts',
        type: 'alerts',
        title: 'Alerts',
        source: 'worldState Alerts',
        expiresAt: soonestExpiry(alerts),
        rows: alerts.map((row, index) => ({
          id: `alert-${index}`,
          node: row.MissionInfo?.location || row.Node || 'Unknown node',
          missionType: dashboardToken(row.MissionInfo?.missionType || ''),
          faction: dashboardToken(row.MissionInfo?.faction || ''),
          expiresAt: worldstateExpiry(row),
          rawKeys: Object.keys(row || {}).join(', ')
        }))
      };
    }

    function parseEventsDetail(goals = []) {
      return {
        id: 'events',
        type: 'events',
        title: 'Events',
        source: 'worldState Goals',
        expiresAt: soonestExpiry(goals),
        rows: goals.map((row, index) => ({
          id: `event-${index}`,
          tag: dashboardToken(row.Tag || row.Desc || ''),
          node: row.Node || 'Unknown node',
          count: `${row.Count ?? 0} / ${row.Goal ?? '?'}`,
          health: row.HealthPct !== undefined ? `${Math.round(row.HealthPct * 100)}%` : '',
          expiresAt: worldstateExpiry(row),
          rawKeys: Object.keys(row || {}).join(', ')
        }))
      };
    }

    function parseSortieDetail(sortie = {}) {
      const variants = Array.isArray(sortie.Variants) ? sortie.Variants : [];
      return {
        id: 'sortie',
        type: 'sortie',
        title: 'Sortie',
        source: 'worldState Sorties[0]',
        expiresAt: worldstateExpiry(sortie),
        rows: variants.map((variant, index) => ({
          id: `sortie-${index}`,
          node: variant.node || 'Unknown node',
          missionType: dashboardToken(variant.missionType || ''),
          modifier: dashboardToken(variant.modifierType || ''),
          tileset: dashboardToken(variant.tileset || ''),
          expiresAt: worldstateExpiry(sortie)
        })),
        rawSummary: {
          boss: dashboardToken(sortie.Boss || ''),
          reward: dashboardToken(sortie.Reward || '')
        }
      };
    }

    function parseArchonDetail(archon = {}) {
      const missions = Array.isArray(archon.Missions) ? archon.Missions : [];
      return {
        id: 'archon',
        type: 'archon',
        title: 'Archon Hunt',
        source: 'worldState LiteSorties[0]',
        expiresAt: worldstateExpiry(archon),
        rows: missions.map((mission, index) => ({
          id: `archon-${index}`,
          node: mission.node || 'Unknown node',
          missionType: dashboardToken(mission.missionType || ''),
          expiresAt: worldstateExpiry(archon)
        })),
        rawSummary: {
          boss: dashboardToken(archon.Boss || ''),
          reward: dashboardToken(archon.Reward || '')
        }
      };
    }

    function parseSpIncursionsDetail(text, nowMs) {
      const parsed = parseSpIncursions(text, nowMs);
      return {
        id: 'sp-incursions',
        type: 'sp-incursions',
        title: 'Steel Path Incursions',
        source: 'browse.wf/sp-incursions.txt',
        expiresAt: parsed?.expiresAt || '',
        rows: (parsed?.nodes || []).map((node, index) => ({
          id: `sp-${index}`,
          node,
          expiresAt: parsed?.expiresAt || ''
        }))
      };
    }

    function parseWeeklyMissionsDetail(seasonInfo = {}) {
      const acts = Array.isArray(seasonInfo.ActiveChallenges) ? seasonInfo.ActiveChallenges : [];
      return {
        id: 'weekly-missions',
        type: 'weekly',
        title: 'Weekly Missions',
        source: 'worldState SeasonInfo',
        expiresAt: worldstateExpiry(seasonInfo),
        rows: acts.map((act, index) => ({
          id: `act-${index}`,
          name: dashboardToken(act.Challenge || ''),
          daily: Boolean(act.Daily),
          activation: worldstateExpiry({ Activation: act.Activation }, true),
          expiresAt: worldstateExpiry(act),
          rawKeys: Object.keys(act || {}).join(', ')
        })),
        rawSummary: {
          season: seasonInfo.Season ?? '',
          phase: seasonInfo.Phase ?? '',
          affiliation: dashboardToken(seasonInfo.AffiliationTag || '')
        }
      };
    }

    function parseBaroDetail(baro = {}) {
      return {
        id: 'baro',
        type: 'baro',
        title: "Baro Ki'Teer",
        source: 'worldState VoidTraders[0]',
        expiresAt: worldstateExpiry(baro),
        rows: [{
          id: 'baro-row',
          character: dashboardToken(baro.Character || ''),
          node: baro.Node || 'Unknown node',
          activation: worldstateExpiry(baro, true),
          expiresAt: worldstateExpiry(baro),
          rawKeys: Object.keys(baro || {}).join(', ')
        }]
      };
    }

    function findSyndicate(worldstate, tag) {
      return (Array.isArray(worldstate.SyndicateMissions) ? worldstate.SyndicateMissions : [])
        .find(item => item.Tag === tag) || {};
    }

    function findSyndicates(worldstate, tags) {
      return (Array.isArray(worldstate.SyndicateMissions) ? worldstate.SyndicateMissions : [])
        .filter(item => tags.includes(item.Tag));
    }

    function firstActiveGoal(worldstate) {
      return firstActive(Array.isArray(worldstate.Goals) ? worldstate.Goals : []);
    }

    function isBaroActive(baro) {
      const activation = new Date(worldstateExpiry(baro, true)).getTime();
      const expiry = new Date(worldstateExpiry(baro)).getTime();
      const now = Date.now();
      return Number.isFinite(activation) && Number.isFinite(expiry) && activation <= now && now < expiry;
    }

    function trackerCategory(id, cards, error = '', meta = {}) {
      const def = dashboardCategoryDefs.find(item => item.id === id) || { id, title: id, source: 'browse.wf' };
      return { ...def, cards, error, ...meta };
    }

    function mapEnvironmentTrackers(data) {
      const worldstate = data?.worldState || {};
      const nowMs = dashboardNowMs(worldstate);
      const zariman = findSyndicate(worldstate, 'ZarimanSyndicate');
      return trackerCategory('environments', [
        cycleTrackerCard('vallis', 'Orb Vallis', [{ name: 'Warm', seconds: 400 }, { name: 'Cold', seconds: 1200 }], 1600, 0, nowMs, 'Vallis warm/cold cycle computed from browse.wf oracle time.'),
        cycleTrackerCard('cambion', 'Cambion Drift', [{ name: 'Fass', seconds: 4500 }, { name: 'Vome', seconds: 4500 }], 9000, 0, nowMs, 'Cambion cycle computed from browse.wf oracle time.'),
        cycleTrackerCard('duviri', 'Duviri', [{ name: 'Joy', seconds: 8640 }, { name: 'Anger', seconds: 8640 }, { name: 'Envy', seconds: 8640 }, { name: 'Sorrow', seconds: 8640 }, { name: 'Fear', seconds: 8640 }], 43200, 0, nowMs, 'Duviri spiral computed from browse.wf oracle time.'),
        trackerCard('zariman', 'Environment', 'Zariman', zariman.Tag ? 'Bounties available' : 'Unavailable', worldstateExpiry(zariman), zariman.Tag ? `${zariman.Nodes?.length || 0} bounty nodes from ZarimanSyndicate.` : 'No ZarimanSyndicate entry returned.')
      ]);
    }

    function mapMissionRotationTrackers(data) {
      const worldstate = data?.worldState || {};
      const nowMs = dashboardNowMs(worldstate);
      const alerts = activeBrowseItems(Array.isArray(worldstate.Alerts) ? worldstate.Alerts : []);
      const activeMissions = activeBrowseItems(Array.isArray(worldstate.ActiveMissions) ? worldstate.ActiveMissions : []);
      const normalFissures = activeMissions.filter(item => !item.Hard);
      const hardFissures = activeMissions.filter(item => item.Hard);
      const voidStorms = activeBrowseItems(Array.isArray(worldstate.VoidStorms) ? worldstate.VoidStorms : []);
      const invasions = (Array.isArray(worldstate.Invasions) ? worldstate.Invasions : []).filter(item => !item.Completed);
      const normalFissure = firstActive(normalFissures);
      const hardFissure = firstActive(hardFissures);
      const voidStorm = firstActive(voidStorms);
      const invasion = firstActive(invasions);
      const baro = Array.isArray(worldstate.VoidTraders) ? worldstate.VoidTraders[0] || {} : {};
      const sortie = Array.isArray(worldstate.Sorties) ? worldstate.Sorties[0] || {} : {};
      const archon = Array.isArray(worldstate.LiteSorties) ? worldstate.LiteSorties[0] || {} : {};
      const spIncursions = parseSpIncursions(data?.spIncursionsText, nowMs);
      const baroActive = isBaroActive(baro);
      const event = firstActiveGoal(worldstate);
      const weekly = worldstate.SeasonInfo || {};
      const detailNormalFissures = parseFissureDetail('fissures-normal', 'Void Fissures (Normal)', normalFissures, 'worldState ActiveMissions');
      const detailHardFissures = parseFissureDetail('fissures-hard', 'Void Fissures (Steel Path)', hardFissures, 'worldState ActiveMissions');
      const detailInvasions = parseInvasionDetail(invasions);
      const detailVoidStorms = parseVoidStormDetail(voidStorms);
      const detailAlerts = parseAlertsDetail(alerts);
      const detailEvents = parseEventsDetail(Array.isArray(worldstate.Goals) ? worldstate.Goals : []);
      const detailSortie = parseSortieDetail(sortie);
      const detailArchon = parseArchonDetail(archon);
      const detailSpIncursions = parseSpIncursionsDetail(data?.spIncursionsText, nowMs);
      const detailWeekly = parseWeeklyMissionsDetail(weekly);
      const detailBaro = parseBaroDetail(baro);

      return trackerCategory('missions', [
        trackerCard('events', 'Events', 'Events', event ? dashboardToken(event.Tag || event.Desc || 'Active') : 'None active', worldstateExpiry(event), event ? [event.Node, `${event.Count ?? 0}/${event.Goal ?? '?'}`].filter(Boolean).join(' // ') : 'No active Goals entries returned.', { selectable: true }),
        trackerCard('sortie', 'Daily', 'Sortie', dashboardToken(sortie.Boss || sortie.Faction || 'Active'), worldstateExpiry(sortie), `${sortie.Variants?.length || 0} missions // ${dashboardToken(sortie.Reward || 'Reward table unknown')}`, { selectable: true }),
        trackerCard('archon', 'Weekly', 'Archon Hunt', dashboardToken(archon.Boss || 'Active'), worldstateExpiry(archon), `${archon.Missions?.length || 0} missions // ${dashboardToken(archon.Reward || 'Reward table unknown')}`, { selectable: true }),
        trackerCard('sp-incursions', 'Steel Path', 'Steel Path Incursions', spIncursions ? `${spIncursions.nodes.length} missions` : 'Unavailable', spIncursions?.expiresAt, spIncursions ? spIncursions.nodes.join(' // ') : 'sp-incursions.txt did not contain a usable current row.', { selectable: true }),
        trackerCard('weekly-missions', 'Weekly', 'Weekly Missions', weekly.Season ? `Nightwave season ${weekly.Season}` : 'Unavailable', worldstateExpiry(weekly), `${weekly.ActiveChallenges?.length || 0} active weekly/daily acts.`, { selectable: true }),
        trackerCard('baro', 'Vendor', "Baro Ki'Teer", baroActive ? 'Active' : 'Arrives', worldstateExpiry(baro, !baroActive), [dashboardToken(baro.Character), baro.Node || 'Location pending'].filter(Boolean).join(' // '), { selectable: true }),
        trackerCard('fissures-normal', 'Relics', 'Void Fissures (Normal)', `${normalFissures.length} active`, soonestExpiry(normalFissures), normalFissure ? [dashboardToken(normalFissure.Modifier), dashboardToken(normalFissure.MissionType), normalFissure.Node].filter(Boolean).join(' // ') : 'No normal fissures returned.', { selectable: true }),
        trackerCard('fissures-hard', 'Steel Path', 'Void Fissures (Steel Path)', `${hardFissures.length} active`, soonestExpiry(hardFissures), hardFissure ? [dashboardToken(hardFissure.Modifier), dashboardToken(hardFissure.MissionType), hardFissure.Node].filter(Boolean).join(' // ') : 'No Steel Path fissures returned.', { selectable: true }),
        trackerCard('void-storms', 'Railjack', 'Void Storms (Railjack)', `${voidStorms.length} active`, soonestExpiry(voidStorms), voidStorm ? [dashboardToken(voidStorm.ActiveMissionTier), voidStorm.Node].filter(Boolean).join(' // ') : 'No active Void Storms returned.', { selectable: true }),
        trackerCard('invasions', 'Star Chart', 'Invasions', `${invasions.length} active`, '', invasion ? [invasion.Node, dashboardToken(invasion.Faction), 'vs', dashboardToken(invasion.DefenderFaction)].filter(Boolean).join(' ') : 'No active invasions returned by oracle.browse.wf.', { selectable: true, hideTimer: true })
      ], '', { details: [detailAlerts, detailEvents, detailSortie, detailArchon, detailSpIncursions, detailWeekly, detailBaro, detailNormalFissures, detailHardFissures, detailInvasions, detailVoidStorms] });
    }

    function mergeUniqueEntries(entries = []) {
      const seen = new Set();
      return entries.filter(entry => {
        const key = `${entry.name}|${entry.factionLocation}|${entry.tier}|${entry.rewards}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function buildDetailEntry(id, source) {
      return {
        id,
        name: source.name || 'Unknown mission',
        tier: source.tier || 'Tier unavailable',
        rewards: source.rewards || 'Reward band unavailable',
        factionLocation: source.factionLocation || 'Location unavailable',
        expiresAt: source.expiresAt || '',
        detail: source.detail || ''
      };
    }

    function parseFissureDetail(id, title, fissures = [], sourceLabel) {
      const rows = fissures.map((row, index) => ({
        id: `${id}-${index}`,
        node: row.Node || row.node || 'Unknown node',
        missionType: dashboardToken(row.MissionType || row.missionType || ''),
        tier: dashboardToken(row.Modifier || row.modifier || ''),
        modifier: dashboardToken(row.Modifier || row.modifier || ''),
        hard: Boolean(row.Hard),
        seed: row.Seed ?? row.seed ?? 'n/a',
        region: row.Region ?? row.region ?? 'n/a',
        activation: worldstateExpiry({ Activation: row.Activation || row.activation }, true),
        expiresAt: worldstateExpiry(row)
      }));
      const fallbackRaw = fissures[0] ? Object.keys(fissures[0]).join(', ') : '';
      return {
        id,
        type: 'fissures',
        title,
        source: sourceLabel,
        expiresAt: soonestExpiry(fissures),
        rows: rows.length ? rows : (fallbackRaw ? [{
          id: `${id}-fallback`,
          node: 'No fissure rows parsed',
          missionType: 'Raw schema only',
          tier: 'Raw schema only',
          modifier: fallbackRaw,
          hard: false,
          seed: 'n/a',
          region: 'n/a',
          activation: '',
          expiresAt: soonestExpiry(fissures)
        }] : [])
      };
    }

    function parseInvasionDetail(invasions = []) {
      const rows = invasions.map((row, index) => ({
          id: `invasion-${index}`,
          node: row.Node || 'Unknown node',
          attacker: dashboardToken(row.Faction || ''),
          defender: dashboardToken(row.DefenderFaction || ''),
          progress: `${row.Count ?? '?'} / ${row.Goal ?? '?'}`,
          locTag: row.LocTag || '',
          activation: worldstateExpiry({ Activation: row.Activation }, true),
          rewardA: dashboardToken(row.AttackerReward?.countedItems?.[0]?.ItemType || ''),
          rewardD: dashboardToken(row.DefenderReward?.countedItems?.[0]?.ItemType || ''),
          attackerSeed: row.AttackerMissionInfo?.seed ?? 'n/a',
          defenderSeed: row.DefenderMissionInfo?.seed ?? 'n/a',
          rawKeys: Object.keys(row || {}).join(', ')
      }));
      return {
        id: 'invasions',
        type: 'invasions',
        title: 'Invasions',
        source: 'worldState Invasions',
        expiresAt: '',
        rows: rows.length ? rows : []
      };
    }

    function parseVoidStormDetail(voidStorms = []) {
      const rows = voidStorms.map((row, index) => ({
        id: `voidstorm-${index}`,
        node: row.Node || 'Unknown node',
        tier: dashboardToken(row.ActiveMissionTier || ''),
        activation: worldstateExpiry({ Activation: row.Activation }, true),
        expiresAt: worldstateExpiry(row),
        rawKeys: Object.keys(row || {}).join(', ')
      }));
      return {
        id: 'void-storms',
        type: 'void-storms',
        title: 'Void Storms (Railjack)',
        source: 'worldState VoidStorms',
        expiresAt: soonestExpiry(voidStorms),
        rows: rows.length ? rows : []
      };
    }

    function parseArchimedeaDetail(id, title, conquest = {}, sourceType) {
      const missionRows = Array.isArray(conquest.Missions) ? conquest.Missions.map((mission, index) => ({
        id: `${id}-mission-${index}`,
        missionType: dashboardToken(mission.missionType || ''),
        faction: dashboardToken(mission.faction || ''),
        deviation: dashboardToken(mission.difficulties?.[0]?.deviation || ''),
        risks: Array.isArray(mission.difficulties?.[0]?.risks) ? mission.difficulties[0].risks.map(risk => dashboardToken(risk)).join(' // ') : '',
        expiresAt: worldstateExpiry(conquest)
      })) : [];
      const rawSummary = {
        type: conquest.Type || sourceType,
        variables: Array.isArray(conquest.Variables) ? conquest.Variables.map(value => dashboardToken(value)).join(' // ') : '',
        randomSeed: conquest.RandomSeed ?? 'n/a'
      };
      return {
        id,
        type: 'archimedea',
        title,
        source: `worldState Conquests ${sourceType}`,
        expiresAt: worldstateExpiry(conquest),
        rows: missionRows,
        rawSummary
      };
    }

    function parseGeneralBountiesDetail(data, worldstate) {
      const locationBounties = data?.locationBounties || {};
      const expiry = browseDate(locationBounties.expiry);
      const tags = ['CetusSyndicate', 'SolarisSyndicate', 'EntratiSyndicate'];
      const groups = tags.map(tag => findSyndicate(worldstate, tag)).filter(group => group.Tag);
      const allEntries = [];

      console.info('[orbiter] bounty raw keys', {
        locationBountiesKeys: Object.keys(locationBounties),
        cetusLocationKeys: Object.keys(locationBounties.CetusSyndicate || {}),
        solarisLocationKeys: Object.keys(locationBounties.SolarisSyndicate || {}),
        entratiLocationKeys: Object.keys(locationBounties.EntratiSyndicate || {}),
        cetusWorldstateKeys: Object.keys(groups.find(group => group.Tag === 'CetusSyndicate') || {}),
        solarisWorldstateKeys: Object.keys(groups.find(group => group.Tag === 'SolarisSyndicate') || {}),
        entratiWorldstateKeys: Object.keys(groups.find(group => group.Tag === 'EntratiSyndicate') || {})
      });

      groups.forEach(group => {
        const groupExpiry = worldstateExpiry(group) || expiry;
        const groupLocationData = locationBounties[group.Tag] || {};
        const jobIndex = new Map((group.Jobs || []).map(job => [job.jobType, job]));

        Object.entries(groupLocationData).forEach(([locationName, bountyJobs]) => {
          (bountyJobs || []).forEach((jobType, index) => {
            const job = jobIndex.get(jobType) || {};
            allEntries.push(buildDetailEntry(`bounty-${group.Tag}-${locationName}-${index}`, {
              name: dashboardToken(jobType),
              tier: [
                job.minEnemyLevel !== undefined && job.maxEnemyLevel !== undefined ? `Lvl ${job.minEnemyLevel}-${job.maxEnemyLevel}` : '',
                job.masteryReq !== undefined ? `MR ${job.masteryReq}` : '',
                job.endless ? 'Endless' : '',
                job.isVault ? 'Vault' : ''
              ].filter(Boolean).join(' // ') || 'Rotation tier data only',
              rewards: dashboardToken(job.rewards || ''),
              factionLocation: `${dashboardToken(group.Tag)} // ${dashboardToken(locationName)}`,
              expiresAt: groupExpiry,
              detail: `Source: location-bounties + SyndicateMissions`
            }));
          });
        });

        if (!Object.keys(groupLocationData).length && Array.isArray(group.Jobs) && group.Jobs.length) {
          group.Jobs.forEach((job, index) => {
            allEntries.push(buildDetailEntry(`bounty-job-${group.Tag}-${index}`, {
              name: dashboardToken(job.jobType || `Bounty ${index + 1}`),
              tier: [
                job.minEnemyLevel !== undefined && job.maxEnemyLevel !== undefined ? `Lvl ${job.minEnemyLevel}-${job.maxEnemyLevel}` : '',
                job.masteryReq !== undefined ? `MR ${job.masteryReq}` : '',
                job.endless ? 'Endless' : '',
                job.isVault ? 'Vault' : ''
              ].filter(Boolean).join(' // ') || 'Tier data only',
              rewards: dashboardToken(job.rewards || ''),
              factionLocation: dashboardToken(group.Tag),
              expiresAt: groupExpiry,
              detail: `Source: SyndicateMissions Jobs`
            }));
          });
        }
      });

      const entries = mergeUniqueEntries(allEntries);
      if (!entries.length && (groups.length || Object.keys(locationBounties).length > 1)) {
        entries.push(buildDetailEntry('bounty-fallback', {
          name: 'Open-world bounty rotation',
          tier: 'Rotation data available',
          rewards: 'Reward band data pending in source',
          factionLocation: 'Cetus / Solaris / Entrati',
          expiresAt: expiry || soonestExpiry(groups),
          detail: 'location-bounties returned section metadata but no row list.'
        }));
      }
      return {
        id: 'open-world-bounties',
        title: 'Bounties',
        entries,
        expiresAt: expiry || soonestExpiry(groups),
        source: 'location-bounties + worldState SyndicateMissions'
      };
    }

    function parseHoldfastsDetail(data, worldstate) {
      const holdfasts = findSyndicate(worldstate, 'ZarimanSyndicate');
      const cycle = data?.bountyCycle?.bounties?.ZarimanSyndicate || [];
      const cycleExpiry = browseDate(data?.bountyCycle?.expiry) || worldstateExpiry(holdfasts);
      console.info('[orbiter] holdfasts raw keys', {
        bountyCycleKeys: Object.keys(data?.bountyCycle || {}),
        holdfastCycleRowKeys: Object.keys(cycle[0] || {}),
        holdfastWorldstateKeys: Object.keys(holdfasts || {})
      });
      const entries = cycle.map((row, index) => buildDetailEntry(`holdfasts-${index}`, {
        name: dashboardToken(row.challenge || row.node || `Holdfast mission ${index + 1}`),
        tier: `Rotation ${data?.bountyCycle?.rot || '?'}`,
        rewards: `Reward band rotation ${data?.bountyCycle?.rot || '?'}`,
        factionLocation: `Zariman // ${row.node || 'Unknown node'}`,
        expiresAt: cycleExpiry,
        detail: `Faction: ${dashboardToken(data?.bountyCycle?.zarimanFaction || '')}`
      }));
      if (!entries.length && data?.bountyCycle?.rot) {
        entries.push(buildDetailEntry('holdfasts-fallback', {
          name: 'Zariman rotation',
          tier: `Rotation ${data.bountyCycle.rot}`,
          rewards: `Reward band rotation ${data.bountyCycle.rot}`,
          factionLocation: 'Zariman',
          expiresAt: cycleExpiry,
          detail: 'bounty-cycle returned rotation metadata without mission rows.'
        }));
      }
      return {
        id: 'holdfasts',
        title: 'The Holdfasts',
        entries,
        expiresAt: cycleExpiry,
        source: 'bounty-cycle.ZarimanSyndicate'
      };
    }

    function parseCaviaDetail(data, worldstate) {
      const cavia = findSyndicate(worldstate, 'EntratiLabSyndicate');
      const cycle = data?.bountyCycle?.bounties?.EntratiLabSyndicate || [];
      const cycleExpiry = browseDate(data?.bountyCycle?.expiry) || worldstateExpiry(cavia);
      console.info('[orbiter] cavia raw keys', {
        bountyCycleKeys: Object.keys(data?.bountyCycle || {}),
        caviaCycleRowKeys: Object.keys(cycle[0] || {}),
        caviaWorldstateKeys: Object.keys(cavia || {})
      });
      const entries = cycle.map((row, index) => buildDetailEntry(`cavia-${index}`, {
        name: dashboardToken(row.challenge || row.node || `Cavia mission ${index + 1}`),
        tier: `Rotation ${data?.bountyCycle?.rot || '?'}`,
        rewards: `Reward band rotation ${data?.bountyCycle?.rot || '?'}`,
        factionLocation: `Cavia // ${row.node || 'Unknown node'}`,
        expiresAt: cycleExpiry,
        detail: 'Source: oracle.browse.wf bounty-cycle'
      }));
      if (!entries.length && data?.bountyCycle?.rot) {
        entries.push(buildDetailEntry('cavia-fallback', {
          name: 'Cavia rotation',
          tier: `Rotation ${data.bountyCycle.rot}`,
          rewards: `Reward band rotation ${data.bountyCycle.rot}`,
          factionLocation: 'Cavia',
          expiresAt: cycleExpiry,
          detail: 'bounty-cycle returned rotation metadata without mission rows.'
        }));
      }
      return {
        id: 'cavia',
        title: 'Cavia',
        entries,
        expiresAt: cycleExpiry,
        source: 'bounty-cycle.EntratiLabSyndicate'
      };
    }

    function parseHexDetail(data, worldstate) {
      const hex = findSyndicate(worldstate, 'HexSyndicate');
      const cycle = data?.bountyCycle?.bounties?.HexSyndicate || [];
      const cycleExpiry = browseDate(data?.bountyCycle?.expiry) || worldstateExpiry(hex);
      console.info('[orbiter] hex raw keys', {
        bountyCycleKeys: Object.keys(data?.bountyCycle || {}),
        hexCycleRowKeys: Object.keys(cycle[0] || {}),
        hexWorldstateKeys: Object.keys(hex || {})
      });
      const entries = cycle.map((row, index) => buildDetailEntry(`hex-${index}`, {
        name: dashboardToken(row.challenge || row.node || `Hex mission ${index + 1}`),
        tier: `Rotation ${data?.bountyCycle?.rot || '?'}`,
        rewards: row.ally ? `Ally: ${dashboardToken(row.ally)}` : `Reward band rotation ${data?.bountyCycle?.rot || '?'}`,
        factionLocation: `The Hex // ${row.node || 'Unknown node'}`,
        expiresAt: cycleExpiry,
        detail: row.ally ? `Companion: ${dashboardToken(row.ally)}` : 'Source: oracle.browse.wf bounty-cycle'
      }));
      if (!entries.length && data?.bountyCycle?.rot) {
        entries.push(buildDetailEntry('hex-fallback', {
          name: 'Hex rotation',
          tier: `Rotation ${data.bountyCycle.rot}`,
          rewards: `Reward band rotation ${data.bountyCycle.rot}`,
          factionLocation: 'The Hex',
          expiresAt: cycleExpiry,
          detail: 'bounty-cycle returned rotation metadata without mission rows.'
        }));
      }
      return {
        id: 'hex',
        title: 'The Hex',
        entries,
        expiresAt: cycleExpiry,
        source: 'bounty-cycle.HexSyndicate'
      };
    }

    function mapBountyTrackers(data) {
      const worldstate = data?.worldState || {};
      const detail = parseGeneralBountiesDetail(data, worldstate);
      return trackerCategory('bounties', [
        trackerCard('open-world-bounties', 'Selectable', 'Bounties', detail.entries.length ? `${detail.entries.length} rows` : 'Unavailable', detail.expiresAt, detail.entries.length ? 'Open-world bounty rotations from Cetus, Solaris, and Entrati.' : 'No open-world bounty rows returned.', { selectable: true })
      ], '', { details: [detail] });
    }

    function mapSyndicateMissionTrackers(data) {
      const worldstate = data?.worldState || {};
      const holdfasts = parseHoldfastsDetail(data, worldstate);
      const cavia = parseCaviaDetail(data, worldstate);
      const hex = parseHexDetail(data, worldstate);
      return trackerCategory('syndicate-missions', [
        trackerCard('holdfasts', 'Selectable', 'The Holdfasts', holdfasts.entries.length ? `${holdfasts.entries.length} rows` : 'Unavailable', holdfasts.expiresAt, holdfasts.entries.length ? 'Zariman bounty-cycle challenge rows.' : 'No Holdfast challenge rows returned.', { selectable: true }),
        trackerCard('cavia', 'Selectable', 'Cavia', cavia.entries.length ? `${cavia.entries.length} rows` : 'Unavailable', cavia.expiresAt, cavia.entries.length ? 'Entrati Labs bounty-cycle challenge rows.' : 'No Cavia challenge rows returned.', { selectable: true }),
        trackerCard('hex', 'Selectable', 'The Hex', hex.entries.length ? `${hex.entries.length} rows` : 'Unavailable', hex.expiresAt, hex.entries.length ? 'Hex bounty-cycle challenge rows.' : 'No Hex challenge rows returned.', { selectable: true })
      ], '', { details: [holdfasts, cavia, hex] });
    }

    function mapEndgameTrackers(data) {
      const worldstate = data?.worldState || {};
      const deep = (Array.isArray(worldstate.Conquests) ? worldstate.Conquests : []).find(item => item.Type === 'CT_LAB') || {};
      const temporal = (Array.isArray(worldstate.Conquests) ? worldstate.Conquests : []).find(item => item.Type === 'CT_HEX') || {};
      const deepDetail = parseArchimedeaDetail('deep-archimedea', 'Deep Archimedea', deep, 'CT_LAB');
      const temporalDetail = parseArchimedeaDetail('temporal-archimedea', 'Temporal Archimedea', temporal, 'CT_HEX');
      return trackerCategory('endgame', [
        trackerCard('deep-archimedea', 'Endgame', 'Deep Archimedea', deep.Type ? `${deep.Missions?.length || 0} missions` : 'Unavailable', worldstateExpiry(deep), deep.Type ? deep.Missions?.map(mission => dashboardToken(mission.missionType)).join(' // ') : 'No CT_LAB conquest entry returned.', { selectable: true }),
        trackerCard('temporal-archimedea', 'Endgame', 'Temporal Archimedea', temporal.Type ? `${temporal.Missions?.length || 0} missions` : 'Unavailable', worldstateExpiry(temporal), temporal.Type ? temporal.Missions?.map(mission => dashboardToken(mission.missionType)).join(' // ') : 'No CT_HEX conquest entry returned.', { selectable: true })
      ], '', { details: [deepDetail, temporalDetail] });
    }

    function mapUtilityTrackers(data) {
      const worldstate = data?.worldState || {};
      const news = (Array.isArray(worldstate.Events) ? worldstate.Events : []).find(item => item.Messages?.length) || {};
      const deal = Array.isArray(worldstate.DailyDeals) ? worldstate.DailyDeals[0] || {} : {};
      const baro = Array.isArray(worldstate.VoidTraders) ? worldstate.VoidTraders[0] || {} : {};
      const vault = worldstate.PrimeVaultTraders || {};
      let tmp = {};
      try {
        tmp = typeof worldstate.Tmp === 'string' ? JSON.parse(worldstate.Tmp || '{}') : (worldstate.Tmp || {});
      } catch (error) {
        console.warn('[orbiter] dashboard KinePage Tmp parse failed', error);
      }
      return trackerCategory('utility', [
        trackerCard('news', 'Info', 'News', news.Messages?.length ? `${news.Messages.length} messages` : 'Unavailable', worldstateExpiry(news), news.Messages?.find(message => message.LanguageCode === 'en')?.Message || news.Prop || 'No Events message returned.'),
        trackerCard('darvo', 'Store', "Darvo's Deal", deal.StoreItem ? `${deal.SalePrice ?? '?'} credits` : 'Unavailable', worldstateExpiry(deal), deal.StoreItem ? `${dashboardToken(deal.StoreItem)} // ${deal.Discount ?? 0}% off // ${deal.AmountSold ?? 0}/${deal.AmountTotal ?? '?'}` : 'No DailyDeals entry returned.'),
        trackerCard('vendors', 'Vendor', 'Vendors', [baro.Character, vault.Node].filter(Boolean).length ? 'Vendor data loaded' : 'Unavailable', worldstateExpiry(baro) || worldstateExpiry(vault), [dashboardToken(baro.Character), baro.Node, vault.Node ? `Prime Vault: ${vault.Manifest?.length || 0} items` : ''].filter(Boolean).join(' // ') || 'No trader entries returned.'),
        trackerCard('kinepage', 'Info', 'KinePage', tmp?.pgr ? 'Available' : 'Unavailable', tmp?.pgr?.ts ? new Date(Number(tmp.pgr.ts) * 1000).toISOString() : '', tmp?.pgr?.en || 'No KinePage payload found in browse.wf oracle Tmp data.')
      ]);
    }

    function mapBrowseWorldstateToDashboardCategories(data) {
      return [
        { id: 'environments', map: mapEnvironmentTrackers },
        { id: 'missions', map: mapMissionRotationTrackers },
        { id: 'bounties', map: mapBountyTrackers },
        { id: 'syndicate-missions', map: mapSyndicateMissionTrackers },
        { id: 'utility', map: mapUtilityTrackers }
      ].map(entry => {
        try {
          return entry.map(data);
        } catch (error) {
          logClientError(`dashboard category map ${entry.id}`, error);
          return trackerCategory(entry.id, [], error?.message || 'Category mapping failed.');
        }
      });
    }

    function statusCard(id, label, title, state, expiresAt, detail = '', options = {}) {
      return trackerCard(id, label, title, state || 'Unavailable', expiresAt || '', detail || 'No details returned.', options);
    }

    function worldstateArray(data, key) {
      const component = data?.[key];
      if (Array.isArray(component)) return component;
      return Array.isArray(component?.data) ? component.data : [];
    }

    function worldstateIso(value) {
      if (!value) return '';
      if (typeof value === 'number') return new Date(value > 10_000_000_000 ? value : value * 1000).toISOString();
      if (typeof value === 'string') {
        const trimmed = value.trim();
        const numeric = Number(trimmed);
        const date = new Date(Number.isFinite(numeric) ? (numeric > 10_000_000_000 ? numeric : numeric * 1000) : trimmed);
        return Number.isFinite(date.getTime()) ? date.toISOString() : '';
      }
      return browseDate(value);
    }

    function worldstateTimeMs(value) {
      if (!value) return NaN;
      if (typeof value === 'number') return value > 10_000_000_000 ? value : value * 1000;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        const numeric = Number(trimmed);
        return Number.isFinite(numeric)
          ? (numeric > 10_000_000_000 ? numeric : numeric * 1000)
          : new Date(trimmed).getTime();
      }
      const iso = browseDate(value);
      return iso ? new Date(iso).getTime() : NaN;
    }

    function worldstateEnd(row = {}) {
      return worldstateIso(row?.expiry || row?.expiresAt || row?.end || row?.expiration || row?.Expiry || row?.Expiration);
    }

    function worldstateActivation(row = {}) {
      return worldstateIso(row?.activation || row?.start || row?.Activation);
    }

    function worldstateSoonestEnd(rows = []) {
      return rows
        .map(row => row?.expiresAt || worldstateEnd(row))
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b))[0] || '';
    }

    function rewardName(item) {
      if (!item) return '';
      if (typeof item === 'string') return item;
      const count = Number(item.count);
      return `${Number.isFinite(count) && count > 1 ? `${count}x ` : ''}${item.name || item.item || item.type || ''}`.trim();
    }

    function rewardsText(rewards, fallback = '') {
      const flat = [];
      const collect = value => {
        if (!value) return;
        if (Array.isArray(value)) return value.forEach(collect);
        const text = rewardName(value);
        if (text) flat.push(text);
      };
      collect(rewards);
      return flat.slice(0, 6).join(', ') || fallback;
    }

    function genericDetail(id, title, entries, source = 'WarframeStat.us') {
      return { id, title, entries, source, expiresAt: worldstateSoonestEnd(entries), type: 'generic' };
    }

    function hasRenderableDetail(detail) {
      if (!detail || typeof detail !== 'object') return false;
      if ((detail.entries || []).length || (detail.rows || []).length || detail.row) return true;
      if (detail.rawSummary && typeof detail.rawSummary === 'object' && Object.keys(detail.rawSummary).length) return true;
      const ignored = new Set(['id', 'title', 'source', 'expiresAt', 'entries', 'rows', 'row', 'type', 'rawSummary']);
      return Object.keys(detail).some(key => {
        if (ignored.has(key)) return false;
        const value = detail[key];
        if (value === null || value === undefined || value === '') return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
      });
    }

    function compactCategory(id, cards = [], details = []) {
      const placeholderPattern = /\b(unavailable|unknown|no data|no .*returned|empty)\b/i;
      const usefulCards = cards
        .filter(Boolean)
        .filter(card => !placeholderPattern.test([card.title, card.state, card.detail].filter(Boolean).join(' ')))
        .filter(card => card.expiresAt || card.hideTimer);
      if (!usefulCards.length) return null;
      const usefulIds = new Set(usefulCards.map(card => card.id));
      const usefulDetails = details
        .filter(Boolean)
        .filter(detail => usefulIds.has(detail.id))
        .filter(hasRenderableDetail);
      return { ...trackerCategory(id, usefulCards), details: usefulDetails };
    }

    function cycleFromWarframeStat(name, row) {
      if (!row || typeof row !== 'object') return null;
      const state = row.state || (row.isWarm ? 'Warm' : row.isDay ? 'Day' : '');
      const rawExpiry = row.expiry || row.expiresAt || row.end || row.expiration;
      const expiryTime = worldstateTimeMs(rawExpiry);
      const remainingMs = expiryTime - Date.now();
      if (TRACKER_DEBUG) {
        console.log('[TRACKER_DEBUG] cycle', {
          name,
          rawExpiry,
          parsedExpiry: Number.isFinite(expiryTime) ? new Date(expiryTime).toISOString() : null,
          remainingMs
        });
      }
      if (!state || !Number.isFinite(expiryTime)) return null;
      return { state: dashboardToken(state), expiresAt: new Date(expiryTime).toISOString(), expired: remainingMs <= 0 };
    }

    function hasExpiredWarframeStatCycles(data) {
      const rows = [
        data?.cetusCycle || data?.cycles?.cetusCycle,
        data?.earthCycle || data?.cycles?.earthCycle,
        data?.vallisCycle || data?.cycles?.vallisCycle,
        data?.cambionCycle || data?.cycles?.cambionCycle
      ].filter(Boolean);
      return rows.some(row => {
        const expiryTime = worldstateTimeMs(row.expiry || row.expiresAt || row.end || row.expiration);
        return Number.isFinite(expiryTime) && expiryTime <= Date.now();
      });
    }

    function activeWorldstateItems(items = []) {
      return items.filter(item => {
        const expiry = worldstateEnd(item);
        return !expiry || new Date(expiry).getTime() > Date.now();
      });
    }

    function warframeStatRewardText(value, fallback = '') {
      if (!value) return fallback;
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.map(item => warframeStatRewardText(item, '')).filter(Boolean).join(', ') || fallback;
      if (Array.isArray(value.items)) return value.items.join(', ') || fallback;
      if (Array.isArray(value.countedItems)) return value.countedItems.map(item => rewardName(item)).filter(Boolean).join(', ') || fallback;
      return rewardName(value) || fallback;
    }

    function mapWarframeStatWorldstateToDashboardCategories(data) {
      if (data?.upstreamError) {
        return unavailableDashboardCategories(data.message || 'WarframeStat.us returned an empty worldstate body.');
      }

      const cycles = [
        ['cetus', 'Cetus', data?.cetusCycle || data?.cycles?.cetusCycle],
        ['earth', 'Earth', data?.earthCycle || data?.cycles?.earthCycle],
        ['vallis', 'Orb Vallis', data?.vallisCycle || data?.cycles?.vallisCycle],
        ['cambion', 'Cambion Drift', data?.cambionCycle || data?.cycles?.cambionCycle]
      ];
      const cycleCards = cycles.map(([id, title, row]) => {
        const cycle = cycleFromWarframeStat(title, row) || {};
        return cycle.expiresAt && !cycle.expired ? statusCard(`cycle-${id}`, 'Cycle', title, cycle.state, cycle.expiresAt, `WarframeStat.us cycle id: ${row?.id || id}`) : null;
      }).filter(Boolean);

      const fissures = activeWorldstateItems(worldstateArray(data, 'fissures'));
      const invasions = worldstateArray(data, 'invasions').filter(row => !row.completed);
      const alerts = activeWorldstateItems(worldstateArray(data, 'alerts'));
      const events = activeWorldstateItems(worldstateArray(data, 'events'));
      const sortie = data?.sortie || {};
      const voidTrader = data?.voidTrader || {};
      const steelPath = data?.steelPath || {};
      const archonHunt = data?.archonHunt || {};
      const arbitration = data?.arbitration || {};
      const nightwave = data?.nightwave || {};
      const dailyDeals = activeWorldstateItems(worldstateArray(data, 'dailyDeals'));
      const syndicateMissions = activeWorldstateItems(worldstateArray(data, 'syndicateMissions'));
      const normalFissures = fissures.filter(row => !row.isHard && !row.hard && !row.isStorm);
      const hardFissures = fissures.filter(row => row.isHard || row.hard);
      const voidStorms = fissures.filter(row => row.isStorm || row.isVoidStorm || row.storm);
      const sortieMissions = Array.isArray(sortie.missions) ? sortie.missions : (Array.isArray(sortie.variants) ? sortie.variants : []);
      const archonMissions = Array.isArray(archonHunt.missions) ? archonHunt.missions : (Array.isArray(archonHunt.variants) ? archonHunt.variants : []);
      const nightwaveChallenges = Array.isArray(nightwave.activeChallenges) ? nightwave.activeChallenges : [];

      const missionCards = [
        sortie.id ? statusCard('sortie', 'Daily', 'Sortie', sortie.boss || sortie.faction || 'Active', worldstateEnd(sortie), `${sortieMissions.length} missions // ${sortie.faction || 'Faction pending'}`, { selectable: true }) : null,
        archonHunt.id ? statusCard('archon', 'Weekly', 'Archon Hunt', archonHunt.boss || archonHunt.faction || 'Active', worldstateEnd(archonHunt), `${archonMissions.length} missions // ${archonHunt.rewardPool || 'Reward pool pending'}`, { selectable: true }) : null,
        steelPath.currentReward ? statusCard('steel-path', 'Steel Path', 'Steel Path Honors', steelPath.currentReward.name, worldstateEnd(steelPath), `${steelPath.currentReward.cost ?? '?'} Steel Essence`, { selectable: true }) : null,
        arbitration.id && !arbitration.expired ? statusCard('arbitration', 'Arbitration', 'Arbitration', arbitration.type || 'Active', worldstateEnd(arbitration), [arbitration.node, arbitration.enemy].filter(Boolean).join(' // '), { selectable: true }) : null,
        normalFissures.length ? statusCard('fissures-normal', 'Relics', 'Void Fissures', `${normalFissures.length} active`, worldstateSoonestEnd(normalFissures), `${normalFissures[0].tier || ''} ${normalFissures[0].missionType || ''} // ${normalFissures[0].node || ''}`.trim(), { selectable: true }) : null,
        hardFissures.length ? statusCard('fissures-hard', 'Steel Path', 'Steel Path Fissures', `${hardFissures.length} active`, worldstateSoonestEnd(hardFissures), `${hardFissures[0].tier || ''} ${hardFissures[0].missionType || ''} // ${hardFissures[0].node || ''}`.trim(), { selectable: true }) : null,
        voidStorms.length ? statusCard('void-storms', 'Railjack', 'Void Storms', `${voidStorms.length} active`, worldstateSoonestEnd(voidStorms), `${voidStorms[0].tier || ''} ${voidStorms[0].missionType || ''} // ${voidStorms[0].node || ''}`.trim(), { selectable: true }) : null,
        invasions.length ? statusCard('invasions', 'Invasions', 'Invasions', `${invasions.length} active`, '', `${invasions[0].node || 'Invasion'} // ${invasions[0].attacker?.faction || ''} vs ${invasions[0].defender?.faction || ''}`, { selectable: true, hideTimer: true }) : null
      ];

      const missionDetails = [
        genericDetail('sortie', 'Sortie', sortieMissions.map((row, index) => ({ id: `sortie-${index}`, name: row.node || `Sortie ${index + 1}`, tier: row.missionType || row.type || '', factionLocation: sortie.faction || '', rewards: sortie.rewardPool || 'Sortie reward table', detail: row.modifier || row.modifierDescription || '', expiresAt: worldstateEnd(sortie) }))),
        genericDetail('archon', 'Archon Hunt', archonMissions.map((row, index) => ({ id: `archon-${index}`, name: row.node || `Archon ${index + 1}`, tier: row.missionType || row.type || '', factionLocation: archonHunt.faction || '', rewards: archonHunt.rewardPool || 'Archon reward table', detail: archonHunt.boss || '', expiresAt: worldstateEnd(archonHunt) }))),
        genericDetail('steel-path', 'Steel Path Honors', (steelPath.rotation || []).map((row, index) => ({ id: `steel-path-${index}`, name: row.name || `Reward ${index + 1}`, tier: `${row.cost ?? '?'} Steel Essence`, factionLocation: 'Teshin', rewards: row.name || '', detail: row === steelPath.currentReward ? 'Current reward' : '', expiresAt: worldstateEnd(steelPath) }))),
        genericDetail('arbitration', 'Arbitration', arbitration.id ? [{ id: 'arbitration-current', name: arbitration.node || 'Arbitration', tier: arbitration.type || '', factionLocation: arbitration.enemy || '', rewards: 'Arbitration honors', detail: arbitration.archwing ? 'Archwing' : '', expiresAt: worldstateEnd(arbitration) }] : []),
        genericDetail('fissures-normal', 'Void Fissures', normalFissures.map((row, index) => ({ id: `fissure-${index}`, name: row.node || 'Fissure', tier: row.tier || '', factionLocation: [row.enemy, row.missionType].filter(Boolean).join(' // '), rewards: 'Relic rewards', detail: `Steel Path: ${row.isHard ? 'yes' : 'no'}`, expiresAt: worldstateEnd(row) }))),
        genericDetail('fissures-hard', 'Steel Path Fissures', hardFissures.map((row, index) => ({ id: `hard-fissure-${index}`, name: row.node || 'Fissure', tier: row.tier || '', factionLocation: [row.enemy, row.missionType].filter(Boolean).join(' // '), rewards: 'Steel Path relic rewards', detail: `Void Storm: ${row.isStorm ? 'yes' : 'no'}`, expiresAt: worldstateEnd(row) }))),
        genericDetail('void-storms', 'Void Storms', voidStorms.map((row, index) => ({ id: `voidstorm-${index}`, name: row.node || 'Void Storm', tier: row.tier || '', factionLocation: [row.enemy, row.missionType].filter(Boolean).join(' // '), rewards: 'Railjack relic rewards', detail: worldstateActivation(row) ? `Starts ${worldstateActivation(row)}` : '', expiresAt: worldstateEnd(row) }))),
        genericDetail('invasions', 'Invasions', invasions.map((row, index) => ({ id: `invasion-${index}`, name: row.node || 'Invasion', tier: [row.attacker?.faction, 'vs', row.defender?.faction].filter(Boolean).join(' '), factionLocation: row.node || '', rewards: [warframeStatRewardText(row.attackerReward, ''), warframeStatRewardText(row.defenderReward, '')].filter(Boolean).join(' // '), detail: `${Math.round(Number(row.completion) || 0)}% complete` })))
      ];

      const bountyEntries = syndicateMissions
        .filter(group => /cetus|solaris|entrati/i.test(`${group.syndicateKey || group.syndicate || ''}`))
        .flatMap(group => (group.jobs || []).map((job, index) => ({
        id: `bounty-${group.id || group.syndicateKey}-${index}`,
        name: group.syndicate || group.syndicateKey || 'Bounty',
        tier: `${job.minEnemyLevel ?? job.minLevel ?? '?'}-${job.maxEnemyLevel ?? job.maxLevel ?? '?'} Level`,
        factionLocation: group.syndicate || '',
        rewards: warframeStatRewardText(job.rewards, 'Bounty reward table'),
        detail: [job.type, job.jobType, job.locationTag].filter(Boolean).join(' // '),
        expiresAt: worldstateEnd(group)
      })));
      const bountyDetail = genericDetail('bounties', 'Bounties', bountyEntries);

      const nightwaveEntries = nightwaveChallenges.map((row, index) => ({
        id: `nightwave-${index}`,
        name: row.title || row.description || 'Nightwave challenge',
        tier: row.isDaily || row.daily ? 'Daily' : 'Weekly',
        factionLocation: `Season ${nightwave.season ?? '?'}`,
        rewards: `${row.reputation ?? row.xpAmount ?? 0} standing`,
        detail: row.desc || row.id || '',
        expiresAt: worldstateEnd(row) || worldstateEnd(nightwave)
      }));
      const eventEntries = events.slice(0, 12).map((row, index) => ({
        id: `event-${index}`,
        name: row.description || row.message || 'Event',
        tier: row.node || 'Event',
        factionLocation: row.node || row.link || '',
        rewards: warframeStatRewardText(row.rewards, 'Info'),
        detail: row.id || row.tag || '',
        expiresAt: worldstateEnd(row)
      }));
      const alertEntries = alerts.map((row, index) => ({
        id: `alert-${index}`,
        name: row.mission?.node || row.node || 'Alert',
        tier: row.mission?.type || row.missionType || '',
        factionLocation: row.mission?.faction || row.faction || '',
        rewards: warframeStatRewardText(row.reward, 'Alert reward'),
        detail: row.id || '',
        expiresAt: worldstateEnd(row)
      }));

      const utilityCards = [
        voidTrader.id ? statusCard('void-trader', 'Vendor', "Baro Ki'Teer", Date.now() >= new Date(voidTrader.activation).getTime() ? 'Active' : 'Away', worldstateEnd(voidTrader) || worldstateActivation(voidTrader), [voidTrader.location, (voidTrader.inventory || []).length ? `${voidTrader.inventory.length} inventory items` : 'Arrival pending'].filter(Boolean).join(' // '), { selectable: true }) : null,
        dailyDeals.length ? statusCard('daily-deal', 'Store', "Darvo's Deal", dailyDeals[0]?.item, worldstateEnd(dailyDeals[0]), `${dailyDeals[0].salePrice ?? '?'} credits // ${dailyDeals[0].sold ?? 0}/${dailyDeals[0].total ?? '?'}`, { selectable: true }) : null
      ];

      return [
        compactCategory('environments', cycleCards),
        compactCategory('missions', missionCards, missionDetails),
        compactCategory('bounties', bountyEntries.length ? [statusCard('bounties', 'Bounties', 'Bounties', `${bountyEntries.length} jobs`, worldstateSoonestEnd(bountyEntries), `${bountyEntries[0].name} // ${bountyEntries[0].tier}`, { selectable: true })] : [], [bountyDetail]),
        compactCategory('syndicate-missions', [
          nightwaveEntries.length ? statusCard('nightwave', 'Nightwave', 'Nightwave', `Season ${nightwave.season ?? '?'}`, worldstateEnd(nightwave), `${nightwaveEntries.length} active challenges`, { selectable: true }) : null,
          events.length ? statusCard('events', 'Events', 'Events', `${events.length} active`, worldstateSoonestEnd(events), events[0]?.description || events[0]?.message, { selectable: true }) : null,
          alerts.length ? statusCard('alerts', 'Alerts', 'Alerts', `${alerts.length} active`, worldstateSoonestEnd(alerts), alertEntries[0]?.name || 'Active alert', { selectable: true }) : null
        ], [genericDetail('nightwave', 'Nightwave', nightwaveEntries), genericDetail('events', 'Events', eventEntries), genericDetail('alerts', 'Alerts', alertEntries)]),
        compactCategory('utility', utilityCards, [
          genericDetail('void-trader', "Baro Ki'Teer", voidTrader.id ? [{ id: 'baro-0', name: voidTrader.character || "Baro Ki'Teer", tier: Date.now() >= new Date(voidTrader.activation).getTime() ? 'Active' : 'Away', factionLocation: voidTrader.location || '', rewards: `${(voidTrader.inventory || []).length} inventory items`, detail: worldstateActivation(voidTrader) ? `Starts ${worldstateActivation(voidTrader)}` : '', expiresAt: worldstateEnd(voidTrader) }] : []),
          genericDetail('daily-deal', "Darvo's Deal", dailyDeals.map((row, index) => ({ id: `deal-${index}`, name: row.item || 'Daily Deal', tier: `${row.salePrice ?? '?'} credits`, factionLocation: 'Market', rewards: `${row.originalPrice ?? '?'} original credits`, detail: `${row.sold ?? 0}/${row.total ?? '?'} sold`, expiresAt: worldstateEnd(row) })))
        ])
      ].filter(Boolean);
    }

    function loadingDashboardCategories(message) {
      return [];
    }

    function unavailableDashboardCategories(reason) {
      return [];
    }

    function categoryExpiryMs(category) {
      const times = (category.cards || [])
        .map(card => new Date(card.expiresAt).getTime())
        .filter(Number.isFinite);
      return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY;
    }

    function orderDashboardCategories(categories = []) {
      const visible = categories.filter(category => !category?.error && category?.cards?.length);
      const defaultIndex = id => {
        const index = trackerDefaultOrder.indexOf(id);
        return index >= 0 ? index : trackerDefaultOrder.length;
      };
      if (dashboardTrackerState.sortMode === 'alpha') {
        return [...visible].sort((a, b) => String(a.title).localeCompare(String(b.title)));
      }
      if (dashboardTrackerState.sortMode === 'expiry') {
        return [...visible].sort((a, b) => categoryExpiryMs(a) - categoryExpiryMs(b) || defaultIndex(a.id) - defaultIndex(b.id));
      }
      if (dashboardTrackerState.sortMode === 'custom') {
        const saved = dashboardTrackerState.customOrder || [];
        const savedIndex = id => {
          const index = saved.indexOf(id);
          return index >= 0 ? index : saved.length + defaultIndex(id);
        };
        return [...visible].sort((a, b) => savedIndex(a.id) - savedIndex(b.id));
      }
      return [...visible].sort((a, b) => defaultIndex(a.id) - defaultIndex(b.id));
    }

    function setDashboardCategories(categories) {
      dashboardTrackerState.categories = orderDashboardCategories(categories);
    }

    function formatDashboardCountdown(expiresAt) {
      if (!expiresAt) return 'Timer unavailable';
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (!Number.isFinite(diff)) return 'Timer unavailable';
      if (diff <= 0) return 'Ready / expired';
      const total = Math.floor(diff / 1000);
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      if (days) return `${days}d ${hours}h ${minutes}m`;
      if (hours) return `${hours}h ${minutes}m ${seconds}s`;
      if (minutes) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    }

    function renderDashboardCard(card) {
      const timerLine = card.hideTimer ? '' : `
          <div class="tracker-timer text-terminal mt-3 font-black" data-dashboard-countdown="${escapeHtml(card.id)}">${formatDashboardCountdown(card.expiresAt)}</div>
      `;
      return `
        <div class="tracker-card panel-card">
          <div class="uppercase text-[10px] tracking-[0.25em] text-terminal/70 mb-2">${escapeHtml(card.label)}</div>
          <div class="tracker-card-title font-bold">${escapeHtml(card.title)}</div>
          ${timerLine}
          <div class="tracker-card-footer">
            <div class="text-sm text-green-200/90 mt-2">${escapeHtml(card.state)}</div>
            <p class="text-xs text-green-200/70 mt-3 leading-5">${escapeHtml(card.detail)}</p>
          </div>
        </div>
      `;
    }

    function renderInteractiveSummaryCard(categoryId, card) {
      const selected = dashboardTrackerState.selectedDetailCategoryId === categoryId && dashboardTrackerState.selectedDetailId === card.id;
      const selectedClasses = selected ? ' bg-terminal/20 text-terminal shadow-[0_0_24px_rgba(66,245,139,0.28)] border-terminal/80' : ' hover:bg-terminal/10';
      const timerLine = card.hideTimer ? '' : `<div class="tracker-timer mt-3 font-black" data-dashboard-countdown="${escapeHtml(card.id)}">${formatDashboardCountdown(card.expiresAt)}</div>`;
      return `
        <button class="tracker-card panel-card text-left transition-colors${selectedClasses}" type="button" data-dashboard-detail-select="${escapeHtml(card.id)}" data-dashboard-detail-category="${escapeHtml(categoryId)}">
          <div class="uppercase text-[10px] tracking-[0.25em] mb-2 ${selected ? 'text-terminal/85' : 'text-terminal/70'}">${escapeHtml(card.label)}</div>
          <div class="tracker-card-title font-bold">${escapeHtml(card.title)}</div>
          ${timerLine}
          <div class="tracker-card-footer">
            <div class="text-sm mt-2 ${selected ? 'text-green-100' : 'text-green-200/90'}">${escapeHtml(card.state)}</div>
            <p class="text-xs mt-3 leading-5 ${selected ? 'text-green-100/85' : 'text-green-200/70'}">${escapeHtml(card.detail)}</p>
          </div>
        </button>
      `;
    }

    function renderDetailListLayout(rows = [], renderer) {
      if (!rows.length) return '';
      return `<div class="grid lg:grid-cols-2 gap-3">${rows.map(renderer).join('')}</div>`;
    }

    function renderArbitrationDetailPanel(detail) {
      if (!detail.row) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No active arbitration entry available.</div>';
      const row = detail.row;
      const location = row.location || 'Location unknown';
      const type = row.missionType ? dashboardToken(row.missionType) : 'Type unknown';
      const enemy = row.enemy ? dashboardToken(row.enemy) : '';
      console.info('[orbiter] arbitration active', { nodeId: row.nodeId, location, type, enemy, startsAt: row.startsAt, expiresAt: detail.expiresAt });
      return `
        <div class="border border-terminal/25 p-4">
          <div class="text-base font-bold">${escapeHtml(location)}</div>
          <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(detail.expiresAt)}</div>
          <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
            <div><span class="text-terminal/80">Type:</span> ${escapeHtml(type)}</div>
            <div><span class="text-terminal/80">Enemy:</span> ${escapeHtml(enemy || 'Unknown')}</div>
            <div class="sm:col-span-2"><span class="text-terminal/80">Started:</span> ${escapeHtml(row.startsAt)}</div>
          </div>
        </div>
      `;
    }

    function renderAlertsDetailPanel(detail) {
      if (!detail.rows?.length) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No active alerts returned.</div>';
      return renderDetailListLayout(detail.rows, row => `
        <div class="border border-terminal/25 p-4">
          <div class="text-base font-bold">${escapeHtml(row.node)}</div>
          <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(row.expiresAt)}</div>
          <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
            <div><span class="text-terminal/80">Type:</span> ${escapeHtml(row.missionType || 'Unknown')}</div>
            <div><span class="text-terminal/80">Faction:</span> ${escapeHtml(row.faction || 'Unknown')}</div>
            <div class="sm:col-span-2"><span class="text-terminal/80">Raw Keys:</span> ${escapeHtml(row.rawKeys)}</div>
          </div>
        </div>
      `);
    }

    function renderEventsDetailPanel(detail) {
      if (!detail.rows?.length) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No active events returned.</div>';
      return renderDetailListLayout(detail.rows, row => `
        <div class="border border-terminal/25 p-4">
          <div class="text-base font-bold">${escapeHtml(row.tag || 'Event')}</div>
          <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(row.expiresAt)}</div>
          <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
            <div><span class="text-terminal/80">Node:</span> ${escapeHtml(row.node)}</div>
            <div><span class="text-terminal/80">Progress:</span> ${escapeHtml(row.count)}</div>
            <div><span class="text-terminal/80">Health:</span> ${escapeHtml(row.health || 'n/a')}</div>
            <div class="sm:col-span-2"><span class="text-terminal/80">Raw Keys:</span> ${escapeHtml(row.rawKeys)}</div>
          </div>
        </div>
      `);
    }

    function renderSortieDetailPanel(detail) {
      const summary = detail.rawSummary || {};
      return `
        ${Object.keys(summary).length ? `
          <div class="border border-terminal/25 p-4 text-xs text-green-200/75">
            <div><span class="text-terminal/80">Boss:</span> ${escapeHtml(summary.boss || 'Unknown')}</div>
            <div><span class="text-terminal/80">Reward:</span> ${escapeHtml(summary.reward || 'Unknown')}</div>
          </div>
        ` : ''}
        ${detail.rows?.length ? renderDetailListLayout(detail.rows, row => `
          <div class="border border-terminal/25 p-4">
            <div class="text-base font-bold">${escapeHtml(row.node)}</div>
            <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(row.expiresAt)}</div>
            <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
              <div><span class="text-terminal/80">Type:</span> ${escapeHtml(row.missionType)}</div>
              <div><span class="text-terminal/80">Modifier:</span> ${escapeHtml(row.modifier)}</div>
              <div class="sm:col-span-2"><span class="text-terminal/80">Tileset:</span> ${escapeHtml(row.tileset)}</div>
            </div>
          </div>
        `) : '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">Sortie variants not present; showing summary fields above.</div>'}
      `;
    }

    function renderArchonDetailPanel(detail) {
      const summary = detail.rawSummary || {};
      return `
        ${Object.keys(summary).length ? `
          <div class="border border-terminal/25 p-4 text-xs text-green-200/75">
            <div><span class="text-terminal/80">Boss:</span> ${escapeHtml(summary.boss || 'Unknown')}</div>
            <div><span class="text-terminal/80">Reward:</span> ${escapeHtml(summary.reward || 'Unknown')}</div>
          </div>
        ` : ''}
        ${detail.rows?.length ? renderDetailListLayout(detail.rows, row => `
          <div class="border border-terminal/25 p-4">
            <div class="text-base font-bold">${escapeHtml(row.node)}</div>
            <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(row.expiresAt)}</div>
            <div class="text-xs text-green-200/75 mt-3"><span class="text-terminal/80">Type:</span> ${escapeHtml(row.missionType || 'Unknown')}</div>
          </div>
        `) : '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">Archon missions not present; showing summary fields above.</div>'}
      `;
    }

    function renderSpIncursionsDetailPanel(detail) {
      if (!detail.rows?.length) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No Steel Path incursion nodes available.</div>';
      return renderDetailListLayout(detail.rows, row => `
        <div class="border border-terminal/25 p-4">
          <div class="text-base font-bold">${escapeHtml(row.node)}</div>
          <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(row.expiresAt)}</div>
          <div class="text-xs text-green-200/75 mt-3">Source: browse.wf/sp-incursions.txt</div>
        </div>
      `);
    }

    function renderWeeklyDetailPanel(detail) {
      const summary = detail.rawSummary || {};
      return `
        ${Object.keys(summary).length ? `
          <div class="border border-terminal/25 p-4 text-xs text-green-200/75">
            <div><span class="text-terminal/80">Season:</span> ${escapeHtml(String(summary.season || 'n/a'))}</div>
            <div><span class="text-terminal/80">Phase:</span> ${escapeHtml(String(summary.phase || 'n/a'))}</div>
            <div><span class="text-terminal/80">Affiliation:</span> ${escapeHtml(summary.affiliation || 'n/a')}</div>
          </div>
        ` : ''}
        ${detail.rows?.length ? renderDetailListLayout(detail.rows, row => `
          <div class="border border-terminal/25 p-4">
            <div class="text-base font-bold">${escapeHtml(row.name || 'Challenge')}</div>
            <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(row.expiresAt)}</div>
            <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
              <div><span class="text-terminal/80">Daily:</span> ${row.daily ? 'Yes' : 'No'}</div>
              <div><span class="text-terminal/80">Starts:</span> ${escapeHtml(row.activation || 'Unknown')}</div>
              <div class="sm:col-span-2"><span class="text-terminal/80">Raw Keys:</span> ${escapeHtml(row.rawKeys)}</div>
            </div>
          </div>
        `) : '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No active weekly/daily acts returned; showing summary fields above.</div>'}
      `;
    }

    function renderBaroDetailPanel(detail) {
      if (!detail.rows?.length) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No vendor details available.</div>';
      const row = detail.rows[0];
      return `
        <div class="border border-terminal/25 p-4">
          <div class="text-base font-bold">${escapeHtml(row.character || "Baro Ki'Teer")}</div>
          <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(row.expiresAt)}</div>
          <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
            <div><span class="text-terminal/80">Node:</span> ${escapeHtml(row.node)}</div>
            <div><span class="text-terminal/80">Arrives:</span> ${escapeHtml(row.activation || 'Unknown')}</div>
            <div class="sm:col-span-2"><span class="text-terminal/80">Raw Keys:</span> ${escapeHtml(row.rawKeys)}</div>
          </div>
        </div>
      `;
    }

    function renderFissureDetailPanel(detail) {
      if (!detail.rows?.length) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No details available for this fissure section.</div>';
      return renderDetailListLayout(detail.rows, row => `
        <div class="border border-terminal/25 p-4">
          <div class="text-base font-bold">${escapeHtml(row.node)}</div>
          <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(row.expiresAt)}</div>
          <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
            <div><span class="text-terminal/80">Type:</span> ${escapeHtml(row.missionType)}</div>
            <div><span class="text-terminal/80">Tier:</span> ${escapeHtml(row.tier)}</div>
            <div><span class="text-terminal/80">Modifier:</span> ${escapeHtml(row.modifier)}</div>
            <div><span class="text-terminal/80">Steel Path:</span> ${row.hard ? 'Yes' : 'No'}</div>
            <div><span class="text-terminal/80">Seed:</span> ${escapeHtml(String(row.seed))}</div>
            <div><span class="text-terminal/80">Region:</span> ${escapeHtml(String(row.region))}</div>
            <div class="sm:col-span-2"><span class="text-terminal/80">Activation:</span> ${escapeHtml(row.activation || 'Unknown')}</div>
          </div>
        </div>
      `);
    }

    function renderInvasionDetailPanel(detail) {
      if (!detail.rows?.length) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No details available for invasions right now.</div>';
      return renderDetailListLayout(detail.rows, row => `
        <div class="border border-terminal/25 p-4">
          <div class="text-base font-bold">${escapeHtml(row.node)}</div>
          <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
            <div><span class="text-terminal/80">Attacker:</span> ${escapeHtml(row.attacker)}</div>
            <div><span class="text-terminal/80">Defender:</span> ${escapeHtml(row.defender)}</div>
            <div><span class="text-terminal/80">Progress:</span> ${escapeHtml(row.progress)}</div>
            <div><span class="text-terminal/80">Started:</span> ${escapeHtml(row.activation || 'Unknown')}</div>
            <div><span class="text-terminal/80">Attacker Reward:</span> ${escapeHtml(row.rewardA || 'Unknown')}</div>
            <div><span class="text-terminal/80">Defender Reward:</span> ${escapeHtml(row.rewardD || 'Unknown')}</div>
            <div><span class="text-terminal/80">LocTag:</span> ${escapeHtml(row.locTag || 'n/a')}</div>
            <div><span class="text-terminal/80">Seeds:</span> ${escapeHtml(String(row.attackerSeed))} / ${escapeHtml(String(row.defenderSeed))}</div>
            <div class="sm:col-span-2"><span class="text-terminal/80">Raw Keys:</span> ${escapeHtml(row.rawKeys)}</div>
          </div>
        </div>
      `);
    }

    function renderVoidStormDetailPanel(detail) {
      if (!detail.rows?.length) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No details available for Void Storms right now.</div>';
      return renderDetailListLayout(detail.rows, row => `
        <div class="border border-terminal/25 p-4">
          <div class="text-base font-bold">${escapeHtml(row.node)}</div>
          <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(row.expiresAt)}</div>
          <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
            <div><span class="text-terminal/80">Tier:</span> ${escapeHtml(row.tier)}</div>
            <div><span class="text-terminal/80">Activation:</span> ${escapeHtml(row.activation || 'Unknown')}</div>
            <div class="sm:col-span-2"><span class="text-terminal/80">Raw Keys:</span> ${escapeHtml(row.rawKeys)}</div>
          </div>
        </div>
      `);
    }

    function renderArchimedeaDetailPanel(detail) {
      const rows = detail.rows || [];
      const summary = detail.rawSummary || {};
      if (!rows.length && !Object.keys(summary).length) {
        return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No details available for this Archimedea section.</div>';
      }
      return `
        ${Object.keys(summary).length ? `
          <div class="border border-terminal/25 p-4 text-xs text-green-200/75">
            <div><span class="text-terminal/80">Type:</span> ${escapeHtml(summary.type || 'Unknown')}</div>
            <div><span class="text-terminal/80">Variables:</span> ${escapeHtml(summary.variables || 'n/a')}</div>
            <div><span class="text-terminal/80">Random Seed:</span> ${escapeHtml(String(summary.randomSeed ?? 'n/a'))}</div>
          </div>
        ` : ''}
        ${rows.length ? renderDetailListLayout(rows, row => `
          <div class="border border-terminal/25 p-4">
            <div class="text-base font-bold">${escapeHtml(row.missionType || 'Mission')}</div>
            <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(row.id)}">${formatDashboardCountdown(row.expiresAt)}</div>
            <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
              <div><span class="text-terminal/80">Faction:</span> ${escapeHtml(row.faction || 'Unknown')}</div>
              <div><span class="text-terminal/80">Deviation:</span> ${escapeHtml(row.deviation || 'Unknown')}</div>
              <div class="sm:col-span-2"><span class="text-terminal/80">Risks:</span> ${escapeHtml(row.risks || 'None listed')}</div>
            </div>
          </div>
        `) : '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">Mission rows are not present in this payload; showing available summary fields above.</div>'}
       `;
    }

    function renderSummaryOnlyDetailPanel(detail) {
      const card = detail.rawCard || {};
      const lines = [
        card.label ? `Label: ${card.label}` : '',
        card.state ? `State: ${card.state}` : '',
        card.expiresAt ? `Expiry: ${card.expiresAt}` : '',
        card.detail ? `Summary: ${card.detail}` : ''
      ].filter(Boolean);
      return `
        <div class="border border-terminal/25 p-4 text-sm text-green-200/75 space-y-2">
          <div class="text-xs uppercase tracking-[0.18em] text-terminal/70">Summary Fallback</div>
          ${lines.length ? `<div class="space-y-1">${lines.map(line => `<div>${escapeHtml(line)}</div>`).join('')}</div>` : '<div>No additional detail payload was mapped for this card yet.</div>'}
        </div>
      `;
    }

    function renderGenericEntryDetailPanel(detail) {
      if (!detail.entries?.length) {
        const fallbackFields = Object.entries(detail || {})
          .filter(([key]) => !['id', 'title', 'source', 'expiresAt', 'entries', 'rows', 'row', 'type'].includes(key))
          .filter(([, value]) => value !== null && value !== undefined && value !== '')
          .slice(0, 10);
        if (!fallbackFields.length) {
          return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">The source returned no mission/tier/reward rows for this section right now.</div>';
        }
        return `
          <div class="border border-terminal/25 p-4 text-sm text-green-200/75">
            <div class="uppercase text-[10px] tracking-[0.18em] text-terminal/70 mb-2">Available Fields</div>
            <div class="grid sm:grid-cols-2 gap-2">
              ${fallbackFields.map(([key, value]) => `
                <div><span class="text-terminal/80">${escapeHtml(dashboardToken(key))}:</span> ${escapeHtml(typeof value === 'object' ? JSON.stringify(value) : String(value))}</div>
              `).join('')}
            </div>
          </div>
        `;
      }
      return `
        <div class="grid lg:grid-cols-2 gap-3">
          ${detail.entries.map(entry => `
            <div class="border border-terminal/25 p-4">
              <div class="text-base font-bold">${escapeHtml(entry.name)}</div>
              <div class="text-terminal text-sm mt-2" data-dashboard-countdown="detail-${escapeHtml(entry.id)}">${formatDashboardCountdown(entry.expiresAt)}</div>
              <div class="grid sm:grid-cols-2 gap-2 text-xs text-green-200/75 mt-3">
                <div><span class="text-terminal/80">Tier/Level:</span> ${escapeHtml(entry.tier)}</div>
                <div><span class="text-terminal/80">Faction/Location:</span> ${escapeHtml(entry.factionLocation)}</div>
                <div class="sm:col-span-2"><span class="text-terminal/80">Rewards:</span> ${escapeHtml(entry.rewards)}</div>
                <div class="sm:col-span-2"><span class="text-terminal/80">Details:</span> ${escapeHtml(entry.detail)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    function resolveTrackerDetailGuiType(category, detail) {
      const categoryId = category?.id || '';
      const detailId = detail?.id || '';
      const detailType = detail?.type || '';
      if (detailType === 'archimedea' || /archimedea/.test(detailId)) return 'archimedea';
      if (detailType === 'invasions' || detailId === 'invasions') return 'invasions';
      if (detailType === 'fissures' || detailId.startsWith('fissures-') || detailType === 'void-storms' || detailId === 'void-storms') return 'fissures';
      if (categoryId === 'environments' || detailId.startsWith('cycle-') || detailId === 'zariman') return 'environment-cycles';
      if (categoryId === 'bounties' || categoryId === 'syndicate-missions' || detailId.includes('bount') || detailId.includes('holdfast') || detailId.includes('cavia') || detailId.includes('hex') || detailId === 'nightwave' || detailId === 'events') return 'syndicates-bounties';
      if (categoryId === 'missions') return 'missions-rotations';
      return 'generic';
    }

    function renderMissionsDetailPanel(detail) {
      if (!detail) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No mission detail selected.</div>';
      if (detail.type === 'sortie') return renderSortieDetailPanel(detail);
      if (detail.type === 'archon') return renderArchonDetailPanel(detail);
      if (detail.type === 'events') return renderEventsDetailPanel(detail);
      if (detail.type === 'alerts') return renderAlertsDetailPanel(detail);
      if (detail.type === 'weekly') return renderWeeklyDetailPanel(detail);
      if (detail.type === 'sp-incursions') return renderSpIncursionsDetailPanel(detail);
      if (detail.type === 'baro') return renderBaroDetailPanel(detail);
      if (detail.type === 'summary') return renderSummaryOnlyDetailPanel(detail);
      return renderGenericEntryDetailPanel(detail);
    }

    function renderSyndicatesBountiesDetailPanel(detail) {
      if (!detail) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No syndicate/bounty detail selected.</div>';
      if (detail.type === 'events') return renderEventsDetailPanel(detail);
      return renderGenericEntryDetailPanel(detail);
    }

    function renderEnvironmentCyclesDetailPanel(detail) {
      if (!detail) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No environment cycle selected.</div>';
      if (detail.type === 'summary') return renderSummaryOnlyDetailPanel(detail);
      const rows = (detail.entries || detail.rows || []).map((row, index) => ({
        id: row.id || `environment-${index}`,
        name: row.name || row.node || detail.title || 'Cycle',
        tier: row.tier || row.state || 'State unavailable',
        factionLocation: row.factionLocation || row.location || '',
        rewards: row.rewards || row.progress || 'Cycle data',
        detail: row.detail || row.rawKeys || '',
        expiresAt: row.expiresAt || detail.expiresAt || ''
      }));
      return renderGenericEntryDetailPanel({ ...detail, entries: rows });
    }

    function renderFissuresDetailPanel(detail) {
      if (!detail) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No fissure detail selected.</div>';
      if (detail.type === 'void-storms') return renderVoidStormDetailPanel(detail);
      if (detail.type === 'fissures') return renderFissureDetailPanel(detail);
      return renderGenericEntryDetailPanel(detail);
    }

    function renderInvasionsTrackerDetailPanel(detail) {
      if (!detail) return '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No invasion detail selected.</div>';
      if (detail.type === 'invasions') return renderInvasionDetailPanel(detail);
      return renderGenericEntryDetailPanel(detail);
    }

    function renderTrackerDetailGui(category, detail) {
      const guiType = resolveTrackerDetailGuiType(category, detail);
      if (guiType === 'missions-rotations') return renderMissionsDetailPanel(detail);
      if (guiType === 'syndicates-bounties') return renderSyndicatesBountiesDetailPanel(detail);
      if (guiType === 'environment-cycles') return renderEnvironmentCyclesDetailPanel(detail);
      if (guiType === 'fissures') return renderFissuresDetailPanel(detail);
      if (guiType === 'invasions') return renderInvasionsTrackerDetailPanel(detail);
      if (guiType === 'archimedea') return renderArchimedeaDetailPanel(detail);
      return renderDetailPanelByType(detail);
    }

    function selectedDetailByIds(categoryId, detailId) {
      if (!categoryId || !detailId) return { category: null, detail: null };
      const category = (dashboardTrackerState.categories || []).find(item => item.id === categoryId) || null;
      if (!category) return { category: null, detail: null };
      const detail = selectedDetail(category);
      return { category, detail };
    }

    function renderTrackerModalDetail() {
      if (!trackerModalBody || !trackerModalTitle || !trackerModalSub) return;
      const { category, detail } = selectedDetailByIds(trackerModalState.categoryId, trackerModalState.detailId);
      if (!category || !detail) {
        trackerModalTitle.textContent = 'Tracker Details';
        trackerModalSub.textContent = 'Select a tracker card to inspect details.';
        trackerModalBody.innerHTML = '<div class="border border-terminal/25 p-4 text-sm text-green-200/75">No tracker detail is currently selected.</div>';
        return;
      }
      const guiType = resolveTrackerDetailGuiType(category, detail);
      trackerModalState.detailType = guiType;
      const timerText = detail.expiresAt ? ` // ${formatDashboardCountdown(detail.expiresAt)}` : '';
      trackerModalTitle.textContent = detail.title || 'Tracker Details';
      trackerModalSub.textContent = `${detail.source || category.source || 'Worldstate'}${timerText}`;
      trackerModalBody.innerHTML = `<div class="tracker-detail-panel tracker-detail-panel--${escapeHtml(guiType)}">${renderTrackerDetailGui(category, detail)}</div>`;
    }

    function setTrackerModalOpen(open) {
      if (!trackerModal) return Promise.resolve();
      const wantOpen = Boolean(open);
      if (trackerModalState.open === wantOpen) return Promise.resolve();
      trackerModalState.open = wantOpen;

      if (wantOpen) {
        trackerModal.classList.add('is-visible');
        trackerModal.setAttribute('aria-hidden', 'false');
        trackerModalState.prevBodyOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
        trackerModal.dataset.open = '0';
        trackerModal.getBoundingClientRect();
        trackerModal.dataset.open = '1';
        return Promise.resolve();
      }

      trackerModal.dataset.open = '0';
      trackerModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = trackerModalState.prevBodyOverflow;
      return new Promise(resolve => {
        const panel = trackerModal.querySelector('.terminal-modal__panel');
        const done = () => {
          if (panel) panel.removeEventListener('transitionend', done);
          trackerModal.classList.remove('is-visible');
          resolve();
        };
        if (panel) panel.addEventListener('transitionend', done);
        window.setTimeout(done, 320);
      });
    }

    function openTrackerModal(categoryId, detailId) {
      trackerModalState.categoryId = categoryId || '';
      trackerModalState.detailId = detailId || '';
      renderTrackerModalDetail();
      setTrackerModalOpen(true);
    }

    function closeTrackerModal() {
      return setTrackerModalOpen(false);
    }

    function setDashboardCardModalOpen(open) {
      if (!dashboardCardModal) return Promise.resolve();
      const wantOpen = Boolean(open);
      if (dashboardCardModalState.open === wantOpen) return Promise.resolve();
      dashboardCardModalState.open = wantOpen;
      if (wantOpen) {
        dashboardCardModal.classList.add('is-visible');
        dashboardCardModal.setAttribute('aria-hidden', 'false');
        dashboardCardModalState.prevBodyOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
        dashboardCardModal.dataset.open = '0';
        dashboardCardModal.getBoundingClientRect();
        dashboardCardModal.dataset.open = '1';
        return Promise.resolve();
      }
      dashboardCardModal.dataset.open = '0';
      dashboardCardModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = dashboardCardModalState.prevBodyOverflow;
      return new Promise(resolve => {
        window.setTimeout(() => {
          if (!dashboardCardModalState.open) dashboardCardModal.classList.remove('is-visible');
          resolve();
        }, 220);
      });
    }

    function dashboardCardPreviewBody(cardType) {
      if (cardType === 'reset-status') {
        const reset = escapeHtml(dashResetSummary?.textContent || 'Waiting for tracker sync...');
        const daily = escapeHtml(dashDailyStatus?.textContent || 'No active daily data yet');
        return `
          <div class="border border-terminal/25 p-3 text-sm text-green-200/85">${reset}</div>
          <div class="border border-terminal/20 p-3 text-xs text-green-200/75 uppercase tracking-[0.16em]">${daily}</div>
        `;
      }
      if (cardType === 'market-quick') {
        const query = escapeHtml(String(dashMarketQuickInput?.value || '').trim() || 'No query entered.');
        return `
          <div class="border border-terminal/25 p-3 text-sm text-green-200/85">Quick query: ${query}</div>
          <div class="text-xs text-green-200/75">Use “Open Full Section” to continue in Market terminal.</div>
        `;
      }
      if (cardType === 'tracker-highlights') {
        const rows = Array.from(dashTrackerHighlights?.querySelectorAll('.dash-list-row') || []).slice(0, 5);
        if (!rows.length) {
          return '<div class="border border-terminal/25 p-3 text-sm text-green-200/80">No tracker highlights yet.</div>';
        }
        return rows.map(row => `<div class="border border-terminal/20 p-3 text-sm text-green-200/85">${escapeHtml(row.textContent || '')}</div>`).join('');
      }
      if (cardType === 'codex-recent') {
        const rows = Array.from(dashCodexRecent?.querySelectorAll('.dash-list-row') || []).slice(0, 6);
        if (!rows.length) {
          return '<div class="border border-terminal/25 p-3 text-sm text-green-200/80">No pinned codex entries yet.</div>';
        }
        return rows.map(row => `<div class="border border-terminal/20 p-3 text-sm text-green-200/85">${escapeHtml(row.textContent || '')}</div>`).join('');
      }
      if (cardType === 'quick-links') {
        const buttons = Array.from(document.querySelectorAll('[data-dash-nav]'));
        if (!buttons.length) {
          return '<div class="border border-terminal/25 p-3 text-sm text-green-200/80">No preview data available yet.</div>';
        }
        return `
          <div class="grid grid-cols-2 gap-2">
            ${buttons.map(btn => `<button type="button" class="border border-terminal px-3 py-2 text-xs uppercase tracking-widest hover:bg-terminal hover:text-black" data-dash-modal-nav="${escapeHtml(btn.dataset.dashNav || 'dashboard')}">${escapeHtml(btn.textContent || '')}</button>`).join('')}
          </div>
        `;
      }
      return '<div class="border border-terminal/25 p-3 text-sm text-green-200/80">No preview data available yet.</div>';
    }

    function openDashboardCardModal({ section = 'dashboard', cardType = '', title = 'Dashboard Preview', subtitle = '' } = {}) {
      dashboardCardModalState.section = section;
      dashboardCardModalState.cardType = cardType;
      if (dashboardCardModalTitle) dashboardCardModalTitle.textContent = title;
      if (dashboardCardModalSub) dashboardCardModalSub.textContent = subtitle || 'Preview details';
      if (dashboardCardModalBody) {
        const previewHtml = dashboardCardPreviewBody(cardType);
        dashboardCardModalBody.innerHTML = previewHtml || '<div class="border border-terminal/25 p-3 text-sm text-green-200/80">No preview data available yet.</div>';
        dashboardCardModalBody.querySelectorAll('[data-dash-modal-nav]').forEach(btn => {
          btn.addEventListener('click', () => {
            const target = btn.dataset.dashModalNav || 'dashboard';
            setDashboardCardModalOpen(false).then(() => showSection(target));
          });
        });
      }
      setDashboardCardModalOpen(true);
    }

    function renderDetailPanelByType(detail) {
      if (detail.type === 'summary') return renderSummaryOnlyDetailPanel(detail);
      if (detail.type === 'arbitration') return renderArbitrationDetailPanel(detail);
      if (detail.type === 'alerts') return renderAlertsDetailPanel(detail);
      if (detail.type === 'events') return renderEventsDetailPanel(detail);
      if (detail.type === 'sortie') return renderSortieDetailPanel(detail);
      if (detail.type === 'archon') return renderArchonDetailPanel(detail);
      if (detail.type === 'sp-incursions') return renderSpIncursionsDetailPanel(detail);
      if (detail.type === 'weekly') return renderWeeklyDetailPanel(detail);
      if (detail.type === 'baro') return renderBaroDetailPanel(detail);
      if (detail.type === 'fissures') return renderFissureDetailPanel(detail);
      if (detail.type === 'invasions') return renderInvasionDetailPanel(detail);
      if (detail.type === 'void-storms') return renderVoidStormDetailPanel(detail);
      if (detail.type === 'archimedea') return renderArchimedeaDetailPanel(detail);
      return renderGenericEntryDetailPanel(detail);
    }

    function selectedDetail(category) {
      if (!dashboardTrackerState.selectedDetailId) return null;
      if (dashboardTrackerState.selectedDetailCategoryId !== category.id) return null;
      const found = (category.details || []).find(detail => detail.id === dashboardTrackerState.selectedDetailId) || null;
      if (found) return found;
      const fallbackCard = (category.cards || []).find(card => card.id === dashboardTrackerState.selectedDetailId) || null;
      if (!fallbackCard) return null;
      console.warn('[orbiter] dashboard detail missing; using summary fallback', {
        categoryId: category.id,
        selectedId: dashboardTrackerState.selectedDetailId,
        availableDetailIds: (category.details || []).map(detail => detail.id),
        card: fallbackCard
      });
      return {
        id: fallbackCard.id,
        type: 'summary',
        title: fallbackCard.title || 'Details',
        source: category.source || 'browse.wf',
        expiresAt: fallbackCard.expiresAt || '',
        rawCard: fallbackCard
      };
    }

    function renderInteractiveDetailPanel(category) {
      const detail = selectedDetail(category);
      if (!detail) {
        return '<div class="panel-card p-5 text-sm text-green-200/75">Select a card above to inspect detailed mission rows for that section.</div>';
      }
      const timerText = detail.expiresAt ? ` // ${formatDashboardCountdown(detail.expiresAt)}` : '';
      const guiType = resolveTrackerDetailGuiType(category, detail);
      return `
        <div class="panel-card p-5 space-y-4 tracker-detail-panel tracker-detail-panel--${escapeHtml(guiType)}" data-dashboard-detail="${escapeHtml(detail.id)}" data-dashboard-detail-type="${escapeHtml(guiType)}">
          <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div class="uppercase text-[10px] tracking-[0.25em] text-terminal/70 mb-2">Selected Section</div>
              <h5 class="text-xl font-bold">${escapeHtml(detail.title)}</h5>
              <p class="text-xs text-green-200/70 mt-2">${escapeHtml(detail.source)}${timerText}</p>
            </div>
            <button class="terminal-link border border-terminal px-4 py-2 text-xs uppercase tracking-widest" type="button" data-dashboard-detail-close="${escapeHtml(category.id)}">Close Details</button>
          </div>
          ${renderTrackerDetailGui(category, detail)}
        </div>
      `;
    }

    function renderInlineSelectedDetailPanel(category, detail) {
      const timerText = detail.expiresAt ? ` // ${formatDashboardCountdown(detail.expiresAt)}` : '';
      const guiType = resolveTrackerDetailGuiType(category, detail);
      return `
        <div class="tracker-inline-detail md:col-span-2 xl:col-span-3">
          <div class="panel-card p-5 space-y-4 tracker-detail-panel tracker-detail-panel--${escapeHtml(guiType)}" data-dashboard-detail="${escapeHtml(detail.id)}" data-dashboard-detail-type="${escapeHtml(guiType)}">
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <div class="uppercase text-[10px] tracking-[0.25em] text-terminal/70 mb-2">Selected Section</div>
                <h5 class="text-xl font-bold">${escapeHtml(detail.title)}</h5>
                <p class="text-xs text-green-200/70 mt-2">${escapeHtml(detail.source)}${timerText}</p>
              </div>
              <button class="terminal-link border border-terminal px-4 py-2 text-xs uppercase tracking-widest" type="button" data-dashboard-detail-close="${escapeHtml(category.id)}">Close Details</button>
            </div>
            ${renderTrackerDetailGui(category, detail)}
          </div>
        </div>
      `;
    }

    function isInteractiveCategory(category) {
      if (!category || category.error) return false;
      if (category.id === 'missions') return Array.isArray(category.cards) && category.cards.length > 0;
      if (Array.isArray(category.details) && category.details.length > 0) return true;
      return Array.isArray(category.cards) && category.cards.some(card => card?.selectable);
    }

    function renderTrackerCategoryHeader(category) {
      return `
        <div class="tracker-category-header">
          <div class="flex items-start gap-3 min-w-0">
            <button class="tracker-drag-handle border border-terminal/50 px-2 py-1 text-xs text-terminal/80 hover:bg-terminal hover:text-black cursor-grab" type="button" draggable="true" data-tracker-drag="${escapeHtml(category.id)}" aria-label="Drag ${escapeHtml(category.title)}"><span aria-hidden="true">≡</span></button>
            <div class="min-w-0">
              <div class="uppercase text-[10px] tracking-[0.25em] text-terminal/70">Tracker Category</div>
              <h4 class="text-lg font-bold break-words">${escapeHtml(category.title)}</h4>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button class="tracker-move-btn terminal-link border border-terminal/50 px-3 py-2 text-[10px] uppercase tracking-widest" type="button" data-tracker-move="${escapeHtml(category.id)}" data-direction="up">Up</button>
            <button class="tracker-move-btn terminal-link border border-terminal/50 px-3 py-2 text-[10px] uppercase tracking-widest" type="button" data-tracker-move="${escapeHtml(category.id)}" data-direction="down">Down</button>
            <div class="text-[10px] uppercase tracking-[0.18em] text-terminal/60">${escapeHtml(category.source)}</div>
          </div>
        </div>
      `;
    }

    function renderInteractiveCategory(category) {
      const forceSelectable = category.id === 'missions';
      return `
        <section class="tracker-category-shell space-y-3 transition-transform duration-200" data-tracker-category="${escapeHtml(category.id)}">
          ${renderTrackerCategoryHeader(category)}
          ${category.error ? `<div class="panel-card p-5 text-sm text-green-200/75">${escapeHtml(category.error)}</div>` : ''}
          ${!category.error && category.cards.length ? `<div class="tracker-card-grid">${category.cards.map(card => {
            return (forceSelectable || card.selectable) ? renderInteractiveSummaryCard(category.id, card) : renderDashboardCard(card);
          }).join('')}</div>` : ''}
        </section>
      `;
    }

    function renderTrackerCategory(category) {
      if (!category?.error && !category?.cards?.length) return '';
      if (isInteractiveCategory(category)) return renderInteractiveCategory(category);
      return `
        <section class="tracker-category-shell space-y-3 transition-transform duration-200" data-tracker-category="${escapeHtml(category.id)}">
          ${renderTrackerCategoryHeader(category)}
          ${category.error ? `<div class="panel-card p-5 text-sm text-green-200/75">${escapeHtml(category.error)}</div>` : ''}
          ${!category.error && !category.cards.length ? '<div class="panel-card p-5 text-sm text-green-200/75">No world-state data returned for this category.</div>' : ''}
          ${!category.error && category.cards.length ? `<div class="tracker-card-grid">${category.cards.map(renderDashboardCard).join('')}</div>` : ''}
        </section>
      `;
    }

    function renderDashboardTrackerCards() {
      if (!dashboardTrackerGrid) return;
      if (trackerSortMode && trackerSortMode.value !== dashboardTrackerState.sortMode) {
        trackerSortMode.value = dashboardTrackerState.sortMode;
      }
      if (!dashboardTrackerState.categories?.length) {
        dashboardTrackerGrid.innerHTML = '<div class="panel-card p-5 text-sm text-green-200/80">No active data.</div>';
        return;
      }
      dashboardTrackerGrid.innerHTML = dashboardTrackerState.categories.map(renderTrackerCategory).join('');
      bindDashboardTrackerEvents();
      if (trackerModalState.open) renderTrackerModalDetail();
    }

    function animateTrackerReorder(applyChange) {
      if (!dashboardTrackerGrid || typeof applyChange !== 'function') return;
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      if (reduceMotion) {
        applyChange();
        return;
      }

      const beforeRects = new Map(
        [...dashboardTrackerGrid.querySelectorAll('[data-tracker-category]')]
          .map(section => [section.dataset.trackerCategory || '', section.getBoundingClientRect()])
      );

      applyChange();

      const movedSections = [...dashboardTrackerGrid.querySelectorAll('[data-tracker-category]')];
      movedSections.forEach(section => {
        const id = section.dataset.trackerCategory || '';
        const before = beforeRects.get(id);
        if (!before) return;
        const after = section.getBoundingClientRect();
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        if (!dx && !dy) return;
        section.classList.add('tracker-category--moving');
        section.style.transition = 'none';
        section.style.transform = `translate(${dx}px, ${dy}px)`;
      });

      dashboardTrackerGrid.offsetHeight;

      movedSections.forEach(section => {
        if (!section.classList.contains('tracker-category--moving')) return;
        section.style.transition = '';
        section.style.transform = '';
        const cleanup = () => {
          section.classList.remove('tracker-category--moving');
          section.style.transition = '';
          section.style.transform = '';
          section.removeEventListener('transitionend', cleanup);
        };
        section.addEventListener('transitionend', cleanup);
        window.setTimeout(cleanup, 360);
      });
    }

    function clearTrackerDropTargets() {
      dashboardTrackerGrid?.querySelectorAll('.tracker-category--drop-target').forEach(section => {
        section.classList.remove('tracker-category--drop-target');
      });
    }

    function persistCurrentTrackerOrder() {
      saveTrackerOrder((dashboardTrackerState.categories || []).map(category => category.id));
    }

    function moveTrackerCategory(id, direction) {
      const categories = [...(dashboardTrackerState.categories || [])];
      const index = categories.findIndex(category => category.id === id);
      if (index < 0) return;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= categories.length) return;
      [categories[index], categories[nextIndex]] = [categories[nextIndex], categories[index]];
      setTrackerSortMode('custom');
      animateTrackerReorder(() => {
        dashboardTrackerState.categories = categories;
        persistCurrentTrackerOrder();
        renderDashboardTrackerCards();
        updateDashboardCountdowns();
      });
    }

    function bindTrackerOrderingEvents() {
      dashboardTrackerGrid.querySelectorAll('[data-tracker-move]').forEach(button => {
        button.addEventListener('click', () => moveTrackerCategory(button.dataset.trackerMove || '', button.dataset.direction || 'down'));
      });

      let draggedId = '';
      dashboardTrackerGrid.querySelectorAll('[data-tracker-drag]').forEach(handle => {
        handle.addEventListener('dragstart', event => {
          draggedId = handle.dataset.trackerDrag || '';
          event.dataTransfer?.setData('text/plain', draggedId);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
          dashboardTrackerGrid.classList.add('tracker-grid--dragging');
          handle.closest('[data-tracker-category]')?.classList.add('tracker-category--dragging');
        });
        handle.addEventListener('dragend', () => {
          handle.closest('[data-tracker-category]')?.classList.remove('tracker-category--dragging');
          dashboardTrackerGrid.classList.remove('tracker-grid--dragging');
          clearTrackerDropTargets();
          draggedId = '';
        });
      });

      dashboardTrackerGrid.querySelectorAll('[data-tracker-category]').forEach(section => {
        section.addEventListener('dragover', event => {
          if (!draggedId) return;
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
          clearTrackerDropTargets();
          section.classList.add('tracker-category--drop-target');
        });
        section.addEventListener('dragleave', event => {
          if (section.contains(event.relatedTarget)) return;
          section.classList.remove('tracker-category--drop-target');
        });
        section.addEventListener('drop', event => {
          event.preventDefault();
          clearTrackerDropTargets();
          const sourceId = event.dataTransfer?.getData('text/plain') || draggedId;
          const targetId = section.dataset.trackerCategory || '';
          if (!sourceId || !targetId || sourceId === targetId) return;
          const categories = [...(dashboardTrackerState.categories || [])];
          const sourceIndex = categories.findIndex(category => category.id === sourceId);
          const targetIndex = categories.findIndex(category => category.id === targetId);
          if (sourceIndex < 0 || targetIndex < 0) return;
          const [moved] = categories.splice(sourceIndex, 1);
          categories.splice(targetIndex, 0, moved);
          setTrackerSortMode('custom');
          animateTrackerReorder(() => {
            dashboardTrackerState.categories = categories;
            persistCurrentTrackerOrder();
            renderDashboardTrackerCards();
            updateDashboardCountdowns();
          });
        });
      });
    }

    function bindDashboardTrackerEvents() {
      bindTrackerOrderingEvents();
      if (dashboardTrackerGrid && dashboardTrackerGrid.dataset.delegatedBound !== '1') {
        dashboardTrackerGrid.dataset.delegatedBound = '1';
        dashboardTrackerGrid.addEventListener('click', async (event) => {
          const selectBtn = event.target.closest('[data-dashboard-detail-select]');
          if (selectBtn) {
            dashboardTrackerState.selectedDetailId = selectBtn.dataset.dashboardDetailSelect || '';
            dashboardTrackerState.selectedDetailCategoryId = selectBtn.dataset.dashboardDetailCategory || '';
            renderDashboardTrackerCards();
            updateDashboardCountdowns();
            openTrackerModal(dashboardTrackerState.selectedDetailCategoryId, dashboardTrackerState.selectedDetailId);
            return;
          }

          const closeBtn = event.target.closest('[data-dashboard-detail-close]');
          if (closeBtn) {
            const scrollRoot = document.querySelector('main');
            const savedScrollTop = scrollRoot ? scrollRoot.scrollTop : 0;
            const detailEl = closeBtn.closest('[data-dashboard-detail]');
            await animateDetailPopout(detailEl);
            dashboardTrackerState.selectedDetailId = '';
            dashboardTrackerState.selectedDetailCategoryId = '';
            renderDashboardTrackerCards();
            updateDashboardCountdowns();
            if (scrollRoot) scrollRoot.scrollTop = savedScrollTop;
          }
        });
      }
      dashboardTrackerGrid.querySelectorAll('[data-dashboard-detail-select]').forEach(button => {
        button.addEventListener('click', () => {
          dashboardTrackerState.selectedDetailId = button.dataset.dashboardDetailSelect || '';
          dashboardTrackerState.selectedDetailCategoryId = button.dataset.dashboardDetailCategory || '';
          renderDashboardTrackerCards();
          updateDashboardCountdowns();
          openTrackerModal(dashboardTrackerState.selectedDetailCategoryId, dashboardTrackerState.selectedDetailId);
        });
      });
      dashboardTrackerGrid.querySelectorAll('[data-dashboard-detail-close]').forEach(button => {
        button.addEventListener('click', async () => {
          const scrollRoot = document.querySelector('main');
          const savedScrollTop = scrollRoot ? scrollRoot.scrollTop : 0;
          const detailEl = button.closest('[data-dashboard-detail]');
          await animateDetailPopout(detailEl);
          dashboardTrackerState.selectedDetailId = '';
          dashboardTrackerState.selectedDetailCategoryId = '';
          renderDashboardTrackerCards();
          updateDashboardCountdowns();
          if (scrollRoot) scrollRoot.scrollTop = savedScrollTop;
        });
      });
    }

    function updateDashboardCountdowns() {
      const cards = (dashboardTrackerState.categories || []).flatMap(category => category.cards || []);
      document.querySelectorAll('[data-dashboard-countdown]').forEach(node => {
        const countdownId = node.dataset.dashboardCountdown || '';
        if (countdownId.startsWith('detail-')) {
          const details = (dashboardTrackerState.categories || []).flatMap(category => category.details || []);
          const rows = details.flatMap(detail => (detail.entries || []).concat(detail.rows || []).concat(detail.row ? [detail.row] : []));
          const row = rows.find(item => `detail-${item.id}` === countdownId);
          if (row) {
            node.textContent = formatDashboardCountdown(row.expiresAt);
            const diffSec = Math.max(0, Math.floor((new Date(row.expiresAt).getTime() - Date.now()) / 1000));
            node.classList.toggle('tracker-timer--warning', diffSec <= 120 && diffSec > 30);
            node.classList.toggle('tracker-timer--urgent', diffSec <= 30);
          }
          return;
        }
        const card = cards.find(item => item.id === countdownId);
        if (card) {
          node.textContent = formatDashboardCountdown(card.expiresAt);
          const diffSec = Math.max(0, Math.floor((new Date(card.expiresAt).getTime() - Date.now()) / 1000));
          node.classList.toggle('tracker-timer--warning', diffSec <= 120 && diffSec > 30);
          node.classList.toggle('tracker-timer--urgent', diffSec <= 30);
        }
      });
      renderDashboardHighlightsCards();
    }

    function renderDashboardHighlightsCards() {
      const allCards = (dashboardTrackerState.categories || []).flatMap(category => category.cards || []);
      if (dashTrackerHighlights) {
        const highlights = [...allCards]
          .filter(card => !card?.hideTimer && card?.expiresAt)
          .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
          .slice(0, 4);
        dashTrackerHighlights.innerHTML = highlights.length
          ? highlights.map(card => `
              <div class="dash-list-row">
                <span>${escapeHtml(card.title || card.label || 'Tracker')}</span>
                <span class="dash-list-row__meta">${escapeHtml(formatDashboardCountdown(card.expiresAt))}</span>
              </div>
            `).join('')
          : '<div class="dash-list-row"><span>No tracker highlights yet.</span><span class="dash-list-row__meta">—</span></div>';
      }

      if (dashResetSummary || dashDailyStatus) {
        const timed = [...allCards].filter(card => card?.expiresAt && !card?.hideTimer);
        const soonest = timed.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0] || null;
        const daily = allCards.find(card => /daily|sortie|archon|nightwave/i.test(String(card?.title || '') + ' ' + String(card?.label || ''))) || null;
        if (dashResetSummary) {
          dashResetSummary.textContent = soonest
            ? `${soonest.title || soonest.label || 'Cycle'} resets in ${formatDashboardCountdown(soonest.expiresAt)}`
            : 'No reset timers available yet.';
        }
        if (dashDailyStatus) {
          dashDailyStatus.textContent = daily
            ? `${String(daily.title || daily.label || 'Daily').toUpperCase()} // ${String(daily.state || 'Active').toUpperCase()}`
            : 'NO DAILY STATUS YET';
        }
      }
    }

    function renderDashboardCodexCard() {
      if (!dashCodexRecent) return;
      let pinned = [];
      try {
        pinned = JSON.parse(localStorage.getItem('orbiterCodexPinnedEntries') || '[]');
      } catch {
        pinned = [];
      }
      if (!Array.isArray(pinned) || !pinned.length) {
        dashCodexRecent.innerHTML = '<div class="dash-list-row"><span>No pinned entries yet.</span><span class="dash-list-row__meta">—</span></div>';
        return;
      }
      dashCodexRecent.innerHTML = pinned.slice(0, 4).map(entry => `
        <div class="dash-list-row">
          <span>${escapeHtml(entry?.title || 'Untitled')}</span>
          <span class="dash-list-row__meta">${escapeHtml(String(entry?.category || 'codex'))}</span>
        </div>
      `).join('');
    }

    async function refreshDashboardTrackers() {
      const now = Date.now();
      const refreshAge = now - (dashboardTrackerState.lastFetchAt || 0);
      const cachedCyclesExpired = dashboardTrackerState.lastData && hasExpiredWarframeStatCycles(dashboardTrackerState.lastData);
      if ((dashboardTrackerState.lastData || dashboardTrackerState.lastFetchAt) && refreshAge < 60000 && !cachedCyclesExpired) {
        if (dashboardTrackerState.lastData) {
          setDashboardCategories(mapWarframeStatWorldstateToDashboardCategories(dashboardTrackerState.lastData));
          renderDashboardTrackerCards();
          updateDashboardCountdowns();
          if (dashboardTrackerState.syncedAt) {
            setDashboardTrackerStatus(`Live via ${dashboardTrackerState.source || 'WarframeStat.us'} // ${dashboardTrackerState.syncedAt.toLocaleTimeString()}`);
          }
        } else {
          renderDashboardTrackerCards();
          setDashboardTrackerStatus('WarframeStat.us unavailable');
        }
        return;
      }

      setDashboardTrackerStatus('Syncing WarframeStat.us...');
      ensureDashboardNodeLookup().then(() => {
        if (!dashboardTrackerState.lastData) return;
        // Re-map in place so readable node/type text appears without refetching.
        setDashboardCategories(mapWarframeStatWorldstateToDashboardCategories(dashboardTrackerState.lastData));
        renderDashboardTrackerCards();
        updateDashboardCountdowns();
      });
      setDashboardCategories(loadingDashboardCategories('Loading WarframeStat.us data for this category...'));
      renderDashboardTrackerCards();
      try {
        dashboardTrackerState.lastFetchAt = Date.now();
        const result = await fetchDashboardWorldstateJson({ refresh: cachedCyclesExpired });
        setDashboardCategories(mapWarframeStatWorldstateToDashboardCategories(result.data));
        dashboardTrackerState.source = result.source;
        dashboardTrackerState.syncedAt = new Date();
        dashboardTrackerState.lastData = result.data;
        renderDashboardTrackerCards();
        updateDashboardCountdowns();
        setDashboardTrackerStatus(`Live via ${result.source} // ${dashboardTrackerState.syncedAt.toLocaleTimeString()}`);
      } catch (error) {
        setDashboardCategories(unavailableDashboardCategories(error?.message || 'WarframeStat.us did not return world-state data.'));
        renderDashboardTrackerCards();
        setDashboardTrackerStatus('WarframeStat.us unavailable');
        logClientError('dashboard world-state refresh', error);
      }
    }

    if (currentSectionName === 'trackers') refreshDashboardTrackers();
    setInterval(() => {
      if (currentSectionName === 'trackers') refreshDashboardTrackers();
    }, 60000);
    setInterval(updateDashboardCountdowns, 1000);
    setInterval(renderDashboardCodexCard, 8000);
    renderDashboardCodexCard();

    const marketItemSearch = document.getElementById('marketItemSearch');
    const marketSearchBtn = document.getElementById('marketSearchBtn');
    const marketResults = document.getElementById('marketResults');
    const marketApiStatus = document.getElementById('marketApiStatus');
    const marketSelectedTitle = document.getElementById('marketSelectedTitle');
    const marketSelectedMeta = document.getElementById('marketSelectedMeta');
    const marketOrdersUpdated = document.getElementById('marketOrdersUpdated');
    const marketRefreshOrdersBtn = document.getElementById('marketRefreshOrdersBtn');
    const marketStats = document.getElementById('marketStats');
    const marketSellOrders = document.getElementById('marketSellOrders');
    const marketBuyOrders = document.getElementById('marketBuyOrders');
    const marketSellCount = document.getElementById('marketSellCount');
    const marketBuyCount = document.getElementById('marketBuyCount');
    const marketTabSell = document.getElementById('marketTabSell');
    const marketTabBuy = document.getElementById('marketTabBuy');
    const marketViewSellBtn = document.getElementById('marketViewSellBtn');
    const marketViewBuyBtn = document.getElementById('marketViewBuyBtn');
    const marketSellPanel = document.getElementById('marketSellPanel');
    const marketBuyPanel = document.getElementById('marketBuyPanel');
    const marketBuyMin = document.getElementById('marketBuyMin');
    const marketBuyMax = document.getElementById('marketBuyMax');
    const marketSellMin = document.getElementById('marketSellMin');
    const marketSellMax = document.getElementById('marketSellMax');
    const marketSellStatus = document.getElementById('marketSellStatus');
    const marketSellSort = document.getElementById('marketSellSort');
    const marketBuyStatus = document.getElementById('marketBuyStatus');
    const marketBuySort = document.getElementById('marketBuySort');
    const marketModal = document.getElementById('marketModal');
    const marketModalTitle = document.getElementById('marketModalTitle');
    const marketModalCount = document.getElementById('marketModalCount');
    const marketModalList = document.getElementById('marketModalList');
    const marketModalClose = document.getElementById('marketModalClose');
    const marketModalTabSell = document.getElementById('marketModalTabSell');
    const marketModalTabBuy = document.getElementById('marketModalTabBuy');
    const marketModalStatus = document.getElementById('marketModalStatus');
    const marketModalSort = document.getElementById('marketModalSort');
    const marketModalMin = document.getElementById('marketModalMin');
    const marketModalMax = document.getElementById('marketModalMax');
    const marketFavoriteToggle = document.getElementById('marketFavoriteToggle');
    const marketFavoritesList = document.getElementById('marketFavoritesList');
    const marketAutoRefreshToggle = document.getElementById('marketAutoRefreshToggle');
    const marketAutoRefreshInterval = document.getElementById('marketAutoRefreshInterval');

    const MARKET_FAVORITES_KEY = 'orbiter_market_favorites_v1';
    const MARKET_AUTO_REFRESH_KEY = 'orbiter_market_auto_refresh_v1';
    const MARKET_AUTO_REFRESH_INTERVAL_KEY = 'orbiter_market_auto_refresh_interval_v1';

    const marketState = {
      catalog: [],
      loaded: false,
      loading: false,
      loadPromise: null,
      failed: false,
      error: null,
      activeSource: 'direct',
      ordersUpdatedAt: null,
      ordersUpdatedSource: '',
      suggestions: [],
      suggestionIndex: -1,
      autocompleteVisible: false,
      lastResults: [],
      selectedItem: null,
      // Raw orders are stored once per item selection; filters/sorts are applied locally.
      rawOrders: [],
      rawOrderCount: 0,
      ingameOrderCount: 0,
      sellOrders: [],
      buyOrders: [],
      favorites: [],
      autoRefreshEnabled: localStorage.getItem(MARKET_AUTO_REFRESH_KEY) === '1',
      autoRefreshIntervalMs: Number(localStorage.getItem(MARKET_AUTO_REFRESH_INTERVAL_KEY) || 45000) || 45000,
      autoRefreshTimer: 0,
      ordersCache: new Map(),
      ordersCacheTtlMs: 30000,
      ordersAbortController: null,
      inputDebounceTimer: 0
    };

    const marketUi = {
      activeSide: 'sell'
    };

    const marketModalState = {
      open: false,
      side: 'sell',
      prevBodyOverflow: ''
    };

    function setMarketStatus(text) {
      if (marketApiStatus) marketApiStatus.textContent = text;
    }

    function loadMarketFavorites() {
      try {
        const parsed = JSON.parse(localStorage.getItem(MARKET_FAVORITES_KEY) || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map(entry => ({
            item_name: String(entry?.item_name || '').trim(),
            url_name: String(entry?.url_name || '').trim()
          }))
          .filter(entry => entry.item_name && entry.url_name);
      } catch {
        return [];
      }
    }

    function saveMarketFavorites() {
      localStorage.setItem(MARKET_FAVORITES_KEY, JSON.stringify(marketState.favorites));
    }

    function isFavoriteItem(item) {
      if (!item?.url_name) return false;
      return marketState.favorites.some(entry => entry.url_name === item.url_name);
    }

    function setFavoriteToggleLabel() {
      if (!marketFavoriteToggle) return;
      const selected = marketState.selectedItem;
      const fav = selected && isFavoriteItem(selected);
      marketFavoriteToggle.textContent = fav ? 'Unfavorite' : 'Favorite';
      marketFavoriteToggle.disabled = !selected;
      marketFavoriteToggle.classList.toggle('is-active', Boolean(fav));
    }

    function renderMarketFavorites() {
      if (!marketFavoritesList) return;
      if (!marketState.favorites.length) {
        marketFavoritesList.innerHTML = '<div class="border border-terminal/25 p-2 text-xs text-green-200/75">No favorites saved.</div>';
        return;
      }
      marketFavoritesList.innerHTML = marketState.favorites.map(item => `
        <button class="market-favorite-row w-full text-left border border-terminal/25 px-3 py-2 hover:bg-terminal hover:text-black transition-colors" data-url="${htmlEscape(item.url_name)}">
          <div class="text-xs font-bold">${htmlEscape(item.item_name)}</div>
          <div class="text-[10px] uppercase tracking-[0.18em] opacity-70 mt-1">${htmlEscape(item.url_name)}</div>
        </button>
      `).join('');
      marketFavoritesList.querySelectorAll('.market-favorite-row').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = marketState.catalog.find(entry => entry.url_name === btn.dataset.url)
            || marketState.favorites.find(entry => entry.url_name === btn.dataset.url);
          if (!item) return;
          if (marketItemSearch) marketItemSearch.value = item.item_name;
          loadMarketItem(item).catch(error => logClientError('market favorite load', error, { url: item.url_name }));
        });
      });
    }

    function toggleSelectedFavorite() {
      const selected = marketState.selectedItem;
      if (!selected) return;
      const exists = marketState.favorites.find(entry => entry.url_name === selected.url_name);
      if (exists) {
        marketState.favorites = marketState.favorites.filter(entry => entry.url_name !== selected.url_name);
      } else {
        marketState.favorites.unshift({
          item_name: selected.item_name,
          url_name: selected.url_name
        });
      }
      saveMarketFavorites();
      setFavoriteToggleLabel();
      renderMarketFavorites();
    }

    function clearMarketAutoRefreshTimer() {
      if (marketState.autoRefreshTimer) {
        window.clearTimeout(marketState.autoRefreshTimer);
        marketState.autoRefreshTimer = 0;
      }
    }

    function scheduleMarketAutoRefresh() {
      clearMarketAutoRefreshTimer();
      if (!marketState.autoRefreshEnabled || !marketState.selectedItem) return;
      marketState.autoRefreshTimer = window.setTimeout(() => {
        if (!marketState.selectedItem || !marketState.autoRefreshEnabled) return;
        loadMarketItem(marketState.selectedItem, { reason: 'auto' }).catch(error => logClientError('market auto refresh', error));
      }, marketState.autoRefreshIntervalMs);
    }

    function syncMarketAutoRefreshControls() {
      if (marketAutoRefreshToggle) marketAutoRefreshToggle.checked = Boolean(marketState.autoRefreshEnabled);
      if (marketAutoRefreshInterval) marketAutoRefreshInterval.value = String(Math.round(marketState.autoRefreshIntervalMs / 1000));
    }

    function formatLocalTimestamp(date) {
      try {
        return new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(date);
      } catch {
        return date.toLocaleTimeString();
      }
    }

    function setMarketOrdersUpdated(date, source = '') {
      marketState.ordersUpdatedAt = date || null;
      marketState.ordersUpdatedSource = source || '';
      if (!marketOrdersUpdated) return;
      if (!marketState.ordersUpdatedAt) {
        marketOrdersUpdated.textContent = 'Last updated: -';
        return;
      }
      const time = formatLocalTimestamp(marketState.ordersUpdatedAt);
      marketOrdersUpdated.textContent = `Last updated: ${time}${source ? ` (${source})` : ''}`;
    }

    function marketNorm(text) {
      return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function pickFirstArray(candidates) {
      for (const value of candidates) {
        if (Array.isArray(value)) return value;
      }
      return [];
    }

    function getCatalogItemsFromResponse(data) {
      return pickFirstArray([
        data?.data?.payload?.items,
        data?.payload?.items,
        data?.items,
        Array.isArray(data) ? data : null
      ]);
    }

    function getOrdersFromResponse(data) {
      return pickFirstArray([
        data?.payload?.orders,
        data?.orders,
        Array.isArray(data) ? data : null
      ]);
    }

    function getOrderStatus(order) {
      return String(order?.user?.status || order?.status || '').toLowerCase().trim();
    }

    function getOrderType(order) {
      const rawType = String(order?.order_type || '').toLowerCase().trim();
      if (rawType === 'seller') return 'sell';
      if (rawType === 'buyer') return 'buy';
      return rawType;
    }

    function normalizeOrders(data) {
      const rawOrders = getOrdersFromResponse(data);
      return normalizeOrdersFromRaw(rawOrders);
    }

    function normalizeOrdersFromRaw(rawOrders) {
      const mapped = (Array.isArray(rawOrders) ? rawOrders : []).map(order => {
        const userObj = (order && typeof order.user === 'object' && order.user !== null) ? order.user : {};
        const status = getOrderStatus(order);
        const platinumRaw = order?.platinum ?? order?.price ?? order?.price_platinum;
        const normalizedSide = getOrderType(order);
        return {
          ...order,
          user: typeof order?.user === 'string'
            ? { ingameName: order.user, status, platform: order?.platform || order?.user_platform || 'pc' }
            : { ...userObj, status: String(userObj?.status || status).toLowerCase().trim() },
          order_type: normalizedSide,
          status,
          platinum: Number.isFinite(Number(platinumRaw)) ? Number(platinumRaw) : platinumRaw,
          visible: order?.visible !== false
        };
      });
      return {
        sellOrders: mapped.filter(order => order.visible && order.order_type === 'sell'),
        buyOrders: mapped.filter(order => order.visible && order.order_type === 'buy')
      };
    }

    async function fetchMarketJson(path, options = {}) {
      const withCacheBust = (() => {
        const p = String(path);
        if (!p.includes('/api/market/orders/') && !p.includes('/market/orders/')) return path;
        const sep = path.includes('?') ? '&' : '?';
        return `${path}${sep}_cb=${Date.now()}`;
      })();
      const url = buildMarketProxyUrl(withCacheBust);
      if (MARKET_DEBUG) console.log('[MARKET_DEBUG] API URL', url);
      logRequest('market proxy', url);
      let response;
      try {
        response = await fetch(url, {
          cache: 'no-store',
          signal: options.signal
        });
      } catch (error) {
        const wrapped = new Error(`market proxy network error from ${url}: ${error?.message || 'request failed'}`);
        wrapped.fetchUrl = url;
        wrapped.httpStatus = 0;
        throw wrapped;
      }
      logResponse('market proxy', response);
      if (!response.ok) {
        let bodyText = '';
        try {
          bodyText = await response.text();
        } catch {
          bodyText = '';
        }
        const wrapped = new Error(`market proxy HTTP ${response.status} from ${url}`);
        wrapped.fetchUrl = url;
        wrapped.httpStatus = response.status;
        wrapped.responseBody = bodyText ? bodyText.slice(0, 500) : '';
        throw wrapped;
      }
      const json = await parseJsonResponse(response, 'market proxy');
      marketState.activeSource = json?.source || 'cloudflare-worker';
      return json;
    }

    async function ensureMarketCatalog() {
      if (!MARKET_PROXY_URL) {
        marketState.catalog = [];
        marketState.loaded = false;
        marketState.failed = true;
        marketState.error = new Error('Market proxy required');
        setMarketStatus('Market proxy required');
        throw marketState.error;
      }
      if (marketState.loaded) {
        marketDebugLog('catalog-cache', `items=${marketState.catalog.length}`);
        return marketState.catalog;
      }
      if (marketState.loading && marketState.loadPromise) return marketState.loadPromise;
      marketState.loading = true;
      marketState.failed = false;
      marketState.error = null;
      setMarketStatus('Catalog sync via market proxy...');
      const catalogStart = marketNow();

      marketState.loadPromise = (async () => {
        const data = await fetchMarketJson('/api/market/items');
        const rawItems = getCatalogItemsFromResponse(data);
        const detectedPath = Array.isArray(data?.data?.payload?.items)
          ? 'data.payload.items'
          : (Array.isArray(data?.payload?.items)
            ? 'payload.items'
            : (Array.isArray(data?.items)
              ? 'items'
              : (Array.isArray(data) ? 'array' : 'none')));
        logJson('market catalog raw response', data);
        console.log('[orbiter] market catalog top-level response keys', Object.keys(data || {}));
        console.log('[orbiter] market catalog detected item array path', detectedPath);
        console.log('[orbiter] market catalog usable source rows', rawItems.length);
        marketState.catalog = rawItems
          .map(item => ({
            item_name: item.item_name || item.name || item?.i18n?.en?.name || item.title || item.slug || item.url_name,
            url_name: item.item_url_name || item.url_name || item.slug || item.id,
            norm_name: marketNorm(item.item_name || item.name || item?.i18n?.en?.name || item.title || item.slug || item.url_name)
          }))
          .filter(item => item.item_name && item.url_name)
          .sort((a, b) => a.item_name.localeCompare(b.item_name));
        console.log('[orbiter] market catalog usable mapped items', marketState.catalog.length);
        console.log('[orbiter] market catalog first usable item sample', marketState.catalog[0] || null);
        if (!marketState.catalog.length) {
          const diag = data?.diagnostic || {};
          throw new Error(`empty result: market item dataset returned zero usable items (${diag.detectedPath || detectedPath || 'unknown path'})`);
        }
        marketState.loaded = true;
        marketState.failed = false;
        marketState.error = null;
        const source = data?.source || marketState.activeSource;
        marketDebugLog('catalog', `loaded=${marketState.catalog.length} source=${source} duration=${(marketNow() - catalogStart).toFixed(1)}ms`);
        setMarketStatus(`catalog fetch ok | ${marketState.catalog.length} items (${source})`);
        return marketState.catalog;
      })();

      try {
        return await marketState.loadPromise;
      } catch (error) {
        const httpStatus = Number(error?.httpStatus || 0);
        const fetchUrl = error?.fetchUrl || buildMarketProxyUrl('/api/market/items');
        const reason = error?.message === 'Market proxy required'
          ? 'Market proxy required'
          : error?.message?.includes('catalog_parse_failed') || error?.message?.includes('catalog_zero_usable_items')
            ? (error?.message || 'catalog parse failed')
          : error?.message?.includes('HTTP') || httpStatus > 0
            ? 'market proxy endpoint or HTTP error'
          : error?.message?.includes('parse error')
            ? 'parse error'
            : 'network/CORS/proxy blocked';
        marketState.catalog = [];
        marketState.loaded = false;
        marketState.failed = true;
        marketState.error = error;
        setMarketStatus(
          reason === 'Market proxy required'
            ? reason
            : `Catalog failed: ${reason} | url=${fetchUrl} | status=${httpStatus || 'network'}`
        );
        logClientError('market catalog fetch', error);
        throw error;
      } finally {
        marketState.loading = false;
        marketState.loadPromise = null;
      }
    }

    function marketMatches(query, limit = 20) {
      const q = String(query || '').trim().toLowerCase();
      if (!q) return [];
      if (!marketState.loaded) {
        logClientError('market match', new Error('Catalog not loaded yet'), { query });
        return [];
      }
      const firstFive = marketState.catalog.slice(0, 5).map(item => ({
        item_name: item?.item_name || '',
        url_name: item?.url_name || ''
      }));
      console.log('[MARKET] query', q);
      console.log('[MARKET] first 5 items from dataset', firstFive);

      const exact = marketState.catalog.filter(item => String(item?.item_name || '').toLowerCase() === q);
      if (exact.length) return exact.slice(0, limit);

      const includes = marketState.catalog.filter(item => String(item?.item_name || '').toLowerCase().includes(q));
      return includes.slice(0, limit);
    }

    function hideMarketAutocomplete(options = {}) {
      const restoreResults = Boolean(options.restoreResults);
      marketState.suggestions = [];
      marketState.suggestionIndex = -1;
      const wasVisible = marketState.autocompleteVisible;
      marketState.autocompleteVisible = false;
      if (!restoreResults || !wasVisible || !marketResults) return;
      const query = marketItemSearch?.value || '';
      renderMarketResults(marketState.lastResults || [], query);
    }

    function renderMarketAutocomplete(items) {
      if (!marketResults || !items.length) return hideMarketAutocomplete();
      marketState.suggestions = items;
      marketState.suggestionIndex = -1;
      marketState.autocompleteVisible = true;
      marketResults.innerHTML = `
        <div class="uppercase text-[10px] tracking-[0.25em] text-terminal/70 mb-2">Suggestions</div>
        <div class="space-y-2">
          ${items.map(item => `
        <button class="market-suggestion w-full text-left px-4 py-3 border-b border-terminal/20 last:border-b-0 hover:bg-terminal hover:text-black" data-url="${item.url_name}">
          <div class="font-bold text-sm">${item.item_name}</div>
          <div class="text-[10px] uppercase tracking-[0.2em] opacity-70 mt-1">${item.url_name}</div>
        </button>
          `).join('')}
        </div>
      `;
      marketResults.querySelectorAll('.market-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = marketState.catalog.find(entry => entry.url_name === btn.dataset.url);
          if (!item) {
            logClientError('market suggestion select', new Error('Selected suggestion not found'), { url: btn.dataset.url || '' });
            return;
          }
          console.log('[MARKET] selected item name', item.item_name);
          console.log('[MARKET] selected item url_name', item.url_name);
          marketItemSearch.value = item.item_name;
          hideMarketAutocomplete();
          renderMarketResults([item], item.item_name);
          loadMarketItem(item);
        });
      });
    }

    function renderMarketResults(items, query = '') {
      if (!marketResults) return;
      marketState.autocompleteVisible = false;
      marketState.lastResults = Array.isArray(items) ? [...items] : [];
      if (!query.trim()) {
        marketResults.innerHTML = '<div class="border border-terminal/25 p-3 text-sm text-green-200/80">Search to load market results.</div>';
        return;
      }
      if (!items.length) {
        if (!marketState.loaded || marketState.failed) {
          const reason = marketState.error?.message || 'catalog did not finish loading';
          const text = reason === 'Market proxy required'
            ? 'Market proxy required'
            : `Catalog failed: cannot search "${marketNorm(query)}". Reason: ${reason}`;
          marketResults.innerHTML = `<div class="border border-terminal/25 p-3 text-sm text-green-200/80">${text}</div>`;
          return;
        }
        marketResults.innerHTML = `<div class="border border-terminal/25 p-3 text-sm text-green-200/80">Empty result: no v2 market item name matched "${marketNorm(query)}" in ${marketState.catalog.length} loaded items.</div>`;
        return;
      }
      marketResults.innerHTML = items.map(item => `
        <button class="market-result-row w-full text-left border border-terminal/25 p-3 hover:bg-terminal hover:text-black" data-url="${item.url_name}">
          <div class="font-bold text-sm">${item.item_name}</div>
          <div class="text-[10px] uppercase tracking-[0.2em] opacity-70 mt-1">${item.url_name}</div>
        </button>
      `).join('');
      marketResults.querySelectorAll('.market-result-row').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = marketState.catalog.find(entry => entry.url_name === btn.dataset.url);
          if (!item) {
            logClientError('market result select', new Error('Selected result not found'), { url: btn.dataset.url || '' });
            return;
          }
          console.log('[MARKET] selected item name', item.item_name);
          console.log('[MARKET] selected item url_name', item.url_name);
          marketItemSearch.value = item.item_name;
          loadMarketItem(item);
        });
      });
    }

    function htmlEscape(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    }

    function jsAttrEscape(value) {
      return htmlEscape(String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
    }

    function copyWhisper(order, actionOverride) {
      const username = order?.user?.ingameName || order?.user?.ingame_name || order?.user || 'Unknown';
      const price = Number(order?.platinum);
      const action = actionOverride || (getOrderType(order) === 'buy' ? 'buy' : 'sell');
      return copyMarketWhisper(action, username, price);
    }

    function renderOrderRows(orders, action, options = {}) {
      const fragment = document.createDocumentFragment();
      const cheapestId = options?.cheapestId || '';
      const formatStatus = (value) => {
        const raw = String(value || '').toLowerCase().trim();
        if (raw === 'ingame') return { key: 'ingame', label: 'In Game' };
        if (raw === 'online') return { key: 'online', label: 'Online' };
        if (raw === 'offline') return { key: 'offline', label: 'Offline' };
        return { key: 'unknown', label: '—' };
      };
      const formatSeenOrRep = (order, rep) => {
        const seenRaw = order?.creation_date || order?.last_seen || order?.lastSeen || '';
        const seenText = String(seenRaw || '').trim();
        const repText = (rep === 'n/a' || rep === undefined || rep === null || rep === '') ? '—' : String(rep);
        if (seenText && repText !== '—') return `${seenText} / Rep ${repText}`;
        if (seenText) return seenText;
        if (repText !== '—') return `Rep ${repText}`;
        return '—';
      };
      (orders || []).forEach(order => {
        const username = order.user?.ingameName || order.user?.ingame_name || order.user || '—';
        const platformRaw = String(order.user?.platform || order.platform || '').trim();
        const platform = platformRaw ? platformRaw.toUpperCase() : '—';
        const statusMeta = formatStatus(order?.user?.status);
        const rep = order.user?.reputation ?? order.reputation ?? 'n/a';
        const seenOrRep = formatSeenOrRep(order, rep);
        const priceNum = Number(order.platinum);
        const price = Number.isFinite(priceNum) ? `${priceNum}p` : '—';
        const qtyNum = Number(order.quantity);
        const qty = Number.isFinite(qtyNum) ? qtyNum : '—';
        const uid = `${username}|${price}|${qty}`;

        const row = document.createElement('div');
        row.className = `market-order-row${cheapestId && cheapestId === uid ? ' market-order-row--best' : ''}`;
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');

        row.innerHTML = `
          <div class="market-order-cell market-order-cell--price market-order-row__value--price">${htmlEscape(price)}</div>
          <div class="market-order-cell market-order-cell--user" title="${htmlEscape(username)}">${htmlEscape(username)}</div>
          <div class="market-order-cell market-order-cell--qty">${htmlEscape(qty)}</div>
          <div class="market-order-cell market-order-cell--status">
            <span class="market-status-badge market-status-badge--${htmlEscape(statusMeta.key)}">${htmlEscape(statusMeta.label)}</span>
          </div>
          <div class="market-order-cell market-order-cell--platform">${htmlEscape(platform)}</div>
          <div class="market-order-cell market-order-cell--seen-rep" title="${htmlEscape(seenOrRep)}">${htmlEscape(seenOrRep)}</div>
          <div class="market-order-cell market-order-cell--copy">
            <button type="button" class="market-order-row__copy-btn">Copy Whisper</button>
          </div>
        `;

        const copyBtn = row.querySelector('.market-order-row__copy-btn');
        const baseCopyLabel = copyBtn?.textContent || 'Copy Whisper';
        const doCopy = async () => {
          try {
            if (copyBtn) copyBtn.textContent = 'Copying...';
            await copyWhisper(order, action);
            row.classList.add('is-copied', 'copied');
            if (row.__copiedTimer) window.clearTimeout(row.__copiedTimer);
            if (copyBtn) copyBtn.textContent = 'Copied!';
            row.__copiedTimer = window.setTimeout(() => {
              row.classList.remove('is-copied', 'copied');
              if (copyBtn) copyBtn.textContent = baseCopyLabel;
            }, 1800);
          } catch {
            if (copyBtn) copyBtn.textContent = 'Copy failed';
            window.setTimeout(() => {
              if (copyBtn) copyBtn.textContent = baseCopyLabel;
            }, 1400);
          }
        };

        row.addEventListener('click', doCopy);
        row.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            doCopy();
          }
        });
        if (copyBtn) {
          copyBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await doCopy();
          });
        }
        fragment.appendChild(row);
      });
      return fragment;
    }

    function renderOrderBook(target, orders, emptyText, action, options = {}) {
      if (!target) return;
      const renderStart = marketNow();
      if (!orders.length) {
        target.innerHTML = `<div class="border border-terminal/25 p-2 text-xs">${emptyText}</div>`;
        marketDebugLog('render-book', `target=${target.id || 'unknown'} rows=0 duration=${(marketNow() - renderStart).toFixed(1)}ms`);
        return;
      }
      const statusPriority = {
        ingame: 0,
        online: 1,
        offline: 2
      };
      const displayOrders = [...orders].sort((a, b) => {
        const aStatus = String(a?.user?.status || '').toLowerCase().trim();
        const bStatus = String(b?.user?.status || '').toLowerCase().trim();
        return (statusPriority[aStatus] ?? 99) - (statusPriority[bStatus] ?? 99);
      });
      target.innerHTML = '';
      const fragment = document.createDocumentFragment();
      const header = document.createElement('div');
      header.className = 'market-order-head';
      header.innerHTML = `
        <span>Price</span>
        <span>User</span>
        <span>Qty</span>
        <span>Status</span>
        <span>Platform</span>
        <span>Last Seen / Rep</span>
        <span>Copy</span>
      `;
      fragment.appendChild(header);
      fragment.appendChild(renderOrderRows(displayOrders, action, options));
      target.appendChild(fragment);
      marketDebugLog('render-book', `target=${target.id || 'unknown'} rows=${orders.length} duration=${(marketNow() - renderStart).toFixed(1)}ms`);
    }

    function marketWhisper(action, username, price) {
      const itemName = (marketState.selectedItem?.item_name || '').replace(/"/g, '\\"');
      const verb = action === 'buy' ? 'buy' : 'sell';
      return `/w ${username} Hi! I want to ${verb}: "${itemName}" for ${price} platinum. (warframe.market)`;
    }

    async function copyMarketWhisper(action, username, price) {
      const value = marketWhisper(action, username, price);
      if (!value) return;
      try {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const scratch = document.createElement('textarea');
          scratch.value = value;
          scratch.style.position = 'fixed';
          scratch.style.opacity = '0';
          document.body.append(scratch);
          scratch.select();
          document.execCommand('copy');
          scratch.remove();
        }
      } catch (error) {
        logClientError('market whisper copy', error, { action, username, price });
        throw error;
      }
      setMarketStatus(`${action === 'buy' ? 'Buy' : 'Sell'} whisper copied`);
    }

    function bindWhisperButtons(root) {
      root.querySelectorAll('.market-whisper-copy').forEach(button => {
        if (button.dataset.bound === '1') return;
        button.dataset.bound = '1';
        button.addEventListener('click', async () => {
          const original = button.dataset.originalText || button.textContent || 'Copy Whisper';
          button.dataset.originalText = original;

          // Restore the previous "Copied" button back to its original label.
          if (lastCopiedWhisperBtn && lastCopiedWhisperBtn !== button) {
            lastCopiedWhisperBtn.textContent = lastCopiedWhisperBtn.dataset.originalText || lastCopiedWhisperText;
          }

          button.textContent = 'Copying...';
          try {
            await copyMarketWhisper(button.dataset.action, button.dataset.user, button.dataset.price);
            button.textContent = 'Copied';
            lastCopiedWhisperBtn = button;
            lastCopiedWhisperText = original;
          } catch {
            button.textContent = 'Copy failed';
            window.setTimeout(() => {
              button.textContent = original;
            }, 900);
            return;
          }
        });
      });
    }

    function getPlatFilter(minInput, maxInput) {
      const minRaw = String(minInput?.value ?? '').trim();
      const maxRaw = String(maxInput?.value ?? '').trim();
      let min = minRaw === '' ? null : Number(minRaw);
      let max = maxRaw === '' ? null : Number(maxRaw);
      min = Number.isFinite(min) ? min : null;
      max = Number.isFinite(max) ? max : null;
      if (min !== null && max !== null && min > max) {
        const swap = min;
        min = max;
        max = swap;
      }
      return {
        min,
        max
      };
    }

    function applyPlatFilter(orders, minInput, maxInput) {
      const { min, max } = getPlatFilter(minInput, maxInput);
      if (min === null && max === null) return orders;
      return orders.filter(order => {
        const price = Number(order.platinum);
        if (!Number.isFinite(price)) return false;
        if (min !== null && price < min) return false;
        if (max !== null && price > max) return false;
        return true;
      });
    }

    function applyStatusFilter(orders, statusValue) {
      const status = String(statusValue || 'all').toLowerCase().trim();
      if (status === 'all') return orders;
      return orders.filter(order => getOrderStatus(order) === status);
    }

    function filterOrders(orders, activeTab, filters = {}) {
      const tab = activeTab === 'buy' ? 'buy' : 'sell';
      const minInput = filters.minInput || null;
      const maxInput = filters.maxInput || null;
      const status = filters.statusValue || 'all';
      const tabOrders = (orders || []).filter(order => order?.visible !== false && getOrderType(order) === tab);
      const statusFiltered = applyStatusFilter(tabOrders, status);
      return applyPlatFilter(statusFiltered, minInput, maxInput);
    }

    function applyPriceSort(orders, sortValue, defaultValue) {
      const value = String(sortValue || defaultValue || '').toLowerCase();
      const dir = value === 'price_desc' ? -1 : 1;
      return [...orders].sort((a, b) => {
        const ap = Number(a.platinum);
        const bp = Number(b.platinum);
        if (!Number.isFinite(ap) && !Number.isFinite(bp)) return 0;
        if (!Number.isFinite(ap)) return 1;
        if (!Number.isFinite(bp)) return -1;
        return (ap - bp) * dir;
      });
    }

    function statusRank(status) {
      // warframe.market typical statuses: ingame, online, offline
      // Keep unknown statuses last.
      const s = String(status || '').toLowerCase();
      if (s === 'ingame') return 0;
      return 3;
    }

    function applyStatusThenPriceSort(orders, sortValue, defaultValue) {
      const value = String(sortValue || defaultValue || '').toLowerCase();
      const dir = value === 'price_desc' ? -1 : 1;
      return [...orders].sort((a, b) => {
        const ar = statusRank(getOrderStatus(a));
        const br = statusRank(getOrderStatus(b));
        if (ar !== br) return ar - br;

        const ap = Number(a.platinum);
        const bp = Number(b.platinum);
        if (!Number.isFinite(ap) && !Number.isFinite(bp)) return 0;
        if (!Number.isFinite(ap)) return 1;
        if (!Number.isFinite(bp)) return -1;
        return (ap - bp) * dir;
      });
    }

    function sortOrders(orders, sortMode, defaultMode = 'price_asc') {
      return applyPriceSort(orders, sortMode, defaultMode);
    }

    function getMarketFilteredOrdersWithDebug(side) {
      const isBuy = side === 'buy';
      const status = isBuy ? (marketBuyStatus?.value || 'all') : (marketSellStatus?.value || 'all');
      const sort = isBuy ? (marketBuySort?.value || 'price_desc') : (marketSellSort?.value || 'price_asc');
      const minInput = isBuy ? marketBuyMin : marketSellMin;
      const maxInput = isBuy ? marketBuyMax : marketSellMax;
      const raw = marketState.rawOrders || [];
      const sideType = isBuy ? 'buy' : 'sell';
      const sellStage = raw.filter(order => order?.visible !== false && getOrderType(order) === 'sell');
      const buyStage = raw.filter(order => order?.visible !== false && getOrderType(order) === 'buy');
      const filteredByTabAndStatus = filterOrders(raw, sideType, { minInput: null, maxInput: null, statusValue: status });
      const typeStage = sideType === 'buy' ? buyStage : sellStage;
      const ingameStage = filterOrders(raw, sideType, { minInput: null, maxInput: null, statusValue: 'ingame' });
      const statusStage = filteredByTabAndStatus;
      const filteredByPlat = applyPlatFilter(statusStage, minInput, maxInput);
      const regionPlatformStage = filteredByPlat;
      const debug = {
        raw: raw.length,
        sell: sellStage.length,
        buy: buyStage.length,
        type: typeStage.length,
        ingame: ingameStage.length,
        status: statusStage.length,
        price: filteredByPlat.length,
        regionPlatform: regionPlatformStage.length,
        visible: regionPlatformStage.length
      };
      if (MARKET_DEBUG) {
        console.log('[MARKET_DEBUG] market filter counts', {
          side,
          status,
          min: minInput?.value ?? '',
          max: maxInput?.value ?? '',
          raw: debug.raw,
          sell: debug.sell,
          buy: debug.buy,
          type: debug.type,
          ingame: debug.ingame,
          statusFiltered: debug.status,
          priceFiltered: debug.price,
          regionPlatformFiltered: debug.regionPlatform,
          visible: debug.visible
        });
      }
      if (String(status).toLowerCase() === 'all') {
        // Ingame-only rows still follow explicit sort mode.
        return {
          orders: sortOrders(regionPlatformStage, sort, isBuy ? 'price_desc' : 'price_asc'),
          debug
        };
      }
      return {
        orders: sortOrders(regionPlatformStage, sort, isBuy ? 'price_desc' : 'price_asc'),
        debug
      };
    }

    function getMarketFilteredOrders(side) {
      return getMarketFilteredOrdersWithDebug(side).orders;
    }

    function setMarketActiveSide(side) {
      marketUi.activeSide = side === 'buy' ? 'buy' : 'sell';
      if (marketTabSell) marketTabSell.classList.toggle('subtab-active', marketUi.activeSide === 'sell');
      if (marketTabBuy) marketTabBuy.classList.toggle('subtab-active', marketUi.activeSide === 'buy');

      const mobile = sectionAccordionState.enabled;
      if (marketSellPanel) marketSellPanel.dataset.active = mobile ? (marketUi.activeSide === 'sell' ? '1' : '0') : '1';
      if (marketBuyPanel) marketBuyPanel.dataset.active = mobile ? (marketUi.activeSide === 'buy' ? '1' : '0') : '1';
    }

    function setMarketModalOpen(open) {
      if (!marketModal) return Promise.resolve();
      const wantOpen = Boolean(open);
      if (marketModalState.open === wantOpen) return Promise.resolve();
      marketModalState.open = wantOpen;

      if (wantOpen) {
        // Make visible first, then flip data-open so transitions animate in.
        marketModal.classList.add('is-visible');
        marketModal.setAttribute('aria-hidden', 'false');
        marketModalState.prevBodyOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
        // Ensure a stable start state even on mobile where click/tap timing can be weird.
        marketModal.dataset.open = '0';
        marketModal.getBoundingClientRect(); // force reflow so the "closed" styles apply
        marketModal.dataset.open = '1';
        return Promise.resolve();
      }

      // Animate out, then hide from a11y and interactions.
      marketModal.dataset.open = '0';
      marketModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = marketModalState.prevBodyOverflow;
      return new Promise(resolve => {
        const panel = marketModal.querySelector('.terminal-modal__panel');
        const done = () => {
          if (panel) panel.removeEventListener('transitionend', done);
          marketModal.classList.remove('is-visible');
          resolve();
        };
        if (panel) panel.addEventListener('transitionend', done);
        window.setTimeout(done, 320);
      });
    }

    function setMarketModalSide(side) {
      marketModalState.side = side === 'buy' ? 'buy' : 'sell';
      if (marketModalTabSell) marketModalTabSell.classList.toggle('subtab-active', marketModalState.side === 'sell');
      if (marketModalTabBuy) marketModalTabBuy.classList.toggle('subtab-active', marketModalState.side === 'buy');
      if (marketModalTitle) {
        const itemName = marketState.selectedItem?.item_name || 'No item selected';
        marketModalTitle.textContent = `${itemName} // ${marketModalState.side === 'sell' ? 'Sell Orders' : 'Buy Orders'}`;
      }
    }

    function syncMarketModalControlsFromPanel() {
      if (!marketModalStatus || !marketModalSort || !marketModalMin || !marketModalMax) return;
      const isBuy = marketModalState.side === 'buy';
      const status = isBuy ? (marketBuyStatus?.value || 'all') : (marketSellStatus?.value || 'all');
      const sort = isBuy ? (marketBuySort?.value || 'price_desc') : (marketSellSort?.value || 'price_asc');
      const { min, max } = getPlatFilter(isBuy ? marketBuyMin : marketSellMin, isBuy ? marketBuyMax : marketSellMax);
      marketModalStatus.value = status;
      marketModalSort.value = sort;
      marketModalMin.value = min === null ? '' : String(min);
      marketModalMax.value = max === null ? '' : String(max);
    }

    function applyMarketModalControlsToPanel() {
      const isBuy = marketModalState.side === 'buy';
      const statusEl = isBuy ? marketBuyStatus : marketSellStatus;
      const sortEl = isBuy ? marketBuySort : marketSellSort;
      const minEl = isBuy ? marketBuyMin : marketSellMin;
      const maxEl = isBuy ? marketBuyMax : marketSellMax;
      if (statusEl && marketModalStatus) statusEl.value = marketModalStatus.value;
      if (sortEl && marketModalSort) sortEl.value = marketModalSort.value;
      if (minEl && marketModalMin) minEl.value = marketModalMin.value;
      if (maxEl && marketModalMax) maxEl.value = marketModalMax.value;
    }

    function renderMarketModalList() {
      if (!marketModalList) return;
      if (!marketState.selectedItem) {
        marketModalList.innerHTML = '<div class="border border-terminal/25 p-3 text-sm text-green-200/80">Select an item to view orders.</div>';
        if (marketModalCount) marketModalCount.textContent = 'Showing 0 of 0';
        return;
      }
      const { orders } = getMarketFilteredOrdersWithDebug(marketModalState.side);
      const total = marketModalState.side === 'buy' ? marketState.buyOrders.length : marketState.sellOrders.length;
      if (marketModalCount) marketModalCount.textContent = `Showing ${orders.length} of ${total}`;
      renderOrderBook(
        marketModalList,
        orders,
        marketModalState.side === 'sell' ? 'No ingame sellers available' : 'No orders match these filters.',
        marketModalState.side === 'sell' ? 'buy' : 'sell'
      );
    }

    function openMarketModal(side) {
      console.log('[MARKET] View Orders selected item name', marketState.selectedItem?.item_name || '(unknown)');
      console.log('[MARKET] View Orders selected item url_name', marketState.selectedItem?.url_name || '(empty)');
      if (marketState.selectedItem?.url_name) {
        loadMarketItem(marketState.selectedItem, { reason: 'view' }).catch(error => logClientError('market view orders fetch', error));
      }
      setMarketModalSide(side);
      // Keep modal controls in sync with the small panel settings.
      syncMarketModalControlsFromPanel();
      setMarketModalOpen(true);
      renderMarketModalList();
    }

    function closeMarketModal() {
      setMarketModalOpen(false);
    }

    function renderFilteredMarketOrders() {
      const filterStart = marketNow();
      const sellResult = getMarketFilteredOrdersWithDebug('sell');
      const buyResult = getMarketFilteredOrdersWithDebug('buy');
      const filteredSell = sellResult.orders;
      const filteredBuy = buyResult.orders;
      marketDebugLog('filter', `sell=${filteredSell.length}/${marketState.sellOrders.length} buy=${filteredBuy.length}/${marketState.buyOrders.length} duration=${(marketNow() - filterStart).toFixed(1)}ms`);
      if (marketSellCount) marketSellCount.textContent = `Showing ${filteredSell.length} of ${marketState.sellOrders.length}`;
      if (marketBuyCount) marketBuyCount.textContent = `Showing ${filteredBuy.length} of ${marketState.buyOrders.length}`;
      const activeDebug = marketUi.activeSide === 'buy' ? buyResult.debug : sellResult.debug;

      const cheapestOnline = applyPriceSort(
        filteredSell.filter(order => {
          const s = getOrderStatus(order);
          return s === 'ingame';
        }),
        'price_asc',
        'price_asc'
      )[0];
      const cheapestId = cheapestOnline
        ? `${cheapestOnline.user?.ingameName || cheapestOnline.user?.ingame_name || cheapestOnline.user || 'Unknown'}|${Number(cheapestOnline.platinum)}|${cheapestOnline.quantity || 1}`
        : '';
      const renderStart = marketNow();
      if (marketUi.activeSide === 'buy') {
        renderOrderBook(marketBuyOrders, filteredBuy, 'No buy orders match these filters.', 'sell');
        renderOrderBook(marketSellOrders, filteredSell, 'No ingame sellers available', 'buy', { cheapestId });
      } else {
        renderOrderBook(marketSellOrders, filteredSell, 'No ingame sellers available', 'buy', { cheapestId });
        renderOrderBook(marketBuyOrders, filteredBuy, 'No buy orders match these filters.', 'sell');
      }
      marketDebugLog('render', `active=${marketUi.activeSide} duration=${(marketNow() - renderStart).toFixed(1)}ms`);
      renderMarketStats(getOrderStats(filteredSell), 'Sell');
      if (activeDebug.raw > 0 && filteredSell.length === 0 && filteredBuy.length === 0) {
        setMarketStatus(`Orders fetched (${activeDebug.raw}) but filters hid all rows. Raw ${activeDebug.raw} -> Sell ${activeDebug.sell} -> Buy ${activeDebug.buy} -> Ingame ${activeDebug.ingame} -> Visible ${activeDebug.visible}`);
      } else {
        setMarketStatus(`Raw ${activeDebug.raw} -> Sell ${activeDebug.sell} -> Buy ${activeDebug.buy} -> Ingame ${activeDebug.ingame} -> Visible ${activeDebug.visible}`);
      }

      if (marketModalState.open) {
        // If modal is open, keep it live-updated with local changes.
        syncMarketModalControlsFromPanel();
        renderMarketModalList();
      }
    }

    function getOrderStats(orders) {
      const prices = orders.map(order => Number(order.platinum)).filter(price => Number.isFinite(price));
      if (!prices.length) return null;
      const sorted = [...prices].sort((a, b) => a - b);
      const total = sorted.reduce((sum, price) => sum + price, 0);
      const middle = Math.floor(sorted.length / 2);
      return {
        avg_price: total / sorted.length,
        median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
        min_price: sorted[0],
        max_price: sorted[sorted.length - 1]
      };
    }

    function renderMarketStats(stats, label = 'Sell') {
      if (!marketStats) return;
      if (!stats) {
        marketStats.innerHTML = [
          '<div class="border border-terminal/25 p-2">Lowest: -</div>',
          '<div class="border border-terminal/25 p-2">Median: -</div>',
          '<div class="border border-terminal/25 p-2">Highest: -</div>',
          '<div class="border border-terminal/25 p-2">Best Seller: -</div>'
        ].join('');
        return;
      }
      const bestOnline = applyPriceSort(
        marketState.sellOrders.filter(order => {
          const s = getOrderStatus(order);
          return s === 'ingame';
        }),
        'price_asc',
        'price_asc'
      )[0];
      const bestName = bestOnline?.user?.ingameName || bestOnline?.user?.ingame_name || bestOnline?.user || '-';
      const bestPrice = Number(bestOnline?.platinum);
      marketStats.innerHTML = [
        `<div class="border border-terminal/25 p-2">${label} lowest: ${Math.round(stats.min_price || 0)}p</div>`,
        `<div class="border border-terminal/25 p-2">Median: ${Math.round(stats.median || 0)}p</div>`,
        `<div class="border border-terminal/25 p-2">Highest: ${Math.round(stats.max_price || 0)}p</div>`,
        `<div class="border border-terminal/25 p-2">Best seller: ${htmlEscape(bestName)}${Number.isFinite(bestPrice) ? ` @ ${bestPrice}p` : ''}</div>`
      ].join('');
    }

    async function loadMarketItem(item, { reason = 'select' } = {}) {
      if (!item) return;
      const loadStart = marketNow();
      const itemKey = String(item.url_name || '');
      if (MARKET_DEBUG) {
        console.log('[MARKET] loadMarketItem selected item name', item.item_name || '(unknown)');
        console.log('[MARKET] loadMarketItem selected item url_name', itemKey || '(empty)');
      }
      marketState.selectedItem = item;
      marketSelectedTitle.textContent = item.item_name;
      if (marketModalState.open) setMarketModalSide(marketModalState.side);
      marketSelectedMeta.textContent = 'Loading live orders and stats...';
      setMarketStatus('Loading ingame sellers...');

      const applyOrdersData = (ordersData, sourceLabel = '') => {
        if (MARKET_DEBUG) console.log('[MARKET] raw orders response JSON', ordersData);
        const rawOrders = ordersData?.payload?.orders || ordersData?.orders || [];
        const normalized = normalizeOrdersFromRaw(rawOrders);
        const sourceOrders = [...normalized.sellOrders, ...normalized.buyOrders];
        // Store raw orders before any status/min/max filtering.
        marketState.rawOrders = sourceOrders;
        const uniqPlatform = [...new Set(sourceOrders.map(o => String(o?.platform || o?.user?.platform || '').toLowerCase().trim()))];
        const uniqPlatinum = [...new Set(sourceOrders.map(o => String(o?.platinum ?? o?.price ?? '')))].slice(0, 20);
        const sellers = marketState.rawOrders.filter(o => getOrderType(o) === 'sell');
        const ingameSellers = sellers.filter(o => getOrderStatus(o) === 'ingame');
        const buyers = marketState.rawOrders.filter(o => getOrderType(o) === 'buy');
        const ingameBuyers = buyers.filter(o => getOrderStatus(o) === 'ingame');
        const sellOrders = sellers;
        const buyOrders = buyers;
        const orderTypeCounts = marketState.rawOrders.reduce((acc, order) => {
          const type = String(order?.order_type || '').toLowerCase().trim() || '(empty)';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        const statusCounts = marketState.rawOrders.reduce((acc, order) => {
          const status = getOrderStatus(order) || '(empty)';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        const sellIngameCount = ingameSellers.length;
        const firstFiveSell = sellers
          .slice(0, 5)
          .map(order => ({
            user: order?.user?.ingameName || order?.user?.ingame_name || order?.user || 'Unknown',
            status: getOrderStatus(order),
            order_type: String(order?.order_type || '').toLowerCase().trim(),
            platinum: order?.platinum ?? order?.price ?? null
          }));
        if (MARKET_DEBUG) {
          console.log('[MARKET] total raw orders', sourceOrders.length);
          console.log('[MARKET] counts by order_type', orderTypeCounts);
          console.log('[MARKET] counts by user.status', statusCounts);
          console.log('[MARKET] seller count', sellers.length);
          console.log('[MARKET] ingame seller count', sellIngameCount);
          console.log('[MARKET] first 5 sell orders with user.status', firstFiveSell);
          console.log('[MARKET] normalized rawOrders.length', marketState.rawOrders.length);
          console.log('[MARKET] first 5 orders', marketState.rawOrders.slice(0, 5));
          console.log('[MARKET] first 5 user.status values', marketState.rawOrders.slice(0, 5).map(o => o?.user?.status));
          console.log('[MARKET_DEBUG] market raw orders first 3', sourceOrders.slice(0, 3));
          console.log('[MARKET_DEBUG] market raw unique platform', uniqPlatform);
          console.log('[MARKET_DEBUG] market raw unique platinum(sample)', uniqPlatinum);
        }
        marketState.rawOrderCount = sourceOrders.length;
        marketState.ingameOrderCount = (ingameSellers.length + ingameBuyers.length);
        marketState.sellOrders = sellOrders;
        marketState.buyOrders = buyOrders;
        const fetchedAt = ordersData?.fetchedAt ? new Date(ordersData.fetchedAt) : new Date();
        setMarketOrdersUpdated(fetchedAt, ordersData?.source || marketState.activeSource);
        const bestSell = applyPriceSort(sellOrders, 'price_asc', 'price_asc')[0]?.platinum;
        const bestBuy = applyPriceSort(buyOrders, 'price_desc', 'price_desc')[0]?.platinum;
        const spread = bestSell && bestBuy ? bestSell - bestBuy : null;
        marketSelectedMeta.textContent = `Best sell ${bestSell ?? '-'}p | Best buy ${bestBuy ?? '-'}p${spread !== null ? ` | Spread ${spread}p` : ''} | ${marketState.activeSource}`;
        if (!sellOrders.length && !buyOrders.length) {
          setMarketStatus(`orders ${sourceLabel || 'fetch'} ok but parsed 0 sell/buy`);
        } else {
          setMarketStatus(`orders ${sourceLabel || 'fetch'} ok | sell ${sellOrders.length} | buy ${buyOrders.length}`);
        }
        renderFilteredMarketOrders();
        setFavoriteToggleLabel();
        scheduleMarketAutoRefresh();
      };

      const now = Date.now();
      const cached = marketState.ordersCache.get(itemKey);
      const cacheAgeMs = cached ? now - cached.timestamp : Number.POSITIVE_INFINITY;
      const hasCached = Boolean(cached?.data) && reason !== 'refresh';
      const isCachedFresh = hasCached && cacheAgeMs <= marketState.ordersCacheTtlMs;
      marketDebugLog('orders-cache', `item=${itemKey} reason=${reason} has=${hasCached} fresh=${isCachedFresh} ageMs=${Number.isFinite(cacheAgeMs) ? cacheAgeMs : -1} ttlMs=${marketState.ordersCacheTtlMs}`);

      if (hasCached) {
        applyOrdersData(cached.data, isCachedFresh ? 'cache' : 'cache-stale');
        marketDebugLog('orders-cache-render', `item=${itemKey} source=${isCachedFresh ? 'fresh-cache' : 'stale-cache'} duration=${(marketNow() - loadStart).toFixed(1)}ms`);
        if (isCachedFresh) return;
        setMarketStatus('Showing cached ingame sellers... refreshing...');
      } else {
        marketState.sellOrders = [];
        marketState.buyOrders = [];
        renderOrderBook(marketSellOrders, [], 'Loading ingame sellers...');
        renderOrderBook(marketBuyOrders, [], 'Loading buy orders...');
        renderMarketStats(null);
        setMarketOrdersUpdated(null);
      }
      try {
        if (marketState.ordersAbortController) marketState.ordersAbortController.abort();
        marketState.ordersAbortController = new AbortController();
        const refreshTag = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const path = buildMarketOrdersPath(item.url_name, reason === 'refresh'
          ? { refresh: true, t: refreshTag }
          : {});
        if (MARKET_DEBUG) console.log('[MARKET] exact orders URL called', buildMarketProxyUrl(path));
        const fetchStart = marketNow();
        const ordersData = await fetchMarketJson(path, { signal: marketState.ordersAbortController.signal });
        marketDebugLog('orders-fetch', `item=${itemKey} path=${path} duration=${(marketNow() - fetchStart).toFixed(1)}ms`);
        marketState.ordersCache.set(itemKey, { data: ordersData, timestamp: Date.now() });
        if (marketState.selectedItem?.url_name !== item.url_name) return;
        applyOrdersData(ordersData, 'fetch');
        marketDebugLog('orders-total', `item=${itemKey} duration=${(marketNow() - loadStart).toFixed(1)}ms`);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        const httpStatus = Number(error?.httpStatus || 0);
        const fetchUrl = error?.fetchUrl || buildMarketProxyUrl(buildMarketOrdersPath(item?.url_name || ''));
        const reason = error?.message === 'Market proxy required'
          ? 'Market proxy required'
          : error?.message?.includes('HTTP') || httpStatus > 0
            ? 'market proxy endpoint or HTTP error'
          : error?.message?.includes('parse error')
            ? 'parse error'
            : 'network/CORS/proxy blocked';
        marketSelectedMeta.textContent = `Unable to load item data: ${reason}. url=${fetchUrl} status=${httpStatus || 'network'}`;
        if (error?.responseBody) {
          marketSelectedMeta.textContent += ` body=${error.responseBody}`;
        }
        marketState.sellOrders = [];
        marketState.buyOrders = [];
        renderOrderBook(marketSellOrders, [], 'Order fetch failed.');
        renderOrderBook(marketBuyOrders, [], 'Order fetch failed.');
        renderMarketStats(null);
        setMarketOrdersUpdated(null);
        setMarketStatus(
          reason === 'Market proxy required'
            ? reason
            : `Item failed: ${reason} | url=${fetchUrl} | status=${httpStatus || 'network'}${error?.responseBody ? ` | body=${error.responseBody}` : ''}`
        );
        logClientError('market item load', error, { item: item?.url_name || '' });
        clearMarketAutoRefreshTimer();
      }
    }

    async function runMarketSearch() {
      const searchStart = marketNow();
      const rawQuery = marketItemSearch?.value || '';
      const query = rawQuery.trim().toLowerCase();
      if (!query) {
        renderMarketResults([], '');
        hideMarketAutocomplete();
        setMarketStatus('Search failed: empty query');
        logClientError('market search input', new Error('Empty query'));
        return;
      }
      try {
        setMarketStatus('Search waiting for catalog...');
        const catalogWaitStart = marketNow();
        await ensureMarketCatalog();
        marketDebugLog('search-catalog-wait', `query="${query}" duration=${(marketNow() - catalogWaitStart).toFixed(1)}ms`);
      } catch (error) {
        renderMarketResults([], rawQuery);
        hideMarketAutocomplete();
        setMarketStatus(error?.message === 'Market proxy required' ? 'Market proxy required' : 'Search failed: catalog failed');
        logClientError('market search catalog gate', error, { query });
        return;
      }
      const results = marketMatches(query, 30);
      marketDebugLog('search-match', `query="${query}" results=${results.length} duration=${(marketNow() - searchStart).toFixed(1)}ms`);
      renderMarketResults(results, rawQuery);
      hideMarketAutocomplete();
      if (results[0]) {
        console.log('[MARKET] matched item', results[0].item_name);
        console.log('[MARKET] matched url_name', results[0].url_name);
        setMarketStatus(`matched item found | ${results[0].item_name}`);
        loadMarketItem(results[0]);
      }
      if (!results.length) {
        marketSelectedMeta.textContent = `No market item matched "${rawQuery}".`;
        setMarketStatus('Search failed: empty result');
        logClientError('market search results', new Error('No matches after item-name exact/includes search'), { query, catalogSize: marketState.catalog.length });
      }
    }

    if (marketSearchBtn && marketItemSearch) {
      marketSearchBtn.addEventListener('click', () => {
        runMarketSearch().catch(error => logClientError('market search click', error));
      });

      marketItemSearch.addEventListener('focus', async () => {
        await ensureMarketCatalog().catch(error => logClientError('market focus preload', error));
        if (!marketState.loaded) return;
        const query = marketItemSearch.value.trim();
        if (query) renderMarketAutocomplete(marketMatches(query, 8));
      });

      marketItemSearch.addEventListener('input', () => {
        if (marketState.inputDebounceTimer) window.clearTimeout(marketState.inputDebounceTimer);
        marketState.inputDebounceTimer = window.setTimeout(async () => {
          await ensureMarketCatalog().catch(error => logClientError('market input preload', error));
          if (!marketState.loaded) {
            const query = marketItemSearch.value;
            renderMarketResults([], query);
            hideMarketAutocomplete();
            return;
          }
          const query = marketItemSearch.value;
          renderMarketAutocomplete(marketMatches(query, 8));
        }, 300);
      });

      marketItemSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          hideMarketAutocomplete({ restoreResults: true });
          return;
        }
        if (!marketState.suggestions.length) {
          if (e.key === 'Enter') {
            e.preventDefault();
            runMarketSearch().catch(error => logClientError('market enter search', error));
          }
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          marketState.suggestionIndex = (marketState.suggestionIndex + 1) % marketState.suggestions.length;
          const selected = marketState.suggestions[marketState.suggestionIndex];
          if (selected) marketItemSearch.value = selected.item_name;
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          marketState.suggestionIndex = (marketState.suggestionIndex - 1 + marketState.suggestions.length) % marketState.suggestions.length;
          const selected = marketState.suggestions[marketState.suggestionIndex];
          if (selected) marketItemSearch.value = selected.item_name;
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (marketState.suggestionIndex >= 0) {
            const selected = marketState.suggestions[marketState.suggestionIndex];
            if (selected) marketItemSearch.value = selected.item_name;
          }
          hideMarketAutocomplete();
          runMarketSearch().catch(error => logClientError('market suggestion enter search', error));
        }
      });

      marketItemSearch.addEventListener('blur', () => setTimeout(() => hideMarketAutocomplete({ restoreResults: true }), 150));
    } else {
      logClientError('market bindings', new Error('Market controls missing'));
    }

    [marketBuyMin, marketBuyMax, marketSellMin, marketSellMax].forEach(input => {
      if (input) input.addEventListener('input', renderFilteredMarketOrders);
    });

    [marketSellStatus, marketSellSort, marketBuyStatus, marketBuySort].forEach(control => {
      if (control) control.addEventListener('change', renderFilteredMarketOrders);
    });

    if (marketTabSell) marketTabSell.addEventListener('click', () => setMarketActiveSide('sell'));
    if (marketTabBuy) marketTabBuy.addEventListener('click', () => setMarketActiveSide('buy'));
    if (marketViewSellBtn) {
      marketViewSellBtn.textContent = 'View Orders';
      marketViewSellBtn.addEventListener('click', () => openMarketModal(marketUi.activeSide));
    }
    if (marketViewBuyBtn) {
      marketViewBuyBtn.style.display = 'none';
      marketViewBuyBtn.setAttribute('aria-hidden', 'true');
    }
    if (marketRefreshOrdersBtn) {
      marketRefreshOrdersBtn.addEventListener('click', () => {
        if (!marketState.selectedItem) {
          setMarketStatus('Refresh failed: no item selected');
          return;
        }
        console.log('[MARKET] Refresh Orders selected item name', marketState.selectedItem?.item_name || '(unknown)');
        console.log('[MARKET] Refresh Orders selected item url_name', marketState.selectedItem?.url_name || '(empty)');
        setMarketStatus('Refreshing orders...');
        loadMarketItem(marketState.selectedItem, { reason: 'refresh' }).catch(error => logClientError('market refresh orders', error));
      });
    }
    if (marketModalClose) marketModalClose.addEventListener('click', closeMarketModal);
    if (marketModalTabSell) marketModalTabSell.addEventListener('click', () => { setMarketModalSide('sell'); syncMarketModalControlsFromPanel(); renderMarketModalList(); });
    if (marketModalTabBuy) marketModalTabBuy.addEventListener('click', () => { setMarketModalSide('buy'); syncMarketModalControlsFromPanel(); renderMarketModalList(); });
    if (marketModalStatus) marketModalStatus.addEventListener('change', () => { applyMarketModalControlsToPanel(); renderFilteredMarketOrders(); });
    if (marketModalSort) marketModalSort.addEventListener('change', () => { applyMarketModalControlsToPanel(); renderFilteredMarketOrders(); });
    [marketModalMin, marketModalMax].forEach(input => {
      if (input) input.addEventListener('input', () => { applyMarketModalControlsToPanel(); renderFilteredMarketOrders(); });
    });
    if (marketModal) {
      marketModal.addEventListener('click', (e) => {
        if (!marketModalState.open) return;
        const clickedBackdrop = e.target === marketModal || e.target?.classList?.contains('terminal-modal__backdrop');
        if (clickedBackdrop) closeMarketModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (marketModalState.open) closeMarketModal();
          if (trackerModalState.open) closeTrackerModal();
        }
      });
    }
    if (trackerModalClose) trackerModalClose.addEventListener('click', () => {
      closeTrackerModal();
    });
    if (trackerModal) {
      trackerModal.addEventListener('click', (e) => {
        if (!trackerModalState.open) return;
        const clickedBackdrop = e.target === trackerModal || e.target?.classList?.contains('terminal-modal__backdrop');
        if (clickedBackdrop) closeTrackerModal();
      });
    }
    if (accordionMql) {
      const syncMarketUiToViewport = () => setMarketActiveSide(marketUi.activeSide);
      if (typeof accordionMql.addEventListener === 'function') accordionMql.addEventListener('change', syncMarketUiToViewport);
      else if (typeof accordionMql.addListener === 'function') accordionMql.addListener(syncMarketUiToViewport);
    }
    setMarketActiveSide(marketUi.activeSide);
    marketState.favorites = loadMarketFavorites();
    renderMarketFavorites();
    syncMarketAutoRefreshControls();
    setFavoriteToggleLabel();
    if (marketFavoriteToggle) marketFavoriteToggle.addEventListener('click', toggleSelectedFavorite);
    if (marketAutoRefreshToggle) {
      marketAutoRefreshToggle.addEventListener('change', () => {
        marketState.autoRefreshEnabled = Boolean(marketAutoRefreshToggle.checked);
        localStorage.setItem(MARKET_AUTO_REFRESH_KEY, marketState.autoRefreshEnabled ? '1' : '0');
        scheduleMarketAutoRefresh();
      });
    }
    if (marketAutoRefreshInterval) {
      marketAutoRefreshInterval.addEventListener('change', () => {
        const sec = Number(marketAutoRefreshInterval.value);
        const safeSec = sec >= 30 && sec <= 60 ? sec : 45;
        marketState.autoRefreshIntervalMs = safeSec * 1000;
        localStorage.setItem(MARKET_AUTO_REFRESH_INTERVAL_KEY, String(marketState.autoRefreshIntervalMs));
        syncMarketAutoRefreshControls();
        scheduleMarketAutoRefresh();
      });
    }
    if (!MARKET_PROXY_URL) {
      setMarketStatus('Market proxy required');
      logClientError('market config', new Error('Market proxy required'));
    }

    const codexSearchInput = document.getElementById('codexSearchInput');
    const codexSuggestions = document.getElementById('codexSuggestions');
    const codexSearchBtn = document.getElementById('codexSearchBtn');
    const codexOpenBtn = document.getElementById('codexOpenBtn');
    const codexTitle = document.getElementById('codexTitle');
    const codexSummary = document.getElementById('codexSummary');
    const codexMeta = document.getElementById('codexMeta');
    const codexResults = document.getElementById('codexResults');
    const codexPageLink = document.getElementById('codexPageLink');
    const codexCategoryFilter = document.getElementById('codexCategoryFilter');
    const codexFarmingInfo = document.getElementById('codexFarmingInfo');
    const codexPageDetails = document.getElementById('codexPageDetails');
    const codexPinBtn = document.getElementById('codexPinBtn');
    const codexFavorites = document.getElementById('codexFavorites');
    const codexEntryModal = document.getElementById('codexEntryModal');
    const codexEntryModalClose = document.getElementById('codexEntryModalClose');
    const codexEntryModalTitle = document.getElementById('codexEntryModalTitle');
    const codexEntryModalMeta = document.getElementById('codexEntryModalMeta');
    const codexEntryModalBody = document.getElementById('codexEntryModalBody');
    const codexEntryModalOpenWiki = document.getElementById('codexEntryModalOpenWiki');
    const codexEntryModalPin = document.getElementById('codexEntryModalPin');
    let codexSuggestionsCache = [];
    let codexSearchResultsCache = [];
    let codexActiveTitle = '';
    let codexActiveUrl = '';
    let codexActiveCategory = 'uncategorized';
    let codexActiveSummary = '';
    let codexSearchTimer;
    let codexSearchAbortController = null;
    let codexActiveSuggestIndex = -1;
    const CODEX_CACHE_KEY = 'orbiter_codex_cache_v1';
    const CODEX_FAVORITES_KEY = 'orbiterCodexPinnedEntries';
    const CODEX_SEARCH_TTL_MS = 10 * 60 * 1000;
    const CODEX_ENTRY_TTL_MS = 24 * 60 * 60 * 1000;
    const CODEX_PAGE_TTL_MS = 60 * 60 * 1000;
    const codexMemoryCache = {
      search: new Map(),
      entry: new Map(),
      page: new Map()
    };
    const codexModalState = {
      open: false,
      prevBodyOverflow: ''
    };

    function buildCodexWorkerSearchUrl(query) {
      const q = String(query || '').trim();
      return `${CODEX_WORKER_BASE_URL}/api/wiki/search?q=${encodeURIComponent(q)}&_ts=${Date.now()}`;
    }

    function buildCodexWorkerPageUrl(title) {
      const t = String(title || '').trim();
      return `${CODEX_WORKER_BASE_URL}/api/wiki/page?title=${encodeURIComponent(t)}&_ts=${Date.now()}`;
    }

    async function fetchCodexJson(url, signal, label = 'codex worker') {
      console.log('[CODEX] hostname check:', window.location.hostname || '(unknown)');
      console.log('[CODEX] worker base check:', CODEX_WORKER_BASE_URL || '(missing)');
      console.log('[CODEX] final request URL:', url);
      logRequest(label, url);
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json'
        },
        signal,
        cache: 'no-store'
      });
      logResponse(label, response);
      console.log('[CODEX] response status:', response.status);
      const rawText = await response.text();
      console.log('[CODEX] response text preview:', String(rawText || '').slice(0, 240));
      let json = null;
      try {
        json = rawText ? JSON.parse(rawText) : {};
      } catch (parseError) {
        console.error('[CODEX] JSON parse failed. Raw response preview:', String(rawText || '').slice(0, 300));
        const error = new Error(`parse error: expected JSON but got non-JSON response (status ${response.status})`);
        error.name = 'CodexParseError';
        error.responseStatus = response.status;
        error.responsePreview = String(rawText || '').slice(0, 300);
        throw error;
      }
      logJson(label, json);
      console.log('Codex response:', json);
      if (!response.ok || json?.ok === false) {
        const workerError = String(json?.error || '').trim();
        const error = new Error(`HTTP ${response.status}${workerError ? ` (${workerError})` : ''}`);
        error.name = 'CodexHttpError';
        error.responseStatus = response.status;
        error.workerError = workerError;
        throw error;
      }
      return {
        ...json,
        __status: response.status,
        __requestUrl: url
      };
    }

    function codexPageUrl(title) {
      return `https://wiki.warframe.com/w/${encodeURIComponent((title || '').replace(/\s+/g, '_'))}`;
    }

    function stripHtml(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
    }

    function safeParseJson(value, fallback) {
      try {
        if (value === null || value === undefined || value === '') return fallback;
        const parsed = JSON.parse(value);
        return parsed === null || parsed === undefined ? fallback : parsed;
      } catch {
        return fallback;
      }
    }

    function getCodexCategory(title = '', snippet = '') {
      const text = `${String(title || '')} ${String(snippet || '')}`.toLowerCase();
      const rules = [
        ['warframes', ['warframe', 'prime frame']],
        ['weapons', ['weapon', 'rifle', 'pistol', 'shotgun', 'bow', 'melee']],
        ['mods', ['mod', 'aura', 'exilus']],
        ['resources', ['resource', 'alloy plate', 'ferrite', 'argon']],
        ['relics', ['relic', 'lith', 'meso', 'neo', 'axi']],
        ['prime parts', ['prime part', 'blueprint', 'prime set']],
        ['missions', ['mission', 'node', 'sortie', 'bounty']],
        ['damage types', ['damage type', 'viral', 'corrosive', 'slash', 'heat']],
        ['status effects', ['status effect', 'proc']],
        ['factions', ['faction', 'grineer', 'corpus', 'infested', 'sentient']],
        ['bosses', ['boss', 'assassination']],
        ['companions', ['companion', 'sentinel', 'kubrow', 'kavat']],
        ['arcanes', ['arcane']],
        ['syndicates', ['syndicate']],
        ['open worlds', ['open world', 'cetus', 'fortuna', 'deimos', 'duviri']],
        ['quests', ['quest']],
        ['farming locations', ['drop', 'farm', 'farming', 'location']]
      ];
      for (const [category, terms] of rules) {
        if (terms.some(term => text.includes(term))) return category;
      }
      return 'uncategorized';
    }

    function getCodexCacheBucket(type) {
      const fallback = { search: {}, entry: {}, page: {} };
      const parsed = safeParseJson(localStorage.getItem(CODEX_CACHE_KEY), fallback);
      const raw = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : { ...fallback };
      if (!raw.search || typeof raw.search !== 'object' || Array.isArray(raw.search)) raw.search = {};
      if (!raw.entry || typeof raw.entry !== 'object' || Array.isArray(raw.entry)) raw.entry = {};
      if (!raw.page || typeof raw.page !== 'object' || Array.isArray(raw.page)) raw.page = {};
      if (!raw[type] || typeof raw[type] !== 'object' || Array.isArray(raw[type])) raw[type] = {};
      try {
        localStorage.setItem(CODEX_CACHE_KEY, JSON.stringify(raw));
      } catch (error) {
        console.warn('[CODEX] cache bucket self-heal write skipped', error);
      }
      return raw;
    }

    function setCodexCacheBucket(type, key, value) {
      const raw = getCodexCacheBucket(type);
      raw[type][key] = value;
      localStorage.setItem(CODEX_CACHE_KEY, JSON.stringify(raw));
    }

    function getCodexCached(type, key, ttlMs) {
      const mem = codexMemoryCache[type].get(key);
      const now = Date.now();
      if (mem && now - mem.timestamp <= ttlMs) return mem.data;
      const raw = getCodexCacheBucket(type);
      const disk = raw[type][key];
      if (disk && now - Number(disk.timestamp || 0) <= ttlMs) {
        codexMemoryCache[type].set(key, { timestamp: Number(disk.timestamp || now), data: disk.data });
        return disk.data;
      }
      return null;
    }

    function setCodexCached(type, key, data) {
      const payload = { timestamp: Date.now(), data };
      codexMemoryCache[type].set(key, payload);
      setCodexCacheBucket(type, key, payload);
    }

    function loadCodexFavorites() {
      const parsed = safeParseJson(localStorage.getItem(CODEX_FAVORITES_KEY), null);
      if (Array.isArray(parsed)) return parsed;
      // Backward compatibility: migrate old key if present.
      const legacy = safeParseJson(localStorage.getItem('orbiter_codex_favorites_v1'), []);
      if (Array.isArray(legacy) && legacy.length) {
        saveCodexFavorites(legacy);
        return legacy;
      }
      return [];
    }

    function saveCodexFavorites(items) {
      localStorage.setItem(CODEX_FAVORITES_KEY, JSON.stringify(items.slice(0, 30)));
    }

    function getPinnedEntryIndex(title) {
      const needle = String(title || '').trim().toLowerCase();
      if (!needle) return -1;
      return loadCodexFavorites().findIndex(item => String(item?.title || '').trim().toLowerCase() === needle);
    }

    function isCodexEntryPinned(title) {
      return getPinnedEntryIndex(title) >= 0;
    }

    function updateCodexPinButtonState() {
      if (!codexPinBtn) return;
      const title = String(codexActiveTitle || '').trim();
      if (!title) {
        codexPinBtn.disabled = true;
        codexPinBtn.textContent = 'Open an entry first';
        codexPinBtn.setAttribute('aria-disabled', 'true');
        codexPinBtn.title = 'Open an entry first';
        return;
      }
      const pinned = isCodexEntryPinned(title);
      codexPinBtn.disabled = false;
      codexPinBtn.setAttribute('aria-disabled', 'false');
      codexPinBtn.textContent = pinned ? 'Unpin Entry' : 'Pin Entry';
      codexPinBtn.title = pinned ? 'Unpin Entry' : 'Pin Entry';
    }

    function detectFarmingInfo(entry = {}) {
      const text = `${entry.extract || ''} ${entry.snippet || ''}`.replace(/\s+/g, ' ').trim();
      const bits = [];
      if (/drop|drops|dropped|reward|bounty|rotation|farm/i.test(text)) bits.push('Drop/Farm data referenced in summary.');
      if (/mission|node|planet|open world|survival|defense|excavation/i.test(text)) bits.push('Mission/location hints detected.');
      return bits.join(' ');
    }

    function setCodexState({ title, summary, meta, url, loading = false, farmingInfo = '' }) {
      codexTitle.textContent = title || (loading ? 'Loading...' : 'Awaiting query');
      codexSummary.textContent = summary || (loading ? 'Querying official wiki...' : 'Enter a topic and the terminal will search the official wiki, pull the best matching page, and summarize the intro here.');
      codexMeta.textContent = meta || '';
      if (url) {
        codexPageLink.href = url;
        codexPageLink.classList.remove('hidden');
      } else {
        codexPageLink.classList.add('hidden');
      }
      if (codexFarmingInfo) {
        const info = String(farmingInfo || '').trim();
        if (info) {
          codexFarmingInfo.textContent = `Farming / drop info: ${info}`;
          codexFarmingInfo.classList.remove('hidden');
        } else {
          codexFarmingInfo.textContent = '';
          codexFarmingInfo.classList.add('hidden');
        }
      }
      updateCodexPinButtonState();
    }

    function clearCodexPageDetails() {
      if (!codexPageDetails) return;
      codexPageDetails.classList.add('hidden');
      codexPageDetails.innerHTML = '';
    }

    function decodeHtmlEntities(value = '') {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = String(value || '');
      return textarea.value || '';
    }

    function normalizeCodexText(value = '') {
      const decoded = decodeHtmlEntities(String(value || ''));
      return decoded
        .replace(/\[edit\]/gi, ' ')
        .replace(/\[edit\s*\|\s*edit source\]/gi, ' ')
        .replace(/\[\d+\]/g, ' ')
        .replace(/Contents/gi, ' ')
        .replace(/You'?re not supposed to be in here\.?/gi, ' ')
        .replace(/article\/section contains spoilers\.?/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function normalizeCodexSections(sections = []) {
      if (!Array.isArray(sections)) return [];
      return sections
        .map((section, idx) => {
          const title = normalizeCodexText(section?.title || section?.line || section?.name || '');
          const index = String(section?.index || section?.number || idx + 1);
          const candidates = [section?.content, section?.text, section?.html, section?.body];
          let raw = '';
          for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim()) {
              raw = candidate;
              break;
            }
          }
          return {
            title,
            index,
            number: String(section?.number || ''),
            anchor: String(section?.anchor || ''),
            raw
          };
        })
        .filter(section => section.title || section.raw);
    }

    function codexHtmlToReadableText(value = '') {
      const html = String(value || '').trim();
      if (!html) return '';
      const container = document.createElement('div');
      container.innerHTML = html
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\/\s*p\s*>/gi, '\n\n')
        .replace(/<\/\s*li\s*>/gi, '\n')
        .replace(/<\/\s*h[1-6]\s*>/gi, '\n');
      container.querySelectorAll('a[href*="action=edit"], a[href*="veaction=edit"], a[href*="edit"], a[href*="#cite"], a[href*="Help:Citation"]').forEach(el => el.remove());
      container.querySelectorAll('script, style, table, nav, sup, .mw-editsection, .navbox, .toc, .reference, .reflist, .hatnote, .noprint, .portable-infobox, .thumb, .gallery').forEach(el => el.remove());
      return container.textContent || '';
    }

    function cleanCodexSectionText(value = '', sectionTitle = '') {
      let text = String(value || '');
      if (!text) return '';
      text = decodeHtmlEntities(text)
        .replace(/\[edit\s*\|\s*edit source\]/gi, ' ')
        .replace(/\[\s*edit\s*\|\s*edit source\s*\]/gi, ' ')
        .replace(/\[edit\]/gi, ' ')
        .replace(/\[\s*edit\s*\]/gi, ' ')
        .replace(/edit source/gi, ' ')
        .replace(/\[\d+\]/g, ' ')
        .replace(/\[\s*\]/g, ' ')
        .replace(/\[\s*\|\s*\]/g, ' ')
        .replace(/__TOC__/gi, ' ')
        .replace(/\bContents\b/gi, ' ')
        .replace(/You're not supposed to be in here\.?/gi, ' ')
        .replace(/The following article\/section contains spoilers\.?/gi, ' ')
        .replace(/Spoiler warning/gi, ' ')
        .replace(/\{\{[^{}]*\}\}/g, ' ')
        .replace(/\[\[(?:Category|File|Image):[^\]]+\]\]/gi, ' ')
        .replace(/\{\|[\s\S]*?\|\}/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (sectionTitle) {
        const titleLine = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp(`^${titleLine}\\s*\\n?`, 'i'), '');
      }
      return text.trim();
    }

    function isCodexJunkText(value = '') {
      const text = normalizeCodexText(value).toLowerCase();
      if (!text) return true;
      const junkPatterns = [
        /^contents?$/,
        /^navigation$/,
        /^references?$/,
        /^see also$/,
        /^external links?$/,
        /^categories?$/,
        /^you'?re not supposed to be in here\.?$/,
        /^article\/section contains spoilers\.?/
      ];
      return junkPatterns.some(rx => rx.test(text));
    }

    function extractSectionsFromParsedHtml(details) {
      const html = String(details?.html || '').trim();
      const metadataSections = normalizeCodexSections(details?.sections);
      if (!metadataSections.length) return [];

      const container = document.createElement('div');
      if (html) {
        container.innerHTML = html;
        // Remove noisy layout-heavy elements before text extraction.
        container.querySelectorAll('script, style, table, nav, .mw-editsection, .navbox, .toc, .reference, .reflist, .hatnote, .noprint, .portable-infobox, .thumb, .gallery').forEach(el => el.remove());
      }

      const normalized = metadataSections.map((meta, idx) => {
        const title = normalizeCodexText(meta?.title || meta?.line || '');
        if (isCodexJunkText(title)) {
          return null;
        }
        const anchor = String(meta?.anchor || '').trim();
        const heading =
          (anchor ? container.querySelector(`#${cssEscapeValue(anchor)}`)?.closest('h2, h3, h4') : null)
          || Array.from(container.querySelectorAll('h2, h3, h4')).find(h => {
            const text = (h.textContent || '').replace(/\[edit\]/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();
            return text === title.toLowerCase();
          });

        let content = '';
        const rawSection = String(meta?.raw || meta?.content || meta?.text || meta?.html || meta?.body || '');
        if (rawSection.trim()) {
          const isHtml = /<[^>]+>/.test(rawSection);
          const textFromRaw = isHtml ? codexHtmlToReadableText(rawSection) : rawSection;
          content = cleanCodexSectionText(textFromRaw, title);
        }
        if (!content && heading) {
          let node = heading.nextElementSibling;
          const chunks = [];
          while (node) {
            const tag = (node.tagName || '').toUpperCase();
            if (tag === 'H2' || tag === 'H3' || tag === 'H4') break;
            if (tag === 'TABLE' || tag === 'NAV') {
              node = node.nextElementSibling;
              continue;
            }
            const text = cleanCodexSectionText(node.textContent || '', title);
            if (!isCodexJunkText(text) && text.length > 1) chunks.push(text);
            node = node.nextElementSibling;
          }
          const extracted = chunks.join('\n\n').trim();
          if (extracted) content = extracted;
        }
        // Keep sections strictly scoped; no whole-page fallback blob here.
        if (!content) {
          console.log('[CODEX] missing section content', {
            sectionTitle: title,
            sectionIndex: meta?.index ?? '',
            sectionObject: meta
          });
        }
        return {
          key: `section-${idx}`,
          title: title || `Section ${idx + 1}`,
          number: String(meta?.number || ''),
          index: String(meta?.index || ''),
          content: content.slice(0, 2400),
          anchor
        };
      }).filter(Boolean).filter(section => String(section?.content || '').trim().length > 0);

      return normalized.filter(section => section.title);
    }

    function buildCodexDetailMarkup(details) {
      const extractedSections = extractSectionsFromParsedHtml(details).slice(0, 14);
      const importantSections = Array.isArray(details?.importantSections)
        ? details.importantSections
          .map(section => ({ line: normalizeCodexText(section?.line || section?.title || '') }))
          .filter(section => Boolean(section.line))
          .slice(0, 8)
        : [];
      const links = Array.isArray(details?.links) ? details.links.slice(0, 12) : [];
      const plainText = '';
      const sectionRows = extractedSections.length
        ? extractedSections.map(section => {
          const safeTitle = htmlEscape(section.title);
          const safeLabel = htmlEscape(section.number ? `${section.number} ${section.title}` : section.title);
          const paragraphs = String(section.content || '')
            .split(/\n{2,}/)
            .map(part => cleanCodexSectionText(part, section.title))
            .filter(Boolean)
            .slice(0, 14);
          const sectionHtml = paragraphs.length
            ? paragraphs.map(p => `<p class="mb-2">${htmlEscape(p)}</p>`).join('')
            : '<p>No details available for this section.</p>';
          return `
            <li class="codex-accordion-item" data-section-key="${htmlEscape(section.key)}">
              <button type="button" class="codex-load-result codex-detail-chip codex-accordion-trigger w-full" data-section-key="${htmlEscape(section.key)}" aria-expanded="false">
                ${safeLabel}
              </button>
              <div class="codex-accordion-panel hidden mt-2 border border-terminal/20 p-3 text-xs text-green-200/85 leading-7" data-section-panel="${htmlEscape(section.key)}" aria-hidden="true">
                <div class="font-bold mb-2">${safeTitle}</div>
                ${sectionHtml}
              </div>
            </li>
          `;
        }).join('')
        : '';

      const importantRows = importantSections.length
        ? importantSections.map(section => `<li class="codex-detail-chip">${htmlEscape(section.line || '—')}</li>`).join('')
        : '<li class="codex-detail-chip">—</li>';

      const linkRows = links.length
        ? links.map(linkTitle => `<li><button type="button" class="codex-load-result codex-detail-chip" data-title="${htmlEscape(linkTitle)}">${htmlEscape(linkTitle)}</button></li>`).join('')
        : '<li class="codex-detail-chip">—</li>';

      const sectionsBlock = extractedSections.length
        ? `
        <div class="codex-detail-group">
          <div class="codex-detail-title">Sections</div>
          <ul class="codex-detail-list">${sectionRows}</ul>
        </div>`
        : `
        <div class="codex-detail-group">
          <div class="codex-detail-title">Sections</div>
          <div class="codex-detail-chip">No sections available for this entry.</div>
        </div>`;

      return {
        html: `
        ${sectionsBlock}
        ${importantSections.length ? `<div class="codex-detail-group">
          <div class="codex-detail-title">Important</div>
          <ul class="codex-detail-list">${importantRows}</ul>
        </div>` : ''}
        <div class="codex-detail-group">
          <div class="codex-detail-title">Related Links</div>
          <ul class="codex-detail-list">${linkRows}</ul>
        </div>
        ${plainText ? `<div class="codex-detail-group"><div class="codex-detail-title">Page Notes</div><div class="text-xs text-green-200/80 leading-6">${htmlEscape(plainText)}</div></div>` : ''}
      `,
        sections: extractedSections
      };
    }

    function renderCodexPageDetails(details, { loading = false } = {}) {
      if (!codexPageDetails) return;
      if (loading) {
        codexPageDetails.classList.remove('hidden');
        codexPageDetails.innerHTML = '<div class="text-xs text-green-200/85">Loading entry details...</div>';
        return;
      }
      if (!details) {
        clearCodexPageDetails();
        return;
      }
      codexPageDetails.classList.remove('hidden');
      const detailMarkup = buildCodexDetailMarkup(details);
      codexPageDetails.innerHTML = detailMarkup.html;
      codexPageDetails.querySelectorAll('.codex-load-result[data-title]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const title = btn.dataset.title || '';
          if (!title) return;
          if (codexSearchInput) codexSearchInput.value = title;
          loadCodexEntry(title);
        });
      });
    }

    async function setCodexModalOpen(open) {
      if (!codexEntryModal) return;
      const wantOpen = Boolean(open);
      if (codexModalState.open === wantOpen) return;
      codexModalState.open = wantOpen;
      if (wantOpen) {
        codexEntryModal.classList.add('is-visible');
        codexEntryModal.setAttribute('aria-hidden', 'false');
        codexModalState.prevBodyOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
        codexEntryModal.dataset.open = '0';
        codexEntryModal.getBoundingClientRect();
        codexEntryModal.dataset.open = '1';
        return;
      }
      codexEntryModal.dataset.open = '0';
      codexEntryModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = codexModalState.prevBodyOverflow;
      await new Promise(resolve => window.setTimeout(resolve, 220));
      if (!codexModalState.open) codexEntryModal.classList.remove('is-visible');
    }

    function renderCodexEntryModal({ title, summary, details, url }) {
      if (!codexEntryModalBody) return;
      if (codexEntryModalTitle) codexEntryModalTitle.textContent = title || 'Unknown entry';
      if (codexEntryModalMeta) codexEntryModalMeta.textContent = details ? 'Loaded from Worker page route' : 'Summary only';
      if (codexEntryModalOpenWiki) {
        codexEntryModalOpenWiki.onclick = () => {
          const wikiUrl = url || codexPageUrl(title || '');
          if (wikiUrl) window.open(wikiUrl, '_blank', 'noopener,noreferrer');
        };
      }
      if (codexEntryModalPin) {
        codexEntryModalPin.onclick = () => pinActiveCodexEntry();
      }
      const safeSummary = htmlEscape(String(summary || '').trim() || '—');
      const detailData = details ? buildCodexDetailMarkup(details) : { html: '<div class="codex-detail-group"><div class="codex-detail-title">Sections</div><div class="codex-detail-chip">No sections available for this entry.</div></div>', sections: [] };
      codexEntryModalBody.innerHTML = `
        <div class="border border-terminal/20 p-3 bg-black/40 mb-3">
          <div class="text-xs text-terminal/70 uppercase tracking-[0.2em] mb-2">Summary</div>
          <div class="text-sm text-green-200/85 leading-7">${safeSummary}</div>
        </div>
        ${detailData.html}
      `;
      const sectionBtns = codexEntryModalBody.querySelectorAll('.codex-accordion-trigger[data-section-key]');
      const sectionPanels = codexEntryModalBody.querySelectorAll('.codex-accordion-panel[data-section-panel]');
      const closeAllSections = () => {
        sectionBtns.forEach(b => {
          b.classList.remove('bg-terminal/10');
          b.setAttribute('aria-expanded', 'false');
        });
        sectionPanels.forEach(panel => {
          panel.classList.add('hidden');
          panel.style.maxHeight = '0px';
          panel.setAttribute('aria-hidden', 'true');
        });
      };
      sectionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const key = btn.dataset.sectionKey || '';
          const panel = codexEntryModalBody.querySelector(`.codex-accordion-panel[data-section-panel="${cssEscapeValue(key)}"]`);
          if (!panel) return;
          const currentlyOpen = btn.getAttribute('aria-expanded') === 'true';
          closeAllSections();
          if (currentlyOpen) return;
          btn.classList.add('bg-terminal/10');
          btn.setAttribute('aria-expanded', 'true');
          panel.classList.remove('hidden');
          panel.setAttribute('aria-hidden', 'false');
          panel.style.maxHeight = `${panel.scrollHeight}px`;
        });
      });
      if (sectionBtns.length) {
        sectionBtns[0].click();
      }
      codexEntryModalBody.querySelectorAll('.codex-load-result[data-title]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const nextTitle = btn.dataset.title || '';
          if (!nextTitle) return;
          if (codexSearchInput) codexSearchInput.value = nextTitle;
          loadCodexEntry(nextTitle);
          loadCodexPageDetails(nextTitle, { openModal: true });
        });
      });
    }

    async function loadCodexPageDetails(title, { openModal = false } = {}) {
      const q = String(title || codexActiveTitle || codexSearchInput?.value || '').trim();
      if (!q) {
        setCodexState({
          title: codexTitle?.textContent || 'Awaiting query',
          summary: codexSummary?.textContent || 'Open an entry first.',
          meta: 'SOURCE // OPEN AN ENTRY FIRST',
          url: codexActiveUrl || ''
        });
        return;
      }
      if (openModal) {
        if (codexEntryModalBody) codexEntryModalBody.innerHTML = '<div class="text-xs text-green-200/85">Loading entry details...</div>';
        await setCodexModalOpen(true);
      } else {
        renderCodexPageDetails(null, { loading: true });
      }
      const cacheKey = q.toLowerCase();
      const cached = getCodexCached('page', cacheKey, CODEX_PAGE_TTL_MS);
      if (cached) {
        if (openModal) {
          renderCodexEntryModal({
            title: codexActiveTitle || q,
            summary: codexActiveSummary || codexSummary?.textContent || '',
            details: cached,
            url: codexActiveUrl || codexPageUrl(q)
          });
        } else {
          renderCodexPageDetails(cached);
        }
        return;
      }
      try {
        const pageData = await fetchCodexJson(buildCodexWorkerPageUrl(q), undefined, 'codex worker page');
        console.log('[CODEX PAGE DEBUG FULL JSON]', pageData);
        const details = pageData?.page || pageData?.payload?.page || null;
        if (details?.sections && Array.isArray(details.sections)) {
          console.log('[CODEX] section content audit', details.sections.map(s => ({
            title: s?.title || s?.line || '',
            index: s?.index ?? '',
            hasContent: !!String(s?.content || '').trim(),
            length: String(s?.content || '').trim().length
          })));
        }
        if (!details) {
          if (openModal) {
            renderCodexEntryModal({
              title: codexActiveTitle || q,
              summary: codexActiveSummary || codexSummary?.textContent || '',
              details: null,
              url: codexActiveUrl || codexPageUrl(q)
            });
          } else {
            renderCodexPageDetails(null);
          }
          return;
        }
        setCodexCached('page', cacheKey, details);
        if (openModal) {
          renderCodexEntryModal({
            title: codexActiveTitle || q,
            summary: codexActiveSummary || codexSummary?.textContent || '',
            details,
            url: codexActiveUrl || codexPageUrl(q)
          });
        } else {
          renderCodexPageDetails(details);
        }
      } catch (error) {
        logClientError('codex page details fetch', error, { title: q });
        if (openModal) {
          renderCodexEntryModal({
            title: codexActiveTitle || q,
            summary: codexActiveSummary || codexSummary?.textContent || 'Unable to load full entry details.',
            details: null,
            url: codexActiveUrl || codexPageUrl(q)
          });
        } else {
          renderCodexPageDetails(null);
        }
      }
    }

    function renderCodexResults(items = []) {
      if (!codexResults) return;
      if (!items.length) {
        codexResults.innerHTML = '<div class="border border-terminal/25 p-3">No matching official wiki pages found yet.</div>';
        return;
      }
      codexResults.innerHTML = items.map(item => `
        <div class="codex-result border border-terminal/25 p-3 space-y-2" data-title="${(item.title || '').replace(/"/g, '&quot;')}">
          <div class="flex items-center justify-between gap-2">
            <div class="font-bold">${item.title || 'Untitled'}</div>
            <div class="text-[10px] uppercase tracking-[0.2em] text-terminal/70">${item.category || 'uncategorized'}</div>
          </div>
          <div class="text-xs opacity-85">${item.snippet || 'Open this result in the codex panel.'}</div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="codex-open-result border border-terminal px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-terminal hover:text-black" data-url="${(item.url || '').replace(/"/g, '&quot;')}">Open Wiki</button>
            <button type="button" class="codex-load-result border border-terminal px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-terminal hover:text-black" data-title="${(item.title || '').replace(/"/g, '&quot;')}">Load Summary</button>
          </div>
        </div>
      `).join('');
      codexResults.querySelectorAll('.codex-result').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.codex-open-result') || e.target.closest('.codex-load-result')) return;
          loadCodexEntry(card.dataset.title || '');
        });
      });
      codexResults.querySelectorAll('.codex-open-result').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const url = btn.dataset.url || '';
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
        });
      });
      codexResults.querySelectorAll('.codex-load-result').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          loadCodexEntry(btn.dataset.title || '');
        });
      });
    }

    function hideCodexSuggestions() {
      if (codexSuggestions) {
        codexSuggestions.classList.add('hidden');
        codexSuggestions.innerHTML = '';
      }
      codexActiveSuggestIndex = -1;
    }

    function renderCodexSuggestions(items = []) {
      codexSuggestionsCache = items;
      if (!codexSuggestions) return;
      if (!items.length) {
        hideCodexSuggestions();
        return;
      }
      codexSuggestions.innerHTML = items.map(item => `
        <button class="codex-suggestion w-full text-left px-4 py-3 border-b border-terminal/20 last:border-b-0 hover:bg-terminal hover:text-black${item.__active ? ' bg-terminal/10' : ''}" data-title="${(item.title || '').replace(/"/g, '&quot;')}">
          <div class="font-bold text-sm">${item.title || 'Untitled'}</div>
          <div class="text-xs opacity-80 mt-1">${item.snippet || 'Official wiki result'}</div>
        </button>
      `).join('');
      if (codexActiveSuggestIndex < 0 && items.length) codexActiveSuggestIndex = 0;
      codexSuggestions.classList.remove('hidden');
      codexSuggestions.querySelectorAll('.codex-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
          if (codexSearchInput) codexSearchInput.value = btn.dataset.title || '';
          hideCodexSuggestions();
          loadCodexEntry(btn.dataset.title || '');
        });
      });
    }

    function filterCodexByCategory(items = []) {
      const selected = String(codexCategoryFilter?.value || 'all').toLowerCase();
      if (selected === 'all') return items;
      return items.filter(item => String(item.category || '').toLowerCase() === selected);
    }

    function renderCodexFavorites() {
      if (!codexFavorites) return;
      const favorites = loadCodexFavorites();
      if (!favorites.length) {
        codexFavorites.innerHTML = '<div class="border border-terminal/25 p-3">No pinned entries yet.</div>';
        updateCodexPinButtonState();
        return;
      }
      codexFavorites.innerHTML = favorites.map(item => `
        <button type="button" class="codex-favorite-item w-full text-left border border-terminal/25 p-2 hover:bg-terminal hover:text-black" data-title="${(item.title || '').replace(/"/g, '&quot;')}">
          <div class="font-bold">${item.title || 'Untitled'}</div>
          <div class="text-[10px] uppercase tracking-[0.2em] opacity-75">${item.category || 'uncategorized'}</div>
        </button>
      `).join('');
      codexFavorites.querySelectorAll('.codex-favorite-item').forEach(btn => {
        btn.addEventListener('click', async () => {
          const title = btn.dataset.title || '';
          if (codexSearchInput) codexSearchInput.value = title;
          await loadCodexEntry(title);
          loadCodexPageDetails(title, { openModal: true });
        });
      });
      updateCodexPinButtonState();
    }

    function pinActiveCodexEntry() {
      const title = String(codexActiveTitle || '').trim();
      if (!title) {
        updateCodexPinButtonState();
        return;
      }
      const current = loadCodexFavorites();
      const normalizedTitle = title.toLowerCase();
      const alreadyPinned = current.some(item => String(item?.title || '').toLowerCase() === normalizedTitle);
      let next;
      if (alreadyPinned) {
        next = current.filter(item => String(item?.title || '').toLowerCase() !== normalizedTitle);
      } else {
        const entry = {
          title,
          url: codexActiveUrl || codexPageUrl(title),
          slug: String((codexActiveUrl || codexPageUrl(title)).split('/').pop() || '').trim(),
          category: codexActiveCategory || 'uncategorized',
          summary: String(codexActiveSummary || codexSummary?.textContent || '').trim()
        };
        next = [entry, ...current.filter(item => String(item?.title || '').toLowerCase() !== normalizedTitle)].slice(0, 30);
      }
      saveCodexFavorites(next);
      renderCodexFavorites();
      updateCodexPinButtonState();
    }

    async function searchCodexSuggestions(query) {
      const q = (query || '').trim();
      if (!q) {
        renderCodexResults([]);
        hideCodexSuggestions();
        return [];
      }
      try {
        const categoryKey = String(codexCategoryFilter?.value || 'all').toLowerCase();
        const cacheKey = `${categoryKey}::${q.toLowerCase()}`;
        const cached = getCodexCached('search', cacheKey, CODEX_SEARCH_TTL_MS);
        if (cached) {
          const cachedItems = filterCodexByCategory(cached);
          codexSearchResultsCache = cachedItems;
          renderCodexSuggestions(cachedItems);
          renderCodexResults(cachedItems);
          return cachedItems;
        }
        if (codexSearchAbortController) codexSearchAbortController.abort();
        codexSearchAbortController = new AbortController();
        const data = await fetchCodexJson(buildCodexWorkerSearchUrl(q), codexSearchAbortController.signal, 'codex worker search');
        const items = data?.items || data?.payload?.items || [];
        const summary = data?.summary || data?.payload?.summary || null;
        console.log('[CODEX DEBUG]', {
          hostname: window.location.hostname || '(unknown)',
          workerBase: CODEX_WORKER_BASE_URL,
          requestUrl: data?.__requestUrl || '(unknown)',
          responseStatus: data?.__status,
          dataOk: data?.ok,
          itemsLength: Array.isArray(items) ? items.length : -1,
          hasSummary: Boolean(summary)
        });
        console.log('Items count:', items.length);
        console.log('Summary:', summary);
        const mappedItems = (Array.isArray(items) ? items : []).map(entry => {
          const title = entry.title;
          const snippet = stripHtml(entry.snippet || '');
          return {
            title,
            snippet,
            category: getCodexCategory(title, snippet),
            url: entry.url || codexPageUrl(title)
          };
        });
        setCodexCached('search', cacheKey, mappedItems);
        const filteredItems = filterCodexByCategory(mappedItems);
        codexSearchResultsCache = filteredItems;
        if (!filteredItems.length) {
          console.warn('[orbiter] codex suggestions empty result', { query: q, data, category: categoryKey });
        }
        renderCodexSuggestions(filteredItems);
        renderCodexResults(filteredItems);
        return filteredItems;
      } catch (error) {
        if (error?.name === 'AbortError') return [];
        hideCodexSuggestions();
        renderCodexResults([]);
        logClientError('codex suggestions fetch', error, { query: q });
        return [];
      }
    }

    async function loadCodexEntry(queryOrTitle) {
      const q = (queryOrTitle || codexSearchInput?.value || '').trim();
      if (!q) {
        logClientError('codex entry load', new Error('Empty query'));
        return;
      }
      clearCodexPageDetails();
      setCodexState({ loading: true });
      hideCodexSuggestions();
      try {
        const entryCacheKey = q.toLowerCase();
        const cachedEntry = getCodexCached('entry', entryCacheKey, CODEX_ENTRY_TTL_MS);
        if (cachedEntry) {
          codexActiveTitle = cachedEntry.title;
          codexActiveUrl = cachedEntry.url;
          codexActiveCategory = cachedEntry.category || getCodexCategory(cachedEntry.title, cachedEntry.summary);
          codexActiveSummary = String(cachedEntry.summary || '').trim();
          setCodexState({
            title: cachedEntry.title,
            summary: cachedEntry.summary,
            meta: cachedEntry.meta,
            url: cachedEntry.url,
            farmingInfo: cachedEntry.farmingInfo || ''
          });
          return;
        }
        const workerData = await fetchCodexJson(buildCodexWorkerSearchUrl(q), undefined, 'codex worker search');
        const items = workerData?.items || workerData?.payload?.items || [];
        const top = workerData?.summary || workerData?.payload?.summary || null;
        console.log('[CODEX DEBUG]', {
          hostname: window.location.hostname || '(unknown)',
          workerBase: CODEX_WORKER_BASE_URL,
          requestUrl: workerData?.__requestUrl || '(unknown)',
          responseStatus: workerData?.__status,
          dataOk: workerData?.ok,
          itemsLength: Array.isArray(items) ? items.length : -1,
          hasSummary: Boolean(top)
        });
        console.log('Items count:', items.length);
        console.log('Summary:', top);
        const hasParseShape =
          Array.isArray(workerData?.items)
          || workerData?.summary !== undefined
          || Array.isArray(workerData?.payload?.items)
          || workerData?.payload?.summary !== undefined;
        if (workerData?.ok === true && !hasParseShape) {
          codexActiveTitle = '';
          codexActiveUrl = '';
          codexActiveCategory = 'uncategorized';
          codexActiveSummary = '';
          setCodexState({
            title: 'Lookup failed',
            summary: 'Codex response received, but UI could not parse it.',
            meta: 'SOURCE // PARSE SHAPE MISMATCH',
            url: ''
          });
          return;
        }
        if (top?.title) {
          const finalTitle = top.title;
          const extract = String(top.extract || '').trim();
          const category = getCodexCategory(finalTitle, extract);
          const farmingInfo = detectFarmingInfo({ extract });
          codexActiveTitle = finalTitle;
          codexActiveUrl = top.url || codexPageUrl(finalTitle);
          codexActiveCategory = category;
          codexActiveSummary = extract || '';
          if (!extract) {
            console.warn('[orbiter] codex summary empty extract', { title: finalTitle, data: workerData });
          }
          const entryPayload = {
            title: finalTitle,
            summary: extract || `The official wiki returned the page "${finalTitle}" but did not include an intro extract.`,
            meta: extract ? `SOURCE // OFFICIAL WARFRAME WIKI INTRO // ${category.toUpperCase()}` : `SOURCE // EMPTY EXTRACT // ${category.toUpperCase()}`,
            url: top.url || codexPageUrl(finalTitle),
            category,
            farmingInfo
          };
          setCodexCached('entry', entryCacheKey, entryPayload);
          setCodexState(entryPayload);
          return;
        } else if (items.length > 0) {
          const first = items[0];
          const fallbackTitle = String(first?.title || q).trim();
          const fallbackSnippet = String(first?.snippet || '').trim();
          const category = getCodexCategory(fallbackTitle, fallbackSnippet);
          codexActiveTitle = fallbackTitle;
          codexActiveUrl = first?.url || codexPageUrl(fallbackTitle);
          codexActiveCategory = category;
          codexActiveSummary = fallbackSnippet;
          const fallbackPayload = {
            title: fallbackTitle,
            summary: fallbackSnippet || `Open "${fallbackTitle}" for full details.`,
            meta: `SOURCE // WORKER SEARCH RESULT // ${category.toUpperCase()}`,
            url: first?.url || codexPageUrl(fallbackTitle),
            category,
            farmingInfo: ''
          };
          setCodexCached('entry', entryCacheKey, fallbackPayload);
          setCodexState(fallbackPayload);
          renderCodexResults(filterCodexByCategory(items.map(entry => ({
            title: entry.title,
            snippet: stripHtml(entry.snippet || ''),
            category: getCodexCategory(entry.title, entry.snippet || ''),
            url: entry.url || codexPageUrl(entry.title)
          }))));
          return;
        } else {
          codexActiveTitle = '';
          codexActiveUrl = '';
          codexActiveCategory = 'uncategorized';
          codexActiveSummary = '';
          setCodexState({
            title: 'No codex result',
            summary: 'No Codex results found.',
            meta: 'SOURCE // NO RESULTS',
            url: ''
          });
          console.warn('[orbiter] codex entry empty result', { query: q, data: workerData });
          return;
        }
      } catch (error) {
        codexActiveTitle = '';
        codexActiveUrl = '';
        codexActiveCategory = 'uncategorized';
        codexActiveSummary = '';
        const isNetworkError = error?.name === 'TypeError' || /network|failed to fetch|cors/i.test(String(error?.message || ''));
        const reason = isNetworkError
          ? 'network or CORS blocked'
          : error?.message?.includes('HTTP')
            ? 'HTTP error from Worker'
            : error?.message?.includes('parse error')
              ? 'response parse error'
              : 'lookup error';
        setCodexState({
          title: 'Lookup failed',
          summary: `Codex lookup failed because of ${reason}. Check the console for hostname, worker base URL, request URL, response status, and parsed JSON.`,
          meta: `SOURCE // ${reason.toUpperCase()}`,
          url: q ? codexPageUrl(q) : ''
        });
        logClientError('codex entry fetch', error, { query: q, reason });
      }
    }

    if (codexSearchInput) {
      codexSearchInput.addEventListener('input', () => {
        clearTimeout(codexSearchTimer);
        const q = codexSearchInput.value;
        codexSearchTimer = setTimeout(() => searchCodexSuggestions(q), 260);
      });
      codexSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          const next = Math.min(codexActiveSuggestIndex + 1, codexSuggestionsCache.length - 1);
          codexActiveSuggestIndex = next;
          renderCodexSuggestions(codexSuggestionsCache.map((item, idx) => ({ ...item, __active: idx === codexActiveSuggestIndex })));
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          const prev = Math.max(codexActiveSuggestIndex - 1, 0);
          codexActiveSuggestIndex = prev;
          renderCodexSuggestions(codexSuggestionsCache.map((item, idx) => ({ ...item, __active: idx === codexActiveSuggestIndex })));
          e.preventDefault();
        } else if (e.key === 'Enter' && codexSuggestionsCache.length && codexActiveSuggestIndex >= 0) {
          e.preventDefault();
          const active = codexSuggestionsCache[codexActiveSuggestIndex];
          if (active?.title) {
            codexSearchInput.value = active.title;
            loadCodexEntry(active.title);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          loadCodexEntry(codexSearchInput.value);
        } else if (e.key === 'Escape') {
          hideCodexSuggestions();
        }
      });
      codexSearchInput.addEventListener('blur', () => setTimeout(hideCodexSuggestions, 150));
    } else {
      logClientError('codex bindings', new Error('codexSearchInput not found'));
    }

    if (codexSearchBtn) codexSearchBtn.addEventListener('click', () => loadCodexEntry(codexSearchInput?.value || ''));
    if (codexPageLink) {
      codexPageLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const title = (codexActiveTitle || codexSearchInput?.value || '').trim();
        if (!title) return;
        loadCodexPageDetails(title, { openModal: true });
      });
    }
    if (codexOpenBtn) codexOpenBtn.addEventListener('click', () => {
      const title = (codexActiveTitle || codexSearchInput?.value || '').trim();
      if (!title) {
        logClientError('codex open entry', new Error('No title to open'));
        setCodexState({
          title: codexTitle?.textContent || 'Awaiting query',
          summary: 'Open an entry first.',
          meta: 'SOURCE // OPEN AN ENTRY FIRST',
          url: codexActiveUrl || ''
        });
        return;
      }
      loadCodexPageDetails(title, { openModal: true });
    });
    if (codexEntryModalClose) codexEntryModalClose.addEventListener('click', () => setCodexModalOpen(false));
    if (codexEntryModal) {
      codexEntryModal.addEventListener('click', (e) => {
        const backdropClick = e.target === codexEntryModal || e.target?.classList?.contains('terminal-modal__backdrop');
        if (backdropClick) setCodexModalOpen(false);
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !codexModalState.open) return;
      e.preventDefault();
      setCodexModalOpen(false);
    });
    if (codexPinBtn) codexPinBtn.addEventListener('click', pinActiveCodexEntry);
    if (codexCategoryFilter) {
      codexCategoryFilter.addEventListener('change', () => {
        const q = (codexSearchInput?.value || '').trim();
        if (!q) {
          renderCodexResults([]);
          return;
        }
        const key = `${String(codexCategoryFilter.value || 'all').toLowerCase()}::${q.toLowerCase()}`;
        const cached = getCodexCached('search', key, CODEX_SEARCH_TTL_MS);
        if (cached) {
          const filtered = filterCodexByCategory(cached);
          codexSearchResultsCache = filtered;
          renderCodexSuggestions(filtered);
          renderCodexResults(filtered);
          return;
        }
        searchCodexSuggestions(q);
      });
    }
    document.querySelectorAll('.codex-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (codexSearchInput) codexSearchInput.value = chip.dataset.query || '';
        loadCodexEntry(chip.dataset.query || '');
      });
    });
    renderCodexFavorites();

    document.querySelectorAll('[data-dash-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.dashNav || 'dashboard';
        showSection(section);
      });
    });
    document.querySelectorAll('[data-dash-open]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button, a, input, select, textarea, label')) return;
        const sourceCard = e.currentTarget;
        const section = sourceCard.dataset.dashOpen || '';
        const cardType = sourceCard.dataset.dashCard || '';
        const title = sourceCard.dataset.dashTitle || sourceCard.querySelector('h2')?.textContent?.trim() || 'Dashboard Preview';
        const subtitle = sourceCard.dataset.dashSubtitle || sourceCard.querySelector('div')?.textContent?.trim() || 'Dashboard card';
        openDashboardCardModal({ section, cardType, title, subtitle });
      });
    });
    if (dashboardCardModalClose) {
      dashboardCardModalClose.addEventListener('click', () => setDashboardCardModalOpen(false));
    }
    if (dashboardCardModal) {
      dashboardCardModal.addEventListener('click', (e) => {
        const backdropClick = e.target === dashboardCardModal || e.target?.classList?.contains('terminal-modal__backdrop');
        if (backdropClick) setDashboardCardModalOpen(false);
      });
    }
    if (dashboardCardModalOpenSection) {
      dashboardCardModalOpenSection.addEventListener('click', () => {
        const target = dashboardCardModalState.section || 'dashboard';
        setDashboardCardModalOpen(false).then(() => showSection(target));
      });
    }

    const runDashboardMarketQuickSearch = () => {
      const query = String(dashMarketQuickInput?.value || '').trim();
      showSection('market');
      if (!query) return;
      if (marketItemSearch) {
        marketItemSearch.value = query;
        marketItemSearch.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (marketSearchBtn) marketSearchBtn.click();
    };

    const dashMarketQuickState = {
      items: [],
      activeIndex: -1,
      open: false,
      timer: null
    };

    const closeDashMarketSuggest = () => {
      dashMarketQuickState.items = [];
      dashMarketQuickState.activeIndex = -1;
      dashMarketQuickState.open = false;
      if (!dashMarketQuickSuggest) return;
      dashMarketQuickSuggest.innerHTML = '';
      dashMarketQuickSuggest.hidden = true;
    };

    const renderDashMarketSuggest = () => {
      if (!dashMarketQuickSuggest) return;
      if (!dashMarketQuickState.items.length) {
        closeDashMarketSuggest();
        return;
      }
      dashMarketQuickSuggest.hidden = false;
      dashMarketQuickState.open = true;
      dashMarketQuickSuggest.innerHTML = dashMarketQuickState.items.map((item, idx) => `
        <button type="button" class="dash-market-suggest__item${idx === dashMarketQuickState.activeIndex ? ' is-active' : ''}" data-dash-market-suggest-index="${idx}">
          <span>${escapeHtml(item.item_name || item.url_name || 'Unknown item')}</span>
          <span class="dash-market-suggest__meta">${escapeHtml(item.url_name || '')}</span>
        </button>
      `).join('');
      dashMarketQuickSuggest.querySelectorAll('[data-dash-market-suggest-index]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.dashMarketSuggestIndex);
          const item = dashMarketQuickState.items[idx];
          if (!item) return;
          dashMarketQuickInput.value = item.item_name || item.url_name || '';
          closeDashMarketSuggest();
          runDashboardMarketQuickSearch();
        });
      });
    };

    const searchDashMarketSuggest = async () => {
      if (!dashMarketQuickInput) return;
      const q = String(dashMarketQuickInput.value || '').trim().toLowerCase();
      if (!q) {
        closeDashMarketSuggest();
        return;
      }
      try {
        await ensureMarketCatalog();
      } catch {
        closeDashMarketSuggest();
        return;
      }
      const pool = Array.isArray(marketState?.catalog) ? marketState.catalog : [];
      const startsWith = [];
      const includes = [];
      for (const item of pool) {
        const name = String(item?.item_name || '').toLowerCase();
        const slug = String(item?.url_name || '').toLowerCase();
        if (!name && !slug) continue;
        if (name.startsWith(q) || slug.startsWith(q)) startsWith.push(item);
        else if (name.includes(q) || slug.includes(q)) includes.push(item);
        if (startsWith.length + includes.length >= 12) break;
      }
      dashMarketQuickState.items = [...startsWith, ...includes].slice(0, 10);
      dashMarketQuickState.activeIndex = dashMarketQuickState.items.length ? 0 : -1;
      renderDashMarketSuggest();
    };

    if (dashMarketQuickGo) dashMarketQuickGo.addEventListener('click', runDashboardMarketQuickSearch);
    if (dashMarketQuickInput) {
      dashMarketQuickInput.addEventListener('input', () => {
        if (dashMarketQuickState.timer) clearTimeout(dashMarketQuickState.timer);
        dashMarketQuickState.timer = window.setTimeout(searchDashMarketSuggest, 250);
      });
      dashMarketQuickInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' && dashMarketQuickState.open && dashMarketQuickState.items.length) {
          e.preventDefault();
          dashMarketQuickState.activeIndex = (dashMarketQuickState.activeIndex + 1) % dashMarketQuickState.items.length;
          renderDashMarketSuggest();
          return;
        }
        if (e.key === 'ArrowUp' && dashMarketQuickState.open && dashMarketQuickState.items.length) {
          e.preventDefault();
          dashMarketQuickState.activeIndex = (dashMarketQuickState.activeIndex - 1 + dashMarketQuickState.items.length) % dashMarketQuickState.items.length;
          renderDashMarketSuggest();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDashMarketSuggest();
          return;
        }
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (dashMarketQuickState.open && dashMarketQuickState.items.length && dashMarketQuickState.activeIndex >= 0) {
          const active = dashMarketQuickState.items[dashMarketQuickState.activeIndex];
          if (active) {
            dashMarketQuickInput.value = active.item_name || active.url_name || '';
          }
        }
        closeDashMarketSuggest();
        runDashboardMarketQuickSearch();
      });
      dashMarketQuickInput.addEventListener('blur', () => {
        window.setTimeout(() => {
          if (dashMarketQuickSuggest?.matches(':hover')) return;
          closeDashMarketSuggest();
        }, 120);
      });
    }
    document.addEventListener('click', (e) => {
      if (!dashMarketQuickSuggest || !dashMarketQuickInput) return;
      const inside = e.target instanceof Element && (e.target.closest('#dashMarketQuickSuggest') || e.target.closest('#dashMarketQuickInput'));
      if (inside) return;
      closeDashMarketSuggest();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !dashboardCardModalState.open) return;
      e.preventDefault();
      setDashboardCardModalOpen(false);
    });


    setupSubtabs();
    document.querySelectorAll('[data-subtabs]').forEach(group => {
      const firstBtn = group.querySelector('.subtab-btn');
      if (firstBtn) firstBtn.click();
    });
