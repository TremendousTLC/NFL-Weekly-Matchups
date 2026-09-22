/* ============================================================
   GLOBAL STATE
   ============================================================ */

let players = [];
let currentPlayer = null;

let currentWeek = 1;          // Weekly Picks navigation
let nflCurrentWeek = 1;       // True NFL week (fixed)

let schedule = {};            // full JSON object
let scores = [];
let teamInfo = [];

/* ============================================================
   INITIAL LOAD
   ============================================================ */

window.onload = async () => {
  await loadData();
  detectNFLWeek();
  renderNFLWeekTitle();
  renderPlayerList();
  renderCurrentWeek();
};

/* ============================================================
   LOAD JSON DATA
   ============================================================ */

async function loadData() {
  schedule = await fetch("2026_NFL_schedule.json").then(r => r.json());
  scores   = await fetch("scores_2026.json").then(r => r.json());
  teamInfo = await fetch("teamInfo.json").then(r => r.json());
}

/* ============================================================
   DETECT TRUE NFL WEEK (MATCHES YOUR JSON)
   ============================================================ */

function detectNFLWeek() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day   = today.getDate();

  const weeksObj = schedule.weeks;

  for (let w = 1; w <= 18; w++) {
    const weekData = weeksObj[w];
    if (!weekData || !weekData.games || weekData.games.length === 0) continue;

    const firstGame = weekData.games[0];

    // Parse "Sep 9" → month/day
    const [gMonthStr, gDayStr] = firstGame.date.replace(/[^\w\s]/g, "").split(" ");
    const gMonth = monthNameToNumber(gMonthStr);
    const gDay   = parseInt(gDayStr);

    if (gMonth > month || (gMonth === month && gDay >= day)) {
      nflCurrentWeek = w;
      return;
    }
  }

  nflCurrentWeek = 18;
}

function monthNameToNumber(name) {
  const map = {
    "Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,
    "Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12
  };
  return map[name] || 1;
}

/* ============================================================
   NFL WEEK TITLE
   ============================================================ */

function renderNFLWeekTitle() {
  const span = document.getElementById("current-nfl-week");
  if (span) span.textContent = `Week ${nflCurrentWeek}`;
}

/* ============================================================
   PLAYER MANAGEMENT
   ============================================================ */

function addPlayer() {
  const nameInput = document.getElementById("player-name-input");
  const name = nameInput.value.trim();
  if (!name) return;

  if (!players.includes(name)) players.push(name);
  nameInput.value = "";

  renderPlayerList();
}

function deletePlayer() {
  if (!currentPlayer) return;

  players = players.filter(p => p !== currentPlayer);
  currentPlayer = null;

  renderPlayerList();
  clearPickDetails();
}

function renderPlayerList() {
  const list = document.getElementById("player-list");
  list.innerHTML = "";

  players.forEach(player => {
    const option = document.createElement("option");
    option.value = player;
    option.textContent = player;
    list.appendChild(option);
  });

  list.onchange = () => {
    currentPlayer = list.value;
    showWeeklyPicks();
  };
}

function clearPickDetails() {
  const win = document.getElementById("picks-detail-window");
  win.innerHTML = "";
}

/* ============================================================
   WEEKLY PICKS NAVIGATION
   ============================================================ */

function changeWeek(delta) {
  currentWeek += delta;
  if (currentWeek < 1) currentWeek = 1;
  if (currentWeek > 18) currentWeek = 18;

  renderCurrentWeek();
}

function renderCurrentWeek() {
  const weekLabel = document.getElementById("current-week-label");
  if (weekLabel) weekLabel.textContent = `Week ${currentWeek}`;

  renderWeeklyPicks();
}

/* ============================================================
   WEEKLY PICKS DISPLAY (MATCHES YOUR JSON)
   ============================================================ */

function renderWeeklyPicks() {
  const container = document.getElementById("weekly-picks");
  container.innerHTML = "";

  const weekData = schedule.weeks[currentWeek];
  if (!weekData || !weekData.games) return;

  weekData.games.forEach(game => {
    const row = document.createElement("div");
    row.className = "game-row";

    const awayBtn = document.createElement("button");
    awayBtn.textContent = game.away;
    awayBtn.onclick = () => selectPick(game, game.away);

    const homeBtn = document.createElement("button");
    homeBtn.textContent = game.home;
    homeBtn.onclick = () => selectPick(game, game.home);

    row.appendChild(awayBtn);
    row.appendChild(homeBtn);
    container.appendChild(row);
  });
}

/* ============================================================
   PICK SELECTION
   ============================================================ */

function selectPick(game, team) {
  if (!currentPlayer) return;

  const win = document.getElementById("picks-detail-window");
  win.innerHTML = `
    <strong>Week ${currentWeek}</strong><br>
    ${game.away} vs ${game.home}<br>
    <strong>Pick:</strong> ${team}
  `;
}

/* ============================================================
   SHOW WEEKLY PICKS FOR PLAYER
   ============================================================ */

function showWeeklyPicks() {
  renderCurrentWeek();
}

/* ============================================================
   STANDINGS PLACEHOLDERS
   ============================================================ */

function showAFCStandings() { alert("AFC Standings coming soon!"); }
function showNFCStandings() { alert("NFC Standings coming soon!"); }
function showAFCLeaders()   { alert("AFC Leaders coming soon!"); }
function showNFCLeaders()   { alert("NFC Leaders coming soon!"); }
function showPlayoffs()     { alert("NFL Playoffs coming soon!"); }
