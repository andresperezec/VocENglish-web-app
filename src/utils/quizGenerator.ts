import { VocabularyItem, ExerciseQuestion, QuestionConfig, ExerciseType } from '../types';

export function countWordsInPhrase(phrase: string): number {
  return phrase.trim().split(/\s+/).filter(Boolean).length;
}

export function generateBlankPlaceholders(phrase: string): string {
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  return words.map(() => "____").join(" ");
}

export function buildContextSentenceWithBlanks(word: VocabularyItem): { sentence: string; wordCount: number } {
  const wordCount = countWordsInPhrase(word.english);
  const blanks = generateBlankPlaceholders(word.english);

  if (word.exampleSentence && word.exampleSentence.includes("____")) {
    return {
      sentence: word.exampleSentence,
      wordCount
    };
  }

  // Fallback default sentence template
  return {
    sentence: `In everyday conversation, people often say: "${blanks}".`,
    wordCount
  };
}

const FALLBACK_DISTRACTORS: Record<number, string[]> = {
  1: ["always", "never", "before", "around", "behind", "smoothly", "quietly", "suddenly", "instead", "towards", "perhaps", "already", "somewhere", "together"],
  2: ["push in", "get off", "take over", "bring up", "turn down", "keep on", "look for", "give in", "run out", "set up", "hold on", "break down", "call off", "carry out"],
  3: ["get along with", "look forward to", "run out of", "keep up with", "come up with", "cut down on", "make up for", "face up to", "check up on", "back out of"],
  4: ["as far as possible", "from time to time", "at the end of", "in the middle of", "all of a sudden", "once in a while"]
};

// Helper: Shuffle array randomly
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate 5 options (A, B, C, D, E) for Fill-in-the-blank hint matching the EXACT word count
export function generateHintOptions(
  correctWord: VocabularyItem, 
  allVocabulary: VocabularyItem[]
): { options: string[]; correctLetter: string } {
  const targetWordCount = countWordsInPhrase(correctWord.english);
  const correctNorm = correctWord.english.trim().toLowerCase();

  // Find matching distractors in allVocabulary with same word count
  const matchingFromVocab = allVocabulary
    .filter(item => {
      const norm = item.english.trim().toLowerCase();
      return norm !== correctNorm && countWordsInPhrase(item.english) === targetWordCount;
    })
    .map(item => item.english.trim());

  // Deduplicate
  const uniqueMatching = Array.from(new Set(matchingFromVocab));

  // If we don't have enough from vocabulary, draw from FALLBACK_DISTRACTORS
  const fallbackPool = FALLBACK_DISTRACTORS[targetWordCount] || [
    `phrase ${targetWordCount} one`,
    `phrase ${targetWordCount} two`,
    `phrase ${targetWordCount} three`,
    `phrase ${targetWordCount} four`
  ];

  const pool = [...uniqueMatching];
  for (const f of fallbackPool) {
    if (pool.length >= 10) break;
    if (f.toLowerCase() !== correctNorm && !pool.map(p => p.toLowerCase()).includes(f.toLowerCase())) {
      pool.push(f);
    }
  }

  // Shuffle distractors and pick 4
  const selectedDistractors = shuffleArray(pool).slice(0, 4);

  // If still fewer than 4 distractors (e.g., custom word count), generate synthetic N-word distractors
  while (selectedDistractors.length < 4) {
    const dummyWords = ["alpha", "beta", "gamma", "delta", "epsilon", "omega"];
    const synthetic = Array.from({ length: targetWordCount }, (_, idx) => dummyWords[(selectedDistractors.length + idx) % dummyWords.length]).join(" ");
    if (!selectedDistractors.includes(synthetic) && synthetic.toLowerCase() !== correctNorm) {
      selectedDistractors.push(synthetic);
    }
  }

  // Combine correct answer with 4 distractors
  const optionsList = [correctWord.english.trim(), ...selectedDistractors];
  
  // Shuffle all 5 options
  const shuffledOptions = shuffleArray(optionsList);

  const letters = ['a', 'b', 'c', 'd', 'e'];
  const correctIndex = shuffledOptions.findIndex(opt => opt.toLowerCase() === correctNorm);
  const correctLetter = letters[correctIndex >= 0 ? correctIndex : 0];

  return {
    options: shuffledOptions,
    correctLetter
  };
}

export function createQuizQuestions(
  config: QuestionConfig, 
  availableVocabulary: VocabularyItem[],
  allVocabulary: VocabularyItem[]
): ExerciseQuestion[] {
  // Filter available vocabulary based on selected word IDs or selected statuses
  let pool = availableVocabulary;
  if (config.selectedWordIds && config.selectedWordIds.length > 0) {
    pool = pool.filter(w => config.selectedWordIds.includes(w.id));
  } else if (config.selectedStatuses && config.selectedStatuses.length > 0) {
    pool = pool.filter(w => config.selectedStatuses.includes(w.status));
  }

  // Shuffle pool to ensure random sampling without replacement
  const shuffledPool = shuffleArray(pool);

  if (shuffledPool.length === 0) {
    throw new Error("No hay palabras disponibles con los filtros o selección actual.");
  }

  // REQUIREMENT 5: Questions 5 & 6 ONLY admit words from the 'Verbs' (Verbos) folder
  const allVerbsInSystem = allVocabulary.filter(
    w => (w.group || '').trim().toLowerCase() === 'verbs' || (w.group || '').trim().toLowerCase() === 'verbos'
  );

  // Check if user selected specific words from the 'Verbs' folder
  let selectedVerbs = pool.filter(
    w => (w.group || '').trim().toLowerCase() === 'verbs' || (w.group || '').trim().toLowerCase() === 'verbos'
  );

  // If user selected 0 words in 'Verbs', default to ALL words from the 'Verbs' folder
  if (selectedVerbs.length === 0) {
    selectedVerbs = allVerbsInSystem;
  }

  const effectiveVerbPool = shuffleArray(selectedVerbs.length > 0 ? selectedVerbs : allVocabulary);
  let verbIndex = 0;

  const getNextVerb = (): VocabularyItem => {
    const v = effectiveVerbPool[verbIndex % effectiveVerbPool.length];
    verbIndex++;
    return v;
  };

  let wordIndex = 0;
  const getNextWord = (): VocabularyItem => {
    if (wordIndex >= shuffledPool.length) {
      // Loop back or fallback if user requested many questions
      const word = shuffledPool[wordIndex % shuffledPool.length];
      wordIndex++;
      return word;
    }
    const word = shuffledPool[wordIndex];
    wordIndex++;
    return word;
  };

  const questions: ExerciseQuestion[] = [];

  // 1. Fill in the Blank questions
  for (let i = 0; i < config.fillInBlankCount; i++) {
    const word = getNextWord();
    const { sentence, wordCount } = buildContextSentenceWithBlanks(word);
    const { options, correctLetter } = generateHintOptions(word, allVocabulary);

    questions.push({
      id: `fib_${word.id}_${i}_${Date.now()}`,
      word,
      type: 'fill_in_blank',
      contextSentence: sentence,
      targetPhrase: word.english,
      spanishText: word.spanish,
      blankCount: wordCount,
      options,
      correctOptionLetter: correctLetter
    });
  }

  // 2. English -> Spanish questions
  for (let i = 0; i < config.enToEsCount; i++) {
    const word = getNextWord();
    questions.push({
      id: `en_es_${word.id}_${i}_${Date.now()}`,
      word,
      type: 'en_to_es',
      targetPhrase: word.spanish,
      spanishText: word.spanish
    });
  }

  // 3. Spanish -> English questions
  for (let i = 0; i < config.esToEnCount; i++) {
    const word = getNextWord();
    questions.push({
      id: `es_en_${word.id}_${i}_${Date.now()}`,
      word,
      type: 'es_to_en',
      targetPhrase: word.english,
      spanishText: word.spanish
    });
  }

  // 4. Sentence Construction questions
  for (let i = 0; i < config.sentenceCount; i++) {
    const word = getNextWord();
    questions.push({
      id: `sent_${word.id}_${i}_${Date.now()}`,
      word,
      type: 'sentence_construction',
      targetPhrase: word.english,
      spanishText: word.spanish
    });
  }

  // 5. Verbs Study questions
  const verbsStudyCount = config.verbsStudyCount || 0;
  const verbFields: Array<'present' | 'past' | 'pastParticiple' | 'spanish'> = ['present', 'past', 'pastParticiple', 'spanish'];
  for (let i = 0; i < verbsStudyCount; i++) {
    const word = getNextVerb();
    const givenField = verbFields[i % verbFields.length];
    questions.push({
      id: `vstudy_${word.id}_${i}_${Date.now()}`,
      word,
      type: 'verbs_study',
      targetPhrase: word.english,
      spanishText: word.spanish,
      givenField
    });
  }

  // 6. Verb Tenses questions
  const verbTensesCount = config.verbTensesCount || 0;
  const tenses = [
    'Present Simple',
    'Present Continuous',
    'Present Perfect',
    'Present Perfect Continuous',
    'Past Simple',
    'Past Continuous',
    'Past Perfect',
    'Past Perfect Continuous',
    'Future Simple (Will)',
    'Future Continuous',
    'Future Perfect',
    'Future Perfect Continuous',
    'Going to (Future)',
    'Conditional Simple',
    'Conditional Continuous',
    'Conditional Perfect'
  ];
  for (let i = 0; i < verbTensesCount; i++) {
    const word = getNextVerb();
    const tenseName = tenses[i % tenses.length];
    const direction: 'en_to_es' | 'es_to_en' = i % 2 === 0 ? 'en_to_es' : 'es_to_en';
    
    // Default tense sentences based on verb form
    const presentForm = word.present || word.english;
    const pastForm = word.past || `${word.english}ed`;
    const participleForm = word.pastParticiple || pastForm;

    let targetSentence = `I ${presentForm} every day.`;
    let expectedTranslation = `Yo ${word.spanish} todos los días.`;

    if (tenseName === 'Present Simple') {
      targetSentence = `I usually ${presentForm} every morning.`;
      expectedTranslation = `Normalmente ${word.spanish} todas las mañanas.`;
    } else if (tenseName === 'Past Simple') {
      targetSentence = `Yesterday, I ${pastForm}.`;
      expectedTranslation = `Ayer, yo ${word.spanish}.`;
    } else if (tenseName === 'Present Perfect') {
      targetSentence = `I have ${participleForm} many times.`;
      expectedTranslation = `He ${word.spanish} muchas veces.`;
    } else if (tenseName === 'Future Simple (Will)') {
      targetSentence = `I will ${presentForm} tomorrow.`;
      expectedTranslation = `Mañana ${word.spanish}.`;
    }

    if (direction === 'es_to_en') {
      const temp = targetSentence;
      targetSentence = expectedTranslation;
      expectedTranslation = temp;
    }

    questions.push({
      id: `vtense_${word.id}_${i}_${Date.now()}`,
      word,
      type: 'verb_tenses',
      targetPhrase: expectedTranslation,
      spanishText: word.spanish,
      verbTenseName: tenseName,
      tenseDirection: direction,
      targetSentence,
      expectedTranslation
    });
  }

  // Shuffle final list of questions so question types appear in random order
  return shuffleArray(questions);
}
