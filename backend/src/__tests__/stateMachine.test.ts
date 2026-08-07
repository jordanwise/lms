import {
  compositeState,
  findTransition,
  canTransition,
  applyTransition,
} from '../lib/stateMachine';
import type { GameState, RoundState } from '../types';

describe('State Machine', () => {
  // ──────────────────────────────────────────────
  // compositeState
  // ──────────────────────────────────────────────
  describe('compositeState()', () => {
    it('returns plain state for non-active game states', () => {
      expect(compositeState('created')).toBe('created');
      expect(compositeState('waiting_for_players')).toBe('waiting_for_players');
      expect(compositeState('completed')).toBe('completed');
      expect(compositeState('rollover_pending')).toBe('rollover_pending');
      expect(compositeState('cancelled')).toBe('cancelled');
      expect(compositeState('abandoned')).toBe('abandoned');
    });

    it('returns plain state when active has no roundState', () => {
      expect(compositeState('active')).toBe('active');
      expect(compositeState('active', undefined)).toBe('active');
    });

    it('returns composite state for active with roundState', () => {
      expect(compositeState('active', 'picking')).toBe('active.picking');
      expect(compositeState('active', 'pending')).toBe('active.pending');
      expect(compositeState('active', 'locked')).toBe('active.locked');
      expect(compositeState('active', 'processing')).toBe('active.processing');
      expect(compositeState('active', 'complete')).toBe('active.complete');
    });

    it('ignores roundState for non-active states', () => {
      expect(compositeState('completed', 'picking')).toBe('completed');
    });
  });

  // ──────────────────────────────────────────────
  // findTransition
  // ──────────────────────────────────────────────
  describe('findTransition()', () => {
    it('finds a simple transition without guard', () => {
      const t = findTransition('created', 'SHARE_GAME');
      expect(t).not.toBeNull();
      expect(t!.from).toBe('created');
      expect(t!.to).toBe('waiting_for_players');
    });

    it('finds a guarded transition when context satisfies guard', () => {
      const t = findTransition('active.complete', 'ADD_ROUND', {
        alivePlayers: 3,
        totalPlayers: 5,
        rollover: false,
        splitPot: false,
      });
      expect(t).not.toBeNull();
      expect(t!.to).toBe('active.pending');
      expect(t!.guard).toBe('hasMultipleSurvivors');
    });

    it('returns null when guard is not satisfied', () => {
      const t = findTransition('active.complete', 'ADD_ROUND', {
        alivePlayers: 1,
        totalPlayers: 5,
        rollover: false,
        splitPot: false,
      });
      expect(t).toBeNull();
    });

    it('returns null for non-existent transition', () => {
      expect(findTransition('completed', 'ADD_ROUND')).toBeNull();
      expect(findTransition('waiting_for_players', 'SHARE_GAME')).toBeNull();
    });

    it('returns null for wrong composite state', () => {
      expect(findTransition('active', 'OPEN_PICKS')).toBeNull();
      expect(findTransition('active.pending', 'OPEN_PICKS')).not.toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // canTransition
  // ──────────────────────────────────────────────
  describe('canTransition()', () => {
    it('returns true for valid transitions', () => {
      expect(canTransition('created', undefined, 'CANCEL')).toBe(true);
      expect(canTransition('waiting_for_players', undefined, 'ADD_ROUND')).toBe(true);
      expect(canTransition('waiting_for_players', undefined, 'CANCEL')).toBe(true);
      expect(canTransition('active', 'pending', 'OPEN_PICKS')).toBe(true);
      expect(canTransition('active', 'picking', 'DEADLINE_REACHED')).toBe(true);
      expect(canTransition('active', 'locked', 'RESULTS_AVAILABLE')).toBe(true);
      expect(canTransition('active', 'processing', 'ELIMINATIONS_APPLIED')).toBe(true);
      expect(canTransition('active', undefined, 'CANCEL')).toBe(true);
    });

    it('returns false for invalid transitions', () => {
      expect(canTransition('created', undefined, 'ADD_ROUND')).toBe(false);
      expect(canTransition('waiting_for_players', undefined, 'SHARE_GAME')).toBe(false);
      expect(canTransition('completed', undefined, 'ADD_ROUND')).toBe(false);
      expect(canTransition('active', 'picking', 'ELIMINATIONS_APPLIED')).toBe(false);
    });

    it('guard: hasMultipleSurvivors — true when alive > 1', () => {
      expect(canTransition('active', 'complete', 'ADD_ROUND', {
        alivePlayers: 2, totalPlayers: 5, rollover: false, splitPot: false,
      })).toBe(true);
    });

    it('guard: hasMultipleSurvivors — false when alive === 1', () => {
      expect(canTransition('active', 'complete', 'ADD_ROUND', {
        alivePlayers: 1, totalPlayers: 5, rollover: false, splitPot: false,
      })).toBe(false);
    });

    it('guard: hasMultipleSurvivors — false when alive === 0', () => {
      expect(canTransition('active', 'complete', 'ADD_ROUND', {
        alivePlayers: 0, totalPlayers: 5, rollover: false, splitPot: false,
      })).toBe(false);
    });

    it('guard: exactlyOneSurvivor — true when alive === 1', () => {
      expect(canTransition('active', 'complete', 'WINNER_DETERMINED', {
        alivePlayers: 1, totalPlayers: 5, rollover: false, splitPot: false,
      })).toBe(true);
    });

    it('guard: exactlyOneSurvivor — false when alive !== 1', () => {
      expect(canTransition('active', 'complete', 'WINNER_DETERMINED', {
        alivePlayers: 2, totalPlayers: 5, rollover: false, splitPot: false,
      })).toBe(false);
      expect(canTransition('active', 'complete', 'WINNER_DETERMINED', {
        alivePlayers: 0, totalPlayers: 5, rollover: false, splitPot: false,
      })).toBe(false);
    });

    it('guard: allEliminatedAndSplitPot — true when alive === 0 && splitPot', () => {
      expect(canTransition('active', 'complete', 'ALL_ELIMINATED_SPLIT', {
        alivePlayers: 0, totalPlayers: 5, rollover: false, splitPot: true,
      })).toBe(true);
    });

    it('guard: allEliminatedAndSplitPot — false without splitPot', () => {
      expect(canTransition('active', 'complete', 'ALL_ELIMINATED_SPLIT', {
        alivePlayers: 0, totalPlayers: 5, rollover: false, splitPot: false,
      })).toBe(false);
    });

    it('guard: allEliminatedAndSplitPot — false when alive > 0', () => {
      expect(canTransition('active', 'complete', 'ALL_ELIMINATED_SPLIT', {
        alivePlayers: 1, totalPlayers: 5, rollover: false, splitPot: true,
      })).toBe(false);
    });

    it('guard: allEliminatedAndRollover — true when alive === 0 && rollover', () => {
      expect(canTransition('active', 'complete', 'ALL_ELIMINATED_ROLLOVER', {
        alivePlayers: 0, totalPlayers: 5, rollover: true, splitPot: false,
      })).toBe(true);
    });

    it('guard: allEliminatedAndRollover — false without rollover', () => {
      expect(canTransition('active', 'complete', 'ALL_ELIMINATED_ROLLOVER', {
        alivePlayers: 0, totalPlayers: 5, rollover: false, splitPot: false,
      })).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // applyTransition
  // ──────────────────────────────────────────────
  describe('applyTransition()', () => {
    it('returns new non-active state', () => {
      const result = applyTransition('created', undefined, 'CANCEL');
      expect(result.gameState).toBe('cancelled');
      expect(result.roundState).toBeUndefined();
    });

    it('returns active with roundState for composite transitions', () => {
      const result = applyTransition('active', 'pending', 'OPEN_PICKS');
      expect(result.gameState).toBe('active');
      expect(result.roundState).toBe('picking');
    });

    it('returns plain active when reaching top-level active', () => {
      // ADD_ROUND from waiting_for_players → active (no sub-state)
      // The handler sets roundState to 'pending' on the RoundItem, not the state machine
      const result = applyTransition('waiting_for_players', undefined, 'ADD_ROUND');
      expect(result.gameState).toBe('active');
      expect(result.roundState).toBeUndefined();
    });

    it('throws for invalid transition', () => {
      expect(() => {
        applyTransition('completed', undefined, 'ADD_ROUND');
      }).toThrow('Invalid transition');
    });

    it('throws for transition rejected by guard', () => {
      expect(() => {
        applyTransition('active', 'complete', 'ADD_ROUND', {
          alivePlayers: 1, totalPlayers: 5, rollover: false, splitPot: false,
        });
      }).toThrow('Invalid transition');
    });

    it('returns completed for WINNER_DETERMINED', () => {
      const result = applyTransition('active', 'complete', 'WINNER_DETERMINED', {
        alivePlayers: 1, totalPlayers: 5, rollover: false, splitPot: false,
      });
      expect(result.gameState).toBe('completed');
      expect(result.roundState).toBeUndefined();
    });

    it('returns rollover_pending for ALL_ELIMINATED_ROLLOVER', () => {
      const result = applyTransition('active', 'complete', 'ALL_ELIMINATED_ROLLOVER', {
        alivePlayers: 0, totalPlayers: 5, rollover: true, splitPot: false,
      });
      expect(result.gameState).toBe('rollover_pending');
      expect(result.roundState).toBeUndefined();
    });

    it('returns completed for ALL_ELIMINATED_SPLIT', () => {
      const result = applyTransition('active', 'complete', 'ALL_ELIMINATED_SPLIT', {
        alivePlayers: 0, totalPlayers: 5, rollover: false, splitPot: true,
      });
      expect(result.gameState).toBe('completed');
      expect(result.roundState).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────
  // Full game lifecycle transitions
  // ──────────────────────────────────────────────
  describe('full lifecycle', () => {
    it('created → cancelled', () => {
      const r = applyTransition('created', undefined, 'CANCEL');
      expect(r.gameState).toBe('cancelled');
    });

    it('created → waiting_for_players', () => {
      const r = applyTransition('created', undefined, 'SHARE_GAME');
      expect(r.gameState).toBe('waiting_for_players');
    });

    it('waiting_for_players → cancelled', () => {
      const r = applyTransition('waiting_for_players', undefined, 'CANCEL');
      expect(r.gameState).toBe('cancelled');
    });

    it('waiting_for_players → active (first round)', () => {
      // ADD_ROUND from waiting_for_players → active; handler sets roundState separately
      const r = applyTransition('waiting_for_players', undefined, 'ADD_ROUND');
      expect(r.gameState).toBe('active');
      expect(r.roundState).toBeUndefined();
    });

    it('active.pending → active.picking', () => {
      const r = applyTransition('active', 'pending', 'OPEN_PICKS');
      expect(r.gameState).toBe('active');
      expect(r.roundState).toBe('picking');
    });

    it('active.picking → active.locked', () => {
      const r = applyTransition('active', 'picking', 'DEADLINE_REACHED');
      expect(r.gameState).toBe('active');
      expect(r.roundState).toBe('locked');
    });

    it('active.locked → active.processing', () => {
      const r = applyTransition('active', 'locked', 'RESULTS_AVAILABLE');
      expect(r.gameState).toBe('active');
      expect(r.roundState).toBe('processing');
    });

    it('active.processing → active.complete', () => {
      const r = applyTransition('active', 'processing', 'ELIMINATIONS_APPLIED');
      expect(r.gameState).toBe('active');
      expect(r.roundState).toBe('complete');
    });

    it('active.complete → active.pending (next round with survivors)', () => {
      const r = applyTransition('active', 'complete', 'ADD_ROUND', {
        alivePlayers: 3, totalPlayers: 5, rollover: false, splitPot: false,
      });
      expect(r.gameState).toBe('active');
      expect(r.roundState).toBe('pending');
    });

    it('active.complete → completed (exactly one survivor)', () => {
      const r = applyTransition('active', 'complete', 'WINNER_DETERMINED', {
        alivePlayers: 1, totalPlayers: 5, rollover: false, splitPot: false,
      });
      expect(r.gameState).toBe('completed');
    });

    it('rollover_pending → active (rollover fees collected)', () => {
      const r = applyTransition('rollover_pending', undefined, 'ROLLOVER_FEES_COLLECTED');
      expect(r.gameState).toBe('active');
    });

    it('rollover_pending → cancelled', () => {
      const r = applyTransition('rollover_pending', undefined, 'CANCEL');
      expect(r.gameState).toBe('cancelled');
    });
  });
});
