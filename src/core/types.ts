/// Types used in the Math Games plugin.
/// No logic and no imports. Defines the shape of data structures.

/**
 * A single user action: either select answer or get hint,
 * with question, accuracy, and a timestamp.
*/
export type EventType = "show_question" | "make_response" | "request_hint" | "start_game" | "end_game" | "show_feedback" | "navigate_feedback" | "close_feedback" | "game_over";
export interface LogEvent {
  timestamp: number;
  eventType: EventType;
  payload: any;
}

// The difficulty levels for questions
export enum QuestionDifficulty {
  veryeasy = 1,
  easy = 2,
  medium = 3,
  hard = 4,
  veryhard = 5
}

// The core structure for a single math question
export type MathQuestion = {
  question: string;// The question text, e.g., "5 + 3 = ?"
  correctAnswer: number; // The correct value from the options array
  options: number[]; // An array of possible answers, e.g., [7, 8, 9, 10]
  difficulty: QuestionDifficulty;
  topic?: string;  // e.g. "addition" | "subtraction" | "fractions" — for logging and filtering
  source?: string; // e.g. "mathgames.com" | "generated" — for provenance tracking
};

// A typed alias for a collection of questions passed to the plugin
export type QuestionBank = MathQuestion[];

// A simple structure to hold the result of an answer
export interface Response {
  question: MathQuestion;
  selectedAnswer: number;
  isCorrect: boolean;
}

export type gameVersion = "MoonMissionGame" | "HomeworkHelperGame" | "UnderwaterDiverGame";
export type gameMechanic = 'flyingObjects' | 'dragAndDrop' | 'numberLine' | 'tilePicker';
export type gameControls = "arrowKeys" | "tapToSelect";
export type hintType = "none" | "powerup" | "stepByStep";
export type feedbackType = "none" | "explosion" | "explanation";
export type questionSequence = "staircase" | "random";

/**
 * All theme-specific knowledge for one game skin.
 *
 * To add a new theme:
 *  1. Create src/core/themes/MyTheme.ts that exports a GameTheme object.
 *  2. Register it in src/core/themes/index.ts under a new key.
 *  3. Add the asset files to /assets/.
 *  No changes to GameScene, GameWelcome, or GameOver are needed.
 */
export interface GameTheme {
  id: string;
  backgroundImage: string;          // filename under /assets/, e.g. "starrynight.png"
  answerObjectImages: string[];     // 1–3 filenames cycled per answer object
  playerImage: string;              // movable avatar, e.g. "spaceship.png"
  correctSoundFile: string;         // audio filename for correct-answer/hit sound, e.g. "explosion.wav"
  shootSoundFile?: string;          // audio filename for shoot sound (arrowKeys only), e.g. "lasershot.wav"
  answerLabelColor: string;         // CSS colour for answer number labels
  answerLabelStroke: string;        // CSS colour for label stroke
  answerLabelFontSize: number;      // base font size for labels at 1080p
  answerLabelStrokeWidth: number;   // base stroke width for labels at 1080p
  answerLabelShadow: boolean;       // whether labels have a glow/shadow effect
  answerSpawnFromBottom: boolean;   // false = objects fall from top; true = rise from bottom
  playerPosition?: 'top' | 'bottom'; // where the avatar is anchored; defaults to 'bottom'
  answerScaleRange: [number, number]; // [min, max] object scale
  answerDepth: number;              // render depth for answer objects
  welcomeTextColor: string;         // CSS colour for instruction text on the welcome screen
  welcomeText: (controls: gameControls) => string;
}

export interface GameConfig {
  cover_story: gameVersion;
  controls: gameControls;
  hint_type: hintType;
  feedback_type: feedbackType;
  time_limit: number; // time limit in seconds
  difficulty: QuestionDifficulty; // initial math difficulty
  question_sequence_logic: questionSequence; // how to adjust difficulty
  show_timer?: boolean; // whether to display timer text
  game_mechanic?: gameMechanic;  // which play mechanic to use; defaults to 'flyingObjects' for backwards compatibility
  question_bank?: QuestionBank; // custom question set; falls back to built-in bank when absent
  emitDataCallback?: (data: any) => void; // optional callback for real-time data emission to server
}