import { WordStatus } from '../types';

const STORAGE_KEY_FLASHCARDS = 'vocab_flashcards_local_stats_v1';

export type FlashcardStatsMap = Record<number, {
  status: WordStatus;
  correctCount: number;
  incorrectCount: number;
  lastReviewed?: string;
}>;

export function getFlashcardStats(): FlashcardStatsMap {
  try {
    const data = localStorage.getItem(STORAGE_KEY_FLASHCARDS);
    if (!data) return {};
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading flashcard stats:', e);
    return {};
  }
}

export function saveFlashcardWordResult(wordId: number, isCorrect: boolean): FlashcardStatsMap {
  const current = getFlashcardStats();
  const existing = current[wordId] || { status: 'not_practiced', correctCount: 0, incorrectCount: 0 };

  const newCorrect = existing.correctCount + (isCorrect ? 1 : 0);
  const newIncorrect = existing.incorrectCount + (isCorrect ? 0 : 1);

  let newStatus: WordStatus = 'in_progress';
  if (isCorrect) {
    if (newCorrect >= 2 && newIncorrect === 0) {
      newStatus = 'mastered';
    } else if (newCorrect >= 1) {
      newStatus = 'in_progress';
    }
  } else {
    newStatus = 'failed';
  }

  const updated: FlashcardStatsMap = {
    ...current,
    [wordId]: {
      status: newStatus,
      correctCount: newCorrect,
      incorrectCount: newIncorrect,
      lastReviewed: new Date().toISOString()
    }
  };

  try {
    localStorage.setItem(STORAGE_KEY_FLASHCARDS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving flashcard stats:', e);
  }

  return updated;
}

export function resetFlashcardStats(): FlashcardStatsMap {
  try {
    localStorage.removeItem(STORAGE_KEY_FLASHCARDS);
  } catch (e) {
    console.error('Error resetting flashcard stats:', e);
  }
  return {};
}
