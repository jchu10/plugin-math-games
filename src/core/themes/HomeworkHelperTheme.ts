import { GameTheme } from '../types';

export const HomeworkHelperTheme: GameTheme = {
    id: 'HomeworkHelperGame',
    backgroundImage: 'classroom.png',
    answerObjectImages: ['thoughtbubble.png', 'thoughtbubble2.png', 'thoughtbubble3.png'],
    playerImage: 'pencil.png',
    correctSoundFile: 'bubblepop.flac',
    shootSoundFile: 'lasershot.wav',
    answerLabelColor: '#000000',
    answerLabelStroke: '#ffffff',
    answerLabelFontSize: 32,
    answerLabelStrokeWidth: 5,
    answerLabelShadow: false,
    answerSpawnFromBottom: true,
    answerScaleRange: [0.28, 0.45],
    answerDepth: 50,
    welcomeTextColor: '#000000',
    welcomeText: (controls) => controls === 'arrowKeys'
        ? 'Use the LEFT and RIGHT arrow keys to move your pencil.\nPress SPACE to pop the thought bubble with the correct answer!'
        : 'Tap the thought bubble that shows the correct answer!',
};
