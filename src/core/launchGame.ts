// A small launcher file that wires up a Phaser config and export a launchGame function that MathGamesApp.tsx can call to start the game.

import * as Phaser from 'phaser';
import { GameConfig } from './types';
import { GameWelcome } from './GameWelcome';
import { GameScene } from './GameScene';
import { GameOver } from './GameOver';

// This is the function React will call
export const launchGame = (containerId: string, config: GameConfig): Phaser.Game => {
    const phaserConfig: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerId, // The ID of the div React renders
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
                debug: false
            }
        },
        scene: [GameWelcome, GameScene, GameOver], // Tell Phaser which scenes to use
    };

    const game = new Phaser.Game(phaserConfig);

    // **Manually start the scene and pass in your config data**
    game.scene.start('GameWelcome', config);

    return game;
};