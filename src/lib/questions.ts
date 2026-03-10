import { Question } from '@/types/question';

export async function loadQuestions(): Promise<Question[]> {
  try {
    // In production, you'd fetch this from your API or public folder
    const response = await fetch('/api/questions');
    if (!response.ok) {
      throw new Error('Failed to load questions');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading questions:', error);
    return [];
  }
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
