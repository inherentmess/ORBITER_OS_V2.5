# 🚀 Orbiter OS

A modern Warframe companion dashboard featuring live worldstate tracking, integrated market data, and a clean mobile-friendly interface.

---

## 🔥 Features

### 📊 Dashboard

* Live Warframe worldstate data
* Alerts, Fissures, Sorties, Invasions, Nightwave
* Open world cycles (Cetus, Fortuna, Deimos)

### 📡 Trackers

* Dedicated tracking section for real-time timers
* Clean, easy-to-read cards
* Auto-updating data from worldstate API

### 🛒 Market

* Integrated Warframe Market search
* Auto-complete item search
* Displays **all in-game sellers**
* Sorted by cheapest platinum price
* Copy whisper button with "Copied" state

### 📚 Codex

* Wiki-powered summaries using official Warframe Wiki API
* Clean info panels without scraping

### 🛠️ Backend API

* Custom proxy backend (hosted on Railway)
* Fixes CORS issues (works on mobile + desktop)
* Endpoints:

  * `/api/worldstate`
  * `/api/market/search`
  * `/api/market/orders/:item`

---

## 🌐 Tech Stack

* Frontend: HTML, CSS, JavaScript
* Backend: Node.js (Express)
* Hosting:

  * Frontend: GitHub Pages
  * Backend: Railway

---

## 🚆 API Usage

### Worldstate

```http
GET /api/worldstate
```

### Market Search

```http
GET /api/market/search?q=item_name
```

### Market Orders

```http
GET /api/market/orders/{item_url_name}
```

---

## 📱 Mobile Support

* Fully responsive layout
* Fixed top navigation
* Horizontal scroll for tabs
* Boot screen closes on tap
* Optimized for vertical phone screens

---

## ⚠️ Notes

* Uses Warframe Market API (v1 for compatibility)
* Uses WarframeStat.us for worldstate data
* No scraping is used — API only

---

## 🚀 Deployment

### Backend (Railway)

1. Push code to GitHub
2. Connect repo to Railway
3. Deploy automatically
4. Generate public domain

### Frontend

* Hosted via GitHub Pages
* Connects to Railway API

---

## 🧠 Future Improvements

* Switch to Warframe Market v2 API
* Add caching layer for performance
* User settings / saved trackers
* Notifications for events

---

## 📌 Status

🟢 Active development
⚡ Optimized for speed and mobile use
🔧 Continuously improving

---

## 👾 Credits

* Warframe Market API
* WarframeStat.us API
* Warframe Wiki
* Digital Extremes (Warframe)

---

## 💬 Notes

This project is not affiliated with Digital Extremes.
Built as a community tool for Warframe players.
