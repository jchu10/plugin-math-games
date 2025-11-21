// import "./index.css"
import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

import { version } from "../package.json";
import { startMathGameTrial, StartMathGameTrialParams } from "./MathGamesPluginWrapper";

const info = <const>{
  name: "plugin-math-games",
  version: version,
  parameters: {
    preamble: {
      type: ParameterType.HTML_STRING,
      default: "<p>Welcome to the Math Games!</p><p>In this game, you will answer as many math questions as you can within the time limit. Try to get as many correct as possible!</p>",
    },
    /** Cover story of the game */
    cover_story: {
      type: ParameterType.SELECT,
      options: ["MoonMissionGame", "HomeworkHelperGame"],
      default: "MoonMissionGame"
    },
    /** Control scheme for the game */
    controls: {
      type: ParameterType.SELECT,
      options: ["arrowKeys", "tapToSelect"],
      default: "arrowKeys"
    },
    /** Hint type provided to the user during the game */
    hint_type: {
      type: ParameterType.SELECT,
      options: ["multipleChoice", "stepByStep", "none"],
      default: "none"
    },
    /** Feedback type after answering a question */
    feedback_type: {
      type: ParameterType.SELECT,
      options: ["none", "explosion", "correctHighlight"],
      default: "none"
    },
    /** Logic of how next question difficulty is selected. Staircase has 50% chance of increasing difficulty (after correct response) and 50% chance of decreasing difficulty (after incorrect response). */
    question_sequence_logic: {
      type: ParameterType.SELECT,
      options: ["staircase", "random"],
      default: "staircase"
    },
    /** Total duration of the game in seconds */
    time_limit: {
      type: ParameterType.INT,
      default: 120,
    },
    /** Difficulty category of first question in the game */
    difficulty: {
      type: ParameterType.SELECT,
      options: ["easy", "medium", "hard", "veryeasy", "veryhard"],
      default: "medium",
    },
  },
  data: {
    /**
     * The full action log (questions, responses, hints, feedback, end, start) with timestamps and descriptions.
     */
    events: {
      type: ParameterType.COMPLEX,
    },
  },
  // When you run build on your plugin, citations will be generated here based on the information in the CITATION.cff file.
  citations: '__CITATIONS__',
};

type Info = typeof info;

/**
 * **plugin-math-games**
 *
 * A jsPsych wrapper around Math Games react app.
 *
 * @author Junyi Chu
 * @see {@link /plugin-math-games/README.md}}
 */
class MathGamesPlugin implements JsPsychPlugin<Info> {
  static info = info;

  constructor(private jsPsych: JsPsych) { }

  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    const params: StartMathGameTrialParams = {
      gameConfig: {
        cover_story: trial.cover_story,
        controls: trial.controls,
        hint_type: trial.hint_type,
        feedback_type: trial.feedback_type,
        question_sequence_logic: trial.question_sequence_logic,
        time_limit: trial.time_limit,
        difficulty: trial.difficulty
      }
    };
    // show image
    display_element.innerHTML = `<h1>${trial.preamble}</h1>`;
    // create a div for the react app to render into
    const reactContainer = document.createElement("div");
    reactContainer.id = "math-games-react-container";
    display_element.appendChild(reactContainer);
    startMathGameTrial(reactContainer, params, this.jsPsych);
  }
}

export default MathGamesPlugin;

// declare global {
//   interface Window {
//     jsPsych?: {
//       plugins: Record<string, any>;
//     };
//   }
// }

// if (typeof window !== "undefined") {
//   // Attach the plugin to the global jsPsych object if it exists
//   if (window.jsPsych) {
//     window.jsPsych.plugins["MathGamesPlugin"] = MathGamesPlugin;
//   }
// }