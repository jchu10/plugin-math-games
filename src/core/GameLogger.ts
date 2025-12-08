import { GameConfig } from './types';

// Type definition for the emitData callback function
export type EmitDataCallback = (data: any) => void;

export interface GameState {
  gameConfig: GameConfig;
  currentQuestion: {
    questionId: string;
    questionNumber: number;
    questionText: string;
    correctAnswer: number;
    allAnswers: number[];
  };
  progress: {
    questionsShown: number;
    questionsAnswered: number;
    correctCount: number;
    incorrectCount: number;
    currentStreak: number;
    longestStreak: number;
  };
  status: {
    lives: number;
    score: number;
    timeElapsed: number;
    gameOver: boolean;
    paused: boolean;
  };
  hints: {
    totalHintsUsed: number;
    maxHints: number;
    hintsUsedThisQuestion: boolean;
    hintActive: boolean;
    questionsWithHints: string[];
  };
  powerTool?: {
    totalUses: number;
    maxUses: number;
    usedThisQuestion: boolean;
    active: boolean;
  };
  screen: {
    width: number;
    height: number;
    scaleFactor: number;
    gameAreaX: number;
    gameAreaY: number;
    gameAreaWidth: number;
    gameAreaHeight: number;
  };
}

export interface GameEvent {
  eventType: string;
  timestamp: string;
  roundId: string;
  gameState: GameState;
  eventData: Record<string, any>;
}

class GameLogger {
  private roundId: string;
  private events: GameEvent[] = [];
  private currentGameState: GameState | null = null;
  private periodicUpdateInterval: number | null = null;
  private isEnabled: boolean = true;
  private readonly MAX_EVENTS_IN_MEMORY = 1000;
  private emitDataCallback?: EmitDataCallback;

  constructor(emitDataCallback?: EmitDataCallback) {
    this.emitDataCallback = emitDataCallback;
    this.roundId = this.generateroundId();
  }

  private generateroundId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `round_${timestamp}_${random}`;
  }

  /**
   * Update the current game state snapshot
   */
  updateGameState(state: GameState): void {
    this.currentGameState = { ...state };
  }

  /**
   * Log an event with the current game state
   */
  logEvent(eventType: string,
    eventData: Record<string, any>): void {
    if (!this.isEnabled || !this.currentGameState) {
      return;
    }

    try {
      const event: GameEvent = {
        eventType,
        timestamp: new Date().toISOString(),
        roundId: this.roundId,
        gameState: { ...this.currentGameState },
        eventData: { ...eventData }
      };

      this.events.push(event);

      // Per-event emission: immediately emit this event if callback is provided
      if (this.emitDataCallback) {
        try {
          // Flatten structure: promote eventType and timestamp to top-level, remove roundId duplication
          this.emitDataCallback({
            emissionType: 'per-event',
            roundId: this.roundId,
            eventType: event.eventType,
            timestamp: event.timestamp,
            gameState: event.gameState,
            eventData: event.eventData
          });
        } catch (error) {
          console.error('Error in emitDataCallback (per-event):', error);
        }
      }

      // Flush to localStorage if buffer gets too large
      if (this.events.length > this.MAX_EVENTS_IN_MEMORY) {
        this.flushEvents();
        this.events = [];
      }

      // Optionally flush to localStorage immediately for critical events
      if (this.isCriticalEvent(eventType)) {
        this.flushEvents();
      }
    } catch (error) {
      console.error('Logging error (non-critical):', error);
    }
  }

  /**
   * Check if event should be flushed immediately
   */
  private isCriticalEvent(eventType: string): boolean {
    const criticalEvents = [
      'game_started',
      'game_over',
      'answer_submitted',
      'life_lost'
    ];
    return criticalEvents.includes(eventType);
  }

  /**
   * Log key down event
   */
  logKeyDown(key: string, position: any, velocity: any): void {
    if (!this.isEnabled || !this.currentGameState) {
      return;
    }

    this.logEvent('key_down', {
      key,
      position,
      velocity
    });
  }

  /**
   * Log key up event with duration
   */
  logKeyUp(key: string, duration: number, position: any, velocity: any): void {
    if (!this.isEnabled || !this.currentGameState) {
      return;
    }

    this.logEvent('key_up', {
      key,
      duration,
      position,
      velocity
    });
  }

  /**
   * Start periodic state updates (for capturing continuous state)
   */
  startPeriodicUpdates(intervalMs: number = 500): void {
    if (this.periodicUpdateInterval) {
      this.stopPeriodicUpdates();
    }

    this.periodicUpdateInterval = window.setInterval(() => {
      if (this.currentGameState) {
        this.logEvent('state_snapshot', {
          reason: 'periodic_update'
        });
      }
    }, intervalMs);
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates(): void {
    if (this.periodicUpdateInterval) {
      clearInterval(this.periodicUpdateInterval);
      this.periodicUpdateInterval = null;
    }
  }

  /**
   * Get all logged events
   */
  getEvents(): GameEvent[] {
    return [...this.events];
  }

  /**
   * Get ID for current game round (multiple r)
s per trial   */
  getroundId(): string {
    return this.roundId;
  }

  /**
   * Emit round-level batch of events via callback
   */
  emitRoundBatch(): void {
    if (this.emitDataCallback && this.events.length > 0) {
      try {
        // Remove roundId from individual events to avoid duplication
        const eventsWithoutRoundId = this.events.map(event => ({
          eventType: event.eventType,
          timestamp: event.timestamp,
          gameState: event.gameState,
          eventData: event.eventData
        }));

        this.emitDataCallback({
          emissionType: 'round-batch',
          roundId: this.roundId,
          timestamp: new Date().toISOString(),
          events: eventsWithoutRoundId,
          summary: {
            totalEvents: this.events.length,
            totalQuestionsShown: this.events.filter(event => event.eventType === 'question_shown').length,
            totalAnswersSubmitted: this.events.filter(event => event.eventType === 'answerObject_tapped' || event.eventType === 'laser_hit').length,
          }
        });
      } catch (error) {
        console.error('Error in emitDataCallback (round-batch):', error);
      }
    }
  }

  /**
   * Flush events to localStorage
   */
  flushEvents(): void {
    if (this.events.length === 0) return;
    const storageKey = `game_log_${this.roundId}`;

    // Store in localStorage for backup/debugging
    try {
      const existingData = localStorage.getItem(storageKey);
      const existingEvents = existingData ? JSON.parse(existingData) : [];
      const allEvents = [...existingEvents, ...this.events];
      localStorage.setItem(storageKey, JSON.stringify(allEvents));
    } catch (e) {
      console.error('Failed to store to localStorage:', e);
    }
  }

  /**
   * Clear all events (useful for testing)
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Export events as JSON
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Cleanup on game end
   */
  cleanup(): void {
    this.stopPeriodicUpdates();
    this.emitRoundBatch(); // Emit final batch before cleanup
    this.flushEvents(); // Save to localStorage for backup
    // Disable the logger to prevent further logging
    this.isEnabled = false;
    this.emitDataCallback = undefined;
    // localStorage.removeItem(`game_log_${this.roundId}`);
  }
}

// Singleton instance (or create per game instance)
let loggerInstance: GameLogger | null = null;

export function getLogger(emitDataCallback?: EmitDataCallback): GameLogger {
  if (!loggerInstance) {
    loggerInstance = new GameLogger(emitDataCallback);
  }
  return loggerInstance;
}

export function resetLogger(): void {
  if (loggerInstance) {
    loggerInstance.cleanup();
  }
  loggerInstance = null;
}

