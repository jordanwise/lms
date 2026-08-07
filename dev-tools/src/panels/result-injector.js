// ── Result Injector Panel ──
import { submitResults, applyEliminations, getGame, getState, setGame } from '../api.js';
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

// Generate 10 realistic mock fixture pairs
function generateMockFixtures() {
  const results = [];
  const shuffled = [...PREMIER_LEAGUE_TEAMS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    results.push({ home: shuffled[i], away: shuffled[i + 1] });
  }
  return results.slice(0, 10);
}

export function initResultInjector() {
  const { currentRound } = getState();

  const panel = document.getElementById('panel-result-injector');
  panel.innerHTML = `
    <div class="card">
      <h2 class="flex-between">
        <span>🏟️ Submit Results</span>
        <span class="text-muted text-sm">Round <span id="ri-round-label">${currentRound || '?'}</span></span>
      </h2>
      <p class="text-secondary text-sm mb-md">Enter match outcomes for the current round. Game must be in "locked" state.</p>

      <div id="ri-fixtures"></div>
      <div class="btn-group mt-md">
        <button class="btn btn-outline btn-sm" id="ri-generate">🎲 Generate 10 Fixtures</button>
        <button class="btn btn-primary" id="ri-submit-results">Submit Results</button>
        <button class="btn btn-danger" id="ri-apply-eliminations">Apply Eliminations</button>
      </div>
      <div id="ri-result" class="result-box mt-md" style="display:none;"></div>
    </div>

    <div class="card">
      <h2>📊 Quick Fill: Make One Team Win All</h2>
      <p class="text-secondary text-sm mb-sm">Use to have most users survive for testing multi-round games.</p>
      <div class="form-group">
        <select id="ri-safeteam">
          <option value="">— Select a safe team —</option>
          ${PREMIER_LEAGUE_TEAMS.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  const fixturesEl = panel.querySelector('#ri-fixtures');

  function renderFixtures() {
    const rn = getState().currentRound || '?';
    panel.querySelector('#ri-round-label').textContent = rn;

    const fixtures = generateMockFixtures();
    fixturesEl.innerHTML = fixtures.map((f, i) => `
      <div class="fixture-row">
        <span class="text-muted text-sm" style="min-width:20px">${i + 1}.</span>
        <span style="flex:1;text-align:right">${f.home.name}</span>
        <span class="text-muted">vs</span>
        <span style="flex:1">${f.away.name}</span>
        <select class="fixture-outcome" data-home="${f.home.id}" data-away="${f.away.id}" style="width:auto;padding:5px 8px;font-size:12px;background:var(--surface-light);border:1px solid var(--divider);border-radius:var(--radius-sm);color:var(--text)">
          <option value="">—</option>
          <option value="win">${f.home.name} Win</option>
          <option value="loss">${f.away.name} Win</option>
          <option value="draw">Draw</option>
          <option value="postponed">Postponed</option>
        </select>
      </div>
    `).join('');
  }

  renderFixtures();

  panel.querySelector('#ri-generate').addEventListener('click', renderFixtures);

  // Quick fill safe team
  panel.querySelector('#ri-safeteam').addEventListener('change', (e) => {
    const safeTeam = e.target.value;
    if (!safeTeam) return;
    const selects = fixturesEl.querySelectorAll('.fixture-outcome');
    selects.forEach(s => {
      const home = s.dataset.home;
      const away = s.dataset.away;
      if (home === safeTeam) s.value = 'win';
      else if (away === safeTeam) s.value = 'loss';
      else s.value = Math.random() > 0.5 ? 'win' : 'draw';
    });
  });

  panel.querySelector('#ri-submit-results').addEventListener('click', async () => {
    const { currentRound } = getState();
    const selects = fixturesEl.querySelectorAll('.fixture-outcome');
    const results = [];
    selects.forEach(s => {
      if (!s.value) return;
      const outcome = s.value;
      results.push({ teamId: s.dataset.home, outcome: outcome === 'loss' ? 'loss' : outcome === 'win' ? 'win' : outcome === 'draw' ? 'draw' : 'postponed' });
      results.push({ teamId: s.dataset.away, outcome: outcome === 'win' ? 'loss' : outcome === 'loss' ? 'win' : outcome === 'draw' ? 'draw' : 'postponed' });
    });

    if (results.length === 0) { toast('Select at least one outcome', 'error'); return; }

    const btn = panel.querySelector('#ri-submit-results');
    btn.disabled = true;
    const resEl = panel.querySelector('#ri-result');
    resEl.style.display = 'block';
    resEl.className = 'result-box';
    resEl.textContent = `Submitting ${results.length / 2} match results...`;

    try {
      const result = await submitResults(currentRound, results);
      resEl.className = 'result-box success';
      resEl.textContent = `✅ Results submitted!\nRound: ${result.roundNum}\nState: ${result.roundState}\nPicks updated: ${result.updatedPicks}`;
      toast('Results submitted!', 'success');
    } catch (err) {
      resEl.className = 'result-box error';
      resEl.textContent = `❌ ${err.message}`;
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  panel.querySelector('#ri-apply-eliminations').addEventListener('click', async () => {
    const { currentRound } = getState();
    const btn = panel.querySelector('#ri-apply-eliminations');
    btn.disabled = true;
    const resEl = panel.querySelector('#ri-result');
    resEl.style.display = 'block';
    resEl.className = 'result-box';
    resEl.textContent = 'Applying eliminations...';

    try {
      const result = await applyEliminations(currentRound);
      resEl.className = 'result-box success';
      const elims = (result.eliminations || []).map(e => `  ${e.userId}: ${e.newStatus}`).join('\n');
      resEl.textContent = `✅ Eliminations applied!\nGame State: ${result.gameState}\nRound State: ${result.roundState}\nSurvivors: ${result.survivorCount}\n${result.gameEndEvent ? `End Event: ${result.gameEndEvent}\n` : ''}\n${elims}`;
      if (result.gameEndEvent) {
        toast(`Game ended: ${result.gameEndEvent}!`, 'success');
      } else {
        toast(`${result.survivorCount} survivor(s) remain`, 'success');
      }
    } catch (err) {
      resEl.className = 'result-box error';
      resEl.textContent = `❌ ${err.message}`;
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}
