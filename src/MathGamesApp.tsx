// React component that wraps the math games.
// 1. Manage React-level state (like score and gameState).
// 2. Render the UI around the game (like the score display or a "Game Over" message).
// 3. Render a <div> that Phaser will use as its container.
// 4. Use a useEffect hook to initialize and launch the Phaser game once.
// 5. Listen for events from the Phaser game to update its own state.

import React, { useEffect, useState, useRef } from 'react';
import { Response, GameState, GameConfig } from './core/types';
import { launchGame } from './core/game';
import Phaser from 'phaser';

const PHASER_CONTAINER_ID = 'phaser-game-container';
const CONFIG_FILE_PATH = '/config/game1.json'; // read in from jspsych

interface MathGamesAppProps {
  gameConfig: GameConfig;
  onFinish: (data: { events: any[] }) => void;
}

export const MathGamesApp: React.FC<MathGamesAppProps> = ({ gameConfig, onFinish }) => {
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState(GameState.MainMenu);
    
    // A ref to hold the Phaser game instance
    const gameRef = useRef<Phaser.Game | null>(null);
    // This effect runs once on component mount to launch the game
    useEffect(() => {
        // Only launch if the game isn't already running
        if (gameRef.current) {
            return () => {}; // Return empty cleanup function
        }
        
        // The 'launchGame' function will create the Phaser game
        // and attach it to the div with ID PHASER_CONTAINER_ID
        gameRef.current = launchGame(PHASER_CONTAINER_ID, gameConfig[0]);
        
        // --- This is the bridge from Phaser to React ---
        // Listen for custom events from the Phaser game
        const gameEvents = gameRef.current.events;
        
        gameEvents.on('MathResponse', (result: Response) => {
            console.log('React received answer result:', result);
            // TODO: Update React's state based on the game event
        });
        
        gameEvents.on('gameOver', () => {
            setGameState(GameState.GameOver);
        });
        // --- End of bridge ---
        
        return () => {
            // On component unmount, destroy the game
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
    }, []); // Empty dependency array ensures this runs only once
    
    return (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            // backgroundImage: `url(${bgImage})`,
            backgroundSize:   "cover",
            backgroundPosition: "center",
            backgroundRepeat:  "no-repeat",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        }}>
        <div 
        className="app-wrapper"
        style={{
            maxWidth: "40%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
        }}>
        <div 
        className="game-container"
        style={{
            display: "inline-block",
            textAlign: "center",
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(10px)",
            padding: "2rem",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
                >
                    <h1
            className="ws-header"
            style={{
              display: 'inline-block',
              marginBottom: '1.2rem',
              maxWidth: '90%',
              fontSize: 20,
              wordBreak: 'break-word',
            }}
                    >
            Shoot the correct asteroids to collect stars~
          </h1>
        <h2>Score: {score}</h2>
        
        {/* This is the div Phaser will attach to */}
        <div id={PHASER_CONTAINER_ID} />
        </div>
        
        {gameState === GameState.GameOver && (
            <div className="game-over-screen">
            <h2>Game Over!</h2>
            <p>Your final score is: {score}</p>
            <button onClick={() => {
                // Tell Phaser to restart
                gameRef.current?.events.emit('restartGame');
                setScore(0);
                setGameState(GameState.Playing);
            }}>
            Play Again
            </button>
            </div>
        )}
        </div>
        </div>);
};

export default MathGamesApp;