// React component that wraps the Phaser game.
// 1. Manage React-level state (like score and gameState).
// 2. <optional> Render the UI around the game (like the score display or a "Game Over" message).
// 3. Render a <div> that Phaser will use as its container.
// 4. Use a useEffect hook to initialize and launch the Phaser game once.
// 5. Listen for events from the Phaser game to update its own state.

import React, { useEffect, useState, useRef } from 'react';
import { Response, GameConfig, LogEvent } from './core/types';
import { launchGame } from './core/launchGame';
import * as Phaser from 'phaser';

const PHASER_CONTAINER_ID = 'phaser-game-container';

interface MathGamesAppProps {
    gameConfig: GameConfig;
    onGameEnd: (data: { events: any[]; summary?: any }) => void;
}

export const MathGamesApp: React.FC<MathGamesAppProps> = ({ gameConfig, onGameEnd }) => {
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'welcome' | 'playing' | 'gameover'>('welcome');
    const gameRef = useRef<Phaser.Game | null>(null);
    const eventsRef = useRef<LogEvent[]>([]);
    const [phaserReady, setPhaserReady] = useState(false);

    useEffect(() => {
        // Only launch if the game isn't already running
        if (gameRef.current) {
            return () => { }; // Return empty cleanup function
        }
        // if (gameRef.current) {
        //     return () => {
        //         if (gameRef.current) {
        //             gameRef.current.destroy(true);
        //             gameRef.current = null;
        //         }
        //     };
        // }
        // Launch Phaser game with Welcome scene first
        gameRef.current = launchGame(PHASER_CONTAINER_ID, gameConfig); // Only pass 2 args
        setPhaserReady(true);

        // Listen for custom events from Phaser
        const gameEvents = gameRef.current.events;

        // // Welcome scene triggers game start
        // const onStartGame = (payload: any) => {
        //     setGameState('playing');
        //     if (gameRef.current) {
        //         // from Welcome to GameScene

        //     }
        // };

        // // GameScene triggers game over
        // const onGameOver = (payload: any) => {
        //     setGameState('gameover');
        //     if (gameRef.current) {
        //         // from GameScene to GameOver
        //     }
        // };

        // // GameOver scene triggers retry
        // const onTryAgain = (payload: any) => {
        //     setGameState('playing');
        //     if (gameRef.current) {
        //         // from GameOver to GameScene
        //         // gameRef.current.scene.stop('GameOver');
        //         // gameRef.current.scene.start('GameScene', gameConfig );
        //     }
        // };

        // // Register listeners for scene transitions
        // gameEvents.on('StartGame', onStartGame);
        // gameEvents.on('GameOver', onGameOver);
        // gameEvents.on('TryAgain', onTryAgain);

        // Cleanup
        return () => {
            try {
                // gameEvents.off('StartGame', onStartGame);
                // gameEvents.off('GameOver', onGameOver);
                // gameEvents.off('TryAgain', onTryAgain);
            } catch (e) { }
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, [gameConfig]);

    return (
        <div id="phaser-wrapper" style={{
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
        }}>
            <div id={PHASER_CONTAINER_ID} />
        </div>
    );
};

export default MathGamesApp;