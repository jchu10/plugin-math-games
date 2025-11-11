# Design Overview

A jsPsych plugin (using TS) wrapping a React app that hosts a Phaser math game.

## Data Flow

`jsPsych Plugin → React Wrapper → React App → Phaser Game → GameScene`

## Key Components

### jsPsych Integration

- **`index.ts`** - Plugin entry point
- **`MathGamesPluginWrapper.tsx`** - Mounts React app, connects `finishTrial` callback

### React Layer

- **`MathGamesApp.tsx`** - Bridges jsPsych and Phaser
  - Manages UI state (score, gameState)
  - Listens to Phaser events
  - Calls `onFinish` when game ends

### Phaser Layer

- **`core/game.ts`** - Launches Phaser.Game with config
- **`core/GameScene.ts`** - Game logic
  - Renders questions, asteroids, spaceship, UI
  - Handles user input and scoring
  - Emits events ('MathResponse', 'GameOver', etc.)
- **`core/mathquestions`** - Generates math questions
- **`core/types.ts`** - Shared TypeScript interfaces

## Lifecycle

1. jsPsych runs trial → mounts React app
2. React calls `launchGame(config)`
3. Phaser creates GameScene with config
4. GameScene runs gameplay loop
5. User answers → Scene emits events
6. React updates UI and logs events
7. Game ends → React calls `onFinish` → jsPsych records data

## Event Flow

- **Player actions** → GameScene → Phaser events → React listeners
- **Game events**: 'MathResponse', 'HintUsed', 'GameOver', 'restartGame'
- **Data collection**: LogEvents accumulated and returned to jsPsych

## Configuration

Trial configs (JSON) specify:

- Math operation type
- Difficulty settings
- Lives, timer, hints
- Question progression rules

Loaded via `examples/index.html` and passed through the component chain.
