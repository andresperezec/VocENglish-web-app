import React, { useState, useEffect } from 'react';
import { ExerciseQuestion, QuestionResult, VocabularyItem } from '../types';
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, RefreshCcw, Sparkles, Send, Lightbulb, MessageSquare, Eye, Languages, Volume2, LogOut } from 'lucide-react';
import { playPronunciation } from '../utils/audio';
import { PracticePendingWordsPanel } from './PracticePendingWordsPanel';


interface QuizRunnerProps {
  questions: ExerciseQuestion[];
  onCompleteQuiz: (results: QuestionResult[]) => void;
  onUpdateWordStatus: (wordId: number, isCorrect: boolean) => void;
  onExitQuiz?: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  questions,
  onCompleteQuiz,
  onUpdateWordStatus,
  onExitQuiz
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showMeaning, setShowMeaning] = useState<boolean>(false);
  const [wasAnswerRevealed, setWasAnswerRevealed] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Status for current question attempt
  const [isEvaluated, setIsEvaluated] = useState<boolean>(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [spanishSentenceTranslation, setSpanishSentenceTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [attemptsOnCurrentQuestion, setAttemptsOnCurrentQuestion] = useState<number>(0);

  // Dynamic AI Fill in the Blank sentence state
  const [overrideSentence, setOverrideSentence] = useState<string | null>(null);
  const [isGeneratingSentence, setIsGeneratingSentence] = useState<boolean>(false);

  // Sentence Construction extra state (Toggle translation & AI Extra Examples)
  const [showSpanishTranslation, setShowSpanishTranslation] = useState<boolean>(false);
  const [extraExamples, setExtraExamples] = useState<Array<{ english: string; spanish: string }> | null>(null);
  const [isGeneratingExamples, setIsGeneratingExamples] = useState<boolean>(false);

  // Verbs Study states
  const [vStudyPresentInput, setVStudyPresentInput] = useState<string>('');
  const [vStudyPastInput, setVStudyPastInput] = useState<string>('');
  const [vStudyParticipleInput, setVStudyParticipleInput] = useState<string>('');
  const [vStudySpanishInput, setVStudySpanishInput] = useState<string>('');
  const [verbTenseExamples, setVerbTenseExamples] = useState<Array<{ tense: string; sentence: string; translation: string }> | null>(null);
  const [isGeneratingVerbTenseExamples, setIsGeneratingVerbTenseExamples] = useState<boolean>(false);

  // Practicar Tiempos Verbales dynamic AI state
  const [aiVerbTenseTargetSentence, setAiVerbTenseTargetSentence] = useState<string | null>(null);
  const [aiVerbTenseExpectedTranslation, setAiVerbTenseExpectedTranslation] = useState<string | null>(null);
  const [isGeneratingVerbTenseSentence, setIsGeneratingVerbTenseSentence] = useState<boolean>(false);

  // Accumulated results
  const [results, setResults] = useState<QuestionResult[]>([]);

  const currentQuestion = questions[currentIndex];

  // Auto-generate AI Fill in the Blank sentence & reset states when question changes
  useEffect(() => {
    setOverrideSentence(null);
    setShowSpanishTranslation(false);
    setExtraExamples(null);
    setIsGeneratingExamples(false);
    setShowMeaning(false);
    setShowHint(false);
    setUserInput('');
    setIsEvaluated(false);
    setWasAnswerRevealed(false);
    setFeedback(null);
    setSpanishSentenceTranslation(null);
    setAttemptsOnCurrentQuestion(0);

    setVStudyPresentInput('');
    setVStudyPastInput('');
    setVStudyParticipleInput('');
    setVStudySpanishInput('');
    setVerbTenseExamples(null);
    setIsGeneratingVerbTenseExamples(false);

    setAiVerbTenseTargetSentence(null);
    setAiVerbTenseExpectedTranslation(null);
    setIsGeneratingVerbTenseSentence(false);

    if (currentQuestion && currentQuestion.type === 'fill_in_blank') {
      handleRegenerateSentence();
    } else if (currentQuestion && currentQuestion.type === 'verb_tenses') {
      handleFetchVerbTenseSentence();
    }
  }, [currentIndex]);

  if (!currentQuestion) {
    return null;
  }

  // Handler to fetch/regenerate dynamic fill in the blank sentence
  const handleRegenerateSentence = async () => {
    if (!currentQuestion || currentQuestion.type !== 'fill_in_blank') return;
    setIsGeneratingSentence(true);
    try {
      const res = await fetch('/api/generate-fill-blank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordEnglish: currentQuestion.word.english,
          wordSpanish: currentQuestion.word.spanish,
          currentSentence: overrideSentence || currentQuestion.contextSentence
        })
      });
      const data = await res.json();
      if (data && data.sentence) {
        setOverrideSentence(data.sentence);
      }
    } catch (err) {
      console.error("Error generating fill in blank sentence:", err);
    } finally {
      setIsGeneratingSentence(false);
    }
  };

  // Handler to fetch extra examples using Gemini AI
  const handleFetchExtraExamples = async () => {
    if (!currentQuestion) return;
    setIsGeneratingExamples(true);
    try {
      const res = await fetch('/api/generate-extra-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordEnglish: currentQuestion.word.english,
          wordSpanish: currentQuestion.word.spanish
        })
      });
      const data = await res.json();
      if (data && data.examples && Array.isArray(data.examples)) {
        setExtraExamples(data.examples);
      }
    } catch (err) {
      console.error("Error fetching extra examples:", err);
    } finally {
      setIsGeneratingExamples(false);
    }
  };

  // Handler to fetch verb examples in each tense using Gemini AI
  const handleFetchVerbTenseExamples = async () => {
    if (!currentQuestion) return;
    setIsGeneratingVerbTenseExamples(true);
    try {
      const res = await fetch('/api/generate-verb-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          present: currentQuestion.word.present || currentQuestion.word.english,
          past: currentQuestion.word.past || '',
          pastParticiple: currentQuestion.word.pastParticiple || '',
          spanish: currentQuestion.word.spanish
        })
      });
      const data = await res.json();
      if (data && data.examples && Array.isArray(data.examples)) {
        setVerbTenseExamples(data.examples);
      } else if (data) {
        const fallbackExamples = [];
        if (data.presentSentence) fallbackExamples.push({ tense: 'Present Simple', sentence: data.presentSentence.english, translation: data.presentSentence.spanish });
        if (data.pastSentence) fallbackExamples.push({ tense: 'Past Simple', sentence: data.pastSentence.english, translation: data.pastSentence.spanish });
        if (data.perfectSentence) fallbackExamples.push({ tense: 'Present Perfect', sentence: data.perfectSentence.english, translation: data.perfectSentence.spanish });
        setVerbTenseExamples(fallbackExamples);
      }
    } catch (err) {
      console.error("Error fetching verb tense examples:", err);
    } finally {
      setIsGeneratingVerbTenseExamples(false);
    }
  };

  // Handler to fetch dynamic AI verb tense conjugated sentence
  const handleFetchVerbTenseSentence = async () => {
    if (!currentQuestion || currentQuestion.type !== 'verb_tenses') return;
    setIsGeneratingVerbTenseSentence(true);
    try {
      const res = await fetch('/api/generate-verb-tense-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verb: currentQuestion.word,
          tenseName: currentQuestion.verbTenseName
        })
      });
      const data = await res.json();
      if (data && data.englishSentence && data.spanishSentence) {
        if (currentQuestion.tenseDirection === 'es_to_en') {
          setAiVerbTenseTargetSentence(data.spanishSentence);
          setAiVerbTenseExpectedTranslation(data.englishSentence);
        } else {
          setAiVerbTenseTargetSentence(data.englishSentence);
          setAiVerbTenseExpectedTranslation(data.spanishSentence);
        }
      }
    } catch (err) {
      console.error("Error generating verb tense sentence:", err);
    } finally {
      setIsGeneratingVerbTenseSentence(false);
    }
  };

  // Helper string normalizer
  const normalize = (str: string) =>
    str
      ? str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w\s]/gi, "")
          .trim()
      : "";

  const handleShowAnswer = () => {
    let correctAnswer = '';
    if (currentQuestion.type === 'fill_in_blank') {
      correctAnswer = currentQuestion.targetPhrase;
    } else if (currentQuestion.type === 'en_to_es') {
      correctAnswer = currentQuestion.word.spanish;
    } else if (currentQuestion.type === 'es_to_en') {
      correctAnswer = currentQuestion.word.english;
    } else if (currentQuestion.type === 'sentence_construction') {
      correctAnswer = `Expresión requerida: "${currentQuestion.word.english}" (${currentQuestion.word.spanish})`;
    } else if (currentQuestion.type === 'verbs_study') {
      const p = currentQuestion.word.present || currentQuestion.word.english;
      const pa = currentQuestion.word.past || '-';
      const pp = currentQuestion.word.pastParticiple || '-';
      const sp = currentQuestion.word.spanish;
      setVStudyPresentInput(p);
      setVStudyPastInput(pa);
      setVStudyParticipleInput(pp);
      setVStudySpanishInput(sp);
      correctAnswer = `Presente: "${p}", Pasado: "${pa}", Participio: "${pp}", Significado: "${sp}"`;
    } else if (currentQuestion.type === 'verb_tenses') {
      correctAnswer = aiVerbTenseExpectedTranslation || currentQuestion.expectedTranslation || currentQuestion.targetPhrase;
      setUserInput(correctAnswer);
    }

    const newAttemptCount = attemptsOnCurrentQuestion + 1;
    setAttemptsOnCurrentQuestion(newAttemptCount);
    setIsEvaluated(true);
    setIsCurrentCorrect(false);
    setWasAnswerRevealed(true);
    
    if (currentQuestion.type !== 'sentence_construction' && currentQuestion.type !== 'verbs_study') {
      setUserInput(correctAnswer);
    }

    setFeedback(`La respuesta correcta es: "${correctAnswer}". Esta pregunta ha sido calificada automáticamente como un ERROR.`);
    
    // Automatically qualify as error
    onUpdateWordStatus(currentQuestion.word.id, false);
  };

  const handleEvaluateAnswer = async () => {
    if (currentQuestion.type !== 'verbs_study' && !userInput.trim()) return;

    setIsLoading(true);
    setFeedback(null);
    setSpanishSentenceTranslation(null);
    const newAttemptCount = attemptsOnCurrentQuestion + 1;
    setAttemptsOnCurrentQuestion(newAttemptCount);

    if (currentQuestion.type === 'sentence_construction') {
      // Type D: Server-side Gemini evaluation for sentence construction
      try {
        const res = await fetch('/api/evaluate-sentence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wordEnglish: currentQuestion.word.english,
            wordSpanish: currentQuestion.word.spanish,
            userSentence: userInput.trim()
          })
        });

        const data = await res.json();
        setIsEvaluated(true);

        if (data.isCorrect) {
          setIsCurrentCorrect(true);
          setFeedback(data.feedback || "¡Excelente! Tu oración es gramaticalmente correcta y usaste el vocabulario perfectamente.");
          setSpanishSentenceTranslation(data.spanishTranslation || null);
          onUpdateWordStatus(currentQuestion.word.id, newAttemptCount === 1);
        } else {
          setIsCurrentCorrect(false);
          setFeedback(data.feedback || "Tu oración necesita corrección. Por favor lee los detalles y vuelve a intentarlo.");
          onUpdateWordStatus(currentQuestion.word.id, false);
        }
      } catch (err) {
        // Fallback local evaluation
        const containsWord = normalize(userInput).includes(normalize(currentQuestion.word.english));
        const isLongEnough = userInput.trim().split(/\s+/).length >= 3;
        const success = containsWord && isLongEnough;

        setIsEvaluated(true);
        setIsCurrentCorrect(success);
        if (success) {
          setFeedback("¡Muy bien! Usaste la expresión correctamente en tu oración.");
          setSpanishSentenceTranslation(`Traducción: "${userInput.trim()}"`);
          onUpdateWordStatus(currentQuestion.word.id, newAttemptCount === 1);
        } else {
          setFeedback(`Recuerda que tu oración debe incluir exactamente la palabra "${currentQuestion.word.english}" y ser una oración completa.`);
          onUpdateWordStatus(currentQuestion.word.id, false);
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (currentQuestion.type === 'fill_in_blank') {
      // Type A: Fill in the blank matching target phrase
      const normInput = normalize(userInput);
      const normTarget = normalize(currentQuestion.targetPhrase);
      const success = normInput === normTarget;

      setIsEvaluated(true);
      setIsCurrentCorrect(success);

      if (success) {
        setFeedback(`¡Correcto! La expresión es "${currentQuestion.targetPhrase}" (${currentQuestion.spanishText}).`);
        onUpdateWordStatus(currentQuestion.word.id, newAttemptCount === 1);
      } else {
        setFeedback(`Incorrecto. Inténtalo de nuevo. Asegúrate de escribir la frase exacta (${currentQuestion.blankCount} palabras).`);
        onUpdateWordStatus(currentQuestion.word.id, false);
      }
      setIsLoading(false);
      return;
    }

    if (currentQuestion.type === 'en_to_es') {
      // Type B: English -> Spanish Translation
      try {
        const res = await fetch('/api/check-translation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceText: currentQuestion.word.english,
            targetText: userInput.trim(),
            expectedText: currentQuestion.word.spanish,
            direction: 'en_to_es'
          })
        });
        const data = await res.json();
        setIsEvaluated(true);
        setIsCurrentCorrect(data.isCorrect);

        if (data.isCorrect) {
          setFeedback(`¡Muy bien! Traducción correcta: "${currentQuestion.word.spanish}".`);
          onUpdateWordStatus(currentQuestion.word.id, newAttemptCount === 1);
        } else {
          setFeedback(data.feedback || `La traducción esperada es: "${currentQuestion.word.spanish}". Por favor escribe la versión correcta para continuar.`);
          onUpdateWordStatus(currentQuestion.word.id, false);
        }
      } catch (err) {
        const normInput = normalize(userInput);
        const normTarget = normalize(currentQuestion.targetPhrase);
        const success = normInput === normTarget || normTarget.includes(normInput);

        setIsEvaluated(true);
        setIsCurrentCorrect(success);
        setFeedback(success 
          ? `¡Correcto! La traducción es "${currentQuestion.targetPhrase}".`
          : `Incorrecto. La respuesta esperada es "${currentQuestion.targetPhrase}". Escríbela correctamente para continuar.`
        );
        onUpdateWordStatus(currentQuestion.word.id, success && newAttemptCount === 1);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (currentQuestion.type === 'es_to_en') {
      // Type C: Spanish -> English Translation
      try {
        const res = await fetch('/api/check-translation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceText: currentQuestion.word.spanish,
            targetText: userInput.trim(),
            expectedText: currentQuestion.word.english,
            direction: 'es_to_en'
          })
        });
        const data = await res.json();
        setIsEvaluated(true);
        setIsCurrentCorrect(data.isCorrect);

        if (data.isCorrect) {
          setFeedback(`¡Excelente! Traducción correcta en inglés: "${currentQuestion.word.english}".`);
          onUpdateWordStatus(currentQuestion.word.id, newAttemptCount === 1);
        } else {
          setFeedback(data.feedback || `La respuesta correcta en inglés es: "${currentQuestion.word.english}". Por favor escríbela correctamente para avanzar.`);
          onUpdateWordStatus(currentQuestion.word.id, false);
        }
      } catch (err) {
        const normInput = normalize(userInput);
        const normTarget = normalize(currentQuestion.targetPhrase);
        const success = normInput === normTarget;

        setIsEvaluated(true);
        setIsCurrentCorrect(success);
        setFeedback(success
          ? `¡Correcto! "${currentQuestion.word.spanish}" se traduce como "${currentQuestion.word.english}".`
          : `Incorrecto. La versión correcta en inglés es: "${currentQuestion.word.english}". Escríbela para avanzar.`
        );
        onUpdateWordStatus(currentQuestion.word.id, success && newAttemptCount === 1);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (currentQuestion.type === 'verbs_study') {
      const given = currentQuestion.givenField || 'present';
      const targetP = normalize(currentQuestion.word.present || currentQuestion.word.english);
      const targetPa = normalize(currentQuestion.word.past || '');
      const targetPP = normalize(currentQuestion.word.pastParticiple || '');
      const targetSp = normalize(currentQuestion.word.spanish);

      const userP = given === 'present' ? targetP : normalize(vStudyPresentInput);
      const userPa = given === 'past' ? targetPa : normalize(vStudyPastInput);
      const userPP = given === 'pastParticiple' ? targetPP : normalize(vStudyParticipleInput);
      const userSp = given === 'spanish' ? targetSp : normalize(vStudySpanishInput);

      let correctCount = 0;
      let totalFields = 4;

      if (userP === targetP || !targetP) correctCount++;
      if (userPa === targetPa || !targetPa) correctCount++;
      if (userPP === targetPP || !targetPP) correctCount++;
      if (userSp === targetSp || (userSp && targetSp.includes(userSp)) || (userSp && userSp.includes(targetSp))) correctCount++;

      const isAllCorrect = correctCount === totalFields;
      setIsEvaluated(true);
      setIsCurrentCorrect(isAllCorrect);

      if (isAllCorrect) {
        setFeedback("¡Excelente! Has completado correctamente todas las formas verbales y el significado.");
        onUpdateWordStatus(currentQuestion.word.id, newAttemptCount === 1);
      } else {
        setFeedback(`Has completado ${correctCount} de ${totalFields} campos correctamente. Revisa los casilleros o presiona "Mostrar Respuesta".`);
        onUpdateWordStatus(currentQuestion.word.id, false);
      }
      setIsLoading(false);
      return;
    }

    if (currentQuestion.type === 'verb_tenses') {
      try {
        const activeTarget = aiVerbTenseTargetSentence || currentQuestion.targetSentence;
        const activeExpected = aiVerbTenseExpectedTranslation || currentQuestion.expectedTranslation;

        const res = await fetch('/api/check-translation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceText: activeTarget,
            targetText: userInput.trim(),
            expectedText: activeExpected,
            direction: currentQuestion.tenseDirection || 'en_to_es'
          })
        });
        const data = await res.json();
        setIsEvaluated(true);
        setIsCurrentCorrect(data.isCorrect);

        if (data.isCorrect) {
          setFeedback(`¡Excelente! Traducción correcta del tiempo verbal (${currentQuestion.verbTenseName}): "${activeExpected}".`);
          onUpdateWordStatus(currentQuestion.word.id, newAttemptCount === 1);
        } else {
          setFeedback(data.feedback || `La respuesta esperada es: "${activeExpected}".`);
          onUpdateWordStatus(currentQuestion.word.id, false);
        }
      } catch (err) {
        const activeExpected = aiVerbTenseExpectedTranslation || currentQuestion.expectedTranslation || '';
        const normInput = normalize(userInput);
        const normExp = normalize(activeExpected);
        const success = normInput === normExp || normExp.includes(normInput);

        setIsEvaluated(true);
        setIsCurrentCorrect(success);
        setFeedback(success
          ? `¡Correcto! Traducción en ${currentQuestion.verbTenseName} aceptada.`
          : `Incorrecto. La respuesta esperada es: "${activeExpected}".`
        );
        onUpdateWordStatus(currentQuestion.word.id, success && newAttemptCount === 1);
      } finally {
        setIsLoading(false);
      }
      return;
    }
  };

  const handleNextQuestion = () => {
    // Record result
    const newResult: QuestionResult = {
      questionId: currentQuestion.id,
      wordId: currentQuestion.word.id,
      type: currentQuestion.type,
      userAnswer: userInput,
      isCorrect: isCurrentCorrect,
      attemptsNeeded: attemptsOnCurrentQuestion,
      feedback: feedback || undefined,
      translatedSentence: spanishSentenceTranslation || undefined
    };

    const updatedResults = [...results, newResult];
    setResults(updatedResults);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setUserInput('');
      setShowHint(false);
      setShowMeaning(false);
      setWasAnswerRevealed(false);
      setSelectedOption(null);
      setIsEvaluated(false);
      setIsCurrentCorrect(false);
      setFeedback(null);
      setSpanishSentenceTranslation(null);
      setAttemptsOnCurrentQuestion(0);
    } else {
      // Completed all questions
      onCompleteQuiz(updatedResults);
    }
  };

  const handleSelectOptionHint = (optionText: string) => {
    setSelectedOption(optionText);
    setUserInput(optionText);
  };

  const handleExitQuiz = () => {
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas salir de la evaluación?\n\nSe cancelará la sesión actual y volverás al menú principal."
    );
    if (confirmed && onExitQuiz) {
      onExitQuiz();
    }
  };

  const progressPercentage = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header Bar with Progress */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xs">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-bold text-indigo-600 uppercase tracking-wider">
            Ejercicio {currentIndex + 1} de {questions.length}
          </span>
          <div className="flex items-center space-x-3">
            <span className="font-mono font-semibold">{progressPercentage}% Completado</span>
            {onExitQuiz && (
              <button
                type="button"
                onClick={handleExitQuiz}
                className="inline-flex items-center text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-all cursor-pointer shadow-2xs"
                title="Salir de la evaluación"
              >
                <LogOut className="w-3.5 h-3.5 mr-1 text-rose-600" />
                <span>Salir de Evaluación</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
          <div
            className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Main Exercise Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
        {/* Exercise Badge */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-full uppercase tracking-wider">
            {currentQuestion.type === 'fill_in_blank' && 'A) Fill in the Blank'}
            {currentQuestion.type === 'en_to_es' && 'B) Inglés ➔ Español'}
            {currentQuestion.type === 'es_to_en' && 'C) Español ➔ Inglés'}
            {currentQuestion.type === 'sentence_construction' && 'D) Construcción de Oración'}
            {currentQuestion.type === 'verbs_study' && '5) Verbs Study'}
            {currentQuestion.type === 'verb_tenses' && '6) Practicar Tiempos Verbales'}
          </span>

          <span className="text-xs text-slate-400 font-mono font-medium">
            Intento #{attemptsOnCurrentQuestion + 1}
          </span>
        </div>

        {/* Question Prompt Area */}
        <div className="space-y-4">
          {/* TYPE A: Fill in the blank */}
          {currentQuestion.type === 'fill_in_blank' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-slate-500">
                  Completa los espacios en blanco de la oración:
                </h3>
                <button
                  type="button"
                  onClick={handleRegenerateSentence}
                  disabled={isGeneratingSentence}
                  className="inline-flex items-center text-xs font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-all disabled:opacity-50"
                  title="Generar otra oración en contexto con la misma palabra usando IA"
                >
                  <Sparkles className={`w-3.5 h-3.5 mr-1.5 text-purple-600 ${isGeneratingSentence ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingSentence ? 'Generando oración...' : 'Cambiar oración (IA)'}</span>
                </button>
              </div>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-lg sm:text-xl font-medium text-slate-800 leading-relaxed font-sans relative flex items-center justify-between">
                <div>
                  {isGeneratingSentence ? (
                    <div className="flex items-center space-x-2 text-slate-400 font-normal text-sm py-1">
                      <RefreshCcw className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Generando otra oración...</span>
                    </div>
                  ) : (
                    overrideSentence || currentQuestion.contextSentence
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TYPE B: EN -> ES */}
          {currentQuestion.type === 'en_to_es' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-500">
                Traduce la siguiente expresión del inglés al español:
              </h3>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-xl sm:text-2xl font-bold text-indigo-900 flex items-center justify-between">
                <span>"{currentQuestion.word.english}"</span>
                <button
                  type="button"
                  onClick={() => playPronunciation(currentQuestion.word.english)}
                  className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer flex-shrink-0"
                  title="Escuchar pronunciación"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* TYPE C: ES -> EN */}
          {currentQuestion.type === 'es_to_en' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-500">
                Traduce la siguiente expresión del español al inglés:
              </h3>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-xl sm:text-2xl font-bold text-emerald-900">
                "{currentQuestion.word.spanish}"
              </div>
            </div>
          )}

          {/* TYPE D: Sentence Construction */}
          {currentQuestion.type === 'sentence_construction' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-500">
                Escribe una oración completa en inglés usando la siguiente expresión:
              </h3>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xl sm:text-2xl font-bold text-indigo-900 flex items-center justify-between">
                  <span>"{currentQuestion.word.english}"</span>
                  <button
                    type="button"
                    onClick={() => playPronunciation(currentQuestion.word.english)}
                    className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer flex-shrink-0"
                    title="Escuchar pronunciación"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Botones de acción: Mostrar traducción & Otros ejemplos */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setShowSpanishTranslation(prev => !prev)}
                    className="inline-flex items-center text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs transition-all cursor-pointer"
                  >
                    <Languages className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    <span>{showSpanishTranslation ? 'Ocultar traducción' : 'Mostrar traducción'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFetchExtraExamples}
                    disabled={isGeneratingExamples}
                    className="inline-flex items-center text-xs font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 mr-1.5 text-purple-600 ${isGeneratingExamples ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingExamples ? 'Generando ejemplos...' : 'Otros ejemplos (IA)'}</span>
                  </button>
                </div>

                {/* Traducción al español desplegable */}
                {showSpanishTranslation && (
                  <div className="text-xs text-slate-700 bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-200/80 font-medium animate-fade-in">
                    Significado en español: <span className="italic font-bold text-indigo-900">"{currentQuestion.word.spanish}"</span>
                  </div>
                )}

                {/* Ejemplos adicionales con IA */}
                {isGeneratingExamples && (
                  <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl flex items-center space-x-2 text-xs text-purple-700 animate-pulse">
                    <RefreshCcw className="w-4 h-4 animate-spin text-purple-600 flex-shrink-0" />
                    <span>Generando 2 oraciones de ejemplo adicionales con la IA...</span>
                  </div>
                )}

                {extraExamples && extraExamples.length > 0 && (
                  <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2 animate-fade-in text-xs">
                    <div className="font-bold text-purple-900 flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                      Otros ejemplos de uso (IA):
                    </div>
                    <div className="space-y-2">
                      {extraExamples.map((ex, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-lg border border-purple-100 shadow-2xs space-y-0.5 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-800 text-xs sm:text-sm">"{ex.english}"</div>
                            <div className="text-[11px] text-slate-500 italic">"{ex.spanish}"</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => playPronunciation(ex.english)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                            title="Escuchar pronunciación"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TYPE 5: Verbs Study */}
          {currentQuestion.type === 'verbs_study' && (() => {
            const given = currentQuestion.givenField || 'present';
            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-slate-500">
                    Estudio de Verbos: Se muestra 1 casillero al azar y debes completar los otros 3 en blanco.
                  </h3>

                  <button
                    type="button"
                    onClick={handleFetchVerbTenseExamples}
                    disabled={isGeneratingVerbTenseExamples}
                    className="inline-flex items-center text-xs font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    title="Obtener 3 oraciones de ejemplo generadas por IA para este verbo"
                  >
                    <Sparkles className={`w-3.5 h-3.5 mr-1.5 text-purple-600 ${isGeneratingVerbTenseExamples ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingVerbTenseExamples ? 'Generando oraciones...' : 'Sugerir oración en cada tiempo con IA'}</span>
                  </button>
                </div>

                {/* Table of Forms */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Present (V1) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                        <span>Present (V1)</span>
                        {given === 'present' && <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">PISTA DADA</span>}
                      </label>
                      {given === 'present' ? (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-950 flex items-center justify-between">
                          <span>{currentQuestion.word.present || currentQuestion.word.english}</span>
                          {(isEvaluated || wasAnswerRevealed) && (
                            <button
                              type="button"
                              onClick={() => playPronunciation(currentQuestion.word.present || currentQuestion.word.english)}
                              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-md"
                              title="Escuchar"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={vStudyPresentInput}
                            onChange={(e) => setVStudyPresentInput(e.target.value)}
                            placeholder="Escribe presente (V1)..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {(isEvaluated || wasAnswerRevealed) && (
                            <button
                              type="button"
                              onClick={() => playPronunciation(vStudyPresentInput.trim() || currentQuestion.word.present || currentQuestion.word.english)}
                              className="absolute right-2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                              title="Escuchar pronunciación"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Past (V2) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                        <span>Past (V2)</span>
                        {given === 'past' && <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">PISTA DADA</span>}
                      </label>
                      {given === 'past' ? (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-950 flex items-center justify-between">
                          <span>{currentQuestion.word.past || currentQuestion.word.english}</span>
                          {(isEvaluated || wasAnswerRevealed) && (
                            <button
                              type="button"
                              onClick={() => playPronunciation(currentQuestion.word.past || currentQuestion.word.english)}
                              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-md"
                              title="Escuchar"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={vStudyPastInput}
                            onChange={(e) => setVStudyPastInput(e.target.value)}
                            placeholder="Escribe pasado (V2)..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {(isEvaluated || wasAnswerRevealed) && (
                            <button
                              type="button"
                              onClick={() => playPronunciation(vStudyPastInput.trim() || currentQuestion.word.past || currentQuestion.word.english)}
                              className="absolute right-2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                              title="Escuchar pronunciación"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Past Participle (V3) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                        <span>Participle (V3)</span>
                        {given === 'pastParticiple' && <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">PISTA DADA</span>}
                      </label>
                      {given === 'pastParticiple' ? (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-950 flex items-center justify-between">
                          <span>{currentQuestion.word.pastParticiple || currentQuestion.word.english}</span>
                          {(isEvaluated || wasAnswerRevealed) && (
                            <button
                              type="button"
                              onClick={() => playPronunciation(currentQuestion.word.pastParticiple || currentQuestion.word.english)}
                              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-md"
                              title="Escuchar"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={vStudyParticipleInput}
                            onChange={(e) => setVStudyParticipleInput(e.target.value)}
                            placeholder="Escribe participio (V3)..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {(isEvaluated || wasAnswerRevealed) && (
                            <button
                              type="button"
                              onClick={() => playPronunciation(vStudyParticipleInput.trim() || currentQuestion.word.pastParticiple || currentQuestion.word.english)}
                              className="absolute right-2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                              title="Escuchar pronunciación"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Spanish Meaning */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                        <span>Significado</span>
                        {given === 'spanish' && <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">PISTA DADA</span>}
                      </label>
                      {given === 'spanish' ? (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-950">
                          <span>{currentQuestion.word.spanish}</span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={vStudySpanishInput}
                          onChange={(e) => setVStudySpanishInput(e.target.value)}
                          placeholder="Escribe significado..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Verb Examples List */}
                {isGeneratingVerbTenseExamples && (
                  <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl flex items-center space-x-2 text-xs text-purple-700 animate-pulse">
                    <RefreshCcw className="w-4 h-4 animate-spin text-purple-600 flex-shrink-0" />
                    <span>Generando oraciones de ejemplo en cada tiempo verbal con la IA...</span>
                  </div>
                )}

                {verbTenseExamples && verbTenseExamples.length > 0 && (
                  <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2 animate-fade-in text-xs">
                    <div className="font-bold text-purple-900 flex items-center mb-1">
                      <Sparkles className="w-4 h-4 mr-1.5 text-purple-600" />
                      Oraciones sugeridas por IA en cada tiempo verbal:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {verbTenseExamples.map((ex, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs space-y-1 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block">
                              {ex.tense}
                            </span>
                            <button
                              type="button"
                              onClick={() => playPronunciation(ex.sentence)}
                              className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                              title="Escuchar pronunciación"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="font-bold text-slate-800 text-xs sm:text-sm">"{ex.sentence}"</div>
                          <div className="text-[11px] text-slate-500 italic">"{ex.translation}"</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TYPE 6: Verb Tenses */}
          {currentQuestion.type === 'verb_tenses' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-500">
                  Practicar Tiempos Verbales: Traduce la siguiente oración
                </h3>
                <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-bold text-xs rounded-lg border border-purple-200 flex items-center space-x-1">
                  <span>⏱️</span>
                  <span>{currentQuestion.verbTenseName}</span>
                </span>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {currentQuestion.tenseDirection === 'es_to_en' ? 'Oración en Español:' : 'Oración en Inglés:'}
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchVerbTenseSentence}
                    disabled={isGeneratingVerbTenseSentence}
                    className="inline-flex items-center text-[11px] font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 mr-1 text-purple-600 ${isGeneratingVerbTenseSentence ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingVerbTenseSentence ? 'Generando...' : 'Cambiar Oración (IA)'}</span>
                  </button>
                </div>

                {isGeneratingVerbTenseSentence ? (
                  <div className="flex items-center space-x-2 py-3 text-sm text-purple-700 animate-pulse">
                    <RefreshCcw className="w-4 h-4 animate-spin text-purple-600" />
                    <span>Conjugando oración con la IA para {currentQuestion.verbTenseName}...</span>
                  </div>
                ) : (
                  <div className="text-lg sm:text-xl font-bold text-indigo-900 font-sans flex items-center justify-between">
                    <span>"{aiVerbTenseTargetSentence || currentQuestion.targetSentence}"</span>
                    {currentQuestion.tenseDirection === 'en_to_es' && (
                      <button
                        type="button"
                        onClick={() => playPronunciation(aiVerbTenseTargetSentence || currentQuestion.targetSentence || '')}
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer flex-shrink-0 ml-2"
                        title="Escuchar pronunciación"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons: Ver Significado, Pedir Pista, Mostrar Respuesta */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          {/* Requirement 1: Ver Significado Button for Fill in Blank */}
          {currentQuestion.type === 'fill_in_blank' && (
            <div>
              {!showMeaning ? (
                <button
                  type="button"
                  onClick={() => setShowMeaning(true)}
                  className="inline-flex items-center text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-all"
                >
                  <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                  Ver Significado
                </button>
              ) : (
                <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-start space-x-2 text-xs text-indigo-900">
                  <HelpCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    La expresión contiene exactamente <strong className="text-indigo-950 font-mono font-bold">{currentQuestion.blankCount}</strong> palabra(s). Significado: <span className="italic font-semibold text-indigo-800">"{currentQuestion.spanishText}"</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hint Options for Fill in Blank */}
          {currentQuestion.type === 'fill_in_blank' && (
            <div>
              {!showHint ? (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="inline-flex items-center text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-all"
                >
                  <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                  Pedir Pista (5 Opciones)
                </button>
              ) : (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3 w-full">
                  <div className="text-xs font-semibold text-amber-900 flex items-center">
                    <Lightbulb className="w-4 h-4 mr-1.5 text-amber-600" />
                    Opciones disponibles (en orden aleatorio):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentQuestion.options?.map((option, idx) => {
                      const letter = String.fromCharCode(97 + idx); // a, b, c, d, e
                      const isSelected = selectedOption === option;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOptionHint(option)}
                          className={`text-left p-2.5 rounded-lg text-xs font-medium border transition-all flex items-center space-x-2 ${
                            isSelected
                              ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                          }`}
                        >
                          <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 font-bold flex items-center justify-center uppercase font-mono text-[11px]">
                            {letter}
                          </span>
                          <span className="truncate">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Requirement 2: Mostrar Respuesta Button */}
          {!wasAnswerRevealed && (
            <button
              type="button"
              onClick={handleShowAnswer}
              className="inline-flex items-center text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-all ml-auto"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
              Mostrar Respuesta
            </button>
          )}
        </div>

        {/* Input Area */}
        {currentQuestion.type !== 'verbs_study' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {currentQuestion.type === 'sentence_construction'
                ? 'Tu Oración en Inglés:'
                : 'Tu Respuesta:'}
            </label>

            {currentQuestion.type === 'sentence_construction' ? (
              <textarea
                rows={3}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isEvaluated && (isCurrentCorrect || wasAnswerRevealed)}
                placeholder={`Escribe tu oración usando "${currentQuestion.word.english}"...`}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            ) : (
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isEvaluated && (isCurrentCorrect || wasAnswerRevealed)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (!isEvaluated || (!isCurrentCorrect && !wasAnswerRevealed))) {
                    handleEvaluateAnswer();
                  }
                }}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            )}
          </div>
        )}

        {/* Verify Button */}
        {(!isEvaluated || (!isCurrentCorrect && !wasAnswerRevealed)) && (
          <button
            type="button"
            onClick={handleEvaluateAnswer}
            disabled={isLoading || (currentQuestion.type !== 'verbs_study' && !userInput.trim())}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCcw className="w-4 h-4 animate-spin" />
                <span>Evaluando respuesta...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Comprobar Respuesta</span>
              </>
            )}
          </button>
        )}

        {/* Feedback Display Box */}
        {isEvaluated && (
          <div
            className={`p-5 rounded-xl border text-sm space-y-3 ${
              isCurrentCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start space-x-3">
              {isCurrentCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="font-bold text-base">
                  {isCurrentCorrect
                    ? '¡Completado Correctamente!'
                    : wasAnswerRevealed
                    ? 'Respuesta Revelada (Calificado como Error)'
                    : 'Necesita Corrección'}
                </h4>
                <p className="text-xs sm:text-sm leading-relaxed">{feedback}</p>

                {/* Requirement 4: Complete sentence with audio button for Fill in the Blank when answered/revealed */}
                {currentQuestion.type === 'fill_in_blank' && (
                  (() => {
                    const baseSent = overrideSentence || currentQuestion.contextSentence || '';
                    const fullSentence = baseSent
                      .replace(/____+/g, currentQuestion.word.english)
                      .replace(/____/g, currentQuestion.word.english);
                    return (
                      <div className="mt-3 p-3.5 bg-indigo-100/90 border border-indigo-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                            Oración Completa:
                          </span>
                          <button
                            type="button"
                            onClick={() => playPronunciation(fullSentence)}
                            className="inline-flex items-center text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-300 transition-all cursor-pointer shadow-2xs"
                            title="Escuchar la oración completa"
                          >
                            <Volume2 className="w-4 h-4 mr-1.5 text-indigo-600" />
                            <span>Escuchar Oración Completa</span>
                          </button>
                        </div>
                        <p className="text-sm font-bold text-indigo-950 font-sans">
                          "{fullSentence}"
                        </p>
                      </div>
                    );
                  })()
                )}

                {/* Confirm sentence translation for Type D when perfect */}
                {isCurrentCorrect && currentQuestion.type === 'sentence_construction' && spanishSentenceTranslation && (
                  <div className="mt-3 p-3 bg-emerald-100/80 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <div className="font-semibold text-emerald-800 flex items-center">
                      <MessageSquare className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Traducción al español confirmada:
                    </div>
                    <div className="italic text-emerald-900 font-sans font-medium">
                      {spanishSentenceTranslation}
                    </div>
                  </div>
                )}

                {!isCurrentCorrect && !wasAnswerRevealed && (
                  <p className="text-xs text-rose-700/80 font-medium pt-1">
                    ⚠️ Vuelve a intentarlo o presiona "Mostrar Respuesta" si deseas continuar.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Next Question Button (enabled when response is correct OR when answer was revealed) */}
        {isEvaluated && (isCurrentCorrect || wasAnswerRevealed) && (
          <button
            type="button"
            onClick={handleNextQuestion}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-base shadow-lg shadow-indigo-100 transition-all flex items-center justify-center space-x-2 transform active:scale-[0.99]"
          >
            <span>
              {currentIndex + 1 < questions.length ? 'Siguiente Pregunta' : 'Finalizar Evaluación y Ver Resultados'}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Side / Bottom panel for writing unknown words during practice */}
      <PracticePendingWordsPanel className="mt-6" />
    </div>
  );
};


