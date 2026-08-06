import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SetupForm } from './components/SetupForm';
import { QuizRunner } from './components/QuizRunner';
import { FlashcardsRunner } from './components/FlashcardsRunner';
import { StudentMode } from './components/StudentMode';
import { HistoryView } from './components/HistoryView';
import {
  VocabularyItem,
  QuestionConfig,
  ExerciseQuestion,
  QuestionResult,
  QuizHistory,
  WordStatus
} from './types';
import {
  getStoredVocabulary,
  saveVocabulary,
  addVocabularyWord,
  addBatchVocabularyWords,
  addCustomGroup,
  editVocabularyWord,
  deleteVocabularyWord,
  moveWordsToGroup,
  renameGroup,
  deleteGroup,
  updateWordStatus,
  setExplicitWordStatus,
  getQuizHistory,
  saveQuizHistory,
  exportBackupJSON,
  importBackupJSON,
  resetProgressOnly,
  resetFactoryAllData,
  getStoredTrash,
  restoreFromTrash,
  permanentlyDeleteFromTrash,
  emptyTrash,
  restoreAllFromTrash
} from './utils/storage';
import { createQuizQuestions } from './utils/quizGenerator';
import { CheckCircle2, RotateCcw, Award, ArrowRight, BarChart3, BookOpen } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'quiz' | 'student' | 'history'>('quiz');
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [history, setHistory] = useState<QuizHistory[]>([]);
  const [trash, setTrash] = useState<VocabularyItem[]>([]);
  
  // Current active quiz state
  const [currentQuestions, setCurrentQuestions] = useState<ExerciseQuestion[] | null>(null);
  const [completedResults, setCompletedResults] = useState<QuestionResult[] | null>(null);

  // Flashcard session state
  const [flashcardsSession, setFlashcardsSession] = useState<{
    direction: 'en_to_es' | 'es_to_en' | 'mixed';
    selectedWords: VocabularyItem[];
  } | null>(null);

  // Load stored data on mount
  useEffect(() => {
    const vocabData = getStoredVocabulary();
    const historyData = getQuizHistory();
    const trashData = getStoredTrash();
    setVocabulary(vocabData);
    setHistory(historyData);
    setTrash(trashData);
  }, []);

  // CRUD Handlers
  const handleAddWord = (wordData: { english: string; spanish: string; group?: string; exampleSentence?: string; status?: WordStatus }) => {
    const updated = addVocabularyWord(wordData);
    setVocabulary(updated);
  };

  const handleAddBatchWords = (batchData: Array<{ english: string; spanish: string; group?: string; exampleSentence?: string; status?: WordStatus }>) => {
    const updated = addBatchVocabularyWords(batchData);
    setVocabulary(updated);
  };

  const handleAddCustomGroup = (groupName: string) => {
    addCustomGroup(groupName);
    // Force re-sync vocabulary state reference
    setVocabulary([...getStoredVocabulary()]);
  };

  const handleEditWord = (updatedItem: VocabularyItem) => {
    const updated = editVocabularyWord(updatedItem);
    setVocabulary(updated);
  };

  const handleDeleteWord = (wordId: number) => {
    const updated = deleteVocabularyWord(wordId);
    setVocabulary(updated);
    setTrash(getStoredTrash());
  };

  const handleRestoreWord = (wordId: number) => {
    const result = restoreFromTrash(wordId);
    setVocabulary(result.vocabulary);
    setTrash(result.trash);
  };

  const handlePermanentDeleteWord = (wordId: number) => {
    const updatedTrash = permanentlyDeleteFromTrash(wordId);
    setTrash(updatedTrash);
  };

  const handleEmptyTrash = () => {
    const updatedTrash = emptyTrash();
    setTrash(updatedTrash);
  };

  const handleRestoreAllTrash = () => {
    const result = restoreAllFromTrash();
    setVocabulary(result.vocabulary);
    setTrash(result.trash);
  };

  const handleMoveWordsToGroup = (wordIds: number[], targetGroup: string) => {
    const updated = moveWordsToGroup(wordIds, targetGroup);
    setVocabulary(updated);
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    const updated = renameGroup(oldName, newName);
    setVocabulary(updated);
  };

  const handleDeleteGroup = (groupName: string) => {
    const updated = deleteGroup(groupName);
    setVocabulary(updated);
  };

  const handleSaveProgress = () => {
    saveVocabulary(vocabulary);
  };

  const handleExportBackup = () => {
    exportBackupJSON();
  };

  const handleImportBackup = (jsonStr: string) => {
    const { vocab, history: hist, trash: importedTrash } = importBackupJSON(jsonStr);
    setVocabulary(vocab);
    setHistory(hist);
    setTrash(importedTrash || []);
  };

  // Handler: Start a Quiz session from Setup or Student Mode
  const handleStartQuiz = (config: QuestionConfig) => {
    try {
      const questions = createQuizQuestions(config, vocabulary, vocabulary);
      setCurrentQuestions(questions);
      setCompletedResults(null);
      setFlashcardsSession(null);
      setActiveTab('quiz');
    } catch (e: any) {
      alert(e.message || "Error al crear las preguntas de evaluación.");
    }
  };

  // Handler: Start Flashcards session
  const handleStartFlashcards = (direction: 'en_to_es' | 'es_to_en' | 'mixed', selectedWordIds: number[]) => {
    const selectedWords = vocabulary.filter(v => selectedWordIds.includes(v.id));
    if (selectedWords.length === 0) {
      alert("Selecciona al menos una palabra para la práctica con flashcards.");
      return;
    }
    setFlashcardsSession({ direction, selectedWords });
    setCurrentQuestions(null);
    setCompletedResults(null);
    setActiveTab('quiz');
  };

  // Handler: Single word status update
  const handleUpdateWordStatus = (wordId: number, isFirstTrySuccess: boolean) => {
    const updated = updateWordStatus(wordId, isFirstTrySuccess);
    setVocabulary(updated);
  };

  const handleExplicitStatusSet = (wordId: number, status: WordStatus) => {
    const updated = setExplicitWordStatus(wordId, status);
    setVocabulary(updated);
  };

  // Handler: Quiz session completion
  const handleCompleteQuiz = (results: QuestionResult[]) => {
    setCompletedResults(results);

    const total = results.length;
    const correctCount = results.filter(r => r.attemptsNeeded === 1 && r.isCorrect).length;
    const scorePercentage = total > 0 ? Math.round((correctCount / total) * 100) : 100;

    const breakdown = {
      fillInBlank: {
        total: results.filter(r => r.type === 'fill_in_blank').length,
        correct: results.filter(r => r.type === 'fill_in_blank' && r.attemptsNeeded === 1).length
      },
      enToEs: {
        total: results.filter(r => r.type === 'en_to_es').length,
        correct: results.filter(r => r.type === 'en_to_es' && r.attemptsNeeded === 1).length
      },
      esToEn: {
        total: results.filter(r => r.type === 'es_to_en').length,
        correct: results.filter(r => r.type === 'es_to_en' && r.attemptsNeeded === 1).length
      },
      sentence: {
        total: results.filter(r => r.type === 'sentence_construction').length,
        correct: results.filter(r => r.type === 'sentence_construction' && r.attemptsNeeded === 1).length
      }
    };

    const newHistoryEntry: QuizHistory = {
      id: `session_${Date.now()}`,
      date: new Date().toISOString(),
      totalQuestions: total,
      correctCount,
      scorePercentage,
      breakdown,
      wordIdsUsed: results.map(r => r.wordId)
    };

    const updatedHistory = saveQuizHistory(newHistoryEntry);
    setHistory(updatedHistory);
  };

  const handleResetProgressOnly = () => {
    const updatedVocab = resetProgressOnly();
    setVocabulary(updatedVocab);
    setHistory([]);
    setCurrentQuestions(null);
    setCompletedResults(null);
  };

  const handleResetFactoryAllData = () => {
    const updatedVocab = resetFactoryAllData();
    setVocabulary(updatedVocab);
    setHistory([]);
    setTrash([]);
    setCurrentQuestions(null);
    setCompletedResults(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // If switching away from quiz setup, keep or reset active quiz state
        }}
        vocabulary={vocabulary}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'quiz' && (
          <>
            {/* Case 0: Flashcards Practice Runner */}
            {flashcardsSession && (
              <FlashcardsRunner
                vocabulary={flashcardsSession.selectedWords}
                direction={flashcardsSession.direction}
                onClose={() => setFlashcardsSession(null)}
              />
            )}

            {/* Case 1: Active Quiz Runner */}
            {!flashcardsSession && currentQuestions && !completedResults && (
              <QuizRunner
                questions={currentQuestions}
                onCompleteQuiz={handleCompleteQuiz}
                onUpdateWordStatus={handleUpdateWordStatus}
              />
            )}

            {/* Case 2: Completed Quiz Summary View */}
            {!flashcardsSession && completedResults && (
              <div className="max-w-3xl mx-auto px-4 py-12">
                <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-8">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                    <Award className="w-10 h-10" />
                  </div>

                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">
                      ¡Evaluación Completada!
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                      Has respondido correctamente todas las preguntas de tu sesión.
                    </p>
                  </div>

                  {/* Results Breakdown */}
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="text-xs text-slate-500 font-medium">Precisión al primer intento</div>
                      <div className="text-3xl font-black text-emerald-600 font-mono mt-1">
                        {history[0]?.scorePercentage || 100}%
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="text-xs text-slate-500 font-medium">Ejercicios Evaluados</div>
                      <div className="text-3xl font-black text-indigo-600 font-mono mt-1">
                        {completedResults.length}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                      onClick={() => {
                        setCurrentQuestions(null);
                        setCompletedResults(null);
                        setFlashcardsSession(null);
                      }}
                      className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Nueva Evaluación</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('history');
                      }}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm border border-slate-200 transition-all flex items-center justify-center space-x-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Ver Historial y Estadísticas</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Case 3: Setup Form before quiz or flashcards starts */}
            {!flashcardsSession && !currentQuestions && !completedResults && (
              <SetupForm
                vocabulary={vocabulary}
                onStartQuiz={handleStartQuiz}
                onStartFlashcards={handleStartFlashcards}
              />
            )}
          </>
        )}

        {activeTab === 'student' && (
          <StudentMode
            vocabulary={vocabulary}
            trash={trash}
            onSetWordStatus={handleExplicitStatusSet}
            onStartQuizWithSelection={handleStartQuiz}
            onAddWord={handleAddWord}
            onAddBatchWords={handleAddBatchWords}
            onAddCustomGroup={handleAddCustomGroup}
            onEditWord={handleEditWord}
            onDeleteWord={handleDeleteWord}
            onRestoreWord={handleRestoreWord}
            onPermanentDeleteWord={handlePermanentDeleteWord}
            onEmptyTrash={handleEmptyTrash}
            onRestoreAllTrash={handleRestoreAllTrash}
            onMoveWordsToGroup={handleMoveWordsToGroup}
            onRenameGroup={handleRenameGroup}
            onDeleteGroup={handleDeleteGroup}
            onSaveProgress={handleSaveProgress}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetProgressOnly={handleResetProgressOnly}
            onResetFactoryAll={handleResetFactoryAllData}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            history={history}
            vocabulary={vocabulary}
            onResetProgressOnly={handleResetProgressOnly}
            onResetFactoryAll={handleResetFactoryAllData}
          />
        )}
      </main>

      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400 font-medium">
        VocEnglish • 117 Expresiones • Potenciado con Inteligencia Artificial
      </footer>
    </div>
  );
}
