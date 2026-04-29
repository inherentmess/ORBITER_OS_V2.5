# Orbit Companion

Orbit Companion is a zero-build prototype for a Warframe companion app. It is designed as a polished static dashboard so you can open it immediately, iterate on the product direction, and later migrate it to a framework if the project grows.

## What is included

- A hero dashboard with a suggested "next run" focus state
- Cycle cards for major activity windows
- Priority alerts for high-value tasks
- A local checklist that persists with `localStorage`
- Editable goals and a Foundry helper with craft timers
- A dropdown-backed Foundry catalog that can grow from official wiki data

## Files

- `index.html` contains the app structure and templates
- `styles.css` defines the visual system and responsive layout
- `app.js` contains the UI behavior and local state
- `foundry-catalog.js` contains the external Foundry validation and craft-time catalog the app loads first
- `generate-foundry-catalog.mjs` is a starter script for querying the official Warframe Wiki API and printing a catalog payload

## How to use it

1. Open `index.html` in a browser.
2. Add or complete checklist items to shape the suggested focus panel.
3. Use the Foundry dropdown to pick a known item name.
4. For names with a verified craft time in the local catalog, the hours field auto-fills.
5. Use the "Refresh Intel" button to simulate a fresh sync.

## GitHub Pages (Static Hosting)

This project can be hosted directly from the repository root.

1. Push this folder to a GitHub repo (keep `index.html` at the repo root).
2. In GitHub: `Settings` -> `Pages`.
3. Under `Build and deployment`, select `Deploy from a branch`.
4. Set `Branch` to `main` and `Folder` to `/ (root)`, then save.

Notes:
- `.nojekyll` is included so GitHub Pages serves files as-is without Jekyll processing.
- GitHub Pages is static hosting only: any same-origin endpoints like `/api/worldstate` will not exist unless you deploy a separate serverless proxy somewhere else. The dashboard has direct `oracle.browse.wf` fallbacks; anything that requires a proxy must be hosted separately.

## Official wiki catalog workflow

1. The app reads `foundry-catalog.js` before `app.js`.
2. `app.js` prefers `window.ORBIT_FOUNDRY_CATALOG` and `window.ORBIT_VALID_FOUNDRY_NAMES` from that file.
3. `generate-foundry-catalog.mjs` is the first step toward a larger official-wiki-backed catalog using `https://wiki.warframe.com/api.php`.
4. The current generator is intentionally small and safe: it targets a starter page list and extracts build times from official wiki article markup.

## Good next upgrades

1. Expand the generator to cover more official wiki categories and pages.
2. Replace the starter catalog with a larger generated dataset from `generate-foundry-catalog.mjs`.
3. Add richer Foundry categories such as weapons, companions, and components once their craft times are verified from the official wiki.
4. Turn the static app into a PWA so it behaves more like a phone-friendly companion app.
