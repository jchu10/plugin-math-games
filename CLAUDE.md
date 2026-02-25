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
   - `GameWelcome.ts` - Instructions and start button
   - `GameScene.ts` - Main gameplay: question generation, physics, collision detection, scoring, lives, feedback
   - `GameOver.tsx` - End screen with retry option

4. **Supporting Services**:
   - `MathQuestionService` (`mathquestions.ts`) - Question pool with 5 difficulty levels (`veryeasy` through `veryhard`), staircase algorithm
   - `GameLogger.ts` - Singleton event tracker with three emission levels (per-event, round-batch, trial-batch)
   - `types.ts` - TypeScript interfaces (`GameConfig`, `MathQuestion`, `LogEvent`, etc.)

### Data Flow

Configuration flows down: jsPsych trial params → `GameConfig` → React wrapper → Phaser scenes

Event data flows up: Phaser events → `GameLogger` → `emitDataCallback` (real-time) or jsPsych `on_finish` (batched via `rounds_played`)

### Game Themes

- **MoonMissionGame**: Arrow key controls, spaceship, asteroids as answer objects
- **HomeworkHelperGame**: Tap-to-select controls, classroom background, thought bubbles

### Key Configuration Options

- `cover_story`: Game theme (`MoonMissionGame` | `HomeworkHelperGame`)
- `controls`: `arrowKeys` | `tapToSelect`
- `hint_type`: `none` | `stepByStep` | `powerup`
- `feedback_type`: `none` | `explosion` | `explanation`
- `question_sequence_logic`: `staircase` (adaptive) | `random`
- `emit_data_callback`: Function for real-time event streaming
- `min_trial_duration` / `max_trial_duration`: Control trial timing in ms

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
