import React, { useState } from 'react';
import { QuizHistory, VocabularyItem, WordStatus } from '../types';
import { BarChart3, CheckCircle, Clock, AlertCircle, HelpCircle, History, Trophy, Award, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';

interface HistoryViewProps {
  history: QuizHistory[];
  vocabulary: VocabularyItem[];
  onResetProgressOnly: () => void;
  onResetFactoryAll: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  vocabulary,
  onResetProgressOnly,
  onResetFactoryAll
}) => {
  const [activeGroupFilter, setActiveGroupFilter] = useState<'all' | WordStatus>('all');

  // Stats calculation
  const counts = {
    total: vocabulary.length,
    mastered: vocabulary.filter(v => v.status === 'mastered').length,
    inProgress: vocabulary.filter(v => v.status === 'in_progress').length,
    failed: vocabulary.filter(v => v.status === 'failed').length,
    notPracticed: vocabulary.filter(v => v.status === 'not_practiced').length
  };

  const masteryPercentage = Math.round((counts.mastered / counts.total) * 100);

  const filteredVocabulary = vocabulary.filter(v => {
    if (activeGroupFilter === 'all') return true;
    return v.status === activeGroupFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Title Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center tracking-tight">
            <BarChart3 className="w-7 h-7 text-indigo-600 mr-3" />
            Historial y Progreso
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Supervisa tu avance y progreso de tus estudios.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Button 1: Reset Progress Stats Only */}
          <button
            onClick={() => {
              if (
                window.confirm(
                  "¿Deseas reiniciar únicamente las estadísticas de progreso y el historial de evaluaciones?\n\n✔ Tus tarjetas de vocabulario agregadas, configuraciones y carpetas SE CONSERVARÁN intactas."
                )
              ) {
                onResetProgressOnly();
              }
            }}
            className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-2xs"
            title="Reinicia intentos, aciertos y estado de tarjetas sin borrar palabras ni carpetas"
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Reiniciar Solo Progreso</span>
          </button>

          {/* Button 2: Factory Reset Everything */}
          <button
            onClick={() => {
              if (
                window.confirm(
                  "⚠️ ¡ADVERTENCIA DE SEGURIDAD!\n\nEsta acción eliminará PERMANENTEMENTE todas las tarjetas nuevas agregadas, las carpetas personalizadas y todo el historial de evaluaciones.\n\n¿Estás completamente seguro de que deseas restablecer la aplicación a su estado inicial de fábrica?"
                )
              ) {
                onResetFactoryAll();
              }
            }}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-2xs"
            title="Borra todas las tarjetas agregadas, carpetas e historial"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Restablecer Todo (Fábrica)</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Evaluaciones</span>
            <Trophy className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-800 font-mono">
            {history.length}
          </div>
          <p className="text-[11px] text-slate-400">Sesiones completadas</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Dominio Total</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono">
            {masteryPercentage}%
          </div>
          <p className="text-[11px] text-slate-400">{counts.mastered} de 117 palabras dominadas</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>En Progreso</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600 font-mono">
            {counts.inProgress}
          </div>
          <p className="text-[11px] text-slate-400">Practicadas en proceso</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Falladas / Repaso</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600 font-mono">
            {counts.failed}
          </div>
          <p className="text-[11px] text-slate-400">Requieren práctica reforzada</p>
        </div>
      </div>

      {/* Group Mastery Filter Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Clasificación de Grupos de Vocabulario</h3>
            <p className="text-xs text-slate-500">Filtra y revisa las palabras según su nivel de rendimiento</p>
          </div>

          {/* Group Tabs */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => setActiveGroupFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all border ${
                activeGroupFilter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todas ({counts.total})
            </button>
            <button
              onClick={() => setActiveGroupFilter('mastered')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all border flex items-center space-x-1 ${
                activeGroupFilter === 'mastered'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Dominadas ({counts.mastered})</span>
            </button>
            <button
              onClick={() => setActiveGroupFilter('in_progress')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all border flex items-center space-x-1 ${
                activeGroupFilter === 'in_progress'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>En Progreso ({counts.inProgress})</span>
            </button>
            <button
              onClick={() => setActiveGroupFilter('failed')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all border flex items-center space-x-1 ${
                activeGroupFilter === 'failed'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Falladas ({counts.failed})</span>
            </button>
            <button
              onClick={() => setActiveGroupFilter('not_practiced')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all border flex items-center space-x-1 ${
                activeGroupFilter === 'not_practiced'
                  ? 'bg-slate-700 text-white border-slate-600 shadow-xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>No Practicadas ({counts.notPracticed})</span>
            </button>
          </div>
        </div>

        {/* Group Filter Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Expresión en Inglés</th>
                <th className="py-3 px-4">Traducción al Español</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-center">Intentos</th>
                <th className="py-3 px-4 text-center">% Éxito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVocabulary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No hay expresiones en este grupo.
                  </td>
                </tr>
              ) : (
                filteredVocabulary.map((item) => {
                  const accuracy = item.attempts > 0 ? Math.round((item.correctCount / item.attempts) * 100) : 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{item.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.english}</td>
                      <td className="py-3 px-4 text-indigo-600 italic font-medium">{item.spanish}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase ${
                            item.status === 'mastered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'in_progress'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : item.status === 'failed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {item.status === 'mastered'
                            ? 'Dominada'
                            : item.status === 'in_progress'
                            ? 'En Progreso'
                            : item.status === 'failed'
                            ? 'Fallada'
                            : 'Nueva'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{item.attempts}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600">
                        {accuracy}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quiz Sessions History Log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center">
          <History className="w-5 h-5 text-indigo-600 mr-2" />
          Registro Histórico de Evaluaciones
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
            Aún no has completado ninguna sesión de evaluación. ¡Comienza una en la pestaña "Modo Evaluación"!
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((session) => (
              <div
                key={session.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
              >
                <div className="space-y-1">
                  <div className="text-xs text-slate-400 font-mono">
                    {new Date(session.date).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    Evaluación de {session.totalQuestions} ejercicios
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1">
                    <span>Fill in Blank: {session.breakdown.fillInBlank.total}</span>
                    <span>• EN ➔ ES: {session.breakdown.enToEs.total}</span>
                    <span>• ES ➔ EN: {session.breakdown.esToEn.total}</span>
                    <span>• Oraciones: {session.breakdown.sentence.total}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-2xl font-black text-indigo-600 font-mono">
                      {session.scorePercentage}%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {session.correctCount} / {session.totalQuestions} acertadas
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
