<div align="center">

# ⏱️ Stopwatch

**A premium, glassmorphism-styled stopwatch built with pure HTML, CSS &amp; JavaScript — no frameworks, no dependencies.**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](index.html)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](style.css)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](script.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![No Frameworks](https://img.shields.io/badge/Frameworks-None-success?style=for-the-badge)](#-technologies-used)

</div>

---

## 📖 Project Description

**Stopwatch** is a fully client-side timing application that tracks elapsed time down to the millisecond, records and manages laps, surfaces live statistics, and exports your data — all wrapped in a modern **glassmorphism** UI with an animated gradient background, dark/light theming, and smooth micro-interactions.

It's built entirely with **vanilla JavaScript** (no libraries, no build tools) using `requestAnimationFrame` for drift-free timing, making it lightweight, fast, and easy to read as a learning reference or drop-in component.

---

## ✨ Features

- ⏯️ **Start / Pause / Resume / Reset** — with guarded state transitions (no duplicate starts, no invalid actions)
- 🏁 **Lap recording** with millisecond precision (`HH:MM:SS:MS`)
- 🗑️ **Delete individual laps** or 🧹 **Clear all laps** in one click
- 📊 **Live statistics** — Total Laps, Fastest Lap, Slowest Lap, Average Lap
- 📄 **Export laps to CSV** for spreadsheets and reports
- 📋 **Copy all laps** to the clipboard as formatted text
- 🌗 **Dark / Light theme toggle**, preference saved via `localStorage`
- ⛶ **Fullscreen mode** for a distraction-free view
- ⌨️ **Keyboard shortcuts** for hands-on-keyboard control
- 🎨 **Glassmorphism UI** — frosted-glass cards, glowing numerals, animated gradient background, ripple button effects
- 📱 **Fully responsive** across desktop, tablet, and mobile
- ♿ **Accessible** — semantic HTML5, ARIA labels/roles, full keyboard navigation

---

## 📸 Screenshots

> Add your own screenshots to a `screenshots/` folder and update the paths below.

| Light Mode | Dark Mode |
| :---: | :---: |
| ![Light mode screenshot](screenshots/desktop-light.png) | ![Dark mode screenshot](screenshots/desktop-dark.png) |

| Mobile View |
| :---: |
| ![Mobile screenshot](screenshots/mobile.png) |

---

## 📁 Folder Structure

```
008-stopwatch/
├── index.html          # Semantic HTML5 markup & structure
├── style.css            # Theming, glassmorphism UI, animations, responsive layout
├── script.js             # Application logic (timer, laps, stats, export, theme)
├── screenshots/          # UI screenshots used in this README
├── LICENSE               # MIT License
└── README.md             # Project documentation
```

---

## 🛠️ Technologies Used

| Technology | Purpose |
| --- | --- |
| 🧱 **HTML5** | Semantic structure & accessibility |
| 🎨 **CSS3** | Custom properties, Flexbox, Grid, glassmorphism, keyframe animations |
| ⚡ **Vanilla JavaScript (ES6+)** | Timer logic, DOM rendering, state management |
| 🔤 **Google Fonts — Poppins** | Typography |
| 💾 **Web Storage API** | Persisting theme preference |
| 📎 **Clipboard API** | Copying laps to the clipboard |

No frameworks, no bundlers, no npm packages required.

---

## 🚀 How to Run

**Option 1 — Open directly**

```bash
git clone https://github.com/Jeeva40/008-stopwatch.git
cd 008-stopwatch
# then just open index.html in your browser
```

**Option 2 — Serve locally (recommended for the Clipboard API & fonts)**

```bash
# using Python
python -m http.server 4173

# or using Node
npx http-server -p 4173
```

Then visit `http://localhost:4173` in your browser. No build step, no dependencies to install.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :---: | --- |
| <kbd>Space</kbd> | Start / Pause |
| <kbd>L</kbd> | Record Lap |
| <kbd>R</kbd> | Reset |

---

## 🔮 Future Improvements

- 🔔 Sound alerts / chimes on lap and milestone intervals
- 📴 Offline support via a Service Worker (installable PWA)
- 💾 Persist lap history across sessions with `localStorage` / IndexedDB
- ⏱️ Multiple simultaneous timers / named sessions
- 📈 Visual lap comparison chart (bar/line graph)
- 🔃 Drag-and-drop lap reordering
- 🌍 Internationalization (i18n) and multiple time formats
- ✅ Automated test suite (unit + end-to-end)

---

## 📄 License

This project is licensed under the **[MIT License](LICENSE)** — free to use, modify, and distribute.

---

## 👤 Author

**Jeeva Murugan**

[![GitHub](https://img.shields.io/badge/GitHub-Jeeva40-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Jeeva40)
[![Email](https://img.shields.io/badge/Email-jeeva.ocean%40gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:jeeva.ocean@gmail.com)

<div align="center">

Made with ❤️ and vanilla JavaScript

</div>
