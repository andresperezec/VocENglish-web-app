import React, { useState, useEffect } from 'react';
import { VocabularyItem, QuestionConfig } from '../types';
import { VocabularyChecklist } from './VocabularyChecklist';
import {
  Play,
  Layers,
  Sparkles,
  BookOpen,
  Repeat,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

interface SetupFormProps {
  vocabulary: VocabularyItem[];
  onStartQuiz: (config: QuestionConfig) => void;
  onStartFlashcards: (direction: 'en_to_es' | 'es_to_en' | 'mixed', selectedWordIds: number[]) => void;
}

export const SetupForm: React.FC<SetupFormProps> = ({
  vocabulary,
  onStartQuiz,
  onStartFlashcards
}) => {
  // Flashcards state & selection
  const [flashcardDirection, setFlashcardDirection] = useState<'en_to_es' | 'es_to_en' | 'mixed'>('en_to_es');

  const [selectedPracticeWordIds, setSelectedPracticeWordIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('vocab_selected_practice_word_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error reading practice word IDs', e);
    }
    return vocabulary.map(v => v.id);
  });

  const [isPracticeAccordionOpen, setIsPracticeAccordionOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vocab_practice_accordion_open');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  // Evaluation Question Counts & Selection
  const [fillInBlankCount, setFillInBlankCount] = useState<number>(3);
  const [enToEsCount, setEnToEsCount] = useState<number>(3);
  const [esToEnCount, setEsToEnCount] = useState<number>(3);
  const [sentenceCount, setSentenceCount] = useState<number>(3);
  const [verbsStudyCount, setVerbsStudyCount] = useState<number>(2);
  const [verbTensesCount, setVerbTensesCount] = useState<number>(2);

  const [selectedEvaluationWordIds, setSelectedEvaluationWordIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('vocab_selected_eval_word_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error reading eval word IDs', e);
    }
    return vocabulary.map(v => v.id);
  });

  const [isEvaluationAccordionOpen, setIsEvaluationAccordionOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vocab_eval_accordion_open');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync practice selection changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vocab_selected_practice_word_ids', JSON.stringify(selectedPracticeWordIds));
    } catch (e) {}
  }, [selectedPracticeWordIds]);

  // Sync evaluation selection changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vocab_selected_eval_word_ids', JSON.stringify(selectedEvaluationWordIds));
    } catch (e) {}
  }, [selectedEvaluationWordIds]);

  // Accordion toggles with localStorage saving
  const togglePracticeAccordion = () => {
    setIsPracticeAccordionOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('vocab_practice_accordion_open', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const toggleEvaluationAccordion = () => {
    setIsEvaluationAccordionOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('vocab_eval_accordion_open', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Batch increment/reset question counts for all types
  const handleAddAll = (delta: number) => {
    setFillInBlankCount(prev => Math.max(0, prev + delta));
    setEnToEsCount(prev => Math.max(0, prev + delta));
    setEsToEnCount(prev => Math.max(0, prev + delta));
    setSentenceCount(prev => Math.max(0, prev + delta));
    setVerbsStudyCount(prev => Math.max(0, prev + delta));
    setVerbTensesCount(prev => Math.max(0, prev + delta));
  };

  const handleSetAll = (val: number) => {
    setFillInBlankCount(val);
    setEnToEsCount(val);
    setEsToEnCount(val);
    setSentenceCount(val);
    setVerbsStudyCount(val);
    setVerbTensesCount(val);
  };

  const totalQuestionsRequested =
    fillInBlankCount + enToEsCount + esToEnCount + sentenceCount + verbsStudyCount + verbTensesCount;

  const handleStartFlashcardsSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (selectedPracticeWordIds.length === 0) {
      setErrorMsg('Debes seleccionar al menos una palabra en la lista de Práctica con Flashcards.');
      return;
    }

    onStartFlashcards(flashcardDirection, selectedPracticeWordIds);
  };

  const handleStartEvaluationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (totalQuestionsRequested <= 0) {
      setErrorMsg('Debes solicitar al menos 1 pregunta en total para la evaluación.');
      return;
    }

    if (selectedEvaluationWordIds.length === 0) {
      setErrorMsg('Debes seleccionar al menos una palabra en la lista de Evaluación.');
      return;
    }

    onStartQuiz({
      fillInBlankCount,
      enToEsCount,
      esToEnCount,
      sentenceCount,
      verbsStudyCount,
      verbTensesCount,
      selectedStatuses: ['mastered', 'in_progress', 'failed', 'not_practiced'],
      selectedWordIds: selectedEvaluationWordIds
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-indigo-950/80 p-6 sm:p-8 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
            <Layers className="w-7 h-7 text-indigo-400 mr-3" />
            Configuración de Estudio y Evaluación
          </h2>
          <p className="text-slate-300 text-sm">
            Elige entre el módulo de Práctica con Flashcards Interactivas o configura tu Evaluación estructurada.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Global Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-rose-950/80 border border-rose-800/80 text-rose-200 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* CAJONCITO 1: PRACTICA (FLASHCARDS) */}
          <div className="bg-gradient-to-br from-indigo-950/90 via-slate-950 to-slate-900 border border-indigo-800/60 rounded-2xl p-6 space-y-6 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-900/50 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <span className="w-7 h-7 rounded-full bg-indigo-500 text-white text-xs font-black flex items-center justify-center mr-2.5 shadow-md">
                  1
                </span>
                <span className="text-indigo-200">Práctica (Flashcards Interactivas)</span>
              </h3>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold">
                {selectedPracticeWordIds.length} tarjetas en el mazo
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Estudia mediante tarjetas didácticas (anverso/reverso) con audio en inglés, oración de ejemplo sincronizada y notas explicativas desplegables. Tus marcas de correcto (✓) e incorrecto (❌) se guardan en el historial de Práctica independientemente.
            </p>

            {/* Flashcard Direction Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center">
                <Repeat className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
                Modo de traducción de las tarjetas:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFlashcardDirection('en_to_es')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    flashcardDirection === 'en_to_es'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span>🇬🇧 Inglés ➔ 🇪🇸 Español</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFlashcardDirection('es_to_en')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    flashcardDirection === 'es_to_en'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span>🇪🇸 Español ➔ 🇬🇧 Inglés</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFlashcardDirection('mixed')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    flashcardDirection === 'mixed'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span>🔀 Mezclado (Ambos)</span>
                </button>
              </div>
            </div>

            {/* Collapsible Word Selector for Practice */}
            <div className="border border-indigo-800/50 rounded-xl overflow-hidden bg-slate-950/60">
              <button
                type="button"
                onClick={togglePracticeAccordion}
                className="w-full p-4 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-slate-100">
                    Palabras y frases para Práctica ({selectedPracticeWordIds.length} / {vocabulary.length} seleccionadas)
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-indigo-300">
                  <span>{isPracticeAccordionOpen ? 'Contraer' : 'Desplegar'}</span>
                  {isPracticeAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isPracticeAccordionOpen && (
                <div className="p-4 border-t border-indigo-900/40 space-y-4 animate-fadeIn">
                  <VocabularyChecklist
                    vocabulary={vocabulary}
                    selectedWordIds={selectedPracticeWordIds}
                    onSelectionChange={setSelectedPracticeWordIds}
                    statsType="flashcards"
                  />
                </div>
              )}
            </div>

            {/* Launch Flashcards Action Button */}
            <button
              type="button"
              onClick={() => handleStartFlashcardsSubmit()}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer transform active:scale-[0.99]"
            >
              <BookOpen className="w-5 h-5" />
              <span>Iniciar Práctica con Flashcards ({selectedPracticeWordIds.length} Tarjetas)</span>
            </button>
          </div>

          {/* CAJONCITO 2: EVALUACION */}
          <form onSubmit={handleStartEvaluationSubmit} className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <span className="w-7 h-7 rounded-full bg-indigo-500 text-white text-xs font-black flex items-center justify-center mr-2.5 shadow-md">
                  2
                </span>
                <span className="text-slate-100">Evaluación</span>
              </h3>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold">
                {totalQuestionsRequested} preguntas configuradas
              </span>
            </div>

            {/* Quick Batch Increment Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Ajuste rápido de preguntas por categoría:
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleAddAll(1)}
                  className="px-3 py-1.5 text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white rounded-lg border border-indigo-500/40 transition-colors cursor-pointer"
                >
                  +1 a todas
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAll(2)}
                  className="px-3 py-1.5 text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white rounded-lg border border-indigo-500/40 transition-colors cursor-pointer"
                >
                  +2 a todas
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAll(5)}
                  className="px-3 py-1.5 text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white rounded-lg border border-indigo-500/40 transition-colors cursor-pointer"
                >
                  +5 a todas
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAll(0)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  Limpiar (0)
                </button>
              </div>
            </div>

            {/* 6 Exercise Type Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <label className="text-xs font-bold text-slate-200 mb-2">
                  1. Preguntas de <span className="text-indigo-400">Fill in the blank</span>:
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={fillInBlankCount}
                    onChange={(e) => setFillInBlankCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-bold"
                  />
                  <span className="text-xs text-slate-400">preguntas</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <label className="text-xs font-bold text-slate-200 mb-2">
                  2. Traducción de <span className="text-indigo-400">Inglés a Español</span>:
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={enToEsCount}
                    onChange={(e) => setEnToEsCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-bold"
                  />
                  <span className="text-xs text-slate-400">preguntas</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <label className="text-xs font-bold text-slate-200 mb-2">
                  3. Traducción de <span className="text-indigo-400">Español a Inglés</span>:
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={esToEnCount}
                    onChange={(e) => setEsToEnCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-bold"
                  />
                  <span className="text-xs text-slate-400">preguntas</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <label className="text-xs font-bold text-slate-200 mb-2">
                  4. <span className="text-indigo-400">Construcción de oración</span> en inglés:
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={sentenceCount}
                    onChange={(e) => setSentenceCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-bold"
                  />
                  <span className="text-xs text-slate-400">preguntas</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <label className="text-xs font-bold text-slate-200 mb-2">
                  5. Preguntas de <span className="text-emerald-400">Verbs study</span>:
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={verbsStudyCount}
                    onChange={(e) => setVerbsStudyCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-bold"
                  />
                  <span className="text-xs text-slate-400">preguntas</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <label className="text-xs font-bold text-slate-200 mb-2">
                  6. <span className="text-indigo-300">Practicar Tiempos Verbales</span>:
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={verbTensesCount}
                    onChange={(e) => setVerbTensesCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-bold"
                  />
                  <span className="text-xs text-slate-400">preguntas</span>
                </div>
              </div>
            </div>

            {/* Collapsible Word Selector for Evaluation */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              <button
                type="button"
                onClick={toggleEvaluationAccordion}
                className="w-full p-4 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Play className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold text-slate-100">
                    Palabras y frases para Evaluación ({selectedEvaluationWordIds.length} / {vocabulary.length} seleccionadas)
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-indigo-300">
                  <span>{isEvaluationAccordionOpen ? 'Contraer' : 'Desplegar'}</span>
                  {isEvaluationAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isEvaluationAccordionOpen && (
                <div className="p-4 border-t border-slate-800 space-y-4 animate-fadeIn">
                  <VocabularyChecklist
                    vocabulary={vocabulary}
                    selectedWordIds={selectedEvaluationWordIds}
                    onSelectionChange={setSelectedEvaluationWordIds}
                    statsType="evaluation"
                  />
                </div>
              )}
            </div>

            {/* Start Evaluation Action Button */}
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-base rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer transform active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Comenzar Evaluación ({totalQuestionsRequested} Preguntas)</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
