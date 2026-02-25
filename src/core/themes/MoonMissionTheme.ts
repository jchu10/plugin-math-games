import { GameTheme } from '../types';

export const MoonMissionTheme: GameTheme = {
    id: 'MoonMissionGame',
    backgroundImage: 'starrynight.png',
    answerObjectImages: ['asteroid1.png', 'asteroid2.png', 'asteroid3.png'],
    playerImage: 'spaceship.png',
    correctSoundFile: 'explosion.wav',
    shootSoundFile: 'lasershot.wav',
    answerLabelColor: '#fff',
    answerLabelStroke: '#000',
    answerLabelFontSize: 36,
    answerLabelStrokeWidth: 10,
    answerLabelShadow: true,
    answerSpawnFromBottom: false,
    answerScaleRange: [0.18, 0.35],
    answerDepth: 150,
    welcomeTextColor: '#ffffff',
    welcomeText: (controls) => controls === 'arrowKeys'
        ? 'Use the LEFT and RIGHT arrow keys to move your spaceship.\nPress SPACE to fire a laser at the correct answer!'
        : 'Tap the asteroid that shows the correct answer!',
};
