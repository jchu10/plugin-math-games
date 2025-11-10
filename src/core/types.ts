/// Types used in the Math Games plugin.
/// No logic and no imports. Defines the shape of data structures.

export type ActionType = "answer" | "hint" | "start" | "end" | "feedback" | "timeout";
/**
 * A single user action: either select answer or get hint,
 * with question, accuracy, and a timestamp.
*/
export interface HistoryEvent {
  type: ActionType;
  question: MathQuestion;
  response: Response;
  timestamp: number;
  description: string;
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
};

// A simple structure to hold the result of an answer
export interface Response {
  question: MathQuestion;
  selectedAnswer: number;
  isCorrect: boolean;
}

// For the React app to know what's happening
export enum GameState {
  MainMenu,
  Playing,
  GameOver,
}

export type gameVersion = "MoonMissionGame" | "HomeworkHelperGame";
export type gameControls = "arrowKeys" | "tapToSelect";
export type hintType = "none" | "multipleChoice" | "stepByStep";
export type feedbackType = "none" | "explosion" | "correctHighlight";
export type questionSequence = "staircase" | "random";

export interface GameConfig {
  /** ID of the game configuration */
  id: number;
  game_version: gameVersion;
  controls: gameControls;
  hint_type: hintType;
  feedback_type: feedbackType;
  time_limit: number; // time limit in seconds
  difficulty: QuestionDifficulty; // initial math difficulty
  nextDifficulty: questionSequence; // how to adjust difficulty

}

/**
 * Full trial configuration.
 * - `difficulty`: initial difficulty level for this trial
 */
export interface TrialConfig {
  /** Initial array of game configurations for this trial */
  game_setting: GameConfig[];
}