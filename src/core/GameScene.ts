import Phaser from 'phaser';
import { MathQuestionService } from './mathquestions';
import { MathQuestion, Response, TrialConfig, GameConfig, HistoryEvent } from './types';

export class GameScene extends Phaser.Scene {
    private gameConfig!: GameConfig;
    private questionService!: MathQuestionService;
    private currentQuestion!: MathQuestion;
    private lastAnswerCorrect: boolean = false;

    // Phaser objects ----
    private questionBorder!: Phaser.GameObjects.Graphics;
    private gameOver: boolean = false;
    private transitioning: boolean = false;
    private lastTimerUpdate?: number;
    private asteroids!: Phaser.Physics.Arcade.Group;

    private score: number = 0; // kept for GameOver payload; not displayed
    private lives: number = 3;
    private timer: number = 120;

    private timerText!: Phaser.GameObjects.Text;
    private questionText!: Phaser.GameObjects.Text;
    private heartIcons: Phaser.GameObjects.Image[] = [];
    private whiteBar!: Phaser.GameObjects.Graphics;
    private asteroidLabels: Phaser.GameObjects.Text[] = [];
    private spaceship!: Phaser.GameObjects.Image;
    private hintUses: number = 0;
    private maxHints: number = 3;
    private hintIcon!: Phaser.GameObjects.Image;
    private hintActive: boolean = false;
    private hintUsedThisQuestion: boolean = false;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private laserGroup!: Phaser.Physics.Arcade.Group;

    // Movement
    private shipVel = 0;
    private shipMaxSpeed = 900;
    private shipAccel = 2400;
    private shipDecel = 3000;

    // Progress bar (15 correct = 100%)
    private correctCount = 0;
    private progressContainer!: Phaser.GameObjects.Container;
    private currentGem!: Phaser.GameObjects.Graphics;
    private clippingBorder!: Phaser.GameObjects.Graphics;
    private clippingBorderY: number = 0;
    private progressHeight = 0;
    private progressBarWidth = 12; // thin
    private questionStars: Phaser.GameObjects.Graphics[] = []; // Individual question markers

    // Rectangle game area properties
    private gameAreaSize!: number; // Width
    private gameAreaHeight!: number; // Height
    private gameAreaX!: number;
    private gameAreaY!: number;

    constructor() {
        super('GameScene');
    }

    // The 'init' method receives data passed from 'scene.start'
    public init(data: TrialConfig['game_setting'][0]) {
        console.log('GameScene initializing with config:', data);
        this.gameConfig = data;
    }

    preload() {
        this.load.setPath('assets');
        this.load.image('cube', 'cube.png');
        this.load.image('fullheart', 'fullheart.png');
        this.load.image('Sound', 'Sound.png');
        this.load.image('logo', 'logo.png');
        this.load.image('powerup', 'powerup.png');
        this.load.image('powertool', 'powertool.png');

        if (this.gameConfig.game_version === 'MoonMissionGame') {
            this.load.image('starrynight', 'starrynight.png');
            this.load.image('spaceship', 'spaceship.png');
            this.load.image('asteroid1', 'asteroid1.png');
            this.load.image('asteroid2', 'asteroid2.png');
            this.load.image('asteroid3', 'asteroid3.png');
        } else if (this.gameConfig.game_version === 'HomeworkHelperGame') {
            this.load.image('classroom', 'classroom.png');
            this.load.image('thoughtbubble', 'thoughtbubble.png');
            this.load.image('thoughtbubble2', 'thoughtbubble2.png');
            this.load.image('thoughtbubble3', 'thoughtbubble3.png');
            this.load.image('pencil', 'pencil.png');
            this.load.audio('bubblepop', 'bubblepop.flac');
            this.load.audio('lasershot', 'lasershot.wav');
        }

        if (this.gameConfig.feedback_type === 'explosion') {
            this.load.audio('explosion', 'explosion.mp3');
            this.load.audio('explosion1', 'explosion.wav');
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

    create() {
        console.log(`Starting game version: ${this.gameConfig.game_version}`);

        this.questionService = new MathQuestionService();

        // Calculate square game area dimensions
        this.calculateGameArea();

        // White background for the entire screen
        const whiteBackground = this.add.graphics();
        whiteBackground.fillStyle(0xffffff, 1);
        whiteBackground.fillRect(0, 0, this.scale.width, this.scale.height);
        whiteBackground.setDepth(0); // Behind everything

        // Background - fit the game area proportions
        this.add.image(this.gameAreaX + this.gameAreaSize / 2, this.gameAreaY + this.gameAreaHeight / 2, 'starrynight')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(this.gameAreaSize, this.gameAreaHeight)
            .setDepth(1); // Above white background

        // Create a black border around the game area
        const gameAreaBorder = this.add.graphics();
        gameAreaBorder.lineStyle(4, 0x000000, 1); // 4px black border
        gameAreaBorder.strokeRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, this.gameAreaHeight);
        gameAreaBorder.setDepth(100); // Above background but below game elements

        // White bar at the top of the game area
        const barHeight = 85;
        this.whiteBar = this.add.graphics();
        this.whiteBar.fillStyle(0xffffff, 1);
        this.whiteBar.fillRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, barHeight);
        this.whiteBar.setDepth(1000);

        // Hearts (lives) - positioned within game area
        this.heartIcons = [];
        const heartSize = Math.round(barHeight * 0.65);
        const heartY = this.gameAreaY + barHeight + 24;
        const heartXStart = this.gameAreaX + 30;
        for (let i = 0; i < 3; i++) {
            const heart = this.add.image(heartXStart + i * (heartSize + 10), heartY, 'fullheart')
                .setOrigin(0, 0)
                .setDisplaySize(heartSize, heartSize)
                .setDepth(1001);
            this.heartIcons.push(heart);
        }

        // --- End Game button moved to TOP-LEFT on white bar ---
        const endBtn = this.add.text(this.gameAreaX + 30, this.gameAreaY + barHeight / 2, 'End Game', {
            font: '22px Arial', color: '#ffffff', backgroundColor: '#2d3a4a',
            padding: { left: 16, right: 16, top: 8, bottom: 8 }
        }).setOrigin(0, 0.5).setDepth(1002).setInteractive();
        endBtn.on('pointerdown', () => {
            this.scene.start('GameOver', { score: this.score });
        });

        // Timer (top right of game area)
        this.timerText = this.add.text(this.gameAreaX + this.gameAreaSize - 30, this.gameAreaY + barHeight / 2, '2:00', {
            font: '28px monospace', color: '#000', fontStyle: 'bold'
        }).setOrigin(1, 0.5).setDepth(1001);

        // Question text (top center of game area)
        this.questionText = this.add.text(this.gameAreaX + this.gameAreaSize / 2, this.gameAreaY + barHeight / 2, '', {
            font: '32px monospace', color: '#000', backgroundColor: '#fff',
            padding: { left: 20, right: 20, top: 10, bottom: 10 }, align: 'center'
        }).setOrigin(0.5).setDepth(1003);

        // Hint button will be created after game state initialization

        // Init asteroid group
        this.asteroids = this.physics.add.group();

        // Spaceship - positioned within game area
        this.spaceship = this.add.image(this.gameAreaX + this.gameAreaSize / 2, this.gameAreaY + this.gameAreaHeight - 40, 'spaceship')
            .setOrigin(0.5, 1).setScale(0.24).setDepth(200); // Reduced from 0.32 to 0.24, high depth
        // Spaceship is now visible within the game area

        // Create clipping border slightly above spaceship/pencil within game area
        this.clippingBorderY = this.gameAreaY + this.gameAreaHeight - 80; // 40 pixels above spaceship/pencil
        // this.createClippingBorder();

        // Controls ----


        // Laser group ----
        this.laserGroup = this.physics.add.group();

        // Reset state
        this.score = 0;
        this.correctCount = 0;
        this.lives = 3;
        this.timer = 120;
        this.gameOver = false;
        this.transitioning = false;
        this.lastTimerUpdate = 0;
        this.shipVel = 0;
        this.hintUses = 0;
        this.hintUsedThisQuestion = false;
        this.hintActive = false;

        // Hint button will be created after first question is loaded

        // -------- Progress bar: left side between hearts and power-up within game area --------
        // Make it slightly shorter and closer to the left border
        const topOfBar = heartY + heartSize + 30;      // was +20
        const bottomOfBar = this.gameAreaY + this.gameAreaHeight - 100;   // was -80
        const progressX = this.gameAreaX + 44;
        // this.drawProgressContainer(progressX, topOfBar, bottomOfBar);

        // Listen for the restart event from React
        this.game.events.on('restartGame', this.restartGame, this);
        this.showNextQuestion();
    }

    private showNextQuestion() {
        // Get next question based on last answer correctness
        this.currentQuestion = this.questionService.getNextQuestion(this.lastAnswerCorrect);
        console.log('Next question:', this.currentQuestion.question, 'Difficulty:', this.currentQuestion.difficulty);

        // Update question text
        this.questionText.setText(this.currentQuestion.question);
    }


    ///// OLD CODE BELOW /////
    private calculateGameArea() {
        // Calculate rectangle dimensions: height is 80% of screen height, width is 1.5x the height
        this.gameAreaHeight = Math.floor(this.scale.height * 0.8);
        this.gameAreaSize = Math.floor(this.gameAreaHeight * 1.5); // Width is 1.5x height

        // Center the rectangle area
        this.gameAreaX = (this.scale.width - this.gameAreaSize) / 2;
        this.gameAreaY = (this.scale.height - this.gameAreaHeight) / 2;
    }

    private handleAnswer(asteroid: Phaser.Physics.Arcade.Image, isCorrect: boolean) {
        // TODO
        this.lastAnswerCorrect = !isCorrect;
        if (isCorrect) {
            this.correctCount++;
            this.score += 10;
            if (this.gameConfig.feedback_type === 'explosion') {
                console.log('BOOM! (Correct)');
                // play explosion animation
            } else if (this.gameConfig.feedback_type === 'correctHighlight') {
                console.log('Correct answer highlighted!');
            }
        } else {
            // this.loseLife();
        }

        // --- Bridge from Phaser to React ---
        const response: Response = {
            question: this.currentQuestion,
            selectedAnswer: isCorrect ? this.currentQuestion.correctAnswer : -1, // -1 for incorrect
            isCorrect: isCorrect
        };
        this.events.emit('MathResponse', response);
        // --- End of bridge ---

        // Check for game over condition ----
        if (this.lives <= 0) {
            this.gameOver = true;
            this.scene.start('GameOver', { score: this.score });
        }

        // Move to next question after a short delay
        this.time.delayedCall(500, () => {
            // this.nextQuestion();
        });

    }

    private restartGame() {
        console.log('Restarting game...');
        this.scene.restart(this.gameConfig);
    }

    update(time: number, _delta: number) {
        // Timer countdown
        if (!this.gameOver) {
            if (!this.lastTimerUpdate || time - this.lastTimerUpdate > 1000) {
                this.lastTimerUpdate = time;
                if (this.timer > 0) {
                    this.timer--;
                    const min = Math.floor(this.timer / 60);
                    const sec = (this.timer % 60).toString().padStart(2, '0');
                    this.timerText.setText(`${min}:${sec}`);
                } else {
                    this.timerText.setText('0:00');
                    this.gameOver = true;
                    this.scene.start('GameOver', { score: this.score });
                }
            }
        }

        // Move asteroid labels with asteroids and keep them within game boundaries


        // Ship movement

        // Laser movement + overlap

    }
}