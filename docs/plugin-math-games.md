# plugin-math-games

This plugin displays math games. The games can be displayed until a button response is given, or for a fixed length of time.

## Parameters

In addition to the [parameters available in all plugins](https://www.jspsych.org/latest/overview/plugins#parameters-available-in-all-plugins), this plugin accepts the following parameters. Parameters with a default value of undefined must be specified. Other parameters can be left unspecified if the default value is acceptable.

| Parameter           | Type             | Default Value      | Description                              |
| ------------------- | ---------------- | ------------------ | ---------------------------------------- |
| prompt | HTML_STRING | `null` | HTML content to render above or below the canvas (use `prompt_location` parameter to change location). |
| prompt_location | STRING | `"abovecanvas"` | Location of the `prompt` content. Can be `"abovecanvas"`, `"belowcanvas"`, or `"belowbutton"`. |
| show_finished_button | BOOL | `true` | Whether to show the button that ends the trial. |
| finished_button_label | STRING | `"Done Playing"` | The label for the button that ends the trial. |
| cover_story | SELECT | `"MoonMissionGame"` | Cover story of the game. Options: `"MoonMissionGame"`, `"HomeworkHelperGame"`. |
| controls | SELECT | `"arrowKeys"` | Control scheme for the game. Options: `"arrowKeys"`, `"tapToSelect"`. |
| hint_type | SELECT | `"none"` | Hint type provided to the user during the game. Options: `"multipleChoice"`, `"stepByStep"`, `"none"`. |
| feedback_type | SELECT | `"none"` | Feedback type after answering a question. Options: `"none"`, `"explosion"`, `"correctHighlight"`. |
| question_sequence_logic | SELECT | `"staircase"` | Logic of how next question difficulty is selected. `"staircase"` has 50% chance of increasing difficulty (after correct response) and 50% chance of decreasing difficulty (after incorrect response). Options: `"staircase"`, `"random"`. |
| game_duration_limit | INT | `120` | Total duration of the game in seconds. |
| display_in_game_timer | BOOL | `false` | Whether to show timer text within the game. |
| difficulty | SELECT | `"medium"` | Difficulty category of first question in the game. Options: `"veryeasy"`, `"easy"`, `"medium"`, `"hard"`, `"veryhard"`. |
| game_size | INT (array) | `[600, 800]` | Array that defines the size of the canvas element in pixels. First value is height, second value is width. |
| emit_data_callback | FUNCTION | `undefined` | Optional callback function for real-time data emission to server (e.g., MongoDB via socket.io). Receives event data with `emissionType`, `roundId`, `eventType`, `timestamp`, `gameState`, and `eventData`. |
| response_ends_trial | BOOL | `true` | If true, then the trial will end whenever the participant makes a response (assuming they make their response before the cutoff specified by the `trial_duration` parameter). If false, then the trial will continue until the value for `trial_duration` is reached. |
| min_trial_duration | INT | `null` | Minimum time the trial must run before the participant can advance. If set, the "Done Playing" button will be disabled until this time has passed. |
| max_trial_duration | INT | `null` | Maximum time the trial can run before automatically ending. If set, the trial will end automatically when this time is reached. |
| show_countdown_trial_duration | BOOL | `true` | Whether to show a timer that counts down until the end of the trial when `trial_duration` is not `null`. |
| countdown_timer_html | HTML_STRING | `<span id="trial-timer"></span> remaining` | The HTML to use for rendering the countdown timer. The element with `id="trial-timer"` will have its content replaced by a countdown timer in the format `MM:SS`. |

## Data Generated

In addition to the [default data collected by all plugins](https://www.jspsych.org/latest/overview/plugins#data-collected-by-all-plugins), this plugin collects the following data for each trial.

### Trial-Level Data

| Name      | Type    | Value                                    |
| --------- | ------- | ---------------------------------------- |
| rt | INT | The length of time from the start of the trial to the end of the trial in milliseconds. |
| response | STRING | If the trial was ended by clicking the finished button, then `"button"`. If the trial was ended by pressing a key, then the key that was pressed. If the trial timed out, then `null`. |
| events | COMPLEX | Array of all game events logged during the trial. Each event contains detailed information about user interactions and game state. See Event Structure below. |

### Event Structure

Each event in the `events` array contains the following fields:

| Field | Type | Description |
| ----- | ---- | ----------- |
| eventType | STRING | Type of event (see Event Types below) |
| timestamp | STRING | ISO 8601 timestamp of when the event occurred |
| roundId | STRING | Unique identifier for the game round |
| gameState | OBJECT | Complete snapshot of game state at the time of the event |
| eventData | OBJECT | Event-specific data (varies by event type) |

### Game State Object

The `gameState` object contains:

| Field | Type | Description |
| ----- | ---- | ----------- |
| gameConfig | OBJECT | Configuration settings for the game |
| currentQuestion | OBJECT | Current question details (questionId, questionNumber, questionText, correctAnswer, allAnswers) |
| progress | OBJECT | Progress metrics (questionsShown, questionsAnswered, correctCount, incorrectCount, currentStreak, longestStreak) |
| status | OBJECT | Game status (lives, score, timeRemaining, gameOver, paused) |
| hints | OBJECT | Hint usage data (totalHintsUsed, maxHints, hintsUsedThisQuestion, hintActive, questionsWithHints) |
| powerTool | OBJECT | Power tool usage data (totalUses, maxUses, usedThisQuestion, active) - only present if hint_type is "stepByStep" |
| screen | OBJECT | Screen dimensions and game area coordinates |

### Event Types

The following event types are logged during gameplay:

| Event Type | Description | Event Data Fields |
| ---------- | ----------- | ----------------- |
| `game_started` | Game has started | (no additional data) |
| `question_shown` | A new question is displayed | `questionId`, `questionNumber`, `questionText`, `correctAnswer`, `responseOptions`, `asteroidSpawns` (array with answer, position, size, speed, asteroidType, spawnIndex) |
| `key_down` | Arrow key or space key pressed down | `key`, `position` (x, y), `velocity` (x, y) |
| `key_up` | Arrow key or space key released | `key`, `duration` (ms), `position` (x, y), `velocity` (x, y) |
| `space_pressed` | Space bar pressed to fire laser | `spaceshipPosition` (x, y), `laserPosition` (x, y), `targetAnswer` |
| `laser_hit` | Laser hits an answer object | `laserPosition` (x, y), `targetAnswer`, `targetPosition` (x, y), `isCorrect` |
| `answerObject_tapped` | Answer object tapped (tap-to-select mode) | `response`, `position` (x, y), `answerObjectIndex`, `answerObjectSize`, `isCorrect` |
| `hint_pressed` | Hint button activated | `hintType`, `questionId`, `questionNumber`, `hintNumber`, `timeSinceQuestionStart` (ms), `hintContent` |
| `end_question` | Question round ended | `selectedAnswer`, `correctAnswer`, `isCorrect`, `timeTaken` (ms), `hintUsed`, `lives`, `score` |
| `life_lost` | Player lost a life | `livesRemaining`, `questionId`, `incorrectAnswer` |
| `end_game_pressed` | User clicked "End Game" button | `timeElapsed` (ms), `questionsAnswered`, `currentScore` |
| `game_over` | Game has ended | `reason` (lives_lost, user_quit, time_up), `finalScore`, `questionsShown`, `questionsAnswered`, `correctCount`, `incorrectCount`, `totalHintsUsed`, `totalTime` (ms), `averageTimePerQuestion` (ms) |
| `state_snapshot` | Periodic state update (if enabled) | `reason` ("periodic_update") |

### Data Emission

If an `emit_data_callback` function is provided, the plugin will emit data in real-time with the following structure:

**Per-Event Emission:**
```javascript
{
  emissionType: 'per-event',
  roundId: string,
  eventType: string,
  timestamp: string,
  gameState: GameState,
  eventData: object
}
```

**Round-Batch Emission** (at end of each round):
```javascript
{
  emissionType: 'round-batch',
  roundId: string,
  timestamp: string,
  events: Array<Event>,
  summary: {
    totalEvents: number
  }
}
```

## Install

You can install this plugin as a node package from the npm registry `% npm install plugin-math-games --save`

Or you can include the plugin in your HTML file `<script src="https://unpkg.com/plugin-math-games@VERSION"></script>` where version is 0.0.3 or later

Or copy and import the built js files from `dist/` folder after building for production. Do so by including the script tags in your HTML file:
`<script type="text/javascript" src="path/to/plugin-math-games/dist/index.browser.js"></script>`


## Examples

### Basic Example

```javascript
var trial = {
  type: jsPsychPluginMathGames,
  prompt: '<p>Play the math game!</p>',
  game_duration_limit: 120,
  difficulty: 'medium'
}
```

### Advanced Configuration

```javascript
var trial = {
  type: jsPsychPluginMathGames,
  prompt: '<p>Complete as many problems as you can!</p>',
  prompt_location: 'abovecanvas',
  show_finished_button: true,
  finished_button_label: 'I\'m Done',
  
  // Game configuration
  cover_story: 'MoonMissionGame',
  controls: 'arrowKeys',
  hint_type: 'multipleChoice',
  feedback_type: 'explosion',
  question_sequence_logic: 'staircase',
  game_duration_limit: 180,
  display_in_game_timer: true,
  difficulty: 'easy',
  game_size: [600, 800],
  
  // Trial timing
  min_trial_duration: 30000, // in milliseconds
  max_trial_duration: 60000,  // in milliseconds
  show_countdown_trial_duration: true,
  response_ends_trial: true
}
```

### With Data Emission Callback

```javascript
// Define a callback function to emit data to your server
function emitDataToServer(data) {
  // Example: send to MongoDB via socket.io
  socket.emit('gameData', data);
  
  // Or log to console for debugging
  console.log('Game event:', data.eventType, data);
}

var trial = {
  type: jsPsychPluginMathGames,
  cover_story: 'HomeworkHelperGame',
  controls: 'tapToSelect',
  hint_type: 'stepByStep',
  feedback_type: 'correctHighlight',
  game_duration_limit: 120,
  emit_data_callback: emitDataToServer
}
```

### Accessing Trial Data

```javascript
var timeline = [];

timeline.push({
  type: jsPsychPluginMathGames,
  game_duration_limit: 120,
  on_finish: function(data) {
    // Access trial-level data
    console.log('Trial RT:', data.rt);
    console.log('Response:', data.response);
    console.log('Total events:', data.events.length);
    
    // Access specific events
    var gameOverEvent = data.events.find(e => e.eventType === 'game_over');
    if (gameOverEvent) {
      console.log('Final score:', gameOverEvent.eventData.finalScore);
      console.log('Correct answers:', gameOverEvent.eventData.correctCount);
      console.log('Incorrect answers:', gameOverEvent.eventData.incorrectCount);
    }
    
    // Count specific event types
    var hintsUsed = data.events.filter(e => e.eventType === 'hint_pressed').length;
    console.log('Hints used:', hintsUsed);
  }
});

jsPsych.run(timeline);
```
