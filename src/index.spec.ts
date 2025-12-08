import { startTimeline } from "@jspsych/test-utils";
import jsPsychPluginMathGames from ".";

// Mock the React components
jest.mock("./MathGamesPluginWrapper", () => ({
  startMathGameTrial: jest.fn((display_element, params, jsPsych) => {
    // Simulate game completion after a short delay
    setTimeout(() => {
      jsPsych.finishTrial({ events: [] });
    }, 100);
  }),
}));

jest.useFakeTimers();

describe("my plugin", () => {
  it("should load", async () => {
    const { expectFinished, getHTML, getData, displayElement, jsPsych } = await startTimeline([
      {
        type: jsPsychPluginMathGames,
        // Fix: use valid parameter names from your plugin
        cover_story: "MoonMissionGame",
        controls: "arrowKeys",
        hint_type: "none",
        feedback_type: "none",
        emit_data_callback: () => { },
      },
    ]);

    jest.advanceTimersByTime(200);
    await expectFinished();
  });
});