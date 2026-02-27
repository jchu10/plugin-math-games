import * as Phaser from 'phaser';
import { MathQuestionService } from './mathquestions';
import { MathQuestion, GameConfig, GameTheme } from './types';
import { getLogger, resetLogger } from './GameLogger';
import { resolveTheme } from './themes/index';
import { BaseGameScene } from './BaseGameScene';

/**
 * Abstract base class for all play scenes (the middle scene in the
 * GameWelcome → PlayScene → GameOver lifecycle).
 *
 * Provides the shared session infrastructure that every game mechanic
 * needs: HUD (timer, hearts, question text, end-game button), question
 * sequencing, score/life tracking, logging, and scene transitions.
 *
 * Adding a new mechanic requires only:
 *   1. Create src/core/mechanics/MyScene.ts that extends BasePlayScene
 *      and implements the four abstract hooks below.
 *   2. Register it in MECHANIC_SCENES in launchGame.ts.
 *   3. Add any asset files to /assets/.
 */
export abstract class BasePlayScene extends BaseGameScene {

    // ---- Config & services ----
    protected gameConfig!: GameConfig;
    protected theme!: GameTheme;
    protected questionService!: MathQuestionService;
    protected currentQuestion!: MathQuestion;
    protected lastAnswerCorrect: boolean = false;
    protected logger!: ReturnType<typeof getLogger>;

    // ---- Session timing ----
    protected gameStartTime: number = 0;
    protected questionStartTime: number = 0;
    protected lastTimerUpdate?: number;

    // ---- Session stats ----
    protected questionsWithHints: string[] = [];
    protected currentStreak: number = 0;
    protected longestStreak: number = 0;
    protected questionsShown: number = 0;
    protected incorrectCount: number = 0;
    protected correctCount: number = 0;

    // ---- Session state ----
    protected gameOver: boolean = false;
    protected transitioning: boolean = false;
    protected lives: number = 3;
    protected timer: number = 120;

    // ---- HUD objects ----
    protected timerText!: Phaser.GameObjects.Text;
    protected questionText!: Phaser.GameObjects.Text;
    protected heartIcons: Phaser.GameObjects.Image[] = [];
    protected whiteBar!: Phaser.GameObjects.Graphics;
    protected bottomWhiteBar!: Phaser.GameObjects.Graphics;
    protected backgroundImage!: Phaser.GameObjects.Image;
    protected gameAreaBorder!: Phaser.GameObjects.Graphics;
    protected whiteBackground!: Phaser.GameObjects.Graphics;
    protected endBtn!: Phaser.GameObjects.Text;

    // ---- Layout constants (scaled) ----
    protected readonly baseFontSize: number = 32;
    protected readonly baseBarHeight: number = 110;
    protected readonly baseBottomBarHeight: number = 130;

    // ---- Computed layout values (updated in setupHUD and onResize) ----
    protected scaleFactor: number = 1;
    protected barHeight: number = 0;
    protected bottomBarHeight: number = 0;
    protected bottomBarY: number = 0;
    protected heartY: number = 0;
    protected heartSize: number = 0;

    constructor(key: string) {
        super(key);
    }

    public init(data: GameConfig) {
        this.gameConfig = data;
        this.theme = resolveTheme(data.cover_story);
        resetLogger();
        this.logger = getLogger(this.gameConfig?.emitDataCallback);
    }

    preload() {
        this.load.image('fullheart', 'fullheart.png');
        this.load.image('game_bg_img', this.theme.backgroundImage);

        // Loading progress bar
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);
        this.load.on('progress', (progress: number) => {
            bar.width = 4 + (460 * progress);
        });
    }

    create() {
        this.questionService = new MathQuestionService(this.gameConfig.question_bank);

        // Reset session state
        this.correctCount = 0;
        this.lives = 3;
        this.timer = this.gameConfig.time_limit || 120;
        this.gameOver = false;
        this.transitioning = false;
        this.lastTimerUpdate = 0;
        this.lastAnswerCorrect = false;
        this.questionsWithHints = [];
        this.currentStreak = 0;
        this.longestStreak = 0;
        this.questionsShown = 0;
        this.incorrectCount = 0;
        this.gameStartTime = Date.now();

        this.calculateGameArea();
        this.setupHUD();

        this.updateGameState();
        this.logger.logEvent('game_started', {});

        this.setupMechanic();

        this.scale.on('resize', () => {
            this.calculateGameArea();
            this.onResize();
        }, this);
        this.events.once('shutdown', this.shutdown, this);

        this.showNextQuestion();
    }

    private setupHUD() {
        this.scaleFactor = this.scale.height / 1080;
        this.barHeight = Math.floor(this.baseBarHeight * this.scaleFactor);
        this.bottomBarHeight = Math.floor(this.baseBottomBarHeight * this.scaleFactor);
        this.bottomBarY = this.gameAreaY + this.gameAreaHeight - this.bottomBarHeight;
        this.heartSize = Math.round(this.barHeight * 0.65 * 1.05);
        this.heartY = this.gameAreaY + this.barHeight + 24;

        // White full-screen background behind game area
        this.whiteBackground = this.add.graphics();
        this.whiteBackground.fillStyle(0xffffff, 1);
        this.whiteBackground.fillRect(0, 0, this.scale.width, this.scale.height);
        this.whiteBackground.setDepth(0);

        // Themed background image
        this.backgroundImage = this.add.image(
            this.gameAreaX + this.gameAreaSize / 2,
            this.gameAreaY + this.gameAreaHeight / 2,
            'game_bg_img'
        ).setOrigin(0.5, 0.5).setDisplaySize(this.gameAreaSize, this.gameAreaHeight).setDepth(1);

        // Black border around game area
        this.gameAreaBorder = this.add.graphics();
        this.gameAreaBorder.lineStyle(4, 0x000000, 1);
        this.gameAreaBorder.strokeRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, this.gameAreaHeight);
        this.gameAreaBorder.setDepth(100);

        // Top white HUD bar
        this.whiteBar = this.add.graphics();
        this.whiteBar.fillStyle(0xffffff, 1);
        this.whiteBar.fillRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, this.barHeight);
        this.whiteBar.setDepth(1000);

        // Bottom white HUD bar
        this.bottomWhiteBar = this.add.graphics();
        this.bottomWhiteBar.fillStyle(0xffffff, 1);
        this.bottomWhiteBar.fillRect(this.gameAreaX, this.bottomBarY, this.gameAreaSize, this.bottomBarHeight);
        this.bottomWhiteBar.setDepth(1000);

        // Heart icons (lives)
        this.heartIcons = [];
        const heartXStart = this.gameAreaX + 30;
        for (let i = 0; i < 3; i++) {
            const heart = this.add.image(
                heartXStart + i * (this.heartSize + 10),
                this.heartY,
                'fullheart'
            ).setOrigin(0, 0).setDisplaySize(this.heartSize, this.heartSize).setDepth(1001);
            this.heartIcons.push(heart);
        }

        // End Game button (top-left of HUD bar)
        this.endBtn = this.add.text(
            this.gameAreaX + 30,
            this.gameAreaY + this.barHeight / 2,
            'End Game',
            { font: '22px Arial', color: '#ffffff', backgroundColor: '#2d3a4a', padding: { left: 16, right: 16, top: 8, bottom: 8 } }
        ).setOrigin(0, 0.5).setDepth(1002).setInteractive();
        this.endBtn.on('pointerdown', () => this.onEndButtonPressed());

        // Timer (top-right of HUD bar)
        if (this.gameConfig.show_timer) {
            const timeLimit = this.gameConfig.time_limit || 120;
            const min = Math.floor(timeLimit / 60);
            const sec = (timeLimit % 60).toString().padStart(2, '0');
            this.timerText = this.add.text(
                this.gameAreaX + this.gameAreaSize - 30,
                this.gameAreaY + this.barHeight / 2,
                `${min}:${sec}`,
                { font: '28px monospace', color: '#000', fontStyle: 'bold' }
            ).setOrigin(1, 0.5).setDepth(1001);
        }

        // Question text (top-centre of HUD bar)
        this.questionText = this.add.text(
            this.gameAreaX + this.gameAreaSize / 2,
            this.gameAreaY + this.barHeight / 2,
            '',
            { font: '32px monospace', color: '#000', align: 'center' }
        ).setOrigin(0.5).setDepth(1003);
    }

    update(time: number, _delta: number) {
        if (!this.gameOver) {
            if (!this.lastTimerUpdate || time - this.lastTimerUpdate > 1000) {
                this.lastTimerUpdate = time;
                if (this.timer > 0) {
                    this.timer--;
                    const min = Math.floor(this.timer / 60);
                    const sec = (this.timer % 60).toString().padStart(2, '0');
                    if (this.gameConfig.show_timer && this.timerText) {
                        this.timerText.setText(`${min}:${sec}`);
                    }
                } else {
                    if (this.gameConfig.show_timer && this.timerText) {
                        this.timerText.setText('0:00');
                    }
                    this.showTimesUpMessage();
                    this.endGame('time_up');
                }
            }
        }
    }

    protected endGame(reason: 'time_up' | 'lives_lost' | 'user_quit') {
        this.gameOver = true;
        const totalTime = Date.now() - this.gameStartTime;
        const questionsAnswered = this.correctCount + this.incorrectCount;
        const avgTimePerQuestion = questionsAnswered > 0 ? totalTime / questionsAnswered : 0;

        this.updateGameState();
        this.logger.logEvent('game_over', {
            reason,
            questionsShown: this.questionsShown,
            questionsAnswered,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            ...this.getEndGamePayload(),
            totalTime,
            averageTimePerQuestion: avgTimePerQuestion,
        });
        this.logger.cleanup();

        if (reason === 'user_quit') {
            this.scene.start('GameOver', this.gameConfig);
        } else {
            this.triggerGameOverTransition();
        }
    }

    protected triggerGameOverTransition() {
        this.time.delayedCall(1000, () => {
            this.game.events.emit('GameOver');
            this.scene.start('GameOver', this.gameConfig);
        });
    }

    protected loseLife() {
        if (this.lives > 0) {
            this.lives -= 1;
            if (this.heartIcons[this.lives]) {
                this.heartIcons[this.lives].setVisible(false);
            }
        }
    }

    protected showNextQuestion() {
        this.questionStartTime = Date.now();
        this.questionsShown++;
        this.currentQuestion = this.gameConfig.question_sequence_logic === 'random'
            ? this.questionService.getRandomQuestion()
            : this.questionService.getNextQuestion(this.lastAnswerCorrect);
        this.questionText.setText(this.currentQuestion.question);
        this.gameOver = false;
        this.lastTimerUpdate = 0;
        this.onQuestionReady(this.currentQuestion);
    }

    protected onResize() {
        this.scaleFactor = this.scale.height / 1080;
        this.barHeight = Math.floor(this.baseBarHeight * this.scaleFactor);
        this.bottomBarHeight = Math.floor(this.baseBottomBarHeight * this.scaleFactor);
        this.bottomBarY = this.gameAreaY + this.gameAreaHeight - this.bottomBarHeight;
        this.heartSize = Math.round(this.barHeight * 0.65 * 1.05);
        this.heartY = this.gameAreaY + this.barHeight + Math.floor(24 * this.scaleFactor);

        if (this.whiteBackground) {
            this.whiteBackground.clear();
            this.whiteBackground.fillStyle(0xffffff, 1);
            this.whiteBackground.fillRect(0, 0, this.scale.width, this.scale.height);
        }
        if (this.backgroundImage) {
            this.backgroundImage.setPosition(
                this.gameAreaX + this.gameAreaSize / 2,
                this.gameAreaY + this.gameAreaHeight / 2
            );
            this.backgroundImage.setDisplaySize(this.gameAreaSize, this.gameAreaHeight);
        }
        if (this.gameAreaBorder) {
            this.gameAreaBorder.clear();
            this.gameAreaBorder.lineStyle(4, 0x000000, 1);
            this.gameAreaBorder.strokeRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, this.gameAreaHeight);
        }
        if (this.whiteBar) {
            this.whiteBar.clear();
            this.whiteBar.fillStyle(0xffffff, 1);
            this.whiteBar.fillRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, this.barHeight);
        }
        if (this.bottomWhiteBar) {
            this.bottomWhiteBar.clear();
            this.bottomWhiteBar.fillStyle(0xffffff, 1);
            this.bottomWhiteBar.fillRect(this.gameAreaX, this.bottomBarY, this.gameAreaSize, this.bottomBarHeight);
        }

        const heartXStart = this.gameAreaX + Math.floor(30 * this.scaleFactor);
        this.heartIcons.forEach((heart, i) => {
            heart.setPosition(heartXStart + i * (this.heartSize + Math.floor(10 * this.scaleFactor)), this.heartY);
            heart.setDisplaySize(this.heartSize, this.heartSize);
        });
        if (this.gameConfig.show_timer && this.timerText) {
            this.timerText.setPosition(
                this.gameAreaX + this.gameAreaSize - Math.floor(30 * this.scaleFactor),
                this.gameAreaY + this.barHeight / 2
            );
            this.timerText.setStyle({ fontSize: `${Math.floor(28 * this.scaleFactor)}px` });
        }
        if (this.questionText) {
            this.questionText.setPosition(
                this.gameAreaX + this.gameAreaSize / 2,
                this.gameAreaY + this.barHeight / 2
            );
            this.questionText.setStyle({ fontSize: `${Math.floor(this.baseFontSize * this.scaleFactor)}px` });
        }
        if (this.endBtn) {
            this.endBtn.setPosition(
                this.gameAreaX + Math.floor(30 * this.scaleFactor),
                this.gameAreaY + this.barHeight / 2
            );
            this.endBtn.setStyle({ fontSize: `${Math.floor(22 * this.scaleFactor)}px` });
        }
    }

    // ---- Template-method hooks ----

    /** Override to add mechanic-specific fields to the game_over log payload. */
    protected getEndGamePayload(): Record<string, any> {
        return {};
    }

    /** Called once from BasePlayScene.create() — build mechanic-specific game objects here. */
    protected abstract setupMechanic(): void;

    /** Called each time a new question is ready — spawn or display answer choices here. */
    protected abstract onQuestionReady(question: MathQuestion): void;

    // ---- Internal helpers ----

    /** Override in subclasses to block the End Game button during modal states. */
    protected onEndButtonPressed() {
        this.updateGameState();
        this.logger.logEvent('end_game_pressed', {
            timeElapsed: Date.now() - this.gameStartTime,
            questionsAnswered: this.correctCount + this.incorrectCount,
            currentScore: this.correctCount,
        });
        this.endGame('user_quit');
    }

    /** No-op; override in subclasses that push state to GameLogger.updateGameState(). */
    protected updateGameState(): void { }

    /** Override to show a mechanic-specific "Time's Up!" overlay before scene transition. */
    protected showTimesUpMessage(): void { }

    protected shutdown() {
        this.logger?.cleanup();
    }
}
