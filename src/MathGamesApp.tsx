// React component that wraps the math games.
// 1. Manage React-level state (like score and gameState).
// 2. <optional> Render the UI around the game (like the score display or a "Game Over" message).
// 3. Render a <div> that Phaser will use as its container.
// 4. Use a useEffect hook to initialize and launch the Phaser game once.
// 5. Listen for events from the Phaser game to update its own state.

import React, { useEffect, useState, useRef } from 'react';
import { Response, ReactGameState, GameConfig, LogEvent } from './core/types';
import { launchGame } from './core/game';
import * as Phaser from 'phaser';

const PHASER_CONTAINER_ID = 'phaser-game-container';

interface MathGamesAppProps {
  gameConfig: GameConfig;
  onFinish: (data: { events: any[]; summary?: any }) => void;
}

export const MathGamesApp: React.FC<MathGamesAppProps> = ({ gameConfig, onFinish }) => {
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState(ReactGameState.MainMenu);
    
    // A ref to hold the Phaser game instance
    const gameRef = useRef<Phaser.Game | null>(null);
    // Ref to collect history events emitted from Phaser
    const eventsRef = useRef<LogEvent[]>([]);

    // This effect runs once on component mount to launch the game    
    useEffect(() => {
        // Only launch if the game isn't already running
        if (gameRef.current) {
            return () => {}; // Return empty cleanup function
        }

        // The 'launchGame' function will create the Phaser game
        // and attach it to the div with ID PHASER_CONTAINER_ID
        gameRef.current = launchGame(PHASER_CONTAINER_ID, gameConfig);

        // --- This is the bridge from Phaser to React ---
        // Listen for custom events from the Phaser game
        const gameEvents = gameRef.current.events;

        const onMathResponse = (result: Response & { timestamp?: number; elapsed?: number }) => {
            console.log('React received answer result:', result);
            // Update React state and record event
            const ev: LogEvent = {
                timestamp: result.timestamp ?? Date.now(),
                eventType: 'make_response',
                payload: result,
            };
            eventsRef.current.push(ev);
            setScore(prev => {
                // If isCorrect, increase; otherwise leave as-is (or adjust as desired)
                return result.isCorrect ? prev + 10 : prev;
            });
        };

        const onQuestionShown = (payload: any) => {
            const ev: LogEvent = {
                timestamp: Date.now(),
                eventType: 'question_shown',
                payload,
            };
            eventsRef.current.push(ev);
        };

        const onHintUsed = (payload: any) => {
            const ev: LogEvent = {
                timestamp: Date.now(),
                eventType: 'request_hint',
                payload,
            };
            eventsRef.current.push(ev);
        };

        const onGameOver = (payload: any) => {
            // Add a final synthetic event if needed
            const finalEv: LogEvent = {
                timestamp: Date.now(),
                eventType: 'game_over',
                payload,
            };
            eventsRef.current.push(finalEv);

            setGameState(ReactGameState.GameOver);

            // Prepare enriched payload for jsPsych
            const finishPayload = {
                events: eventsRef.current,
                summary: {
                    score: payload.score,
                    correctCount: payload.correctCount,
                    lives: payload.lives,
                    duration: payload.duration,
                    config: gameConfig,
                },
            };

            onFinish(finishPayload);
        };

        // Register listeners
        gameEvents.on('QuestionShown', onQuestionShown);
        gameEvents.on('MathResponse', onMathResponse);
        gameEvents.on('HintUsed', onHintUsed);
        gameEvents.on('ShowFeedback', onHintUsed);
        gameEvents.on('GameOver', onGameOver);
        gameEvents.on('EndGame', onGameOver);

        // cleanup on unmount
        return () => {
            try {
                gameEvents.off('QuestionShown', onQuestionShown);
                gameEvents.off('MathResponse', onMathResponse);
                gameEvents.off('HintUsed', onHintUsed);
                gameEvents.off('ShowFeedback', onHintUsed);
                gameEvents.off('GameOver', onGameOver);
                gameEvents.off('EndGame', onGameOver);
            } catch (e) {
                // ignore if already destroyed
            }
            if (gameRef.current) {
                // destroy Phaser instance to free resources
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, [gameConfig, onFinish]);

    return (
        <div id="phaser-wrapper" style={{
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
        }}>
            
            <div id={PHASER_CONTAINER_ID} />
            
            {gameState === ReactGameState.GameOver && (
                <div className="game-over-screen">
                    <h2>Game Over!</h2>
                    <p>Your final score is: {score}</p>
                    
                    <button onClick={() => {
                        // TODO: Where is this button? Currently Game Over displays, but when clicked, website refreshes.
                        // Tell Phaser to restart
                        gameRef.current?.events.emit('restartGame');
                        eventsRef.current = []; // clear collected events for fresh run
                        setScore(0);
                        setGameState(ReactGameState.Playing);
                    }}>
                        Play Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default MathGamesApp;