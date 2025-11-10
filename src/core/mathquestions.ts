// src/core/Question.ts
// 1. Stores master list of questions
// 2. Provide functions to pick questions based on past response and difficulty

import { MathQuestion, QuestionDifficulty } from './types';

const QUESTION_BANK: MathQuestion[] = [
  // VERY EASY
  { question: '2 + 5 = ?', correctAnswer: 7, options: [27, 7, 6, 17, 8, 6], difficulty: QuestionDifficulty.veryeasy },
  { question: '6 + 2 = ?', correctAnswer: 8, options: [18, 9, 8, 28, 5, 19], difficulty: QuestionDifficulty.veryeasy },
  { question: '8 - 5 = ?', correctAnswer: 3, options: [5, 2, 23, 3, 4, 13], difficulty: QuestionDifficulty.veryeasy },
  { question: '6 - 2 = ?', correctAnswer: 4, options: [4, 14, 19, 7, 3, 24], difficulty: QuestionDifficulty.veryeasy },
  { question: '4 + 9 = ?', correctAnswer: 13, options: [5, 33, 17, 12, 13, 23], difficulty: QuestionDifficulty.veryeasy },
  { question: '6 + 7 = ?', correctAnswer: 13, options: [12, 17, 23, 26, 33, 13], difficulty: QuestionDifficulty.veryeasy },

  // EASY
  { question: '30 + 8 = ?', correctAnswer: 38, options: [33, 38, 39, 28, 48, 42], difficulty: QuestionDifficulty.easy },
  { question: '70 + 4 = ?', correctAnswer: 74, options: [84, 35, 74, 72, 77, 64], difficulty: QuestionDifficulty.easy },
  { question: '89 - 7 = ?', correctAnswer: 82, options: [72, 86, 81, 82, 77, 92], difficulty: QuestionDifficulty.easy },
  { question: '78 - 4 = ?', correctAnswer: 74, options: [64, 75, 76, 84, 64, 74], difficulty: QuestionDifficulty.easy },
  { question: '53 + 5 = ?', correctAnswer: 58, options: [59, 68, 58, 48, 61, 53], difficulty: QuestionDifficulty.easy },
  { question: '72 + 4 = ?', correctAnswer: 76, options: [76, 55, 66, 77, 86, 74], difficulty: QuestionDifficulty.easy },

  // MEDIUM
  { question: '67 + 6 = ?', correctAnswer: 73, options: [74, 72, 61, 73, 63, 83], difficulty: QuestionDifficulty.medium },
  { question: '78 + 4 = ?', correctAnswer: 82, options: [72, 82, 92, 86, 81, 69], difficulty: QuestionDifficulty.medium },
  { question: '90 - 8 = ?', correctAnswer: 82, options: [92, 81, 84, 78, 82, 72], difficulty: QuestionDifficulty.medium },
  { question: '70 - 4 = ?', correctAnswer: 66, options: [65, 56, 35, 76, 61, 66], difficulty: QuestionDifficulty.medium },
  { question: '64 - 8 = ?', correctAnswer: 56, options: [72, 51, 55, 46, 56, 66], difficulty: QuestionDifficulty.medium },
  { question: '72 - 4 = ?', correctAnswer: 68, options: [67, 78, 68, 65, 41, 58], difficulty: QuestionDifficulty.medium },

  // HARD
  { question: '63 + 20 = ?', correctAnswer: 83, options: [83, 73, 84, 87, 93, 97], difficulty: QuestionDifficulty.hard },
  { question: '40 + 11 = ?', correctAnswer: 51, options: [41, 73, 55, 51, 52, 61], difficulty: QuestionDifficulty.hard },
  { question: '59 - 20 = ?', correctAnswer: 39, options: [49, 39, 37, 38, 41, 29], difficulty: QuestionDifficulty.hard },
  { question: '43 - 10 = ?', correctAnswer: 33, options: [32, 34, 55, 23, 43, 33], difficulty: QuestionDifficulty.hard },
  { question: '56 + 23 = ?', correctAnswer: 79, options: [88, 89, 78, 79, 77, 69], difficulty: QuestionDifficulty.hard },
  { question: '46 + 11 = ?', correctAnswer: 57, options: [57, 73, 67, 61, 47, 55], difficulty: QuestionDifficulty.hard },

  // VERY HARD
  { question: '26 - 15 = ?', correctAnswer: 11, options: [12, 31, 11, 21, 18, 9], difficulty: QuestionDifficulty.veryhard },
  { question: '43 - 11 = ?', correctAnswer: 32, options: [22, 50, 34, 47, 42, 32], difficulty: QuestionDifficulty.veryhard },
  { question: '36 + 28 = ?', correctAnswer: 64, options: [74, 46, 54, 66, 64, 70], difficulty: QuestionDifficulty.veryhard },
  { question: '46 + 15 = ?', correctAnswer: 61, options: [51, 77, 61, 58, 65, 71], difficulty: QuestionDifficulty.veryhard },
  { question: '63 - 26 = ?', correctAnswer: 37, options: [36, 54, 40, 47, 37, 27], difficulty: QuestionDifficulty.veryhard },
  { question: '43 - 15 = ?', correctAnswer: 28, options: [41, 28, 18, 24, 33, 38], difficulty: QuestionDifficulty.veryhard },
];

const getRandomElement = (arr: any[]) =>
  arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined

// 2. The service class that manages question logic
export class MathQuestionService {
  private questions: MathQuestion[];
  private currentDifficulty: QuestionDifficulty = QuestionDifficulty.medium;
  private availableQuestions: MathQuestion[];

  constructor() {
    this.questions = [...QUESTION_BANK]; // Copy the master list
    this.availableQuestions = this.filterByDifficulty(this.currentDifficulty);
  }

  private filterByDifficulty(difficulty: QuestionDifficulty): MathQuestion[] {
    return this.questions.filter(q => q.difficulty === difficulty);
  }

  // Pick a random question from the available questions
  public pickRandomQuestion(): MathQuestion | undefined {
    return getRandomElement(this.availableQuestions);
  }

  // update difficulty based on whether the last answer was correct
  public getNextQuestion(wasCorrect: boolean): MathQuestion {
    // This is your core game logic!
    if (!wasCorrect && Math.random() < 0.5) {
      // 50% chance to get easier
      if (this.currentDifficulty > QuestionDifficulty.easy) {
        this.currentDifficulty--;
      }
    }

    if (wasCorrect && Math.random() < 0.5) {
      // 50% chance to get harder
      if (this.currentDifficulty < QuestionDifficulty.veryhard) {
        this.currentDifficulty++;
      }
    }

    // Get all questions for the current difficulty
    let questionPool = this.filterByDifficulty(this.currentDifficulty);

    // If we've run out, reset the pool (or just use all questions)
    if (questionPool.length === 0) {
      console.warn(`No more questions at difficulty ${this.currentDifficulty}. Resetting pool.`);
      questionPool = this.filterByDifficulty(this.currentDifficulty);
    }

    // Pick a random question from the pool
    const randomIndex = Math.floor(Math.random() * questionPool.length);
    return questionPool[randomIndex];
  }
}
