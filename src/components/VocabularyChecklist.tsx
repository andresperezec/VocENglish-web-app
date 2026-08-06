import React, { useState, useMemo, useEffect } from 'react';
import { VocabularyItem, WordStatus } from '../types';
import { getFlashcardStats, FlashcardStatsMap } from '../utils/flashcardsStorage';
import {
  Search,
  Folder,
  Filter,
  CheckCircle2,
  CheckSquare,
  Square,
  Clock,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface VocabularyChecklistProps {
  vocabulary: VocabularyItem[];
  selectedWordIds: number[];
  onSelectionChange: (ids: number[]) => void;
  statsType: 'flashcards' | 'evaluation';
}

export const VocabularyChecklist: React.FC<VocabularyChecklistProps> = ({
  vocabulary,
  selectedWordIds,
  onSelectionChange,
  statsType
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatuses, setSelectedStatuses] = useState<WordStatus[]>([
    'mastered',
    'in_progress',
    'failed',
    'not_practiced'
  ]);

  // Flashcards local stats if applicable
  const [flashcardStats, setFlashcardStats] = useState<FlashcardStatsMap>({});

  useEffect(() => {
    if (statsType === 'flashcards') {
      setFlashcardStats(getFlashcardStats());
    }
  }, [statsType]);

  // Extract unique folders/groups
  const availableGroups = useMemo(() => {
    const groupSet = new Set<string>();
    vocabulary.forEach(item => {
      groupSet.add(item.group?.trim() || 'General');
    });
    return Array.from(groupSet);
  }, [vocabulary]);

  // Filtered list
  const filteredVocabulary = useMemo(() => {
    return vocabulary.filter(v => {
      const matchesSearch =
        v.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.spanish.toLowerCase().includes(searchTerm.toLowerCase());

      // Get status based on statsType
      let statusToCompare: WordStatus = v.status;
      if (statsType === 'flashcards') {
        statusToCompare = flashcardStats[v.id]?.status || 'not_practiced';
      }

      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(statusToCompare);
      const matchesGroup = selectedGroup === 'all' || (v.group || 'General') === selectedGroup;

      return matchesSearch && matchesStatus && matchesGroup;
    });
  }, [vocabulary, searchTerm, selectedStatuses, selectedGroup, statsType, flashcardStats]);

  // Toggle individual word selection
  const toggleWord = (id: number) => {
    if (selectedWordIds.includes(id)) {
      onSelectionChange(selectedWordIds.filter(wId => wId !== id));
    } else {
      onSelectionChange([...selectedWordIds, id]);
    }
  };

  // Toggle group selection
  const toggleGroupSelection = (grpName: string) => {
    const groupWordIds = vocabulary
      .filter(v => (v.group || 'General') === grpName)
      .map(v => v.id);
    const allInGroupSelected = groupWordIds.length > 0 && groupWordIds.every(id => selectedWordIds.includes(id));

    if (allInGroupSelected) {
      onSelectionChange(selectedWordIds.filter(id => !groupWordIds.includes(id)));
    } else {
      onSelectionChange(Array.from(new Set([...selectedWordIds, ...groupWordIds])));
    }
  };

  // Toggle status filter
  const toggleStatus = (status: WordStatus) => {
    const isCurrentlyActive = selectedStatuses.includes(status);
    let nextStatuses: WordStatus[];
    if (isCurrentlyActive) {
      nextStatuses = selectedStatuses.filter(s => s !== status);
    } else {
      nextStatuses = [...selectedStatuses, status];
    }
    setSelectedStatuses(nextStatuses);

    // Get IDs belonging to this status
    const statusWordIds = vocabulary.filter(v => {
      const st = statsType === 'flashcards' ? (flashcardStats[v.id]?.status || 'not_practiced') : v.status;
      return st === status;
    }).map(v => v.id);

    if (isCurrentlyActive) {
      onSelectionChange(selectedWordIds.filter(id => !statusWordIds.includes(id)));
    } else {
      onSelectionChange(Array.from(new Set([...selectedWordIds, ...statusWordIds])));
    }
  };

  const selectAll = () => {
    setSelectedStatuses(['mastered', 'in_progress', 'failed', 'not_practiced']);
    onSelectionChange(vocabulary.map(v => v.id));
  };

  const deselectAll = () => {
    setSelectedStatuses([]);
    onSelectionChange([]);
  };

  // Compute stats for current mode
  const statsCounts = useMemo(() => {
    let mastered = 0;
    let inProgress = 0;
    let failed = 0;
    let notPracticed = 0;

    vocabulary.forEach(v => {
      const st = statsType === 'flashcards' ? (flashcardStats[v.id]?.status || 'not_practiced') : v.status;
      if (st === 'mastered') mastered++;
      else if (st === 'in_progress') inProgress++;
      else if (st === 'failed') failed++;
      else notPracticed++;
    });

    return { mastered, inProgress, failed, notPracticed };
  }, [vocabulary, statsType, flashcardStats]);

  return (
    <div className="space-y-4 text-xs">
      {/* Top Controls: Actions + Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={selectAll}
            className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-lg border border-indigo-500/40 transition-colors font-bold cursor-pointer"
          >
            Seleccionar Todas ({vocabulary.length})
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors font-semibold cursor-pointer"
          >
            Desmarcar Todas
          </button>
        </div>

        {/* Stats breakdown badge */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="text-slate-400 font-semibold">
            {statsType === 'flashcards' ? 'Estadísticas Flashcards:' : 'Estadísticas Evaluación:'}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
            Dominadas: {statsCounts.mastered}
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
            En progreso: {statsCounts.inProgress}
          </span>
          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
            {statsType === 'flashcards' ? 'No dominadas:' : 'Falladas:'} {statsCounts.failed}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
            Nuevas: {statsCounts.notPracticed}
          </span>
        </div>
      </div>

      {/* Folder sidebar + Main Area */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* FOLDERS SIDEBAR */}
        <aside className="w-full lg:w-56 flex-shrink-0 bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <label className="font-bold text-slate-200 flex items-center text-[11px]">
              <Folder className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
              Carpetas
            </label>
            <span className="text-[10px] text-slate-400">{availableGroups.length}</span>
          </div>

          <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedGroup('all')}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                selectedGroup === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span className="truncate">📚 Todos</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded-full font-mono">
                {vocabulary.length}
              </span>
            </button>

            {availableGroups.map(grp => {
              const groupWords = vocabulary.filter(v => (v.group || 'General') === grp);
              const selectedCountInGroup = groupWords.filter(v => selectedWordIds.includes(v.id)).length;
              const isAllSelected = groupWords.length > 0 && selectedCountInGroup === groupWords.length;
              const isPartiallySelected = selectedCountInGroup > 0 && !isAllSelected;
              const isGroupActive = selectedGroup === grp;

              return (
                <div
                  key={grp}
                  className={`flex items-center justify-between rounded-lg border transition-all overflow-hidden ${
                    isGroupActive
                      ? 'bg-indigo-950 border-indigo-500 text-white'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedGroup(grp)}
                    className="flex-1 px-2.5 py-1.5 text-left truncate hover:bg-white/5 cursor-pointer"
                  >
                    <span>📁 {grp}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroupSelection(grp)}
                    className={`px-2 py-1.5 border-l border-slate-800 transition-colors flex items-center justify-center cursor-pointer ${
                      isAllSelected
                        ? 'bg-emerald-600 text-white'
                        : isPartiallySelected
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* MAIN AREA */}
        <div className="flex-1 w-full space-y-3 min-w-0">
          {/* Status buttons & Search */}
          <div className="bg-slate-900/80 p-3 border border-slate-800 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <Filter className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <button
                  type="button"
                  onClick={() => toggleStatus('mastered')}
                  className={`px-2 py-1 rounded-md border flex items-center space-x-1 cursor-pointer text-[11px] font-semibold ${
                    selectedStatuses.includes('mastered')
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <span>Dominadas</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus('in_progress')}
                  className={`px-2 py-1 rounded-md border flex items-center space-x-1 cursor-pointer text-[11px] font-semibold ${
                    selectedStatuses.includes('in_progress')
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <span>En progreso</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus('failed')}
                  className={`px-2 py-1 rounded-md border flex items-center space-x-1 cursor-pointer text-[11px] font-semibold ${
                    selectedStatuses.includes('failed')
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <span>{statsType === 'flashcards' ? 'No dominadas' : 'Falladas'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus('not_practiced')}
                  className={`px-2 py-1 rounded-md border flex items-center space-x-1 cursor-pointer text-[11px] font-semibold ${
                    selectedStatuses.includes('not_practiced')
                      ? 'bg-slate-700 text-white border-slate-600'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <span>Nuevas</span>
                </button>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-48 flex-shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar palabra..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Checklist Items Grid */}
          <div className="max-h-[300px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-2.5 space-y-1.5 custom-scrollbar">
            {filteredVocabulary.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No se encontraron palabras que coincidan con los filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredVocabulary.map(item => {
                  const isChecked = selectedWordIds.includes(item.id);
                  const st: WordStatus = statsType === 'flashcards' 
                    ? (flashcardStats[item.id]?.status || 'not_practiced') 
                    : item.status;

                  let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
                  if (st === 'mastered') badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                  else if (st === 'in_progress') badgeColor = 'bg-amber-950 text-amber-300 border-amber-800';
                  else if (st === 'failed') badgeColor = 'bg-rose-950 text-rose-300 border-rose-800';

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleWord(item.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-indigo-950/60 border-indigo-600/80 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-bold text-slate-100 block truncate">{item.english}</span>
                          <span className="text-[11px] text-slate-400 block truncate">{item.spanish}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${badgeColor}`}>
                        {st === 'mastered' ? 'Dominada' : st === 'in_progress' ? 'En progreso' : st === 'failed' ? (statsType === 'flashcards' ? 'No dominada' : 'Fallada') : 'Nueva'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
