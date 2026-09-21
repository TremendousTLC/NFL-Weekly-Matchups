// ============================================================
// GLOBAL STATE
// ============================================================
let scheduleData = null;   // weeks["1"].games[]
let scoresData = null;     // scores by gameId
let players = [];          // ["Terry", "Jim", ...]
let currentPlayer = null;
let currentWeek = 1;

// picks[player][week][gameId] = "Team"
let picks = {};

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
  banner.innerHTML = "";

  Object.keys(teamLogos).forEach(team => {
    const img = document.createElement("img");
    img.src = teamLogos[team];
    img.className = "teamLogo";
    banner.appendChild(img);
  });
}


// ============================================================
// WEEK DETECTION (your original working version)
// ============================================================
function detectCurrentNFLWeek(schedule) {
  const today = new Date();
  for (let w = 1; w <= 18; w++) {
    const weekKey = String(w);
    const games = schedule.weeks[weekKey].games;
    const dates = games.map(g => new Date(`${g.date} 2026`));
    const lastGame = dates.reduce((a, b) => a > b ? a : b);
    if (today <= lastGame) {
      return w;
    }
  }
  return 18;
}


// ============================================================
// INITIAL LOAD — schedule + scores + picks from backend
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  Promise.all([
    fetch("2026_NFL_schedule.json").then(r => r.json()),
    fetch("scores_2026.json").then(r => r.json()),
    fetch("/onrender/getPicks").then(r => r.json())   // backend load
  ])
  .then(([scheduleJson, scoresJson, backendPicks]) => {

    scheduleData = scheduleJson.weeks;
    scoresData = scoresJson.weeks || scoresJson;

    picks = backendPicks || {};

    // detect correct week
    currentWeek = detectCurrentNFLWeek(scheduleJson);
    document.getElementById("current-week-label").textContent = `Week ${currentWeek}`;

    loadLogoBanner();
    initPlayerPanel();
    renderPlayerList();
    renderPicksForWeek(currentWeek);
  })
  .catch(err => {
    console.error("INIT ERROR:", err);
  });
});


// ============================================================
// PLAYER PANEL LOGIC
// ============================================================
function initPlayerPanel() {
  document.getElementById("add-player-btn").onclick = addPlayer;
  document.getElementById("delete-player-btn").onclick = deletePlayer;
  document.getElementById("player-list").onchange = selectPlayer;
  document.getElementById("show-weekly-picks-btn").onclick = () => {
    renderPicksForWeek(currentWeek);
  };

  document.getElementById("prev-week-btn").onclick = () => changeWeek(-1);
  document.getElementById("next-week-btn").onclick = () => changeWeek(1);

  document.getElementById("submit-picks-btn").onclick = submitPicks;
  document.getElementById("edit-picks-btn").onclick = () => {
    updateDetails("Edit mode enabled. Change picks and resubmit.");
  };
}

function addPlayer() {
  const name = document.getElementById("player-name-input").value.trim();
  if (!name) return;

  if (!players.includes(name)) {
    players.push(name);
  }

  if (!picks[name]) picks[name] = {};

  currentPlayer = name;
  renderPlayerList();
  updateDetails(`Player "${name}" added.`);
}

function deletePlayer() {
  if (!currentPlayer) return;

  players = players.filter(p => p !== currentPlayer);
  delete picks[currentPlayer];

  currentPlayer = players.length ? players[0] : null;
  renderPlayerList();
  updateDetails("Player deleted.");
}

function selectPlayer(e) {
  currentPlayer = e.target.value;
  renderPicksForWeek(currentWeek);
  updateDetails(`Selected player: ${currentPlayer}`);
}

function renderPlayerList() {
  const sel = document.getElementById("player-list");
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
// WEEK SELECTOR (patched)
// ============================================================
function changeWeek(delta) {
  currentWeek += delta;
  if (currentWeek < 1) currentWeek = 1;
  if (currentWeek > 18) currentWeek = 18;

  renderCurrentWeek();
}

function renderCurrentWeek() {
  document.getElementById("current-week-label").textContent = `Week ${currentWeek}`;
  renderPicksForWeek(currentWeek);
}


// ============================================================
// WEEKLY PICKS RENDER
// ============================================================
function renderPicksForWeek(weekKey) {
  const container = document.getElementById("weekly-picks");
  container.innerHTML = "";

  if (!currentPlayer) {
    updateDetails("Select a player to make picks.");
    return;
  }

  const weekData = scheduleData[String(weekKey)];
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
// SUBMIT PICKS — SAVE TO BACKEND (NO LOCALSTORAGE)
// ============================================================
function submitPicks() {
  if (!currentPlayer) {
    updateDetails("No player selected.");
    return;
  }

  const weekKey = currentWeek;
  const weekData = scheduleData[String(weekKey)];
  const weekPicks = picks[currentPlayer]?.[weekKey] || {};

  const totalGames = weekData.games.length;
  const madePicks = Object.keys(weekPicks).length;

  updateDetails(`Submitting ${madePicks}/${totalGames} picks…`);

  // SEND TO BACKEND
  fetch("/onrender/savePicks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player: currentPlayer,
      week: weekKey,
      picks: weekPicks
    })
  })
  .then(r => r.json())
  .then(res => {
    updateDetails(`Picks submitted successfully for ${currentPlayer}.`);
  })
  .catch(err => {
    console.error("SAVE ERROR:", err);
    updateDetails("Error submitting picks.");
  });
}


// ============================================================
// DETAILS PANEL UPDATE
// ============================================================
function updateDetails(msg) {
  document.getElementById("picks-detail-window").textContent = msg;
}

function updateDetailsPanel(weekKey) {
  if (!currentPlayer) {
    updateDetails("Select a player to make picks.");
    return;
  }

  const weekData = scheduleData[String(weekKey)];
  const weekPicks = picks[currentPlayer]?.[weekKey] || {};

  let lines = weekData.games.map(g => {
    const pick = weekPicks[g.id] || "-";
    return `${g.away} vs ${g.home}: ${pick}`;
  });

  document.getElementById("picks-detail-window").innerHTML = lines.join("<br>");
}
