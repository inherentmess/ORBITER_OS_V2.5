const TASKS_STORAGE_KEY = "orbit-companion-tasks";
const GOALS_STORAGE_KEY = "orbit-companion-goals";
const FOUNDRY_STORAGE_KEY = "orbit-companion-foundry";
const NIGHTWAVE_STORAGE_KEY = "orbit-companion-nightwave";
const CYCLE_ORDER_STORAGE_KEY = "orbit-companion-cycle-order";
const MARKET_SEARCH_STORAGE_KEY = "orbit-companion-market-searches";
const BOUNTY_AREA_STORAGE_KEY = "orbit-companion-bounty-area";
const DAILY_RESET_HOUR_UTC = 0;
const BARO_FIRST_KNOWN_ARRIVAL = "2024-11-01T13:00:00Z";
const BARO_VISIT_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;
const BARO_VISIT_DURATION_MS = 48 * 60 * 60 * 1000;
const BROWSE_ORACLE_WORLDSTATE_URL = "https://oracle.browse.wf/worldState.json";
const TENNO_TOOLS_FISSURES_URL = "https://api.tenno.tools/worldstate/pc/fissures";
const TENNO_TOOLS_BOUNTIES_URL = "https://api.tenno.tools/worldstate/pc/bounties";

const worldState = {
  syncedAt: "2026-04-22T15:00:00-07:00",
  staticCycles: [
    {
      label: "Earth",
      title: "Cetus / Plains of Eidolon",
      state: "Day",
      expiresAt: "2026-04-22T16:08:00-07:00",
      detail: "Good window for bounties, conservation, and fishing runs."
    },
    {
      label: "Venus",
      title: "Fortuna / Orb Vallis",
      state: "Warm",
      expiresAt: "2026-04-22T15:37:00-07:00",
      detail: "Shorter cycle. Catch mining loops or Toroid routes between alerts."
    },
    {
      label: "Deimos",
      title: "Cambion Drift",
      state: "Vome",
      expiresAt: "2026-04-22T16:22:00-07:00",
      detail: "Check isolation vault timing before committing a squad."
    }
  ],
  alerts: [
    {
      title: "Steel Path Incursions ready",
      copy: "Five missions are available now. Knock them out early for steady Steel Essence.",
      tag: "High value"
    },
    {
      title: "Nightwave catch-up is open",
      copy: "You still have enough room to clear two elite acts before the weekly rollover.",
      tag: "Weekly"
    },
    {
      title: "Sortie modifier favors status builds",
      copy: "Bring viral or heat for faster clears and keep your archon shard slot flexible.",
      tag: "Build tip"
    }
  ],
  operations: [
    {
      label: "Sortie",
      title: "Three-stage daily sortie",
      status: "Ready",
      expiresAt: "2026-04-23T12:00:00-07:00",
      summary: "Eximus Stronghold, Radiation Hazard, and an assassination finisher are the current rotation.",
      detail: "Bring a durable all-rounder and one status-heavy weapon so you do not need to rebuild between stages."
    },
    {
      label: "Void Fissures",
      title: "Active fissure sweep",
      status: "Hot",
      expiresAt: "2026-04-24T16:05:00-07:00",
      summary: "Regular and Steel Path fissures are both surfaced here so you can pick between speed clears and higher-pressure relic runs.",
      detail: "The Steel Path Axi and Neo entries are the premium picks if you want tougher missions with better endgame pacing than the base-board speed options.",
      entries: [
        {
          title: "Lith Capture",
          meta: "Void | Hepit | Ends in 22m",
          copy: "Fastest option for cracking low-tier relics when you want quick openings.",
          tag: "Quick"
        },
        {
          title: "Meso Survival",
          meta: "Jupiter | Amalthea | Ends in 41m",
          copy: "Good if you want a steadier relic pace and to stack resources while opening relics.",
          tag: "Sustain"
        },
        {
          title: "Neo Defense",
          meta: "Sedna | Hydron | Ends in 36m",
          copy: "Best if you want fissures plus affinity leveling in the same run.",
          tag: "Leveling"
        },
        {
          title: "Axi Disruption",
          meta: "Lua | Apollo | Ends in 53m",
          copy: "Highest-value board slot in this sample set and the one worth planning around.",
          tag: "Top pick"
        },
        {
          title: "Steel Path Neo Survival",
          meta: "Sedna | Selkie | Ends in 34m",
          copy: "A stronger Neo option if you want relic openings plus Steel Essence progress in the same session.",
          tag: "Steel Path"
        },
        {
          title: "Steel Path Axi Exterminate",
          meta: "Veil Proxima | Ends in 46m",
          copy: "Best burst-value Steel Path fissure in this sample board if your squad can clear quickly and stay efficient.",
          tag: "Steel Path"
        }
      ]
    },
    {
      label: "Nightwave",
      title: "Nora's weekly board",
      status: "27,500 standing left",
      expiresAt: "2026-04-27T00:00:00-07:00",
      summary: "Two elite acts and three dailies remain open in this prototype snapshot.",
      detail: "Clearing the elite acts should comfortably finish your next reward tier without grinding filler challenges.",
      entries: [
        {
          id: "nightwave-sortie",
          title: "Elite Weekly: Complete 3 Sortie missions",
          meta: "7,000 standing",
          copy: "You can clear this naturally by finishing the daily sortie before reset.",
          tag: "Elite"
        },
        {
          id: "nightwave-kills",
          title: "Elite Weekly: Kill 1,500 enemies",
          meta: "7,000 standing",
          copy: "Pair this with Survival, Sanctuary Onslaught, or an Archon Hunt chain to finish passively.",
          tag: "Elite"
        },
        {
          id: "nightwave-relics",
          title: "Weekly: Open 10 relics",
          meta: "4,500 standing",
          copy: "This overlaps perfectly with the fissure board, especially if you chain Capture and Disruption.",
          tag: "Weekly"
        },
        {
          id: "nightwave-capture",
          title: "Daily: Complete 1 Capture mission",
          meta: "1,000 standing",
          copy: "A one-minute Hepit run is the cleanest way to clear this.",
          tag: "Daily"
        },
        {
          id: "nightwave-melee",
          title: "Daily: Kill 20 enemies with melee",
          meta: "1,000 standing",
          copy: "This is effectively free in any normal run, so it should not shape your route.",
          tag: "Daily"
        }
      ]
    },
    {
      label: "Archon Hunt",
      title: "Weekly archon target",
      status: "Available",
      expiresAt: "2026-04-26T23:59:00-07:00",
      summary: "Three missions remain, ending in a shard reward with the final confrontation.",
      detail: "Save one of your strongest single-target loadouts here and leave the easier utility clears for later in the week."
    }
  ]
};

const starChartMissions = [
  {
    title: "Capture on Hepit, Void",
    description: "Fast relic farming run. Great if you want a quick objective with low setup time.",
    tag: "Star chart"
  },
  {
    title: "Survival on Gabii, Ceres",
    description: "Solid Orokin Cell farming and a dependable place to stretch a resource booster.",
    tag: "Resources"
  },
  {
    title: "Defense on Hydron, Sedna",
    description: "Classic affinity grinding if you want to level gear while still making mission progress.",
    tag: "Leveling"
  },
  {
    title: "Disruption on Apollo, Lua",
    description: "A strong Axi relic target when you want a mission with a little more payoff.",
    tag: "Relics"
  },
  {
    title: "Survival on Ophelia, Uranus",
    description: "Good if you need polymer bundles and want a mission that scales well with time.",
    tag: "Farm route"
  },
  {
    title: "Excavation on Hieracon, Pluto",
    description: "A steady cryotic mission that also works well for focused farming sessions.",
    tag: "Cryotic"
  },
  {
    title: "Exterminate on Adaro, Sedna",
    description: "A stealth-friendly solo option if you want a calmer run with affinity value.",
    tag: "Solo"
  },
  {
    title: "Dark Sector Defense on Seimeni, Ceres",
    description: "A credit-friendly fallback when you want something simple and dependable.",
    tag: "Credits"
  }
];

const defaultTasks = [
  { id: crypto.randomUUID(), text: "Claim login reward and check Nightwave acts", done: true },
  { id: crypto.randomUUID(), text: "Run Steel Path incursions before reset", done: false },
  { id: crypto.randomUUID(), text: "Refine relics for next Prime farm session", done: false }
];

const defaultGoals = [
  {
    id: crypto.randomUUID(),
    eyebrow: "Farm plan",
    title: "Build a Duviri circuit route",
    copy: "Lock in one frame, one weapon, and one decree preference so your next weekly push starts with less friction.",
    tag: "Preparation"
  },
  {
    id: crypto.randomUUID(),
    eyebrow: "Relic target",
    title: "Chase vaulted parts efficiently",
    copy: "Group relic cracking around fissure tiers you can clear quickly and keep one radiant relic for squad sharing.",
    tag: "Relics"
  },
  {
    id: crypto.randomUUID(),
    eyebrow: "Resource sweep",
    title: "Do a fifteen-minute standing run",
    copy: "A compact route through bounties, syndicate pickups, and one reputation dump keeps daily caps from piling up.",
    tag: "Routine"
  }
];

const foundryCatalog = window.ORBIT_FOUNDRY_CATALOG ?? {
  forma: {
    name: "Forma",
    buildHours: 23,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Forma"
  },
  "orokin catalyst": {
    name: "Orokin Catalyst",
    buildHours: 23,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Orokin_Catalyst"
  },
  "orokin reactor": {
    name: "Orokin Reactor",
    buildHours: 23,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Orokin_Reactor"
  },
  excalibur: {
    name: "Excalibur",
    buildHours: 72,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Excalibur"
  },
  "excalibur neuroptics": {
    name: "Excalibur Neuroptics",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Excalibur"
  },
  "excalibur chassis": {
    name: "Excalibur Chassis",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Excalibur"
  },
  "excalibur systems": {
    name: "Excalibur Systems",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Excalibur"
  },
  rhino: {
    name: "Rhino",
    buildHours: 24,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Rhino"
  },
  "rhino neuroptics": {
    name: "Rhino Neuroptics",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Rhino"
  },
  "rhino chassis": {
    name: "Rhino Chassis",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Rhino"
  },
  "rhino systems": {
    name: "Rhino Systems",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Rhino"
  },
  volt: {
    name: "Volt",
    buildHours: 72,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Volt/Main"
  },
  "volt neuroptics": {
    name: "Volt Neuroptics",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Volt/Main"
  },
  "volt chassis": {
    name: "Volt Chassis",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Volt/Main"
  },
  "volt systems": {
    name: "Volt Systems",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Volt/Main"
  },
  wukong: {
    name: "Wukong",
    buildHours: 72,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Wukong"
  },
  "wukong neuroptics": {
    name: "Wukong Neuroptics",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Wukong"
  },
  "wukong chassis": {
    name: "Wukong Chassis",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Wukong"
  },
  "wukong systems": {
    name: "Wukong Systems",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Wukong"
  },
  paris: {
    name: "Paris",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Paris"
  },
  hek: {
    name: "Hek",
    buildHours: 24,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Hek"
  },
  nikana: {
    name: "Nikana",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://warframe.fandom.com/wiki/Nikana"
  }
};

const validWarframeNames = window.ORBIT_VALID_FOUNDRY_NAMES ?? [
  "Ash",
  "Atlas",
  "Banshee",
  "Baruuk",
  "Caliban",
  "Chroma",
  "Citrine",
  "Cyte-09",
  "Dagath",
  "Dante",
  "Ember",
  "Equinox",
  "Excalibur",
  "Frost",
  "Gara",
  "Garuda",
  "Gauss",
  "Grendel",
  "Gyre",
  "Harrow",
  "Hildryn",
  "Hydroid",
  "Inaros",
  "Ivara",
  "Jade",
  "Khora",
  "Koumei",
  "Kullervo",
  "Lavos",
  "Limbo",
  "Loki",
  "Mag",
  "Mesa",
  "Mirage",
  "Nekros",
  "Nezha",
  "Nidus",
  "Nova",
  "Nyx",
  "Oberon",
  "Octavia",
  "Oraxia",
  "Protea",
  "Qorvex",
  "Revenant",
  "Rhino",
  "Saryn",
  "Sevagoth",
  "Styanax",
  "Temple",
  "Titania",
  "Trinity",
  "Valkyr",
  "Vauban",
  "Volt",
  "Voruna",
  "Wisp",
  "Wukong",
  "Xaku",
  "Yareli",
  "Zephyr"
];

const verifiedSuggestionNames = [...new Set(Object.values(foundryCatalog).map((entry) => entry.name))];

const foundrySuggestionNames = [...new Set([...verifiedSuggestionNames, ...validWarframeNames])].sort((a, b) =>
  a.localeCompare(b)
);

const marketSuggestions = [
  ...Object.values(foundryCatalog).flatMap((entry) => {
    if (/^\S(?:.*\S)? Prime$/u.test(entry.name)) {
      const setLabel = `${entry.name} Set`;
      return [{
        label: setLabel,
        slug: normalizeMarketSlug(setLabel)
      }];
    }

    const primePartMatch = entry.name.match(/^(.* Prime) (Neuroptics|Chassis|Systems)$/u);
    if (primePartMatch) {
      const partLabel = `${entry.name} Blueprint`;
      return [{
        label: partLabel,
        slug: normalizeMarketSlug(partLabel)
      }];
    }

    return [];
  }),
  ...[
    "Arcane Energize",
    "Arcane Grace",
    "Arcane Guardian",
    "Arcane Avenger",
    "Arcane Velocity",
    "Adaptation",
    "Blind Rage",
    "Transient Fortitude",
    "Primed Continuity",
    "Primed Flow",
    "Primed Sure Footed",
    "Rolling Guard",
    "Galvanized Chamber",
    "Galvanized Aptitude",
    "Galvanized Diffusion",
    "Legendary Core",
    "Ayatan Anasa Sculpture",
    "Riven Mod",
    "Aya",
    "Regal Aya",
    "Kuva"
  ].map((label) => ({
    label,
    slug: normalizeMarketSlug(label)
  }))
]
  .filter((suggestion, index, array) =>
    array.findIndex((entry) => entry.label.toLowerCase() === suggestion.label.toLowerCase()) === index
  )
  .sort((a, b) => a.label.localeCompare(b.label));

const guideArchive = {
  warframes: [
    {
      eyebrow: "Starter frame",
      title: "Rhino safety route",
      tag: "Durable",
      copy: "A forgiving path for clearing new nodes, sorties, and early Steel Path prep without fragile builds.",
      steps: ["Farm Jackal on Venus for parts", "Build Iron Skin strength first", "Pair Roar with any reliable weapon"]
    },
    {
      eyebrow: "Support frame",
      title: "Wisp squad value",
      tag: "Utility",
      copy: "Great when you want one frame that improves speed, survivability, and objective defense.",
      steps: ["Drop motes before objectives", "Use Breach Surge for crowd control", "Bring duration for smoother rotations"]
    },
    {
      eyebrow: "Farming frame",
      title: "Nekros resource loop",
      tag: "Farm",
      copy: "A simple resource plan for survival missions, Orokin Cell routes, and long booster sessions.",
      steps: ["Keep Desecrate active", "Favor slash-heavy weapons", "Run dark sectors when resources matter"]
    }
  ],
  weapons: [
    {
      eyebrow: "Primary",
      title: "Hek progression plan",
      tag: "Reliable",
      copy: "A clean early-to-mid game shotgun path that carries star-chart clears with minimal complexity.",
      steps: ["Prioritize damage and multishot", "Add elemental mods for faction needs", "Upgrade to Vaykor Hek later"]
    },
    {
      eyebrow: "Melee",
      title: "Nikana crit setup",
      tag: "Blade",
      copy: "A focused melee route for players who want smooth single-target and hallway-clearing pressure.",
      steps: ["Build crit chance and crit damage", "Add viral or corrosive as needed", "Use stance polarity to save capacity"]
    },
    {
      eyebrow: "Market target",
      title: "Prime set shopping",
      tag: "Trade",
      copy: "Use the market card below to price-check sets before you spend relic time or platinum.",
      steps: ["Search exact set names", "Compare full set vs individual parts", "Check recent listing volume"]
    }
  ],
  missions: [
    {
      eyebrow: "Relics",
      title: "Capture fissure sprint",
      tag: "Fast",
      copy: "The simplest relic-opening loop when speed matters more than extra resource side value.",
      steps: ["Favor Capture or Exterminate", "Equip the exact relic tier", "Extract as soon as reactant hits ten"]
    },
    {
      eyebrow: "Resources",
      title: "Survival booster block",
      tag: "Sustain",
      copy: "A practical fifteen-minute route for stacking resources, affinity, and Nightwave kills together.",
      steps: ["Bring Nekros or Khora if available", "Stay near life support", "Leave after C rotation if rewards stall"]
    },
    {
      eyebrow: "Standing",
      title: "Bounty board scan",
      tag: "Daily",
      copy: "Use the live bounty section to choose the standing area that overlaps with your current goals.",
      steps: ["Pick a standing area", "Check reward pools before queueing", "Stop when daily cap is near"]
    }
  ]
};

const defaultFoundryItems = [
  createFoundryItemFromName("Forma"),
  createFoundryItemFromName("Orokin Catalyst"),
  createFoundryItem("Nautilus Prime Systems", 12)
];

const state = {
  tasks: loadStoredList(TASKS_STORAGE_KEY, defaultTasks),
  goals: loadStoredList(GOALS_STORAGE_KEY, defaultGoals),
  foundry: loadStoredList(FOUNDRY_STORAGE_KEY, defaultFoundryItems),
  nightwaveCompleted: loadStoredSet(NIGHTWAVE_STORAGE_KEY),
  cycleOrder: loadStoredList(CYCLE_ORDER_STORAGE_KEY, []),
  draggingCycleLabel: null,
  marketSearches: loadStoredList(MARKET_SEARCH_STORAGE_KEY, []),
  marketLookup: null,
  marketAutocomplete: [],
  marketAutocompleteIndex: -1,
  activeGuideCategory: "warframes",
  openWorldCyclesFetchedAt: 0,
  fissuresFetchedAt: 0,
  bounties: [],
  bountyArea: loadStoredValue(BOUNTY_AREA_STORAGE_KEY, "all"),
  manualSuggestion: null,
  detailView: null
};

const refs = {
  cycleGrid: document.querySelector("#cycleGrid"),
  cycleFeedStatus: document.querySelector("#cycleFeedStatus"),
  cycleFeedMeta: document.querySelector("#cycleFeedMeta"),
  alertsList: document.querySelector("#alertsList"),
  guideGrid: document.querySelector("#guideGrid"),
  guideTabs: document.querySelectorAll(".guide-tab"),
  goalsGrid: document.querySelector("#goalsGrid"),
  foundryList: document.querySelector("#foundryList"),
  operationsGrid: document.querySelector("#operationsGrid"),
  detailOverlay: document.querySelector("#detailOverlay"),
  detailEyebrow: document.querySelector("#detailEyebrow"),
  detailTitle: document.querySelector("#detailTitle"),
  detailSummary: document.querySelector("#detailSummary"),
  detailMeta: document.querySelector("#detailMeta"),
  detailList: document.querySelector("#detailList"),
  detailCloseButton: document.querySelector("#detailCloseButton"),
  focusTitle: document.querySelector("#focusTitle"),
  focusDescription: document.querySelector("#focusDescription"),
  focusTag: document.querySelector("#focusTag"),
  lastUpdated: document.querySelector("#lastUpdated"),
  refreshButton: document.querySelector("#refreshButton"),
  focusButton: document.querySelector("#focusButton"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskList: document.querySelector("#taskList"),
  goalForm: document.querySelector("#goalForm"),
  goalTitleInput: document.querySelector("#goalTitleInput"),
  goalDetailInput: document.querySelector("#goalDetailInput"),
  goalTagInput: document.querySelector("#goalTagInput"),
  foundryForm: document.querySelector("#foundryForm"),
  foundryNameInput: document.querySelector("#foundryNameInput"),
  foundryHoursInput: document.querySelector("#foundryHoursInput"),
  foundrySuggestions: document.querySelector("#foundrySuggestions"),
  foundryStatus: document.querySelector("#foundryStatus"),
  marketForm: document.querySelector("#marketForm"),
  marketInput: document.querySelector("#marketInput"),
  marketAutocomplete: document.querySelector("#marketAutocomplete"),
  marketStatus: document.querySelector("#marketStatus"),
  marketResult: document.querySelector("#marketResult"),
  marketResultTitle: document.querySelector(".market-result__title"),
  marketResultMeta: document.querySelector(".market-result__meta"),
  marketOpenLink: document.querySelector("#marketOpenLink"),
  marketHistory: document.querySelector("#marketHistory"),
  bountyAreaSelect: document.querySelector("#bountyAreaSelect"),
  bountyStatus: document.querySelector("#bountyStatus"),
  bountyGrid: document.querySelector("#bountyGrid"),
  templates: {
    cycle: document.querySelector("#cycleCardTemplate"),
    alert: document.querySelector("#alertItemTemplate"),
    task: document.querySelector("#taskItemTemplate"),
    goal: document.querySelector("#goalCardTemplate"),
    guide: document.querySelector("#guideCardTemplate"),
    operation: document.querySelector("#operationCardTemplate"),
    foundryItem: document.querySelector("#foundryItemTemplate"),
    detailItem: document.querySelector("#detailItemTemplate")
  }
};

function loadStoredList(key, fallback) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function loadStoredValue(key, fallback) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ?? fallback;
  } catch {
    return fallback;
  }
}

function loadStoredSet(key) {
  try {
    const saved = window.localStorage.getItem(key);
    return new Set(saved ? JSON.parse(saved) : []);
  } catch {
    return new Set();
  }
}

function saveTasks() {
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(state.tasks));
}

function saveGoals() {
  window.localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(state.goals));
}

function saveFoundry() {
  window.localStorage.setItem(FOUNDRY_STORAGE_KEY, JSON.stringify(state.foundry));
}

function saveNightwave() {
  window.localStorage.setItem(NIGHTWAVE_STORAGE_KEY, JSON.stringify([...state.nightwaveCompleted]));
}

function saveCycleOrder() {
  window.localStorage.setItem(CYCLE_ORDER_STORAGE_KEY, JSON.stringify(state.cycleOrder));
}

function saveMarketSearches() {
  window.localStorage.setItem(MARKET_SEARCH_STORAGE_KEY, JSON.stringify(state.marketSearches));
}

function saveBountyArea() {
  window.localStorage.setItem(BOUNTY_AREA_STORAGE_KEY, state.bountyArea);
}

function lookupFoundryItem(name) {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/\s+blueprint$/u, "")
    .replace(/\s+/gu, " ");

  return foundryCatalog[normalizedName] ?? null;
}

function isOfficiallyKnownFoundryName(name) {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/\s+blueprint$/u, "")
    .replace(/\s+/gu, " ");

  return validWarframeNames.some((entry) => entry.toLowerCase() === normalizedName)
    || Object.prototype.hasOwnProperty.call(foundryCatalog, normalizedName);
}

function renderFoundrySuggestions() {
  refs.foundrySuggestions.replaceChildren();

  foundrySuggestionNames.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    refs.foundrySuggestions.append(option);
  });
}

function updateFoundryStatus() {
  const name = refs.foundryNameInput.value.trim();
  if (!name) {
    refs.foundryHoursInput.value = "";
    refs.foundryStatus.textContent = "Type or pick a name. Verified matches auto-fill from the official Warframe Wiki catalog in this app.";
    return;
  }

  const matchedItem = lookupFoundryItem(name);
  if (matchedItem) {
    refs.foundryHoursInput.value = String(matchedItem.buildHours);
    refs.foundryStatus.textContent = `${matchedItem.name} is verified in the official wiki-backed catalog. Craft time will auto-fill to ${formatBuildLength(matchedItem.buildHours)}.`;
    return;
  }

  if (isOfficiallyKnownFoundryName(name)) {
    refs.foundryHoursInput.value = "";
    refs.foundryStatus.textContent = `${name} is a recognized official name from the Warframe Wiki list, but this local build does not yet have a verified craft time stored for it. Add hours manually to track it.`;
    return;
  }

  refs.foundryHoursInput.value = "";
  refs.foundryStatus.textContent = `${name} is not in the current official-name catalog loaded into this prototype. You can still track it by entering custom hours.`;
}

function createFoundryItem(name, buildHours) {
  const completeAt = new Date(Date.now() + buildHours * 60 * 60 * 1000).toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    buildHours,
    done: false,
    startedAt: new Date().toISOString(),
    completeAt,
    sourceLabel: "Custom time",
    sourceUrl: ""
  };
}

function createFoundryItemFromName(name, fallbackHours = 0) {
  const match = lookupFoundryItem(name);
  const buildHours = match?.buildHours ?? fallbackHours;
  const completeAt = new Date(Date.now() + buildHours * 60 * 60 * 1000).toISOString();

  return {
    id: crypto.randomUUID(),
    name: match?.name ?? name,
    buildHours,
    done: false,
    startedAt: new Date().toISOString(),
    completeAt,
    sourceLabel: match?.sourceLabel ?? "Custom time",
    sourceUrl: match?.sourceUrl ?? ""
  };
}

function getNextDailyResetIso(now = new Date()) {
  const nextReset = new Date(now);
  nextReset.setUTCHours(DAILY_RESET_HOUR_UTC, 0, 0, 0);

  if (nextReset.getTime() <= now.getTime()) {
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  }

  return nextReset.toISOString();
}

function getBaroCycle(now = new Date()) {
  const currentTime = now.getTime();
  const anchorTime = new Date(BARO_FIRST_KNOWN_ARRIVAL).getTime();

  if (currentTime < anchorTime) {
    return {
      state: "Arrives soon",
      expiresAt: new Date(anchorTime).toISOString(),
      detail: "Baro Ki'Teer appears every two weeks for a 48-hour trading window. Stock Ducats before he docks."
    };
  }

  const completedCycles = Math.floor((currentTime - anchorTime) / BARO_VISIT_INTERVAL_MS);
  const activeCycleStart = anchorTime + completedCycles * BARO_VISIT_INTERVAL_MS;
  const activeCycleEnd = activeCycleStart + BARO_VISIT_DURATION_MS;

  if (currentTime < activeCycleEnd) {
    return {
      state: "Here now",
      expiresAt: new Date(activeCycleEnd).toISOString(),
      detail: "Baro Ki'Teer is currently active. Use the timer as the remaining shop window before he leaves the relay."
    };
  }

  return {
    state: "Arrives soon",
    expiresAt: new Date(activeCycleStart + BARO_VISIT_INTERVAL_MS).toISOString(),
    detail: "Baro Ki'Teer returns on his two-week cadence and stays for 48 hours once he arrives."
  };
}

function toTitleCase(value) {
  return value.replace(/\b\w/gu, (character) => character.toUpperCase());
}

function normalizeCycleState(label, payload) {
  if (label === "Earth") {
    return payload.isDay ? "Day" : "Night";
  }

  if (label === "Venus") {
    if (typeof payload.isWarm === "boolean") {
      return payload.isWarm ? "Warm" : "Cold";
    }

    return toTitleCase(payload.state ?? "Warm");
  }

  if (label === "Deimos") {
    return toTitleCase(payload.active ?? payload.state ?? "Vome");
  }

  return toTitleCase(payload.state ?? "Unknown");
}

function updateStaticCycle(label, payload) {
  const targetCycle = worldState.staticCycles.find((cycle) => cycle.label === label);
  if (!targetCycle || !payload?.expiry) {
    return;
  }

  targetCycle.state = normalizeCycleState(label, payload);
  targetCycle.expiresAt = new Date(payload.expiry).toISOString();
}

async function fetchOpenWorldCycles() {
  try {
    const response = await fetch(BROWSE_ORACLE_WORLDSTATE_URL);
    if (!response.ok) {
      throw new Error(`browse.wf oracle returned ${response.status}`);
    }
    await response.json();
  } catch (error) {
    console.error("Failed to fetch browse.wf oracle cycle source", error);
    renderCycleFeedStatus();
    return;
  }

  state.openWorldCyclesFetchedAt = Date.now();
  renderCycles();
  renderFocus();
}

function getCycles() {
  const baroCycle = getBaroCycle();

  const cycles = [
    ...worldState.staticCycles,
    {
      label: "Reset",
      title: "Daily Reset",
      state: "00:00 UTC",
      expiresAt: getNextDailyResetIso(),
      detail: "Tracks the next Warframe daily server reset for tribute, Steel Path incursions, standing caps, and other daily refreshes."
    },
    {
      label: "Trader",
      title: "Baro Ki'Teer / Void Trader",
      state: baroCycle.state,
      expiresAt: baroCycle.expiresAt,
      detail: baroCycle.detail
    }
  ];

  return sortCycles(cycles);
}

function sortCycles(cycles) {
  const knownLabels = cycles.map((cycle) => cycle.label);
  const savedOrder = state.cycleOrder.filter((label) => knownLabels.includes(label));
  const missingLabels = knownLabels.filter((label) => !savedOrder.includes(label));
  const orderedLabels = [...savedOrder, ...missingLabels];

  if (orderedLabels.length !== state.cycleOrder.length || missingLabels.length > 0) {
    state.cycleOrder = orderedLabels;
    saveCycleOrder();
  }

  const orderMap = new Map(orderedLabels.map((label, index) => [label, index]));
  return [...cycles].sort((a, b) => (orderMap.get(a.label) ?? 0) - (orderMap.get(b.label) ?? 0));
}

function moveCycleBefore(draggedLabel, targetLabel) {
  if (!draggedLabel || !targetLabel || draggedLabel === targetLabel) {
    return;
  }

  const nextOrder = [...state.cycleOrder];
  const draggedIndex = nextOrder.indexOf(draggedLabel);
  const targetIndex = nextOrder.indexOf(targetLabel);

  if (draggedIndex === -1 || targetIndex === -1) {
    return;
  }

  nextOrder.splice(draggedIndex, 1);
  const insertIndex = nextOrder.indexOf(targetLabel);
  nextOrder.splice(insertIndex, 0, draggedLabel);

  state.cycleOrder = nextOrder;
  saveCycleOrder();
}

function getNightwaveOperation() {
  return worldState.operations.find((operation) => operation.label === "Nightwave") ?? null;
}

function normalizeMarketSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’.]/gu, "")
    .replace(/\+/gu, " plus ")
    .replace(/&/gu, " and ")
    .replace(/[^a-z0-9\s-]/gu, " ")
    .replace(/\s+/gu, "_")
    .replace(/_+/gu, "_")
    .replace(/^_+|_+$/gu, "");
}

function buildMarketLookup(name) {
  const cleanName = name.trim();
  const slug = normalizeMarketSlug(cleanName);
  if (!slug) {
    return null;
  }

  return {
    name: cleanName,
    slug,
    url: `https://warframe.market/items/${slug}`
  };
}

function buildMarketLookupFromSuggestion(suggestion) {
  if (!suggestion?.label || !suggestion?.slug) {
    return null;
  }

  return {
    name: suggestion.label,
    slug: suggestion.slug,
    url: `https://warframe.market/items/${suggestion.slug}`
  };
}

function getBountyAreaLabel(syndicate) {
  const areaLabels = {
    Ostron: "Cetus / Plains of Eidolon",
    "Solaris United": "Fortuna / Orb Vallis",
    Entrati: "Necralisk / Cambion Drift",
    Holdfasts: "Zariman",
    Cavia: "Sanctum Anatomica"
  };

  return areaLabels[syndicate] ?? syndicate;
}

function getSortedBountyBoards() {
  return [...state.bounties].sort((a, b) => {
    const labelCompare = getBountyAreaLabel(a.syndicate).localeCompare(getBountyAreaLabel(b.syndicate));
    if (labelCompare !== 0) {
      return labelCompare;
    }

    return new Date(a.end) - new Date(b.end);
  });
}

function getSelectedBountyBoards() {
  if (state.bountyArea === "all") {
    return getSortedBountyBoards();
  }

  return getSortedBountyBoards().filter((board) => board.syndicate === state.bountyArea);
}

function formatRewardChance(chance) {
  return `${(chance * 100).toFixed(chance >= 0.1 ? 1 : 2)}%`;
}

function renderBountyAreaOptions() {
  refs.bountyAreaSelect.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All standing areas";
  refs.bountyAreaSelect.append(allOption);

  getSortedBountyBoards().forEach((board) => {
    const option = document.createElement("option");
    option.value = board.syndicate;
    option.textContent = getBountyAreaLabel(board.syndicate);
    refs.bountyAreaSelect.append(option);
  });

  const currentValues = new Set(["all", ...state.bounties.map((board) => board.syndicate)]);
  if (!currentValues.has(state.bountyArea)) {
    state.bountyArea = "all";
    saveBountyArea();
  }

  refs.bountyAreaSelect.value = state.bountyArea;
}

function renderBounties() {
  refs.bountyGrid.replaceChildren();

  if (!state.bounties.length) {
    refs.bountyStatus.textContent = "Loading bounty board from Tenno Tools...";
    return;
  }

  const boards = getSelectedBountyBoards();
  if (!boards.length) {
    refs.bountyStatus.textContent = "No live bounty board matched that standing area.";
    return;
  }

  const totalJobs = boards.reduce((sum, board) => sum + board.jobs.length, 0);
  refs.bountyStatus.textContent = `${totalJobs} live bounty job${totalJobs === 1 ? "" : "s"} across ${boards.length} standing area${boards.length === 1 ? "" : "s"}. Reward chances are pulled from Tenno Tools.`;

  boards.forEach((board) => {
    const boardNode = document.createElement("article");
    boardNode.className = "bounty-board";

    const header = document.createElement("div");
    header.className = "bounty-board__header";

    const headingGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "cycle-card__label";
    eyebrow.textContent = board.syndicate;
    const title = document.createElement("h3");
    title.textContent = getBountyAreaLabel(board.syndicate);
    headingGroup.append(eyebrow, title);

    const expires = document.createElement("span");
    expires.className = "pill";
    expires.textContent = `Refresh ${formatTimeRemaining(board.end)}`;
    header.append(headingGroup, expires);
    boardNode.append(header);

    const jobsGrid = document.createElement("div");
    jobsGrid.className = "bounty-board__jobs";

    board.jobs.forEach((job) => {
      const jobNode = document.createElement("article");
      jobNode.className = "bounty-job";

      const jobTop = document.createElement("div");
      jobTop.className = "bounty-job__top";

      const jobHeading = document.createElement("div");
      const jobTitle = document.createElement("h4");
      jobTitle.className = "bounty-job__title";
      jobTitle.textContent = job.title;
      const jobMeta = document.createElement("p");
      jobMeta.className = "bounty-job__meta";
      jobMeta.textContent = `Levels ${job.minLevel}-${job.maxLevel} | Rotation ${job.rotation ?? "?"} | Standing ${job.xpAmounts?.join(", ") ?? "Unknown"}`;
      jobHeading.append(jobTitle, jobMeta);

      const stagePill = document.createElement("span");
      stagePill.className = "pill";
      stagePill.textContent = `${job.rewards.length} reward group${job.rewards.length === 1 ? "" : "s"}`;

      jobTop.append(jobHeading, stagePill);
      jobNode.append(jobTop);

      const rewardsList = document.createElement("div");
      rewardsList.className = "reward-list";

      job.rewards.forEach((rewardGroup, rewardGroupIndex) => {
        const rewardGroupNode = document.createElement("section");
        rewardGroupNode.className = "reward-group";

        const rewardGroupTitle = document.createElement("p");
        rewardGroupTitle.className = "reward-group__title";
        rewardGroupTitle.textContent = `Reward group ${rewardGroupIndex + 1}`;
        rewardGroupNode.append(rewardGroupTitle);

        const rewardGroupItems = document.createElement("div");
        rewardGroupItems.className = "reward-group__items";

        rewardGroup.forEach((reward) => {
          const rewardNode = document.createElement("div");
          rewardNode.className = "reward-pill";

          const rewardName = document.createElement("span");
          rewardName.className = "reward-pill__name";
          rewardName.textContent = reward.name;

          const rewardChance = document.createElement("span");
          rewardChance.className = "reward-pill__chance";
          rewardChance.textContent = formatRewardChance(reward.chance);

          rewardNode.append(rewardName, rewardChance);
          rewardGroupItems.append(rewardNode);
        });

        rewardGroupNode.append(rewardGroupItems);
        rewardsList.append(rewardGroupNode);
      });

      jobNode.append(rewardsList);
      jobsGrid.append(jobNode);
    });

    boardNode.append(jobsGrid);
    refs.bountyGrid.append(boardNode);
  });
}

function getVoidFissuresOperation() {
  return worldState.operations.find((operation) => operation.label === "Void Fissures") ?? null;
}

function isVoidStormFissure(fissure) {
  return /proxima/iu.test(fissure.location ?? "");
}

function isSteelPathFissure(fissure) {
  return Boolean(
    fissure.steelPath
      ?? fissure.steelpath
      ?? fissure.isSteelPath
      ?? fissure.isHard
      ?? fissure.hard
      ?? fissure.hardMode
  );
}

function formatFissureLocation(location) {
  return location.replace(/\//gu, " | ");
}

function buildFissureEntry(fissure) {
  const expiresAt = new Date(fissure.end * 1000).toISOString();
  const voidStorm = isVoidStormFissure(fissure);
  const steelPath = isSteelPathFissure(fissure);
  const tier = fissure.tier ?? "Relic";
  const missionType = fissure.missionType ?? "Mission";
  const location = fissure.location ?? "Unknown node";

  let title = `${tier} ${missionType}`;
  if (voidStorm) {
    title = `${tier} Void Storm`;
  }
  if (steelPath) {
    title = `Steel Path ${title}`;
  }

  const tag = steelPath && voidStorm
    ? "SP Storm"
    : steelPath
      ? "Steel Path"
      : voidStorm
        ? "Void Storm"
        : tier;

  const copy = voidStorm
    ? steelPath
      ? "Railjack relic opening with Steel Path pressure and a tougher pace than the standard fissure board."
      : "Railjack relic opening that lets you work Void Storm rewards into your relic route."
    : steelPath
      ? "Steel Path fissure that layers relic cracking with tougher enemies and Steel Essence progress."
      : "Standard fissure slot for quick relic openings without the Railjack or Steel Path overhead.";

  return {
    id: fissure.id,
    title,
    meta: `${formatFissureLocation(location)} | Ends ${formatTimeRemaining(expiresAt)}`,
    copy,
    tag,
    expiresAt
  };
}

function updateVoidFissuresOperation(entries) {
  const voidFissuresOperation = getVoidFissuresOperation();
  if (!voidFissuresOperation || !entries.length) {
    return;
  }

  const sortedEntries = [...entries].sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
  const steelPathCount = sortedEntries.filter((entry) => entry.tag === "Steel Path" || entry.tag === "SP Storm").length;
  const voidStormCount = sortedEntries.filter((entry) => entry.tag === "Void Storm" || entry.tag === "SP Storm").length;

  voidFissuresOperation.status = `${sortedEntries.length} live`;
  voidFissuresOperation.expiresAt = sortedEntries[0].expiresAt;
  voidFissuresOperation.summary = `${sortedEntries.length} fissures live from Tenno Tools, including ${steelPathCount} Steel Path mission${steelPathCount === 1 ? "" : "s"} and ${voidStormCount} Void Storm${voidStormCount === 1 ? "" : "s"}.`;
  voidFissuresOperation.detail = "This board now comes from Tenno Tools live worldstate data and mixes standard fissures, Steel Path fissures, and Railjack Void Storms into one relay-style view.";
  voidFissuresOperation.entries = sortedEntries.map((entry) => ({
    title: entry.title,
    meta: entry.meta,
    copy: entry.copy,
    tag: entry.tag
  }));
}

async function fetchVoidFissures() {
  try {
    const response = await fetch(TENNO_TOOLS_FISSURES_URL);
    if (!response.ok) {
      throw new Error(`Tenno Tools returned ${response.status}`);
    }

    const payload = await response.json();
    const fissures = payload?.fissures?.data ?? [];
    const entries = fissures.map(buildFissureEntry);

    if (!entries.length) {
      return;
    }

    updateVoidFissuresOperation(entries);
    state.fissuresFetchedAt = Date.now();
    renderOperations();
    renderActiveDetailView();
  } catch (error) {
    console.error("Failed to fetch Tenno Tools fissures", error);
  }
}

async function fetchBounties() {
  try {
    const response = await fetch(TENNO_TOOLS_BOUNTIES_URL);
    if (!response.ok) {
      throw new Error(`Tenno Tools returned ${response.status}`);
    }

    const payload = await response.json();
    state.bounties = (payload?.bounties?.data ?? []).map((board) => ({
      ...board,
      end: new Date(board.end * 1000).toISOString()
    }));

    renderBountyAreaOptions();
    renderBounties();
  } catch (error) {
    console.error("Failed to fetch Tenno Tools bounties", error);
    refs.bountyStatus.textContent = "Unable to load Tenno Tools bounty data right now.";
  }
}

function rememberMarketSearch(name) {
  const cleanName = name.trim();
  if (!cleanName) {
    return;
  }

  state.marketSearches = [
    cleanName,
    ...state.marketSearches.filter((entry) => entry.toLowerCase() !== cleanName.toLowerCase())
  ].slice(0, 8);
  saveMarketSearches();
}

function getMarketAutocompleteMatches(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const startsWithMatches = marketSuggestions.filter((suggestion) =>
    suggestion.label.toLowerCase().startsWith(normalizedQuery)
  );
  const includesMatches = marketSuggestions.filter((suggestion) =>
    !suggestion.label.toLowerCase().startsWith(normalizedQuery)
      && suggestion.label.toLowerCase().includes(normalizedQuery)
  );

  return [...startsWithMatches, ...includesMatches].slice(0, 8);
}

function hideMarketAutocomplete() {
  state.marketAutocomplete = [];
  state.marketAutocompleteIndex = -1;
  refs.marketAutocomplete.hidden = true;
  refs.marketAutocomplete.replaceChildren();
}

function renderMarketAutocomplete() {
  refs.marketAutocomplete.replaceChildren();

  if (!state.marketAutocomplete.length) {
    refs.marketAutocomplete.hidden = true;
    return;
  }

  state.marketAutocomplete.forEach((suggestion, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "autocomplete-option";

    if (index === state.marketAutocompleteIndex) {
      button.classList.add("autocomplete-option--active");
    }

    button.textContent = suggestion.label;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectMarketSuggestion(suggestion);
    });
    refs.marketAutocomplete.append(button);
  });

  refs.marketAutocomplete.hidden = false;
}

function updateMarketAutocomplete(query) {
  state.marketAutocomplete = getMarketAutocompleteMatches(query);
  state.marketAutocompleteIndex = state.marketAutocomplete.length ? 0 : -1;
  renderMarketAutocomplete();
}

function selectMarketSuggestion(selection, { submit = false } = {}) {
  const suggestion = typeof selection === "string"
    ? { label: selection, slug: normalizeMarketSlug(selection) }
    : selection;

  refs.marketInput.value = suggestion.label;
  state.marketLookup = buildMarketLookupFromSuggestion(suggestion);
  renderMarketLookup();
  hideMarketAutocomplete();

  if (submit) {
    rememberMarketSearch(suggestion.label);
    renderMarketHistory();
  }
}

function parseStandingValue(meta) {
  const match = meta.match(/([\d,]+)/u);
  return match ? Number.parseInt(match[1].replace(/,/gu, ""), 10) : 0;
}

function getNightwaveProgress(operation = getNightwaveOperation()) {
  const entries = operation?.entries ?? [];
  const completedEntries = entries.filter((entry) => state.nightwaveCompleted.has(entry.id));
  const earnedStanding = completedEntries.reduce((total, entry) => total + parseStandingValue(entry.meta), 0);

  return {
    total: entries.length,
    completed: completedEntries.length,
    remaining: Math.max(entries.length - completedEntries.length, 0),
    earnedStanding
  };
}

function getOperationStatus(operation) {
  if (operation.label !== "Nightwave") {
    return operation.status;
  }

  const progress = getNightwaveProgress(operation);
  return `${progress.remaining} act${progress.remaining === 1 ? "" : "s"} left`;
}

function getCycleTimerLabel(cycle) {
  const timedCycleLabels = new Set(["Earth", "Venus", "Deimos"]);

  if (!timedCycleLabels.has(cycle.label)) {
    return formatTimeRemaining(cycle.expiresAt);
  }

  return `${cycle.state} ends in ${formatTimeRemaining(cycle.expiresAt)}`;
}

function formatTimeRemaining(expiresAt) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) {
    return "Ready now";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    if (hours > 0) {
      return `${days}d ${hours}h ${minutes}m left`;
    }

    return `${days}d ${minutes}m ${seconds}s left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s left`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s left`;
  }

  return `${seconds}s left`;
}

function formatBuildLength(hours) {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0 && remainingHours > 0) {
    return `${days}d ${remainingHours}h build`;
  }

  if (days > 0) {
    return `${days}d build`;
  }

  return `${hours}h build`;
}

function formatSyncTime(isoString) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(isoString));
}

function formatRelativeSyncAge(timestamp) {
  if (!timestamp) {
    return "Waiting for browse.wf cycle data...";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 10) {
    return "Live cycle data synced just now";
  }

  if (diffSeconds < 60) {
    return `Live cycle data synced ${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  return `Live cycle data synced ${diffMinutes}m ago`;
}

function renderCycleFeedStatus() {
  const lastFetch = state.openWorldCyclesFetchedAt;
  const ageMs = lastFetch ? Date.now() - lastFetch : Number.POSITIVE_INFINITY;

  refs.cycleFeedStatus.classList.remove("pill--ok", "pill--warn", "pill--muted");

  if (!lastFetch) {
    refs.cycleFeedStatus.textContent = "Syncing";
    refs.cycleFeedStatus.classList.add("pill--muted");
    refs.cycleFeedMeta.textContent = "Waiting for browse.wf cycle data...";
    return;
  }

  if (ageMs < 120000) {
    refs.cycleFeedStatus.textContent = "Live";
    refs.cycleFeedStatus.classList.add("pill--ok");
  } else {
    refs.cycleFeedStatus.textContent = "Stale";
    refs.cycleFeedStatus.classList.add("pill--warn");
  }

  refs.cycleFeedMeta.textContent = formatRelativeSyncAge(lastFetch);
}

function formatAbsoluteTime(isoString) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(isoString));
}

function pickFocus() {
  if (state.manualSuggestion) {
    return state.manualSuggestion;
  }

  const urgentCycle = [...getCycles()]
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))[0];

  const pendingTask = state.tasks.find((task) => !task.done);

  if (pendingTask) {
    return {
      title: pendingTask.text,
      description: `This is your cleanest next action. Pair it with ${urgentCycle.title} while the current ${urgentCycle.state.toLowerCase()} state is live.`,
      tag: "Suggested run"
    };
  }

  return {
    title: `Check ${urgentCycle.title}`,
    description: `The ${urgentCycle.state.toLowerCase()} window closes soon, so this is the best moment to capitalize on it.`,
    tag: "Cycle priority"
  };
}

function renderCycles() {
  if (state.draggingCycleLabel) {
    return;
  }

  renderCycleFeedStatus();
  refs.cycleGrid.replaceChildren();

  getCycles().forEach((cycle) => {
    const node = refs.templates.cycle.content.firstElementChild.cloneNode(true);
    node.draggable = true;
    node.dataset.cycleLabel = cycle.label;
    node.querySelector(".cycle-card__label").textContent = cycle.label;
    node.querySelector(".cycle-card__title").textContent = cycle.title;
    node.querySelector(".pill").textContent = cycle.state;
    node.querySelector(".cycle-card__timer").textContent = getCycleTimerLabel(cycle);
    node.querySelector(".cycle-card__detail").textContent = cycle.detail;

    node.addEventListener("dragstart", (event) => {
      state.draggingCycleLabel = cycle.label;
      node.classList.add("cycle-card--dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", cycle.label);
      }
    });

    node.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (state.draggingCycleLabel && state.draggingCycleLabel !== cycle.label) {
        node.classList.add("cycle-card--drop-target");
      }
    });

    node.addEventListener("dragleave", () => {
      node.classList.remove("cycle-card--drop-target");
    });

    node.addEventListener("drop", (event) => {
      event.preventDefault();
      node.classList.remove("cycle-card--drop-target");
      moveCycleBefore(state.draggingCycleLabel, cycle.label);
      state.draggingCycleLabel = null;
      renderCycles();
      renderFocus();
    });

    node.addEventListener("dragend", () => {
      state.draggingCycleLabel = null;
      renderCycles();
    });

    refs.cycleGrid.append(node);
  });
}

function renderAlerts() {
  refs.alertsList.replaceChildren();

  worldState.alerts.forEach((alert) => {
    const node = refs.templates.alert.content.firstElementChild.cloneNode(true);
    node.querySelector(".list-item__title").textContent = alert.title;
    node.querySelector(".list-item__copy").textContent = alert.copy;
    node.querySelector(".pill").textContent = alert.tag;
    refs.alertsList.append(node);
  });
}

function renderGoals() {
  refs.goalsGrid.replaceChildren();

  state.goals.forEach((goal) => {
    const node = refs.templates.goal.content.firstElementChild.cloneNode(true);
    node.querySelector(".goal-card__eyebrow").textContent = goal.eyebrow;
    node.querySelector(".goal-card__title").textContent = goal.title;
    node.querySelector(".goal-card__copy").textContent = goal.copy;
    node.querySelector(".pill").textContent = goal.tag;
    node.querySelector(".goal-card__delete").addEventListener("click", () => {
      state.goals = state.goals.filter((item) => item.id !== goal.id);
      saveGoals();
      renderGoals();
    });
    refs.goalsGrid.append(node);
  });
}

function renderGuides() {
  refs.guideTabs.forEach((tab) => {
    const isActive = tab.dataset.guideCategory === state.activeGuideCategory;
    tab.classList.toggle("guide-tab--active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  refs.guideGrid.replaceChildren();

  guideArchive[state.activeGuideCategory].forEach((guide) => {
    const node = refs.templates.guide.content.firstElementChild.cloneNode(true);
    node.querySelector(".guide-card__eyebrow").textContent = guide.eyebrow;
    node.querySelector(".guide-card__title").textContent = guide.title;
    node.querySelector(".pill").textContent = guide.tag;
    node.querySelector(".guide-card__copy").textContent = guide.copy;

    const steps = node.querySelector(".guide-card__steps");
    guide.steps.forEach((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      steps.append(item);
    });

    refs.guideGrid.append(node);
  });
}

function renderFoundry() {
  refs.foundryList.replaceChildren();

  state.foundry.forEach((item) => {
    const node = refs.templates.foundryItem.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector(".foundry-item__checkbox");
    node.querySelector(".list-item__title").textContent = item.name;
    node.querySelector(".foundry-item__meta").textContent = `${formatBuildLength(item.buildHours)} | ${item.sourceLabel}`;
    node.querySelector(".list-item__copy").textContent = item.done
      ? `Checked off. Built item was expected to finish ${formatAbsoluteTime(item.completeAt)}.`
      : `Time remaining: ${formatTimeRemaining(item.completeAt)} | Finishes ${formatAbsoluteTime(item.completeAt)}`;
    node.querySelector(".pill").textContent = item.done ? "Complete" : formatTimeRemaining(item.completeAt);
    checkbox.checked = Boolean(item.done);
    if (item.done) {
      node.classList.add("foundry-item--done");
    }
    checkbox.addEventListener("change", () => {
      item.done = checkbox.checked;
      saveFoundry();
      renderFoundry();
    });
    node.querySelector(".foundry-item__delete").addEventListener("click", () => {
      state.foundry = state.foundry.filter((foundryItem) => foundryItem.id !== item.id);
      saveFoundry();
      renderFoundry();
    });
    refs.foundryList.append(node);
  });
}

function renderOperations() {
  refs.operationsGrid.replaceChildren();

  worldState.operations.forEach((operation) => {
    const node = refs.templates.operation.content.firstElementChild.cloneNode(true);
    node.querySelector(".cycle-card__label").textContent = operation.label;
    node.querySelector(".operation-card__title").textContent = operation.title;
    node.querySelector(".pill").textContent = getOperationStatus(operation);
    node.querySelector(".operation-card__timer").textContent = formatTimeRemaining(operation.expiresAt);
    node.querySelector(".operation-card__copy").textContent = operation.summary;
    node.querySelector(".operation-card__detail").textContent = operation.detail;

    const button = node.querySelector(".operation-card__button");
    if (operation.entries?.length) {
      button.hidden = false;
      button.textContent = operation.label === "Nightwave" ? "Open missions" : "Open board";
      button.addEventListener("click", () => openDetailPanel(operation));
    }

    refs.operationsGrid.append(node);
  });
}

function renderMarketLookup() {
  if (!state.marketLookup) {
    refs.marketResult.hidden = true;
    refs.marketStatus.textContent = "Type an item name like Rhino Prime Set, Arcane Energize, or Primed Flow to build a market-ready link.";
    return;
  }

  refs.marketResult.hidden = false;
  refs.marketResultTitle.textContent = state.marketLookup.name;
  refs.marketResultMeta.textContent = `Market path: ${state.marketLookup.slug}`;
  refs.marketOpenLink.href = state.marketLookup.url;
  refs.marketStatus.textContent = `Built a direct warframe.market link for ${state.marketLookup.name}.`;
}

function renderMarketHistory() {
  refs.marketHistory.replaceChildren();

  state.marketSearches.forEach((search) => {
    const button = document.createElement("button");
    button.className = "pill pill--interactive";
    button.type = "button";
    button.textContent = search;
    button.addEventListener("click", () => {
      selectMarketSuggestion(search);
    });
    refs.marketHistory.append(button);
  });
}

function renderTasks() {
  refs.taskList.replaceChildren();

  state.tasks.forEach((task) => {
    const node = refs.templates.task.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector(".task-item__checkbox");
    const text = node.querySelector(".task-item__text");
    const removeButton = node.querySelector(".task-item__delete");

    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      state.manualSuggestion = null;
      saveTasks();
      renderTasks();
      renderFocus();
    });

    text.textContent = task.text;

    removeButton.addEventListener("click", () => {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      state.manualSuggestion = null;
      saveTasks();
      renderTasks();
      renderFocus();
    });

    refs.taskList.append(node);
  });
}

function renderFocus() {
  const focus = pickFocus();
  refs.focusTitle.textContent = focus.title;
  refs.focusDescription.textContent = focus.description;
  refs.focusTag.textContent = focus.tag;
  refs.lastUpdated.textContent = `Synced ${formatSyncTime(worldState.syncedAt)}`;
}

function suggestRandomMission() {
  const mission = starChartMissions[Math.floor(Math.random() * starChartMissions.length)];
  state.manualSuggestion = {
    title: mission.title,
    description: mission.description,
    tag: mission.tag
  };
  renderFocus();
}

function openDetailPanel(operation) {
  state.detailView = operation.label;
  refs.detailEyebrow.textContent = operation.label;
  refs.detailTitle.textContent = operation.title;
  refs.detailSummary.textContent = operation.summary;
  refs.detailMeta.replaceChildren();

  const status = document.createElement("span");
  status.className = "pill";
  status.textContent = getOperationStatus(operation);

  const timer = document.createElement("span");
  timer.className = "pill";
  timer.textContent = formatTimeRemaining(operation.expiresAt);

  refs.detailMeta.append(status, timer);

  if (operation.label === "Nightwave") {
    const progress = getNightwaveProgress(operation);
    const progressPill = document.createElement("span");
    progressPill.className = "pill";
    progressPill.textContent = `${progress.completed}/${progress.total} complete`;
    refs.detailMeta.append(progressPill);
  }

  refs.detailList.replaceChildren();

  operation.entries.forEach((entry) => {
    const node = refs.templates.detailItem.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".list-item__title");
    const isNightwave = operation.label === "Nightwave" && entry.id;

    if (isNightwave) {
      const label = document.createElement("label");
      label.className = "detail-item__label";

      const checkbox = document.createElement("input");
      checkbox.className = "detail-item__checkbox";
      checkbox.type = "checkbox";
      checkbox.checked = state.nightwaveCompleted.has(entry.id);

      const text = document.createElement("span");
      text.className = "detail-item__text";
      text.textContent = entry.title;

      label.append(checkbox, text);
      title.replaceWith(label);

      if (checkbox.checked) {
        node.classList.add("detail-item--done");
      }

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          state.nightwaveCompleted.add(entry.id);
        } else {
          state.nightwaveCompleted.delete(entry.id);
        }

        saveNightwave();
        renderOperations();
        openDetailPanel(operation);
      });
    } else {
      title.textContent = entry.title;
    }

    node.querySelector(".pill").textContent = entry.tag;
    node.querySelector(".detail-item__meta").textContent = entry.meta;
    node.querySelector(".list-item__copy").textContent = entry.copy;
    refs.detailList.append(node);
  });

  refs.detailOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function renderActiveDetailView() {
  if (!state.detailView) {
    return;
  }

  const activeOperation = worldState.operations.find((operation) => operation.label === state.detailView);
  if (activeOperation) {
    openDetailPanel(activeOperation);
  }
}

function closeDetailPanel() {
  state.detailView = null;
  refs.detailOverlay.hidden = true;
  document.body.style.overflow = "";
}

function refreshIntel() {
  worldState.syncedAt = new Date().toISOString();
  state.manualSuggestion = null;
  renderCycles();
  renderOperations();
  renderFoundry();
  renderActiveDetailView();
  renderFocus();
  fetchOpenWorldCycles();
  fetchVoidFissures();
  fetchBounties();
}

refs.refreshButton.addEventListener("click", refreshIntel);
refs.focusButton.addEventListener("click", suggestRandomMission);
refs.detailCloseButton.addEventListener("click", closeDetailPanel);
refs.detailOverlay.addEventListener("click", (event) => {
  if (event.target === refs.detailOverlay) {
    closeDetailPanel();
  }
});

refs.guideTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeGuideCategory = tab.dataset.guideCategory;
    renderGuides();
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !refs.detailOverlay.hidden) {
    closeDetailPanel();
  }
});

refs.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = refs.taskInput.value.trim();
  if (!value) {
    return;
  }

  state.tasks = [{ id: crypto.randomUUID(), text: value, done: false }, ...state.tasks];
  state.manualSuggestion = null;
  refs.taskInput.value = "";
  saveTasks();
  renderTasks();
  renderFocus();
});

refs.foundryNameInput.addEventListener("input", updateFoundryStatus);

refs.goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = refs.goalTitleInput.value.trim();
  const copy = refs.goalDetailInput.value.trim();
  const tag = refs.goalTagInput.value.trim();

  if (!title || !copy) {
    return;
  }

  state.goals = [
    {
      id: crypto.randomUUID(),
      eyebrow: "Custom goal",
      title,
      copy,
      tag: tag || "Personal"
    },
    ...state.goals
  ];

  refs.goalTitleInput.value = "";
  refs.goalDetailInput.value = "";
  refs.goalTagInput.value = "";
  saveGoals();
  renderGoals();
});

refs.foundryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = refs.foundryNameInput.value.trim();
  const buildHours = Number.parseInt(refs.foundryHoursInput.value, 10);

  const matchedItem = lookupFoundryItem(name);
  const canUseCustomHours = !Number.isNaN(buildHours) && buildHours >= 1;

  if (!name || (!matchedItem && !canUseCustomHours)) {
    return;
  }

  state.foundry = [
    matchedItem ? createFoundryItemFromName(name) : createFoundryItem(name, buildHours),
    ...state.foundry
  ];
  refs.foundryNameInput.value = "";
  refs.foundryHoursInput.value = "";
  saveFoundry();
  renderFoundry();
});

refs.marketForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = refs.marketInput.value.trim();
  if (!query) {
    return;
  }

  const selectedSuggestion = state.marketAutocomplete[state.marketAutocompleteIndex];
  selectMarketSuggestion(selectedSuggestion ?? query, { submit: true });
});

refs.marketInput.addEventListener("input", () => {
  const query = refs.marketInput.value.trim();

  if (!query) {
    state.marketLookup = null;
    renderMarketLookup();
    hideMarketAutocomplete();
    return;
  }

  state.marketLookup = buildMarketLookup(query);
  renderMarketLookup();
  updateMarketAutocomplete(query);
});

refs.marketInput.addEventListener("keydown", (event) => {
  if (!state.marketAutocomplete.length) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.marketAutocompleteIndex = (state.marketAutocompleteIndex + 1) % state.marketAutocomplete.length;
    renderMarketAutocomplete();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.marketAutocompleteIndex =
      (state.marketAutocompleteIndex - 1 + state.marketAutocomplete.length) % state.marketAutocomplete.length;
    renderMarketAutocomplete();
    return;
  }

  if (event.key === "Escape") {
    hideMarketAutocomplete();
    return;
  }

  if (event.key === "Enter" && state.marketAutocompleteIndex >= 0) {
    event.preventDefault();
    selectMarketSuggestion(state.marketAutocomplete[state.marketAutocompleteIndex], { submit: true });
  }
});

refs.marketInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    hideMarketAutocomplete();
  }, 120);
});

refs.bountyAreaSelect.addEventListener("change", () => {
  state.bountyArea = refs.bountyAreaSelect.value;
  saveBountyArea();
  renderBounties();
});

renderCycles();
renderAlerts();
renderGuides();
renderGoals();
renderFoundry();
renderOperations();
renderTasks();
renderFocus();
renderFoundrySuggestions();
updateFoundryStatus();
renderMarketLookup();
renderMarketHistory();
fetchOpenWorldCycles();
fetchVoidFissures();
fetchBounties();

window.setInterval(() => {
  renderCycles();
  renderOperations();
  renderFoundry();
  renderActiveDetailView();
  renderBounties();
}, 1000);

window.setInterval(() => {
  fetchVoidFissures();
  fetchBounties();
}, 300000);

window.setInterval(() => {
  fetchOpenWorldCycles();
}, 60000);

