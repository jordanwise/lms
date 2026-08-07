// ── LMS Dev Tools – Main App ──
import { checkConnection, getState } from './api.js';
import { initGameCreator } from './panels/game-creator.js';
import { initPlayerCreator } from './panels/player-creator.js';
import { initRoundManager } from './panels/round-manager.js';
import { initResultInjector } from './panels/result-injector.js';
import { initTickTrigger } from './panels/tick-trigger.js';
import { initGameExplorer } from './panels/game-explorer.js';

// ── Toast System ──
export function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ── Tab Navigation ──
function initTabs() {
  const tabs = document.querySelectorAll('#tab-nav .tab');
  const panels = document.querySelectorAll('.panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${target}`)?.classList.add('active');

      // Trigger panel-specific refresh
      if (target === 'game-explorer') {
        window._refreshExplorer?.();
      }
    });
  });
}

// ── Connection Check ──
async function updateConnectionStatus() {
  const statusEl = document.getElementById('connection-status');
  statusEl.textContent = 'Checking...';
  statusEl.className = '';
  const ok = await checkConnection();
  statusEl.textContent = ok ? '🟢 LocalStack Connected' : '🔴 No Connection';
  statusEl.className = ok ? 'connected' : 'disconnected';
  return ok;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initGameCreator();
  initPlayerCreator();
  initRoundManager();
  initResultInjector();
  initTickTrigger();
  initGameExplorer();

  const connected = await updateConnectionStatus();

  // Periodically check connection every 30s
  setInterval(updateConnectionStatus, 30000);

  // Show current game state in header
  const state = getState();
  if (state.gameId || state.gamePin) {
    toast(`Loaded: Game ${state.gameId?.slice(0, 8)}..., PIN ${state.gamePin}, Round ${state.currentRound}`, 'info');
  }
});
