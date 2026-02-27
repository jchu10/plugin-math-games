// A small launcher file that wires up a Phaser config and exports a launchGame function
// that MathGamesApp.tsx calls to start the game.

import * as Phaser from 'phaser';
import { GameConfig } from './types';
import { GameWelcome } from './GameWelcome';
import { GameScene } from './GameScene';
import { GameOver } from './GameOver';
import { BasePlayScene } from './BasePlayScene';

/**
 * Registry of play-scene classes, keyed by the `game_mechanic` config value.
 *
 * To add a new mechanic:
 *   1. Import the new scene class.
 *   2. Add a key → class entry here.
 * No other files need to change.
 */
const MECHANIC_SCENES: Record<string, new () => BasePlayScene> = {
    flyingObjects: GameScene,
    // dragAndDrop: DragDropScene,   // uncomment when implemented
    // numberLine: NumberLineScene,  // uncomment when implemented
    // tilePicker: TilePickerScene,  // uncomment when implemented
};

export const launchGame = (containerId: string, config: GameConfig): Phaser.Game => {
    const PlayScene = MECHANIC_SCENES[config.game_mechanic ?? 'flyingObjects'] ?? GameScene;

    const phaserConfig: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerId,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            resizeInterval: 0,
        },
        backgroundColor: '#333333',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { x: 0, y: 0 },
                debug: false,
            },
        },
        input: {
            keyboard: true,
            mouse: true,
            touch: false,
            gamepad: false,
        },
        loader: {
            baseURL: '/assets/',
        },
        scene: [GameWelcome, PlayScene, GameOver],
    };

    const game = new Phaser.Game(phaserConfig);
    game.scene.start('GameWelcome', config);
    return game;
};
