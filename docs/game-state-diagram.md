# Last Player Standing — Game State Diagram

## Game Lifecycle

![Game Lifecycle](diagrams/game-lifecycle.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
stateDiagram-v2
    [*] --> created

    created --> waiting_for_players : SHARE_GAME
    created --> cancelled : CANCEL

    waiting_for_players --> active : ADD_ROUND (first round)
    waiting_for_players --> cancelled : CANCEL

    state active {
        [*] --> pending

        pending --> picking : OPEN_PICKS
        picking --> locked : DEADLINE_REACHED
        locked --> processing : RESULTS_AVAILABLE
        processing --> complete : ELIMINATIONS_APPLIED

        complete --> pending : ADD_ROUND\n[hasMultipleSurvivors]
    }

    active --> completed : WINNER_DETERMINED\n[exactlyOneSurvivor]
    active --> completed : ALL_ELIMINATED_SPLIT\n[allEliminatedAndSplitPot]
    active --> rollover_pending : ALL_ELIMINATED_ROLLOVER\n[allEliminatedAndRollover]
    active --> cancelled : CANCEL

    rollover_pending --> active : ROLLOVER_FEES_COLLECTED\n(prize doubles, all players restart)
    rollover_pending --> cancelled : CANCEL

    completed --> [*]
    cancelled --> [*]
```

</details>

## Player Status Flow

![Player Flow](diagrams/player-flow.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
stateDiagram-v2
    [*] --> alive : Joins game & pays fee

    alive --> alive : Pick wins
    alive --> eliminated : Pick loses or draws
    alive --> deferred : Match postponed

    deferred --> alive : Both picks win\n(original + rescheduled)
    deferred --> eliminated : Either pick loses/draws

    eliminated --> [*]
    alive --> [*] : Winner / Split pot

    note right of deferred
        Player advances but must succeed
        on both picks when the postponed
        match is rescheduled
    end note
```

</details>

## Round Lifecycle Detail

![Round Detail](diagrams/round-detail.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
flowchart LR
    A[Creator chooses matchday] --> B[Round: pending]
    B --> C[Creator opens picks]
    C --> D[Round: picking]
    D --> E[Deadline passes]
    E --> F[Round: locked]
    F --> G[Results come in]
    G --> H[Round: processing]
    H --> I{Outcomes}
    I -->|Win| J[Player survives]
    I -->|Loss/Draw| K[Player eliminated]
    I -->|Postponed| L[Player deferred]
    J --> M[Round: complete]
    K --> M
    L --> M
    M --> N{Game check}
    N -->|1 survivor| O[🏆 Winner!]
    N -->|Multiple survivors| A
    N -->|All eliminated + split pot| P[💰 Pot split]
    N -->|All eliminated + rollover| Q[🔄 Rollover]
    Q -->|All repay fee| A
```

</details>

## State Reference

| Game State | Description |
|---|---|
| `created` | Game set up, not yet shared |
| `waiting_for_players` | Players joining via PIN/link |
| `active` | Rounds in progress |
| `completed` | Winner or split pot |
| `rollover_pending` | Collecting repayment fees |
| `cancelled` | Game cancelled |

| Round State | Description |
|---|---|
| `pending` | Matchday chosen, picks not open |
| `picking` | Players choosing teams |
| `locked` | Deadline passed, matches playing |
| `processing` | Results in, calculating |
| `complete` | Eliminations done |
