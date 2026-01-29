import "./index.css"
import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import { startMathGameTrial, StartMathGameTrialParams } from "./MathGamesPluginWrapper";
declare const __PACKAGE_VERSION__: string;

const info = <const>{
  name: "plugin-math-games",
  version: __PACKAGE_VERSION__, // placeholder to be replaced during build
  parameters: {
    /**
         * HTML content to render above or below the canvas (use `prompt_location` parameter to change location).
         */
    prompt: {
      type: ParameterType.HTML_STRING,
      default: null,
    },
    /**
     * Location of the `prompt` content. Can be 'abovecanvas' or 'belowcanvas' or 'belowbutton'.
     */
    prompt_location: {
      type: ParameterType.STRING,
      default: "abovecanvas",
    },
    /**
     * Whether to show the button that ends the trial.
     */
    show_finished_button: {
      type: ParameterType.BOOL,
      default: true,
    },
    /**
     * The label for the button that ends the trial.
     */
    finished_button_label: {
      type: ParameterType.STRING,
      default: "Done Playing",
    },
    // GAME CONFIG PARAMETERS
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
    game_duration_limit: {
      type: ParameterType.INT,
      default: 120,
    },
    /** Whether to show timer text within the game */
    display_in_game_timer: {
      type: ParameterType.BOOL,
      default: false,
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
    /** Optional callback function for real-time data emission to server (e.g., MongoDB via socket.io) */
    emit_data_callback: {
      type: ParameterType.FUNCTION,
      default: undefined,
    },
    /** If true, then the trial will end whenever the participant makes a response (assuming they make their response
 * before the cutoff specified by the `trial_duration` parameter). If false, then the trial will continue until
 * the value for `trial_duration` is reached. You can use this parameter to force the participant to view a
 * stimulus for a fixed amount of time, even if they respond before the time is complete.
 */
    response_ends_trial: {
      type: ParameterType.BOOL,
      default: true,
    },
    /**
     * Minimum time (ms) the trial must run before the participant can advance.
     * If set, the "Done Playing" button will be disabled until this time has passed.
     */
    min_trial_duration: {
      type: ParameterType.INT,
      default: null,
    },
    /**
     * Maximum time (ms) the trial can run before automatically ending.
     * If set, the trial will end automatically when this time is reached.
     */
    max_trial_duration: {
      type: ParameterType.INT,
      default: null,
    },
    /**
     * Whether to show a timer that counts down until the end of the trial when `trial_duration` is not `null`.
     */
    show_countdown_trial_duration: {
      type: ParameterType.BOOL,
      default: true,
    },
    /**
     * The HTML to use for rendering the countdown timer. The element with `id="trial-timer"`
     * will have its content replaced by a countdown timer in the format `MM:SS`.
     */
    countdown_timer_html: {
      type: ParameterType.HTML_STRING,
      default: `<span id="trial-timer"></span> remaining`,
    }
  },
  data: {
    /** The length of time from the start of the trial to the end of the trial. */
    rt: {
      type: ParameterType.INT,
    },
    /** If the trial was ended by clicking the finished button, then `"button"`. If the trial was ended by pressing a key, then the key that was pressed. If the trial timed out, then `null`. */
    response: {
      type: ParameterType.STRING,
    },
    /**
     * List of Round IDs played.
     */
    rounds_played: {
      type: ParameterType.COMPLEX,
      default: [],
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
  private display: HTMLElement;
  private params: TrialType<Info>;
  private app_data = [];
  private start_time;
  private timer_interval;
  private trial_finished_handler;
  private cleanup_app: (() => void) | undefined;

  constructor(private jsPsych: JsPsych) { }

  trial(display_element: HTMLElement, trial: TrialType<Info>, on_load: () => void) {
    this.display = display_element;
    this.params = trial;

    // NOTE: use async trial if we need to await something
    const appParams: StartMathGameTrialParams = {
      gameConfig: {
        cover_story: this.params.cover_story,
        controls: this.params.controls,
        hint_type: this.params.hint_type,
        feedback_type: this.params.feedback_type,
        question_sequence_logic: this.params.question_sequence_logic,
        time_limit: this.params.game_duration_limit,
        difficulty: this.params.difficulty,
        show_timer: this.params.display_in_game_timer,
        emitDataCallback: this.params.emit_data_callback,
      }
    };

    // #region Set up display ------

    // create a div for the react app to render into
    const reactContainer = document.createElement("div");
    reactContainer.id = "math-games-react-container";
    reactContainer.style.height = trial.game_size[0] + "px";
    reactContainer.style.width = trial.game_size[1] + "px";

    // Trial timer
    const timerContainer = document.createElement("div");
    timerContainer.id = "timerDiv";

    let timer_html = "";
    if (this.params.show_countdown_trial_duration && (this.params.max_trial_duration || this.params.min_trial_duration)) {
      timer_html = `<p id="countdown-timer">${this.params.countdown_timer_html}</p>`;
    }
    timerContainer.innerHTML = timer_html;

    // Trial finish button
    const finishButton = document.createElement("button");
    finishButton.classList.add("jspsych-btn");
    finishButton.id = "trial-end";
    finishButton.innerHTML = this.params.finished_button_label;

    // Display Ordering
    const promptDiv = document.createElement("div");
    if (this.params.prompt !== null) {
      promptDiv.id = "math-games-prompt";
      promptDiv.innerHTML = this.params.prompt;

      if (this.params.prompt_location == "abovecanvas") {
        this.display.appendChild(promptDiv);
        this.display.appendChild(timerContainer);
        this.display.appendChild(reactContainer);
        if (this.params.show_finished_button) {
          this.display.appendChild(finishButton);
          this.display.querySelector("#trial-end").addEventListener("click", () => {
            this.end_trial("button");
          });

          if (this.params.min_trial_duration !== null) {
            // Disable finish button initially if there is a minimum trial duration
            finishButton.setAttribute("disabled", "true");
          }
        }

      }
      if (this.params.prompt_location == "belowcanvas") {
        this.display.appendChild(reactContainer);
        this.display.appendChild(promptDiv);
        this.display.appendChild(timerContainer);
        if (this.params.show_finished_button) {
          this.display.appendChild(finishButton);
          this.display.querySelector("#trial-end").addEventListener("click", () => {
            this.end_trial("button");
          });

          if (this.params.min_trial_duration !== null) {
            // Disable finish button initially if there is a minimum trial duration
            finishButton.setAttribute("disabled", "true");
          }
        }

      }
      if (this.params.prompt_location == "belowbutton") {
        this.display.appendChild(reactContainer);
        if (this.params.show_finished_button) {
          this.display.appendChild(finishButton);
          this.display.querySelector("#trial-end").addEventListener("click", () => {
            this.end_trial("button");
          });

          if (this.params.min_trial_duration !== null) {
            // Disable finish button initially if there is a minimum trial duration
            finishButton.setAttribute("disabled", "true");
          }
        }
        this.display.appendChild(timerContainer);
        this.display.appendChild(promptDiv);
      }
    } else {
      this.display.appendChild(reactContainer);
      this.display.appendChild(timerContainer);
      if (this.params.show_finished_button) {
        this.display.appendChild(finishButton);
        this.display.querySelector("#trial-end").addEventListener("click", () => {
          this.end_trial("button");
        });

        if (this.params.min_trial_duration !== null) {
          // Disable finish button initially if there is a minimum trial duration
          finishButton.setAttribute("disabled", "true");
        }
      }

    }

    // #endregion

    // #region Control flow ------
    // Launch the math game react app
    // Store cleanup function
    this.cleanup_app = startMathGameTrial(reactContainer, appParams, this.jsPsych, this.app_data);

    // start time
    this.start_time = performance.now();
    this.set_trial_duration_timer();
    // #endregion

    return new Promise((resolve, reject) => {
      this.trial_finished_handler = resolve;
    });
  }

  private set_trial_duration_timer() {
    // Handle Minimum Duration
    if (this.params.min_trial_duration !== null) {
      this.jsPsych.pluginAPI.setTimeout(() => {
        const finishButton = this.display.querySelector("#trial-end") as HTMLButtonElement;
        if (finishButton !== null) {
          finishButton.disabled = false;
        }
      }, this.params.min_trial_duration);
    }

    // Handle Maximum Duration
    if (this.params.max_trial_duration !== null) {
      this.jsPsych.pluginAPI.setTimeout(() => {
        this.end_trial();
      }, this.params.max_trial_duration);
    }

    // Set up countdown timer display
    if (this.params.show_countdown_trial_duration) {
      const durationForTimer = this.params.max_trial_duration || this.params.min_trial_duration;
      if (durationForTimer !== null) {
        this.timer_interval = setInterval(() => {
          const remaining = durationForTimer - (performance.now() - this.start_time);

          // Clear if time is up
          if (remaining <= 0) {
            const timer_span = this.display.querySelector("#trial-timer");
            if (timer_span) {
              timer_span.innerHTML = `0:00`;
            }
            clearInterval(this.timer_interval);

            // Enable finish button if it was disabled
            const finishButton = this.display.querySelector("#trial-end") as HTMLButtonElement;
            if (finishButton !== null) {
              finishButton.disabled = false;
            }
            return;
          }

          let minutes = Math.floor(remaining / 1000 / 60);
          let seconds = Math.ceil((remaining - minutes * 1000 * 60) / 1000);
          if (seconds == 60) {
            seconds = 0;
            minutes++;
          }
          const minutes_str = minutes.toString();
          const seconds_str = seconds.toString().padStart(2, "0");
          const timer_span = this.display.querySelector("#trial-timer");
          if (timer_span) {
            timer_span.innerHTML = `${minutes_str}:${seconds_str}`;
          }
        }, 250);
      }
    }
  }

  private end_trial(response = null) {
    // this.jsPsych.pluginAPI.cancelAllKeyboardResponses();
    if (this.cleanup_app) {
      this.cleanup_app();
      this.cleanup_app = undefined;
    }
    clearInterval(this.timer_interval);

    const trial_data = <any>{};

    trial_data.rt = Math.round(performance.now() - this.start_time);
    trial_data.response = response;
    trial_data.rounds_played = this.app_data;

    this.jsPsych.finishTrial(trial_data);

    this.trial_finished_handler();
  }


}

export default MathGamesPlugin;