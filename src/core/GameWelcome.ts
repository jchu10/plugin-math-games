import { GameConfig, GameTheme } from './types';
import { resolveTheme } from './themes/index';
import { BaseGameScene } from './BaseGameScene';

export class GameWelcome extends BaseGameScene {
    private background!: Phaser.GameObjects.Image;
    welcome_text!: Phaser.GameObjects.Text;
    start_button!: Phaser.GameObjects.Text;
    private gameAreaBorder!: Phaser.GameObjects.Graphics;
    private gameConfig!: GameConfig;
    private theme!: GameTheme;

    constructor() {
        super('GameWelcome');
    }

    public init(data: GameConfig) {
        this.gameConfig = data;
        this.theme = resolveTheme(data.cover_story);
    }

    protected onResize(): void {
        if (this.background) {
            this.background.setPosition(
                this.gameAreaX + this.gameAreaSize / 2,
                this.gameAreaY + this.gameAreaHeight / 2
            );
            this.background.setDisplaySize(this.gameAreaSize, this.gameAreaHeight);
        }
        if (this.gameAreaBorder) {
            this.drawGameAreaBorder(this.gameAreaBorder);
        }
        if (this.welcome_text) {
            const scaleFactor = this.scale.height / 1080;
            const fontSize = Math.floor(64 * scaleFactor);
            this.welcome_text.setPosition(this.scale.width / 2, this.scale.height / 3);
            this.welcome_text.setStyle({ fontSize: `${fontSize}px` });
        }
    }

    preload() {
        this.load.image('game_bg_img', this.theme.backgroundImage);
    }

    create() {
        this.calculateGameArea();
        this.cameras.main.setBackgroundColor('#ffffff');

        this.background = this.add.image(
            this.gameAreaX + this.gameAreaSize / 2,
            this.gameAreaY + this.gameAreaHeight / 2,
            'game_bg_img'
        );
        this.background.setDisplaySize(this.gameAreaSize, this.gameAreaHeight);
        this.background.setOrigin(0.5, 0.5);

        this.gameAreaBorder = this.add.graphics();
        this.drawGameAreaBorder(this.gameAreaBorder);
        this.gameAreaBorder.setDepth(100);

        const welcomeBody = this.theme.welcomeText(this.gameConfig.controls);
        this.print_welcome_message('Welcome to the Math Game!\n\n' + welcomeBody);
        this.print_start_button('Click here to start');

        this.start_button.setInteractive({ useHandCursor: true });
        this.start_button.on('pointerdown', () => {
            this.start_button.disableInteractive();
            this.scene.start('GameScene', this.gameConfig);
        });

        this.registerResizeHandler();
    }

    private print_welcome_message(text) {
        this.welcome_text = this.add.text(
            this.scale.width / 2,
            this.scale.height * 0.35,
            text,
            {
                fontSize: '24px',
                color: this.theme.welcomeTextColor,
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
