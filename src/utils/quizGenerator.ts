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

// Generate 5 options (A, B, C, D, E) for Fill-in-the-blank hint
export function generateHintOptions(
  correctWord: VocabularyItem, 
  allVocabulary: VocabularyItem[]
): { options: string[]; correctLetter: string } {
  // Select 4 distinct distractor phrases
  const distractors = allVocabulary
    .filter(item => item.id !== correctWord.id && item.english.trim().toLowerCase() !== correctWord.english.trim().toLowerCase())
    .map(item => item.english);
  
  // Shuffle distractors and pick 4
  const shuffledDistractors = [...distractors].sort(() => Math.random() - 0.5).slice(0, 4);

  // Combine correct answer with 4 distractors
  const optionsList = [correctWord.english, ...shuffledDistractors];
  
  // Shuffle all 5 options
  const shuffledOptions = [...optionsList].sort(() => Math.random() - 0.5);

  const letters = ['a', 'b', 'c', 'd', 'e'];
  const correctIndex = shuffledOptions.indexOf(correctWord.english);
  const correctLetter = letters[correctIndex];

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
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);

  const totalRequested = 
    config.fillInBlankCount + 
    config.enToEsCount + 
    config.esToEnCount + 
    config.sentenceCount +
    (config.verbsStudyCount || 0) +
    (config.verbTensesCount || 0);

  if (shuffledPool.length === 0) {
    throw new Error("No hay palabras disponibles con los filtros o selección actual.");
  }

  // Verb pool for questions 5 & 6
  const verbPool = shuffledPool.filter(
    w => (w.group || '').toLowerCase() === 'verbs' || (w.group || '').toLowerCase() === 'verbos' || w.present || w.past
  );
  const effectiveVerbPool = verbPool.length > 0 ? verbPool : shuffledPool;
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

  // Shuffle final list of questions if desired, or keep grouped
  return questions;
}
