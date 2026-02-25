import * as Phaser from 'phaser';

/**
 * Shared base class for all Math Games Phaser scenes.
 *
 * Centralises the game-area layout calculation that was previously
 * copy-pasted across GameWelcome, GameScene, and GameOver.
 *
 * Subclasses call calculateGameArea() in create() and implement
 * onResize() to reposition their own scene-specific objects.
 */
export abstract class BaseGameScene extends Phaser.Scene {
    constructor(key: string) {
        super(key);
    }

    protected gameAreaX: number = 0;
    protected gameAreaY: number = 0;
    protected gameAreaSize: number = 0;
    protected gameAreaHeight: number = 0;

    protected calculateGameArea(): void {
        this.gameAreaHeight = Math.floor(this.scale.height - 10);
        this.gameAreaSize = Math.floor(this.gameAreaHeight * 1.5);
        this.gameAreaX = (this.scale.width - this.gameAreaSize) / 2;
        this.gameAreaY = (this.scale.height - this.gameAreaHeight) / 2;
    }

    protected drawGameAreaBorder(graphics: Phaser.GameObjects.Graphics): void {
        graphics.clear();
        graphics.lineStyle(4, 0x000000, 1);
        graphics.strokeRect(this.gameAreaX, this.gameAreaY, this.gameAreaSize, this.gameAreaHeight);
    }

    protected abstract onResize(): void;

    protected registerResizeHandler(): void {
        this.scale.on('resize', () => {
            this.calculateGameArea();
            this.onResize();
        }, this);
    }
}
