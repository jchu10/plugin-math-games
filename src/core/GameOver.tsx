import { GameConfig, GameTheme } from './types';
import { resolveTheme } from './themes/index';
import { BaseGameScene } from './BaseGameScene';

export class GameOver extends BaseGameScene {
    background!: Phaser.GameObjects.Image;
    gameover_text!: Phaser.GameObjects.Text;
    private gameAreaBorder!: Phaser.GameObjects.Graphics;
    private gameConfig!: GameConfig;
    private theme!: GameTheme;

    constructor() {
        super('GameOver');
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
        if (this.gameover_text) {
            const scaleFactor = this.scale.height / 1080;
            const fontSize = Math.floor(64 * scaleFactor);
            this.gameover_text.setPosition(this.scale.width / 2, this.scale.height / 3);
            this.gameover_text.setStyle({ fontSize: `${fontSize}px` });
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

        this.gameover_text = this.add.text(
            this.scale.width / 2,
            this.scale.height / 3,
            'Game Over',
            {
                fontFamily: 'Arial',
                fontSize: 64,
                color: '#ffffff',
                align: 'center',
                fontStyle: 'bold'
            }
        );
        this.gameover_text.setOrigin(0.5);

        const button = this.add.text(
            this.scale.width / 2,
            this.scale.height / 3 * 2,
            'Try Again',
            {
                fontFamily: 'Arial',
                fontSize: 64,
                color: '#ffffff',
                backgroundColor: '#2d3a4a',
                padding: { left: 32, right: 32, top: 16, bottom: 16 },
                align: 'center',
                fontStyle: 'bold',
            }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerdown', () => {
            button.disableInteractive();
            this.scene.start('GameScene', this.gameConfig);
        });

        this.registerResizeHandler();
    }
}
