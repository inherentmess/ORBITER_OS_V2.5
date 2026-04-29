const WIKI_ORIGIN = "https://wiki.warframe.com";
const API_URL = `${WIKI_ORIGIN}/api.php`;

const PAGE_TITLES = [
  "Forma",
  "Orokin_Catalyst",
  "Orokin_Reactor",
  "Excalibur",
  "Rhino",
  "Volt/Main",
  "Wukong",
  "Paris",
  "Hek",
  "Nikana"
];

async function fetchParsedHtml(pageTitle) {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    origin: "*",
    action: "parse",
    page: pageTitle,
    prop: "text",
    format: "json"
  }).toString();

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${pageTitle}: ${response.status}`);
  }

  const payload = await response.json();
  return payload.parse?.text?.["*"] ?? "";
}

function parseHourValue(label) {
  const dayMatch = label.match(/(\d+)\s*Day\(s\)/i);
  if (dayMatch) {
    return Number.parseInt(dayMatch[1], 10) * 24;
  }

  const hourMatch = label.match(/(\d+)\s*(?:Hour\(s\)|hrs?|hours?)/i);
  if (hourMatch) {
    return Number.parseInt(hourMatch[1], 10);
  }

  return null;
}

function normalizeKey(value) {
  return value
    .toLowerCase()
    .replace(/\s+blueprint$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractEntries(pageTitle, html) {
  const cleanPageTitle = pageTitle.replaceAll("_", " ");
  const results = [];

  const namedMatches = [
    ...html.matchAll(/>\s*([^<>]{1,80}?)\s*Blueprint\s*<[\s\S]{0,220}?Time:\s*([^<>]+)</gi)
  ];

  namedMatches.forEach((match) => {
    const buildHours = parseHourValue(match[2]);
    if (!buildHours) {
      return;
    }

    results.push({
      name: `${match[1].trim()} Blueprint`,
      buildHours
    });
  });

  const baseMatch = html.match(/Manufacturing Requirements[\s\S]{0,400}?Time:\s*([^<>]+)</i);
  if (baseMatch) {
    const buildHours = parseHourValue(baseMatch[1]);
    if (buildHours) {
      results.unshift({
        name: cleanPageTitle,
        buildHours
      });
    }
  }

  return results;
}

async function buildCatalog() {
  const catalog = {};

  for (const pageTitle of PAGE_TITLES) {
    const html = await fetchParsedHtml(pageTitle);
    const entries = extractEntries(pageTitle, html);

    entries.forEach((entry) => {
      catalog[normalizeKey(entry.name)] = {
        name: entry.name.replace(/\s+Blueprint$/u, ""),
        buildHours: entry.buildHours,
        sourceLabel: "Warframe Wiki",
        sourceUrl: `${WIKI_ORIGIN}/w/${pageTitle}`
      };
    });
  }

  return catalog;
}

buildCatalog()
  .then((catalog) => {
    console.log(JSON.stringify(catalog, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
<<<<<<< HEAD
  });
=======
  });
>>>>>>> 30addf1 (Initial commit)
