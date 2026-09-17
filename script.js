// --- CONFIG / STATE ---

const SCHEDULE_URL = "2026_NFL_schedule.json";
const TEAMINFO_URL = "teamInfo.json";

let scheduleData = null;
let teamInfo = null;
let currentWeek = null;

let currentPlayer = null;

// localStorage keys
const LS_PLAYERS = "pickem_players";
const LS_PICKS = "pickem_picks";

// in-memory caches
let players = {};
let picks = {};

// --- API FETCH ---

async function loadNFLScores() {
  const url = "https://api-football-v1.p.rapidapi.com/v3/fixtures?league=210&season=2026";

  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "YOUR_API_KEY_HERE",
      "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com"
    }
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data.response; // array of games
  } catch (err) {
    console.error("Error fetching NFL scores:", err);
    return [];
  }
}

function mapScoresToSchedule(apiGames) {
  const scoreMap = {}; // week → gameIndex → score

  Object.keys(scheduleData.weeks).forEach(weekKey => {
    scoreMap[weekKey] = {};
  });

  apiGames.forEach(apiGame => {
    const week = apiGame.league.round.replace("Regular Season - ", "");
    const weekKey = String(week);

    const awayName = apiGame.teams.away.name;
    const homeName = apiGame.teams.home.name;

    const awayScore = apiGame.goals.away;
    const homeScore = apiGame.goals.home;

    const scoreString = `${awayScore}-${homeScore}`;

    const games = scheduleData.weeks[weekKey].games;

    games.forEach((g, idx) => {
      // match by fullName from teamInfo
      if (teamInfo[g.away].fullName === awayName ||
          teamInfo[g.home].fullName === homeName) {
        scoreMap[weekKey][idx] = scoreString;
      }
    });
  });

  return scoreMap;
}

// --- TEAM LOGOS ---

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
  LV:  "LOGOS/LV.PNG",
  LAC: "LOGOS/LAC.PNG",
  LAR: "LOGOS/LAR.PNG",
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
  TB:  "LOGOS/TB.PNG",
  TEN: "LOGOS/TEN.PNG",
  WAS: "LOGOS/WAS.PNG"
};

// --- INIT ---
loadLogoBanner();
loadLocalStorage();
setupUIHandlers();

Promise.all([
  fetch(SCHEDULE_URL).then(r => r.json()),
  fetch(TEAMINFO_URL).then(r => r.json())
]).then(async ([schedule, teams]) => {
  scheduleData = schedule;
  teamInfo = teams;
  currentWeek = detectCurrentNFLWeek(scheduleData);

  // ⭐ Load scores from API-Football
  const apiGames = await loadNFLScores();
  scores = mapScoresToSchedule(apiGames);

  // ⭐ Now render everything WITH scores
  renderCurrentWeek();
  renderStandings();
  renderTeamsList();
  renderNFLWeekScheduleSelector();
  renderPicksForWeek(currentWeek);   // scores now appear here
  updateLeagueStats();
});


// --- LOCAL STORAGE ---

function loadLocalStorage() {
  try {
    const p = localStorage.getItem(LS_PLAYERS);
    const pk = localStorage.getItem(LS_PICKS);
    players = p ? JSON.parse(p) : {};
    picks = pk ? JSON.parse(pk) : {};
  } catch (e) {
    players = {};
    picks = {};
  }
}

function saveLocalStorage() {
  localStorage.setItem(LS_PLAYERS, JSON.stringify(players));
  localStorage.setItem(LS_PICKS, JSON.stringify(picks));
}



// --- UI HANDLERS ---

function setupUIHandlers() {
  const setPlayerBtn = document.getElementById("set-player-btn");
  const leaderboardBtn = document.getElementById("leaderboard-btn");
  const teamsBtn = document.getElementById("teams-btn");
  const scheduleBtn = document.getElementById("schedule-btn");
  const submitPicksBtn = document.getElementById("submit-picks-btn");
  const editPicksBtn = document.getElementById("edit-picks-btn");
  const scheduleWeekSelect = document.getElementById("schedule-week-select");

  setPlayerBtn.addEventListener("click", () => {
    const nameInput = document.getElementById("player-name");
    const name = nameInput.value.trim();
    if (!name) return;
    currentPlayer = name;
    if (!players[currentPlayer]) {
      players[currentPlayer] = { displayName: currentPlayer, createdAt: new Date().toISOString() };
      saveLocalStorage();
      updateLeagueStats();
    }
    showNotification(`Current player set to ${currentPlayer}`);
  });

  leaderboardBtn.addEventListener("click", () => {
    togglePanel("leaderboard-panel");
    renderLeaderboard();
  });

  teamsBtn.addEventListener("click", () => {
    togglePanel("teams-panel");
  });

  scheduleBtn.addEventListener("click", () => {
    togglePanel("nfl-schedule-panel");
    renderNFLWeekSchedule();
  });

  submitPicksBtn.addEventListener("click", () => {
    submitCurrentWeekPicks();
  });

  editPicksBtn.addEventListener("click", () => {
    editCurrentWeekPicks();
  });

  scheduleWeekSelect.addEventListener("change", () => {
    renderNFLWeekSchedule();
  });
}

function togglePanel(id) {
  const panels = ["leaderboard-panel", "teams-panel", "team-detail-panel", "nfl-schedule-panel"];
  panels.forEach(pid => {
    const el = document.getElementById(pid);
    if (!el) return;
    el.classList.toggle("hidden", pid !== id);
  });
}

// --- CURRENT WEEK DETECTION ---

function detectCurrentNFLWeek(schedule) {
  const today = new Date();
  for (let w = 1; w <= 18; w++) {
    const weekKey = String(w);
    const games = schedule.weeks[weekKey].games;
    const dates = games.map(g => new Date(`${g.date} 2026`)); // assumes g.date like "Sep 15"
    const lastGame = dates.reduce((a, b) => a > b ? a : b);
    if (today <= lastGame) {
      return w;
    }
  }
  return 18;
}

// --- CURRENT WEEK DISPLAY ---

function renderCurrentWeek() {
  document.getElementById("current-week").textContent = `Week ${currentWeek}`;
  document.getElementById("picks-week").textContent = `Week ${currentWeek}`;
}

// --- WEEK NAVIGATION ---

document.getElementById("prev-week").onclick = () => changeWeek(-1);
document.getElementById("next-week").onclick = () => changeWeek(1);

function changeWeek(delta) {
  currentWeek += delta;
  if (currentWeek < 1) currentWeek = 1;
  if (currentWeek > 18) currentWeek = 18;

  renderCurrentWeek();          // <-- THIS UPDATES THE LABEL
  renderPicksForWeek(currentWeek);
}

// --- STANDINGS ENGINE (simplified: based on results you’ll add later) ---

function computeTeamRecords() {
  // For now, stub: all 0-0. Later, you’ll compute from real results.
  const records = {};
  Object.keys(teamInfo).forEach(team => {
    records[team] = {
      wins: 0,
      losses: 0,
      homeWins: 0,
      homeLosses: 0,
      awayWins: 0,
      awayLosses: 0,
      confWins: 0,
      confLosses: 0,
      divWins: 0,
      divLosses: 0
    };
  });
  // TODO: when you have results, update records here.
  return records;
}

function renderStandings() {
  const records = computeTeamRecords();

  const afcDivs = ["East", "North", "South", "West"];
  const nfcDivs = ["East", "North", "South", "West"];

  renderConferenceStandings("AFC", afcDivs, records, "afc-standings", "afc-best");
  renderConferenceStandings("NFC", nfcDivs, records, "nfc-standings", "nfc-best");
}

function renderConferenceStandings(conf, divisions, records, standingsId, bestId) {
  const container = document.getElementById(standingsId);
  container.innerHTML = "";

  const teamsInConf = [];

  // --- Division Standings ---
  divisions.forEach(div => {
    const divBlock = document.createElement("div");
    divBlock.className = "standings-division";

    const h = document.createElement("h5");
    h.textContent = `${conf} ${div}`;
    divBlock.appendChild(h);

    // Teams in this division
    const divTeams = Object.keys(teamInfo).filter(t => {
      const info = teamInfo[t];
      return info.conference === conf && info.division === div;
    });

    // Sort division teams alphabetically by fullName
    divTeams.sort((a, b) => teamInfo[a].fullName.localeCompare(teamInfo[b].fullName));

    divTeams.forEach(team => {
      teamsInConf.push(team);
      const row = createStandingsRow(team, records[team]);
      divBlock.appendChild(row);
    });

    container.appendChild(divBlock);
  });

  // --- Conference Best Teams ---
  const bestContainer = document.getElementById(bestId);
  bestContainer.innerHTML = "";
  bestContainer.classList.add("best-list");

  // Sort by record, ties alphabetical
  const sorted = teamsInConf.sort((a, b) => {
    const ra = records[a];
    const rb = records[b];

    if (ra.wins !== rb.wins) return rb.wins - ra.wins;
    if (ra.losses !== rb.losses) return ra.losses - rb.losses;

    // Alphabetical tiebreaker
    return teamInfo[a].fullName.localeCompare(teamInfo[b].fullName);
  });

  sorted.forEach(team => {
    const row = document.createElement("div");
    row.className = "team-row";

    // Team name + logo
    const nameCell = document.createElement("div");
    nameCell.className = "team-name";

    const logo = document.createElement("img");
    logo.className = "team-logo";
    logo.src = getTeamLogo(team);

    const nameText = document.createElement("span");
    nameText.textContent = team;

    nameCell.appendChild(logo);
    nameCell.appendChild(nameText);

    // W/L column
    const wlCell = document.createElement("div");
    wlCell.textContent = `${records[team].wins}-${records[team].losses}`;

    row.appendChild(nameCell);
    row.appendChild(wlCell);

    row.addEventListener("click", () => showTeamDetail(team));

    bestContainer.appendChild(row);
  });
}

function getTeamHelmet(team) {
  return getTeamLogo(team); // reuse logos for now
}

function loadLogoBanner() {
  const banner = document.getElementById("logo-banner");
  banner.innerHTML = "";

  Object.keys(teamLogos).forEach(team => {
    const img = document.createElement("img");
    img.src = teamLogos[team];
    img.className = "teamLogo"; // optional CSS class
    banner.appendChild(img);
  });
}


function createStandingsRow(team, rec) {
  const row = document.createElement("div");
  row.className = "team-row";

  const nameCell = document.createElement("div");
  nameCell.className = "team-name";

  const logo = document.createElement("img");
  logo.className = "team-logo";
  logo.src = getTeamLogo(team);

  const nameText = document.createElement("span");
  nameText.textContent = team;

  nameCell.appendChild(logo);
  nameCell.appendChild(nameText);

  const wlCell = document.createElement("div");
  wlCell.textContent = `${rec.wins}-${rec.losses}`;

  const homeCell = document.createElement("div");
  homeCell.textContent = `${rec.homeWins}-${rec.homeLosses}`;

  const awayCell = document.createElement("div");
  awayCell.textContent = `${rec.awayWins}-${rec.awayLosses}`;

  const confCell = document.createElement("div");
  confCell.textContent = `${rec.confWins}-${rec.confLosses}`;

  const divCell = document.createElement("div");
  divCell.textContent = `${rec.divWins}-${rec.divLosses}`;

  row.appendChild(nameCell);
  row.appendChild(wlCell);
  row.appendChild(homeCell);
  row.appendChild(awayCell);
  row.appendChild(confCell);
  row.appendChild(divCell);

  row.addEventListener("click", () => showTeamDetail(team));

  return row;
}

// --- TEAM LOGOS ---

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
  LV:  "LOGOS/LV.PNG",
  LAC: "LOGOS/LAC.PNG",
  LAR: "LOGOS/LAR.PNG",
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
  TB:  "LOGOS/TB.PNG",
  TEN: "LOGOS/TEN.PNG",
  WAS: "LOGOS/WAS.PNG"
};

function getTeamLogo(team) {
  return teamLogos[team] || "";
}

// --- TEAMS LIST / TEAM DETAIL ---

function renderTeamsList() {
  const container = document.getElementById("teams-list");
  container.innerHTML = "";

  // Sort by fullName alphabetically
  Object.keys(teamInfo)
    .sort((a, b) => teamInfo[a].fullName.localeCompare(teamInfo[b].fullName))
    .forEach(team => {

      // --- render row ---
      const row = document.createElement("div");
      row.className = "team-row";

      // Team name + logo
      const nameCell = document.createElement("div");
      nameCell.className = "team-name";

      const logo = document.createElement("img");
      logo.className = "team-logo";
      logo.src = getTeamLogo(team);

      const nameText = document.createElement("span");
      nameText.textContent = teamInfo[team].fullName;

      nameCell.appendChild(logo);
      nameCell.appendChild(nameText);

      // Conference + Division
      const divCell = document.createElement("div");
      divCell.textContent = `${teamInfo[team].conference} ${teamInfo[team].division}`;

      // Build row
      row.appendChild(nameCell);
      row.appendChild(divCell);

      // Click → open Team Info + Team Schedule
      row.addEventListener("click", () => showTeamDetail(team));

      container.appendChild(row);
    });
}

function showTeamDetail(team) {
  togglePanel("team-detail-panel");

  const info = teamInfo[team];
  const infoContainer = document.getElementById("team-info");
  infoContainer.innerHTML = "";

  const logo = document.createElement("img");
  logo.src = getTeamLogo(team);

  const name = document.createElement("h4");
  name.textContent = info.fullName;

  const stadium = document.createElement("p");
  stadium.textContent = `Stadium: ${info.stadium} (${info.city})`;

  const coach = document.createElement("p");
  coach.textContent = `Head Coach: ${info.coach}`;

  const divConf = document.createElement("p");
  divConf.textContent = `${info.conference} ${info.division}`;

  infoContainer.appendChild(logo);
  infoContainer.appendChild(name);
  infoContainer.appendChild(stadium);
  infoContainer.appendChild(coach);
  infoContainer.appendChild(divConf);

  renderTeamSchedule(team);
}

function renderTeamSchedule(team) {
  const container = document.getElementById("team-schedule");
  container.innerHTML = "";

  const records = computeTeamRecords(); // for opponent record snapshot
  const today = new Date();

  const scheduleLines = [];

  Object.keys(scheduleData.weeks).forEach(weekKey => {
    const games = scheduleData.weeks[weekKey].games;
    games.forEach((g, idx) => {
      if (g.home === team || g.away === team) {
        const isHome = g.home === team;
        const opponent = isHome ? g.away : g.home;
        const dateObj = new Date(`${g.date} 2026`);
        const past = dateObj < today;

        const line = document.createElement("div");
        line.textContent = `Week ${weekKey} ${isHome ? "vs" : "@"} ${opponent}`;

        if (past) {
          // TODO: when you have results, show W/L here
          line.textContent += " (final)";
        } else {
          const oppRec = records[opponent];
          line.textContent += ` (${oppRec.wins}-${oppRec.losses})`;
        }

        scheduleLines.push(line);
      }
    });
  });

  scheduleLines.forEach(l => container.appendChild(l));
}

// --- NFL SCHEDULE VIEW ---

function renderNFLWeekScheduleSelector() {
  const select = document.getElementById("schedule-week-select");
  select.innerHTML = "";
  Object.keys(scheduleData.weeks).forEach(weekKey => {
    const opt = document.createElement("option");
    opt.value = weekKey;
    opt.textContent = `Week ${weekKey}`;
    if (Number(weekKey) === currentWeek) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderNFLWeekSchedule() {
  const select = document.getElementById("schedule-week-select");
  const weekKey = select.value;
  const container = document.getElementById("nfl-schedule-week");
  container.innerHTML = "";

  const games = scheduleData.weeks[weekKey].games;
  games.forEach(g => {
    const row = document.createElement("div");
    row.className = "pick-row";

    const matchup = document.createElement("div");
    matchup.textContent = `${g.away} @ ${g.home}`;

    const dateCell = document.createElement("div");
    dateCell.textContent = g.date;

    const tvCell = document.createElement("div");
    tvCell.textContent = g.network || "";

    row.appendChild(matchup);
    row.appendChild(dateCell);
    row.appendChild(tvCell);

    container.appendChild(row);
  });
}

// --- GAME DATA ---

function parseGameDate(game) {
  return new Date(`${game.date} ${game.time} 2026`);
}

  // EARLIEST GAME cutoff
function getWeekCutoff(week) {
  const games = scheduleData.weeks[String(week)].games;
  const times = games.map(g => parseGameDate(g));
  return new Date(Math.min(...times));
}

function isWeekLocked(week) {
  const now = new Date();
  const cutoff = getWeekCutoff(week);
  return now >= cutoff;
}

// --- PICKS SYSTEM ---

  // --- MERGED RENDER FUNCTION WITH LOCKING ---
function renderPicksForWeek(week) {
  const container = document.getElementById("picks-table");
  container.innerHTML = "";

  const weekKey = String(week);
  const games = scheduleData.weeks[weekKey].games;

  // Determine if week is locked (submitted OR cutoff passed)
  const locked =
    (picks[currentPlayer] &&
     picks[currentPlayer][weekKey] &&
     picks[currentPlayer][weekKey].locked) ||
    isWeekLocked(week);

  games.forEach((g, idx) => {
    const row = document.createElement("div");
    row.className = "pick-row";

    // --- SCOREBOARD CELLS ---
    const awayScoreCell = document.createElement("div");
    const homeScoreCell = document.createElement("div");

    if (g.score) {
      const [awayScore, homeScore] = g.score.split("-").map(Number);
      awayScoreCell.textContent = awayScore;
      homeScoreCell.textContent = homeScore;

      // highlight winner
      if (awayScore > homeScore) {
        awayScoreCell.classList.add("winner-score");
      } else if (homeScore > awayScore) {
        homeScoreCell.classList.add("winner-score");
      }
    } else {
      awayScoreCell.textContent = "-";
      homeScoreCell.textContent = "-";
    }

    // --- MATCHUP ---
    const matchup = document.createElement("div");
    matchup.textContent = `${g.away} @ ${g.home}`;

    // --- PICK BUTTONS ---
    const actions = document.createElement("div");
    actions.className = "pick-actions";

    const awayBtn = document.createElement("button");
    awayBtn.textContent = g.away;

    const homeBtn = document.createElement("button");
    homeBtn.textContent = g.home;

    if (locked) {
      awayBtn.disabled = true;
      homeBtn.disabled = true;
    } else {
      awayBtn.addEventListener("click", () => setPick(weekKey, idx, g.away));
      homeBtn.addEventListener("click", () => setPick(weekKey, idx, g.home));
    }

    actions.appendChild(awayBtn);
    actions.appendChild(homeBtn);

    // --- CURRENT PICK CELL ---
    const currentPickCell = document.createElement("div");
    currentPickCell.id = `pick-${weekKey}-${idx}`;
    currentPickCell.textContent = getPick(weekKey, idx) || "";

    // --- BUILD ROW IN SCOREBOARD ORDER ---
    row.appendChild(awayScoreCell);   // LEFT SCORE
    row.appendChild(matchup);         // AWAY @ HOME
    row.appendChild(homeScoreCell);   // RIGHT SCORE
    row.appendChild(actions);         // PICK BUTTONS
    row.appendChild(currentPickCell); // YOUR PICK

    container.appendChild(row);
  });

  updateEditLockState();
}

function getPick(weekKey, gameIndex) {
  if (!currentPlayer) return null;
  const playerPicks = picks[currentPlayer] || {};
  const weekObj = playerPicks[weekKey] || {};
  return weekObj.games ? weekObj.games[gameIndex] : null;
}

function setPick(weekKey, gameIndex, team) {
  if (!currentPlayer) {
    showNotification("Set your player name first.");
    return;
  }

  if (!picks[currentPlayer]) picks[currentPlayer] = {};
  if (!picks[currentPlayer][weekKey]) {
    picks[currentPlayer][weekKey] = {
      games: {},
      submittedAt: null,
      locked: false
    };
  }

  const weekObj = picks[currentPlayer][weekKey];

  if (weekObj.locked || isWeekLocked(weekKey)) {
    showNotification("Picks are locked for this week.");
    return;
  }

  weekObj.games[gameIndex] = team;
  saveLocalStorage();

  const cell = document.getElementById(`pick-${weekKey}-${gameIndex}`);
  if (cell) cell.textContent = team;
}

function submitCurrentWeekPicks() {
  if (!currentPlayer) {
    showNotification("Set your player name first.");
    return;
  }

  const weekKey = String(currentWeek);

  if (!picks[currentPlayer] || !picks[currentPlayer][weekKey]) {
    showNotification("No picks to submit for this week.");
    return;
  }

  const weekObj = picks[currentPlayer][weekKey];

  if (weekObj.locked || isWeekLocked(currentWeek)) {
    showNotification("Picks already locked for this week.");
    return;
  }

  weekObj.locked = true;
  weekObj.submittedAt = new Date().toISOString();

  saveLocalStorage();
  updateLeagueStats();
  showNotification(`Week ${weekKey} picks submitted and locked.`);
  updateEditLockState();
}

function editCurrentWeekPicks() {
  if (!currentPlayer) {
    showNotification("Set your player name first.");
    return;
  }
  const weekKey = String(currentWeek);
  if (!picks[currentPlayer] || !picks[currentPlayer][weekKey]) {
    showNotification("No picks for this week.");
    return;
  }
  const weekObj = picks[currentPlayer][weekKey];

  if (isPastEditDeadline(currentWeek)) {
    weekObj.locked = true;
    saveLocalStorage();
    showNotification("Edit deadline passed. Picks locked.");
    updateEditLockState();
    return;
  }

  weekObj.locked = false;
  saveLocalStorage();
  showNotification("You can edit your picks until Wednesday at midnight.");
  updateEditLockState();
}

function isPastEditDeadline(week) {
  // Simple version: Wednesday 23:59 of that week's "start"
  // You can refine this later.
  const weekKey = String(week);
  const games = scheduleData.weeks[weekKey].games;
  const dates = games.map(g => new Date(`${g.date} 2026`));
  const firstGame = dates.reduce((a, b) => a < b ? a : b);

  const deadline = new Date(firstGame);
  // Set to Wednesday of that week at 23:59
  deadline.setDate(deadline.getDate() + (3 - deadline.getDay())); // 3 = Wednesday
  deadline.setHours(23, 59, 0, 0);

  const now = new Date();
  return now > deadline;
}

function updateEditLockState() {
  const weekKey = String(currentWeek);
  const editBtn = document.getElementById("edit-picks-btn");
  const submitBtn = document.getElementById("submit-picks-btn");

  if (!currentPlayer || !picks[currentPlayer] || !picks[currentPlayer][weekKey]) {
    editBtn.disabled = true;
    submitBtn.disabled = false;
    return;
  }

  const weekObj = picks[currentPlayer][weekKey];
  const pastDeadline = isPastEditDeadline(currentWeek);

  if (pastDeadline) {
    weekObj.locked = true;
    saveLocalStorage();
  }

  editBtn.disabled = weekObj.locked || !weekObj.submittedAt;
  submitBtn.disabled = weekObj.locked;
}

// --- LEAGUE STATS / LEADERBOARD ---

function updateLeagueStats() {
  const total = Object.keys(players).length;
  document.getElementById("total-participants").textContent = total;

  const weekKey = String(currentWeek);
  let weekCount = 0;
  Object.keys(picks).forEach(player => {
    const p = picks[player];
    if (p[weekKey] && p[weekKey].submittedAt) weekCount++;
  });
  document.getElementById("week-participants").textContent = weekCount;
}

function renderLeaderboard() {
  const container = document.getElementById("leaderboard-list");
  container.innerHTML = "";

  // For now, simple: count total submitted weeks per player.
  const rows = Object.keys(players).map(player => {
    let totalWeeks = 0;
    let totalPicks = 0;
    const p = picks[player] || {};
    Object.keys(p).forEach(weekKey => {
      if (p[weekKey].submittedAt) {
        totalWeeks++;
        totalPicks += Object.keys(p[weekKey].picks || {}).length;
      }
    });
    return { player, totalWeeks, totalPicks };
  });

  rows.sort((a, b) => b.totalWeeks - a.totalWeeks || b.totalPicks - a.totalPicks || a.player.localeCompare(b.player));

  rows.forEach(row => {
    const div = document.createElement("div");
    div.textContent = `${row.player}: Weeks played ${row.totalWeeks}, Picks made ${row.totalPicks}`;
    div.addEventListener("click", () => showPlayerPicks(row.player));
    container.appendChild(div);
  });
}

function showPlayerPicks(player) {
  togglePanel("player-picks-panel");
  const container = document.getElementById("player-picks-content");
  container.innerHTML = "";

  const p = picks[player] || {};
  Object.keys(p).sort((a, b) => Number(a) - Number(b)).forEach(weekKey => {
    const weekObj = p[weekKey];
    const header = document.createElement("h4");
    header.textContent = `Week ${weekKey}`;
    container.appendChild(header);

    const games = scheduleData.weeks[weekKey].games;
    games.forEach((g, idx) => {
      const line = document.createElement("div");
      const pick = weekObj.games ? weekObj.games[idx] : null;
      line.textContent = `${g.away} @ ${g.home} → ${pick || "No pick"}`;
      container.appendChild(line);
    });
  });
}

// --- NOTIFICATIONS ---

function showNotification(msg) {
  const el = document.getElementById("picks-notification");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}