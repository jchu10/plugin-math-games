import { useState, useCallback } from "react";
import { GameScene } from "../core/GameScene";
import type { GameConfig, TrialConfig, HistoryEvent } from "../core/types";

export function useMathGames(
    gameConfig: GameConfig[]
) {
    const [game, setGame] = useState(() => {
        // Initialize your game logic here using gameConfig
        GameScene.fromConfig({ game_setting: gameConfig } as TrialConfig)
    });

    const update = (fn: (gs: GameScene) => void) => {
        const next = game.clone(); // TODO
        fn(next);
        setGame(next);
    };

    const startGame = useCallback(() => {
        game.scene.start();
        setGame({ ...game });
    }, [game]);

    const endGame = useCallback(() => {
        game.scene.stop();
        setGame({ ...game });
    }, [game]);

    return {
        events: game.events as HistoryEvent[],
        startGame,
        endGame,
    };
}