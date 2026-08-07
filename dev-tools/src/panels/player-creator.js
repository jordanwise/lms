// ── Player Creator Panel ──
import { createUser, joinGame, submitPick, getGame, getState } from '../api.js';
import { toast } from '../main.js';

const PREMIER_LEAGUE_TEAMS = [
  { id: 'arsenal', name: 'Arsenal' },
  { id: 'aston-villa', name: 'Aston Villa' },
  { id: 'bournemouth', name: 'Bournemouth' },
  { id: 'brentford', name: 'Brentford' },
  { id: 'brighton', name: 'Brighton' },
  { id: 'chelsea', name: 'Chelsea' },
  { id: 'crystal-palace', name: 'Crystal Palace' },
  { id: 'everton', name: 'Everton' },
  { id: 'fulham', name: 'Fulham' },
  { id: 'ipswich', name: 'Ipswich Town' },
  { id: 'leicester', name: 'Leicester City' },
  { id: 'liverpool', name: 'Liverpool' },
  { id: 'man-city', name: 'Manchester City' },
  { id: 'man-utd', name: 'Manchester United' },
  { id: 'newcastle', name: 'Newcastle United' },
  { id: 'nottingham-forest', name: 'Nottingham Forest' },
  { id: 'southampton', name: 'Southampton' },
  { id: 'tottenham', name: 'Tottenham Hotspur' },
  { id: 'west-ham', name: 'West Ham United' },
  { id: 'wolves', name: 'Wolverhampton' },
];

export function initPlayerCreator() {
  const panel = document.getElementById('panel-player-creator');
  panel.innerHTML = `
    <div class="card">
      <h2>👤 Create Test User</h2>
      <div class="form-group">
        <label>Display Name</label>
        <input type="text" id="pc-displayname" placeholder="e.g. Test Player 1" />
      </div>
      <button class="btn btn-primary" id="pc-create">Create User</button>
      <div id="pc-create-result" class="result-box" style="display:none;"></div>
    </div>

    <div class="card">
      <h2>🤝 Join Users to Game</h2>
      <p class="text-secondary text-sm mb-md">Add created users to the current game. Required before they can submit picks.</p>
      <div id="pc-user-list" class="mb-md"></div>
      <button class="btn btn-success" id="pc-join-all">Join All Users to Game</button>
      <div id="pc-join-result" class="result-box" style="display:none;"></div>
    </div>

    <div class="card">
      <h2>🎯 Submit Picks (Bulk)</h2>
      <p class="text-secondary text-sm mb-md">Submit picks for all joined users in the current round. Game must be in "picking" state.</p>
      <div class="form-group">
        <label>Select Team for All Users</label>
        <select id="pc-team-select">
          <option value="">— Random team per user —</option>
          ${PREMIER_LEAGUE_TEAMS.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-warning" id="pc-bulk-pick">Submit Picks for All Users</button>
      <div id="pc-pick-result" class="result-box" style="display:none;"></div>
    </div>
  `;

  panel.querySelector('#pc-create').addEventListener('click', async () => {
    const name = panel.querySelector('#pc-displayname').value.trim();
    if (!name) { toast('Enter a display name', 'error'); return; }
    const btn = panel.querySelector('#pc-create');
    btn.disabled = true;
    try {
      const result = await createUser(name);
      const resEl = panel.querySelector('#pc-create-result');
      resEl.style.display = 'block';
      resEl.className = 'result-box success';
      resEl.textContent = `✅ Created: ${result.userId}\nName: ${result.displayName}`;
      toast(`User created: ${result.displayName}`, 'success');
      panel.querySelector('#pc-displayname').value = '';
      renderUserList();
    } catch (err) {
      toast(`Error: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  panel.querySelector('#pc-join-all').addEventListener('click', async () => {
    const { createdUsers, gameId } = getState();
    if (!gameId) { toast('Create or look up a game first', 'error'); return; }
    if (createdUsers.length === 0) { toast('Create some users first', 'error'); return; }

    const btn = panel.querySelector('#pc-join-all');
    btn.disabled = true;
    const resEl = panel.querySelector('#pc-join-result');
    resEl.style.display = 'block';
    resEl.className = 'result-box';
    resEl.textContent = 'Joining users...\n';

    for (const user of createdUsers) {
      try {
        await joinGame(user.userId, user.displayName);
        resEl.textContent += `  ✅ ${user.displayName} joined\n`;
      } catch (err) {
        resEl.textContent += `  ⚠️ ${user.displayName}: ${err.message}\n`;
      }
    }
    resEl.textContent += '\nDone.';
    renderUserList();
    btn.disabled = false;
  });

  panel.querySelector('#pc-bulk-pick').addEventListener('click', async () => {
    const { createdUsers, gameId, currentRound } = getState();
    if (!gameId) { toast('Create or look up a game first', 'error'); return; }
    if (createdUsers.length === 0) { toast('Create some users first', 'error'); return; }

    const selectedTeam = panel.querySelector('#pc-team-select').value;
    const btn = panel.querySelector('#pc-bulk-pick');
    btn.disabled = true;
    const resEl = panel.querySelector('#pc-pick-result');
    resEl.style.display = 'block';
    resEl.className = 'result-box';
    resEl.textContent = `Submitting picks for round ${currentRound}...\n`;

    for (const user of createdUsers) {
      const team = selectedTeam
        ? PREMIER_LEAGUE_TEAMS.find(t => t.id === selectedTeam)
        : PREMIER_LEAGUE_TEAMS[Math.floor(Math.random() * PREMIER_LEAGUE_TEAMS.length)];
      try {
        await submitPick(currentRound, user.userId, team.id, team.name);
        resEl.textContent += `  ✅ ${user.displayName} → ${team.name}\n`;
      } catch (err) {
        resEl.textContent += `  ⚠️ ${user.displayName}: ${err.message}\n`;
      }
    }
    resEl.textContent += '\nDone.';
    toast('Picks submitted!', 'success');
    btn.disabled = false;
  });

  renderUserList();
}

function renderUserList() {
  const { createdUsers } = getState();
  const el = document.getElementById('pc-user-list');
  if (!el) return;
  if (createdUsers.length === 0) {
    el.innerHTML = '<p class="text-muted text-sm">No users created yet.</p>';
    return;
  }
  el.innerHTML = `<ul class="player-list">${createdUsers.map(u => `
    <li class="player-item">
      <span>${u.displayName}</span>
      <span class="text-muted text-sm text-mono">${u.userId.slice(0, 16)}...</span>
    </li>
  `).join('')}</ul>`;
}
