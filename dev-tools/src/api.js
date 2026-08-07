// ── API Client ──
const API_BASE = 'http://localhost:3000';

let gameId = localStorage.getItem('lms_dev_gameId') || '';
let gamePin = localStorage.getItem('lms_dev_gamePin') || '';
let currentRound = parseInt(localStorage.getItem('lms_dev_currentRound') || '') || 1;
let createdUsers = JSON.parse(localStorage.getItem('lms_dev_users') || '[]');

function persist() {
  localStorage.setItem('lms_dev_gameId', gameId);
  localStorage.setItem('lms_dev_gamePin', gamePin);
  localStorage.setItem('lms_dev_currentRound', String(currentRound));
  localStorage.setItem('lms_dev_users', JSON.stringify(createdUsers));
}

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(
      typeof data === 'string' ? data : (data.message || data.error || `HTTP ${res.status}`)
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ── Exported API Functions ──
export async function createGame({ name, fee, leagues, rollover, splitPot, creatorId, displayName }) {
  const result = await api('POST', '/games', { name, fee, leagues, rollover, splitPot, creatorId, displayName });
  gameId = result.gameId;
  gamePin = result.pin;
  currentRound = 0;
  persist();
  return result;
}

export async function getGame(id) {
  return api('GET', `/games/${id || gameId}`);
}

export async function getGameByPin(pin) {
  const result = await api('GET', `/games/pin/${pin}`);
  gameId = result.gameId;
  gamePin = result.pin;
  currentRound = result.currentRound || 0;
  persist();
  return result;
}

export async function addRound({ matchday, leagueId, deadline }) {
  const id = await resolveGameId();
  const result = await api('POST', `/games/${id}/rounds`, { matchday, leagueId, deadline });
  currentRound = result.roundNum;
  persist();
  return result;
}

export async function openPicks(roundNum) {
  const id = await resolveGameId();
  const rn = roundNum || currentRound;
  return api('POST', `/games/${id}/rounds/${rn}/open`);
}

export async function lockRound(roundNum) {
  const id = await resolveGameId();
  const rn = roundNum || currentRound;
  return api('POST', `/games/${id}/rounds/${rn}/lock`);
}

export async function submitResults(roundNum, results) {
  const id = await resolveGameId();
  const rn = roundNum || currentRound;
  return api('POST', `/games/${id}/rounds/${rn}/results`, { results });
}

export async function applyEliminations(roundNum) {
  const id = await resolveGameId();
  const rn = roundNum || currentRound;
  return api('POST', `/games/${id}/rounds/${rn}/eliminate`);
}

export async function submitPick(roundNum, userId, teamId, teamName) {
  const id = await resolveGameId();
  const rn = roundNum || currentRound;
  return api('POST', `/games/${id}/rounds/${rn}/picks`, { userId, teamId, teamName });
}

export async function joinGame(userId, displayName) {
  const id = await resolveGameId();
  return api('POST', `/games/${id}/join`, { userId, displayName });
}

export async function createUser(displayName) {
  const result = await api('POST', '/users', { displayName });
  createdUsers.push({ userId: result.userId, displayName });
  persist();
  return result;
}

export async function cancelGame() {
  const id = await resolveGameId();
  return api('POST', `/games/${id}/cancel`);
}

export async function manualTick() {
  return api('POST', '/tick');
}

export async function checkConnection() {
  try {
    const res = await fetch(`${API_BASE}/games/pin/00000000`);
    return true;
  } catch {
    return false;
  }
}

// ── Helper ──
async function resolveGameId() {
  if (gameId) return gameId;
  if (gamePin) {
    const g = await getGameByPin(gamePin);
    return g.gameId;
  }
  throw new Error('No game ID or PIN set. Create or look up a game first.');
}

// ── State Getters/Setters ──
export function getState() {
  return { gameId, gamePin, currentRound, createdUsers };
}

export function setGame(id, pin, round) {
  if (id) gameId = id;
  if (pin) gamePin = pin;
  if (round !== undefined) currentRound = round;
  persist();
}

export { api };
