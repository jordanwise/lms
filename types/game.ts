// Game-level states
export type GameState =
  | 'created'
  | 'waiting_for_players'
  | 'active'
  | 'completed'
  | 'rollover_pending'
  | 'cancelled';

// Round-level states (sub-states within "active")
export type RoundState =
  | 'pending'
  | 'picking'
  | 'locked'
  | 'processing'
  | 'complete';

// Player status within a game
export type PlayerStatus =
  | 'alive'
  | 'eliminated'
  | 'deferred'; // postponed match — advances but owes a future pick

// Outcome of a single pick after match results
export type PickOutcome =
  | 'win'
  | 'loss'
  | 'draw'
  | 'postponed';

// Events that trigger state transitions
export type GameEvent =
  | 'SHARE_GAME'
  | 'ADD_ROUND'
  | 'OPEN_PICKS'
  | 'DEADLINE_REACHED'
  | 'RESULTS_AVAILABLE'
  | 'ELIMINATIONS_APPLIED'
  | 'WINNER_DETERMINED'
  | 'ALL_ELIMINATED_SPLIT'
  | 'ALL_ELIMINATED_ROLLOVER'
  | 'ROLLOVER_FEES_COLLECTED'
  | 'CANCEL';

// A single transition in the state machine
export type Transition = {
  from: string;
  to: string;
  event: GameEvent;
  guard?: string;
  description: string;
};

// The full state machine definition shape
export type StateMachineDefinition = {
  id: string;
  version: string;
  initial: GameState;
  states: {
    [key in GameState]: {
      description: string;
      substates?: {
        [key in RoundState]?: {
          description: string;
        };
      };
    };
  };
  playerStatuses: {
    [key in PlayerStatus]: {
      description: string;
    };
  };
  pickOutcomes: {
    [key in PickOutcome]: {
      description: string;
      playerEffect: PlayerStatus;
    };
  };
  transitions: Transition[];
  guards: {
    [key: string]: {
      description: string;
    };
  };
};
