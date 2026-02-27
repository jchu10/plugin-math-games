# Math games jsPsych plugin development guide for AI agents

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. We value code that explains itself through clear class, method, and variable names. Comments may be used when necessary to explain some tricky logic, but should otherwise be avoided.

This project is Javascript package for a jsPsych plugin that embeds Phaser-based math games into psychological experiments. Players answer math questions in themed game environments with a range of configurable options. The plugin is implemented in TypeScript and React, with Phaser handling the game logic and rendering. The plugin is designed to be flexible and extensible, allowing researchers to customize the game experience while collecting rich behavioral data.

## Commands useful in development

```bash
npm run dev          # Start Vite dev server for local preview
npm run build        # Production build via Rollup (outputs to dist/)
npm run test         # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run type-check   # TypeScript type checking without emit
```

## Plugin Architecture

The plugin uses a four-layer architecture:

```
jsPsych Plugin (src/index.ts)
    ↓
React Wrapper (MathGamesPluginWrapper.tsx → MathGamesApp.tsx)
    ↓
Phaser Game Engine (core/launchGame.ts → 3 scenes)
    ↓
Event Logging (core/GameLogger.ts)
```

### Layer Details

1. **jsPsych Plugin** (`src/index.ts`): Entry point implementing `JsPsychPlugin<Info>`. Manages trial lifecycle, DOM structure, timing (min/max duration), and returns trial data to jsPsych.

2. **React Wrapper**: `MathGamesPluginWrapper.tsx` bridges jsPsych and React, mounting/unmounting the app. `MathGamesApp.tsx` creates the Phaser container and calls `launchGame()`.

3. **Phaser Scenes** (in `src/core/`):
   - `GameWelcome.ts` - Instructions and start button; extends `BaseGameScene`
   - `GameScene.ts` - Flying-objects mechanic (the current default play scene); extends `BasePlayScene`
   - `GameOver.tsx` - End screen with retry option; extends `BaseGameScene`
   - `BaseGameScene.ts` - Abstract base for all scenes: `calculateGameArea()`, `drawGameAreaBorder()`, `registerResizeHandler()`
   - `BasePlayScene.ts` - Abstract base for all *play* scenes (the middle scene in the Welcome → Play → GameOver lifecycle). Owns HUD, timer, lives, question sequencing, logging, and scene transitions. Subclasses implement four hooks to add a new mechanic without duplicating session infrastructure.

4. **Supporting Services**:
   - `MathQuestionService` (`mathquestions.ts`) - Manages question selection. Accepts an optional custom `QuestionBank` (array of `MathQuestion`). Supports staircase (adaptive difficulty) and random selection modes. Tracks used questions per difficulty to avoid repetition.
   - `GameLogger.ts` - Singleton event tracker with three emission levels (per-event, round-batch, trial-batch)
   - `types.ts` - TypeScript interfaces (`GameConfig`, `GameTheme`, `MathQuestion`, `QuestionBank`, `LogEvent`, etc.)

### Data Flow

Configuration flows down: jsPsych trial params → `GameConfig` → React wrapper → Phaser scenes

Event data flows up: Phaser events → `GameLogger` → `emitDataCallback` (real-time) or jsPsych `on_finish` (batched via `rounds_played`)

### Game Themes

Themes are defined as `GameTheme` objects in `src/core/themes/` and registered in `src/core/themes/index.ts`. Each theme encapsulates all skin-specific knowledge: asset filenames, sounds, spawn parameters, answer-label styling, and welcome text.

**Adding a new theme requires only:**
1. Create `src/core/themes/MyTheme.ts` exporting a `GameTheme` object
2. Add one entry to `GAME_THEMES` in `src/core/themes/index.ts`
3. Place asset files in `/assets/`

No changes to `GameScene`, `GameWelcome`, or `GameOver` are needed.

Built-in themes:
- **MoonMissionGame**: Starry background, spaceship avatar, falling asteroids, explosion sounds
- **HomeworkHelperGame**: Classroom background, pencil avatar, rising thought bubbles, bubble-pop sounds

### Game Mechanics

Game mechanics (play styles) are registered in `MECHANIC_SCENES` in `src/core/launchGame.ts`. `launchGame()` selects the correct play-scene class at runtime based on `config.game_mechanic`.

**Adding a new mechanic requires only:**
1. Create `src/core/mechanics/MyScene.ts` that extends `BasePlayScene` and implements four hooks:
   - `setupMechanic()` — build mechanic-specific game objects in `create()`
   - `onQuestionReady(question)` — present a new question to the player
   - `onResize()` — reposition mechanic objects (call `super.onResize()` first)
   - `getEndGamePayload()` — return extra fields for the `game_over` log event (optional)
2. Add one entry to `MECHANIC_SCENES` in `src/core/launchGame.ts`
3. Place asset files in `/assets/`

No changes to `GameWelcome`, `GameOver`, `BaseGameScene`, `GameLogger`, `themes/`, or `mathquestions.ts` are needed.

**Prioritized mechanics to implement next (by research value ÷ effort):**
1. **Tile grid / button picker** — ~150–200 LOC; removes motion confound; clean control condition
2. **Flash cards / timed reveal** — ~100–150 LOC; useful baseline for spaced-repetition designs
3. **Number line placement** — ~350–450 LOC; gold-standard measure of magnitude understanding
4. **Drag & drop matching** — ~400–500 LOC; enables ordering and equivalence tasks

Currently registered mechanics:
- **flyingObjects** (default): answer objects move across the screen; player shoots or taps

### Key Configuration Options

- `cover_story`: Game theme (`MoonMissionGame` | `HomeworkHelperGame`)
- `game_mechanic`: Play style (`flyingObjects` | `dragAndDrop` | `numberLine` | `tilePicker`); defaults to `flyingObjects`
- `controls`: `arrowKeys` | `tapToSelect`
- `hint_type`: `none` | `powerup` | `stepByStep`
- `feedback_type`: `none` | `explosion` | `explanation`
- `question_sequence_logic`: `staircase` (adaptive) | `random`
- `question_bank`: Optional `MathQuestion[]` — when provided, replaces the built-in 30-question bank. Each question needs `question`, `correctAnswer`, `options`, and `difficulty`. Optional `topic` and `source` fields are logged for analysis.
- `emit_data_callback`: Function for real-time event streaming
- `min_trial_duration` / `max_trial_duration`: Control trial timing in ms

### Question Bank Format

```ts
const myQuestions: MathQuestion[] = [
  {
    question: "12 × 3 = ?",
    correctAnswer: 36,
    options: [33, 36, 39, 42],
    difficulty: QuestionDifficulty.medium,
    topic: "multiplication",
    source: "mathgames.com"
  },
  // ...
];
```

Pass via jsPsych: `{ type: MathGamesPlugin, cover_story: 'MoonMissionGame', question_bank: myQuestions, ... }`

## Testing

Tests use Jest with `@jspsych/test-utils`. The test file mocks the React wrapper to simulate game completion:

```bash
npm run test                           # Run all tests
npm run test -- --testPathPattern=index  # Run specific test file
```

## Build Outputs

Rollup generates multiple formats in `dist/`:

- ESM: `index.js`
- CommonJS: `index.cjs`
- Browser: `index.browser.js` and `index.browser.min.js`
- Types: `index.d.ts`
