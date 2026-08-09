import React, { useState, useEffect } from 'react';
import { VocabularyItem } from '../types';
import { getFlashcardStats, saveFlashcardWordResult, resetFlashcardStats, FlashcardStatsMap } from '../utils/flashcardsStorage';
import { fetchFlashcardSentencePair, getSentencePairForWord } from '../utils/sentencePairs';
import {
  Volume2,
  RotateCw,
  CheckCircle2,
  Eye,
  ArrowLeft,
  Sparkles,
  Award,
  Layers,
  RotateCcw,
  Check,
  X,
  HelpCircle,
  Clock,
  AlertCircle,
  StickyNote,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { PracticePendingWordsPanel } from './PracticePendingWordsPanel';

interface FlashcardsRunnerProps {
  vocabulary: VocabularyItem[];
  direction: 'en_to_es' | 'es_to_en' | 'mixed';
  onClose: () => void;
}

interface FlashcardItem {
  word: VocabularyItem;
  frontLang: 'en' | 'es';
  backLang: 'en' | 'es';
  frontText: string;
  backText: string;
  frontExampleSentence: string;
  backExampleSentence: string;
  hasAiSentence?: boolean;
}

export const FlashcardsRunner: React.FC<FlashcardsRunnerProps> = ({
  vocabulary,
  direction,
  onClose
}) => {
  // Local Flashcards Stats map
  const [flashcardStats, setFlashcardStats] = useState<FlashcardStatsMap>({});
  
  // Deck state
  const [deck, setDeck] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showSentence, setShowSentence] = useState<boolean>(false);
  const [showNote, setShowNote] = useState<boolean>(false);
  const [isGeneratingSentence, setIsGeneratingSentence] = useState<boolean>(false);
  
  // Session tracking
  const [sessionCorrectCount, setSessionCorrectCount] = useState<number>(0);
  const [sessionIncorrectCount, setSessionIncorrectCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Load local flashcards stats on mount
  useEffect(() => {
    const stats = getFlashcardStats();
    setFlashcardStats(stats);
  }, []);

  // Build initial deck from vocabulary
  useEffect(() => {
    if (!vocabulary || vocabulary.length === 0) return;

    const items: FlashcardItem[] = vocabulary.map((word, idx) => {
      let frontLang: 'en' | 'es' = 'en';
      if (direction === 'es_to_en') {
        frontLang = 'es';
      } else if (direction === 'mixed') {
        frontLang = idx % 2 === 0 ? 'en' : 'es';
      }

      const backLang: 'en' | 'es' = frontLang === 'en' ? 'es' : 'en';
      const frontText = frontLang === 'en' ? word.english : word.spanish;
      const backText = frontLang === 'en' ? word.spanish : word.english;

      // Default initial pair
      const pair = getSentencePairForWord(word);
      let frontExampleSentence = '';
      let backExampleSentence = '';

      if (frontLang === 'en') {
        frontExampleSentence = pair.englishSentence;
        backExampleSentence = pair.spanishSentence;
      } else {
        frontExampleSentence = pair.spanishSentence;
        backExampleSentence = pair.englishSentence;
      }

      return {
        word,
        frontLang,
        backLang,
        frontText,
        backText,
        frontExampleSentence,
        backExampleSentence,
        hasAiSentence: false
      };
    });

    // Requirement 1: Shuffle deck items randomly
    const shuffledItems = [...items];
    for (let i = shuffledItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
    }

    setDeck(shuffledItems);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowSentence(false);
    setShowNote(false);
    setSessionCorrectCount(0);
    setSessionIncorrectCount(0);
    setIsCompleted(false);
  }, [vocabulary, direction]);

  // Fetch AI sentence for current card if not generated yet
  useEffect(() => {
    if (deck.length === 0 || !deck[currentIndex]) return;
    const current = deck[currentIndex];

    if (!current.hasAiSentence) {
      let isMounted = true;
      fetchFlashcardSentencePair(
        current.word.english,
        current.word.spanish,
        current.frontLang
      ).then(pair => {
        if (!isMounted) return;
        setDeck(prevDeck => {
          if (!prevDeck[currentIndex]) return prevDeck;
          const newDeck = [...prevDeck];
          newDeck[currentIndex] = {
            ...newDeck[currentIndex],
            frontExampleSentence: pair.frontSentence,
            backExampleSentence: pair.backSentence,
            hasAiSentence: true
          };
          return newDeck;
        });
      });

      return () => {
        isMounted = false;
      };
    }
  }, [currentIndex, deck.length]);

  // Regenerate sentence with AI
  const handleRegenerateSentence = async () => {
    const current = deck[currentIndex];
    if (!current || isGeneratingSentence) return;

    setIsGeneratingSentence(true);
    try {
      const pair = await fetchFlashcardSentencePair(
        current.word.english,
        current.word.spanish,
        current.frontLang,
        current.frontExampleSentence
      );

      setDeck(prevDeck => {
        const newDeck = [...prevDeck];
        newDeck[currentIndex] = {
          ...newDeck[currentIndex],
          frontExampleSentence: pair.frontSentence,
          backExampleSentence: pair.backSentence,
          hasAiSentence: true
        };
        return newDeck;
      });
    } catch (e) {
      console.error('Error regenerating sentence:', e);
    } finally {
      setIsGeneratingSentence(false);
    }
  };

  // Pronunciation handler (ONLY FOR ENGLISH)
  const playPronunciation = (text: string) => {
    if (!text || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

  const currentCard = deck[currentIndex];

  // Action: Mark Correct (✓)
  const handleMarkCorrect = () => {
    if (!currentCard) return;

    const updatedStats = saveFlashcardWordResult(currentCard.word.id, true);
    setFlashcardStats(updatedStats);
    setSessionCorrectCount(prev => prev + 1);

    nextCard();
  };

  // Action: Mark Incorrect (❌)
  const handleMarkIncorrect = () => {
    if (!currentCard) return;

    const updatedStats = saveFlashcardWordResult(currentCard.word.id, false);
    setFlashcardStats(updatedStats);
    setSessionIncorrectCount(prev => prev + 1);

    nextCard();
  };

  const nextCard = () => {
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setShowSentence(false);
      setShowNote(false);
    } else {
      setIsCompleted(true);
    }
  };

  // Reset Flashcard Statistics handler (Requirement 2)
  const handleResetStats = () => {
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas reiniciar las estadísticas de las tarjetas?\n\nTodas las tarjetas volverán a figurar como 'Nuevas'. Ninguna palabra ni tarjeta será eliminada."
    );
    if (confirmed) {
      const fresh = resetFlashcardStats();
      setFlashcardStats(fresh);
    }
  };

  // Compute local stats for ALL vocabulary items in this flashcard dataset
  const localStatsCounts = {
    mastered: vocabulary.filter(v => flashcardStats[v.id]?.status === 'mastered').length,
    inProgress: vocabulary.filter(v => flashcardStats[v.id]?.status === 'in_progress').length,
    failed: vocabulary.filter(v => flashcardStats[v.id]?.status === 'failed').length,
    notPracticed: vocabulary.filter(v => !flashcardStats[v.id] || flashcardStats[v.id]?.status === 'not_practiced').length
  };

  if (deck.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-4">
          <Layers className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">No hay palabras seleccionadas</h3>
          <p className="text-sm text-slate-500">Selecciona al menos una palabra en la lista para iniciar tus tarjetas de estudio.</p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Volver a la Configuración
          </button>
        </div>
      </div>
    );
  }

  // View: Completed Flashcard Deck
  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-8">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <Award className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">
              ¡Mazo de Tarjetas Completado!
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              Has revisado las {deck.length} tarjetas de tu sesión de práctica.
            </p>
          </div>

          {/* Session Summary */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="text-xs text-emerald-700 font-semibold flex items-center justify-center space-x-1">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Marcadas Correctas</span>
              </div>
              <div className="text-3xl font-black text-emerald-600 font-mono mt-1">
                {sessionCorrectCount}
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <div className="text-xs text-rose-700 font-semibold flex items-center justify-center space-x-1">
                <X className="w-4 h-4 text-rose-600" />
                <span>Para Repasar</span>
              </div>
              <div className="text-3xl font-black text-rose-600 font-mono mt-1">
                {sessionIncorrectCount}
              </div>
            </div>
          </div>

          {/* Local Flashcards Cumulative Statistics Dashboard */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Estadísticas Acumuladas de Flashcards:
              </h4>
              <button
                type="button"
                onClick={handleResetStats}
                className="inline-flex items-center text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-all cursor-pointer shadow-2xs"
                title="Reiniciar estadísticas de tarjetas"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1 text-rose-600" />
                <span>Reiniciar Progresos</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-emerald-100/60 rounded-xl border border-emerald-200 text-emerald-800 font-medium">
                <div className="text-[11px] text-emerald-700">Dominadas</div>
                <div className="text-lg font-bold font-mono text-emerald-900">{localStatsCounts.mastered}</div>
              </div>
              <div className="p-2.5 bg-amber-100/60 rounded-xl border border-amber-200 text-amber-800 font-medium">
                <div className="text-[11px] text-amber-700">En progreso</div>
                <div className="text-lg font-bold font-mono text-amber-900">{localStatsCounts.inProgress}</div>
              </div>
              <div className="p-2.5 bg-rose-100/60 rounded-xl border border-rose-200 text-rose-800 font-medium">
                <div className="text-[11px] text-rose-700">No dominadas</div>
                <div className="text-lg font-bold font-mono text-rose-900">{localStatsCounts.failed}</div>
              </div>
              <div className="p-2.5 bg-slate-200/60 rounded-xl border border-slate-300 text-slate-800 font-medium">
                <div className="text-[11px] text-slate-600">Nuevas</div>
                <div className="text-lg font-bold font-mono text-slate-900">{localStatsCounts.notPracticed}</div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsFlipped(false);
                setShowSentence(false);
                setShowNote(false);
                setSessionCorrectCount(0);
                setSessionIncorrectCount(0);
                setIsCompleted(false);
              }}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Repetir este Mazo</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm border border-slate-200 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Configuración</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header bar: Progress + Local Stats */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Salir de Flashcards</span>
          </button>

          <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 font-mono">
            Tarjeta {currentIndex + 1} de {deck.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
          />
        </div>

        {/* Local Flashcard Stats Bar */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] border-t border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Estadísticas de Flashcards:</span>
            <button
              type="button"
              onClick={handleResetStats}
              className="inline-flex items-center text-[10px] font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 transition-all cursor-pointer shadow-2xs"
              title="Reiniciar progresos de las tarjetas"
            >
              <RotateCcw className="w-3 h-3 mr-1 text-rose-600" />
              <span>Reiniciar Progresos</span>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold" title="Dominadas en Flashcards">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
              Dominadas: {localStatsCounts.mastered}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold" title="En progreso en Flashcards">
              <Clock className="w-3 h-3 mr-1 text-amber-600" />
              En progreso: {localStatsCounts.inProgress}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold" title="No dominadas en Flashcards">
              <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
              No dominadas: {localStatsCounts.failed}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold" title="Nuevas en Flashcards">
              <HelpCircle className="w-3 h-3 mr-1 text-slate-500" />
              Nuevas: {localStatsCounts.notPracticed}
            </span>
          </div>
        </div>
      </div>

      {/* Main Flashcard Display Card */}
      <div>
        <div
          className={`relative min-h-[380px] sm:min-h-[420px] border-2 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 flex flex-col justify-between ${
            isFlipped 
              ? 'bg-slate-900 border-indigo-500 text-white' 
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Top Card Badge & Action Controls */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/40">
            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
              isFlipped 
                ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              {!isFlipped 
                ? (currentCard.frontLang === 'en' ? '🇬🇧 Anverso: Inglés' : '🇪🇸 Anverso: Español')
                : (currentCard.backLang === 'en' ? '🇬🇧 Reverso: Inglés' : '🇪🇸 Reverso: Español')
              }
            </span>

            <div className="flex items-center space-x-2">
              {/* Note toggle button if word has note */}
              {currentCard.word.notes && currentCard.word.notes.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNote(!showNote)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer border ${
                    isFlipped
                      ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-800'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                  title="Desplegar o contraer nota adicional"
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  <span>{showNote ? 'Ocultar Nota' : 'Ver Nota'}</span>
                </button>
              )}

              {/* Audio Button */}
              {((!isFlipped && currentCard.frontLang === 'en') || (isFlipped && currentCard.backLang === 'en')) && (
                <button
                  type="button"
                  onClick={() => playPronunciation(isFlipped ? currentCard.backText : currentCard.frontText)}
                  className={`p-2 rounded-xl transition-all cursor-pointer border ${
                    isFlipped 
                      ? 'bg-indigo-800 hover:bg-indigo-700 text-white border-indigo-600' 
                      : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border-indigo-300'
                  }`}
                  title="Escuchar pronunciación"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Card Main Body Content */}
          <div className="py-6 my-auto text-center space-y-6">
            {!isFlipped ? (
              /* FRONT SIDE (ANVERSO) */
              <div className="space-y-6">
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {currentCard.frontText}
                </h3>

                {/* Optional Expandable Note Box */}
                {showNote && currentCard.word.notes && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl max-w-lg mx-auto text-left space-y-1 animate-fadeIn shadow-xs">
                    <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide flex items-center">
                      <StickyNote className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      <span>Nota / Regla Gramatical:</span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-950 font-medium whitespace-pre-wrap">
                      {currentCard.word.notes}
                    </p>
                  </div>
                )}

                {/* Example Sentence Toggle Button & Display */}
                <div className="pt-2">
                  {!showSentence ? (
                    <button
                      type="button"
                      onClick={() => setShowSentence(true)}
                      className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-4 h-4 mr-1.5 text-indigo-500" />
                      <span>Ver oración de ejemplo ({currentCard.frontLang === 'en' ? 'Inglés' : 'Español'})</span>
                    </button>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-lg mx-auto text-center space-y-3 animate-fadeIn">
                      <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide flex items-center justify-between">
                        <span className="flex items-center">
                          <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                          Oración de Ejemplo ({currentCard.frontLang === 'en' ? 'Inglés' : 'Español'}):
                        </span>
                        <button
                          type="button"
                          onClick={handleRegenerateSentence}
                          disabled={isGeneratingSentence}
                          className="inline-flex items-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/60 px-2 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                          title="Generar una oración diferente con IA"
                        >
                          {isGeneratingSentence ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin text-indigo-600" />
                          ) : (
                            <RefreshCw className="w-3 h-3 mr-1 text-indigo-600" />
                          )}
                          <span>{isGeneratingSentence ? 'Generando...' : 'Cambiar oración'}</span>
                        </button>
                      </div>

                      {isGeneratingSentence ? (
                        <div className="py-2 text-xs text-slate-500 font-medium flex items-center justify-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                          <span>Generando nueva oración con IA...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm sm:text-base font-semibold text-slate-800 italic">
                            "{currentCard.frontExampleSentence}"
                          </p>
                          {currentCard.frontLang === 'en' && (
                            <button
                              type="button"
                              onClick={() => playPronunciation(currentCard.frontExampleSentence)}
                              className="inline-flex items-center text-[11px] font-semibold text-indigo-600 hover:underline pt-1 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5 mr-1" /> Escuchar frase
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* BACK SIDE (REVERSO) */
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    Traducción de la Palabra
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                    {currentCard.backText}
                  </h3>
                </div>

                {/* Optional Expandable Note Box on Flipped Side */}
                {showNote && currentCard.word.notes && (
                  <div className="p-4 bg-amber-950/90 border border-amber-800 rounded-2xl max-w-lg mx-auto text-left space-y-1 animate-fadeIn shadow-xs">
                    <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wide flex items-center">
                      <StickyNote className="w-3.5 h-3.5 mr-1 text-amber-400" />
                      <span>Nota / Regla Gramatical:</span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-100 font-medium whitespace-pre-wrap">
                      {currentCard.word.notes}
                    </p>
                  </div>
                )}

                {/* Verb Conjugations Panel if Applicable */}
                {currentCard.word.isVerb && (currentCard.word.present || currentCard.word.past || currentCard.word.pastParticiple) && (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2">
                    <div className="text-xs font-bold text-emerald-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                      <span>Formas Verbales (V1, V2, V3)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Presente (V1)</span>
                        <span className="font-bold text-slate-100">{currentCard.word.present || currentCard.word.english}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Pasado (V2)</span>
                        <span className="font-bold text-slate-100">{currentCard.word.past || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Participio (V3)</span>
                        <span className="font-bold text-slate-100">{currentCard.word.pastParticiple || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Exact Matched Translated Sentence */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl max-w-lg mx-auto text-center space-y-3">
                  <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide flex items-center justify-between">
                    <span className="flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                      Traducción Exacta ({currentCard.backLang === 'en' ? 'Inglés' : 'Español'}):
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerateSentence}
                      disabled={isGeneratingSentence}
                      className="inline-flex items-center text-[11px] font-bold text-indigo-300 hover:text-white hover:bg-slate-800 px-2 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      title="Generar una oración diferente con IA"
                    >
                      {isGeneratingSentence ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin text-indigo-400" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1 text-indigo-400" />
                      )}
                      <span>{isGeneratingSentence ? 'Generando...' : 'Cambiar oración'}</span>
                    </button>
                  </div>

                  {isGeneratingSentence ? (
                    <div className="py-2 text-xs text-slate-400 font-medium flex items-center justify-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Generando nueva traducción con IA...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-100 italic">
                        "{currentCard.backExampleSentence}"
                      </p>
                      {currentCard.backLang === 'en' && (
                        <button
                          type="button"
                          onClick={() => playPronunciation(currentCard.backExampleSentence)}
                          className="inline-flex items-center text-[11px] font-semibold text-indigo-300 hover:underline pt-1 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 mr-1" /> Escuchar frase
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="pt-4 border-t border-slate-200/40 space-y-3">
            {!isFlipped ? (
              /* Flip Card Button */
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-base rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer transform active:scale-[0.99]"
              >
                <RotateCw className="w-5 h-5" />
                <span>Voltear Tarjeta (Ver Reverso)</span>
              </button>
            ) : (
              /* Action Buttons: Incorrect (X), Correct (✓), or Flip back */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                  <span>¿Respondiste correctamente esta tarjeta?</span>
                  <button
                    type="button"
                    onClick={() => setIsFlipped(false)}
                    className="inline-flex items-center text-indigo-300 hover:text-indigo-200 underline cursor-pointer font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Volver al anverso
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={handleMarkIncorrect}
                    className="py-4 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer transform active:scale-95"
                  >
                    <X className="w-5 h-5" />
                    <span>Incorrecto (Repasar)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkCorrect}
                    className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer transform active:scale-95"
                  >
                    <Check className="w-5 h-5" />
                    <span>Correcto (Dominado)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel for writing unknown words during flashcard practice */}
        <PracticePendingWordsPanel className="mt-6" />
      </div>
    </div>
  );
};
