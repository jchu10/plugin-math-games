/**
 * MathGamesPluginWrapper.tsx - React wrapper for math game trials.
 *
 * This component handles the React rendering logic for math game playing trials,
 * separating it from the pure jsPsych plugin class.
 */

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
 * and hooks its onGameEnd callback to jsPsych.finishTrial.
 */
export function startMathGameTrial(
  display_element: HTMLElement,
  params: StartMathGameTrialParams,
  jsPsych: JsPsych,
  app_data: any[]
) {
  const { gameConfig } = params;

  // Intercept the emitDataCallback to track round data in app_data
  const originalEmitDataCallback = gameConfig.emitDataCallback;
  gameConfig.emitDataCallback = (data: any) => {
    // Capture round-level batches to track roundIDs and round summary info
    if (data.emissionType === "round-batch") {
      app_data.push({ roundId: data.roundId, summary: data.summary });
    }
    // Forward to original callback if it exists (e.g. from jsPsych parameters)
    if (originalEmitDataCallback) {
      originalEmitDataCallback(data);
    }
  };

  /**
   * Called when the React app signals completion of the entire trial.
   */
  const onGameEnd = (data: { events: any[] }) => {
    console.log("Math game trial ended.");
    // If the last round hasn't been pushed via emitDataCallback, we could push it here
    // but usually cleanup() covers it.
  };

  const root = createRoot(display_element);
  root.render(
    <MathGamesApp
      gameConfig={gameConfig}
      onGameEnd={(data) => {
        root.unmount();
        onGameEnd(data);
      }}
    />
  );

  // Return a cleanup function that the plugin can call when the trial ends externally
  return () => {
    try {
      root.unmount();
    } catch (e) {
      // Ignore errors if already unmounted
      console.warn("React root already unmounted or failed to unmount", e);
    }
  };
}