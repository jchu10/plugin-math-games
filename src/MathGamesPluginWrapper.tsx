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
    jsPsych.finishTrial(data);
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