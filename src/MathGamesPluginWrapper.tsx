import React from 'react'; // explicit import for JSX
import { createRoot } from "react-dom/client";
import type { JsPsych } from "jspsych";
import type { GameConfig } from "./core/types";
import MathGamesApp from "./MathGamesApp";

export interface StartMathGameTrialParams {
  /** Initial array of game configurations for this trial */
  gameConfig: GameConfig;
}

/**
 * Mounts the MathGamesApp into the given display element,
 * and hooks its onFinish callback to jsPsych.finishTrial.
 */
export function startMathGameTrial(
  display_element: HTMLElement,
  params: StartMathGameTrialParams,
  jsPsych: JsPsych
) {
  const { gameConfig } = params;

  /**
   * Called when the React app signals completion.
   * Finishes the jsPsych trial, returning the action log.
   */
  const onFinish = (data: { events: any[] }) => {
    console.log("Math game finished with data:", data); // debug log
    // TODO: should not end trial as one trial may consist of many rounds. Instead, send data to jsPsych response object.
    // jsPsych.finishTrial(data);
  };

  const root = createRoot(display_element);
  root.render(
    <MathGamesApp
      gameConfig={gameConfig}
      onFinish={(data) => {
        root.unmount();
        onFinish(data);
      }}
    />
  );
}