// ===============================
// GLOBAL STATE
// ===============================
let scheduleData = null;     // loaded from JSON
let players = [];
let currentPlayer = null;
let currentWeek = 1;
let picks = {};              // picks[player][week][gameId] = teamName

// ===============================
// LOCAL STORAGE (SAVE / LOAD)
// ===============================
function saveLocal() {
  localStorage.setItem("players", JSON.stringify(players));
  localStorage.setItem("picks", JSON.stringify(picks));
}

function loadLocal() {
  players = JSON.parse(localStorage.getItem("players") || "[]");
  picks = JSON.parse(localStorage.getItem("picks") || "{}");
}

// ===============================
// APP INIT — LOAD REAL JSON
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Loading schedule…");

  loadLocal();   // <-- Load saved players + picks first

  fetch("2026_NFL_schedule.json?v=6")
    .then(res => res.json())
    .then(data => {
      scheduleData = data.weeks;   // <-- YOUR JSON, EXACTLY
      console.log("Schedule loaded:", scheduleData);

      initLeague();
      initWeekSelector();
      renderStandings();
      renderPicksForWeek(currentWeek);
    })
    .catch(err => {
      console.error("ERROR loading schedule:", err);
    });
});

// ===============================
// LEAGUE / PLAYERS
// ===============================
function initLeague() {
  document.getElementById("add-player-btn").onclick = addPlayer;
  document.getElementById("delete-player-btn").onclick = deleteCurrentPlayer;
  document.getElementById("player-list").onchange = onPlayerChange;

  document.getElementById("submit-picks-btn").onclick = submitPicks;
  document.getElementById("edit-picks-btn").onclick = () => {
    document.getElementById("picks-detail-window").textContent =
      "Edit mode: change your picks and resubmit.";
  };

  updatePlayerListUI();
}

function addPlayer() {
  const input = document.getElementById("player-name-input");
  const name = input.value.trim();
  if (!name) return;

  if (!players.includes(name)) {
    players.push(name);
  }
  currentPlayer = name;
  if (!picks[currentPlayer]) picks[currentPlayer] = {};
  input.value = "";

  saveLocal();   // <-- Save after adding player
  updatePlayerListUI();
}

function deleteCurrentPlayer() {
  if (!currentPlayer) return;
  players = players.filter(p => p !== currentPlayer);
  delete picks[currentPlayer];
  currentPlayer = players.length ? players[0] : null;

  saveLocal();   // <-- Save after deleting player
  updatePlayerListUI();
}

function onPlayerChange(e) {
  currentPlayer = e.target.value || null;
  renderPicksForWeek(currentWeek);
}

function updatePlayerListUI() {
  const select = document.getElementById("player-list");
  select.innerHTML = "";
  players.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    select.appendChild(opt);
  });
  if (currentPlayer && players.includes(currentPlayer)) {
    select.value = currentPlayer;
  } else if (players.length) {
    currentPlayer = players[0];
    select.value = currentPlayer;
  } else {
    currentPlayer = null;
  }
  document.getElementById("total-participants").textContent = players.length;
}

// ===============================
// WEEK SELECTOR
// ===============================
function initWeekSelector() {
  document.getElementById("prev-week-btn").onclick = () => changeWeek(-1);
  document.getElementById("next-week-btn").onclick = () => changeWeek(1);
}

function changeWeek(delta) {
  const newWeek = currentWeek + delta;
  if (!scheduleData[String(newWeek)]) return;

  currentWeek = newWeek;
  document.getElementById("picks-current-week").textContent = `Week ${currentWeek}`;
  document.getElementById("current-nfl-week").textContent = currentWeek;

  renderPicksForWeek(currentWeek);
}

// ===============================
// WEEKLY PICKS RENDER
// ===============================
function renderPicksForWeek(weekKey) {
  const container = document.getElementById("weekly-picks");
  container.innerHTML = "";

  if (!scheduleData) return;

  const weekData = scheduleData[String(weekKey)];
  if (!weekData || !weekData.games) return;

  const weekPicks = currentPlayer ? (picks[currentPlayer]?.[weekKey] || {}) : {};

  weekData.games.forEach(g => {
    const row = document.createElement("div");
    row.className = "game-row";

    const awayBtn = document.createElement("button");
    awayBtn.textContent = g.away;

    const homeBtn = document.createElement("button");
    homeBtn.textContent = g.home;

    awayBtn.addEventListener("click", () => {
      if (!currentPlayer) return;
      setPick(currentPlayer, weekKey, g.id, g.away);
    });

    homeBtn.addEventListener("click", () => {
      if (!currentPlayer) return;
      setPick(currentPlayer, weekKey, g.id, g.home);
    });

    const pick = weekPicks[g.id];
    if (pick === g.away) awayBtn.classList.add("selected");
    if (pick === g.home) homeBtn.classList.add("selected");

    row.appendChild(awayBtn);
    row.appendChild(homeBtn);
    container.appendChild(row);
  });

  updatePicksDetail(weekKey);
}

// ===============================
// SET PICK
// ===============================
function setPick(player, weekKey, gameId, teamName) {
  if (!picks[player]) picks[player] = {};
  if (!picks[player][weekKey]) picks[player][weekKey] = {};

  picks[player][weekKey][gameId] = teamName;

  saveLocal();   // <-- Save after picking

  renderPicksForWeek(weekKey);
  updatePicksDetail(weekKey);
}

// ===============================
// SUBMIT PICKS (NO SCORES)
// ===============================
function submitPicks() {
  if (!currentPlayer) {
    document.getElementById("picks-detail-window").textContent =
      "Select a player before submitting picks.";
    return;
  }

  const weekKey = currentWeek;
  const weekData = scheduleData[String(weekKey)];
  const weekPicks = picks[currentPlayer]?.[weekKey] || {};

  document.getElementById("picks-detail-window").innerHTML =
    `<strong>${currentPlayer} submitted picks.</strong><br>
     Picks made: ${Object.keys(weekPicks).length} / ${weekData.games.length}`;

  saveLocal();   // <-- Save after submitting

  renderPicksForWeek(weekKey);
}

// ===============================
// STANDINGS (STATIC)
// ===============================
function renderStandings() {
  const afcDivs = ["AFC East", "AFC North", "AFC South", "AFC West"];
  const nfcDivs = ["NFC East", "NFC North", "NFC South", "NFC West"];

  const afcTeams = [
    "Bills", "Dolphins", "Patriots", "Jets",
    "Ravens", "Bengals", "Browns", "Steelers",
    "Texans", "Colts", "Jaguars", "Titans",
    "Broncos", "Chiefs", "Raiders", "Chargers"
  ];

  const nfcTeams = [
    "Cowboys", "Giants", "Eagles", "Commanders",
    "Packers", "Bears", "Lions", "Vikings",
    "Falcons", "Panthers", "Saints", "Buccaneers",
    "Cardinals", "Rams", "49ers", "Seahawks"
  ];

  const afcStandings = document.getElementById("afc-standings");
  const nfcStandings = document.getElementById("nfc-standings");
  const afcBest = document.getElementById("afc-best");
  const nfcBest = document.getElementById("nfc-best");

  afcStandings.innerHTML = "";
  nfcStandings.innerHTML = "";
  afcBest.innerHTML = "";
  nfcBest.innerHTML = "";

  afcDivs.forEach(div => {
    const block = document.createElement("div");
    block.className = "conference-block";
    const title = document.createElement("h4");
    title.textContent = div;
    block.appendChild(title);
    afcStandings.appendChild(block);
  });

  nfcDivs.forEach(div => {
    const block = document.createElement("div");
    block.className = "conference-block";
    const title = document.createElement("h4");
    title.textContent = div;
    block.appendChild(title);
    nfcStandings.appendChild(block);
  });

  afcTeams.forEach(t => {
    const row = document.createElement("div");
    row.className = "team-row";
    const name = document.createElement("div");
    name.className = "team-name";
    name.textContent = t;
    row.appendChild(name);
    for (let i = 0; i < 5; i++) {
      const cell = document.createElement("div");
      cell.textContent = "0";
      row.appendChild(cell);
    }
    afcBest.appendChild(row);
  });

  nfcTeams.forEach(t => {
    const row = document.createElement("div");
    row.className = "team-row";
    const name = document.createElement("div");
    name.className = "team-name";
    name.textContent = t;
    row.appendChild(name);
    for (let i = 0; i < 5; i++) {
      const cell = document.createElement("div");
      cell.textContent = "0";
      row.appendChild(cell);
    }
    nfcBest.appendChild(row);
  });
}

// ===============================
// DETAIL WINDOW
// ===============================
function updatePicksDetail(weekKey) {
  const div = document.getElementById("picks-detail-window");

  if (!currentPlayer) {
    div.textContent = "Select a player to make picks.";
    return;
  }

  if (!scheduleData) return;

  const weekData = scheduleData[String(weekKey)];
  const weekPicks = picks[currentPlayer]?.[weekKey] || {};

  const lines = weekData.games.map(g => {
    const pick = weekPicks[g.id] || "-";
    return `${g.away} vs ${g.home}: ${pick}`;
  });

  div.innerHTML = lines.join("<br>");
}