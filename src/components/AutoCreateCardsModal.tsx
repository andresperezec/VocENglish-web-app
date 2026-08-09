import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  CheckSquare,
  Square,
  Folder,
  Trash2,
  Plus,
  Pencil,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { PendingCardWord, VocabularyItem } from '../types';
import {
  getStoredPendingCardWords,
  saveStoredPendingCardWords,
  removePendingCardWord,
  clearPendingCardWords,
  addPendingCardWord,
  addBatchVocabularyWords
} from '../utils/storage';

interface AutoCreateCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableGroups: string[];
  onCardsCreated: (newCount: number, groupNames: string[]) => void;
  showToast: (msg: string) => void;
}

interface SelectedWordState extends PendingCardWord {
  isSelected: boolean;
}

export const AutoCreateCardsModal: React.FC<AutoCreateCardsModalProps> = ({
  isOpen,
  onClose,
  availableGroups,
  onCardsCreated,
  showToast
}) => {
  const [items, setItems] = useState<SelectedWordState[]>([]);
  const [newWordInput, setNewWordInput] = useState<string>('');
  const [newWordGroup, setNewWordGroup] = useState<string>('General');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load items when modal opens
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredPendingCardWords();
      setItems(
        stored.map(item => ({
          ...item,
          targetGroup: item.targetGroup || 'General',
          isSelected: true // Default to all selected
        }))
      );
      setNewWordInput('');
      setNewWordGroup('General');
      setEditingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle selection for a single word
  const toggleSelect = (id: string) => {
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, isSelected: !it.isSelected } : it))
    );
  };

  // Select all / Deselect all
  const selectAll = () => {
    setItems(prev => prev.map(it => ({ ...it, isSelected: true })));
  };

  const deselectAll = () => {
    setItems(prev => prev.map(it => ({ ...it, isSelected: false })));
  };

  // Update target folder for an item
  const updateTargetGroup = (id: string, group: string) => {
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, targetGroup: group } : it))
    );
  };

  // Delete item from list
  const removeItem = (id: string) => {
    removePendingCardWord(id);
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Add new word to the pending list manually
  const handleAddNewWord = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newWordInput.trim();
    if (!clean) return;

    const updatedStored = addPendingCardWord(clean, newWordGroup || 'General');
    const newlyAdded = updatedStored[updatedStored.length - 1];

    setItems(prev => [
      ...prev,
      {
        ...newlyAdded,
        isSelected: true
      }
    ]);

    setNewWordInput('');
  };

  // Edit item word inline
  const startEditing = (item: SelectedWordState) => {
    setEditingId(item.id);
    setEditingText(item.word);
  };

  const saveEditing = (id: string) => {
    const clean = editingText.trim();
    if (clean) {
      setItems(prev =>
        prev.map(it => (it.id === id ? { ...it, word: clean } : it))
      );
    }
    setEditingId(null);
  };

  // Primary Action: Generate Cards with AI
  const selectedItems = items.filter(it => it.isSelected && it.word.trim());

  const handleGenerateCards = async () => {
    if (selectedItems.length === 0) return;

    setIsProcessing(true);

    try {
      // Prepare payload for batch API
      const batchPayload = selectedItems.map(it => ({
        english: it.word.trim(),
        spanish: '',
        exampleSentence: ''
      }));

      const response = await fetch('/api/batch-complete-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: batchPayload })
      });

      if (!response.ok) {
        throw new Error('Error al consultar el servicio de IA.');
      }

      const data = await response.json();
      const completedList = data.items || [];

      // Combine AI results with chosen target groups
      const wordsToSave = selectedItems.map((selected, idx) => {
        const completed = completedList[idx] || {};
        return {
          english: selected.word.trim(),
          spanish: (completed.spanish || `Significado de ${selected.word}`).trim(),
          exampleSentence: (completed.exampleSentence || `Example sentence with ${selected.word}`).trim(),
          group: selected.targetGroup || 'General',
          status: 'not_practiced' as const
        };
      });

      // Save to vocabulary store
      addBatchVocabularyWords(wordsToSave);

      // Remove processed items from pending card words list in localStorage
      const processedIds = selectedItems.map(it => it.id);
      clearPendingCardWords(processedIds);

      // Collect target groups used for toast info
      const groupsUsed = Array.from(new Set(wordsToSave.map(w => w.group)));

      onCardsCreated(wordsToSave.length, groupsUsed);
      showToast(`¡Se crearon ${wordsToSave.length} tarjetas con éxito usando IA!`);
      onClose();

    } catch (err: any) {
      console.error('Error generating cards:', err);
      showToast('Ocurrió un error al generar las tarjetas. Inténtalo nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const allSelected = items.length > 0 && items.every(it => it.isSelected);
  const noneSelected = items.length > 0 && items.every(it => !it.isSelected);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                Crear automáticamente tarjetas de palabras
              </h2>
              <p className="text-xs text-purple-100 font-medium">
                Selecciona las palabras guardadas durante tus prácticas y elige su carpeta destino
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          
          {/* Quick Add Input Bar inside Modal */}
          <form onSubmit={handleAddNewWord} className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
            <label className="text-xs font-bold text-purple-900 flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-purple-600" />
              <span>Añadir otra palabra a la lista de pendientes:</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newWordInput}
                onChange={e => setNewWordInput(e.target.value)}
                placeholder="Ej: stubborn, carry out, standard..."
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              />
              <select
                value={newWordGroup}
                onChange={e => setNewWordGroup(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {availableGroups.map(grp => (
                  <option key={grp} value={grp}>
                    📁 {grp}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!newWordInput.trim()}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex-shrink-0"
              >
                Añadir
              </button>
            </div>
          </form>

          {/* Checklist Controls */}
          {items.length > 0 && (
            <div className="flex items-center justify-between pt-1 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span>Lista de verificación ({selectedItems.length} de {items.length} seleccionadas)</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allSelected}
                  className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Marcar todas</span>
                </button>

                <button
                  type="button"
                  onClick={deselectAll}
                  disabled={noneSelected}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Desmarcar todas</span>
                </button>
              </div>
            </div>
          )}

          {/* Checklist Items Table / List */}
          {items.length > 0 ? (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.isSelected
                      ? 'bg-purple-50/50 border-purple-200 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  {/* Left: Checkbox & Word Title */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                        item.isSelected
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-300 border-slate-300 hover:border-slate-400'
                      }`}
                      title={item.isSelected ? 'Desmarcar esta palabra' : 'Marcar esta palabra'}
                    >
                      {item.isSelected ? (
                        <CheckSquare className="w-4 h-4 text-white" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    {/* Word editing or text display */}
                    {editingId === item.id ? (
                      <div className="flex items-center space-x-1.5 flex-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          className="px-2.5 py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => saveEditing(item.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-sm font-bold text-slate-800 truncate font-sans">
                          {item.word}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg cursor-pointer transition-colors"
                          title="Editar texto de la palabra"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Existing Folder Selector & Delete */}
                  <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                    <div className="flex items-center space-x-1 text-xs text-slate-600">
                      <Folder className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <select
                        value={item.targetGroup}
                        onChange={e => updateTargetGroup(item.id, e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                        title="Selecciona la carpeta destino existente"
                      >
                        {availableGroups.map(grp => (
                          <option key={grp} value={grp}>
                            📁 {grp}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Quitar de la lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                No tienes palabras guardadas actualmente.
              </p>
              <p className="text-xs text-slate-500">
                Guarda palabras desconocidas durante tus evaluaciones o escribe una arriba para probar.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGenerateCards}
            disabled={selectedItems.length === 0 || isProcessing}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-100 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Completando tarjetas con IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  Crear automáticamente {selectedItems.length} {selectedItems.length === 1 ? 'tarjeta' : 'tarjetas'} (IA)
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
