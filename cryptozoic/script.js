// Config
const API_BASE_URL = "https://nave-dinobase-api-9a4p.vercel.app";
const API_KEY = "nave-api-crptic-112723";

const START_TIME = 100;
const LOW_TIME_THRESHOLD = 20;
const HINT_FIELDS = ["habitat", "diet", "family", "defence"];
const TOTAL_HINTS = HINT_FIELDS.length;
const AUTO_ADVANCE_DELAY = 3200;

// State
let dinosaurs = [];
let target = null;
let hintsUsed = 0;
let guesses = 0;
let timeLeft = START_TIME;
let timerId = null;
let advanceTimeoutId = null;
let gameOver = false;

// Elements
const timerEl = document.getElementById("timer");
const timerBox = document.querySelector(".timer-box");
const guessCountEl = document.getElementById("guessCount");
const hintCountEl = document.getElementById("hintCount");
const hintBtn = document.getElementById("hintBtn");
const digBtn = document.getElementById("digBtn");
const guessForm = document.getElementById("guessForm");
const guessInput = document.getElementById("guessInput");
const giveUpBtn = document.getElementById("giveUpBtn");
const messageEl = document.getElementById("message");
const advanceTrack = document.getElementById("advanceTrack");
const advanceBar = document.getElementById("advanceBar");
const periodValueEl = document.getElementById("val-period");
const suggestionsEl = document.getElementById("suggestions");

// Saved Copy
const SNAPSHOT_KEY = "cryptozoic-snapshot";

function saveSnapshot(list) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ savedAt: new Date().toISOString(), dinosaurs: list }));
  } catch (e) {}
}

function loadSnapshot() {
  try {
    const saved = JSON.parse(localStorage.getItem(SNAPSHOT_KEY));
    return saved && Array.isArray(saved.dinosaurs) ? saved.dinosaurs : null;
  } catch (e) {
    return null;
  }
}

// API
async function fetchDinosaurs() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/dinosaurs`, {
      headers: { "X-API-Key": API_KEY }
    });
    if (!res.ok) {
      throw new Error(`API request failed: ${res.status}`);
    }
    const data = await res.json();
    saveSnapshot(data.dinosaurs);   
    return data.dinosaurs;
  } catch (err) {
    console.warn("API unavailable, using saved copy", err);
    const snapshot = loadSnapshot();
    if (snapshot) return snapshot;   
    throw err;                       
  }
}

// game setup
async function startNewRound() {
  clearTimeout(advanceTimeoutId);
  resetState();
  setMessage("Digging up a creature...", null);
  lockControls(true);

  try {
    if (dinosaurs.length === 0) {
      dinosaurs = await fetchDinosaurs();
    }
    target = dinosaurs[Math.floor(Math.random() * dinosaurs.length)];
    periodValueEl.textContent = target.period;
    setMessage("", null);
  } catch (err) {
    setMessage("Couldn't reach the DinoBase API. Check API_BASE_URL in script.js.", "lose");
    console.error(err);
    return;
  }

  lockControls(false);
  startTimer();
  guessInput.focus();
}

function resetState() {
  clearInterval(timerId);
  gameOver = false;
  hintsUsed = 0;
  guesses = 0;
  timeLeft = START_TIME;

  updateTimerDisplay();
  timerBox.classList.remove("low");
  guessCountEl.textContent = guesses;
  hintCountEl.textContent = `${TOTAL_HINTS - hintsUsed}/${TOTAL_HINTS}`;

  document.querySelectorAll(".clue-row").forEach((row, i) => {
    row.classList.remove("revealed");
    if (i > 0) row.classList.add("locked");
  });
  HINT_FIELDS.forEach(field => {
    document.getElementById(`val-${field}`).textContent = "";
  });

  guessInput.value = "";
  closeSuggestions();
  setMessage("", null);
  hideAdvanceBar();
}

function lockControls(locked) {
  guessInput.disabled = locked;
  guessForm.querySelector(".submit-btn").disabled = locked;
  hintBtn.disabled = locked || hintsUsed >= TOTAL_HINTS;
  giveUpBtn.disabled = locked;
}

// timer
function updateTimerDisplay() {
  timerEl.textContent = timeLeft;
  timerBox.style.setProperty("--p", Math.max(timeLeft, 0) / START_TIME);
}

function startTimer() {
  timerId = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    timerBox.classList.toggle("low", timeLeft <= LOW_TIME_THRESHOLD && timeLeft > 0);
    if (timeLeft <= 0) {
      endGame(false, "timeout");
    }
  }, 1000);
}

// hints
hintBtn.addEventListener("click", () => {
  if (gameOver || hintsUsed >= TOTAL_HINTS) return;

  const field = HINT_FIELDS[hintsUsed];
  const row = document.querySelector(`.clue-row[data-field="${field}"]`);
  document.getElementById(`val-${field}`).textContent = target[field];
  row.classList.remove("locked");
  row.classList.add("revealed");

  hintsUsed++;
  hintCountEl.textContent = `${TOTAL_HINTS - hintsUsed}/${TOTAL_HINTS}`;
  if (hintsUsed >= TOTAL_HINTS) hintBtn.disabled = true;
});

// guessing
guessForm.addEventListener("submit", (e) => {
  e.preventDefault();
  closeSuggestions();
  if (gameOver) return;

  const guess = guessInput.value.trim().toLowerCase();
  if (!guess) return;

  guesses++;
  guessCountEl.textContent = guesses;

  const correctName = target.name.toLowerCase();
  const correctScientific = target.scientific_name.toLowerCase();

  if (guess === correctName || guess === correctScientific) {
    endGame(true);
  } else {
    setMessage("Not quite — try another guess.", "lose");
    guessForm.classList.remove("shake");
    void guessForm.offsetWidth;
    guessForm.classList.add("shake");
    guessInput.value = "";
    guessInput.focus();
  }
});

// suggestions
const MAX_SUGGESTIONS = 6;
let suggestionItems = [];
let activeSuggestion = -1;

function closeSuggestions() {
  suggestionsEl.hidden = true;
  suggestionsEl.textContent = "";
  suggestionItems = [];
  activeSuggestion = -1;
  guessInput.setAttribute("aria-expanded", "false");
}

// 
function matchRank(dino, query) {
  const name = dino.name.toLowerCase();
  const sci = (dino.scientific_name || "").toLowerCase();
  if (name.startsWith(query)) return 0;
  if (name.split(/[\s-]+/).some(w => w.startsWith(query))) return 1;
  if (name.includes(query)) return 2;
  if (sci.startsWith(query)) return 3;
  if (sci.includes(query)) return 4;
  return -1;
}

function highlight(text, query) {
  const frag = document.createDocumentFragment();
  const i = text.toLowerCase().indexOf(query);
  if (i === -1) {
    frag.append(text);
    return frag;
  }
  const mark = document.createElement("mark");
  mark.textContent = text.slice(i, i + query.length);
  frag.append(text.slice(0, i), mark, text.slice(i + query.length));
  return frag;
}

function updateSuggestions() {
  const query = guessInput.value.trim().toLowerCase();
  if (!query || gameOver || guessInput.disabled) {
    closeSuggestions();
    return;
  }

  const matches = dinosaurs
    .map(d => ({ d, rank: matchRank(d, query) }))
    .filter(m => m.rank !== -1)
    .sort((a, b) => a.rank - b.rank || a.d.name.localeCompare(b.d.name))
    .slice(0, MAX_SUGGESTIONS);

  if (matches.length === 0) {
    closeSuggestions();
    return;
  }

  suggestionsEl.textContent = "";
  activeSuggestion = -1;
  suggestionItems = matches.map(({ d }) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");

    const nameSpan = document.createElement("span");
    nameSpan.append(highlight(d.name, query));
    li.append(nameSpan);

    if (d.scientific_name) {
      const sci = document.createElement("span");
      sci.className = "sci";
      sci.textContent = d.scientific_name;
      li.append(sci);
    }

    // mousedown keeps focus on the input
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      pickSuggestion(d.name);
    });
    suggestionsEl.append(li);
    return li;
  });

  suggestionsEl.hidden = false;
  guessInput.setAttribute("aria-expanded", "true");
}

function setActiveSuggestion(index) {
  suggestionItems.forEach(li => li.classList.remove("active"));
  activeSuggestion = index;
  if (index >= 0) {
    suggestionItems[index].classList.add("active");
    suggestionItems[index].scrollIntoView({ block: "nearest" });
  }
}

// input and submit
function pickSuggestion(name) {
  guessInput.value = name;
  closeSuggestions();
  guessForm.requestSubmit();
}

guessInput.addEventListener("input", updateSuggestions);
guessInput.addEventListener("blur", closeSuggestions);

guessInput.addEventListener("keydown", (e) => {
  if (suggestionsEl.hidden) return;
  const count = suggestionItems.length;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    setActiveSuggestion((activeSuggestion + 1) % count);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setActiveSuggestion((activeSuggestion - 1 + count) % count);
  } else if (e.key === "Enter" && activeSuggestion >= 0) {
    e.preventDefault();
    pickSuggestion(suggestionItems[activeSuggestion].querySelector("span").textContent);
  } else if (e.key === "Escape") {
    closeSuggestions();
  }
});

// Give up
giveUpBtn.addEventListener("click", () => {
  if (gameOver) return;
  endGame(false, "giveup");
});

// Skip to new creature
digBtn.addEventListener("click", () => {
  digBtn.classList.remove("spin");
  void digBtn.offsetWidth;
  digBtn.classList.add("spin");
  startNewRound();
});

// End game
function endGame(won, reason) {
  gameOver = true;
  clearInterval(timerId);
  timerBox.classList.remove("low");
  lockControls(true);
  hintBtn.disabled = true;

  revealAllClues();

  if (won) {
    setMessage(`Correct! It was the ${target.name}.`, "win");
  } else if (reason === "timeout") {
    setMessage(`Time's up — it was the ${target.name}.`, "lose");
  } else {
    setMessage(`It was the ${target.name}.`, "lose");
  }

  showAdvanceBar();
  advanceTimeoutId = setTimeout(startNewRound, AUTO_ADVANCE_DELAY);
}

// Reveal the remaining clues
function revealAllClues() {
  HINT_FIELDS.forEach(field => {
    document.getElementById(`val-${field}`).textContent = target[field];
    const row = document.querySelector(`.clue-row[data-field="${field}"]`);
    row.classList.remove("locked");
    row.classList.add("revealed");
  });
}

function setMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = "message" + (type ? ` ${type}` : "");
}

function showAdvanceBar() {
  advanceTrack.classList.remove("active");
  advanceBar.style.animation = "none";
  void advanceBar.offsetWidth;
  advanceBar.style.animation = `countdown linear forwards`;
  advanceBar.style.animationDuration = `${AUTO_ADVANCE_DELAY}ms`;
  advanceTrack.classList.add("active");
}

function hideAdvanceBar() {
  advanceTrack.classList.remove("active");
}

startNewRound();

// service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}