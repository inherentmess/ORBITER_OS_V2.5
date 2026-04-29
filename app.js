const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.content-section');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');

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
function normalizeApiBase(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

const API_BASE = "https://orbiter-os.up.railway.app";
const API_BASE_URL = normalizeApiBase(
  window.ORBITER_API_BASE_URL ||
  document.querySelector('meta[name="orbiter-api-base"]')?.content ||
  API_BASE
);
const MARKET_PROXY_URL = normalizeApiBase('https://orbitor-os.jrque.workers.dev');

function buildApiUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildMarketProxyUrl(path) {
  if (!MARKET_PROXY_URL) throw new Error('Market proxy required');
  return `${MARKET_PROXY_URL}${path.startsWith('/') ? path : `/${path}`}`;
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

let currentSectionName = 'dashboard';
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
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.remove();
    }
    return;
  }
  if (!overlay || !linesEl) return;
  if (sessionStorage.getItem('orbiter_boot_closed') === '1' || isMobileOrTouch()) {
    sessionStorage.setItem('orbiter_boot_closed', '1');
    overlay.classList.add('hidden');
    overlay.remove();
    return;
  }

  const lines = [
    '[LINK_ESTABLISHED]  Cephalon_Link online',
    '[MOUNT]  archives://tenno',
    '[SYNC]  backend API proxy handshake',
    '[INIT]  market catalog cache',
    '[READY]  enter command'
  ];

  let cancelled = false;
  let lineIndex = 0;
  let charIndex = 0;

  const closeOverlay = () => {
    if (cancelled) return;
    cancelled = true;
    sessionStorage.setItem('orbiter_boot_closed', '1');

    // Animate out via CSS, then remove only after it completes.
    overlay.classList.add('closing');
    const finalize = () => {
      overlay.removeEventListener('animationend', finalize);
      overlay.classList.add('hidden');
      overlay.remove();
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
  const closeFromTouch = (e) => {
    if (!isMobileOrTouch()) return;
    e.preventDefault();
    closeOverlay();
  };
  overlay.addEventListener('click', closeFromTouch);
  overlay.addEventListener('touchstart', closeFromTouch, { passive: false });
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      closeOverlay();
    }
  });

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
      if (continueBtn) continueBtn.focus();
      else overlay.focus();
      return;
    }
    window.setTimeout(step, 140);
  };

  overlay.classList.add('opening');
  overlay.addEventListener('animationend', () => overlay.classList.remove('opening'), { once: true });
  setHint('initializing audio (unlocks on interaction)');
  try { overlay.focus(); } catch {}
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
    }

    function showSection(sectionName) {
      currentSectionName = sectionName || 'dashboard';
      navButtons.forEach(btn => btn.classList.toggle('nav-active', btn.dataset.section === sectionName));

      if (sectionAccordionState.enabled) {
        // Mobile/tablet: treat nav buttons as "open this panel" (not toggle).
        sectionNames.forEach(name => setSectionOpen(name, name === sectionName));
        setSectionOpen(sectionName, true, { scrollIntoView: true });
      } else {
        sections.forEach(section => section.classList.toggle('hidden-panel', section.id !== `section-${sectionName}`));
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

    setupSectionAccordion();
    hydrateApiLinks();
    if (accordionMql) {
      // Keep behavior correct across resize/orientation changes.
      if (typeof accordionMql.addEventListener === 'function') accordionMql.addEventListener('change', syncAccordionMode);
      else if (typeof accordionMql.addListener === 'function') accordionMql.addListener(syncAccordionMode);
    }
    syncAccordionMode();
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
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
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

    async function fetchDashboardWorldstateJson() {
      if (dashboardWorldstateRequest) return dashboardWorldstateRequest;
      dashboardWorldstateRequest = (async () => {
        const backendUrl = API_BASE_URL ? apiUrl('/api/worldstate') : '';
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

        const fallbackUrl = 'https://api.tenno.tools/worldstate/pc';
        logRequest('dashboard tenno.tools direct', fallbackUrl);
        const fallbackResponse = await fetch(fallbackUrl, { cache: 'no-store', headers: { Accept: 'application/json' } });
        logResponse('dashboard tenno.tools direct', fallbackResponse);
        if (!fallbackResponse.ok) throw new Error(`tenno.tools HTTP ${fallbackResponse.status} from ${fallbackUrl}`);
        const fallbackJson = await parseJsonResponse(fallbackResponse, 'dashboard tenno.tools direct');
        if (!fallbackJson || typeof fallbackJson !== 'object') throw new Error('tenno.tools response missing object payload');
        logJson('dashboard tenno.tools direct summary', { keys: Object.keys(fallbackJson || {}).slice(0, 20) });
        return {
          source: 'tenno.tools (direct fallback)',
          data: fallbackJson
        };
      })();
      try {
        return await dashboardWorldstateRequest;
      } finally {
        dashboardWorldstateRequest = null;
      }
    }

    const dashboardCategoryDefs = [
      { id: 'environments', title: 'Cycles', source: '/api/worldstate (Tenno Tools)' },
      { id: 'missions', title: 'Missions & Rotations', source: '/api/worldstate (Tenno Tools)' },
      { id: 'bounties', title: 'Bounties', source: '/api/worldstate (Tenno Tools)' },
      { id: 'syndicate-missions', title: 'Nightwave & Events', source: '/api/worldstate (Tenno Tools)' },
      { id: 'utility', title: 'Utility / Info', source: '/api/worldstate (Tenno Tools)' }
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

    function tennoData(data, key) {
      const component = data?.[key];
      if (Array.isArray(component)) return component;
      return Array.isArray(component?.data) ? component.data : [];
    }

    function tennoIso(seconds) {
      const value = Number(seconds);
      if (!Number.isFinite(value) || value <= 0) return '';
      return new Date(value * 1000).toISOString();
    }

    function tennoSoonestEnd(rows = []) {
      return rows
        .map(row => row?.expiresAt || tennoIso(row?.end))
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

    function genericDetail(id, title, entries, source = 'Tenno Tools') {
      return { id, title, entries, source, expiresAt: tennoSoonestEnd(entries), type: 'generic' };
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

    function cycleFromTenno(row) {
      const nowSec = Math.floor(Date.now() / 1000);
      const length = Number(row.length);
      const start = Number(row.start);
      const dayStart = Number(row.dayStart);
      const dayEnd = Number(row.dayEnd);
      if (!Number.isFinite(length) || !Number.isFinite(start) || !Number.isFinite(dayStart) || !Number.isFinite(dayEnd)) return null;
      const elapsed = ((nowSec - start) % length + length) % length;
      const isDay = dayStart <= dayEnd
        ? elapsed >= dayStart && elapsed < dayEnd
        : elapsed >= dayStart || elapsed < dayEnd;
      let nextOffset = isDay ? dayEnd : dayStart;
      if (nextOffset <= elapsed) nextOffset += length;
      const expiresAt = new Date((nowSec + Math.max(0, nextOffset - elapsed)) * 1000).toISOString();
      return { state: isDay ? 'Day' : 'Night', expiresAt };
    }

    function mapTennoToolsWorldstateToDashboardCategories(data) {
      if (data?.upstreamError) {
        return unavailableDashboardCategories(data.message || 'Tenno Tools returned an empty worldstate body.');
      }

      const fissures = tennoData(data, 'fissures');
      const invasions = tennoData(data, 'invasions');
      const sorties = tennoData(data, 'sorties');
      const voidTraders = tennoData(data, 'voidtraders');
      const challenges = tennoData(data, 'challenges');
      const events = tennoData(data, 'news');
      const daynight = tennoData(data, 'daynight');
      const bounties = tennoData(data, 'bounties');
      const voidStorms = tennoData(data, 'voidstorms');
      const boosters = tennoData(data, 'upgrades');
      const dailyDeals = tennoData(data, 'dailydeals');
      const factionProjects = tennoData(data, 'factionprojects');

      const cycleTitles = { earth: 'Earth', fortuna: 'Orb Vallis' };
      const cycleCards = daynight.map(row => {
        if (row.id === 'cetus') return null;
        const cycle = cycleFromTenno(row) || {};
        const title = cycleTitles[row.id] || dashboardToken(row.id);
        return cycle.expiresAt && title ? statusCard(`cycle-${row.id}`, 'Cycle', title, cycle.state, cycle.expiresAt, `Tenno Tools cycle id: ${row.id}`) : null;
      }).filter(Boolean);

      const sortie = sorties[0] || {};
      const voidTrader = voidTraders[0] || {};
      const nightwave = challenges[0] || {};
      const normalFissures = fissures.filter(row => !row.hard);
      const hardFissures = fissures.filter(row => row.hard);

      const missionCards = [
        Array.isArray(sortie.missions) && sortie.missions.length ? statusCard('sortie', 'Daily', 'Sortie', sortie.bossName || sortie.faction, tennoIso(sortie.end), `${sortie.missions.length} missions // ${sortie.faction || 'Faction pending'}`, { selectable: true }) : null,
        normalFissures.length ? statusCard('fissures-normal', 'Relics', 'Void Fissures', `${normalFissures.length} active`, tennoSoonestEnd(normalFissures), `${normalFissures[0].tier || ''} ${normalFissures[0].missionType || ''} // ${normalFissures[0].location || ''}`.trim(), { selectable: true }) : null,
        hardFissures.length ? statusCard('fissures-hard', 'Steel Path', 'Steel Path Fissures', `${hardFissures.length} active`, tennoSoonestEnd(hardFissures), `${hardFissures[0].tier || ''} ${hardFissures[0].missionType || ''} // ${hardFissures[0].location || ''}`.trim(), { selectable: true }) : null,
        voidStorms.length ? statusCard('void-storms', 'Railjack', 'Void Storms', `${voidStorms.length} active`, tennoSoonestEnd(voidStorms), `${voidStorms[0].tier || ''} ${voidStorms[0].missionType || ''} // ${voidStorms[0].location || ''}`.trim(), { selectable: true }) : null,
        invasions.length ? statusCard('invasions', 'Invasions', 'Invasions', `${invasions.length} active`, '', `${invasions[0].location || 'Invasion'} // ${invasions[0].factionAttacker || ''} vs ${invasions[0].factionDefender || ''}`, { selectable: true, hideTimer: true }) : null
      ];

      const missionDetails = [
        genericDetail('sortie', 'Sortie', (sortie.missions || []).map((row, index) => ({ id: `sortie-${index}`, name: row.location || row.node || `Sortie ${index + 1}`, tier: row.missionType || '', factionLocation: sortie.faction || '', rewards: rewardsText(sortie.rewards, 'Sortie reward table'), detail: row.modifier || row.modifierDescription || '', expiresAt: tennoIso(sortie.end) }))),
        genericDetail('fissures-normal', 'Void Fissures', normalFissures.map((row, index) => ({ id: `fissure-${index}`, name: row.location || 'Fissure', tier: row.tier || '', factionLocation: [row.faction, row.missionType].filter(Boolean).join(' // '), rewards: 'Relic rewards', detail: `Hard: ${row.hard ? 'yes' : 'no'}`, expiresAt: tennoIso(row.end) }))),
        genericDetail('fissures-hard', 'Steel Path Fissures', hardFissures.map((row, index) => ({ id: `hard-fissure-${index}`, name: row.location || 'Fissure', tier: row.tier || '', factionLocation: [row.faction, row.missionType].filter(Boolean).join(' // '), rewards: 'Steel Path relic rewards', detail: `Hard: ${row.hard ? 'yes' : 'no'}`, expiresAt: tennoIso(row.end) }))),
        genericDetail('void-storms', 'Void Storms', voidStorms.map((row, index) => ({ id: `voidstorm-${index}`, name: row.location || 'Void Storm', tier: row.tier || '', factionLocation: [row.faction, row.missionType].filter(Boolean).join(' // '), rewards: 'Railjack relic rewards', detail: tennoIso(row.start) ? `Starts ${tennoIso(row.start)}` : '', expiresAt: tennoIso(row.end) }))),
        genericDetail('invasions', 'Invasions', invasions.map((row, index) => ({ id: `invasion-${index}`, name: row.location || 'Invasion', tier: [row.factionAttacker, 'vs', row.factionDefender].filter(Boolean).join(' '), factionLocation: row.location || '', rewards: [rewardsText(row.rewardsAttacker, ''), rewardsText(row.rewardsDefender, '')].filter(Boolean).join(' // '), detail: `Score ${row.score ?? '?'} / ${row.endScore ?? '?'}` })))
      ];

      const bountyEntries = bounties.flatMap(group => (group.jobs || []).map((job, index) => ({
        id: `bounty-${group.id}-${index}`,
        name: group.syndicate || group.id || 'Bounty',
        tier: `${job.minLevel ?? '?'}-${job.maxLevel ?? '?'} Level`,
        factionLocation: group.syndicate || '',
        rewards: rewardsText(job.rewards, 'Bounty reward table'),
        detail: (job.xpAmounts || []).length ? `Standing: ${(job.xpAmounts || []).join(', ')}` : '',
        expiresAt: tennoIso(group.end)
      })));
      const bountyDetail = genericDetail('bounties', 'Bounties', bountyEntries);

      const nightwaveEntries = (nightwave.challenges || []).map((row, index) => ({
        id: `nightwave-${index}`,
        name: row.description || 'Nightwave challenge',
        tier: row.daily ? 'Daily' : 'Weekly',
        factionLocation: `Season ${nightwave.season ?? '?'}`,
        rewards: `${row.xpAmount ?? 0} standing`,
        detail: row.id || '',
        expiresAt: tennoIso(row.end)
      }));
      const eventEntries = events.slice(0, 12).map((row, index) => ({
        id: `event-${index}`,
        name: row.text || 'News / Event',
        tier: 'News',
        factionLocation: row.link || '',
        rewards: 'Info',
        detail: row.id || '',
        expiresAt: tennoIso(row.end)
      }));

      const utilityCards = [
        voidTrader.id ? statusCard('void-trader', 'Vendor', "Baro Ki'Teer", voidTrader.active ? 'Active' : 'Away', tennoIso(voidTrader.end || voidTrader.start), [voidTrader.location, voidTrader.active ? 'Inventory available' : 'Arrival pending'].filter(Boolean).join(' // '), { selectable: true }) : null,
        dailyDeals.length ? statusCard('daily-deal', 'Store', "Darvo's Deal", dailyDeals[0]?.item?.name, tennoIso(dailyDeals[0]?.end), `${dailyDeals[0].price ?? '?'} credits // ${dailyDeals[0].sold ?? 0}/${dailyDeals[0].stock ?? '?'}`, { selectable: true }) : null,
        factionProjects.length && factionProjects[0]?.type ? statusCard('faction-projects', 'World', 'Faction Projects', `${factionProjects.length} tracked`, '', `${factionProjects[0].type} // ${Math.round(factionProjects[0].progress || 0)}%`, { selectable: true, hideTimer: true }) : null
      ];

      return [
        compactCategory('environments', cycleCards),
        compactCategory('missions', missionCards, missionDetails),
        compactCategory('bounties', bountyEntries.length ? [statusCard('bounties', 'Bounties', 'Bounties', `${bountyEntries.length} jobs`, tennoSoonestEnd(bountyEntries), `${bountyEntries[0].name} // ${bountyEntries[0].tier}`, { selectable: true })] : [], [bountyDetail]),
        compactCategory('syndicate-missions', [
          nightwaveEntries.length ? statusCard('nightwave', 'Nightwave', 'Nightwave', `Season ${nightwave.season ?? '?'}`, tennoIso(nightwave.end), `${nightwaveEntries.length} active challenges`, { selectable: true }) : null,
          events.length ? statusCard('events', 'Events', 'Events / News', `${events.length} posts`, '', events[0]?.text, { selectable: true, hideTimer: true }) : null
        ], [genericDetail('nightwave', 'Nightwave', nightwaveEntries), genericDetail('events', 'Events / News', eventEntries)]),
        compactCategory('utility', utilityCards, [
          genericDetail('void-trader', "Baro Ki'Teer", voidTraders.map((row, index) => ({ id: `baro-${index}`, name: row.name || "Baro Ki'Teer", tier: row.active ? 'Active' : 'Away', factionLocation: row.location || '', rewards: 'Void trader inventory', detail: tennoIso(row.start) ? `Starts ${tennoIso(row.start)}` : '', expiresAt: tennoIso(row.end) }))),
          genericDetail('daily-deal', "Darvo's Deal", dailyDeals.map((row, index) => ({ id: `deal-${index}`, name: row.item?.name || 'Daily Deal', tier: `${row.price ?? '?'} credits`, factionLocation: 'Market', rewards: `${row.originalPrice ?? '?'} original credits`, detail: `${row.sold ?? 0}/${row.stock ?? '?'} sold`, expiresAt: tennoIso(row.end) }))),
          genericDetail('faction-projects', 'Faction Projects', factionProjects.map((row, index) => ({ id: `project-${index}`, name: row.type || 'Faction Project', tier: `${Math.round(row.progress || 0)}%`, factionLocation: row.id || '', rewards: 'World event progress', detail: `${(row.progressHistory || []).length} history points` })))
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
      const selectedClasses = selected ? ' bg-terminal text-black shadow-[0_0_24px_rgba(66,245,139,0.28)]' : ' hover:bg-terminal hover:text-black';
      const timerLine = card.hideTimer ? '' : `<div class="tracker-timer mt-3 font-black" data-dashboard-countdown="${escapeHtml(card.id)}">${formatDashboardCountdown(card.expiresAt)}</div>`;
      return `
        <button class="tracker-card panel-card text-left transition-colors${selectedClasses}" type="button" data-dashboard-detail-select="${escapeHtml(card.id)}" data-dashboard-detail-category="${escapeHtml(categoryId)}">
          <div class="uppercase text-[10px] tracking-[0.25em] mb-2 ${selected ? 'text-black/70' : 'text-terminal/70'}">${escapeHtml(card.label)}</div>
          <div class="tracker-card-title font-bold">${escapeHtml(card.title)}</div>
          ${timerLine}
          <div class="tracker-card-footer">
            <div class="text-sm mt-2 ${selected ? 'text-black/80' : 'text-green-200/90'}">${escapeHtml(card.state)}</div>
            <p class="text-xs mt-3 leading-5 ${selected ? 'text-black/70' : 'text-green-200/70'}">${escapeHtml(card.detail)}</p>
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
        dashboardTrackerGrid.innerHTML = '<div class="panel-card p-5 text-sm text-green-200/80">No valid active tracker sections are available right now.</div>';
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
          if (row) node.textContent = formatDashboardCountdown(row.expiresAt);
          return;
        }
        const card = cards.find(item => item.id === countdownId);
        if (card) node.textContent = formatDashboardCountdown(card.expiresAt);
      });
    }

    async function refreshDashboardTrackers() {
      const now = Date.now();
      const refreshAge = now - (dashboardTrackerState.lastFetchAt || 0);
      if ((dashboardTrackerState.lastData || dashboardTrackerState.lastFetchAt) && refreshAge < 60000) {
        if (dashboardTrackerState.lastData) {
          setDashboardCategories(mapTennoToolsWorldstateToDashboardCategories(dashboardTrackerState.lastData));
          renderDashboardTrackerCards();
          updateDashboardCountdowns();
          if (dashboardTrackerState.syncedAt) {
            setDashboardTrackerStatus(`Live via ${dashboardTrackerState.source || 'Tenno Tools'} // ${dashboardTrackerState.syncedAt.toLocaleTimeString()}`);
          }
        } else {
          renderDashboardTrackerCards();
          setDashboardTrackerStatus('Tenno Tools unavailable');
        }
        return;
      }

      setDashboardTrackerStatus('Syncing Tenno Tools...');
      ensureDashboardNodeLookup().then(() => {
        if (!dashboardTrackerState.lastData) return;
        // Re-map in place so readable node/type text appears without refetching.
        setDashboardCategories(mapTennoToolsWorldstateToDashboardCategories(dashboardTrackerState.lastData));
        renderDashboardTrackerCards();
        updateDashboardCountdowns();
      });
      setDashboardCategories(loadingDashboardCategories('Loading Tenno Tools data for this category...'));
      renderDashboardTrackerCards();
      try {
        dashboardTrackerState.lastFetchAt = Date.now();
        const result = await fetchDashboardWorldstateJson();
        setDashboardCategories(mapTennoToolsWorldstateToDashboardCategories(result.data));
        dashboardTrackerState.source = result.source;
        dashboardTrackerState.syncedAt = new Date();
        dashboardTrackerState.lastData = result.data;
        renderDashboardTrackerCards();
        updateDashboardCountdowns();
        setDashboardTrackerStatus(`Live via ${result.source} // ${dashboardTrackerState.syncedAt.toLocaleTimeString()}`);
      } catch (error) {
        setDashboardCategories(unavailableDashboardCategories(error?.message || 'Tenno Tools did not return world-state data.'));
        renderDashboardTrackerCards();
        setDashboardTrackerStatus('Tenno Tools unavailable');
        logClientError('dashboard world-state refresh', error);
      }
    }

    if (currentSectionName === 'trackers') refreshDashboardTrackers();
    setInterval(() => {
      if (currentSectionName === 'trackers') refreshDashboardTrackers();
    }, 60000);
    setInterval(updateDashboardCountdowns, 1000);

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
      sellOrders: [],
      buyOrders: []
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
        data?.data?.payload?.orders,
        data?.payload?.orders,
        data?.orders,
        Array.isArray(data) ? data : null
      ]);
    }

    function normalizeOrdersFromRaw(rawOrders) {
      const mapped = rawOrders.map(order => {
        const userObj = (order && typeof order.user === 'object' && order.user !== null) ? order.user : {};
        const status = String(
          userObj?.status ||
          order?.user_status ||
          order?.status ||
          'unknown'
        ).toLowerCase();
        const platinumRaw = order?.platinum ?? order?.price ?? order?.price_platinum;
        const rawSide = String(order?.order_type || order?.orderType || order?.type || order?.side || '').toLowerCase().trim();
        const normalizedSide = rawSide === 'seller' ? 'sell' : rawSide === 'buyer' ? 'buy' : rawSide;
        return {
          ...order,
          user: typeof order?.user === 'string'
            ? { ingameName: order.user, status, platform: order?.platform || order?.user_platform || 'pc' }
            : (order?.user || userObj),
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

    async function fetchMarketJson(path) {
      const url = buildMarketProxyUrl(path);
      logRequest('market proxy', url);
      let response;
      try {
        response = await fetch(url, { cache: path.includes('/orders/') ? 'no-store' : 'force-cache' });
      } catch (error) {
        const wrapped = new Error(`market proxy network error from ${url}: ${error?.message || 'request failed'}`);
        wrapped.fetchUrl = url;
        wrapped.httpStatus = 0;
        throw wrapped;
      }
      logResponse('market proxy', response);
      if (!response.ok) {
        const wrapped = new Error(`market proxy HTTP ${response.status} from ${url}`);
        wrapped.fetchUrl = url;
        wrapped.httpStatus = response.status;
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
      if (marketState.loaded) return marketState.catalog;
      if (marketState.loading && marketState.loadPromise) return marketState.loadPromise;
      marketState.loading = true;
      marketState.failed = false;
      marketState.error = null;
      setMarketStatus('Catalog sync via market proxy...');

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
      const q = marketNorm(query);
      if (!q) return [];
      if (!marketState.loaded) {
        logClientError('market match', new Error('Catalog not loaded yet'), { query });
        return [];
      }
      const starts = [];
      const includes = [];
      for (const item of marketState.catalog) {
        if (item.norm_name.startsWith(q)) starts.push(item);
        else if (item.norm_name.includes(q)) includes.push(item);
        if (starts.length + includes.length >= limit * 3) break;
      }
      return starts.concat(includes).slice(0, limit);
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

    function renderOrderBook(target, orders, emptyText, action) {
      if (!target) return;
      if (!orders.length) {
        target.innerHTML = `<div class="border border-terminal/25 p-2 text-xs">${emptyText}</div>`;
        return;
      }
      target.innerHTML = orders.map(order => {
        const username = order.user?.ingameName || order.user?.ingame_name || order.user || 'Unknown';
        const status = order.user?.status || order.status || 'unknown';
        const platform = order.user?.platform || order.platform || 'pc';
        const rep = order.user?.reputation ?? order.reputation ?? 'n/a';
        const price = Number(order.platinum);
        return `
        <div class="market-order-row border border-terminal/25 p-2 text-xs">
          <div class="flex justify-between gap-2">
            <span class="text-terminal">${htmlEscape(price)}p</span>
            <span class="opacity-70">${htmlEscape(String(status).toUpperCase())}</span>
          </div>
          <div class="opacity-80 mt-1">${htmlEscape(username)} - qty ${htmlEscape(order.quantity || 1)} - ${htmlEscape(platform)} - rep ${htmlEscape(rep)}</div>
          <button class="market-whisper-copy mt-2 border border-terminal/40 px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-terminal hover:text-black" data-action="${htmlEscape(action)}" data-user="${jsAttrEscape(username)}" data-price="${htmlEscape(price)}">Copy Whisper</button>
        </div>
      `;
      }).join('');
      bindWhisperButtons(target);
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

    function orderStatus(order) {
      const raw = order?.user?.status || order?.status || 'unknown';
      return String(raw).toLowerCase();
    }

    function applyStatusFilter(orders, statusValue) {
      const value = String(statusValue || 'all').toLowerCase();
      if (value === 'all') return orders;
      if (value === 'ingame') {
        return orders.filter(order => {
          const status = orderStatus(order);
          return status === 'ingame' || status === 'online';
        });
      }
      return orders.filter(order => orderStatus(order) === value);
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
      if (s === 'online') return 1;
      if (s === 'offline') return 2;
      return 3;
    }

    function applyStatusThenPriceSort(orders, sortValue, defaultValue) {
      const value = String(sortValue || defaultValue || '').toLowerCase();
      const dir = value === 'price_desc' ? -1 : 1;
      return [...orders].sort((a, b) => {
        const ar = statusRank(orderStatus(a));
        const br = statusRank(orderStatus(b));
        if (ar !== br) return ar - br;

        const ap = Number(a.platinum);
        const bp = Number(b.platinum);
        if (!Number.isFinite(ap) && !Number.isFinite(bp)) return 0;
        if (!Number.isFinite(ap)) return 1;
        if (!Number.isFinite(bp)) return -1;
        return (ap - bp) * dir;
      });
    }

    function getMarketFilteredOrdersWithDebug(side) {
      const isBuy = side === 'buy';
      const status = isBuy ? (marketBuyStatus?.value || 'all') : (marketSellStatus?.value || 'all');
      const sort = isBuy ? (marketBuySort?.value || 'price_desc') : (marketSellSort?.value || 'price_asc');
      const minInput = isBuy ? marketBuyMin : marketSellMin;
      const maxInput = isBuy ? marketBuyMax : marketSellMax;
      const raw = isBuy ? marketState.buyOrders : marketState.sellOrders;
      const sellStage = raw.filter(order => order?.visible !== false);
      const ingameUsersStage = sellStage.filter(order => {
        const s = orderStatus(order);
        return s === 'ingame' || s === 'online';
      });
      const statusStage = applyStatusFilter(sellStage, status);
      const filteredByPlat = applyPlatFilter(statusStage, minInput, maxInput);
      const regionPlatformStage = filteredByPlat;
      const debug = {
        raw: raw.length,
        sell: sellStage.length,
        ingameUsers: ingameUsersStage.length,
        status: statusStage.length,
        price: filteredByPlat.length,
        regionPlatform: regionPlatformStage.length
      };
      console.log('[orbiter] market filter counts', {
        side,
        status,
        min: minInput?.value ?? '',
        max: maxInput?.value ?? '',
        raw: debug.raw,
        sell: debug.sell,
        ingameUsers: debug.ingameUsers,
        statusFiltered: debug.status,
        priceFiltered: debug.price,
        regionPlatformFiltered: debug.regionPlatform
      });
      if (String(status).toLowerCase() === 'all') {
        // Show ingame first (then online/offline), while still sorting by price within each status group.
        return {
          orders: applyStatusThenPriceSort(regionPlatformStage, sort, isBuy ? 'price_desc' : 'price_asc'),
          debug
        };
      }
      return {
        orders: applyPriceSort(regionPlatformStage, sort, isBuy ? 'price_desc' : 'price_asc'),
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
        'No orders match these filters.',
        marketModalState.side === 'sell' ? 'buy' : 'sell'
      );
    }

    function openMarketModal(side) {
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
      const sellResult = getMarketFilteredOrdersWithDebug('sell');
      const buyResult = getMarketFilteredOrdersWithDebug('buy');
      const filteredSell = sellResult.orders;
      const filteredBuy = buyResult.orders;
      if (marketSellCount) marketSellCount.textContent = `Showing ${filteredSell.length} of ${marketState.sellOrders.length}`;
      if (marketBuyCount) marketBuyCount.textContent = `Showing ${filteredBuy.length} of ${marketState.buyOrders.length}`;

      renderOrderBook(marketSellOrders, filteredSell, 'No sell orders match these filters.', 'buy');
      renderOrderBook(marketBuyOrders, filteredBuy, 'No buy orders match these filters.', 'sell');
      renderMarketStats(getOrderStats(filteredSell), 'Sell');
      setMarketStatus(`Raw ${sellResult.debug.raw} → Sell ${sellResult.debug.sell} → Status ${sellResult.debug.status} → Price ${sellResult.debug.price} → Showing ${filteredSell.length} of ${sellResult.debug.raw}`);

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
          '<div class="border border-terminal/25 p-2">Avg: -</div>',
          '<div class="border border-terminal/25 p-2">Median: -</div>',
          '<div class="border border-terminal/25 p-2">Min: -</div>',
          '<div class="border border-terminal/25 p-2">Max: -</div>'
        ].join('');
        return;
      }
      marketStats.innerHTML = [
        `<div class="border border-terminal/25 p-2">${label} avg: ${Math.round(stats.avg_price || 0)}p</div>`,
        `<div class="border border-terminal/25 p-2">Median: ${Math.round(stats.median || 0)}p</div>`,
        `<div class="border border-terminal/25 p-2">Min: ${Math.round(stats.min_price || 0)}p</div>`,
        `<div class="border border-terminal/25 p-2">Max: ${Math.round(stats.max_price || 0)}p</div>`
      ].join('');
    }

    async function loadMarketItem(item, { reason = 'select' } = {}) {
      if (!item) return;
      marketState.selectedItem = item;
      marketState.sellOrders = [];
      marketState.buyOrders = [];
      marketSelectedTitle.textContent = item.item_name;
      if (marketModalState.open) setMarketModalSide(marketModalState.side);
      marketSelectedMeta.textContent = 'Loading live orders and stats...';
      renderOrderBook(marketSellOrders, [], 'Loading sell orders...');
      renderOrderBook(marketBuyOrders, [], 'Loading buy orders...');
      renderMarketStats(null);
      setMarketOrdersUpdated(null);
      try {
        // Always fetch fresh orders on selection/refresh.
        const refreshTag = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const ordersData = await fetchMarketJson(`/api/market/orders/${encodeURIComponent(item.url_name)}?refresh=1&t=${refreshTag}`);
        const directSell = pickFirstArray([
          ordersData?.sellOrders,
          ordersData?.payload?.sellOrders,
          ordersData?.data?.payload?.sellOrders
        ]);
        const directBuy = pickFirstArray([
          ordersData?.buyOrders,
          ordersData?.payload?.buyOrders,
          ordersData?.data?.payload?.buyOrders
        ]);
        let sellOrders = normalizeOrdersFromRaw(directSell).sellOrders;
        let buyOrders = normalizeOrdersFromRaw(directBuy).buyOrders;
        if (!sellOrders.length && !buyOrders.length) {
          const rawOrders = getOrdersFromResponse(ordersData);
          const normalized = normalizeOrdersFromRaw(rawOrders);
          sellOrders = normalized.sellOrders;
          buyOrders = normalized.buyOrders;
          console.log('[orbiter] market orders fallback parse', {
            rawOrders: rawOrders.length,
            sell: sellOrders.length,
            buy: buyOrders.length
          });
        }
        marketState.sellOrders = sellOrders;
        marketState.buyOrders = buyOrders;
        const fetchedAt = ordersData?.fetchedAt ? new Date(ordersData.fetchedAt) : new Date();
        setMarketOrdersUpdated(fetchedAt, ordersData?.source || marketState.activeSource);
        const bestSell = applyPriceSort(sellOrders, 'price_asc', 'price_asc')[0]?.platinum;
        const bestBuy = applyPriceSort(buyOrders, 'price_desc', 'price_desc')[0]?.platinum;
        const spread = bestSell && bestBuy ? bestSell - bestBuy : null;
        marketSelectedMeta.textContent = `Best sell ${bestSell ?? '-'}p | Best buy ${bestBuy ?? '-'}p${spread !== null ? ` | Spread ${spread}p` : ''} | ${marketState.activeSource}`;
        if (!sellOrders.length && !buyOrders.length) {
          setMarketStatus('orders fetch ok but parsed 0 sell/buy | check worker payload shape');
        } else {
          setMarketStatus(`orders fetch ok | sell ${sellOrders.length} | buy ${buyOrders.length}`);
        }
        renderFilteredMarketOrders();
      } catch (error) {
        const httpStatus = Number(error?.httpStatus || 0);
        const fetchUrl = error?.fetchUrl || buildMarketProxyUrl(`/api/market/orders/${encodeURIComponent(item?.url_name || '')}`);
        const reason = error?.message === 'Market proxy required'
          ? 'Market proxy required'
          : error?.message?.includes('HTTP') || httpStatus > 0
            ? 'market proxy endpoint or HTTP error'
          : error?.message?.includes('parse error')
            ? 'parse error'
            : 'network/CORS/proxy blocked';
        marketSelectedMeta.textContent = `Unable to load item data: ${reason}. url=${fetchUrl} status=${httpStatus || 'network'}`;
        marketState.sellOrders = [];
        marketState.buyOrders = [];
        renderOrderBook(marketSellOrders, [], 'Order fetch failed.');
        renderOrderBook(marketBuyOrders, [], 'Order fetch failed.');
        renderMarketStats(null);
        setMarketOrdersUpdated(null);
        setMarketStatus(
          reason === 'Market proxy required'
            ? reason
            : `Item failed: ${reason} | url=${fetchUrl} | status=${httpStatus || 'network'}`
        );
        logClientError('market item load', error, { item: item?.url_name || '' });
      }
    }

    async function runMarketSearch() {
      const query = marketItemSearch?.value || '';
      if (!query.trim()) {
        renderMarketResults([], '');
        hideMarketAutocomplete();
        setMarketStatus('Search failed: empty query');
        logClientError('market search input', new Error('Empty query'));
        return;
      }
      try {
        setMarketStatus('Search waiting for catalog...');
        await ensureMarketCatalog();
      } catch (error) {
        renderMarketResults([], query);
        hideMarketAutocomplete();
        setMarketStatus(error?.message === 'Market proxy required' ? 'Market proxy required' : 'Search failed: catalog failed');
        logClientError('market search catalog gate', error, { query });
        return;
      }
      const results = marketMatches(query, 30);
      renderMarketResults(results, query);
      hideMarketAutocomplete();
      if (results[0]) {
        setMarketStatus(`matched item found | ${results[0].item_name}`);
        loadMarketItem(results[0]);
      }
      if (!results.length) {
        marketSelectedMeta.textContent = `No market item matched "${query}".`;
        setMarketStatus('Search failed: empty result');
        logClientError('market search results', new Error('No matches after normalized item-name search'), { query, normalized: marketNorm(query), catalogSize: marketState.catalog.length });
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

      marketItemSearch.addEventListener('input', async () => {
        await ensureMarketCatalog().catch(error => logClientError('market input preload', error));
        if (!marketState.loaded) {
          const query = marketItemSearch.value;
          renderMarketResults([], query);
          hideMarketAutocomplete();
          return;
        }
        const query = marketItemSearch.value;
        renderMarketAutocomplete(marketMatches(query, 8));
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
    if (marketViewSellBtn) marketViewSellBtn.addEventListener('click', () => openMarketModal('sell'));
    if (marketViewBuyBtn) marketViewBuyBtn.addEventListener('click', () => openMarketModal('buy'));
    if (marketRefreshOrdersBtn) {
      marketRefreshOrdersBtn.addEventListener('click', () => {
        if (!marketState.selectedItem) {
          setMarketStatus('Refresh failed: no item selected');
          return;
        }
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
    let codexSuggestionsCache = [];
    let codexActiveTitle = '';
    let codexSearchTimer;

    function codexApiBase() {
      return 'https://wiki.warframe.com/api.php';
    }

    function buildCodexUrl(params) {
      const search = new URLSearchParams({
        format: 'json',
        origin: '*',
        ...params
      });
      return `${codexApiBase()}?${search.toString()}`;
    }

    function codexApiCandidates(url) {
      return [
        { source: 'direct', url },
        { source: 'proxy:corsproxy', url: `https://corsproxy.io/?${encodeURIComponent(url)}` },
        { source: 'proxy:allorigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` }
      ];
    }

    async function fetchCodexJson(url) {
      let lastError = null;
      for (const candidate of codexApiCandidates(url)) {
        try {
          logRequest(`codex ${candidate.source}`, candidate.url);
          const response = await fetch(candidate.url, { headers: { Accept: 'application/json' } });
          logResponse(`codex ${candidate.source}`, response);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          let json;
          try {
            json = await response.json();
          } catch (error) {
            throw new Error(`parse error: ${error.message}`);
          }
          logJson(`codex ${candidate.source}`, json);
          return json;
        } catch (error) {
          console.warn(`[orbiter] codex fetch candidate failed: ${candidate.source}`, error);
          lastError = error;
        }
      }
      throw lastError || new Error('Codex API unavailable');
    }

    function codexPageUrl(title) {
      return `https://wiki.warframe.com/w/${encodeURIComponent((title || '').replace(/\s+/g, '_'))}`;
    }

    function stripHtml(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
    }

    function setCodexState({ title, summary, meta, url, loading = false }) {
      codexTitle.textContent = title || (loading ? 'Loading...' : 'Awaiting query');
      codexSummary.textContent = summary || (loading ? 'Querying official wiki...' : 'Enter a topic and the terminal will search the official wiki, pull the best matching page, and summarize the intro here.');
      codexMeta.textContent = meta || '';
      if (url) {
        codexPageLink.href = url;
        codexPageLink.classList.remove('hidden');
      } else {
        codexPageLink.classList.add('hidden');
      }
    }

    function renderCodexResults(items = []) {
      if (!codexResults) return;
      if (!items.length) {
        codexResults.innerHTML = '<div class="border border-terminal/25 p-3">No matching official wiki pages found yet.</div>';
        return;
      }
      codexResults.innerHTML = items.map(item => `
        <button class="codex-result w-full text-left border border-terminal/25 p-3 hover:bg-terminal hover:text-black" data-title="${(item.title || '').replace(/"/g, '&quot;')}">
          <div class="font-bold">${item.title || 'Untitled'}</div>
          <div class="text-xs opacity-80 mt-1">${item.snippet || 'Open this result in the codex panel.'}</div>
        </button>
      `).join('');
      codexResults.querySelectorAll('.codex-result').forEach(btn => {
        btn.addEventListener('click', () => loadCodexEntry(btn.dataset.title || ''));
      });
    }

    function hideCodexSuggestions() {
      if (codexSuggestions) {
        codexSuggestions.classList.add('hidden');
        codexSuggestions.innerHTML = '';
      }
    }

    function renderCodexSuggestions(items = []) {
      codexSuggestionsCache = items;
      if (!codexSuggestions) return;
      if (!items.length) {
        hideCodexSuggestions();
        return;
      }
      codexSuggestions.innerHTML = items.map(item => `
        <button class="codex-suggestion w-full text-left px-4 py-3 border-b border-terminal/20 last:border-b-0 hover:bg-terminal hover:text-black" data-title="${(item.title || '').replace(/"/g, '&quot;')}">
          <div class="font-bold text-sm">${item.title || 'Untitled'}</div>
          <div class="text-xs opacity-80 mt-1">${item.snippet || 'Official wiki result'}</div>
        </button>
      `).join('');
      codexSuggestions.classList.remove('hidden');
      codexSuggestions.querySelectorAll('.codex-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
          if (codexSearchInput) codexSearchInput.value = btn.dataset.title || '';
          hideCodexSuggestions();
          loadCodexEntry(btn.dataset.title || '');
        });
      });
    }

    async function searchCodexSuggestions(query) {
      const q = (query || '').trim();
      if (!q) {
        renderCodexResults([]);
        hideCodexSuggestions();
        return [];
      }
      try {
        const url = buildCodexUrl({
          action: 'query',
          list: 'search',
          srsearch: q,
          srlimit: '6'
        });
        const data = await fetchCodexJson(url);
        const items = (data?.query?.search || []).map(entry => ({
          title: entry.title,
          snippet: stripHtml(entry.snippet || '')
        }));
        if (!items.length) {
          console.warn('[orbiter] codex suggestions empty result', { query: q, data });
        }
        renderCodexSuggestions(items);
        renderCodexResults(items);
        return items;
      } catch (error) {
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
      setCodexState({ loading: true });
      hideCodexSuggestions();
      try {
        let title = q;
        const searchUrl = buildCodexUrl({
          action: 'query',
          list: 'search',
          srsearch: q,
          srlimit: '1'
        });
        const searchData = await fetchCodexJson(searchUrl);
        const top = searchData?.query?.search?.[0];
        if (top?.title) {
          title = top.title;
        } else {
          setCodexState({
            title: 'No codex result',
            summary: `No official wiki page matched "${q}". Try a broader term like Orokin, Lotus, Duviri, or Nightwave.`,
            meta: 'SOURCE // EMPTY SEARCH RESULT',
            url: ''
          });
          console.warn('[orbiter] codex entry empty result', { query: q, data: searchData });
          return;
        }

        const summaryUrl = buildCodexUrl({
          action: 'query',
          prop: 'extracts',
          exintro: '1',
          explaintext: '1',
          redirects: '1',
          titles: title
        });
        const summaryData = await fetchCodexJson(summaryUrl);
        const pages = summaryData?.query?.pages || {};
        const pageEntries = Object.entries(pages);
        const [pageId, page] = pageEntries[0] || [];
        if (!page || pageId === '-1' || page.missing || page.invalid) {
          setCodexState({
            title: 'Missing wiki page',
            summary: `The official wiki API found "${title}" in search, but the extracts query returned a missing or invalid page.`,
            meta: 'SOURCE // MISSING PAGE',
            url: ''
          });
          console.warn('[orbiter] codex missing page', { title, pageId, page, data: summaryData });
          return;
        }
        const finalTitle = page.title || title;
        const extract = (page.extract || '').trim();
        codexActiveTitle = finalTitle;
        if (!extract) {
          console.warn('[orbiter] codex summary empty extract', { title: finalTitle, data: summaryData });
        }
        setCodexState({
          title: finalTitle,
          summary: extract || `The official wiki returned the page "${finalTitle}" but did not include an intro extract.`,
          meta: extract ? 'SOURCE // OFFICIAL WARFRAME WIKI INTRO' : 'SOURCE // EMPTY EXTRACT',
          url: codexPageUrl(finalTitle)
        });
      } catch (error) {
        const reason = error?.message?.includes('HTTP')
          ? 'bad endpoint or HTTP error'
          : error?.message?.includes('parse error')
            ? 'parse error'
            : 'network or CORS blocked';
        setCodexState({
          title: 'Lookup failed',
          summary: `Codex lookup failed because of ${reason}. Check the console for the request URL, response status, and parsed JSON details.`,
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
        codexSearchTimer = setTimeout(() => searchCodexSuggestions(q), 220);
      });
      codexSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
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
    if (codexOpenBtn) codexOpenBtn.addEventListener('click', () => {
      const title = (codexActiveTitle || codexSearchInput?.value || '').trim();
      if (!title) {
        logClientError('codex open page', new Error('No title to open'));
        return;
      }
      window.open(codexPageUrl(title), '_blank', 'noopener,noreferrer');
    });
    document.querySelectorAll('.codex-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (codexSearchInput) codexSearchInput.value = chip.dataset.query || '';
        loadCodexEntry(chip.dataset.query || '');
      });
    });


    setupSubtabs();
    document.querySelectorAll('[data-subtabs]').forEach(group => {
      const firstBtn = group.querySelector('.subtab-btn');
      if (firstBtn) firstBtn.click();
    });
