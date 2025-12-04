import "./index.css"
import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import { startMathGameTrial, StartMathGameTrialParams } from "./MathGamesPluginWrapper";
declare const __PACKAGE_VERSION__: string;

const info = <const>{
  name: "plugin-math-games",
  version: __PACKAGE_VERSION__, // placeholder to be replaced during build
  parameters: {
    preamble: {
      type: ParameterType.HTML_STRING,
      default: "Answer as many questions as you can within the time limit. Try to get as many correct as possible!",
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
    /** Array that defines the size of the canvas element in pixels. First value is height, second value is width. */
    game_size: {
      type: ParameterType.INT,
      array: true,
      default: [600, 800],
    },
    /** Duration of the trial in milliseconds. If null, the game continues until time_limit is reached in the game itself. */
    trial_duration: {
      type: ParameterType.INT,
      default: null,
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
    // NOTE: use async trial if we need to await something
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

    // Create a stimulus div
    const stimulusDiv = document.createElement("div");
    stimulusDiv.id = "jspsych-math-games-stimulus";
    display_element.appendChild(stimulusDiv);

    // add preamble if exists
    if (trial.preamble !== null) {
      const preambleDiv = document.createElement("div");
      preambleDiv.id = "math-games-preamble";
      preambleDiv.innerHTML = trial.preamble;
      stimulusDiv.appendChild(preambleDiv);
    }

    // create a div for the react app to render into
    const reactContainer = document.createElement("div");
    reactContainer.id = "math-games-react-container";
    reactContainer.style.height = trial.game_size[0] + "px";
    reactContainer.style.width = trial.game_size[1] + "px";
    stimulusDiv.appendChild(reactContainer);

    // Start the math game react app
    startMathGameTrial(reactContainer, params, this.jsPsych);

    // function to end trial when it is time
    const end_trial = () => {
      // gather the data to store for the trial
      var trial_data = {
        rt: 100,// TODO: trial length.
        response: "abc"//response.key,
      };

      console.log("Ending math games trial, data:", trial_data);

      // move on to the next trial
      this.jsPsych.finishTrial(trial_data);
    };

    // end trial if trial_duration is set
    if (trial.trial_duration !== null) {
      this.jsPsych.pluginAPI.setTimeout(() => {
        end_trial();
      }, trial.trial_duration);
    }
  }

}

export default MathGamesPlugin;