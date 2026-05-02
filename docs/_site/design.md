# Design Overview

A jsPsych plugin that integrates a Phaser-based math game through a React wrapper layer. The architecture consists of four main layers: jsPsych plugin, React wrapper, Phaser game engine, and event logging system.

## Architecture Layers

### 1. jsPsych Plugin Layer (`index.ts`)

**`MathGamesPlugin`** - Main plugin class implementing `JsPsychPlugin<Info>`
- Manages trial lifecycle and timing
- Handles trial parameters and configuration
- Creates DOM structure (game container, timer, finish button)
- Controls trial duration (minimum or maximum time limits)
- Implements countdown timer display
- Collects and returns trial data to jsPsych
- Coordinates with React wrapper via `startMathGameTrial()`

**Key Parameters:**
- Game configuration: `cover_story`, `controls`, `hint_type`, `feedback_type`
- Difficulty settings: `difficulty`, `question_sequence_logic`
- Timing: `game_duration_limit`, `trial_duration`, `trial_duration_limit_type`
- UI options: `prompt`, `show_finished_button`, `display_in_game_timer`
- Canvas size: `game_size` (height, width array)

### 2. React Wrapper Layer

**`MathGamesPluginWrapper.tsx`** - Bridge between jsPsych and React
- Mounts React app into jsPsych display element
- Passes `GameConfig` to React app
- Handles `onGameEnd` callback to accumulate round data
- Unmounts React app when round completes
- **Cleanup Lifecycle:**
  - Returns a cleanup function from `startMathGameTrial`
  - Allows jsPsych to explicitly unmount React root
  - Ensures `MathGamesApp` destruction (and thus Phaser game destruction) when trial ends


**`MathGamesApp.tsx`** - React component managing Phaser instance
- Creates Phaser game container (`phaser-game-container`)
- Calls `launchGame()` to initialize Phaser
- Maintains game reference to prevent duplicate instances
- Minimal UI (just container div for Phaser canvas)

### 3. Phaser Game Engine Layer

**`core/launchGame.ts`** - Phaser initialization
- Creates `Phaser.Game` instance with configuration
- Sets up physics (Arcade physics with no gravity)
- Configures responsive scaling (`Phaser.Scale.RESIZE`)
- Registers three scenes: `GameWelcome`, `GameScene`, `GameOver`
- Starts with `GameWelcome` scene

**Three Game Scenes:**

1. **`GameWelcome.ts`** - Welcome/instruction screen
   - Displays game background based on cover story
   - Shows control instructions (arrow keys or tap/click)
   - Provides "Start" button to begin game
   - Transitions to `GameScene` on start

2. **`GameScene.ts`** - Main gameplay scene (~1850 lines)
   - **Question Management:**
     - Uses `MathQuestionService` to generate questions
     - Implements difficulty progression (staircase or random)
     - Tracks question history and statistics
   - **Game Mechanics:**
     - Two control schemes: arrow keys (spaceship) or tap-to-select (thought bubbles)
     - Spawns answer objects (asteroids or thought bubbles) with physics
     - Handles collision detection and answer validation
     - Implements lives system and scoring
   - **Feedback Systems:**
     - Two types of feedback: explosion (with animation & sound effect) or explanation popup containing step-by-step number line visualization
     - Two hint options: step-by-step hints with number line visualization or correct answer highlight
   - **UI Rendering:**
     - Progress bar, score display, lives counter
     - Question text display
     - In-game timer display (optional)
     - Responsive layout with game area clipping
   - **Event Logging:**
     - Integrates with `GameLogger` to track all game events
     - Updates game state continuously
     - Logs user interactions, answers, hints, etc.
   - **Game Over Conditions:**
     - Time limit reached
     - Lives depleted
     - Transitions to `GameOver` scene

3. **`GameOver.tsx`** - End screen
   - Displays "Game Over" message
   - Provides "Try Again" button
   - Can restart `GameScene` for another round

**Supporting Modules:**

- **`core/mathquestions.ts`** - `MathQuestionService` class
  - Generates math questions based on difficulty level
  - Creates answer options (correct + distractors)
  - Supports multiple difficulty levels (veryeasy to veryhard)

- **`core/types.ts`** - TypeScript type definitions
  - `GameConfig`: Trial configuration interface
  - `MathQuestion`: Question structure
  - `Response`: Answer result structure
  - `LogEvent`: Event logging structure
  - Enums for game modes, controls, hints, feedback

- **`core/uiUtils.ts`** - UI helper functions
  - `drawRoundedRect()`, `drawStar()` for custom graphics

### 4. Event Logging System

**`core/GameLogger.ts`** - Comprehensive event tracking
- **Singleton Pattern:** Single logger instance per game session
- **Game State Tracking:**
  - Current question details
  - Progress metrics (questions answered, correct/incorrect counts, streaks)
  - Status (lives, score, time remaining, game over state)
  - Hints usage tracking
  - Screen dimensions and game area
- **Event Logging:**
  - Logs all game events with timestamps and full game state snapshots
  - Event types: game_started, game_over, answer_submitted, life_lost, etc.
  - Buffered arrow key events to reduce frequency
  - Critical events flushed immediately
- **Storage Options:**
  - Local storage (browser localStorage)
  - Custom callback for real-time server transmission (emitData)
- **Performance:**
  - Buffer management (max 1000 events in memory)
  - Periodic state snapshots (configurable interval)
  - Cleanup on game end

#### emitData Callback Integration

**Three-Level Emission Strategy:**

1. **Per-Event Emission** - Real-time tracking
   - Every user interaction immediately triggers `emitDataCallback`
   - Includes: answer_submitted, hint_used, arrow_key_pressed, game_started, etc.
   - Data structure: `{ emissionType: 'per-event', roundId, event }`
   - Enables real-time monitoring and analytics

2. **Round-Level Batching** - Accumulated round data
   - Triggered at GameOver event
   - Emits all events from the current round as a batch
   - Data structure: `{ emissionType: 'round-batch', roundId, events[], summary }`
   - Reduces network overhead while maintaining granularity

3. **Trial-Level Batching** - Complete trial summary
   - Handled by jsPsych's `on_finish` mechanism
   - Sends accumulated data from all rounds in the trial
   - Data structure: `{ rt, response, events: [round1_data, round2_data, ...] }`
   - Provides complete trial overview for analysis

**MongoDB Socket.io Integration Pattern:**

```javascript
// In experiment code (e.g., examples/js/study_code.js)
function emitData(data) {
  // Wrap game data with experiment-wide identifiers
  json = _.extend({},
    { study_metadata: ss.study_metadata },
    { session_info: _.omit(ss.session_info, 'on_finish') },
    { prolific: ss.prolific_info },
    data);
  
  // Send to MongoDB via socket.io
  socket.emit('currentData', json,
    ss.study_metadata.project,      // database name
    ss.study_metadata.experiment,   // collection name
    ss.session_info.gameID);        // subject ID
}

// Pass to plugin
const math_trial = {
  type: MathGamesPlugin,
  emit_data_callback: emitData,
  // ... other parameters
};
```

**Configuration Flow:**
- jsPsych trial config → `MathGamesPlugin` → `GameConfig` → `GameScene` → `GameLogger`
- Callback passed through all layers via `emitDataCallback` parameter
- Optional: graceful degradation to localStorage if callback not provided

## Data Flow

```
User Interaction
    ↓
jsPsych Trial Start
    ↓
MathGamesPlugin.trial() creates DOM structure
    ↓
startMathGameTrial() mounts React app
    ↓
MathGamesApp renders and calls launchGame()
    ↓
Phaser.Game created with 3 scenes
    ↓
GameWelcome scene starts
    ↓
User clicks "Start" → GameScene begins
    ↓
GameScene gameplay loop:
  - Generate question via MathQuestionService
  - Spawn answer objects (asteroids/bubbles)
  - User input (arrow keys or clicks)
    → Per-event emission via emitDataCallback
  - Check answer → update score/lives
    → Per-event emission (answer_submitted)
  - Log events via GameLogger
  - Show feedback (optional)
  - Next question or game over
    ↓
Game Over → GameOver scene
    → Round-level batch emission via emitDataCallback
    ↓
User clicks "Try Again" → restart GameScene
    OR
    User clicks jsPsych "Done Playing" button
    ↓
onGameEnd() callback → accumulate round data
    ↓
MathGamesPlugin.end_trial() → jsPsych.finishTrial()
    → Trial-level batch emission via jsPsych on_finish
    ↓
Trial data returned to jsPsych:
  - rt: reaction time
  - response: how trial ended ("button" or null)
  - events: array of all logged game events (all rounds)
    ↓
jsPsych on_finish callback wraps data with metadata
    → Final emission to MongoDB via socket.emit
```

## Configuration Flow

Trial parameters from jsPsych experiment → `MathGamesPlugin` → `GameConfig` object → passed through:
1. `startMathGameTrial()` wrapper
2. `MathGamesApp` component  
3. `launchGame()` function
4. Phaser scene initialization (`GameWelcome.init()`, `GameScene.init()`)

## Event Logging Architecture

**GameLogger** maintains a complete audit trail:
- Each event includes: `eventType`, `timestamp`, `roundId`, `gameState`, `eventData`
- Game state snapshot captures: current question, progress stats, lives/score, hints usage, screen dimensions
- Events are batched and flushed to storage (localStorage or server)
- Singleton pattern ensures consistent logging across scene transitions

## Key Design Patterns

1. **Separation of Concerns:** jsPsych (trial management) → React (mounting) → Phaser (game logic)
2. **Scene-based Architecture:** Phaser scenes for welcome, gameplay, and game over
3. **Event-driven Communication:** GameLogger tracks events; minimal direct coupling between layers
4. **Configuration Injection:** GameConfig passed down through all layers
5. **Singleton Logger:** Centralized event tracking across entire game session
