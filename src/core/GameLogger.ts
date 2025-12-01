// src/game/utils/GameLogger.ts
import { MathQuestion, Response, GameConfig, LogEvent, QuestionDifficulty } from './types';

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
    timeRemaining: number;
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
  sessionId: string;
  gameId: string;
  gameState: GameState;
  eventData: Record<string, any>;
}

class GameLogger {
  private sessionId: string;
  private gameId: string;
  private events: GameEvent[] = [];
  private currentGameState: GameState | null = null;
  private periodicUpdateInterval: number | null = null;
  private isEnabled: boolean = true;
  private readonly MAX_EVENTS_IN_MEMORY = 1000;
  private arrowKeyEventBuffer: any[] = [];
  private arrowKeyBufferTimeout: number | null = null;

  constructor(gameId: string) {
    this.gameId = gameId;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `session_${timestamp}_${random}`;
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
  logEvent(eventType: string, eventData: Record<string, any>): void {
    if (!this.isEnabled || !this.currentGameState) {
      return;
    }

    try {
      const event: GameEvent = {
        eventType,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        gameId: this.gameId,
        gameState: { ...this.currentGameState },
        eventData: { ...eventData }
      };

      this.events.push(event);

      // Flush if buffer gets too large
      if (this.events.length > this.MAX_EVENTS_IN_MEMORY) {
        this.flushEvents();
        this.events = [];
      }

      // Optionally flush to storage immediately for critical events
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
   * Log arrow key event with buffering to reduce frequency
   */
  logArrowKey(key: string, position: any, velocity: any): void {
    this.arrowKeyEventBuffer.push({ key, position, velocity });

    if (this.arrowKeyBufferTimeout) {
      clearTimeout(this.arrowKeyBufferTimeout);
    }

    // Only log every 100ms for arrow keys
    this.arrowKeyBufferTimeout = window.setTimeout(() => {
      if (this.arrowKeyEventBuffer.length > 0) {
        const lastEvent = this.arrowKeyEventBuffer[this.arrowKeyEventBuffer.length - 1];
        this.logEvent('arrow_key_pressed', lastEvent);
        this.arrowKeyEventBuffer = [];
      }
    }, 100);
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
    if (this.arrowKeyBufferTimeout) {
      clearTimeout(this.arrowKeyBufferTimeout);
      this.arrowKeyBufferTimeout = null;
    }
  }

  /**
   * Get all logged events
   */
  getEvents(): GameEvent[] {
    return [...this.events];
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Flush events to storage
   */
  flushEvents(): void {
    if (this.events.length === 0) return;

    // Store in localStorage (or send to server)
    const storageKey = `game_log_${this.sessionId}`;
    try {
      const existingData = localStorage.getItem(storageKey);
      const existingEvents = existingData ? JSON.parse(existingData) : [];
      const allEvents = [...existingEvents, ...this.events];
      localStorage.setItem(storageKey, JSON.stringify(allEvents));
    } catch (e) {
      console.error('Failed to store events:', e);
    }

    // Optionally send to server
    // this.sendToServer(this.events);
  }

  /**
   * Send events to server (implement based on your backend)
   */
  private async sendToServer(events: GameEvent[]): Promise<void> {
    try {
      await fetch('/api/game-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          gameId: this.gameId,
          events: events
        })
      });
    } catch (error) {
      console.error('Failed to send events to server:', error);
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
    this.flushEvents();
  }
}

// Singleton instance (or create per game instance)
let loggerInstance: GameLogger | null = null;

export function getLogger(gameId: string): GameLogger {
  if (!loggerInstance) {
    loggerInstance = new GameLogger(gameId);
  }
  return loggerInstance;
}

export function resetLogger(): void {
  if (loggerInstance) {
    loggerInstance.cleanup();
  }
  loggerInstance = null;
}

