import { GameTheme } from '../types';
import { MoonMissionTheme } from './MoonMissionTheme';
import { HomeworkHelperTheme } from './HomeworkHelperTheme';
import { UnderwaterDiverTheme } from './UnderwaterDiverTheme';

/**
 * Central registry of available game themes.
 *
 * Adding a new theme requires only:
 *  1. A new file in this directory (e.g. UnderwaterTheme.ts)
 *  2. One new entry in this record
 *  3. Asset files placed in /assets/
 */
export const GAME_THEMES: Record<string, GameTheme> = {
    MoonMissionGame: MoonMissionTheme,
    HomeworkHelperGame: HomeworkHelperTheme,
    UnderwaterDiverGame: UnderwaterDiverTheme,
};

export function resolveTheme(id: string): GameTheme {
    const theme = GAME_THEMES[id];
    if (!theme) {
        console.warn(`Unknown game theme "${id}". Falling back to MoonMissionGame.`);
        return GAME_THEMES['MoonMissionGame'];
    }
    return theme;
}
