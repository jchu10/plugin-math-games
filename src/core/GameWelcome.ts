import { Scene } from 'phaser';
import { GameConfig } from './types';

export class GameWelcome extends Scene {
    private background!: Phaser.GameObjects.Image;
    welcome_text!: Phaser.GameObjects.Text;
    start_button!: Phaser.GameObjects.Text;
    private gameAreaBorder!: Phaser.GameObjects.Graphics;
    private gameConfig!: GameConfig;

    constructor() {
        super('GameWelcome');
    }

    // The 'init' method receives data passed from 'scene.start'
    public init(data: GameConfig) {
        this.gameConfig = data;
    }

    private handleResize() {
        const gameAreaHeight = Math.floor(this.scale.height - 10);
        const gameAreaSize = Math.floor(gameAreaHeight * 1.5);
        const gameAreaX = (this.scale.width - gameAreaSize) / 2;
        const gameAreaY = (this.scale.height - gameAreaHeight) / 2;

        if (this.background) {
            this.background.setPosition(gameAreaX + gameAreaSize / 2, gameAreaY + gameAreaHeight / 2);
            this.background.setDisplaySize(gameAreaSize, gameAreaHeight);
        }
        if (this.gameAreaBorder) {
            this.gameAreaBorder.clear();
            this.gameAreaBorder.lineStyle(4, 0x000000, 1);
            this.gameAreaBorder.strokeRect(gameAreaX, gameAreaY, gameAreaSize, gameAreaHeight);
        }
        if (this.welcome_text) {
            const scaleFactor = this.scale.height / 1080;
            const fontSize = Math.floor(64 * scaleFactor);
            this.welcome_text.setPosition(this.scale.width / 2, this.scale.height / 3);
            this.welcome_text.setStyle({ fontSize: `${fontSize}px` });
        }
    }

    preload() {
        this.load.setPath('assets');

        if (this.gameConfig?.cover_story === "MoonMissionGame") {
            this.load.image('game_bg_img', 'starrynight.png');
        } else if (this.gameConfig?.cover_story === "HomeworkHelperGame") {
            this.load.image('game_bg_img', 'classroom.png');
        } else {
            console.log("No valid cover_story found, loading default background.");
        }
    }

    create() {
        this.cameras.main.setBackgroundColor('#ffffff');
        const gameAreaHeight = Math.floor(this.scale.height * 0.9);
        const gameAreaSize = Math.floor(gameAreaHeight * 1.5);
        const gameAreaX = (this.scale.width - gameAreaSize) / 2;
        const gameAreaY = (this.scale.height - gameAreaHeight) / 2;

        this.background = this.add.image(
            gameAreaX + gameAreaSize / 2,
            gameAreaY + gameAreaHeight / 2,
            'game_bg_img'
        );
        this.background.setDisplaySize(gameAreaSize, gameAreaHeight);
        this.background.setOrigin(0.5, 0.5);

        this.gameAreaBorder = this.add.graphics();
        this.gameAreaBorder.lineStyle(4, 0x000000, 1);
        this.gameAreaBorder.strokeRect(gameAreaX, gameAreaY, gameAreaSize, gameAreaHeight);
        this.gameAreaBorder.setDepth(100);

        this.scale.on('resize', this.handleResize, this);
        let welcome_text_content = 'Welcome to the Math Game!\n\n';

        if (this.gameConfig.controls === 'tapToSelect') {
            welcome_text_content += 'In this game you will use your mouse\nto click on objects.';
            this.print_welcome_message(welcome_text_content);
            this.print_start_button('Click here to start');

            this.start_button.setInteractive({ useHandCursor: true });
            this.start_button.on('pointerdown', () => {
                this.game.events.emit('StartGame')
            });
        } else {
            // this.gameConfig.controls === 'arrowKeys'
            welcome_text_content += 'Use LEFT/RIGHT arrow keys to move the pencil.\nUse SPACE to toss the pencil at an idea cloud.';

            this.print_welcome_message(welcome_text_content);
            this.print_start_button('Press SPACE to start');

            // Listen for the spacebar key to start the game
            const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            spaceKey.on('down', () => {
                this.game.events.emit('StartGame')
            });
        }
    }

    private print_welcome_message(text) {
        this.welcome_text = this.add.text(
            this.scale.width / 2,
            this.scale.height * 0.35,
            text,
            {
                fontSize: '24px',
                color: this.gameConfig?.cover_story === "MoonMissionGame" ? '#ffffff' : '#000000',
                align: 'center',
            }
        );

        this.welcome_text.setOrigin(0.5, 0.5);
    }

    private print_start_button(text) {
        this.start_button = this.add.text(
            this.scale.width * 0.5,
            this.scale.height * 0.8,
            text,
            {
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#009300ff',
                padding: { left: 20, right: 20, top: 10, bottom: 10 },
                align: 'center',
            }
        );
        this.start_button.setOrigin(0.5, 0.5);
    }

}
