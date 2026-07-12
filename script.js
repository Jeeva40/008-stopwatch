(function () {
  "use strict";

  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  const millisecondsEl = document.getElementById("milliseconds");

  const startBtn = document.getElementById("start-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const lapBtn = document.getElementById("lap-btn");
  const resetBtn = document.getElementById("reset-btn");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const fullscreenToggleBtn = document.getElementById("fullscreen-toggle");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const copyLapsBtn = document.getElementById("copy-laps-btn");

  const lapsList = document.getElementById("laps-list");
  const lapsEmpty = document.getElementById("laps-empty");

  const statTotal = document.getElementById("stat-total");
  const statFastest = document.getElementById("stat-fastest");
  const statSlowest = document.getElementById("stat-slowest");
  const statAverage = document.getElementById("stat-average");

  const currentYearEl = document.getElementById("current-year");

  let startTimestamp = 0;
  let elapsedBeforePause = 0;
  let timerId = null;
  let isRunning = false;
  let laps = [];
  let lastLapElapsed = 0;

  function formatTime(totalMs) {
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = Math.floor(totalMs % 1000);
    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
      milliseconds: String(milliseconds).padStart(3, "0"),
    };
  }

  function formatDuration(totalMs) {
    const { hours, minutes, seconds, milliseconds } = formatTime(totalMs);
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  function getElapsed() {
    if (isRunning) {
      return elapsedBeforePause + (performance.now() - startTimestamp);
    }
    return elapsedBeforePause;
  }

  function render() {
    const { hours, minutes, seconds, milliseconds } = formatTime(getElapsed());
    hoursEl.textContent = hours;
    minutesEl.textContent = minutes;
    secondsEl.textContent = seconds;
    millisecondsEl.textContent = milliseconds;
  }

  function tick() {
    render();
    timerId = requestAnimationFrame(tick);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    startTimestamp = performance.now();
    timerId = requestAnimationFrame(tick);

    startBtn.disabled = true;
    pauseBtn.disabled = false;
    lapBtn.disabled = false;
    resetBtn.disabled = false;
    startBtn.textContent = "Running";
  }

  function pause() {
    if (!isRunning) return;
    isRunning = false;
    elapsedBeforePause += performance.now() - startTimestamp;
    cancelAnimationFrame(timerId);
    render();

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    lapBtn.disabled = true;
    startBtn.textContent = "Resume";
  }

  function reset() {
    isRunning = false;
    cancelAnimationFrame(timerId);
    elapsedBeforePause = 0;
    lastLapElapsed = 0;
    laps = [];
    render();
    renderLaps();
    updateStats();

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    lapBtn.disabled = true;
    resetBtn.disabled = true;
    exportCsvBtn.disabled = true;
    copyLapsBtn.disabled = true;
    startBtn.textContent = "Start";
  }

  function recordLap() {
    if (!isRunning) return;
    const totalElapsed = getElapsed();
    const lapDuration = totalElapsed - lastLapElapsed;
    lastLapElapsed = totalElapsed;

    laps.push({
      number: laps.length + 1,
      duration: lapDuration,
      total: totalElapsed,
    });

    renderLaps();
    updateStats();
    exportCsvBtn.disabled = false;
    copyLapsBtn.disabled = false;
  }

  function deleteLap(lapNumber) {
    laps = laps.filter((lap) => lap.number !== lapNumber);
    laps.forEach((lap, index) => {
      lap.number = index + 1;
    });
    renderLaps();
    updateStats();

    if (laps.length === 0) {
      exportCsvBtn.disabled = true;
      copyLapsBtn.disabled = true;
    }
  }

  function findFastestAndSlowest() {
    if (laps.length === 0) return { fastest: null, slowest: null };
    let fastest = laps[0];
    let slowest = laps[0];
    for (const lap of laps) {
      if (lap.duration < fastest.duration) fastest = lap;
      if (lap.duration > slowest.duration) slowest = lap;
    }
    return { fastest, slowest };
  }

  function renderLaps() {
    lapsList.innerHTML = "";

    if (laps.length === 0) {
      lapsList.appendChild(lapsEmpty);
      return;
    }

    const { fastest, slowest } = findFastestAndSlowest();

    laps
      .slice()
      .reverse()
      .forEach((lap) => {
        const li = document.createElement("li");
        li.className = "lap-item";
        if (fastest && lap.number === fastest.number && laps.length > 1) {
          li.classList.add("lap-item--fastest");
        }
        if (slowest && lap.number === slowest.number && laps.length > 1) {
          li.classList.add("lap-item--slowest");
        }

        const numberSpan = document.createElement("span");
        numberSpan.className = "lap-number";
        numberSpan.textContent = `#${lap.number}`;

        const timeSpan = document.createElement("span");
        timeSpan.className = "lap-time";
        timeSpan.textContent = formatDuration(lap.duration);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "lap-delete-btn";
        deleteBtn.setAttribute("aria-label", `Delete lap ${lap.number}`);
        deleteBtn.textContent = "✕";
        deleteBtn.addEventListener("click", () => deleteLap(lap.number));

        li.appendChild(numberSpan);
        li.appendChild(timeSpan);
        li.appendChild(deleteBtn);
        lapsList.appendChild(li);
      });
  }

  function updateStats() {
    statTotal.textContent = String(laps.length);

    if (laps.length === 0) {
      statFastest.textContent = "—";
      statSlowest.textContent = "—";
      statAverage.textContent = "—";
      return;
    }

    const { fastest, slowest } = findFastestAndSlowest();
    const total = laps.reduce((sum, lap) => sum + lap.duration, 0);
    const average = total / laps.length;

    statFastest.textContent = formatDuration(fastest.duration);
    statSlowest.textContent = formatDuration(slowest.duration);
    statAverage.textContent = formatDuration(average);
  }

  function buildCsv() {
    const rows = [["Lap", "Lap Time", "Total Time"]];
    laps.forEach((lap) => {
      rows.push([String(lap.number), formatDuration(lap.duration), formatDuration(lap.total)]);
    });
    return rows.map((row) => row.join(",")).join("\r\n");
  }

  function exportCsv() {
    if (laps.length === 0) return;
    const csvContent = buildCsv();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stopwatch-laps.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function copyLaps() {
    if (laps.length === 0) return;
    const text = laps
      .map((lap) => `Lap ${lap.number}: ${formatDuration(lap.duration)} (Total: ${formatDuration(lap.total)})`)
      .join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const nextTheme = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    themeToggleBtn.setAttribute("aria-pressed", String(!isDark));
    localStorage.setItem("stopwatch-theme", nextTheme);
  }

  function restoreTheme() {
    const savedTheme = localStorage.getItem("stopwatch-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    themeToggleBtn.setAttribute("aria-pressed", String(theme === "dark"));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      fullscreenToggleBtn.setAttribute("aria-pressed", "true");
    } else {
      document.exitFullscreen();
      fullscreenToggleBtn.setAttribute("aria-pressed", "false");
    }
  }

  document.addEventListener("fullscreenchange", () => {
    fullscreenToggleBtn.setAttribute("aria-pressed", String(Boolean(document.fullscreenElement)));
  });

  function handleKeydown(event) {
    const target = event.target;
    const isTypingContext = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
    if (isTypingContext) return;

    switch (event.code) {
      case "Space":
        event.preventDefault();
        isRunning ? pause() : start();
        break;
      case "KeyL":
        if (!lapBtn.disabled) recordLap();
        break;
      case "KeyR":
        if (!resetBtn.disabled) reset();
        break;
      default:
        break;
    }
  }

  startBtn.addEventListener("click", start);
  pauseBtn.addEventListener("click", pause);
  lapBtn.addEventListener("click", recordLap);
  resetBtn.addEventListener("click", reset);
  themeToggleBtn.addEventListener("click", toggleTheme);
  fullscreenToggleBtn.addEventListener("click", toggleFullscreen);
  exportCsvBtn.addEventListener("click", exportCsv);
  copyLapsBtn.addEventListener("click", copyLaps);
  document.addEventListener("keydown", handleKeydown);

  currentYearEl.textContent = String(new Date().getFullYear());
  restoreTheme();
  render();
})();
