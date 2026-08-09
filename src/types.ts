export type WordStatus = 'mastered' | 'in_progress' | 'failed' | 'not_practiced';

export interface VocabularyItem {
  id: number;
  english: string;
  spanish: string;
  group?: string;
  status: WordStatus;
  attempts: number;
  correctCount: number;
  lastPracticed?: string;
  exampleSentence?: string; // Sentence containing the phrase
  notes?: string; // Optional note or grammar rule for the card
  present?: string; // Present tense (V1) for verbs
  past?: string; // Past tense (V2) for verbs
  pastParticiple?: string; // Past Participle (V3) for verbs
  isVerb?: boolean; // Flag if validated as verb or not
}

export type ExerciseType =
  | 'fill_in_blank'
  | 'en_to_es'
  | 'es_to_en'
  | 'sentence_construction'
  | 'verbs_study'
  | 'verb_tenses';

export interface QuestionConfig {
  fillInBlankCount: number;
  enToEsCount: number;
  esToEnCount: number;
  sentenceCount: number;
  verbsStudyCount: number;
  verbTensesCount: number;
  selectedStatuses: WordStatus[];
  selectedGroup?: string;
  selectedWordIds: number[]; // IDs selected in checklist
}

export interface ExerciseQuestion {
  id: string;
  word: VocabularyItem;
  type: ExerciseType;
  contextSentence?: string; // Sentence with blanks or for context
  targetPhrase: string;
  spanishText: string;
  blankCount?: number; // Word count of target phrase
  options?: string[]; // 5 randomized choices for hint
  correctOptionLetter?: string; // 'a', 'b', 'c', 'd', 'e'
  givenField?: 'present' | 'past' | 'pastParticiple' | 'spanish';
  verbTenseName?: string;
  tenseDirection?: 'en_to_es' | 'es_to_en';
  targetSentence?: string;
  expectedTranslation?: string;
  verbData?: {
    present: string;
    past: string;
    pastParticiple: string;
    spanish: string;
    promptKey: 'present' | 'past' | 'pastParticiple' | 'spanish';
  };
  tenseInfo?: {
    name: string;
    formula: string;
    group?: string;
  };
  direction?: 'en_to_es' | 'es_to_en';
}

export interface AttemptLog {
  questionId: string;
  wordId: number;
  exerciseType: ExerciseType;
  userAnswer: string;
  isCorrect: boolean;
  timestamp: string;
  feedback?: string;
  translatedSentence?: string;
}

export interface QuestionResult {
  questionId: string;
  wordId: number;
  type: ExerciseType;
  userAnswer: string;
  isCorrect: boolean;
  attemptsNeeded: number;
  feedback?: string;
  translatedSentence?: string;
}

export interface QuizHistory {
  id: string;
  date: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  breakdown: {
    fillInBlank: { total: number; correct: number };
    enToEs: { total: number; correct: number };
    esToEn: { total: number; correct: number };
    sentence: { total: number; correct: number };
    verbsStudy?: { total: number; correct: number };
    verbTenses?: { total: number; correct: number };
  };
  wordIdsUsed: number[];
}

export interface PendingCardWord {
  id: string;
  word: string;
  targetGroup: string;
  addedAt: string;
}

