// ===== DATA =====
const scheduleData = {
  weeks: {
    1: {
      games: [
        { id: "W1G1", away: "Patriots", home: "Seahawks" },
        { id: "W1G2", away: "49ers", home: "Rams" },
        { id: "W1G3", away: "Bears", home: "Panthers" },
        { id: "W1G4", away: "Buccaneers", home: "Bengals" },
        { id: "W1G5", away: "Saints", home: "Lions" },
        { id: "W1G6", away: "Bills", home: "Texans" },
        { id: "W1G7", away: "Ravens", home: "Colts" },
        { id: "W1G8", away: "Browns", home: "Jaguars" },
        { id: "W1G9", away: "Falcons", home: "Steelers" },
        { id: "W1G10", away: "Jets", home: "Titans" },
        { id: "W1G11", away: "Cardinals", home: "Chargers" },
        { id: "W1G12", away: "Dolphins", home: "Raiders" },
        { id: "W1G13", away: "Packers", home: "Vikings" }
      ]
    }
  }
};

// simple scores for demo
const scoresData = {
  1: {
    W1G1: { winner: "Seahawks" },
    W1G2: { winner: "49ers" },
    W1G3: { winner: "Panthers" },
    W1G4: { winner: "Buccaneers" },
    W1G5: { winner: "Lions" },
    W1G6: { winner: "Bills" },
    W1G7: { winner: "Ravens" },
    W1G8: { winner: "Jaguars" },
    W1G9: { winner: "Steelers" },
    W1G10: { winner: "Titans" },
    W1G11: { winner: "Chargers" },
    W1G12: { winner: "Dolphins" },
    W1G13: { winner: "Packers" }
  }
};

// players and picks
let players = [];
let currentPlayer = null;
let currentWeek = 1;
// picks[player][week][gameId] = teamName
let picks = {};

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("initApp() starting");
  initLeague();
  initWeekSelector();
  renderPicksForWeek(currentWeek);
  renderStandings();
  console.log("initApp() complete");
});

// ===== LEAGUE / PLAYERS =====
function initLeague() {
  document.getElementById("add-player-btn").onclick = addPlayer;
  document.getElementById("delete-player-btn").onclick = deleteCurrentPlayer;
  document.getElementById("player-list").onchange = onPlayerChange;

  document.getElementById("submit-picks-btn").onclick = submitPicks;
  document.getElementById("edit-picks-btn").onclick = () => {
    document.getElementById("picks-detail-window").textContent = "Edit mode: change your picks and resubmit.";
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
  updatePlayerListUI();
}

function deleteCurrentPlayer() {
  if (!currentPlayer) return;
  players = players.filter(p => p !== currentPlayer);
  delete picks[currentPlayer];
  currentPlayer = players.length ? players[0] : null;
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

// ===== WEEK SELECTOR =====
function initWeekSelector() {
  document.getElementById("prev-week-btn").onclick = () => changeWeek(-1);
  document.getElementById("next-week-btn").onclick = () => changeWeek(1);
}

function changeWeek(delta) {
  const newWeek = currentWeek + delta;
  if (!scheduleData.weeks[newWeek]) return;
  currentWeek = newWeek;
  document.getElementById("picks-current-week").textContent = `Week ${currentWeek}`;
  document.getElementById("current-nfl-week").textContent = currentWeek;
  renderPicksForWeek(currentWeek);
}

// ===== WEEKLY PICKS RENDER =====
function renderPicksForWeek(weekKey) {
  const container = document.getElementById("weekly-picks");
  container.innerHTML = "";

  const weekData = scheduleData.weeks[weekKey];
  if (!weekData || !weekData.games) return;

  const weekPicks = currentPlayer ? (picks[currentPlayer]?.[weekKey] || {}) : {};
  const weekScores = scoresData[weekKey] || {};

  weekData.games.forEach(g => {
    const row = document.createElement("div");
    row.className = "game-row";

    const awayBtn = document.createElement("button");
    awayBtn.textContent = g.away;

    const homeBtn = document.createElement("button");
    homeBtn.textContent = g.home;

    // CLICK HANDLERS — GUARANTEED TO FIRE
    awayBtn.addEventListener("click", () => {
      if (!currentPlayer) return;
      setPick(currentPlayer, weekKey, g.id, g.away);
    });

    homeBtn.addEventListener("click", () => {
      if (!currentPlayer) return;
      setPick(currentPlayer, weekKey, g.id, g.home);
    });

    // HIGHLIGHT SELECTED PICK
    const pick = weekPicks[g.id];
    if (pick === g.away) awayBtn.classList.add("selected");
    if (pick === g.home) homeBtn.classList.add("selected");

    // WINNER / CORRECT / WRONG BORDERS
    const score = weekScores[g.id];
    if (score && score.winner) {
      row.classList.add("nfl-winner");

      if (pick) {
        if (pick === score.winner) {
          row.classList.add("correct-pick");
        } else {
          row.classList.add("wrong-pick");
        }
      }
    }

    row.appendChild(awayBtn);
    row.appendChild(homeBtn);
    container.appendChild(row);
  });

  updatePicksDetail(weekKey);
}

function setPick(player, weekKey, gameId, teamName) {
  // Ensure player exists in picks structure
  if (!picks[player]) picks[player] = {};
  if (!picks[player][weekKey]) picks[player][weekKey] = {};

  // Save the pick
  picks[player][weekKey][gameId] = teamName;

  console.log("Pick saved:", player, weekKey, gameId, teamName);

  // Re-render the week so highlight updates instantly
  renderPicksForWeek(weekKey);

  // Update detail window
  updatePicksDetail(weekKey);
}

// ===== SUBMIT PICKS =====
function submitPicks() {
  if (!currentPlayer) {
    document.getElementById("picks-detail-window").textContent =
      "Select a player before submitting picks.";
    return;
  }

  const weekKey = currentWeek;
  const weekData = scheduleData.weeks[weekKey];
  const weekScores = scoresData[weekKey] || {};
  const weekPicks = picks[currentPlayer]?.[weekKey] || {};

  let correct = 0;
  let total = weekData.games.length;

  weekData.games.forEach(g => {
    const pick = weekPicks[g.id];
    const score = weekScores[g.id];

    if (pick && score && score.winner) {
      if (pick === score.winner) {
        correct++;
      }
    }
  });

  // Update detail window
  document.getElementById("picks-detail-window").textContent =
    `${currentPlayer} submitted picks: ${correct} correct out of ${total} games.`;

  // Re-render to apply correct/wrong borders
  renderPicksForWeek(weekKey);
}

// ===== STANDINGS (simple demo) =====
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

// ===== DETAIL =====
function updatePicksDetail(weekKey) {
  const div = document.getElementById("picks-detail-window");

  // No player selected
  if (!currentPlayer) {
    div.textContent = "Select a player to make picks.";
    return;
  }

  const weekData = scheduleData.weeks[weekKey];
  const weekPicks = picks[currentPlayer]?.[weekKey] || {};

  // Build readable list of picks
  const lines = weekData.games.map(g => {
    const pick = weekPicks[g.id] || "-";
    return `${g.away} vs ${g.home}: ${pick}`;
  });

  div.textContent = lines.join("\n");
}