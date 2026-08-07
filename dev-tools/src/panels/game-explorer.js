// ── Game Explorer Panel ──
import { getGame, getGameByPin, cancelGame, getState, setGame } from '../api.js';
import { toast } from '../main.js';

export function initGameExplorer() {
  const panel = document.getElementById('panel-game-explorer');
  panel.innerHTML = `
    <div class="card">
      <h2>🔍 Look Up Game</h2>
      <div class="btn-group">
        <div class="form-group" style="flex:1;margin-bottom:0;">
          <input type="text" id="ge-lookup" placeholder="Enter Game ID or PIN..." />
        </div>
        <button class="btn btn-primary" id="ge-fetch">Fetch Game</button>
        <button class="btn btn-outline" id="ge-refresh">🔄 Refresh</button>
      </div>
    </div>

    <div class="card">
      <h2>⚙️ Actions</h2>
      <div class="btn-group">
        <button class="btn btn-outline btn-sm" id="ge-use-game">📌 Set as Current Game</button>
        <button class="btn btn-danger btn-sm" id="ge-cancel">🚫 Cancel Game</button>
      </div>
    </div>

    <div id="ge-content">
      <p class="text-muted text-sm">Enter a game ID or PIN above and click "Fetch Game".</p>
    </div>
  `;

  // Make refresh accessible from tab switch
  window._refreshExplorer = () => {
    const { gameId } = getState();
    if (gameId) fetchAndDisplay(gameId);
  };

  panel.querySelector('#ge-fetch').addEventListener('click', async () => {
    const val = panel.querySelector('#ge-lookup').value.trim();
    if (!val) { toast('Enter a game ID or PIN', 'error'); return; }

    try {
      let game;
      if (val.length === 8 && /^[A-Z0-9]+$/.test(val)) {
        game = await getGameByPin(val);
      } else {
        game = await getGame(val);
        if (game.pin) setGame(game.gameId, game.pin, game.currentRound);
      }
      displayGame(game);
      toast(`Loaded: ${game.name}`, 'success');
    } catch (err) {
      document.getElementById('ge-content').innerHTML = `<div class="result-box error">❌ ${err.message}</div>`;
    }
  });

  panel.querySelector('#ge-refresh').addEventListener('click', async () => {
    const { gameId } = getState();
    if (!gameId) { toast('Set or look up a game first', 'error'); return; }
    try {
      const game = await getGame(gameId);
      displayGame(game);
      toast('Refreshed', 'success');
    } catch (err) {
      document.getElementById('ge-content').innerHTML = `<div class="result-box error">❌ ${err.message}</div>`;
    }
  });

  panel.querySelector('#ge-use-game').addEventListener('click', async () => {
    const val = panel.querySelector('#ge-lookup').value.trim();
    if (!val) { toast('Enter a game ID or PIN first', 'error'); return; }
    try {
      let game;
      if (val.length === 8 && /^[A-Z0-9]+$/.test(val)) {
        game = await getGameByPin(val);
      } else {
        game = await getGame(val);
      }
      toast(`Set as current game: ${game.name}`, 'success');
      displayGame(game);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  panel.querySelector('#ge-cancel').addEventListener('click', async () => {
    if (!confirm('Really cancel this game? This cannot be undone.')) return;
    try {
      const result = await cancelGame();
      toast('Game cancelled', 'success');
      displayGame(result);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Auto-fetch current game on init
  const { gameId } = getState();
  if (gameId) {
    panel.querySelector('#ge-lookup').value = gameId;
    fetchAndDisplay(gameId);
  }
}

async function fetchAndDisplay(id) {
  try {
    const game = await getGame(id);
    displayGame(game);
  } catch (err) {
    document.getElementById('ge-content').innerHTML = `<div class="result-box error">❌ ${err.message}</div>`;
  }
}

function displayGame(game) {
  const el = document.getElementById('ge-content');
  if (!el) return;

  const stateBadge = (s) => {
    const map = { active: 'badge-success', completed: 'badge-info', cancelled: 'badge-error', waiting_for_players: 'badge-warning', created: 'badge-muted', rollover_pending: 'badge-warning' };
    return map[s] || 'badge-muted';
  };

  const rsBadge = (s) => {
    const map = { picking: 'badge-success', locked: 'badge-warning', processing: 'badge-error', complete: 'badge-info', pending: 'badge-muted' };
    return map[s] || 'badge-muted';
  };

  el.innerHTML = `
    <div class="card">
      <h2>${game.name}</h2>
      <div class="state-grid">
        <div class="state-item"><div class="label">State</div><div class="value"><span class="badge ${stateBadge(game.state)}">${game.state}</span></div></div>
        <div class="state-item"><div class="label">Round State</div><div class="value"><span class="badge ${rsBadge(game.roundState)}">${game.roundState || '—'}</span></div></div>
        <div class="state-item"><div class="label">Current Round</div><div class="value">${game.currentRound}</div></div>
        <div class="state-item"><div class="label">Players</div><div class="value">${game.playerCount}</div></div>
        <div class="state-item"><div class="label">Prize Pool</div><div class="value">£${game.prizePool}</div></div>
        <div class="state-item"><div class="label">Entry Fee</div><div class="value">£${game.fee}</div></div>
        <div class="state-item"><div class="label">Rollover</div><div class="value">${game.rollover ? '✅' : '❌'}</div></div>
        <div class="state-item"><div class="label">Split Pot</div><div class="value">${game.splitPot ? '✅' : '❌'}</div></div>
        <div class="state-item"><div class="label">Game ID</div><div class="value text-mono text-sm">${game.gameId}</div></div>
        <div class="state-item"><div class="label">PIN</div><div class="value" style="font-size:18px;letter-spacing:2px;">${game.pin}</div></div>
        <div class="state-item"><div class="label">Creator</div><div class="value">${game.creatorId}</div></div>
        <div class="state-item"><div class="label">Leagues</div><div class="value text-sm">${(game.leagues || []).join(', ')}</div></div>
      </div>
    </div>

    <div class="card">
      <h2>📅 Timestamps</h2>
      <div class="state-grid">
        <div class="state-item"><div class="label">Created</div><div class="value text-sm">${new Date(game.createdAt).toLocaleString()}</div></div>
        <div class="state-item"><div class="label">Updated</div><div class="value text-sm">${new Date(game.updatedAt).toLocaleString()}</div></div>
        <div class="state-item"><div class="label">Version</div><div class="value">${game.version}</div></div>
      </div>
    </div>

    <div class="card">
      <h2>📋 Raw JSON</h2>
      <div class="result-box" style="max-height:400px;">${JSON.stringify(game, null, 2)}</div>
    </div>
  `;

  // Update the lookup input
  const lookupEl = document.getElementById('ge-lookup');
  if (lookupEl) lookupEl.value = game.gameId;
}
