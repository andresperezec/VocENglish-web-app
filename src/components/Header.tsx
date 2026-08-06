import React from 'react';
import { BookOpen, CheckCircle, BarChart3, ListFilter, Sparkles, AlertCircle, Clock, HelpCircle } from 'lucide-react';
import { VocabularyItem } from '../types';

interface HeaderProps {
  activeTab: 'quiz' | 'student' | 'history';
  setActiveTab: (tab: 'quiz' | 'student' | 'history') => void;
  vocabulary: VocabularyItem[];
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, vocabulary }) => {
  const stats = {
    mastered: vocabulary.filter(v => v.status === 'mastered').length,
    inProgress: vocabulary.filter(v => v.status === 'in_progress').length,
    failed: vocabulary.filter(v => v.status === 'failed').length,
    notPracticed: vocabulary.filter(v => v.status === 'not_practiced').length,
  };

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-50 backdrop-blur-md bg-white/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-4 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                VocEnglish
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Vocabulary app- By Andrés Pérez
              </p>
            </div>
          </div>

          {/* Stats Summary Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium" title="Dominadas">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Dominadas: {stats.mastered}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium" title="En Progreso">
              <Clock className="w-3.5 h-3.5 mr-1" />
              En progreso: {stats.inProgress}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium" title="Falladas">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              Falladas: {stats.failed}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium" title="No Practicadas">
              <HelpCircle className="w-3.5 h-3.5 mr-1" />
              Nuevas: {stats.notPracticed}
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Práctica
            </button>

            <button
              onClick={() => setActiveTab('student')}
              className={`flex items-center px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'student'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ListFilter className="w-4 h-4 mr-2" />
              <span>Palabras/Frases</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Historial
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
