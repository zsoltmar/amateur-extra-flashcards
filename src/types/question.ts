export interface Question {
  id: string;
  correct: number;
  refs: string;
  question: string;
  answers: string[];
}

export interface FlashcardStats {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
}

export type FlashcardMode = 'qa' | 'highlighted' | 'answer-highlighted' | 'multiple-choice';

export interface FlashcardState {
  questions: Question[];
  currentIndex: number;
  mode: FlashcardMode;
  stats: FlashcardStats;
  selectedAnswer: number | null;
  showResult: boolean;
}
