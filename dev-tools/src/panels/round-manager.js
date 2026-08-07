// ── Round Manager Panel ──
import { addRound, openPicks, lockRound, getGame, getState, setGame } from '../api.js';
import { toast } from '../main.js';

const LEAGUES = [
  { id: 'premier-league', name: 'Premier League' },
  { id: 'championship', name: 'Championship' },
  { id: 'league-one', name: 'League One' },
  { id: 'league-two', name: 'League Two' },
  { id: 'national-league', name: 'National League' },
  { id: 'scottish-prem', name: 'Scottish Prem' },
];

export function initRoundManager() {
  const panel = document.getElementById('panel-round-manager');
  panel.innerHTML = `
    <div class="card">
      <h2>🔢 Add Round</h2>
      <div class="form-group">
        <label>Matchday Label</label>
        <input type="text" id="rm-matchday" placeholder="e.g. GW31" />
      </div>
      <div class="form-group">
        <label>League</label>
        <select id="rm-league">
          ${LEAGUES.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Deadline (optional, ISO)</label>
        <input type="text" id="rm-deadline" placeholder="e.g. 2026-08-10T12:00:00Z" />
      </div>
      <button class="btn btn-primary" id="rm-add-round">Add Round</button>
      <div id="rm-result" class="result-box" style="display:none;"></div>
    </div>

    <div class="card">
      <h2>🔓 Open Picks</h2>
      <p class="text-secondary text-sm mb-md">Open picks for the current round so players can submit picks.</p>
      <button class="btn btn-primary" id="rm-open-picks">Open Picks for Round <span id="rm-round-label">?</span></button>
      <div id="rm-open-result" class="result-box" style="display:none;"></div>
    </div>

    <div class="card">
      <h2>🔒 Lock Round</h2>
      <p class="text-secondary text-sm mb-md">Lock the current round (deadline reached).</p>
      <button class="btn btn-warning" id="rm-lock-round">Lock Round <span id="rm-lock-label">?</span></button>
      <div id="rm-lock-result" class="result-box" style="display:none;"></div>
    </div>

    <div class="card">
      <h2>📊 Game State</h2>
      <div id="rm-state" class="text-muted text-sm">Loading...</div>
    </div>
  `;

  updateState();

  panel.querySelector('#rm-add-round').addEventListener('click', async () => {
    const matchday = panel.querySelector('#rm-matchday').value.trim();
    const leagueId = panel.querySelector('#rm-league').value;
    const deadline = panel.querySelector('#rm-deadline').value.trim() || undefined;

    if (!matchday) { toast('Matchday label required', 'error'); return; }
    const btn = panel.querySelector('#rm-add-round');
    btn.disabled = true;
    const resEl = panel.querySelector('#rm-result');

    try {
      const result = await addRound({ matchday, leagueId, deadline });
      resEl.style.display = 'block';
      resEl.className = 'result-box success';
      resEl.textContent = `✅ Round ${result.roundNum} added!\nMatchday: ${result.matchday}\nLeague: ${result.leagueId}\nState: ${result.state}`;
      toast(`Round ${result.roundNum} added`, 'success');
      panel.querySelector('#rm-matchday').value = '';
      updateState();
    } catch (err) {
      resEl.style.display = 'block';
      resEl.className = 'result-box error';
      resEl.textContent = `❌ ${err.message}`;
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  panel.querySelector('#rm-open-picks').addEventListener('click', async () => {
    const { currentRound } = getState();
    const btn = panel.querySelector('#rm-open-picks');
    btn.disabled = true;
    const resEl = panel.querySelector('#rm-open-result');

    try {
      const result = await openPicks(currentRound);
      resEl.style.display = 'block';
      resEl.className = 'result-box success';
      resEl.textContent = `✅ Picks opened for round ${result.roundNum}\nState: ${result.roundState}`;
      toast('Picks opened!', 'success');
      updateState();
    } catch (err) {
      resEl.style.display = 'block';
      resEl.className = 'result-box error';
      resEl.textContent = `❌ ${err.message}`;
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  panel.querySelector('#rm-lock-round').addEventListener('click', async () => {
    const { currentRound } = getState();
    const btn = panel.querySelector('#rm-lock-round');
    btn.disabled = true;
    const resEl = panel.querySelector('#rm-lock-result');

    try {
      const result = await lockRound(currentRound);
      resEl.style.display = 'block';
      resEl.className = 'result-box success';
      resEl.textContent = `🔒 Round ${result.roundNum} locked!\nState: ${result.roundState}`;
      toast('Round locked!', 'success');
      updateState();
    } catch (err) {
      resEl.style.display = 'block';
      resEl.className = 'result-box error';
      resEl.textContent = `❌ ${err.message}`;
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

async function updateState() {
  const { gameId, currentRound } = getState();
  const labelEl = document.querySelector('#rm-round-label');
  const lockLabelEl = document.querySelector('#rm-lock-label');
  const stateEl = document.getElementById('rm-state');

  if (labelEl) labelEl.textContent = currentRound || '?';
  if (lockLabelEl) lockLabelEl.textContent = currentRound || '?';

  if (!gameId) {
    if (stateEl) stateEl.innerHTML = '<span class="badge badge-muted">No game set — create or look up a game first</span>';
    return;
  }

  try {
    const game = await getGame(gameId);
    const rs = game.roundState || '—';
    const rsBadge = rs === 'picking' ? 'badge-success' : rs === 'locked' ? 'badge-warning' : rs === 'processing' ? 'badge-error' : 'badge-info';
    if (stateEl) {
      stateEl.innerHTML = `
        <div class="state-grid">
          <div class="state-item"><div class="label">State</div><div class="value"><span class="badge badge-info">${game.state}</span></div></div>
          <div class="state-item"><div class="label">Round State</div><div class="value"><span class="badge ${rsBadge}">${rs}</span></div></div>
          <div class="state-item"><div class="label">Current Round</div><div class="value">${game.currentRound}</div></div>
          <div class="state-item"><div class="label">Players</div><div class="value">${game.playerCount}</div></div>
          <div class="state-item"><div class="label">Prize Pool</div><div class="value">£${game.prizePool}</div></div>
          <div class="state-item"><div class="label">PIN</div><div class="value">${game.pin}</div></div>
        </div>
      `;
    }
    if (game.currentRound) setGame(null, null, game.currentRound);
    if (labelEl) labelEl.textContent = game.currentRound || '?';
    if (lockLabelEl) lockLabelEl.textContent = game.currentRound || '?';
  } catch (err) {
    if (stateEl) stateEl.textContent = `Error: ${err.message}`;
  }
}
