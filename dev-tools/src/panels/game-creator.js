// ── Game Creator Panel ──
import { createGame, setGame, getState } from '../api.js';
import { toast } from '../main.js';

const LEAGUES = [
  { id: 'premier-league', name: 'Premier League' },
  { id: 'championship', name: 'Championship' },
  { id: 'league-one', name: 'League One' },
  { id: 'league-two', name: 'League Two' },
  { id: 'national-league', name: 'National League' },
  { id: 'scottish-prem', name: 'Scottish Prem' },
];

export function initGameCreator() {
  const panel = document.getElementById('panel-game-creator');
  panel.innerHTML = `
    <div class="card">
      <h2>🎮 Create New Game</h2>
      <div class="form-group">
        <label>Game Name</label>
        <input type="text" id="gc-name" placeholder="e.g. Premier League GW31" />
      </div>
      <div class="form-group">
        <label>Entry Fee (£)</label>
        <input type="number" id="gc-fee" value="10" min="5" />
      </div>
      <div class="form-group">
        <label>Leagues</label>
        <div class="checkbox-group" id="gc-leagues">
          ${LEAGUES.map(l => `
            <label><input type="checkbox" value="${l.id}" /> ${l.name}</label>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:6px;">
          <input type="checkbox" id="gc-rollover" /> Rollover
        </label>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:6px;">
          <input type="checkbox" id="gc-splitpot" /> Split Pot
          <span class="text-muted text-sm">(mutually exclusive with Rollover)</span>
        </label>
      </div>
      <div class="form-group">
        <label>Creator Display Name</label>
        <input type="text" id="gc-displayname" value="Dev Admin" />
      </div>
      <button class="btn btn-primary btn-block" id="gc-create">Create Game</button>
      <div id="gc-result" class="result-box" style="display:none;"></div>
    </div>

    <div class="card">
      <h2>📋 Current Game Context</h2>
      <div class="state-grid" id="gc-context"></div>
    </div>
  `;

  const rolloverCb = panel.querySelector('#gc-rollover');
  const splitpotCb = panel.querySelector('#gc-splitpot');
  rolloverCb.addEventListener('change', () => { if (rolloverCb.checked) splitpotCb.checked = false; });
  splitpotCb.addEventListener('change', () => { if (splitpotCb.checked) rolloverCb.checked = false; });

  panel.querySelector('#gc-create').addEventListener('click', async () => {
    const btn = panel.querySelector('#gc-create');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating...';

    try {
      const name = panel.querySelector('#gc-name').value.trim();
      const fee = parseInt(panel.querySelector('#gc-fee').value) || 10;
      const leagues = Array.from(panel.querySelectorAll('#gc-leagues input:checked')).map(cb => cb.value);
      const rollover = rolloverCb.checked;
      const splitPot = splitpotCb.checked;
      const displayName = panel.querySelector('#gc-displayname').value.trim() || 'Dev Admin';
      const creatorId = `user-${Date.now()}`;

      if (!name) throw new Error('Game name is required');
      if (leagues.length === 0) throw new Error('Select at least one league');

      const result = await createGame({ name, fee, leagues, rollover, splitPot, creatorId, displayName });

      const resEl = panel.querySelector('#gc-result');
      resEl.style.display = 'block';
      resEl.className = 'result-box success';
      resEl.textContent = `✅ Game created!\n\nName: ${result.name}\nGame ID: ${result.gameId}\nPIN: ${result.pin}\nFee: £${result.fee}\nState: ${result.state}\nLeagues: ${result.leagues.join(', ')}`;

      toast(`Game created! PIN: ${result.pin}`, 'success');
      updateContext();
    } catch (err) {
      const resEl = panel.querySelector('#gc-result');
      resEl.style.display = 'block';
      resEl.className = 'result-box error';
      resEl.textContent = `❌ Error: ${err.message}`;
      toast(`Failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Game';
    }
  });

  updateContext();
}

function updateContext() {
  const { gameId, gamePin, currentRound, createdUsers } = getState();
  const el = document.getElementById('gc-context');
  if (!el) return;
  el.innerHTML = [
    { label: 'Game ID', value: gameId?.slice(0, 12) + '...' || '—' },
    { label: 'PIN', value: gamePin || '—' },
    { label: 'Current Round', value: currentRound || '—' },
    { label: 'Test Users', value: createdUsers.length || '0' },
  ].map(i => `<div class="state-item"><div class="label">${i.label}</div><div class="value">${i.value}</div></div>`).join('');
}
