import { Scene } from 'phaser';

export class GameOverMoonMission extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameover_text : Phaser.GameObjects.Text;
    private gameAreaBorder!: Phaser.GameObjects.Graphics;

    constructor ()
    {
        super('GameOverMoonMission');
    }
    
    private handleResize() {
        // Calculate game area dimensions
        const gameAreaHeight = Math.floor(this.scale.height * 0.9);
        const gameAreaSize = Math.floor(gameAreaHeight * 1.5);
        const gameAreaX = (this.scale.width - gameAreaSize) / 2;
        const gameAreaY = (this.scale.height - gameAreaHeight) / 2;
        
        // Update background
        if (this.background) {
            this.background.setPosition(gameAreaX + gameAreaSize / 2, gameAreaY + gameAreaHeight / 2);
            this.background.setDisplaySize(gameAreaSize, gameAreaHeight);
        }
        
        // Update border
        if (this.gameAreaBorder) {
            this.gameAreaBorder.clear();
            this.gameAreaBorder.lineStyle(4, 0x000000, 1);
            this.gameAreaBorder.strokeRect(gameAreaX, gameAreaY, gameAreaSize, gameAreaHeight);
        }
        
        // Update text
        if (this.gameover_text) {
            const scaleFactor = this.scale.height / 1080;
            const fontSize = Math.floor(64 * scaleFactor);
            this.gameover_text.setPosition(this.scale.width / 2, this.scale.height / 2);
            this.gameover_text.setStyle({ fontSize: `${fontSize}px` });
        }
    }

    create ()
    {
        // Set camera background to white
        this.cameras.main.setBackgroundColor('#ffffff');

        // Calculate game area dimensions (same as MoonMissionGame)
        const gameAreaHeight = Math.floor(this.scale.height * 0.9);
        const gameAreaSize = Math.floor(gameAreaHeight * 1.5);
        const gameAreaX = (this.scale.width - gameAreaSize) / 2;
        const gameAreaY = (this.scale.height - gameAreaHeight) / 2;

        // Show starrynight background in game dimensions
        this.background = this.add.image(
            gameAreaX + gameAreaSize / 2,
            gameAreaY + gameAreaHeight / 2,
            'starrynight'
        );
        this.background.setDisplaySize(gameAreaSize, gameAreaHeight);
        this.background.setOrigin(0.5, 0.5);

        // Add black border around game area
        this.gameAreaBorder = this.add.graphics();
        this.gameAreaBorder.lineStyle(4, 0x000000, 1);
        this.gameAreaBorder.strokeRect(gameAreaX, gameAreaY, gameAreaSize, gameAreaHeight);
        this.gameAreaBorder.setDepth(100);
        
        // Listen for resize events
        this.scale.on('resize', this.handleResize, this);

        // Add Game Over text
        this.gameover_text = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
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

        this.input.once('pointerdown', () => {
            // Instead of MainMenu, reload the page to return to GameSelect
            window.location.reload();
        });
    }
}

