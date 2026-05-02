import { initJsPsych } from 'jspsych';
import MathGamesPlugin from '../../src/index';

const jsPsych = initJsPsych({
    display_element: 'jspsych-target',
    on_finish: () => jsPsych.data.displayData(),
});

function emitData(data: unknown) {
    console.log('Game event:', data);
}

const GAME_SIZE: [number, number] = [600, 1000];

const trial1 = {
    type: MathGamesPlugin,
    cover_story: 'MoonMissionGame',
    controls: 'arrowKeys',
    hint_type: 'none',
    feedback_type: 'explosion',
    game_size: GAME_SIZE,
    prompt: '<h3>Math Game Trial 1 — Moon Mission (arrow keys)</h3>',
    game_duration_limit: 60,
    emit_data_callback: emitData,
};

const trial2 = {
    type: MathGamesPlugin,
    cover_story: 'HomeworkHelperGame',
    controls: 'tapToSelect',
    hint_type: 'powerup',
    feedback_type: 'explanation',
    game_size: GAME_SIZE,
    prompt: '<h3>Math Game Trial 2 — Homework Helper (tap to select)</h3>',
    game_duration_limit: 60,
    emit_data_callback: emitData,
};

jsPsych.run([trial1, trial2]);
