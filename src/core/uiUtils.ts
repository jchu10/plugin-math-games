// src/core/uiUtils.ts
// UI utility functions for layout and drawing helpers in GameScene
// Add more helpers as needed

import Phaser from 'phaser';

/**
 * Draws a rounded rectangle background.
 * @param scene The Phaser scene
 * @param x X position
 * @param y Y position
 * @param width Rectangle width
 * @param height Rectangle height
 * @param radius Corner radius
 * @param color Fill color (hex)
 * @param alpha Fill alpha
 * @returns The created Phaser.Graphics object
 */
export function drawRoundedRect(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number = 16,
    color: number = 0xffffff,
    alpha: number = 1
): Phaser.GameObjects.Graphics {
    const graphics = scene.add.graphics({ x, y });
    graphics.fillStyle(color, alpha);
    graphics.fillRoundedRect(0, 0, width, height, radius);
    return graphics;
}

/**
 * Draws a star shape at the given position.
 * @param graphics The Phaser.Graphics object
 * @param x X position
 * @param y Y position
 * @param points Number of star points
 * @param outerRadius Outer radius
 * @param innerRadius Inner radius
 * @param fillColor Fill color (hex)
 * @param strokeColor Stroke color (hex)
 */
export function drawStar(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    points: number,
    outerRadius: number,
    innerRadius: number,
    fillColor: number = 0xffd700,
    fillAlpha: number = 1,
    strokeColor: number = 0xffffff
) {
    const step = Math.PI / points;
    const start = (Math.PI / 2) * 3;
    graphics.beginPath();
    for (let i = 0; i < 2 * points; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = start + i * step;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) {
            graphics.moveTo(px, py);
        } else {
            graphics.lineTo(px, py);
        }
    }
    graphics.closePath();
    graphics.fillStyle(fillColor, fillAlpha);
    graphics.fillPath();
    graphics.lineStyle(2, strokeColor, 1);
    graphics.strokePath();
}