function normalizeFoundryKey(value) {
  return value
    .toLowerCase()
    .replace(/\s+blueprint$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

const baseFoundryCatalog = {
  forma: {
    name: "Forma",
    buildHours: 23,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Forma"
  },
  "orokin catalyst": {
    name: "Orokin Catalyst",
    buildHours: 23,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Orokin_Catalyst"
  },
  "orokin reactor": {
    name: "Orokin Reactor",
    buildHours: 23,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Orokin_Reactor"
  },
  excalibur: {
    name: "Excalibur",
    buildHours: 72,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Excalibur"
  },
  "excalibur neuroptics": {
    name: "Excalibur Neuroptics",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Excalibur"
  },
  "excalibur chassis": {
    name: "Excalibur Chassis",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Excalibur"
  },
  "excalibur systems": {
    name: "Excalibur Systems",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Excalibur"
  },
  rhino: {
    name: "Rhino",
    buildHours: 24,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Rhino"
  },
  "rhino neuroptics": {
    name: "Rhino Neuroptics",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Rhino"
  },
  "rhino chassis": {
    name: "Rhino Chassis",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Rhino"
  },
  "rhino systems": {
    name: "Rhino Systems",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Rhino"
  },
  volt: {
    name: "Volt",
    buildHours: 72,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Volt/Main"
  },
  "volt neuroptics": {
    name: "Volt Neuroptics",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Volt/Main"
  },
  "volt chassis": {
    name: "Volt Chassis",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Volt/Main"
  },
  "volt systems": {
    name: "Volt Systems",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Volt/Main"
  },
  wukong: {
    name: "Wukong",
    buildHours: 72,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Wukong"
  },
  "wukong neuroptics": {
    name: "Wukong Neuroptics",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Wukong"
  },
  "wukong chassis": {
    name: "Wukong Chassis",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Wukong"
  },
  "wukong systems": {
    name: "Wukong Systems",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Wukong"
  },
  paris: {
    name: "Paris",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Paris"
  },
  hek: {
    name: "Hek",
    buildHours: 24,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Hek"
  },
  nikana: {
    name: "Nikana",
    buildHours: 12,
    sourceLabel: "Warframe Wiki",
    sourceUrl: "https://wiki.warframe.com/w/Nikana"
  }
};

const primeWarframeNames = [
  "Ash Prime",
  "Atlas Prime",
  "Banshee Prime",
  "Baruuk Prime",
  "Caliban Prime",
  "Chroma Prime",
  "Ember Prime",
  "Equinox Prime",
  "Frost Prime",
  "Gara Prime",
  "Garuda Prime",
  "Gauss Prime",
  "Grendel Prime",
  "Gyre Prime",
  "Harrow Prime",
  "Hildryn Prime",
  "Hydroid Prime",
  "Inaros Prime",
  "Ivara Prime",
  "Khora Prime",
  "Lavos Prime",
  "Limbo Prime",
  "Loki Prime",
  "Mag Prime",
  "Mesa Prime",
  "Mirage Prime",
  "Nekros Prime",
  "Nezha Prime",
  "Nidus Prime",
  "Nova Prime",
  "Nyx Prime",
  "Oberon Prime",
  "Octavia Prime",
  "Protea Prime",
  "Revenant Prime",
  "Rhino Prime",
  "Saryn Prime",
  "Sevagoth Prime",
  "Titania Prime",
  "Trinity Prime",
  "Valkyr Prime",
  "Vauban Prime",
  "Volt Prime",
  "Voruna Prime",
  "Wisp Prime",
  "Wukong Prime",
  "Xaku Prime",
  "Yareli Prime",
  "Zephyr Prime"
];

const primeFoundryCatalog = Object.fromEntries(
  primeWarframeNames.flatMap((name) => {
    const pageName = name.replace(/\s+/gu, "_");

    return [
      [
        normalizeFoundryKey(name),
        {
          name,
          buildHours: 72,
          sourceLabel: "Warframe Wiki",
          sourceUrl: `https://wiki.warframe.com/w/${pageName}`
        }
      ],
      [
        normalizeFoundryKey(`${name} Neuroptics`),
        {
          name: `${name} Neuroptics`,
          buildHours: 12,
          sourceLabel: "Warframe Wiki",
          sourceUrl: `https://wiki.warframe.com/w/${pageName}`
        }
      ],
      [
        normalizeFoundryKey(`${name} Chassis`),
        {
          name: `${name} Chassis`,
          buildHours: 12,
          sourceLabel: "Warframe Wiki",
          sourceUrl: `https://wiki.warframe.com/w/${pageName}`
        }
      ],
      [
        normalizeFoundryKey(`${name} Systems`),
        {
          name: `${name} Systems`,
          buildHours: 12,
          sourceLabel: "Warframe Wiki",
          sourceUrl: `https://wiki.warframe.com/w/${pageName}`
        }
      ]
    ];
  })
);

window.ORBIT_FOUNDRY_CATALOG = {
  ...baseFoundryCatalog,
  ...primeFoundryCatalog
};

window.ORBIT_VALID_FOUNDRY_NAMES = [
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
  "Zephyr",
  ...primeWarframeNames,
  "Forma",
  "Orokin Catalyst",
  "Orokin Reactor",
  "Excalibur Neuroptics",
  "Excalibur Chassis",
  "Excalibur Systems",
  "Rhino Neuroptics",
  "Rhino Chassis",
  "Rhino Systems",
  "Volt Neuroptics",
  "Volt Chassis",
  "Volt Systems",
  "Wukong Neuroptics",
  "Wukong Chassis",
  "Wukong Systems",
  "Paris",
  "Hek",
  "Nikana"
];
