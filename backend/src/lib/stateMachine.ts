// Inline the state machine definition to avoid rootDir issues with JSON imports.
// Source of truth: /constants/gameStateMachine.json
import * as fs from 'fs';
import * as path from 'path';
import type { GameState, RoundState } from '../types';

interface TransitionDef {
  from: string;
  to: string;
  event: string;
  guard?: string;
  description: string;
}

interface StateMachineJson {
  transitions: TransitionDef[];
}

// Load transitions from the JSON — works both locally and in Lambda
let _transitions: TransitionDef[] | null = null;

function getTransitions(): TransitionDef[] {
  if (_transitions) return _transitions;

  // Try multiple locations for the state machine JSON
  const candidates = [
    path.resolve(__dirname, '../../../constants/gameStateMachine.json'),
    path.resolve(__dirname, '../../../../constants/gameStateMachine.json'),
  ];

  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, 'utf-8');
      const parsed = JSON.parse(raw) as StateMachineJson;
      _transitions = parsed.transitions;
      return _transitions;
    } catch {
      // try next
    }
  }

  // Fallback: inline the transitions
  _transitions = FALLBACK_TRANSITIONS;
  return _transitions;
}

const FALLBACK_TRANSITIONS: TransitionDef[] = [
  { from: 'created', to: 'waiting_for_players', event: 'SHARE_GAME', description: '' },
  { from: 'created', to: 'cancelled', event: 'CANCEL', description: '' },
  { from: 'waiting_for_players', to: 'active', event: 'ADD_ROUND', description: '' },
  { from: 'waiting_for_players', to: 'cancelled', event: 'CANCEL', description: '' },
  { from: 'active.pending', to: 'active.picking', event: 'OPEN_PICKS', description: '' },
  { from: 'active.picking', to: 'active.locked', event: 'DEADLINE_REACHED', description: '' },
  { from: 'active.locked', to: 'active.processing', event: 'RESULTS_AVAILABLE', description: '' },
  { from: 'active.processing', to: 'active.complete', event: 'ELIMINATIONS_APPLIED', description: '' },
  { from: 'active.complete', to: 'active.pending', event: 'ADD_ROUND', guard: 'hasMultipleSurvivors', description: '' },
  { from: 'active.complete', to: 'completed', event: 'WINNER_DETERMINED', guard: 'exactlyOneSurvivor', description: '' },
  { from: 'active.complete', to: 'completed', event: 'ALL_ELIMINATED_SPLIT', guard: 'allEliminatedAndSplitPot', description: '' },
  { from: 'active.complete', to: 'rollover_pending', event: 'ALL_ELIMINATED_ROLLOVER', guard: 'allEliminatedAndRollover', description: '' },
  { from: 'rollover_pending', to: 'active', event: 'ROLLOVER_FEES_COLLECTED', description: '' },
  { from: 'rollover_pending', to: 'cancelled', event: 'CANCEL', description: '' },
  { from: 'active', to: 'cancelled', event: 'CANCEL', description: '' },
];

interface GuardContext {
  alivePlayers: number;
  totalPlayers: number;
  rollover: boolean;
  splitPot: boolean;
  playerHasDeferredPick?: boolean;
}

/**
 * Build a composite state string for matching transitions.
 * Game-level states are plain (e.g. "created"), active sub-states
 * are prefixed (e.g. "active.picking").
 */
export function compositeState(
  gameState: GameState,
  roundState?: RoundState
): string {
  if (gameState === 'active' && roundState) {
    return `active.${roundState}`;
  }
  return gameState;
}

/**
 * Evaluate a named guard against the provided context.
 */
function evaluateGuard(guardName: string, ctx: GuardContext): boolean {
  switch (guardName) {
    case 'hasMultipleSurvivors':
      return ctx.alivePlayers > 1;
    case 'exactlyOneSurvivor':
      return ctx.alivePlayers === 1;
    case 'allEliminatedAndSplitPot':
      return ctx.alivePlayers === 0 && ctx.splitPot;
    case 'allEliminatedAndRollover':
      return ctx.alivePlayers === 0 && ctx.rollover;
    case 'noRepeatPick':
      return true; // validated separately in pick handler
    case 'playerHasDeferredPick':
      return ctx.playerHasDeferredPick === true;
    default:
      return true;
  }
}

/**
 * Find a matching transition for the given current state + event.
 * Returns the transition definition if valid, or null if no transition applies.
 */
export function findTransition(
  currentState: string,
  event: string,
  guardCtx?: GuardContext
): TransitionDef | null {
  const transitions = getTransitions();
  const candidates = transitions.filter(
    (t) => t.from === currentState && t.event === event
  );

  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    if (!candidate.guard) return candidate;
    if (guardCtx && evaluateGuard(candidate.guard, guardCtx)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Check if a transition is allowed without applying it.
 */
export function canTransition(
  gameState: GameState,
  roundState: RoundState | undefined,
  event: string,
  guardCtx?: GuardContext
): boolean {
  const current = compositeState(gameState, roundState);
  return findTransition(current, event, guardCtx) !== null;
}

/**
 * Apply a transition, returning the new game state and round state.
 * Throws if the transition is not valid.
 */
export function applyTransition(
  gameState: GameState,
  roundState: RoundState | undefined,
  event: string,
  guardCtx?: GuardContext
): { gameState: GameState; roundState?: RoundState } {
  const current = compositeState(gameState, roundState);
  const transition = findTransition(current, event, guardCtx);

  if (!transition) {
    throw new Error(
      `Invalid transition: ${current} + ${event} (no matching transition)`
    );
  }

  const to = transition.to;

  if (to.startsWith('active.')) {
    const newRoundState = to.replace('active.', '') as RoundState;
    return { gameState: 'active', roundState: newRoundState };
  }

  return { gameState: to as GameState, roundState: undefined };
}
