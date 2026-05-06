import { GameTheme } from '../types';

export const UnderwaterDiverTheme: GameTheme = {
    id: 'UnderwaterDiverGame',
    backgroundImage: 'underwater.png',
    answerObjectImages: ['fish1.png', 'fish2.png', 'fish3.png'],
    playerImage: 'submarine.png',
    correctSoundFile: 'splash.wav',
    shootSoundFile: 'bubble.wav',
    answerLabelColor: '#ffffff',
    answerLabelStroke: '#003366',
    answerLabelFontSize: 34,
    answerLabelStrokeWidth: 8,
    answerLabelShadow: true,
    answerSpawnFromBottom: true,
    playerPosition: 'top',
    answerScaleRange: [0.20, 0.38],
    answerDepth: 120,
    welcomeTextColor: '#003366',
    welcomeText: (controls) => controls === 'arrowKeys'
        ? 'Move your submarine LEFT and RIGHT.\nPress SPACE to fire at the correct answer below!'
        : 'Tap the fish that shows the correct answer!',
};
