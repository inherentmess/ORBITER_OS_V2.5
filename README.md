# 🚀 Orbiter OS

A modern Warframe companion dashboard featuring live tracking, integrated market data, and a clean mobile-first interface.

---

## 🔥 Features

### 📊 Dashboard

* Live Warframe data overview
* Alerts, Fissures, Sorties, Invasions, Nightwave
* Open-world cycles (when available)

### 📡 Trackers

* Powered by Tenno Tools API
* Displays only **available live data** (no empty or broken sections)
* Real-time timers with no negative values
* Auto-refresh every 30–60 seconds
* Clean, dynamic layout that adapts to available data

### 🛒 Market

* Integrated Warframe Market API
* Auto-complete item search
* Shows **all in-game sellers**
* Sorted by lowest platinum price
* Copy whisper button with persistent "Copied" state

### 📚 Codex

* Uses Warframe Wiki API (MediaWiki)
* Clean summaries without scraping

---

## 🛠️ Backend API

Custom proxy backend hosted on Railway to:

* Fix CORS issues
* Support mobile devices
* Provide stable API endpoints

### Endpoints

```http
GET /api/worldstate
GET /api/market/search?q=item_name
GET /api/market/orders/{item_url_name}
```

---

## 🌐 Tech Stack

* Frontend: HTML, CSS, JavaScript
* Backend: Node.js (Express)
* Hosting:

  * Frontend: GitHub Pages
  * Backend: Railway

---

## 🔗 API Sources

* Tenno Tools API (worldstate)
* Warframe Market API (trading)
* Warframe Wiki API (codex)

---

## 📱 Mobile Support

* Fully responsive layout
* Fixed/sticky navigation bar
* Horizontal scroll tabs
* Boot screen closes on tap
* Optimized for vertical phone screens

---

## ⚠️ Behavior

* Only shows **valid, available data**
* Removes empty or unavailable tracker sections
* Uses a single API request for worldstate
* No website scraping — API only

---

## 🚆 Deployment

### Backend (Railway)

1. Push code to GitHub
2. Connect repo to Railway
3. Deploy automatically
4. Generate public domain

### Frontend (GitHub Pages)

* Hosted at:
  https://inherentmess.github.io/ORBITER_OS_V2.5/
* Connects to Railway API

---

## 🧠 Future Improvements

* Improve caching for faster load times
* Add user preferences / saved trackers
* Notifications for important events
* Further UI polish and animations

---

## 📌 Status

🟢 Active development
⚡ Optimized for performance and mobile
🔧 Continuously improving

---

## 👾 Credits

* Tenno Tools API
* Warframe Market
* Warframe Wiki
* Digital Extremes (Warframe)

---

## 💬 Disclaimer

This project is not affiliated with Digital Extremes.
Built as a community tool for Warframe players.
