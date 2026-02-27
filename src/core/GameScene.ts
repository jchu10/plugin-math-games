import * as Phaser from 'phaser';
import { MathQuestion, Response, GameConfig, LogEvent, QuestionDifficulty } from './types';
import { GameState } from './GameLogger';
import { BasePlayScene } from './BasePlayScene';

import { drawRoundedRect, drawStar } from './uiUtils';

/**
 * Flying-objects game mechanic: answer objects (asteroids / thought bubbles)
 * move across the screen and the player selects the correct one by shooting
 * (arrowKeys) or tapping (tapToSelect).
 *
 * Extends BasePlayScene, which owns the HUD, timer, lives, question sequencing,
 * logging, and scene transitions.  This class implements only the mechanic-
 * specific behaviour via the four abstract hooks.
 */
export class GameScene extends BasePlayScene {
    private lastAnswerCorrectLocal: boolean = false;
    private appStartTS: number = 0;

    // ---- Physics / flying-objects state ----
    private answerObjects!: Phaser.Physics.Arcade.Group;
    private answerObjectLabels: Phaser.GameObjects.Text[] = [];
    private asteroidLabels: Phaser.GameObjects.Text[] = [];
    private spaceship!: Phaser.GameObjects.Image;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private laserGroup!: Phaser.Physics.Arcade.Group;

    // Movement (arrowKeys control scheme)
    private shipVel = 0;
    private shipMaxSpeed = 900;
    private shipAccel = 2400;
    private shipDecel = 3000;
    private lastLaserShotTime = 0;

    // Power-up hint
    private hintIcon!: Phaser.GameObjects.Image;
    private hintUses: number = 0;
    private maxHints: number = 3;
    private hintActive: boolean = false;
    private hintUsedThisQuestion: boolean = false;

    // Step-by-step (number line) hint
    private powertoolIcon!: Phaser.GameObjects.Image;
    private powertoolUses: number = 0;
    private maxPowertool: number = 3;
    private powertoolActive: boolean = false;
    private sandboxPopup?: Phaser.GameObjects.Container;
    private sandboxActive: boolean = false;
    private numberLineAnimationTimers: Phaser.Time.TimerEvent[] = [];
    private pausedAsteroidVelocities: number[] = [];
    private timerPaused: boolean = false;
    private powertoolUsedThisQuestion: boolean = false;

    // Feedback popup
    private feedbackPopup?: Phaser.GameObjects.Container;
    private feedbackActive: boolean = false;
    private powerupFromFeedback: boolean = false;

    // Staircase progress bar
    private seenQuestions: Map<QuestionDifficulty, Set<string>> = new Map();
    private progressContainer!: Phaser.GameObjects.Container;
    private currentGem!: Phaser.GameObjects.Graphics;
    private clippingBorder!: Phaser.GameObjects.Graphics;
    private clippingBorderY: number = 0;
    private progressHeight = 0;
    private progressBarWidth = 12;
    private questionStars: Phaser.GameObjects.Graphics[] = [];

    // Key press tracking for fine-grained logging
    private keyDownTimes: Map<string, number> = new Map();

    // Label colours come from the active theme
    private optionLabelColor: string = '#000000';
    private optionLabelStroke: string = '#ffffff';

    constructor() {
        super('GameScene');
    }

    // ---- Phaser lifecycle ----

    preload() {
        super.preload();

        this.load.image('cube', 'cube.png');
        this.load.image('Sound', 'Sound.png');
        this.load.image('powerup', 'powerup.png');
        this.load.image('powertool', 'powertool.png');

        this.optionLabelColor = this.theme.answerLabelColor;
        this.optionLabelStroke = this.theme.answerLabelStroke;
        this.load.image('spaceship', this.theme.playerImage);
        this.theme.answerObjectImages.forEach((filename, i) => {
            this.load.image(`answerObject${i + 1}`, filename);
        });
        this.load.audio('explosion1', this.theme.correctSoundFile);
        if (this.theme.shootSoundFile) {
            this.load.audio('lasershot', this.theme.shootSoundFile);
        }
    }

    update(time: number, delta: number) {
        if (this.sandboxActive || this.timerPaused) return;

        // Delegate timer countdown to base class
        super.update(time, delta);

        // Update answer object positions
        if (this.answerObjects) {
            this.answerObjects.getChildren().forEach((asteroid: Phaser.GameObjects.GameObject) => {
                const sprite = asteroid as Phaser.Physics.Arcade.Image;
                const label = sprite.getData('label') as Phaser.GameObjects.Text;

                sprite.x = Phaser.Math.Clamp(sprite.x, this.gameAreaX + 20, this.gameAreaX + this.gameAreaSize - 20);

                if (label) {
                    label.setPosition(sprite.x, sprite.y);
                }
            });

            this.updateAnswerObjectClipping();

            const allGone = this.answerObjects.getChildren().length > 0 && this.answerObjects.getChildren().every((asteroid: Phaser.GameObjects.GameObject) => {
                const sprite = asteroid as Phaser.Physics.Arcade.Image;
                return sprite.y > this.gameAreaY + this.gameAreaHeight + 50;
            });

            if (allGone && !this.transitioning) {
                if (this.hintActive) {
                    this.answerObjects.getChildren().forEach((a: Phaser.GameObjects.GameObject) => {
                        const s = a as Phaser.Physics.Arcade.Image;
                        const lbl = s.getData('label') as Phaser.GameObjects.Text;
                        s.setAlpha(1);
                        if (lbl) { lbl.setColor('#fff'); lbl.setAlpha(1); }
                    });
                    this.hintActive = false;
                }
                if (this.powertoolActive) {
                    this.answerObjects.getChildren().forEach((a: Phaser.GameObjects.GameObject) => {
                        const s = a as Phaser.Physics.Arcade.Image;
                        const lbl = s.getData('label') as Phaser.GameObjects.Text;
                        s.setAlpha(1);
                        if (lbl) { lbl.setColor('#fff'); lbl.setAlpha(1); }
                    });
                    this.powertoolActive = false;
                }
                this.loseLife();
                this.clearAnswerObjects();
                if (this.lives === 0) {
                    this.endGame('lives_lost');
                } else {
                    this.showNextQuestion();
                }
            }
        }

        // Ship movement (arrowKeys control scheme only)
        if (this.gameConfig.controls === 'arrowKeys') {
            const dt = delta / 1000;
            let dir = 0;
            if (this.cursors.left?.isDown) dir -= 1;
            if (this.cursors.right?.isDown) dir += 1;

            if (dir !== 0) {
                this.shipVel += dir * this.shipAccel * dt;
                this.shipVel = Phaser.Math.Clamp(this.shipVel, -this.shipMaxSpeed, this.shipMaxSpeed);
            } else {
                if (this.shipVel > 0) this.shipVel = Math.max(0, this.shipVel - this.shipDecel * dt);
                else if (this.shipVel < 0) this.shipVel = Math.min(0, this.shipVel + this.shipDecel * dt);
            }

            this.spaceship.x += this.shipVel * dt;
            const hintIcon = this.gameConfig.hint_type === 'powerup' ? this.hintIcon : this.powertoolIcon;
            const pencilMinX = hintIcon
                ? hintIcon.x + hintIcon.displayWidth + 8
                : this.gameAreaX + 40;
            this.spaceship.x = Phaser.Math.Clamp(this.spaceship.x, pencilMinX, this.gameAreaX + this.gameAreaSize - 40);

            const whiteBarBottom = this.gameAreaY + 85;
            this.laserGroup.getChildren().forEach((laser: Phaser.GameObjects.GameObject) => {
                const laserSprite = laser as Phaser.Physics.Arcade.Image;
                laserSprite.y -= 8;

                this.physics.overlap(laserSprite, this.answerObjects, (_laserObj, asteroidObj) => {
                    const asteroid = asteroidObj as Phaser.Physics.Arcade.Image;
                    this.laserHitAsteroid(laserSprite, asteroid);
                });

                if (laserSprite.y < whiteBarBottom) {
                    laserSprite.destroy();
                }
            });
        }
    }

    // ---- BasePlayScene hooks ----

    protected setupMechanic() {
        // Destroy previous progress container if scene is restarting
        if (this.progressContainer) {
            this.progressContainer.destroy();
            this.progressContainer = undefined;
        }

        // Reset mechanic-specific state
        this.shipVel = 0;
        this.hintUses = 0;
        this.hintUsedThisQuestion = false;
        this.hintActive = false;
        this.powertoolUses = 0;
        this.powertoolUsedThisQuestion = false;
        this.powertoolActive = false;
        this.powerupFromFeedback = false;
        this.feedbackActive = false;
        this.sandboxActive = false;
        this.timerPaused = false;
        this.seenQuestions.clear();

        // Clipping border (separates game area from bottom bar)
        this.clippingBorderY = this.bottomBarY;
        this.createClippingBorder();

        // Hint buttons in the bottom bar
        if (this.gameConfig.hint_type === 'powerup') {
            this.hintIcon = this.add.image(
                this.gameAreaX + Math.floor(20 * this.scaleFactor),
                this.bottomBarY + this.bottomBarHeight - Math.floor(20 * this.scaleFactor),
                'powerup'
            ).setOrigin(0, 1).setScale(0.45 * this.scaleFactor).setInteractive().setDepth(1002);
            this.hintIcon.clearTint();
            this.hintIcon.on('pointerdown', () => {
                if (this.sandboxActive || this.feedbackActive) return;
                if (this.hintUses < this.maxHints && !this.hintActive && !this.hintUsedThisQuestion) {
                    this.hintUses++;
                    this.hintActive = true;
                    this.hintUsedThisQuestion = true;
                    const questionId = `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}`;
                    if (!this.questionsWithHints.includes(questionId)) {
                        this.questionsWithHints.push(questionId);
                    }
                    this.updateGameState();
                    this.logger.logEvent('hint_pressed', {
                        hintType: 'powerup',
                        questionId,
                        questionNumber: this.correctCount + this.incorrectCount,
                        hintNumber: this.hintUses,
                        timeSinceQuestionStart: Date.now() - this.questionStartTime,
                        hintContent: null,
                    });
                    this.answerObjects.getChildren().forEach((asteroid: Phaser.GameObjects.GameObject) => {
                        const sprite = asteroid as Phaser.Physics.Arcade.Image;
                        const label = sprite.getData('label') as Phaser.GameObjects.Text;
                        if (sprite.getData('answer') !== this.currentQuestion.correctAnswer) {
                            sprite.setAlpha(0.3);
                            if (label) label.setAlpha(0.3);
                        }
                    });
                    if (this.hintUses >= this.maxHints) {
                        this.hintIcon.setAlpha(0.5);
                        this.hintIcon.disableInteractive();
                    }
                }
            });
        } else if (this.gameConfig.hint_type === 'stepByStep') {
            this.powertoolIcon = this.add.image(
                this.gameAreaX + Math.floor(20 * this.scaleFactor),
                this.bottomBarY + this.bottomBarHeight - Math.floor(20 * this.scaleFactor),
                'powerup'
            ).setOrigin(0, 1).setScale(0.45 * this.scaleFactor).setInteractive().setDepth(1002);
            this.powertoolIcon.clearTint();
            this.powertoolIcon.on('pointerdown', () => {
                if (this.sandboxActive || this.feedbackActive) return;
                if (this.powertoolUses < this.maxPowertool && !this.sandboxActive && !this.powertoolUsedThisQuestion) {
                    this.powertoolUses++;
                    this.powertoolUsedThisQuestion = true;
                    const questionId = `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}`;
                    this.updateGameState();
                    this.logger.logEvent('hint_pressed', {
                        questionId,
                        questionNumber: this.correctCount + this.incorrectCount,
                        toolType: 'stepByStep',
                        timeSinceQuestionStart: Date.now() - this.questionStartTime,
                    });
                    this.openNumberLinePopup();
                    if (this.powertoolUses >= this.maxPowertool) {
                        this.powertoolIcon.setAlpha(0.5);
                        this.powertoolIcon.disableInteractive();
                    }
                }
            });
        }

        // Answer object physics group
        this.answerObjects = this.physics.add.group();

        // Player avatar (spaceship / pencil) in bottom bar
        this.spaceship = this.add.image(
            this.gameAreaX + this.gameAreaSize / 2,
            this.bottomBarY + this.bottomBarHeight - Math.floor(5 * this.scaleFactor),
            'spaceship'
        ).setOrigin(0.5, 1).setScale(0.192 * this.scaleFactor).setDepth(1001);

        // Progress bar (left side, between hearts and bottom bar)
        const topOfBar = this.heartY + this.heartSize + Math.floor(30 * this.scaleFactor);
        const bottomOfBar = this.bottomBarY - Math.floor(20 * this.scaleFactor);
        const progressX = this.gameAreaX + Math.floor(75 * this.scaleFactor);
        this.drawProgressContainer(progressX, topOfBar, bottomOfBar);

        // Controls
        if (this.gameConfig.controls === 'arrowKeys') {
            if (!this.input.keyboard) {
                console.error('Keyboard plugin not available');
                return;
            }
            if (!this.input.keyboard.enabled) {
                this.input.keyboard.enabled = true;
            }
            this.input.keyboard.removeAllKeys(false);

            this.cursors = {
                up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
                down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
                left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
                right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
                space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
                shift: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
            };
            this.input.keyboard.addCapture('LEFT,RIGHT,SPACE');

            this.input.keyboard.on('keydown-LEFT', () => {
                if (this.sandboxActive || this.feedbackActive) return;
                if (!this.keyDownTimes.has('left')) {
                    this.keyDownTimes.set('left', Date.now());
                    this.updateGameState();
                    this.logger.logKeyDown('left', { x: this.spaceship.x, y: this.spaceship.y }, { x: this.shipVel, y: 0 });
                }
            });
            this.input.keyboard.on('keyup-LEFT', () => {
                const downTime = this.keyDownTimes.get('left');
                if (downTime !== undefined) {
                    const duration = Date.now() - downTime;
                    this.keyDownTimes.delete('left');
                    this.updateGameState();
                    this.logger.logKeyUp('left', duration, { x: this.spaceship.x, y: this.spaceship.y }, { x: this.shipVel, y: 0 });
                }
            });
            this.input.keyboard.on('keydown-RIGHT', () => {
                if (this.sandboxActive || this.feedbackActive) return;
                if (!this.keyDownTimes.has('right')) {
                    this.keyDownTimes.set('right', Date.now());
                    this.updateGameState();
                    this.logger.logKeyDown('right', { x: this.spaceship.x, y: this.spaceship.y }, { x: this.shipVel, y: 0 });
                }
            });
            this.input.keyboard.on('keyup-RIGHT', () => {
                const downTime = this.keyDownTimes.get('right');
                if (downTime !== undefined) {
                    const duration = Date.now() - downTime;
                    this.keyDownTimes.delete('right');
                    this.updateGameState();
                    this.logger.logKeyUp('right', duration, { x: this.spaceship.x, y: this.spaceship.y }, { x: this.shipVel, y: 0 });
                }
            });
            this.input.keyboard.on('keydown-SPACE', () => {
                if (this.sandboxActive || this.feedbackActive) return;
                if (!this.keyDownTimes.has('space')) {
                    this.keyDownTimes.set('space', Date.now());
                    this.updateGameState();
                    this.logger.logKeyDown('space', { x: this.spaceship.x, y: this.spaceship.y }, { x: this.shipVel, y: 0 });
                }
                this.shootLaser();
            });
            this.input.keyboard.on('keyup-SPACE', () => {
                const downTime = this.keyDownTimes.get('space');
                if (downTime !== undefined) {
                    const duration = Date.now() - downTime;
                    this.keyDownTimes.delete('space');
                    this.updateGameState();
                    this.logger.logKeyUp('space', duration, { x: this.spaceship.x, y: this.spaceship.y }, { x: this.shipVel, y: 0 });
                }
            });
        }

        this.laserGroup = this.physics.add.group();
    }

    protected onQuestionReady(q: MathQuestion) {
        // Clear lasers from the previous question
        if (this.laserGroup) {
            this.laserGroup.clear(true, true);
        }

        // Re-enable hint buttons if uses remain
        if (this.gameConfig.hint_type === 'powerup' && this.hintUses < this.maxHints) {
            this.hintIcon.setAlpha(1);
            this.hintIcon.setInteractive();
        }
        if (this.gameConfig.hint_type === 'stepByStep' && this.powertoolUses < this.maxPowertool) {
            if (this.powertoolIcon) {
                this.powertoolIcon.setAlpha(1);
                if (!this.powertoolIcon.input?.enabled) this.powertoolIcon.setInteractive();
            }
        }

        // Reset per-question hint state
        this.hintUsedThisQuestion = false;
        this.hintActive = false;
        this.powertoolUsedThisQuestion = false;
        this.powertoolActive = false;
        this.powerupFromFeedback = false;

        // Spawn answer objects using theme-defined spawn parameters
        const spawnY = this.theme.answerSpawnFromBottom
            ? this.gameAreaY + this.gameAreaHeight - Math.floor(this.baseBottomBarHeight * this.scaleFactor)
            : this.gameAreaY + 85;
        const velocitySign = this.theme.answerSpawnFromBottom ? -1 : 1;
        const asteroidSpawnData = this.spawnAnswerObjects(
            () => spawnY,
            this.theme.answerScaleRange,
            (_i) => velocitySign * Phaser.Math.Between(30, 65) * 0.5,
            this.theme.answerDepth,
        );

        const questionId = `${q.question}_${q.correctAnswer}`;
        this.updateGameState();
        this.logger.logEvent('question_shown', {
            questionId,
            questionNumber: this.questionsShown,
            questionText: q.question,
            correctAnswer: q.correctAnswer,
            responseOptions: q.options,
            asteroidSpawns: asteroidSpawnData,
        });
    }

    protected onResize() {
        super.onResize();

        // Clipping border
        this.clippingBorderY = this.bottomBarY;
        if (this.clippingBorder) {
            this.createClippingBorder();
        }

        // Hint / powertool icons
        const iconScale = 0.45 * this.scaleFactor;
        if (this.gameConfig.hint_type === 'powerup' && this.hintIcon) {
            this.hintIcon.setPosition(
                this.gameAreaX + Math.floor(20 * this.scaleFactor),
                this.bottomBarY + this.bottomBarHeight - Math.floor(20 * this.scaleFactor)
            );
            this.hintIcon.setScale(iconScale);
        } else if (this.gameConfig.hint_type === 'stepByStep' && this.powertoolIcon) {
            this.powertoolIcon.setPosition(
                this.gameAreaX + Math.floor(20 * this.scaleFactor),
                this.bottomBarY + this.bottomBarHeight - Math.floor(20 * this.scaleFactor)
            );
            this.powertoolIcon.setScale(iconScale);
        }

        // Spaceship
        if (this.spaceship) {
            this.spaceship.setPosition(
                this.gameAreaX + this.gameAreaSize / 2,
                this.bottomBarY + this.bottomBarHeight - Math.floor(5 * this.scaleFactor)
            );
            this.spaceship.setScale(0.192 * this.scaleFactor);
            this.spaceship.setDepth(1001);
        }

        // Progress bar
        if (this.progressContainer) {
            const topOfBar = this.heartY + this.heartSize + Math.floor(30 * this.scaleFactor);
            const bottomOfBar = this.bottomBarY - Math.floor(20 * this.scaleFactor);
            const progressX = this.gameAreaX + Math.floor(75 * this.scaleFactor);
            this.progressContainer.destroy();
            this.drawProgressContainer(progressX, topOfBar, bottomOfBar);
        }
    }

    protected getEndGamePayload(): Record<string, any> {
        return { totalHintsUsed: this.hintUses };
    }

    protected onEndButtonPressed() {
        if (this.sandboxActive || this.feedbackActive) return;
        super.onEndButtonPressed();
    }

    protected showTimesUpMessage() {
        const popupWidth = Math.min(this.gameAreaSize * 0.8, 500);
        const popupHeight = Math.min(this.gameAreaHeight * 0.6, 300);
        const popupX = this.gameAreaX + (this.gameAreaSize - popupWidth) / 2;
        const popupY = this.gameAreaY + (this.gameAreaHeight - popupHeight) / 2;

        const bg = this.add.graphics({ x: popupX, y: popupY });
        bg.fillStyle(0xffffff, 0.95);
        bg.fillRoundedRect(0, 0, popupWidth, popupHeight, 24);
        bg.lineStyle(2, 0xcccccc, 1);
        bg.strokeRoundedRect(0, 0, popupWidth, popupHeight, 24);

        this.feedbackPopup = this.add.container(0, 0).setDepth(3000);
        this.feedbackPopup.add(bg);

        const titleText = this.add.text(popupX + popupWidth / 2, popupY + popupHeight / 2, "Time's Up!", {
            font: '32px Arial', color: '#b00020', align: 'center',
        }).setOrigin(0.5).setDepth(3001);
        this.feedbackPopup.add(titleText);
    }

    // ---- Game state logging ----

    protected updateGameState(): void {
        const questionId = this.currentQuestion ? `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}` : '';
        const gameState: GameState = {
            gameConfig: this.gameConfig,
            currentQuestion: {
                questionId,
                questionNumber: this.correctCount + this.incorrectCount + 1,
                questionText: this.currentQuestion?.question || '',
                correctAnswer: this.currentQuestion?.correctAnswer || 0,
                allAnswers: this.currentQuestion?.options || [],
            },
            progress: {
                questionsShown: this.questionsShown,
                questionsAnswered: this.correctCount + this.incorrectCount,
                correctCount: this.correctCount,
                incorrectCount: this.incorrectCount,
                currentStreak: this.currentStreak,
                longestStreak: this.longestStreak,
            },
            status: {
                lives: this.lives,
                score: this.correctCount,
                timeElapsed: Date.now() - this.gameStartTime,
                gameOver: this.gameOver || false,
                paused: this.sandboxActive || this.timerPaused || false,
            },
            hints: {
                totalHintsUsed: this.hintUses,
                maxHints: this.maxHints,
                hintsUsedThisQuestion: this.hintUsedThisQuestion || false,
                hintActive: this.hintActive || false,
                questionsWithHints: this.questionsWithHints,
            },
            powerTool: this.gameConfig.hint_type === 'stepByStep' ? {
                totalUses: this.powertoolUses,
                maxUses: this.maxPowertool,
                usedThisQuestion: this.powertoolUsedThisQuestion || false,
                active: this.powertoolActive || false,
            } : undefined,
            screen: {
                width: this.scale.width,
                height: this.scale.height,
                scaleFactor: this.scale.height / 1080,
                gameAreaX: this.gameAreaX,
                gameAreaY: this.gameAreaY,
                gameAreaWidth: this.gameAreaSize,
                gameAreaHeight: this.gameAreaHeight,
            },
        };
        this.logger.updateGameState(gameState);
    }

    // ---- Mechanic methods ----

    loseLife() {
        super.loseLife();
    }

    private updateProgressBar() {
        this.questionStars.forEach((star, index) => {
            if (index >= (15 - this.correctCount)) {
                star.clear();
                drawStar(star, 0, 0, 5, 10.4, 5.2, 0xffd700, 1);
            } else {
                star.clear();
                drawStar(star, 0, 0, 5, 10.4, 5.2, 0xffffff, 0.3, 0xcccccc);
            }
        });
    }

    private drawProgressContainer(x: number, topY: number, bottomY: number) {
        const width = this.progressBarWidth;
        const span = bottomY - topY;
        const height = Math.max(40, Math.floor(span * 0.9));
        const centerY = topY + (span - height) / 2 + height / 2;

        if (!this.progressContainer) {
            this.progressContainer = this.add.container(x, centerY).setDepth(1002);
        } else {
            this.progressContainer.setPosition(x, centerY);
        }

        this.progressHeight = height;

        this.questionStars = [];
        for (let i = 0; i < 15; i++) {
            const starY = -height / 2 + (height * (i + 1) / 16);
            const star = this.add.graphics();
            star.setPosition(-width / 2 - 20, starY);
            this.questionStars.push(star);
            this.progressContainer.add(star);
        }

        this.updateProgressBar();
    }

    private clearAnswerObjects() {
        this.answerObjects.clear(true, true);
        this.answerObjectLabels.forEach(label => { if (label?.active) label.destroy(); });
        this.answerObjectLabels = [];
    }

    private explodeAsteroid(asteroid: Phaser.Physics.Arcade.Image) {
        asteroid.setVisible(false);
        const label = asteroid.getData('label') as Phaser.GameObjects.Text;
        if (label) label.setVisible(false);

        const x = asteroid.x;
        const y = asteroid.y;
        const explosion = this.add.graphics({ x, y });
        explosion.setDepth(2000);
        let frame = 0;
        const maxFrames = 24;
        const colors = [0xfff200, 0xffa500, 0xff0000, 0xffffff];

        this.sound.play('explosion1');

        this.time.addEvent({
            repeat: maxFrames,
            delay: 24,
            callback: () => {
                explosion.clear();
                for (let i = 0; i < 4; i++) {
                    const radius = 18 + frame * (8 + i * 2);
                    const alpha = Math.max(0, 1 - frame / maxFrames - i * 0.15);
                    explosion.fillStyle(colors[i], alpha);
                    explosion.fillCircle(0, 0, radius);
                }
                frame++;
                if (frame > maxFrames) {
                    explosion.destroy();
                }
            },
        });
    }

    checkAnswer(asteroid: Phaser.Physics.Arcade.Image) {
        if (this.feedbackActive || this.gameOver) return;

        this.feedbackActive = true;

        const selected = asteroid.getData('answer');
        const isCorrect = selected === this.currentQuestion.correctAnswer;
        this.lastAnswerCorrect = isCorrect;

        const timeToAnswer = Date.now() - this.questionStartTime;
        const questionId = `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}`;

        let a = 0, b = 0;
        const m = this.currentQuestion.question.match(/(\d+)\s*\+\s*(\d+)/);
        if (m) {
            a = parseInt(m[1], 10);
            b = parseInt(m[2], 10);
        }

        if (isCorrect) {
            this.correctCount = Math.min(15, this.correctCount + 1);
            this.currentStreak++;
            if (this.currentStreak > this.longestStreak) {
                this.longestStreak = this.currentStreak;
            }
            this.updateProgressBar();
            this.showStarAnimation(asteroid.x, asteroid.y);
        } else {
            this.incorrectCount++;
            this.currentStreak = 0;
            this.loseLife();
        }

        this.updateGameState();
        this.logger.logEvent('end_question', {
            questionId,
            questionNumber: this.correctCount + this.incorrectCount,
            responseOptions: this.currentQuestion.options,
            correctAnswer: this.currentQuestion.correctAnswer,
            response: selected,
            rt: timeToAnswer,
            responseIsCorrect: isCorrect,
            hintUsed: this.hintUsedThisQuestion || false,
        });

        if (!isCorrect && this.lives > 0) {
            this.updateGameState();
            this.logger.logEvent('life_lost', {
                reason: 'wrong_answer',
                questionId,
                questionNumber: this.correctCount + this.incorrectCount,
                remainingLives: this.lives,
            });
        }

        // Reset hint visuals
        if (this.hintActive) {
            this.answerObjects.getChildren().forEach((a: Phaser.GameObjects.GameObject) => {
                const s = a as Phaser.Physics.Arcade.Image;
                const lbl = s.getData('label') as Phaser.GameObjects.Text;
                s.setAlpha(1);
                if (lbl) { lbl.setColor('#fff'); lbl.setAlpha(1); }
            });
            this.hintActive = false;
        }
        if (this.powertoolActive) {
            this.answerObjects.getChildren().forEach((a: Phaser.GameObjects.GameObject) => {
                const s = a as Phaser.Physics.Arcade.Image;
                const lbl = s.getData('label') as Phaser.GameObjects.Text;
                s.setAlpha(1);
                if (lbl) { lbl.setColor('#fff'); lbl.setAlpha(1); }
            });
            this.powertoolActive = false;
        }

        if (this.gameConfig.feedback_type === 'explosion') {
            this.explodeAsteroid(asteroid);
            this.clearAnswerObjects();
            this.time.delayedCall(isCorrect ? 500 : 0, () => {
                this.feedbackActive = false;
                if (this.lives === 0) {
                    this.endGame('lives_lost');
                } else {
                    this.showNextQuestion();
                }
            });
        } else {
            this.showFeedbackPopup(isCorrect, a, b, this.currentQuestion.correctAnswer);
        }
    }

    private showStarAnimation(startX: number, startY: number) {
        const star = this.add.graphics();
        star.setPosition(startX, startY);
        drawStar(star, 0, 0, 5, 18, 9);
        star.setDepth(2000);

        this.time.delayedCall(500, () => {
            this.tweens.add({
                targets: star,
                x: this.spaceship.x,
                y: this.spaceship.y,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    this.updateProgressBar();
                    star.destroy();
                },
            });
        });
    }

    private showFeedbackPopup(isCorrect: boolean, a: number, b: number, correct: number) {
        this.clearAnswerObjects();
        this.feedbackActive = true;
        this.pauseGameEntities();

        const popupWidth = Math.min(this.gameAreaSize * 0.8, 500);
        const popupHeight = Math.min(this.gameAreaHeight * 0.6, 300);
        const popupX = this.gameAreaX + (this.gameAreaSize - popupWidth) / 2;
        const popupY = this.gameAreaY + (this.gameAreaHeight - popupHeight) / 2;

        const bg = this.add.graphics({ x: popupX, y: popupY });
        bg.fillStyle(0xffffff, 0.95);
        bg.fillRoundedRect(0, 0, popupWidth, popupHeight, 24);
        bg.lineStyle(2, 0xcccccc, 1);
        bg.strokeRoundedRect(0, 0, popupWidth, popupHeight, 24);

        this.feedbackPopup = this.add.container(0, 0).setDepth(3000);
        this.feedbackPopup.add(bg);

        const title = isCorrect ? 'Correct!' : 'Incorrect!';
        const titleText = this.add.text(popupX + popupWidth / 2, popupY + 40, title, {
            font: '32px Arial', color: isCorrect ? '#0a8f3a' : '#b00020', align: 'center',
        }).setOrigin(0.5).setDepth(3001);
        this.feedbackPopup.add(titleText);

        const solutionText = this.add.text(popupX + popupWidth / 2, popupY + 90, 'Solution:', {
            font: '24px Arial', color: '#333333', align: 'center',
        }).setOrigin(0.5, 0.5).setDepth(3001);
        this.feedbackPopup.add(solutionText);

        const additionMatch = this.currentQuestion?.question.match(/(\d+)\s*\+\s*(\d+)/);
        const subtractionMatch = this.currentQuestion?.question.match(/(\d+)\s*-\s*(\d+)/);
        let equationDisplay = '';
        if (additionMatch) {
            equationDisplay = `${a} + ${b} = ${correct}`;
        } else if (subtractionMatch) {
            const minuend = parseInt(subtractionMatch[1], 10);
            const subtrahend = parseInt(subtractionMatch[2], 10);
            equationDisplay = `${minuend} - ${subtrahend} = ${correct}`;
        } else {
            equationDisplay = `${a} + ${b} = ${correct}`;
        }

        const equationText = this.add.text(popupX + popupWidth / 2, popupY + 120, equationDisplay, {
            font: '24px Arial', color: '#333333', align: 'center',
        }).setOrigin(0.5, 0.5).setDepth(3001);
        this.feedbackPopup.add(equationText);

        if (this.gameConfig.feedback_type === 'explanation' &&
            (this.gameConfig.hint_type === 'stepByStep' ? this.powertoolUses < this.maxPowertool : true)) {
            const viewSolutionBtn = this.add.graphics({ x: popupX + popupWidth / 2, y: popupY + 180 });
            viewSolutionBtn.fillStyle(0xf0f0f0, 1);
            viewSolutionBtn.fillRoundedRect(-100, -25, 200, 50, 8);
            viewSolutionBtn.lineStyle(1, 0xcccccc, 1);
            viewSolutionBtn.strokeRoundedRect(-100, -25, 200, 50, 8);
            viewSolutionBtn.setInteractive(new Phaser.Geom.Rectangle(-100, -25, 200, 50), Phaser.Geom.Rectangle.Contains);
            viewSolutionBtn.setDepth(3001);
            this.feedbackPopup.add(viewSolutionBtn);

            const viewSolutionText = this.add.text(popupX + popupWidth / 2, popupY + 180, 'View solution', {
                font: '20px Arial', color: '#333333', align: 'center',
            }).setOrigin(0.5).setDepth(3002);
            this.feedbackPopup.add(viewSolutionText);

            viewSolutionBtn.on('pointerdown', () => {
                this.updateGameState();
                this.logger.logEvent('popup_show_answer_clicked', {
                    popupType: 'feedback',
                    questionId: `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}`,
                    questionNumber: this.correctCount + this.incorrectCount,
                    wasCorrect: this.lastAnswerCorrect,
                });
                this.feedbackPopup?.destroy();
                this.feedbackPopup = undefined;
                this.feedbackActive = false;
                this.resumeGameEntities();
                this.powerupFromFeedback = true;
                this.openNumberLinePopup();
            });
        }

        const nextBtn = this.add.graphics({ x: popupX + popupWidth / 2, y: popupY + popupHeight - 40 });
        nextBtn.fillStyle(0x87ceeb, 1);
        nextBtn.fillRoundedRect(-40, -15, 80, 30, 8);
        nextBtn.lineStyle(1, 0xcccccc, 1);
        nextBtn.strokeRoundedRect(-40, -15, 80, 30, 8);
        nextBtn.setInteractive(new Phaser.Geom.Rectangle(-40, -15, 80, 30), Phaser.Geom.Rectangle.Contains);
        nextBtn.setDepth(3001);
        this.feedbackPopup.add(nextBtn);

        const nextText = this.add.text(popupX + popupWidth / 2, popupY + popupHeight - 40, 'Next', {
            font: '18px Arial', color: '#333333', align: 'center',
        }).setOrigin(0.5).setDepth(3002);
        this.feedbackPopup.add(nextText);

        nextBtn.on('pointerdown', () => {
            this.updateGameState();
            this.logger.logEvent('popup_next_clicked', {
                popupType: 'feedback',
                questionId: `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}`,
                questionNumber: this.correctCount + this.incorrectCount,
                wasCorrect: this.lastAnswerCorrect,
            });
            this.feedbackPopup?.destroy();
            this.feedbackPopup = undefined;
            this.feedbackActive = false;
            this.resumeGameEntities();
            if (this.lives === 0) {
                this.endGame('lives_lost');
            } else {
                this.showNextQuestion();
            }
        });
    }

    spawnAnswerObjects(
        yPosition: (i: number, x: number) => number,
        scaleRange: [number, number],
        velocity: (i: number) => number,
        depth: number,
    ): any[] {
        this.clearAnswerObjects();

        const scaleFactor = this.scale.height / 1080;
        const progressX = this.gameAreaX + Math.floor(75 * scaleFactor);
        const progressBarPadding = 20;
        const maxObjectSize = scaleRange[1] * scaleFactor * 200;
        const progressBarRight = progressX + this.progressBarWidth + progressBarPadding + (maxObjectSize * 0.5);
        const minX = Math.max(this.gameAreaX + 12, Math.ceil(progressBarRight));
        const maxX = this.gameAreaX + this.gameAreaSize - 50;
        const minDist = 60;
        const numAnswers = this.currentQuestion.options.length;

        let positions: number[] = [];
        let attempts = 0;
        const maxAttempts = 5000;
        while (positions.length < numAnswers && attempts < maxAttempts) {
            const x = Phaser.Math.Between(minX, maxX);
            if (positions.every(px => Math.abs(px - x) >= minDist)) positions.push(x);
            attempts++;
        }
        if (positions.length < numAnswers) {
            const reducedMinDist = 40;
            while (positions.length < numAnswers && attempts < maxAttempts) {
                const x = Phaser.Math.Between(minX, maxX);
                if (positions.every(px => Math.abs(px - x) >= reducedMinDist)) positions.push(x);
                attempts++;
            }
        }
        positions = [...new Set(positions)].sort((a, b) => a - b);
        if (positions.length < numAnswers) {
            const availableWidth = maxX - minX;
            const baseSpacing = availableWidth / (numAnswers + 1);
            positions = [];
            for (let i = 1; i <= numAnswers; i++) {
                const randomOffset = Phaser.Math.Between(-baseSpacing * 0.3, baseSpacing * 0.3);
                positions.push(Math.floor(minX + baseSpacing * i + randomOffset));
            }
        }
        const finalPositions = positions.slice(0, numAnswers);

        if (!this.answerObjects) {
            this.answerObjects = this.physics.add.group();
        }

        const spawnData: any[] = [];

        this.currentQuestion.options.forEach((answer, i) => {
            const x = finalPositions[i];
            const answerObjectKey = i % 3 === 0 ? 'answerObject1' : (i % 3 === 1 ? 'answerObject2' : 'answerObject3');
            const minSize = scaleRange[0] * scaleFactor;
            const maxSize = scaleRange[1] * scaleFactor;
            const minAnswer = Math.min(...this.currentQuestion.options);
            const maxAnswer = Math.max(...this.currentQuestion.options);
            let scale: number;
            if (maxAnswer === minAnswer) {
                scale = (minSize + maxSize) / 2;
            } else {
                const normalized = (answer - minAnswer) / (maxAnswer - minAnswer);
                scale = minSize + (normalized * (maxSize - minSize));
            }
            const y = yPosition(i, x);
            const obj = this.answerObjects.create(x, y, answerObjectKey) as Phaser.Physics.Arcade.Image;
            const speed = velocity(i);
            obj.setVelocityY(speed);
            obj.setScale(scale);
            obj.setData('answer', answer);
            obj.setDepth(depth);

            spawnData.push({
                answer,
                position: { x, y },
                size: scale,
                speed,
                asteroidType: answerObjectKey,
                spawnIndex: i,
            });

            const strokeThickness = Math.floor(this.theme.answerLabelStrokeWidth * scaleFactor);
            const fontSize = Math.floor(this.theme.answerLabelFontSize * scaleFactor);
            const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
                font: `${fontSize}px Arial`,
                color: this.optionLabelColor,
                fontStyle: 'bold',
                stroke: this.optionLabelStroke,
                strokeThickness,
            };
            if (this.theme.answerLabelShadow) {
                labelStyle.shadow = {
                    offsetX: 0, offsetY: 0, color: '#ffffff', blur: 8, fill: true, stroke: true,
                };
            }
            const lbl = this.add.text(x, y, answer.toString(), labelStyle).setOrigin(0.5).setDepth(depth + 100);
            obj.setData('label', lbl);
            this.answerObjectLabels.push(lbl);

            if (this.gameConfig.controls === 'tapToSelect') {
                obj.setInteractive();
                obj.on('pointerdown', () => {
                    if (this.sandboxActive || this.feedbackActive) return;
                    this.updateGameState();
                    this.logger.logEvent('answerObject_tapped', {
                        response: answer,
                        position: { x, y },
                        answerObjectIndex: i,
                        answerObjectSize: scale,
                        isCorrect: answer === this.currentQuestion.correctAnswer,
                    });
                    this.checkAnswer(obj);
                });
            }
        });

        return spawnData;
    }

    shootLaser() {
        if (this.sandboxActive || this.feedbackActive) return;
        const timeSinceLastShot = this.time.now - this.lastLaserShotTime;
        if (timeSinceLastShot < 1000) return;

        this.sound.play('lasershot');
        this.lastLaserShotTime = this.time.now;

        const laserGraphics = this.make.graphics({ x: 0, y: 0 });
        laserGraphics.fillStyle(0xff0000, 1);
        laserGraphics.fillRect(0, 0, 8, 32);
        const laserTextureKey = 'laser_red';
        laserGraphics.generateTexture(laserTextureKey, 8, 32);
        laserGraphics.destroy();

        const laserY = this.spaceship.y - this.spaceship.displayHeight / 2;
        const laserSprite = this.laserGroup.create(this.spaceship.x, laserY, laserTextureKey) as Phaser.Physics.Arcade.Image;
        laserSprite.setOrigin(0.5, 1);
        laserSprite.setDepth(300);

        this.updateGameState();
        this.logger.logEvent('space_pressed', {
            spaceshipPosition: { x: this.spaceship.x, y: this.spaceship.y },
            laserPosition: { x: this.spaceship.x, y: laserY },
            targetAnswer: null,
        });
    }

    laserHitAsteroid(laser: Phaser.Physics.Arcade.Image, asteroid: Phaser.Physics.Arcade.Image) {
        this.updateGameState();
        this.logger.logEvent('laser_hit', {
            laserPosition: { x: laser.x, y: laser.y },
            targetAnswer: asteroid.getData('answer'),
            targetPosition: { x: asteroid.x, y: asteroid.y },
            isCorrect: asteroid.getData('answer') === this.currentQuestion.correctAnswer,
        });
        this.checkAnswer(asteroid);
        laser.destroy();
    }

    createClippingBorder() {
        this.clippingBorder = this.add.graphics();
        this.clippingBorder.lineStyle(2, 0xffffff, 0.8);
        this.clippingBorder.lineBetween(this.gameAreaX, this.clippingBorderY, this.gameAreaX + this.gameAreaSize, this.clippingBorderY);
        this.clippingBorder.setDepth(1001);
    }

    updateAnswerObjectClipping() {
        this.answerObjects.getChildren().forEach((answerObj: Phaser.GameObjects.GameObject) => {
            const sprite = answerObj as Phaser.Physics.Arcade.Image;
            const label = sprite.getData('label') as Phaser.GameObjects.Text;
            const isHintedOut = this.hintActive && sprite.getData('answer') !== this.currentQuestion.correctAnswer;
            const hintAlphaCap = 0.3;

            const objTop = sprite.y - sprite.displayHeight / 2;
            const objBottom = sprite.y + sprite.displayHeight / 2;

            let visibleRatio = 1;
            if (this.theme.answerSpawnFromBottom) {
                const clipEdge = this.gameAreaY + 60;
                if (objTop < clipEdge) {
                    const clipped = clipEdge - objTop;
                    visibleRatio = Math.max(0, (sprite.displayHeight - clipped) / sprite.displayHeight);
                }
            } else {
                if (objBottom > this.clippingBorderY) {
                    const clipped = objBottom - this.clippingBorderY;
                    visibleRatio = Math.max(0, (sprite.displayHeight - clipped) / sprite.displayHeight);
                }
            }

            const alpha = isHintedOut ? Math.min(visibleRatio, hintAlphaCap) : visibleRatio;
            sprite.setAlpha(alpha);
            if (label) label.setAlpha(alpha);
        });
    }

    private pauseGameEntities() {
        this.timerPaused = true;
        this.pausedAsteroidVelocities = [];
        this.answerObjects.getChildren().forEach((asteroid: Phaser.GameObjects.GameObject) => {
            const sprite = asteroid as Phaser.Physics.Arcade.Image;
            if (sprite.body) {
                this.pausedAsteroidVelocities.push(sprite.body.velocity.y);
                sprite.setVelocityY(0);
            } else {
                this.pausedAsteroidVelocities.push(0);
            }
        });
    }

    private resumeGameEntities() {
        this.timerPaused = false;
        this.answerObjects.getChildren().forEach((asteroid: Phaser.GameObjects.GameObject, i: number) => {
            const sprite = asteroid as Phaser.Physics.Arcade.Image;
            if (sprite.body) sprite.setVelocityY(this.pausedAsteroidVelocities[i] || 0);
        });
        this.pausedAsteroidVelocities = [];
    }

    // Number line popup for step-by-step helper - "Counting On" method
    private openNumberLinePopup() {
        this.sandboxActive = true;
        this.powertoolActive = true;
        this.pauseGameEntities();

        const popupWidth = Math.min(this.gameAreaSize * 0.8, 500);
        const popupHeight = Math.min(this.gameAreaHeight * 0.6, 300);
        const popupX = this.gameAreaX + (this.gameAreaSize - popupWidth) / 2;
        const popupY = this.gameAreaY + (this.gameAreaHeight - popupHeight) / 2;

        const bg = this.add.graphics({ x: popupX, y: popupY }).setDepth(2000);
        bg.fillStyle(0xffffff, 0.92);
        bg.fillRoundedRect(0, 0, popupWidth, popupHeight, 24);
        bg.lineStyle(2, 0xcccccc, 1);
        bg.strokeRoundedRect(0, 0, popupWidth, popupHeight, 24);

        this.sandboxPopup = this.add.container(0, 0).setDepth(2001);
        this.sandboxPopup.add(bg);

        const closeBtn = this.add.text(popupX + popupWidth - 32, popupY + 16, '✕', {
            font: '32px Arial', color: '#222', backgroundColor: '#fff',
            padding: { left: 8, right: 8, top: 2, bottom: 2 },
        }).setOrigin(0.5, 0).setInteractive().setDepth(2002);
        closeBtn.on('pointerdown', () => {
            this.updateGameState();
            this.logger.logEvent('popup_close_clicked', {
                popupType: 'sandbox',
                questionId: `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}`,
                questionNumber: this.correctCount + this.incorrectCount,
                fromFeedback: this.powerupFromFeedback,
            });
            this.closeNumberLinePopup();
        });
        this.sandboxPopup.add(closeBtn);

        let title = this.add.text(popupX + popupWidth / 2, popupY + 30, "Let's count!", {
            font: '24px Arial', color: '#222',
        }).setOrigin(0.5).setDepth(2003);
        this.sandboxPopup.add(title);

        let firstAddend = 0, secondAddend = 0;
        const additionMatch = this.currentQuestion?.question.match(/(\d+)\s*\+\s*(\d+)/);
        const subtractionMatch = this.currentQuestion?.question.match(/(\d+)\s*-\s*(\d+)/);

        if (additionMatch) {
            firstAddend = parseInt(additionMatch[1], 10);
            secondAddend = parseInt(additionMatch[2], 10);
            title.text = "Let's count on from " + firstAddend + "!";
        } else if (subtractionMatch) {
            firstAddend = parseInt(subtractionMatch[1], 10);
            secondAddend = parseInt(subtractionMatch[2], 10);
            title.text = "Let's count down from " + firstAddend + "!";
        } else {
            firstAddend = Math.max(0, Math.min(this.currentQuestion.correctAnswer, 10));
            secondAddend = this.currentQuestion.correctAnswer - firstAddend;
        }

        const sum = this.currentQuestion.correctAnswer;

        const minValue = Math.min(firstAddend, sum);
        const maxValue = Math.max(firstAddend, sum);
        const leftEnd = Math.max(0, Math.floor(minValue / 10) * 10);
        const rightEnd = Math.ceil(maxValue / 10) * 10;

        const tensCount = Math.floor(secondAddend / 10);
        const unitsCount = secondAddend % 10;

        const pad = 48;
        const lineX1 = popupX + pad;
        const lineX2 = popupX + popupWidth - pad;
        const lineY = popupY + popupHeight * 0.6;

        const lineLength = lineX2 - lineX1;
        const range = rightEnd - leftEnd;
        const toX = (val: number) => lineX1 + ((val - leftEnd) / range) * lineLength;

        const g = this.add.graphics().setDepth(2003);
        if (this.sandboxPopup) {
            this.sandboxPopup.add(g);
        }

        g.lineStyle(3, 0x222222, 1);
        g.beginPath();
        g.moveTo(lineX1, lineY);
        g.lineTo(lineX2, lineY);
        g.strokePath();

        for (let val = leftEnd; val <= rightEnd; val += 10) {
            const x = toX(val);
            g.lineStyle(2, 0x222222, 1);
            g.beginPath();
            g.moveTo(x, lineY - 8);
            g.lineTo(x, lineY + 8);
            g.strokePath();

            const lbl = this.add.text(x, lineY + 14, val.toString(), {
                font: '16px Arial', color: '#222',
            }).setOrigin(0.5, 0);
            this.sandboxPopup.add(lbl);
        }

        const startX = toX(firstAddend);
        const startDot = this.add.circle(startX, lineY, 6, 0x2d89ff).setDepth(2003);
        this.sandboxPopup.add(startDot);
        const startLabel = this.add.text(startX, lineY - 25, firstAddend.toString(), {
            font: '22px Arial', color: '#222',
        }).setOrigin(0.5).setDepth(2003);
        this.sandboxPopup.add(startLabel);

        const arrow = this.add.graphics().setDepth(2004);
        if (this.sandboxPopup) {
            this.sandboxPopup.add(arrow);
        }

        let previousStepDot: Phaser.GameObjects.Arc | null = null;
        let previousStepLabel: Phaser.GameObjects.Text | null = null;

        const drawJump = (from: number, by: number, color: number, label: string) => {
            if (previousStepDot) { previousStepDot.destroy(); previousStepDot = null; }
            if (previousStepLabel) { previousStepLabel.destroy(); previousStepLabel = null; }

            const newVal = from + by;
            const sX = toX(from);
            const endX = toX(newVal);
            const midX = (sX + endX) / 2;
            const height = by === 1 || by === -1 ? 20 : 40;

            arrow.lineStyle(3, color, 1);
            const curve = new Phaser.Curves.QuadraticBezier(
                new Phaser.Math.Vector2(sX, lineY),
                new Phaser.Math.Vector2(midX, lineY - height),
                new Phaser.Math.Vector2(endX, lineY)
            );
            const pts = curve.getPoints(24);
            arrow.beginPath();
            arrow.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                arrow.lineTo(pts[i].x, pts[i].y);
            }
            arrow.strokePath();

            const stepX = toX(newVal);
            const stepDot = this.add.circle(stepX, lineY, 5, 0x222222).setDepth(2003);
            this.sandboxPopup.add(stepDot);
            const stepLabel = this.add.text(stepX, lineY + 14, newVal.toString(), {
                font: '18px Arial', color: '#222',
            }).setOrigin(0.5, 0).setDepth(2003);
            this.sandboxPopup.add(stepLabel);
            previousStepDot = stepDot;
            previousStepLabel = stepLabel;

            if (label) {
                const lblObj = this.add.text(midX, lineY - 40, label, {
                    font: '16px Arial', color: '#222', backgroundColor: '#ffffffaa',
                    padding: { left: 4, right: 4, top: 2, bottom: 2 },
                }).setOrigin(0.5).setDepth(2004);
                if (this.sandboxPopup) this.sandboxPopup.add(lblObj);
                const fadeTimer = this.time.delayedCall(500, () => {
                    if (lblObj) {
                        this.tweens.add({
                            targets: lblObj,
                            alpha: 0,
                            duration: 300,
                            onComplete: () => { lblObj.destroy(); },
                        });
                    }
                });
                this.numberLineAnimationTimers.push(fadeTimer);
            }
        };

        if (subtractionMatch) {
            const tensToSubtract = Math.floor(secondAddend / 10);
            const unitsToSubtract = secondAddend % 10;
            let animationDelay = 0;
            let currentPos = firstAddend;

            for (let i = 0; i < tensToSubtract; i++) {
                const jumpStart = currentPos;
                const tensTimer = this.time.delayedCall(animationDelay, () => {
                    if (this.sandboxPopup) {
                        drawJump(jumpStart, -10, 0x2d89ff, '-' + (10 + (i * 10)));
                    }
                });
                this.numberLineAnimationTimers.push(tensTimer);
                currentPos -= 10;
                animationDelay += 1200;
            }

            for (let i = 0; i < unitsToSubtract; i++) {
                const jumpStart = currentPos - i;
                const unitTimer = this.time.delayedCall(animationDelay, () => {
                    if (this.sandboxPopup) {
                        drawJump(jumpStart, -1, 0xff4444, '-' + (1 + i));
                    }
                });
                this.numberLineAnimationTimers.push(unitTimer);
                animationDelay += 900;
            }

            const finalMarkerTimer = this.time.delayedCall(animationDelay + 400, () => {
                if (!this.sandboxPopup) return;
                if (previousStepDot) { previousStepDot.destroy(); previousStepDot = null; }
                if (previousStepLabel) { previousStepLabel.destroy(); previousStepLabel = null; }
                const endDot = this.add.circle(toX(sum), lineY, 6, 0x00aa66).setDepth(2003);
                this.sandboxPopup.add(endDot);
                const endLabel = this.add.text(toX(sum), lineY - 25, sum.toString(), {
                    font: '22px Arial', color: '#222',
                }).setOrigin(0.5).setDepth(2003);
                this.sandboxPopup.add(endLabel);
            });
            this.numberLineAnimationTimers.push(finalMarkerTimer);
        } else {
            let animationDelay = 0;

            for (let i = 0; i < tensCount; i++) {
                const jumpStart = firstAddend + (i * 10);
                const tensTimer = this.time.delayedCall(animationDelay, () => {
                    if (this.sandboxPopup) {
                        drawJump(jumpStart, 10, 0x2d89ff, '+' + (10 + (i * 10)));
                    }
                });
                this.numberLineAnimationTimers.push(tensTimer);
                animationDelay += 1200;
            }

            for (let i = 0; i < unitsCount; i++) {
                const jumpStart = firstAddend + (tensCount * 10) + i;
                const unitTimer = this.time.delayedCall(animationDelay, () => {
                    if (this.sandboxPopup) {
                        drawJump(jumpStart, 1, 0xff4444, '+' + (1 + (i * 1)));
                    }
                });
                this.numberLineAnimationTimers.push(unitTimer);
                animationDelay += 900;
            }

            const finalMarkerTimer = this.time.delayedCall(animationDelay + 400, () => {
                if (!this.sandboxPopup) return;
                if (previousStepDot) { previousStepDot.destroy(); previousStepDot = null; }
                if (previousStepLabel) { previousStepLabel.destroy(); previousStepLabel = null; }
                const endDot = this.add.circle(toX(sum), lineY, 6, 0x00aa66).setDepth(2003);
                this.sandboxPopup.add(endDot);
                const endLabel = this.add.text(toX(sum), lineY - 25, sum.toString(), {
                    font: '22px Arial', color: '#222',
                }).setOrigin(0.5).setDepth(2003);
                this.sandboxPopup.add(endLabel);
            });
            this.numberLineAnimationTimers.push(finalMarkerTimer);
        }
    }

    private closeNumberLinePopup() {
        for (const timer of this.numberLineAnimationTimers) {
            if (timer) timer.destroy();
        }
        this.numberLineAnimationTimers = [];

        this.sandboxActive = false;
        this.powertoolActive = false;
        this.resumeGameEntities();

        if (this.sandboxPopup) {
            this.sandboxPopup.destroy();
            this.sandboxPopup = undefined;
        }

        if (this.powerupFromFeedback) {
            this.powerupFromFeedback = false;
            if (this.lives === 0) {
                this.endGame('lives_lost');
            } else {
                this.showNextQuestion();
            }
        }
    }

    shutdown() {
        if (this.input.keyboard) {
            this.input.keyboard.off('keydown-LEFT');
            this.input.keyboard.off('keyup-LEFT');
            this.input.keyboard.off('keydown-RIGHT');
            this.input.keyboard.off('keyup-RIGHT');
            this.input.keyboard.off('keydown-SPACE');
            this.input.keyboard.off('keyup-SPACE');
            this.input.keyboard.removeAllKeys(false);
        }

        for (const timer of this.numberLineAnimationTimers) {
            if (timer) timer.destroy();
        }
        this.numberLineAnimationTimers = [];

        if (this.sandboxPopup) {
            this.sandboxPopup.destroy();
        }
        if (this.feedbackPopup) {
            this.feedbackPopup.destroy();
        }

        super.shutdown();
    }
}
