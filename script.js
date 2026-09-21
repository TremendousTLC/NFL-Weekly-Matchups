// ============================================================
// GLOBAL STATE
// ============================================================
let scheduleData = null;
let scoresData = null;
let players = [];
let currentPlayer = null;
let currentWeek = 1;

// picks[player][week][gameId] = "Team"
let picks = {};


// ============================================================
// BACKEND API BASE
// ============================================================
const API_BASE = "https://nfl-pickem-backend.onrender.com";


// ============================================================
// TEAM LOGOS
// ============================================================
const teamLogos = {
  ARI: "LOGOS/ARI.PNG",
  ATL: "LOGOS/ATL.PNG",
  BAL: "LOGOS/BAL.PNG",
  BUF: "LOGOS/BUF.PNG",
  CAR: "LOGOS/CAR.PNG",
  CHI: "LOGOS/CHI.PNG",
  CIN: "LOGOS/CIN.PNG",
  CLE: "LOGOS/CLE.PNG",
  DAL: "LOGOS/DAL.PNG",
  DEN: "LOGOS/DEN.PNG",
  DET: "LOGOS/DET.PNG",
  GB:  "LOGOS/GB.PNG",
  HOU: "LOGOS/HOU.PNG",
  IND: "LOGOS/IND.PNG",
  JAX: "LOGOS/JAX.PNG",
  KC:  "LOGOS/KC.PNG",
  LAC: "LOGOS/LAC.PNG",
  LAR: "LOGOS/LAR.PNG",
  LV:  "LOGOS/LV.PNG",
  MIA: "LOGOS/MIA.PNG",
  MIN: "LOGOS/MIN.PNG",
  NE:  "LOGOS/NE.PNG",
  NO:  "LOGOS/NO.PNG",
  NYG: "LOGOS/NYG.PNG",
  NYJ: "LOGOS/NYJ.PNG",
  PHI: "LOGOS/PHI.PNG",
  PIT: "LOGOS/PIT.PNG",
  SEA: "LOGOS/SEA.PNG",
  SF:  "LOGOS/SF.PNG",
  WAS: "LOGOS/WAS.PNG",
  TEN: "LOGOS/TEN.PNG"
};

function loadLogoBanner() {
  const banner = document.getElementById("logo-banner");
  if (!banner) return;
  banner.innerHTML = "";

  Object.keys(teamLogos).forEach(team => {
    const img = document.createElement("img");
    img.src = teamLogos[team];
    img.className = "teamLogo";
    banner.appendChild(img);
  });
}


// ============================================================
// WEEK DETECTION
// ============================================================
function detectCurrentNFLWeek(schedule) {
  const today = new Date();
  for (let w = 1; w <= 18; w++) {
    const weekKey = String(w);
    const games = schedule.weeks[weekKey].games;
    const dates = games.map(g => new Date(`${g.date} 2026`));
    const lastGame = dates.reduce((a, b) => (a > b ? a : b));
    if (today <= lastGame) return w;
  }
  return 18;
}


// ============================================================
// BACKEND LOAD/SAVE
// ============================================================
async function loadPicks() {
  try {
    const res = await fetch(`${API_BASE}/picks/2026`);
    const data = await res.json();
    picks = data.players || {};
    return picks;
  } catch (err) {
    console.error("Error loading picks:", err);
    return {};
  }
}

async function savePicks(player, week, weekPicks) {
  try {
    const res = await fetch(`${API_BASE}/picks/2026/${player}/${week}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(weekPicks)
    });
    return await res.json();
  } catch (err) {
    console.error("Error saving picks:", err);
  }
}


// ============================================================
// INITIAL LOAD
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const scheduleJson = await fetch("2026_NFL_schedule.json").then(r => r.json());
    const scoresJson   = await fetch("scores_2026.json").then(r => r.json());
    const backendPicks = await loadPicks();

    scheduleData = scheduleJson.weeks;
    scoresData   = scoresJson.weeks || scoresJson;
    picks        = backendPicks || {};

    // Build players list from picks
    players = Object.keys(picks);
    if (players.length > 0) {
      currentPlayer = players[0];
    }

    currentWeek = detectCurrentNFLWeek(scheduleJson);

    const weekLabel = document.getElementById("current-week-label");
    if (weekLabel) weekLabel.textContent = `Week ${currentWeek}`;

    const nflWeekSpan = document.getElementById("current-nfl-week");
    if (nflWeekSpan) nflWeekSpan.textContent = `Current NFL Week: ${currentWeek}`;

    loadLogoBanner();
    initPlayerPanel();
    renderPlayerList();

    if (currentPlayer) {
      renderPicksForWeek(currentWeek);
      updateDetailsPanel(currentWeek);
    } else {
      updateDetails("Add a player to start making picks.");
    }

  } catch (err) {
    console.error("INIT ERROR:", err);
  }
});


// ============================================================
// PLAYER PANEL LOGIC
// ============================================================
function initPlayerPanel() {
  const addBtn = document.getElementById("add-player-btn");
  const delBtn = document.getElementById("delete-player-btn");
  const sel    = document.getElementById("player-list");
  const showWeeklyBtn = document.getElementById("show-weekly-picks-btn");
  const prevWeekBtn   = document.getElementById("prev-week-btn");
  const nextWeekBtn   = document.getElementById("next-week-btn");
  const submitBtn     = document.getElementById("submit-picks-btn");
  const editBtn       = document.getElementById("edit-picks-btn");

  if (addBtn) addBtn.onclick = addPlayer;
  if (delBtn) delBtn.onclick = deletePlayer;
  if (sel)    sel.onchange  = selectPlayer;

  // This button now shows submitted results, not the pick UI
  if (showWeeklyBtn) {
    showWeeklyBtn.onclick = () => {
      if (!currentPlayer) {
        updateDetails("Select a player to view submitted picks.");
        return;
      }
      showSubmittedResults(currentPlayer, currentWeek);
    };
  }

  if (prevWeekBtn) prevWeekBtn.onclick = () => changeWeek(-1);
  if (nextWeekBtn) nextWeekBtn.onclick = () => changeWeek(1);

  if (submitBtn) submitBtn.onclick = submitPicks;
  if (editBtn)   editBtn.onclick   = () => {
    updateDetails("Edit mode enabled. Change picks and resubmit.");
  };
}

function addPlayer() {
  const input = document.getElementById("player-name-input");
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;

  if (!players.includes(name)) players.push(name);
  if (!picks[name]) picks[name] = {};

  currentPlayer = name;
  renderPlayerList();
  renderPicksForWeek(currentWeek);
  updateDetails(`Player "${name}" added.`);
}

function deletePlayer() {
  if (!currentPlayer) return;

  players = players.filter(p => p !== currentPlayer);
  delete picks[currentPlayer];

  currentPlayer = players.length ? players[0] : null;
  renderPlayerList();

  if (currentPlayer) {
    renderPicksForWeek(currentWeek);
    updateDetails(`Player deleted. Now selected: ${currentPlayer}`);
  } else {
    document.getElementById("weekly-picks").innerHTML = "";
    updateDetails("No players. Add a player to start.");
  }
}

function selectPlayer(e) {
  currentPlayer = e.target.value;
  renderPicksForWeek(currentWeek);
  updateDetails(`Selected player: ${currentPlayer}`);
}

function renderPlayerList() {
  const sel = document.getElementById("player-list");
  if (!sel) return;

  sel.innerHTML = "";

  players.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  });

  if (currentPlayer) sel.value = currentPlayer;
}


// ============================================================
// WEEK SELECTOR
// ============================================================
function changeWeek(delta) {
  currentWeek += delta;
  if (currentWeek < 1) currentWeek = 1;
  if (currentWeek > 18) currentWeek = 18;

  renderCurrentWeek();
}

function renderCurrentWeek() {
  const weekLabel = document.getElementById("current-week-label");
  if (weekLabel) weekLabel.textContent = `Week ${currentWeek}`;

  const nflWeekSpan = document.getElementById("current-nfl-week");
  if (nflWeekSpan) nflWeekSpan.textContent = `Current NFL Week: ${currentWeek}`;

  renderPicksForWeek(currentWeek);
  updateDetailsPanel(currentWeek);
}


// ============================================================
// WEEKLY PICKS RENDER
// ============================================================
function renderPicksForWeek(weekKey) {
  const container = document.getElementById("weekly-picks");
  if (!container) return;
  container.innerHTML = "";

  if (!currentPlayer) {
    updateDetails("Select a player to make picks.");
    return;
  }

  const weekData = scheduleData[String(weekKey)];

if (!weekData) {
  updateDetails(`No schedule data for Week ${weekKey}.`);
  return;
}

// ⭐ Show Teams on Bye (NOW it works)
if (weekData.byes && weekData.byes.length > 0) {
  const byeDiv = document.createElement("div");
  byeDiv.className = "bye-section";
  byeDiv.innerHTML = `<strong>Teams on Bye:</strong> ${weekData.byes.join(", ")}`;
  container.appendChild(byeDiv);
}
 
  if (!weekData) {
    updateDetails(`No schedule data for Week ${weekKey}.`);
    return;
  }

  const weekPicks = picks[currentPlayer]?.[weekKey] || {};

  weekData.games.forEach(g => {
    const row = document.createElement("div");
    row.className = "game-row";

    const awayBtn = document.createElement("button");
    awayBtn.textContent = g.away;

    const homeBtn = document.createElement("button");
    homeBtn.textContent = g.home;

    awayBtn.onclick = () => setPick(currentPlayer, weekKey, g.id, g.away);
    homeBtn.onclick = () => setPick(currentPlayer, weekKey, g.id, g.home);

    const pick = weekPicks[g.id];
    if (pick === g.away) awayBtn.classList.add("selected");
    if (pick === g.home) homeBtn.classList.add("selected");

    row.appendChild(awayBtn);
    row.appendChild(homeBtn);
    container.appendChild(row);
  });

  updateDetailsPanel(weekKey);
}


// ============================================================
// SET PICK
// ============================================================
function setPick(player, weekKey, gameId, teamName) {
  if (!picks[player]) picks[player] = {};
  if (!picks[player][weekKey]) picks[player][weekKey] = {};

  picks[player][weekKey][gameId] = teamName;

  renderPicksForWeek(weekKey);
}


// ============================================================
// SUBMIT PICKS
// ============================================================
function submitPicks() {
  if (!currentPlayer) {
    updateDetails("No player selected.");
    return;
  }

  const weekKey = currentWeek;
  const weekData = scheduleData[String(weekKey)];
  if (!weekData) {
    updateDetails(`No schedule data for Week ${weekKey}.`);
    return;
  }

  const weekPicks = {};

  weekData.games.forEach(g => {
    const pick = picks[currentPlayer]?.[weekKey]?.[g.id] || null;
    if (pick) weekPicks[g.id] = pick;
  });

  const totalGames = weekData.games.length;
  const madePicks = Object.keys(weekPicks).length;

  updateDetails(`Submitting ${madePicks}/${totalGames} picks…`);

  savePicks(currentPlayer, weekKey, weekPicks)
    .then(() => {
      updateDetails(`Picks submitted successfully for ${currentPlayer}.`);
      showSubmittedResults(currentPlayer, weekKey);
    })
    .catch(err => {
      console.error("SAVE ERROR:", err);
      updateDetails("Error submitting picks.");
    });
}


// ============================================================
// RESULTS / DETAILS PANEL
// ============================================================
function updateDetails(msg) {
  const el = document.getElementById("picks-detail-window");
  if (!el) return;
  el.textContent = msg;
}

function updateDetailsPanel(weekKey) {
  if (!currentPlayer) {
    updateDetails("Select a player to make picks.");
    return;
  }

  const weekData = scheduleData[String(weekKey)];
  if (!weekData) {
    updateDetails(`No schedule data for Week ${weekKey}.`);
    return;
  }

  const weekPicks = picks[currentPlayer]?.[weekKey] || {};

  let lines = weekData.games.map(g => {
    const pick = weekPicks[g.id] || "-";
    return `${g.away} vs ${g.home}: ${pick}`;
  });

  const el = document.getElementById("picks-detail-window");
  if (!el) return;
  el.innerHTML = lines.join("<br>");
}

// Show submitted results explicitly (used by Show Weekly Picks button)
function showSubmittedResults(player, week) {
  const el = document.getElementById("picks-detail-window");
  if (!el) return;

  const weekData = scheduleData[String(week)];
  if (!weekData) {
    el.textContent = `No schedule data for Week ${week}.`;
    return;
  }

  const weekPicks = picks[player]?.[week] || {};

  let html = `<strong>${player}'s Picks for Week ${week}</strong><br><br>`;

  weekData.games.forEach(g => {
    const pick = weekPicks[g.id] || "-";
    html += `${g.away} vs ${g.home}: ${pick}<br>`;
  });

  el.innerHTML = html;
}