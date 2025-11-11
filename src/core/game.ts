// A small launcher file that wires up a Phaser config and export a launchGame function that MathGamesApp.tsx can call to start the game.

import * as Phaser from 'phaser';
import { GameScene } from './GameScene';
import { GameConfig } from '../core/types';

// This is the function React will call
export const launchGame = (containerId: string, config: GameConfig): Phaser.Game => {
    const phaserConfig: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 800,
        parent: containerId, // The ID of the div React renders
        backgroundColor: '#333333',
        scene: [GameScene], // Tell Phaser to use our scene
    };

    const game = new Phaser.Game(phaserConfig);

    // **Manually start the scene and pass in your config data**
    game.scene.start('GameScene', config);

    return game;
};