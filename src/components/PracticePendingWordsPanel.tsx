import React, { useState, useEffect } from 'react';
import { BookmarkPlus, Plus, X, CheckCircle2, Sparkles } from 'lucide-react';
import { PendingCardWord } from '../types';
import {
  getStoredPendingCardWords,
  addPendingCardWord,
  removePendingCardWord
} from '../utils/storage';

interface PracticePendingWordsPanelProps {
  className?: string;
}

export const PracticePendingWordsPanel: React.FC<PracticePendingWordsPanelProps> = ({ className = '' }) => {
  const [pendingWords, setPendingWords] = useState<PendingCardWord[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Load on mount and listen to changes
  useEffect(() => {
    setPendingWords(getStoredPendingCardWords());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputValue.trim();
    if (!clean) return;

    const updated = addPendingCardWord(clean, 'General');
    setPendingWords(updated);
    setInputValue('');
    showToast(`"${clean}" guardada para tarjetas.`);
  };

  const handleRemove = (id: string, word: string) => {
    const updated = removePendingCardWord(id);
    setPendingWords(updated);
    showToast(`"${word}" eliminada de la lista.`);
  };

  return (
    <div className={`bg-gradient-to-r from-purple-50 via-indigo-50/60 to-slate-50 border border-purple-200/80 rounded-2xl p-5 shadow-xs transition-all ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
            <BookmarkPlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <span>Palabras para crear tarjetas</span>
              {pendingWords.length > 0 && (
                <span className="px-2 py-0.5 bg-purple-600 text-white text-[11px] font-mono font-bold rounded-full">
                  {pendingWords.length}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Guarda palabras o frases desconocidas que veas durante la práctica
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-100/80 hover:bg-purple-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
        >
          {isExpanded ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {/* Toast feedback */}
          {toastMessage && (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Quick Add Form */}
          <form onSubmit={handleAdd} className="flex items-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ej: reluctant, break down, achievement..."
              className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-2xs font-medium"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </form>

          {/* List of Pending Words Chips */}
          {pendingWords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {pendingWords.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center bg-white border border-purple-200 text-purple-900 px-2.5 py-1 rounded-xl text-xs font-semibold shadow-2xs group transition-all"
                >
                  <span className="mr-1.5">{item.word}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id, item.word)}
                    className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title={`Eliminar "${item.word}"`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic bg-white/60 p-2.5 rounded-xl border border-dashed border-slate-200 text-center font-medium">
              No has guardado palabras aún. Escribe cualquier palabra que no conozcas para procesarla en la sección de Palabras y Frases.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
