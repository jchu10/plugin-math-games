import * as Phaser from 'phaser';
import { MathQuestionService } from './mathquestions';
import { MathQuestion, Response, GameConfig, LogEvent, QuestionDifficulty } from './types';
import { getLogger, GameState, resetLogger } from './GameLogger';

import { drawRoundedRect, drawStar } from './uiUtils';

export class GameScene extends Phaser.Scene {
    private gameConfig!: GameConfig;
    private questionService!: MathQuestionService;
    private currentQuestion!: MathQuestion;
    private lastAnswerCorrect: boolean = false;
    private appStartTS: number = 0;

    // Phaser objects ----
    private logger!: ReturnType<typeof getLogger>;
    private gameStartTime: number = 0;
    private questionStartTime: number = 0;
    private questionsWithHints: string[] = [];
    private currentStreak: number = 0;
    private longestStreak: number = 0;
    private questionsShown: number = 0;
    private incorrectCount: number = 0;

    // private questionBorder!: Phaser.GameObjects.Graphics;
    private answerObjects!: Phaser.Physics.Arcade.Group;
    private answerObjectLabels: Phaser.GameObjects.Text[] = [];
    private gameOver: boolean = false;
    private transitioning: boolean = false;
    private lastTimerUpdate?: number;

    private lives: number = 3;
    private timer: number = 120;

    private timerText!: Phaser.GameObjects.Text;
    private questionText!: Phaser.GameObjects.Text;
    private heartIcons: Phaser.GameObjects.Image[] = [];
    private whiteBar!: Phaser.GameObjects.Graphics;
    private bottomWhiteBar!: Phaser.GameObjects.Graphics;
    private asteroidLabels: Phaser.GameObjects.Text[] = [];
    private spaceship!: Phaser.GameObjects.Image;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private laserGroup!: Phaser.Physics.Arcade.Group;

    // Movement (for arrow key games)
    private shipVel = 0;
    private shipMaxSpeed = 900;
    private shipAccel = 2400;
    private shipDecel = 3000;
    private lastLaserShotTime = 0;

    // Power-up hint (for games 1-4)
    private hintIcon!: Phaser.GameObjects.Image;
    private hintUses: number = 0;
    private maxHints: number = 3;
    private hintActive: boolean = false;
    private hintUsedThisQuestion: boolean = false;

    // Power tool hint (for games 5-8)
    private powertoolIcon!: Phaser.GameObjects.Image;
    private powertoolUses: number = 0;
    private maxPowertool: number = 3;
    private powertoolActive: boolean = false;
    private sandboxPopup?: Phaser.GameObjects.Container;
    private sandboxActive: boolean = false;
    private pausedAsteroidVelocities: number[] = [];
    private timerPaused: boolean = false;
    private powertoolUsedThisQuestion: boolean = false;

    // Feedback popup (for games 2,4,6,8)
    private feedbackPopup?: Phaser.GameObjects.Container;
    private feedbackActive: boolean = false;
    private powerupFromFeedback: boolean = false;

    // Adaptive difficulty state
    private correctCount = 0;
    private seenQuestions: Map<QuestionDifficulty, Set<string>> = new Map();
    private progressContainer!: Phaser.GameObjects.Container;
    private currentGem!: Phaser.GameObjects.Graphics;
    private clippingBorder!: Phaser.GameObjects.Graphics;
    private clippingBorderY: number = 0;
    private progressHeight = 0;
    private progressBarWidth = 12;
    private questionStars: Phaser.GameObjects.Graphics[] = [];

    // Rectangle game area properties
    private gameAreaSize!: number;
    private gameAreaHeight!: number;
    private gameAreaX!: number;
    private gameAreaY!: number;

    // UI element references for resize handling
    private backgroundImage!: Phaser.GameObjects.Image;
    private gameAreaBorder!: Phaser.GameObjects.Graphics;
    private whiteBackground!: Phaser.GameObjects.Graphics;
    private endBtn!: Phaser.GameObjects.Text;
    private baseFontSize: number = 32;
    private baseBarHeight: number = 110;
    private baseBottomBarHeight: number = 130;
    private optionLabelColor: string = "#000000";
    private optionLabelStroke: string = "#ffffff";

    // Key press tracking for event-based logging
    private keyDownTimes: Map<string, number> = new Map();

    constructor() {
        super('GameScene');
    }

    // The 'init' method receives data passed from 'scene.start'
    public init(data: GameConfig) {
        this.gameConfig = data;
        // Reset and initialize logger with callback from gameConfig
        resetLogger();
        this.logger = getLogger(this.gameConfig?.emitDataCallback);
    }
    // private restartGame() {
    //     console.log('Restarting game...');
    //     // Clear history and reset timestamp
    //     this.appStartTS = Date.now();
    //     this.scene.restart(this.gameConfig);
    //     // get a new logger
    //     this.logger = getLogger(this.data_site);
    // }

    private calculateGameArea() {
        // Game area includes the bottom bar within it
        this.gameAreaHeight = Math.floor(this.scale.height - 10);
        this.gameAreaSize = Math.floor(this.gameAreaHeight * 1.5);
        this.gameAreaX = (this.scale.width - this.gameAreaSize) / 2;
        this.gameAreaY = (this.scale.height - this.gameAreaHeight) / 2;
    }

    private handleResize() {
        // Recalculate game area
        this.calculateGameArea();

        // Update white background
        if (this.whiteBackground) {
            this.whiteBackground.clear();
            this.whiteBackground.fillStyle(0xffffff, 1);
            this.whiteBackground.fillRect(0, 0, this.scale.width, this.scale.height);
        }

        // Update background image
        if (this.backgroundImage) {
            this.backgroundImage.setPosition(this.gameAreaX + this.gameAreaSize / 2, this.gameAreaY + this.gameAreaHeight / 2);
            this.backgroundImage.setDisplaySize(this.gameAreaSize, this.gameAreaHeight);
        }

        // Update border
        if (this.gameAreaBorder) {
            this.gameAreaBorder.clear();
            this.gameAreaBorder.lineStyle(4, 0x000000, 1);
            this.gameAreaBorder.strokeRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, this.gameAreaHeight);
        }

        // Calculate scale factor based on height
        const scaleFactor = this.scale.height / 1080; // Assuming base height of 1080

        // Update white bar
        const barHeight = Math.floor(this.baseBarHeight * scaleFactor);
        if (this.whiteBar) {
            this.whiteBar.clear();
            this.whiteBar.fillStyle(0xffffff, 1);
            this.whiteBar.fillRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, barHeight);
        }

        // Update bottom white bar (within game area, at the bottom)
        const bottomBarHeightResize = Math.floor(this.baseBottomBarHeight * scaleFactor);
        const bottomBarYResize = this.gameAreaY + this.gameAreaHeight - bottomBarHeightResize;
        if (this.bottomWhiteBar) {
            this.bottomWhiteBar.clear();
            this.bottomWhiteBar.fillStyle(0xffffff, 1);
            this.bottomWhiteBar.fillRect(this.gameAreaX, bottomBarYResize, this.gameAreaSize, bottomBarHeightResize);
        }

        // Update clipping border (above bottom bar, within game area)
        this.clippingBorderY = bottomBarYResize;
        if (this.clippingBorder) {
            this.createClippingBorder();
        }
        // Update hearts
        const heartSize = Math.round(barHeight * 0.65 * 1.05);
        const heartY = this.gameAreaY + barHeight + Math.floor(24 * scaleFactor);
        const heartXStart = this.gameAreaX + Math.floor(30 * scaleFactor);
        this.heartIcons.forEach((heart, i) => {
            heart.setPosition(heartXStart + i * (heartSize + Math.floor(10 * scaleFactor)), heartY);
            heart.setDisplaySize(heartSize, heartSize);
        });

        // Update timer text
        if (this.gameConfig.show_timer && this.timerText) {
            const timerFontSize = Math.floor(28 * scaleFactor);
            this.timerText.setPosition(this.gameAreaX + this.gameAreaSize - Math.floor(30 * scaleFactor), this.gameAreaY + barHeight / 2);
            this.timerText.setStyle({ fontSize: `${timerFontSize}px` });
        }

        // Update question text
        if (this.questionText) {
            const questionFontSize = Math.floor(this.baseFontSize * scaleFactor);
            this.questionText.setPosition(this.gameAreaX + this.gameAreaSize / 2, this.gameAreaY + barHeight / 2);
            this.questionText.setStyle({ fontSize: `${questionFontSize}px` });
        }

        // Update end game button
        if (this.endBtn) {
            const btnFontSize = Math.floor(22 * scaleFactor);
            this.endBtn.setPosition(this.gameAreaX + Math.floor(30 * scaleFactor), this.gameAreaY + barHeight / 2);
            this.endBtn.setStyle({ fontSize: `${btnFontSize}px` });
        }

        // Update hint/power tool icons (positioned in bottom bar)
        const iconScale = 0.45 * scaleFactor;
        if (this.gameConfig.hint_type === 'powerup' && this.hintIcon) {
            this.hintIcon.setPosition(this.gameAreaX + Math.floor(20 * scaleFactor), bottomBarYResize + bottomBarHeightResize - Math.floor(20 * scaleFactor));
            this.hintIcon.setScale(iconScale);
        } else if (this.gameConfig.hint_type === 'stepByStep' && this.powertoolIcon) {
            this.powertoolIcon.setPosition(this.gameAreaX + Math.floor(20 * scaleFactor), bottomBarYResize + bottomBarHeightResize - Math.floor(20 * scaleFactor));
            this.powertoolIcon.setScale(iconScale);
        }

        // Update spaceship (positioned in bottom bar, layered above white bar)
        if (this.spaceship) {
            this.spaceship.setPosition(this.gameAreaX + this.gameAreaSize / 2, bottomBarYResize + bottomBarHeightResize - Math.floor(5 * scaleFactor));
            const spaceshipScale = 0.192 * scaleFactor;
            this.spaceship.setScale(spaceshipScale);
            this.spaceship.setDepth(1001);
        }

        // Update progress bar
        if (this.progressContainer) {
            const topOfBar = heartY + heartSize + Math.floor(30 * scaleFactor);
            const bottomOfBar = bottomBarYResize - Math.floor(20 * scaleFactor);
            const progressX = this.gameAreaX + Math.floor(75 * scaleFactor);
            this.progressContainer.destroy();
            this.drawProgressContainer(progressX, topOfBar, bottomOfBar);
        }
    }

    preload() {
        this.load.setPath('assets');
        this.load.image('cube', 'cube.png');
        this.load.image('fullheart', 'fullheart.png');
        this.load.image('Sound', 'Sound.png');
        this.load.image('powerup', 'powerup.png');
        this.load.image('powertool', 'powertool.png');

        if (this.gameConfig.cover_story === 'MoonMissionGame') {
            this.optionLabelColor = "#fff";
            this.optionLabelStroke = "#000";
            this.load.image('game_bg_img', 'starrynight.png');
            this.load.image('spaceship', 'spaceship.png');
            this.load.image('answerObject1', 'asteroid1.png');
            this.load.image('answerObject2', 'asteroid2.png');
            this.load.image('answerObject3', 'asteroid3.png');
            if (this.gameConfig.feedback_type === 'explosion') {
                // this.load.audio('explosion', 'explosion.mp3');
                this.load.audio('explosion1', 'explosion.wav');
            }

            if (this.gameConfig.controls === 'arrowKeys') {
                this.load.audio('lasershot', 'lasershot.wav');
            }
        } else if (this.gameConfig.cover_story === 'HomeworkHelperGame') {
            this.load.image('game_bg_img', 'classroom.png');
            this.load.image('answerObject1', 'thoughtbubble.png');
            this.load.image('answerObject2', 'thoughtbubble2.png');
            this.load.image('answerObject3', 'thoughtbubble3.png');
            this.load.image('spaceship', 'pencil.png');
            this.load.audio('explosion1', 'bubblepop.flac');
            this.load.audio('lasershot', 'lasershot.wav');
        }
        // Show background
        this.add.image(512, 384, 'background');

        // Progress bar outline
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
        // Progress bar fill
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        // Listen for progress event
        this.load.on('progress', (progress: number) => {
            bar.width = 4 + (460 * progress);
        });
    }

    update(time: number, delta: number) {
        if (this.sandboxActive || this.timerPaused) return;

        // Timer countdown
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
                    this.gameOver = true;

                    // Log game over
                    const totalTime = Date.now() - this.gameStartTime;
                    const avgTimePerQuestion = (this.correctCount + this.incorrectCount) > 0
                        ? totalTime / (this.correctCount + this.incorrectCount)
                        : 0;

                    this.updateGameState();
                    this.logger.logEvent('game_over', {
                        reason: 'time_up',
                        questionsShown: this.questionsShown,
                        questionsAnswered: this.correctCount + this.incorrectCount,
                        correctCount: this.correctCount,
                        incorrectCount: this.incorrectCount,
                        totalHintsUsed: this.hintUses,
                        totalTime: totalTime,
                        averageTimePerQuestion: avgTimePerQuestion
                    });
                    this.logger.cleanup();

                    // Show time's up message
                    this.showTimesUpMessage();
                    this.triggerGameOverTransition();
                }
            }
        }

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
                // Resume entities before checking game over or showing next question
                // This ensures specific pausing logic (like hints) doesn't permanentzly freeze things if we were using it
                // But specifically for this block, we are just clearing objects.

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
                // Check if game should end (no lives left)
                if (this.lives === 0) {
                    // Log game over
                    const totalTime = Date.now() - this.gameStartTime;
                    const avgTimePerQuestion = (this.correctCount + this.incorrectCount) > 0
                        ? totalTime / (this.correctCount + this.incorrectCount)
                        : 0;

                    this.updateGameState();
                    this.logger.logEvent('game_over', {
                        reason: 'lives_lost',
                        questionsShown: this.questionsShown,
                        questionsAnswered: this.correctCount + this.incorrectCount,
                        correctCount: this.correctCount,
                        incorrectCount: this.incorrectCount,
                        totalHintsUsed: this.hintUses,
                        totalTime: totalTime,
                        averageTimePerQuestion: avgTimePerQuestion
                    });
                    this.logger.cleanup();
                    this.triggerGameOverTransition();
                } else {
                    this.showNextQuestion();
                }
            }
        }

        // Ship movement (only for arrow key controls)
        if (this.gameConfig.controls === 'arrowKeys') {
            const dt = delta / 1000;
            let dir = 0;
            let keyPressed: string | null = null;
            if (this.cursors.left?.isDown) {
                dir -= 1;
                keyPressed = 'left';
            }
            if (this.cursors.right?.isDown) {
                dir += 1;
                keyPressed = 'right';
            }

            if (dir !== 0) {
                this.shipVel += dir * this.shipAccel * dt;
                this.shipVel = Phaser.Math.Clamp(this.shipVel, -this.shipMaxSpeed, this.shipMaxSpeed);
            } else {
                if (this.shipVel > 0) this.shipVel = Math.max(0, this.shipVel - this.shipDecel * dt);
                else if (this.shipVel < 0) this.shipVel = Math.min(0, this.shipVel + this.shipDecel * dt);
            }

            this.spaceship.x += this.shipVel * dt;
            this.spaceship.x = Phaser.Math.Clamp(this.spaceship.x, this.gameAreaX + 40, this.gameAreaX + this.gameAreaSize - 40);

            // Laser movement
            const whiteBarBottom = this.gameAreaY + 85;
            this.laserGroup.getChildren().forEach((laser: Phaser.GameObjects.GameObject) => {
                const laserSprite = laser as Phaser.Physics.Arcade.Image;
                laserSprite.y -= 8;

                this.physics.overlap(laserSprite, this.answerObjects, (_laserObj, asteroidObj) => {
                    const asteroid = asteroidObj as Phaser.Physics.Arcade.Image;
                    this.laserHitAsteroid(laserSprite, asteroid);
                });

                // Destroy laser if it goes above the white bar
                if (laserSprite.y < whiteBarBottom) {
                    laserSprite.destroy();
                }
            });
        }
    }

    loseLife() {
        if (this.lives > 0) {
            this.lives -= 1;
            if (this.heartIcons[this.lives]) {
                this.heartIcons[this.lives].setVisible(false);
            }
            if (this.lives === 0) {
                // Don't immediately go to game over - let feedback show first
                // The game over will be triggered after feedback delay
            }
        }
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
            }
        });
    }

    checkAnswer(asteroid: Phaser.Physics.Arcade.Image) {
        if (this.feedbackActive || this.gameOver) return;

        const selected = asteroid.getData('answer');
        const isCorrect = selected === this.currentQuestion.correctAnswer;
        this.lastAnswerCorrect = isCorrect;

        const timeToAnswer = Date.now() - this.questionStartTime;
        const questionId = `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}`;

        // Parse a + b from the question string
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

        // Log answer submission
        this.updateGameState();
        this.logger.logEvent('end_question', {
            questionId: questionId,
            questionNumber: this.correctCount + this.incorrectCount,
            responseOptions: this.currentQuestion.options,
            correctAnswer: this.currentQuestion.correctAnswer,
            response: selected,
            rt: timeToAnswer,
            responseIsCorrect: isCorrect,
            hintUsed: this.hintUsedThisQuestion || false,
        });

        // Log life lost if incorrect
        if (!isCorrect && this.lives > 0) {
            this.updateGameState();
            this.logger.logEvent('life_lost', {
                reason: 'wrong_answer',
                questionId: questionId,
                questionNumber: this.correctCount + this.incorrectCount,
                remainingLives: this.lives
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

        // Handle feedback
        if (this.gameConfig.feedback_type === 'explosion') {
            this.explodeAsteroid(asteroid);
            this.clearAnswerObjects();
            this.time.delayedCall(isCorrect ? 500 : 0, () => {
                // Check if game should end (no lives left)
                if (this.lives === 0) {
                    // Log game over
                    const totalTime = Date.now() - this.gameStartTime;
                    const avgTimePerQuestion = (this.correctCount + this.incorrectCount) > 0
                        ? totalTime / (this.correctCount + this.incorrectCount)
                        : 0;

                    this.updateGameState();
                    this.logger.logEvent('game_over', {
                        reason: 'lives_lost',
                        questionsShown: this.questionsShown,
                        questionsAnswered: this.correctCount + this.incorrectCount,
                        correctCount: this.correctCount,
                        incorrectCount: this.incorrectCount,
                        totalHintsUsed: this.hintUses,
                        totalTime: totalTime,
                        averageTimePerQuestion: avgTimePerQuestion
                    });
                    this.logger.cleanup();

                    this.triggerGameOverTransition();
                } else {
                    this.showNextQuestion();
                }
            });
        } else {
            // Explanation feedback - show popup with view solution button
            this.showFeedbackPopup(isCorrect, a, b, this.currentQuestion.correctAnswer);
        }
    }

    /**
     * Triggers the delayed transition to the GameOver scene.
     */
    private triggerGameOverTransition() {
        this.time.delayedCall(1000, () => {
            this.game.events.emit('GameOver');
            this.scene.start('GameOver', this.gameConfig);
        });
    }

    private showTimesUpMessage() {
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
            font: '32px Arial',
            color: '#b00020',
            align: 'center'
        }).setOrigin(0.5).setDepth(3001);
        this.feedbackPopup.add(titleText);
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

        // Title (Correct! or Incorrect!)
        const title = isCorrect ? 'Correct!' : 'Incorrect!';
        const titleText = this.add.text(popupX + popupWidth / 2, popupY + 40, title, {
            font: '32px Arial',
            color: isCorrect ? '#0a8f3a' : '#b00020',
            align: 'center'
        }).setOrigin(0.5).setDepth(3001);
        this.feedbackPopup.add(titleText);

        // Solution text - centered
        const solutionText = this.add.text(popupX + popupWidth / 2, popupY + 90, 'Solution:', {
            font: '24px Arial',
            color: '#333333',
            align: 'center'
        }).setOrigin(0.5, 0.5).setDepth(3001);
        this.feedbackPopup.add(solutionText);

        // Parse the question to determine if it's addition or subtraction
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
            font: '24px Arial',
            color: '#333333',
            align: 'center'
        }).setOrigin(0.5, 0.5).setDepth(3001);
        this.feedbackPopup.add(equationText);

        // View solution button (for all explanation feedback games)
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
                font: '20px Arial',
                color: '#333333',
                align: 'center'
            }).setOrigin(0.5).setDepth(3002);
            this.feedbackPopup.add(viewSolutionText);

            viewSolutionBtn.on('pointerdown', () => {
                this.feedbackPopup?.destroy();
                this.feedbackPopup = undefined;
                this.feedbackActive = false;
                this.resumeGameEntities(); // Restore state before switching
                this.powerupFromFeedback = true;
                this.openNumberLinePopup();
            });
        }

        // Next button
        const nextBtn = this.add.graphics({ x: popupX + popupWidth / 2, y: popupY + popupHeight - 40 });
        nextBtn.fillStyle(0x87ceeb, 1);
        nextBtn.fillRoundedRect(-40, -15, 80, 30, 8);
        nextBtn.lineStyle(1, 0xcccccc, 1);
        nextBtn.strokeRoundedRect(-40, -15, 80, 30, 8);
        nextBtn.setInteractive(new Phaser.Geom.Rectangle(-40, -15, 80, 30), Phaser.Geom.Rectangle.Contains);
        nextBtn.setDepth(3001);
        this.feedbackPopup.add(nextBtn);

        const nextText = this.add.text(popupX + popupWidth / 2, popupY + popupHeight - 40, 'Next', {
            font: '18px Arial',
            color: '#333333',
            align: 'center'
        }).setOrigin(0.5).setDepth(3002);
        this.feedbackPopup.add(nextText);

        nextBtn.on('pointerdown', () => {
            this.feedbackPopup?.destroy();
            this.feedbackPopup = undefined;
            this.feedbackActive = false;
            this.resumeGameEntities();
            // Check if game should end (no lives left)
            if (this.lives === 0) {
                // Log game over
                const totalTime = Date.now() - this.gameStartTime;
                const avgTimePerQuestion = (this.correctCount + this.incorrectCount) > 0
                    ? totalTime / (this.correctCount + this.incorrectCount)
                    : 0;

                this.updateGameState();
                this.logger.logEvent('game_over', {
                    reason: 'lives_lost',
                    questionsShown: this.questionsShown,
                    questionsAnswered: this.correctCount + this.incorrectCount,
                    correctCount: this.correctCount,
                    incorrectCount: this.incorrectCount,
                    totalHintsUsed: this.hintUses,
                    totalTime: totalTime,
                    averageTimePerQuestion: avgTimePerQuestion
                });
                this.logger.cleanup();
                this.triggerGameOverTransition();
            } else {
                this.showNextQuestion();
            }
        });
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
                }
            });
        });
    }

    create() {
        // Ensure progress bar is recreated each time
        if (this.progressContainer) {
            this.progressContainer.destroy();
            this.progressContainer = undefined;
        }
        this.questionService = new MathQuestionService();
        // Reset state
        this.correctCount = 0;
        this.lives = 3;
        this.timer = this.gameConfig.time_limit || 120; // default to 2 minutes
        this.gameOver = false;
        this.transitioning = false;
        this.lastTimerUpdate = 0;
        this.shipVel = 0;
        this.hintUses = 0;
        this.hintUsedThisQuestion = false;
        this.hintActive = false;
        this.powertoolUses = 0;
        this.powertoolUsedThisQuestion = false;
        this.powertoolActive = false;
        this.powerupFromFeedback = false;
        this.seenQuestions.clear();
        this.questionsWithHints = [];
        this.currentStreak = 0;
        this.longestStreak = 0;
        this.questionsShown = 0;
        this.incorrectCount = 0;

        // Initialize game start time
        this.gameStartTime = Date.now(); // Record start time for elapsed/duration calculations

        // ---- Game Screen layout ----
        this.calculateGameArea();

        // White background
        this.whiteBackground = this.add.graphics();
        this.whiteBackground.fillStyle(0xffffff, 1);
        this.whiteBackground.fillRect(0, 0, this.scale.width, this.scale.height);
        this.whiteBackground.setDepth(0);

        // Background image
        this.backgroundImage = this.add.image(this.gameAreaX + this.gameAreaSize / 2, this.gameAreaY + this.gameAreaHeight / 2, 'game_bg_img')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(this.gameAreaSize, this.gameAreaHeight)
            .setDepth(1);

        // Black border around game area
        this.gameAreaBorder = this.add.graphics();
        this.gameAreaBorder.lineStyle(4, 0x000000, 1);
        this.gameAreaBorder.strokeRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, this.gameAreaHeight);
        this.gameAreaBorder.setDepth(100);

        // Calculate scale factor for responsive sizing
        const scaleFactor = this.scale.height / 1080;

        // White bar at top
        const barHeight = Math.floor(this.baseBarHeight * scaleFactor);
        this.whiteBar = this.add.graphics();
        this.whiteBar.fillStyle(0xffffff, 1);
        this.whiteBar.fillRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, barHeight);
        this.whiteBar.setDepth(1000);

        // Bottom white bar (within game area, at the bottom)
        const bottomBarHeight = Math.floor(this.baseBottomBarHeight * scaleFactor);
        const bottomBarY = this.gameAreaY + this.gameAreaHeight - bottomBarHeight;
        this.bottomWhiteBar = this.add.graphics();
        this.bottomWhiteBar.fillStyle(0xffffff, 1);
        this.bottomWhiteBar.fillRect(this.gameAreaX, bottomBarY, this.gameAreaSize, bottomBarHeight);
        this.bottomWhiteBar.setDepth(1000);


        // Create clipping border (above bottom bar, within game area)
        this.clippingBorderY = bottomBarY;
        this.createClippingBorder();

        // ---- game elements ----
        // Hearts
        this.heartIcons = [];
        const heartSize = Math.round(barHeight * 0.65 * 1.05);
        const heartY = this.gameAreaY + barHeight + 24;
        const heartXStart = this.gameAreaX + 30;
        for (let i = 0; i < 3; i++) {
            const heart = this.add.image(heartXStart + i * (heartSize + 10), heartY, 'fullheart')
                .setOrigin(0, 0)
                .setDisplaySize(heartSize, heartSize)
                .setDepth(1001);
            this.heartIcons.push(heart);
        }

        // End Game button
        this.endBtn = this.add.text(this.gameAreaX + 30, this.gameAreaY + barHeight / 2, 'End Game', {
            font: '22px Arial', color: '#ffffff', backgroundColor: '#2d3a4a',
            padding: { left: 16, right: 16, top: 8, bottom: 8 }
        }).setOrigin(0, 0.5).setDepth(1002).setInteractive();
        this.endBtn.on('pointerdown', () => {
            if (this.sandboxActive || this.feedbackActive) return;
            const timeElapsed = Date.now() - this.gameStartTime;
            this.updateGameState();
            this.logger.logEvent('end_game_pressed', {
                timeElapsed: timeElapsed,
                questionsAnswered: this.correctCount + (this.questionsShown - this.correctCount),
                currentScore: this.correctCount
            });

            // Log game over
            const avgTimePerQuestion = this.correctCount + (this.questionsShown - this.correctCount) > 0
                ? timeElapsed / (this.correctCount + (this.questionsShown - this.correctCount))
                : 0;

            this.logger.logEvent('game_over', {
                reason: 'user_quit',
                finalScore: this.correctCount,
                questionsShown: this.questionsShown,
                questionsAnswered: this.correctCount + (this.questionsShown - this.correctCount),
                correctCount: this.correctCount,
                incorrectCount: this.questionsShown - this.correctCount,
                totalHintsUsed: this.hintUses,
                totalTime: timeElapsed,
                averageTimePerQuestion: avgTimePerQuestion
            });
            this.logger.cleanup();

            this.scene.start('GameOver', this.gameConfig);

        });

        // Timer (top right of game area)
        if (this.gameConfig.show_timer) {
            const timeLimit = this.gameConfig.time_limit || 120; // default to 2 minutes
            const min = Math.floor(timeLimit / 60);
            const sec = (timeLimit % 60).toString().padStart(2, '0');
            this.timerText = this.add.text(this.gameAreaX + this.gameAreaSize - 30, this.gameAreaY + barHeight / 2,
                `${min}:${sec}`, {
                font: '28px monospace', color: '#000', fontStyle: 'bold'
            }).setOrigin(1, 0.5).setDepth(1001);

        }

        // Create hint button based on hint type (positioned in bottom bar)
        if (this.gameConfig.hint_type === 'powerup') {
            this.hintIcon = this.add.image(this.gameAreaX + Math.floor(20 * scaleFactor), bottomBarY + bottomBarHeight - Math.floor(20 * scaleFactor), 'powerup')
                .setOrigin(0, 1).setScale(0.45 * scaleFactor).setInteractive().setDepth(1002);
            this.hintIcon.clearTint();
            this.hintIcon.on('pointerdown', () => {
                if (this.feedbackActive) return; // Allow hint if sandbox is active? No, sandbox implies hint usage or separate state.
                // Actually hint is "powerup" type, separate from sandbox "stepByStep". 
                // If sandbox is active, we probably shouldn't allow another powerup?
                // The task says "interact with any in-game objects other than the popup screen".
                if (this.sandboxActive || this.feedbackActive) return;

                if (this.hintUses < this.maxHints && !this.hintActive && !this.hintUsedThisQuestion) {
                    this.hintUses++;
                    this.hintActive = true;
                    this.hintUsedThisQuestion = true;
                    const questionId = `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}`;
                    if (!this.questionsWithHints.includes(questionId)) {
                        this.questionsWithHints.push(questionId);
                    }

                    const timeSinceQuestionStart = Date.now() - this.questionStartTime;

                    this.updateGameState();
                    this.logger.logEvent('hint_pressed', {
                        hintType: 'powerup',
                        questionId: questionId,
                        questionNumber: this.correctCount + this.incorrectCount,
                        hintNumber: this.hintUses,
                        timeSinceQuestionStart: timeSinceQuestionStart,
                        hintContent: null
                    });

                    this.answerObjects.getChildren().forEach((asteroid: Phaser.GameObjects.GameObject) => {
                        const sprite = asteroid as Phaser.Physics.Arcade.Image;
                        const label = sprite.getData('label') as Phaser.GameObjects.Text;
                        if (sprite.getData('answer') === this.currentQuestion.correctAnswer) {
                            // Keep correct asteroid normal
                        } else {
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
            this.powertoolIcon = this.add.image(this.gameAreaX + Math.floor(20 * scaleFactor), bottomBarY + bottomBarHeight - Math.floor(20 * scaleFactor), 'powerup')
                .setOrigin(0, 1).setScale(0.45 * scaleFactor).setInteractive().setDepth(1002);
            this.powertoolIcon.clearTint();
            this.powertoolIcon.on('pointerdown', () => {
                if (this.sandboxActive || this.feedbackActive) return; // Prevent double clicking or clicking during feedback
                if (this.powertoolUses < this.maxPowertool && !this.sandboxActive && !this.powertoolUsedThisQuestion) {
                    this.powertoolUses++;
                    this.powertoolUsedThisQuestion = true;
                    const questionId = `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}`;
                    const timeSinceQuestionStart = Date.now() - this.questionStartTime;

                    this.updateGameState();
                    this.logger.logEvent('hint_pressed', {
                        questionId: questionId,
                        questionNumber: this.correctCount + this.incorrectCount,
                        toolType: 'stepByStep',
                        timeSinceQuestionStart: timeSinceQuestionStart
                    });

                    this.openNumberLinePopup();
                    if (this.powertoolUses >= this.maxPowertool) {
                        this.powertoolIcon.setAlpha(0.5);
                        this.powertoolIcon.disableInteractive();
                    }
                }
            });
        }

        // Question text (top center of game area)
        this.questionText = this.add.text(this.gameAreaX + this.gameAreaSize / 2, this.gameAreaY + barHeight / 2, '', {
            font: '32px monospace', color: '#000', align: 'center'
        }).setOrigin(0.5).setDepth(1003);

        // Init asteroid group
        this.answerObjects = this.physics.add.group();

        // Spaceship (positioned in bottom bar, layered above white bar)
        this.spaceship = this.add.image(this.gameAreaX + this.gameAreaSize / 2, bottomBarY + bottomBarHeight - Math.floor(5 * scaleFactor), 'spaceship')
            .setOrigin(0.5, 1).setScale(0.192 * scaleFactor).setDepth(1001);

        // ---- Progress bar (left side between hearts and power-up within game area) ----
        const topOfBar = heartY + heartSize + Math.floor(30 * scaleFactor);
        const bottomOfBar = bottomBarY - Math.floor(20 * scaleFactor);
        const progressX = this.gameAreaX + Math.floor(75 * scaleFactor);
        this.drawProgressContainer(progressX, topOfBar, bottomOfBar);

        // ---- Controls ----
        if (this.gameConfig.controls === 'arrowKeys') {
            this.cursors = this.input.keyboard?.createCursorKeys() ?? {
                up: { isDown: false },
                down: { isDown: false },
                left: { isDown: false },
                right: { isDown: false },
                space: { isDown: false },
                shift: { isDown: false }
            } as Phaser.Types.Input.Keyboard.CursorKeys;

            // Event-based key logging for arrow keys
            this.input.keyboard?.on('keydown-LEFT', () => {
                if (this.sandboxActive || this.feedbackActive) return;
                if (!this.keyDownTimes.has('left')) {
                    this.keyDownTimes.set('left', Date.now());
                    this.updateGameState();
                    this.logger.logKeyDown('left',
                        { x: this.spaceship.x, y: this.spaceship.y },
                        { x: this.shipVel, y: 0 }
                    );
                }
            });

            this.input.keyboard?.on('keyup-LEFT', () => {
                const downTime = this.keyDownTimes.get('left');
                if (downTime !== undefined) {
                    const duration = Date.now() - downTime;
                    this.keyDownTimes.delete('left');
                    this.updateGameState();
                    this.logger.logKeyUp('left', duration,
                        { x: this.spaceship.x, y: this.spaceship.y },
                        { x: this.shipVel, y: 0 }
                    );
                }
            });

            this.input.keyboard?.on('keydown-RIGHT', () => {
                if (this.sandboxActive || this.feedbackActive) return;
                if (!this.keyDownTimes.has('right')) {
                    this.keyDownTimes.set('right', Date.now());
                    this.updateGameState();
                    this.logger.logKeyDown('right',
                        { x: this.spaceship.x, y: this.spaceship.y },
                        { x: this.shipVel, y: 0 }
                    );
                }
            });

            this.input.keyboard?.on('keyup-RIGHT', () => {
                const downTime = this.keyDownTimes.get('right');
                if (downTime !== undefined) {
                    const duration = Date.now() - downTime;
                    this.keyDownTimes.delete('right');
                    this.updateGameState();
                    this.logger.logKeyUp('right', duration,
                        { x: this.spaceship.x, y: this.spaceship.y },
                        { x: this.shipVel, y: 0 }
                    );
                }
            });

            // Space key logging (for laser shooting)
            this.input.keyboard?.on('keydown-SPACE', () => {
                if (this.sandboxActive || this.feedbackActive) return;
                if (!this.keyDownTimes.has('space')) {
                    this.keyDownTimes.set('space', Date.now());
                    this.updateGameState();
                    this.logger.logKeyDown('space',
                        { x: this.spaceship.x, y: this.spaceship.y },
                        { x: this.shipVel, y: 0 }
                    );
                }
                this.shootLaser();
            });

            this.input.keyboard?.on('keyup-SPACE', () => {
                const downTime = this.keyDownTimes.get('space');
                if (downTime !== undefined) {
                    const duration = Date.now() - downTime;
                    this.keyDownTimes.delete('space');
                    this.updateGameState();
                    this.logger.logKeyUp('space', duration,
                        { x: this.spaceship.x, y: this.spaceship.y },
                        { x: this.shipVel, y: 0 }
                    );
                }
            });

            this.laserGroup = this.physics.add.group();
        }


        // Laser group ----
        this.laserGroup = this.physics.add.group();

        // ---- Game logic initialization ----
        // Update game state and log game started
        this.updateGameState();
        this.logger.logEvent('game_started', {
            // nothing to log
        });

        // Listen for resize events
        this.scale.on('resize', this.handleResize, this);
        // Listen for the restart event from React
        // this.game.events.on('restartGame', this.restartGame, this);

        // Listen for shutdown event to cleanup resources when scene stops
        this.events.once('shutdown', this.shutdown, this);

        // ---- show next question ----

        this.showNextQuestion();
    }

    private updateGameState(): void {
        const questionId = this.currentQuestion ? `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}` : '';
        const gameState: GameState = {
            gameConfig: this.gameConfig,
            currentQuestion: {
                questionId: questionId,
                questionNumber: this.correctCount + this.incorrectCount + 1,
                questionText: this.currentQuestion?.question || '',
                correctAnswer: this.currentQuestion?.correctAnswer || 0,
                allAnswers: this.currentQuestion?.options || []
            },
            progress: {
                questionsShown: this.questionsShown,
                questionsAnswered: this.correctCount + this.incorrectCount,
                correctCount: this.correctCount,
                incorrectCount: this.incorrectCount,
                currentStreak: this.currentStreak,
                longestStreak: this.longestStreak
            },
            status: {
                lives: this.lives,
                score: this.correctCount,
                timeElapsed: Date.now() - this.gameStartTime,
                gameOver: this.gameOver || false,
                paused: this.sandboxActive || this.timerPaused || false
            },
            hints: {
                totalHintsUsed: this.hintUses,
                maxHints: this.maxHints,
                hintsUsedThisQuestion: this.hintUsedThisQuestion || false,
                hintActive: this.hintActive || false,
                questionsWithHints: this.questionsWithHints
            },
            powerTool: this.gameConfig.hint_type === 'stepByStep' ? {
                totalUses: this.powertoolUses,
                maxUses: this.maxPowertool,
                usedThisQuestion: this.powertoolUsedThisQuestion || false,
                active: this.powertoolActive || false
            } : undefined,
            screen: {
                width: this.scale.width,
                height: this.scale.height,
                scaleFactor: this.scale.height / 1080,
                gameAreaX: this.gameAreaX,
                gameAreaY: this.gameAreaY,
                gameAreaWidth: this.gameAreaSize,
                gameAreaHeight: this.gameAreaHeight
            }
        };

        this.logger.updateGameState(gameState);
    }
    private showNextQuestion() {
        // Initialize question start time
        this.questionStartTime = Date.now();
        this.questionsShown += 1;

        // Get next question based on last answer correctness
        this.currentQuestion = this.questionService.getNextQuestion(this.lastAnswerCorrect);

        // Update question text
        this.questionText.setText(this.currentQuestion.question);

        // Emit a QuestionShown event
        // this.game.events.emit('QuestionShown', this.currentQuestion);

        this.gameOver = false;
        this.lastTimerUpdate = 0;
        this.questionText.setText(this.currentQuestion.question);

        // Clear all lasers from previous question
        if (this.laserGroup) {
            this.laserGroup.clear(true, true);
        }

        // Re-enable hint buttons
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

        // Reset hint availability for this question
        this.hintUsedThisQuestion = false;
        this.hintActive = false;
        this.powertoolUsedThisQuestion = false;
        this.powertoolActive = false;
        this.powerupFromFeedback = false;

        // Spawn answer objects and collect their data
        let asteroidSpawnData: any[] = [];
        if (this.gameConfig.cover_story === 'MoonMissionGame') {
            asteroidSpawnData = this.spawnAnswerObjects(
                'asteroid',
                (i, x) => this.gameAreaY + 85,
                [0.18, 0.35],
                (i) => Phaser.Math.Between(30, 65) * 0.5,
                150,
            );
        } else if (this.gameConfig.cover_story === 'HomeworkHelperGame') {
            asteroidSpawnData = this.spawnAnswerObjects(
                'thoughtbubble',
                (i, x) => this.gameAreaY + this.gameAreaHeight - Math.floor(this.baseBottomBarHeight * (this.scale.height / 1080)),
                [0.28, 0.45],
                (i) => -Phaser.Math.Between(30, 65) * 0.5,
                50,
            );
        }

        // Log a single consolidated question_shown event with all asteroid spawn details
        const questionId = `${this.currentQuestion.question}_${this.currentQuestion.correctAnswer}`;
        this.updateGameState();
        this.logger.logEvent('question_shown', {
            questionId: questionId,
            questionNumber: this.questionsShown,
            questionText: this.currentQuestion.question,
            correctAnswer: this.currentQuestion.correctAnswer,
            responseOptions: this.currentQuestion.options,
            asteroidSpawns: asteroidSpawnData
        });
    }

    spawnAnswerObjects(
        type: 'asteroid' | 'thoughtbubble',
        yPosition: (i: number, x: number) => number,
        scaleRange: [number, number],
        velocity: (i: number) => number,
        depth: number,
    ): any[] {
        this.clearAnswerObjects()

        // Calculate spawn area
        const scaleFactor = this.scale.height / 1080;
        const progressX = this.gameAreaX + Math.floor(75 * scaleFactor);
        const progressBarWidth = this.progressBarWidth;
        const starExtension = (progressBarWidth / 2) + 20 + 20;
        const progressBarPadding = 20;

        // Exclusion zone logic
        const maxObjectSize = (type === 'asteroid' ? 0.35 : 0.45) * scaleFactor * 200;
        const progressBarRight = progressX + progressBarWidth + progressBarPadding + (maxObjectSize * 0.5);
        const minX = Math.max(this.gameAreaX + 12, Math.ceil(progressBarRight));
        const maxX = this.gameAreaX + this.gameAreaSize - 50;
        const minDist = 60;
        const numAnswers = this.currentQuestion.options.length;

        // Generate X positions
        let positions: number[] = [];
        let attempts = 0;
        const maxAttempts = 5000;
        while (positions.length < numAnswers && attempts < maxAttempts) {
            let x = Phaser.Math.Between(minX, maxX);
            // Check if position maintains minimum distance from other positions
            const farEnough = positions.every(px => Math.abs(px - x) >= minDist);
            if (farEnough) positions.push(x);
            attempts++;
        }
        if (positions.length < numAnswers) {
            // If we couldn't generate enough positions with strict distance, try with reduced distance
            const reducedMinDist = 40;
            while (positions.length < numAnswers && attempts < maxAttempts) {
                let x = Phaser.Math.Between(minX, maxX);
                const farEnough = positions.every(px => Math.abs(px - x) >= reducedMinDist);
                if (farEnough) positions.push(x);
                attempts++;
            }
        }
        // Ensure all positions are unique (no exact duplicates) and sort them
        positions = [...new Set(positions)].sort((a, b) => a - b);
        // If we still don't have enough positions, fill with varied spaced positions
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

        // Create answerObjects group if not exists
        if (!this.answerObjects) {
            this.answerObjects = this.physics.add.group();
        }

        // Collect spawn data for consolidated logging
        const spawnData: any[] = [];

        // Spawn answerObjects
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

            // Collect spawn data instead of logging individual events
            spawnData.push({
                answer,
                position: { x, y },
                size: scale,
                speed,
                asteroidType: answerObjectKey,
                spawnIndex: i
            });

            // Add label if needed

            const lbl = this.add.text(x, y, answer.toString(), {
                font: `${Math.floor(32 * scaleFactor)}px Arial`, color: this.optionLabelColor, fontStyle: 'bold', stroke: this.optionLabelStroke, strokeThickness: Math.floor(5 * scaleFactor)
            }).setOrigin(0.5).setDepth(depth + 100);
            obj.setData('label', lbl);
            this.answerObjectLabels.push(lbl);


            // Make clickable for tap-to-select
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
                        isCorrect: answer === this.currentQuestion.correctAnswer
                    });
                    // this.game.events.emit('MathResponse',
                    //     {
                    //         question: this.currentQuestion,
                    //         selectedAnswer: answer,
                    //         isCorrect: answer === this.currentQuestion.correctAnswer
                    //     });

                    this.checkAnswer(obj);
                });
            }
        });

        // Return the collected spawn data
        return spawnData;
    }

    shootLaser() {
        if (this.sandboxActive || this.feedbackActive) return;
        // Allow multiple lasers with 1 second delay between shots
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
        const laserSprite = this.laserGroup.create(
            this.spaceship.x,
            laserY,
            laserTextureKey
        ) as Phaser.Physics.Arcade.Image;
        laserSprite.setOrigin(0.5, 1);
        laserSprite.setDepth(300);

        // Log laser fired
        this.updateGameState();
        this.logger.logEvent('space_pressed', {
            spaceshipPosition: {
                x: this.spaceship.x,
                y: this.spaceship.y
            },
            laserPosition: {
                x: this.spaceship.x,
                y: laserY
            },
            targetAnswer: null
        });
    }

    laserHitAsteroid(laser: Phaser.Physics.Arcade.Image, asteroid: Phaser.Physics.Arcade.Image) {
        const targetAnswer = asteroid.getData('answer');
        const isCorrect = targetAnswer === this.currentQuestion.correctAnswer;

        // Log laser hit
        this.updateGameState();
        this.logger.logEvent('laser_hit', {
            laserPosition: {
                x: laser.x,
                y: laser.y
            },
            targetAnswer: targetAnswer,
            targetPosition: {
                x: asteroid.x,
                y: asteroid.y
            },
            isCorrect: isCorrect
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

            // Get top and bottom of object
            const objTop = sprite.y - sprite.displayHeight / 2;
            const objBottom = sprite.y + sprite.displayHeight / 2;

            // Moon Mission: asteroids fall, fade at bottom
            if (this.gameConfig.cover_story === 'MoonMissionGame') {
                if (objBottom > this.clippingBorderY) {
                    const clippedHeight = objBottom - this.clippingBorderY;
                    const totalHeight = sprite.displayHeight;
                    const visibleRatio = Math.max(0, (totalHeight - clippedHeight) / totalHeight);
                    if (this.hintActive && sprite.getData('answer') !== this.currentQuestion.correctAnswer) {
                        sprite.setAlpha(Math.min(visibleRatio, 0.3));
                        if (label) label.setAlpha(Math.min(visibleRatio, 0.3));
                    } else {
                        sprite.setAlpha(visibleRatio);
                        if (label) label.setAlpha(visibleRatio);
                    }
                } else {
                    if (this.hintActive && sprite.getData('answer') !== this.currentQuestion.correctAnswer) {
                        sprite.setAlpha(0.3);
                        if (label) label.setAlpha(0.3);
                    } else {
                        sprite.setAlpha(1);
                        if (label) label.setAlpha(1);
                    }
                }
            }
            // HomeworkHelp: thought bubbles rise, fade at top
            else if (this.gameConfig.cover_story === 'HomeworkHelperGame') {
                const whiteBarBottom = this.gameAreaY + 60;
                if (objTop < whiteBarBottom) {
                    const clippedHeight = whiteBarBottom - objTop;
                    const totalHeight = sprite.displayHeight;
                    const visibleRatio = Math.max(0, (totalHeight - clippedHeight) / totalHeight);
                    if (this.hintActive && sprite.getData('answer') !== this.currentQuestion.correctAnswer) {
                        sprite.setAlpha(Math.min(visibleRatio, 0.3));
                        if (label) label.setAlpha(Math.min(visibleRatio, 0.3));
                    } else {
                        sprite.setAlpha(visibleRatio);
                        if (label) label.setAlpha(visibleRatio);
                    }
                } else {
                    if (this.hintActive && sprite.getData('answer') !== this.currentQuestion.correctAnswer) {
                        sprite.setAlpha(0.3);
                        if (label) label.setAlpha(0.3);
                    } else {
                        sprite.setAlpha(1);
                        if (label) label.setAlpha(1);
                    }
                }
            }
            // Default: no clipping/fading
            else {
                if (this.hintActive && sprite.getData('answer') !== this.currentQuestion.correctAnswer) {
                    sprite.setAlpha(0.3);
                    if (label) label.setAlpha(0.3);
                } else {
                    sprite.setAlpha(1);
                    if (label) label.setAlpha(1);
                }
            }
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

    // Number line popup for step-by-step helper (games 5-8) - "Counting On" method
    private openNumberLinePopup() {
        console.log('=== OPENING NUMBER LINE POPUP ===');
        console.log('Current question:', this.currentQuestion);

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
            padding: { left: 8, right: 8, top: 2, bottom: 2 }
        }).setOrigin(0.5, 0).setInteractive().setDepth(2002);
        closeBtn.on('pointerdown', () => this.closeNumberLinePopup());
        this.sandboxPopup.add(closeBtn);

        // console.log('Sandbox popup created:', this.sandboxPopup);
        // Initialize title; will be modified later depending on question type
        let title = this.add.text(popupX + popupWidth / 2, popupY + 30, "Let's count!", {
            font: '24px Arial', color: '#222'
        }).setOrigin(0.5).setDepth(2003);
        this.sandboxPopup.add(title);
        // Show the equation at the bottom
        // const explainText = this.currentQuestion.question.replace('?', sum.toString());
        // const explain = this.add.text(popupX + popupWidth / 2, popupY + popupHeight - 50, explainText, {
        //     font: '24px Arial', color: '#222'
        // }).setOrigin(0.5).setDepth(2004);

        // Parse the current question
        let firstAddend = 0, secondAddend = 0;
        const additionMatch = this.currentQuestion?.question.match(/(\d+)\s*\+\s*(\d+)/);
        const subtractionMatch = this.currentQuestion?.question.match(/(\d+)\s*-\s*(\d+)/);

        // console.log('Question parsing:');
        // console.log('- Question text:', this.currentQuestion?.question);
        // console.log('- Addition match:', additionMatch);
        // console.log('- Subtraction match:', subtractionMatch);

        if (additionMatch) {
            firstAddend = parseInt(additionMatch[1], 10);
            secondAddend = parseInt(additionMatch[2], 10);
            title.text = "Let's count on from " + firstAddend + "!";
            // console.log('Parsed as addition:', firstAddend, '+', secondAddend);
        } else if (subtractionMatch) {
            firstAddend = parseInt(subtractionMatch[1], 10);
            secondAddend = parseInt(subtractionMatch[2], 10);
            title.text = "Let's count down from " + firstAddend + "!";
            // console.log('Parsed as subtraction:', firstAddend, '-', secondAddend);
        } else {
            firstAddend = Math.max(0, Math.min(this.currentQuestion.correctAnswer, 10));
            secondAddend = this.currentQuestion.correctAnswer - firstAddend;
            // console.log('Fallback parsing:', firstAddend, '+', secondAddend);
        }

        const sum = this.currentQuestion.correctAnswer;
        // console.log('Final values - firstAddend:', firstAddend, 'secondAddend:', secondAddend, 'sum:', sum);

        // "Counting on" method: 
        // Left end = minimum number rounded down to nearest ten
        // Right end = maximum number rounded up to nearest ten
        const minValue = Math.min(firstAddend, sum);
        const maxValue = Math.max(firstAddend, sum);
        const leftEnd = Math.max(0, Math.floor(minValue / 10) * 10);
        const rightEnd = Math.ceil(maxValue / 10) * 10;

        // Break second addend into tens (blue) and units (red)
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

        // Draw baseline
        g.lineStyle(3, 0x222222, 1);
        g.beginPath();
        g.moveTo(lineX1, lineY);
        g.lineTo(lineX2, lineY);
        g.strokePath();

        // Draw tick marks and labels - show every 10
        for (let val = leftEnd; val <= rightEnd; val += 10) {
            const x = toX(val);
            g.lineStyle(2, 0x222222, 1);
            g.beginPath();
            g.moveTo(x, lineY - 8);
            g.lineTo(x, lineY + 8);
            g.strokePath();

            const lbl = this.add.text(x, lineY + 14, val.toString(), {
                font: '16px Arial', color: '#222'
            }).setOrigin(0.5, 0);
            this.sandboxPopup.add(lbl);
        }

        // Mark the starting point (first addend)
        const startX = toX(firstAddend);
        const startDot = this.add.circle(startX, lineY, 6, 0x2d89ff).setDepth(2003);
        this.sandboxPopup.add(startDot);
        const startLabel = this.add.text(startX, lineY - 25, firstAddend.toString(), {
            font: '22px Arial', color: '#222'
        }).setOrigin(0.5).setDepth(2003);
        this.sandboxPopup.add(startLabel);

        const arrow = this.add.graphics().setDepth(2004);
        if (this.sandboxPopup) {
            this.sandboxPopup.add(arrow);
        }

        // Draw jumps using "counting on" method
        const drawJump = (from: number, by: number, color: number, label: string) => {
            const startX = toX(from);
            const endX = toX(from + by);
            const midX = (startX + endX) / 2;
            const height = by === 1 ? 20 : 40; // Smaller height for unit counts

            arrow.lineStyle(3, color, 1);

            const curve = new Phaser.Curves.QuadraticBezier(
                new Phaser.Math.Vector2(startX, lineY),
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

            if (label) {
                // "-1" "+1" label at the top of the arc
                const lblObj = this.add.text(midX, lineY - 40, label, {
                    font: '16px Arial', color: '#222', backgroundColor: '#ffffffaa',
                    padding: { left: 4, right: 4, top: 2, bottom: 2 }
                }).setOrigin(0.5).setDepth(2004);
                if (this.sandboxPopup) this.sandboxPopup.add(lblObj);
                // label fades after 500ms delay
                this.time.delayedCall(500, () => {
                    if (lblObj) {
                        this.tweens.add({
                            targets: lblObj,
                            alpha: 0,
                            duration: 400,
                            ease: 'Power1',
                            onComplete: () => {
                                lblObj.destroy();
                            }
                        });
                    }
                });
            }
        };

        if (subtractionMatch) {
            console.log('=== ENTERING SUBTRACTION ANIMATION ===');
            // For subtraction, break into tens and units like addition
            const tensToSubtract = Math.floor(secondAddend / 10);
            const unitsToSubtract = secondAddend % 10;
            let animationDelay = 0;
            let currentPos = firstAddend;

            // console.log(`Subtraction animation: ${firstAddend} - ${secondAddend} = ${sum}`);
            // console.log(`Tens to subtract: ${tensToSubtract}, Units to subtract: ${unitsToSubtract}`);

            // Draw 10-count jumps (blue) first - animate each one going backwards
            for (let i = 0; i < tensToSubtract; i++) {
                const jumpStart = currentPos;
                // console.log(`Scheduling 10-count jump ${i + 1}: from ${jumpStart} to ${jumpStart - 10} at delay ${animationDelay}ms`);
                this.time.delayedCall(animationDelay, () => {
                    // console.log(`Executing 10-count jump: from ${jumpStart} to ${jumpStart - 10}`);
                    if (this.sandboxPopup) {
                        drawJump(jumpStart, -10, 0x2d89ff, '-' + (10 + (i * 10)));
                    } else {
                        console.log('ERROR: sandboxPopup is undefined during animation!');
                    }
                });
                currentPos -= 10;
                animationDelay += 800; // 800ms delay between each 10-count
            }

            // Draw unit count jumps (red) one at a time - animate each one going backwards
            for (let i = 0; i < unitsToSubtract; i++) {
                const jumpStart = currentPos - i;
                // console.log(`Scheduling unit jump ${i + 1}: from ${jumpStart} to ${jumpStart - 1} at delay ${animationDelay}ms`);
                this.time.delayedCall(animationDelay, () => {
                    // console.log(`Executing unit jump: from ${jumpStart} to ${jumpStart - 1}`);
                    if (this.sandboxPopup) {
                        drawJump(jumpStart, -1, 0xff4444, '-' + (1 + i));
                    } else {
                        console.log('ERROR: sandboxPopup is undefined during animation!');
                    }
                });
                animationDelay += 600; // 600ms delay between each unit count
            }

            // Mark the end point (difference) after all animations
            // console.log(`Scheduling final marker at delay ${animationDelay + 400}ms`);
            this.time.delayedCall(animationDelay + 400, () => {
                if (!this.sandboxPopup) return;
                // console.log(`Showing final marker at ${sum}`);
                const endDot = this.add.circle(toX(sum), lineY, 6, 0x00aa66).setDepth(2003);
                this.sandboxPopup.add(endDot);
                const endLabel = this.add.text(toX(sum), lineY - 25, sum.toString(), {
                    font: '22px Arial', color: '#222'
                }).setOrigin(0.5).setDepth(2003);
                this.sandboxPopup.add(endLabel);
            });
        } else {
            console.log('=== ENTERING ADDITION ANIMATION ===');
            let animationDelay = 0;

            // console.log(`Addition animation: ${firstAddend} + ${secondAddend} = ${sum}`);
            // console.log(`Tens count: ${tensCount}, Units count: ${unitsCount}`);

            // Draw 10-count jumps (blue) first - animate each one
            for (let i = 0; i < tensCount; i++) {
                const jumpStart = firstAddend + (i * 10);
                console.log(`Scheduling 10-count jump ${i + 1}: from ${jumpStart} to ${jumpStart + 10} at delay ${animationDelay}ms`);
                this.time.delayedCall(animationDelay, () => {
                    console.log(`Executing 10-count jump: from ${jumpStart} to ${jumpStart + 10}`);
                    if (this.sandboxPopup) {
                        drawJump(jumpStart, 10, 0x2d89ff, '+' + (10 + (i * 10)));
                    } else {
                        // console.log('ERROR: sandboxPopup is undefined during animation!');
                    }
                });
                animationDelay += 800; // 800ms delay between each 10-count
            }

            // Draw unit count jumps (red) one at a time - animate each one
            for (let i = 0; i < unitsCount; i++) {
                const jumpStart = firstAddend + (tensCount * 10) + i;
                // console.log(`Scheduling unit jump ${i + 1}: from ${jumpStart} to ${jumpStart + 1} at delay ${animationDelay}ms`);
                this.time.delayedCall(animationDelay, () => {
                    // console.log(`Executing unit jump: from ${jumpStart} to ${jumpStart + 1}`);
                    if (this.sandboxPopup) {
                        drawJump(jumpStart, 1, 0xff4444, '+' + (1 + (i * 1)));
                    } else {
                        console.log('ERROR: sandboxPopup is undefined during animation!');
                    }
                });
                animationDelay += 600; // 600ms delay between each unit count
            }

            // Mark the end point (sum) after all animations
            // console.log(`Scheduling final marker at delay ${animationDelay + 400}ms`);
            this.time.delayedCall(animationDelay + 400, () => {
                if (!this.sandboxPopup) return;
                // console.log(`Showing final marker at ${sum}`);
                const endDot = this.add.circle(toX(sum), lineY, 6, 0x00aa66).setDepth(2003);
                this.sandboxPopup.add(endDot);
                const endLabel = this.add.text(toX(sum), lineY - 25, sum.toString(), {
                    font: '22px Arial', color: '#222'
                }).setOrigin(0.5).setDepth(2003);
                this.sandboxPopup.add(endLabel);
                // Only show this gotitbtn after all animations are done
                // Add a button displaying "Got it!"
                // const gotItBtn = this.add.text(popupX + popupWidth / 2, popupY + popupHeight - 40, 'Got it!', {
                //     font: '24px Arial', color: '#fff', backgroundColor: '#28a745',
                //     padding: { left: 16, right: 16, top: 8, bottom: 8 }
                // }).setOrigin(0.5).setInteractive().setDepth(2004);
                // gotItBtn.on('pointerdown', () => this.closeNumberLinePopup());
                // this.sandboxPopup.add(gotItBtn);// this.sandboxPopup.add(explain);
            });
        }

    }

    private closeNumberLinePopup() {
        this.sandboxActive = false;
        this.powertoolActive = false;
        this.resumeGameEntities();

        if (this.sandboxPopup) {
            this.sandboxPopup.destroy();
            this.sandboxPopup = undefined;
        }

        // Only proceed to next question if powerup was accessed from feedback popup
        if (this.powerupFromFeedback) {
            this.powerupFromFeedback = false;
            // Check if game should end (no lives left)
            if (this.lives === 0) {
                // Log game over
                const totalTime = Date.now() - this.gameStartTime;
                const avgTimePerQuestion = (this.correctCount + this.incorrectCount) > 0
                    ? totalTime / (this.correctCount + this.incorrectCount)
                    : 0;

                this.updateGameState();
                this.logger.logEvent('game_over', {
                    reason: 'lives_lost',
                    questionsShown: this.questionsShown,
                    questionsAnswered: this.correctCount + this.incorrectCount,
                    correctCount: this.correctCount,
                    incorrectCount: this.incorrectCount,
                    totalHintsUsed: this.hintUses,
                    totalTime: totalTime,
                    averageTimePerQuestion: avgTimePerQuestion
                });
                this.logger.cleanup();
                this.triggerGameOverTransition();
            } else {
                this.showNextQuestion();
            }
        }
    }

    shutdown() {
        console.log('🔴 GameScene.shutdown() called - cleaning up keyboard listeners');

        // Explicitly remove keyboard listeners by event name
        if (this.input.keyboard) {
            this.input.keyboard.off('keydown-LEFT');
            this.input.keyboard.off('keyup-LEFT');
            this.input.keyboard.off('keydown-RIGHT');
            this.input.keyboard.off('keyup-RIGHT');
            this.input.keyboard.off('keydown-SPACE');
            this.input.keyboard.off('keyup-SPACE');
        }

        if (this.logger) {
            this.logger.cleanup();
        }
        if (this.sandboxPopup) {
            this.sandboxPopup.destroy();
        }
        if (this.feedbackPopup) {
            this.feedbackPopup.destroy();
        }
    }
}


