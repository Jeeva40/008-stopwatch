/**
 * Stopwatch Application
 * ---------------------------------------------------------------------------
 * A dependency-free stopwatch with lap tracking, statistics, CSV export,
 * clipboard copy, theming, and fullscreen support.
 *
 * Everything below lives inside a single IIFE (Immediately Invoked Function
 * Expression) so nothing leaks into the global `window` scope. All mutable
 * data is kept in one `stopwatchState` object rather than scattered
 * top-level variables, which keeps state changes easy to trace.
 */
(function stopwatchApp() {
  "use strict";

  /* ===========================================================================
     1. DOM ELEMENT REFERENCES
     Cached once at startup so we never re-query the DOM inside the render
     loop (important for keeping updates smooth at 60fps).
     =========================================================================== */
  const dom = {
    // Time readout
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds"),
    milliseconds: document.getElementById("milliseconds"),

    // Primary controls
    startBtn: document.getElementById("start-btn"),
    pauseBtn: document.getElementById("pause-btn"),
    lapBtn: document.getElementById("lap-btn"),
    resetBtn: document.getElementById("reset-btn"),

    // Secondary controls
    themeToggleBtn: document.getElementById("theme-toggle"),
    fullscreenToggleBtn: document.getElementById("fullscreen-toggle"),
    exportCsvBtn: document.getElementById("export-csv-btn"),
    copyLapsBtn: document.getElementById("copy-laps-btn"),
    clearLapsBtn: document.getElementById("clear-laps-btn"),

    // Laps
    lapsList: document.getElementById("laps-list"),
    lapsEmptyMessage: document.getElementById("laps-empty"),

    // Statistics
    statTotal: document.getElementById("stat-total"),
    statFastest: document.getElementById("stat-fastest"),
    statSlowest: document.getElementById("stat-slowest"),
    statAverage: document.getElementById("stat-average"),

    // Misc
    currentYear: document.getElementById("current-year"),
    displayRing: document.getElementById("display-ring"),
    statusBadge: document.getElementById("status-badge"),
    statusText: document.getElementById("status-text"),
  };

  /* ===========================================================================
     2. APPLICATION STATE
     A single object holds every piece of mutable data the app needs.
     Keeping it in one place (instead of many loose `let` variables) makes
     it obvious what "the state of the stopwatch" actually is at any time.
     =========================================================================== */
  const stopwatchState = {
    isRunning: false, // true while the stopwatch is actively counting
    startTimestamp: 0, // performance.now() value when the current run began
    elapsedBeforePause: 0, // accumulated elapsed time from previous runs (ms)
    animationFrameId: null, // id returned by requestAnimationFrame, for cancelling
    laps: [], // { number, durationMs, totalElapsedMs }[]
    lastLapElapsedMs: 0, // elapsed time recorded at the last lap/clear point
  };

  const THEME_STORAGE_KEY = "stopwatch-theme";
  const MILLISECONDS_PER_HOUR = 3600000;
  const MILLISECONDS_PER_MINUTE = 60000;
  const MILLISECONDS_PER_SECOND = 1000;

  /* ===========================================================================
     3. TIME FORMATTING HELPERS
     Pure functions: given a number of milliseconds, they return formatted
     strings. They never touch the DOM or app state, which makes them easy
     to test and reason about in isolation.
     =========================================================================== */

  /** Breaks a millisecond duration into zero-padded HH / MM / SS / MS parts. */
  function splitTimeParts(totalMilliseconds) {
    const hours = Math.floor(totalMilliseconds / MILLISECONDS_PER_HOUR);
    const minutes = Math.floor((totalMilliseconds % MILLISECONDS_PER_HOUR) / MILLISECONDS_PER_MINUTE);
    const seconds = Math.floor((totalMilliseconds % MILLISECONDS_PER_MINUTE) / MILLISECONDS_PER_SECOND);
    const milliseconds = Math.floor(totalMilliseconds % MILLISECONDS_PER_SECOND);

    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
      milliseconds: String(milliseconds).padStart(3, "0"),
    };
  }

  /** Formats a duration as "HH:MM:SS:MS" for laps, CSV rows, and clipboard text. */
  function formatDurationLabel(totalMilliseconds) {
    const { hours, minutes, seconds, milliseconds } = splitTimeParts(totalMilliseconds);
    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
  }

  /* ===========================================================================
     4. TIMER CORE
     Uses requestAnimationFrame (rAF) instead of setInterval so the display
     updates in sync with the browser's paint cycle -- this avoids the
     drift and jank that setInterval can introduce over long-running timers.
     The actual elapsed time is always derived from performance.now(), which
     is monotonic and unaffected by rAF's own timing, so the displayed value
     stays accurate even if a frame is skipped.
     =========================================================================== */

  /** Returns the total elapsed time in milliseconds, accounting for pauses. */
  function getElapsedMilliseconds() {
    if (stopwatchState.isRunning) {
      return stopwatchState.elapsedBeforePause + (performance.now() - stopwatchState.startTimestamp);
    }
    return stopwatchState.elapsedBeforePause;
  }

  /** Pushes the current elapsed time to the on-screen display. */
  function renderTimeDisplay() {
    const { hours, minutes, seconds, milliseconds } = splitTimeParts(getElapsedMilliseconds());
    dom.hours.textContent = hours;
    dom.minutes.textContent = minutes;
    dom.seconds.textContent = seconds;
    dom.milliseconds.textContent = milliseconds;
  }

  /** requestAnimationFrame loop: re-renders every frame while running. */
  function animationLoop() {
    renderTimeDisplay();
    stopwatchState.animationFrameId = requestAnimationFrame(animationLoop);
  }

  /** Starts the stopwatch, or resumes it after a pause. No-ops if already running. */
  function startStopwatch() {
    // Guard clause: prevents duplicate starts (e.g. rapid double-clicks or
    // the spacebar shortcut firing while already running).
    if (stopwatchState.isRunning) return;

    stopwatchState.isRunning = true;
    stopwatchState.startTimestamp = performance.now();
    stopwatchState.animationFrameId = requestAnimationFrame(animationLoop);

    dom.startBtn.querySelector(".btn-label").textContent = "Running";
    dom.displayRing.classList.add("is-running");
    setStatusIndicator("running");
    updateButtonAvailability();
  }

  /** Pauses the stopwatch, freezing the displayed time. No-ops if already paused. */
  function pauseStopwatch() {
    if (!stopwatchState.isRunning) return;

    stopwatchState.isRunning = false;
    stopwatchState.elapsedBeforePause += performance.now() - stopwatchState.startTimestamp;
    cancelAnimationFrame(stopwatchState.animationFrameId);
    renderTimeDisplay(); // ensure the frozen value is exact, not the last rAF frame

    dom.startBtn.querySelector(".btn-label").textContent = "Resume";
    dom.displayRing.classList.remove("is-running");
    setStatusIndicator("paused");
    updateButtonAvailability();
  }

  /** Stops the stopwatch and clears all elapsed time, laps, and statistics. */
  function resetStopwatch() {
    stopwatchState.isRunning = false;
    cancelAnimationFrame(stopwatchState.animationFrameId);
    stopwatchState.elapsedBeforePause = 0;
    stopwatchState.lastLapElapsedMs = 0;
    stopwatchState.laps = [];

    renderTimeDisplay();
    renderLapList();
    renderStatistics();

    dom.startBtn.querySelector(".btn-label").textContent = "Start";
    dom.displayRing.classList.remove("is-running");
    setStatusIndicator("ready");
    updateButtonAvailability();
  }

  /* ===========================================================================
     5. STATUS INDICATOR
     Small UI badge that reflects Ready / Running / Paused state.
     =========================================================================== */
  function setStatusIndicator(state) {
    dom.statusBadge.classList.remove("is-running", "is-paused");

    if (state === "running") {
      dom.statusBadge.classList.add("is-running");
      dom.statusText.textContent = "Running";
    } else if (state === "paused") {
      dom.statusBadge.classList.add("is-paused");
      dom.statusText.textContent = "Paused";
    } else {
      dom.statusText.textContent = "Ready";
    }
  }

  /* ===========================================================================
     6. CENTRALIZED BUTTON STATE
     One function decides which buttons should be enabled/disabled, based on
     current app state. Keeping this logic in one place (rather than
     sprinkled through every action function) avoids buttons getting out of
     sync with reality.
     =========================================================================== */
  function updateButtonAvailability() {
    const hasLaps = stopwatchState.laps.length > 0;
    const hasStarted = stopwatchState.isRunning || stopwatchState.elapsedBeforePause > 0;

    dom.startBtn.disabled = stopwatchState.isRunning;
    dom.pauseBtn.disabled = !stopwatchState.isRunning;
    dom.lapBtn.disabled = !stopwatchState.isRunning;
    dom.resetBtn.disabled = !hasStarted;

    dom.exportCsvBtn.disabled = !hasLaps;
    dom.copyLapsBtn.disabled = !hasLaps;
    dom.clearLapsBtn.disabled = !hasLaps;
  }

  /* ===========================================================================
     7. LAP MANAGEMENT
     =========================================================================== */

  /** Records a new lap using the time elapsed since the previous lap. */
  function recordLap() {
    // Guard clause: laps only make sense while the stopwatch is running.
    if (!stopwatchState.isRunning) return;

    const totalElapsedMs = getElapsedMilliseconds();
    const lapDurationMs = totalElapsedMs - stopwatchState.lastLapElapsedMs;
    stopwatchState.lastLapElapsedMs = totalElapsedMs;

    stopwatchState.laps.push({
      number: stopwatchState.laps.length + 1,
      durationMs: lapDurationMs,
      totalElapsedMs: totalElapsedMs,
    });

    renderLapList();
    renderStatistics();
    updateButtonAvailability();
    playPulseAnimation(dom.lapBtn);
  }

  /** Removes a single lap by its display number, then renumbers the rest. */
  function deleteLap(lapNumber) {
    stopwatchState.laps = stopwatchState.laps.filter((lap) => lap.number !== lapNumber);

    // Renumber remaining laps so they stay sequential (#1, #2, #3, ...).
    stopwatchState.laps.forEach((lap, index) => {
      lap.number = index + 1;
    });

    renderLapList();
    renderStatistics();
    updateButtonAvailability();
  }

  /** Clears every recorded lap while leaving the running timer untouched. */
  function clearAllLaps() {
    // Guard clause: nothing to clear.
    if (stopwatchState.laps.length === 0) return;

    stopwatchState.laps = [];
    // Re-anchor lap timing to "now" so the next lap's duration is measured
    // from the moment of clearing, not from a lap that no longer exists.
    stopwatchState.lastLapElapsedMs = getElapsedMilliseconds();

    renderLapList();
    renderStatistics();
    updateButtonAvailability();
  }

  /** Finds the fastest and slowest laps. Returns nulls when there are no laps. */
  function findFastestAndSlowestLaps() {
    if (stopwatchState.laps.length === 0) {
      return { fastestLap: null, slowestLap: null };
    }

    let fastestLap = stopwatchState.laps[0];
    let slowestLap = stopwatchState.laps[0];

    for (const lap of stopwatchState.laps) {
      if (lap.durationMs < fastestLap.durationMs) fastestLap = lap;
      if (lap.durationMs > slowestLap.durationMs) slowestLap = lap;
    }

    return { fastestLap, slowestLap };
  }

  /** Rebuilds the lap list UI from the current `stopwatchState.laps` array. */
  function renderLapList() {
    dom.lapsList.innerHTML = "";

    if (stopwatchState.laps.length === 0) {
      dom.lapsList.appendChild(dom.lapsEmptyMessage);
      return;
    }

    const { fastestLap, slowestLap } = findFastestAndSlowestLaps();
    const hasMultipleLaps = stopwatchState.laps.length > 1;

    // Newest lap first, so the list reads top-to-bottom in recency order.
    const lapsNewestFirst = stopwatchState.laps.slice().reverse();

    lapsNewestFirst.forEach((lap) => {
      dom.lapsList.appendChild(buildLapListItem(lap, fastestLap, slowestLap, hasMultipleLaps));
    });
  }

  /** Builds a single <li> element for one lap entry. */
  function buildLapListItem(lap, fastestLap, slowestLap, hasMultipleLaps) {
    const listItem = document.createElement("li");
    listItem.className = "lap-item";

    if (hasMultipleLaps && lap.number === fastestLap.number) {
      listItem.classList.add("lap-item--fastest");
    }
    if (hasMultipleLaps && lap.number === slowestLap.number) {
      listItem.classList.add("lap-item--slowest");
    }

    const numberBadge = document.createElement("span");
    numberBadge.className = "lap-number";
    numberBadge.textContent = `#${lap.number}`;

    const timeLabel = document.createElement("span");
    timeLabel.className = "lap-time";
    timeLabel.textContent = formatDurationLabel(lap.durationMs);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "lap-delete-btn";
    deleteButton.setAttribute("aria-label", `Delete lap ${lap.number}`);
    deleteButton.textContent = "✕"; // "✕"
    deleteButton.addEventListener("click", () => deleteLap(lap.number));

    listItem.append(numberBadge, timeLabel, deleteButton);
    return listItem;
  }

  /* ===========================================================================
     8. STATISTICS
     =========================================================================== */
  function renderStatistics() {
    dom.statTotal.textContent = String(stopwatchState.laps.length);

    if (stopwatchState.laps.length === 0) {
      dom.statFastest.textContent = "—"; // em dash placeholder
      dom.statSlowest.textContent = "—";
      dom.statAverage.textContent = "—";
      return;
    }

    const { fastestLap, slowestLap } = findFastestAndSlowestLaps();
    const totalDurationMs = stopwatchState.laps.reduce((sum, lap) => sum + lap.durationMs, 0);
    const averageDurationMs = totalDurationMs / stopwatchState.laps.length;

    dom.statFastest.textContent = formatDurationLabel(fastestLap.durationMs);
    dom.statSlowest.textContent = formatDurationLabel(slowestLap.durationMs);
    dom.statAverage.textContent = formatDurationLabel(averageDurationMs);
  }

  /* ===========================================================================
     9. CSV EXPORT
     =========================================================================== */

  /** Converts the recorded laps into CSV text (header row + one row per lap). */
  function buildCsvContent() {
    const header = ["Lap", "Lap Time", "Total Time"];
    const rows = stopwatchState.laps.map((lap) => [
      String(lap.number),
      formatDurationLabel(lap.durationMs),
      formatDurationLabel(lap.totalElapsedMs),
    ]);

    return [header, ...rows].map((row) => row.join(",")).join("\r\n");
  }

  /** Triggers a browser download of the current laps as a .csv file. */
  function exportLapsAsCsv() {
    // Guard clause: nothing to export.
    if (stopwatchState.laps.length === 0) return;

    const csvContent = buildCsvContent();
    const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(csvBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = "stopwatch-laps.csv";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Release the object URL now that the download has been triggered.
    URL.revokeObjectURL(downloadUrl);
  }

  /* ===========================================================================
     10. CLIPBOARD COPY
     =========================================================================== */

  /** Copies a plain-text summary of all laps to the clipboard. */
  function copyLapsToClipboard() {
    // Guard clause: nothing to copy.
    if (stopwatchState.laps.length === 0) return;

    const summaryText = stopwatchState.laps
      .map((lap) => `Lap ${lap.number}: ${formatDurationLabel(lap.durationMs)} (Total: ${formatDurationLabel(lap.totalElapsedMs)})`)
      .join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summaryText).catch(() => {
        copyTextWithFallback(summaryText);
      });
    } else {
      copyTextWithFallback(summaryText);
    }
  }

  /** Fallback for browsers without the async Clipboard API (e.g. older Safari). */
  function copyTextWithFallback(text) {
    const hiddenTextarea = document.createElement("textarea");
    hiddenTextarea.value = text;
    hiddenTextarea.setAttribute("readonly", "");
    hiddenTextarea.style.position = "absolute";
    hiddenTextarea.style.left = "-9999px";
    document.body.appendChild(hiddenTextarea);
    hiddenTextarea.select();
    document.execCommand("copy");
    document.body.removeChild(hiddenTextarea);
  }

  /* ===========================================================================
     11. THEME (DARK / LIGHT) WITH localStorage PERSISTENCE
     =========================================================================== */

  function toggleTheme() {
    const isCurrentlyDark = document.documentElement.getAttribute("data-theme") === "dark";
    const nextTheme = isCurrentlyDark ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", nextTheme);
    dom.themeToggleBtn.setAttribute("aria-pressed", String(!isCurrentlyDark));
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  /** Applies the saved theme on load, falling back to the OS preference. */
  function restoreSavedTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const themeToApply = savedTheme || (systemPrefersDark ? "dark" : "light");

    document.documentElement.setAttribute("data-theme", themeToApply);
    dom.themeToggleBtn.setAttribute("aria-pressed", String(themeToApply === "dark"));
  }

  /* ===========================================================================
     12. FULLSCREEN TOGGLE
     =========================================================================== */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen can be denied by the browser/user; failing silently
        // is acceptable here since it's a non-critical convenience feature.
      });
    } else {
      document.exitFullscreen();
    }
  }

  function handleFullscreenChange() {
    dom.fullscreenToggleBtn.setAttribute("aria-pressed", String(Boolean(document.fullscreenElement)));
  }

  /* ===========================================================================
     13. VISUAL FEEDBACK EFFECTS (ripple + pulse)
     Purely cosmetic; kept separate from app logic so it can be skipped or
     removed without touching the stopwatch behavior.
     =========================================================================== */

  /** Spawns a Material-style ripple circle at the click position inside `button`. */
  function playRippleEffect(event) {
    const button = event.currentTarget;
    const bounds = button.getBoundingClientRect();
    const rippleSize = Math.max(bounds.width, bounds.height);

    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${rippleSize}px`;
    ripple.style.left = `${event.clientX - bounds.left - rippleSize / 2}px`;
    ripple.style.top = `${event.clientY - bounds.top - rippleSize / 2}px`;

    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  }

  /** Re-triggers a short "pulse" CSS animation on the given element. */
  function playPulseAnimation(element) {
    element.classList.remove("is-pulsing");
    void element.offsetWidth; // force reflow so the animation restarts cleanly
    element.classList.add("is-pulsing");
  }

  /* ===========================================================================
     14. KEYBOARD SHORTCUTS
     Space = Start/Pause, L = Lap, R = Reset.
     Shortcuts are ignored while the user is typing in a form field.
     =========================================================================== */
  function handleKeyboardShortcut(event) {
    const isTypingInField = event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA";
    if (isTypingInField) return;

    switch (event.code) {
      case "Space":
        event.preventDefault(); // stop the page from scrolling
        stopwatchState.isRunning ? pauseStopwatch() : startStopwatch();
        break;
      case "KeyL":
        if (!dom.lapBtn.disabled) recordLap();
        break;
      case "KeyR":
        if (!dom.resetBtn.disabled) resetStopwatch();
        break;
      default:
        break; // ignore all other keys
    }
  }

  /* ===========================================================================
     15. INITIALIZATION
     Wires up every event listener and sets the initial UI state. Runs once
     when the script loads.
     =========================================================================== */
  function initializeApp() {
    // Primary stopwatch controls
    dom.startBtn.addEventListener("click", startStopwatch);
    dom.pauseBtn.addEventListener("click", pauseStopwatch);
    dom.lapBtn.addEventListener("click", recordLap);
    dom.resetBtn.addEventListener("click", resetStopwatch);

    // Lap management
    dom.clearLapsBtn.addEventListener("click", clearAllLaps);

    // Data export
    dom.exportCsvBtn.addEventListener("click", exportLapsAsCsv);
    dom.copyLapsBtn.addEventListener("click", copyLapsToClipboard);

    // Preferences
    dom.themeToggleBtn.addEventListener("click", toggleTheme);
    dom.fullscreenToggleBtn.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Keyboard shortcuts
    document.addEventListener("keydown", handleKeyboardShortcut);

    // Ripple effect on every button that opts in via the "ripple-target" class
    document.querySelectorAll(".ripple-target").forEach((button) => {
      button.addEventListener("click", playRippleEffect);
    });

    // Static content + initial render
    dom.currentYear.textContent = String(new Date().getFullYear());
    restoreSavedTheme();
    renderTimeDisplay();
    renderLapList();
    renderStatistics();
    updateButtonAvailability();
  }

  initializeApp();
})();
