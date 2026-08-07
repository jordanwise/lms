// ── Tick Trigger Panel ──
import {
  lockRound, submitResults, applyEliminations,
  getGame, getState, setGame, openPicks, addRound,
  manualTick
} from '../api.js';
import { toast } from '../main.js';

// Auto-generated mock results for known teams
const COMMON_TEAMS = [
  'arsenal', 'aston-villa', 'bournemouth', 'brentford', 'brighton',
  'chelsea', 'crystal-palace', 'everton', 'fulham', 'ipswich',
  'leicester', 'liverpool', 'man-city', 'man-utd', 'newcastle',
  'nottingham-forest', 'southampton', 'tottenham', 'west-ham', 'wolves',
];

function generateRandomResults() {
  return COMMON_TEAMS.map(teamId => ({
    teamId,
    outcome: ['win', 'loss', 'draw'][Math.floor(Math.random() * 3)],
  }));
}

export function initTickTrigger() {
  const panel = document.getElementById('panel-tick-trigger');
  panel.innerHTML = `
    <div class="card">
      <h2>⚡ Manual Tick (Full Round Lifecycle)</h2>
      <p class="text-secondary text-sm mb-md">
        Automates a full round lifecycle: Lock → Submit Results → Apply Eliminations.<br/>
        Useful for testing the tick system without waiting for EventBridge.
      </p>

      <div class="form-group">
        <label>Safe Outcome Strategy</label>
        <select id="tt-strategy">
          <option value="random">🎲 Random (some wins, some losses)</option>
          <option value="all-win">✅ All home wins (all picks survive)</option>
          <option value="all-loss">❌ All away wins (all picks eliminated)</option>
          <option value="postponed">⏸️ All postponed (all deferred)</option>
        </select>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" id="tt-lock-only">🔒 Lock Only</button>
        <button class="btn btn-primary" id="tt-results-only">📊 Results Only</button>
        <button class="btn btn-danger" id="tt-eliminate-only">💀 Eliminate Only</button>
      </div>
      <div class="mt-sm">
        <button class="btn btn-warning btn-block" id="tt-full-cycle">⚡ Run Full Round Cycle</button>
      </div>
      <div class="mt-sm">
        <button class="btn btn-outline btn-block btn-sm" id="tt-advance-next">⏭️ Lock + Results + Eliminate + Add Next Round + Open Picks</button>
      </div>
      <div class="divider"></div>
      <div class="mt-sm">
        <button class="btn btn-primary btn-block" id="tt-server-tick">🖥️ Trigger Server Tick (POST /tick)</button>
      </div>

      <div id="tt-log" class="result-box mt-md" style="display:none;max-height:500px;"></div>
    </div>

    <div class="card">
      <h2>📊 Game Summary</h2>
      <div id="tt-state"></div>
    </div>
  `;

  updateState();

  const logEl = panel.querySelector('#tt-log');

  function log(msg, cls) {
    logEl.style.display = 'block';
    const line = document.createElement('div');
    line.style.color = cls === 'error' ? 'var(--error)' : cls === 'success' ? 'var(--success)' : 'var(--text-secondary)';
    line.textContent = msg;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clearLog() {
    logEl.style.display = 'block';
    logEl.innerHTML = '';
    logEl.className = 'result-box mt-md';
  }

  function getStrategyResults() {
    const strategy = panel.querySelector('#tt-strategy').value;
    switch (strategy) {
      case 'all-win':
        return COMMON_TEAMS.map(id => ({ teamId: id, outcome: 'win' }));
      case 'all-loss':
        return COMMON_TEAMS.map(id => ({ teamId: id, outcome: 'loss' }));
      case 'postponed':
        return COMMON_TEAMS.map(id => ({ teamId: id, outcome: 'postponed' }));
      default:
        return generateRandomResults();
    }
  }

  // Lock only
  panel.querySelector('#tt-lock-only').addEventListener('click', async () => {
    clearLog();
    const { currentRound } = getState();
    try {
      log(`🔒 Locking round ${currentRound}...`);
      const r = await lockRound(currentRound);
      log(`✅ Locked → ${r.roundState}`, 'success');
      updateState();
    } catch (err) {
      log(`❌ ${err.message}`, 'error');
    }
  });

  // Results only
  panel.querySelector('#tt-results-only').addEventListener('click', async () => {
    clearLog();
    const { currentRound } = getState();
    const results = getStrategyResults();
    try {
      log(`📊 Submitting ${results.length} results for round ${currentRound}...`);
      const r = await submitResults(currentRound, results);
      log(`✅ Results submitted → ${r.roundState}, updated ${r.updatedPicks} picks`, 'success');
      updateState();
    } catch (err) {
      log(`❌ ${err.message}`, 'error');
    }
  });

  // Eliminate only
  panel.querySelector('#tt-eliminate-only').addEventListener('click', async () => {
    clearLog();
    const { currentRound } = getState();
    try {
      log(`💀 Applying eliminations for round ${currentRound}...`);
      const r = await applyEliminations(currentRound);
      log(`✅ Eliminations applied`, 'success');
      log(`  Game state: ${r.gameState}`);
      log(`  Round state: ${r.roundState}`);
      log(`  Survivors: ${r.survivorCount}`);
      if (r.gameEndEvent) log(`  Game event: ${r.gameEndEvent}`);
      if (r.eliminations) {
        r.eliminations.forEach(e => log(`  ${e.userId} → ${e.newStatus}`));
      }
      updateState();
    } catch (err) {
      log(`❌ ${err.message}`, 'error');
    }
  });

  // Full cycle
  panel.querySelector('#tt-full-cycle').addEventListener('click', async () => {
    clearLog();
    const { currentRound, gameId } = getState();
    if (!gameId) { log('❌ No game set', 'error'); return; }

    try {
      log(`🔄 Starting full cycle for round ${currentRound}...`);

      log(`1️⃣ Locking round ${currentRound}...`);
      await lockRound(currentRound);
      log(`  ✅ Locked`, 'success');

      log(`2️⃣ Submitting results...`);
      const results = getStrategyResults();
      const sr = await submitResults(currentRound, results);
      log(`  ✅ Results submitted, ${sr.updatedPicks} picks updated`, 'success');

      log(`3️⃣ Applying eliminations...`);
      const er = await applyEliminations(currentRound);
      log(`  ✅ Eliminations applied`, 'success');
      log(`  Game: ${er.gameState} | Round: ${er.roundState}`);
      log(`  Survivors: ${er.survivorCount}`);
      if (er.gameEndEvent) log(`  Event: ${er.gameEndEvent}`, 'warning');
      if (er.eliminations) {
        er.eliminations.forEach(e => log(`    ${e.userId} → ${e.newStatus}`));
      }

      log(`\n🎉 Cycle complete!`);
      logEl.className = 'result-box mt-md success';
      toast('Round cycle complete!', 'success');
      updateState();
    } catch (err) {
      log(`❌ ${err.message}`, 'error');
      logEl.className = 'result-box mt-md error';
    }
  });

  // Server tick
  panel.querySelector('#tt-server-tick').addEventListener('click', async () => {
    clearLog();
    try {
      log('🖥️ Triggering server tick via POST /tick...');
      const result = await manualTick();
      log(`✅ Server tick complete`, 'success');
      log(`  Processed at: ${result.processedAt}`);
      log(`  Games checked: ${result.gamesChecked}`);
      log(`  Games processed: ${result.gamesProcessed}`);
      log(`  Games skipped: ${result.gamesSkipped}`);
      if (result.results) {
        for (const r of result.results) {
          if (r.error) {
            log(`  ❌ ${r.gameId}: ${r.error}`, 'error');
          } else {
            log(`  ✅ ${r.gameId} round ${r.roundNum}: → ${r.gameState}${r.gameEndEvent ? ` (${r.gameEndEvent})` : ''}`, 'success');
          }
        }
      }
      updateState();
    } catch (err) {
      log(`❌ ${err.message}`, 'error');
    }
  });

  // Advance to next round
  panel.querySelector('#tt-advance-next').addEventListener('click', async () => {
    clearLog();
    const { currentRound, gameId } = getState();
    if (!gameId) { log('❌ No game set', 'error'); return; }

    try {
      log(`🔄 Full cycle + advance for round ${currentRound}...`);

      log(`1️⃣ Locking round ${currentRound}...`);
      await lockRound(currentRound);
      log(`  ✅ Locked`, 'success');

      log(`2️⃣ Submitting results...`);
      const results = getStrategyResults();
      await submitResults(currentRound, results);
      log(`  ✅ Results submitted`, 'success');

      log(`3️⃣ Applying eliminations...`);
      const er = await applyEliminations(currentRound);
      log(`  ✅ Eliminations applied | Survivors: ${er.survivorCount}`, 'success');

      if (er.gameEndEvent) {
        log(`  ⚠️ Game ended: ${er.gameEndEvent}`, 'warning');
        log(`\n⏹️ Cannot advance — game is over.`);
        updateState();
        return;
      }

      log(`4️⃣ Adding next round...`);
      const ar = await addRound({ matchday: `GW${currentRound + 1}`, leagueId: 'premier-league' });
      log(`  ✅ Round ${ar.roundNum} added (${ar.matchday})`, 'success');

      log(`5️⃣ Opening picks...`);
      await openPicks(ar.roundNum);
      log(`  ✅ Picks opened`, 'success');

      log(`\n🎉 Advanced to round ${ar.roundNum}!`);
      logEl.className = 'result-box mt-md success';
      toast(`Advanced to round ${ar.roundNum}!`, 'success');
      updateState();
    } catch (err) {
      log(`❌ ${err.message}`, 'error');
      logEl.className = 'result-box mt-md error';
    }
  });
}

async function updateState() {
  const { gameId } = getState();
  const el = document.getElementById('tt-state');
  if (!el) return;

  if (!gameId) {
    el.innerHTML = '<span class="badge badge-muted">No game set</span>';
    return;
  }

  try {
    const game = await getGame(gameId);
    el.innerHTML = `
      <div class="state-grid">
        <div class="state-item"><div class="label">Game</div><div class="value"><span class="badge badge-info">${game.state}</span></div></div>
        <div class="state-item"><div class="label">Round State</div><div class="value"><span class="badge badge-warning">${game.roundState || '—'}</span></div></div>
        <div class="state-item"><div class="label">Round</div><div class="value">${game.currentRound}</div></div>
        <div class="state-item"><div class="label">Players</div><div class="value">${game.playerCount}</div></div>
        <div class="state-item"><div class="label">Prize</div><div class="value">£${game.prizePool}</div></div>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<span class="text-muted text-sm">Error: ${err.message}</span>`;
  }
}
