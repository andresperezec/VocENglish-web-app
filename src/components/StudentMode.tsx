import React, { useState, useMemo, useRef } from 'react';
import { VocabularyItem, WordStatus, QuestionConfig } from '../types';
import { getStoredGroups } from '../utils/storage';
import { playPronunciation } from '../utils/audio';
import { 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  CheckSquare, 
  Square, 
  Play, 
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Save,
  Download,
  Upload,
  X,
  CheckCircle2,
  FileText,
  Folder,
  FolderPlus,
  FolderInput,
  Tag,
  RotateCcw,
  Sparkles,
  Loader2,
  Volume2,
  StickyNote
} from 'lucide-react';

interface StudentModeProps {
  vocabulary: VocabularyItem[];
  trash?: VocabularyItem[];
  onSetWordStatus: (wordId: number, status: WordStatus) => void;
  onStartQuizWithSelection: (config: QuestionConfig) => void;
  onAddWord: (word: { english: string; spanish: string; group?: string; exampleSentence?: string; status?: WordStatus }) => void;
  onAddBatchWords?: (batch: Array<{ english: string; spanish: string; group?: string; exampleSentence?: string; status?: WordStatus }>) => void;
  onAddCustomGroup?: (groupName: string) => void;
  onEditWord: (word: VocabularyItem) => void;
  onDeleteWord: (wordId: number) => void;
  onRestoreWord?: (wordId: number) => void;
  onPermanentDeleteWord?: (wordId: number) => void;
  onEmptyTrash?: () => void;
  onRestoreAllTrash?: () => void;
  onMoveWordsToGroup?: (wordIds: number[], targetGroup: string) => void;
  onRenameGroup?: (oldName: string, newName: string) => void;
  onDeleteGroup?: (groupName: string) => void;
  onSaveProgress: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => void;
  onResetProgressOnly?: () => void;
  onResetFactoryAll?: () => void;
}

export const StudentMode: React.FC<StudentModeProps> = ({
  vocabulary,
  trash = [],
  onSetWordStatus,
  onStartQuizWithSelection,
  onAddWord,
  onAddBatchWords,
  onAddCustomGroup,
  onEditWord,
  onDeleteWord,
  onRestoreWord,
  onPermanentDeleteWord,
  onEmptyTrash,
  onRestoreAllTrash,
  onMoveWordsToGroup,
  onRenameGroup,
  onDeleteGroup,
  onSaveProgress,
  onExportBackup,
  onImportBackup,
  onResetProgressOnly,
  onResetFactoryAll
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | WordStatus>('all');
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>(
    vocabulary.map(v => v.id)
  );

  // Toast / notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addModalTab, setAddModalTab] = useState<'single' | 'batch'>('single');
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);

  // Batch Add Modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [batchRawText, setBatchRawText] = useState<string>('');
  const [batchTargetGroup, setBatchTargetGroup] = useState<string>('General');
  const [customBatchGroup, setCustomBatchGroup] = useState<string>('');
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [batchParsedItems, setBatchParsedItems] = useState<Array<{
    english: string;
    spanish: string;
    exampleSentence: string;
    group: string;
    selected: boolean;
  }>>([]);

  // Move Modal state
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [moveItemsTarget, setMoveItemsTarget] = useState<VocabularyItem[]>([]);
  const [moveTargetGroup, setMoveTargetGroup] = useState<string>('General');
  const [customMoveGroupInput, setCustomMoveGroupInput] = useState<string>('');

  // Trash Modal state
  const [isTrashModalOpen, setIsTrashModalOpen] = useState<boolean>(false);
  const [trashSearchTerm, setTrashSearchTerm] = useState<string>('');

  // Group creation & management state
  const [newGroupNameInput, setNewGroupNameInput] = useState<string>('');
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [renamedGroupInput, setRenamedGroupInput] = useState<string>('');

  // Add word form state
  const [newEnglish, setNewEnglish] = useState<string>('');
  const [newSpanish, setNewSpanish] = useState<string>('');
  const [newGroup, setNewGroup] = useState<string>('General');
  const [customNewGroup, setCustomNewGroup] = useState<string>('');
  const [newExample, setNewExample] = useState<string>('');
  const [newStatus, setNewStatus] = useState<WordStatus>('not_practiced');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newPresent, setNewPresent] = useState<string>('');
  const [newPast, setNewPast] = useState<string>('');
  const [newPastParticiple, setNewPastParticiple] = useState<string>('');
  const [newIsVerb, setNewIsVerb] = useState<boolean | undefined>(undefined);
  const [isCompletingNewVerb, setIsCompletingNewVerb] = useState<boolean>(false);

  // Edit word form state
  const [editEnglish, setEditEnglish] = useState<string>('');
  const [editSpanish, setEditSpanish] = useState<string>('');
  const [editGroup, setEditGroup] = useState<string>('General');
  const [customEditGroup, setCustomEditGroup] = useState<string>('');
  const [editExample, setEditExample] = useState<string>('');
  const [editStatus, setEditStatus] = useState<WordStatus>('not_practiced');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editPresent, setEditPresent] = useState<string>('');
  const [editPast, setEditPast] = useState<string>('');
  const [editPastParticiple, setEditPastParticiple] = useState<string>('');
  const [editIsVerb, setEditIsVerb] = useState<boolean | undefined>(undefined);
  const [isCompletingEditVerb, setIsCompletingEditVerb] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Available groups
  const availableGroups = useMemo(() => {
    return getStoredGroups();
  }, [vocabulary]);

  // Group counts
  const counts = {
    all: vocabulary.length,
    mastered: vocabulary.filter(v => v.status === 'mastered').length,
    in_progress: vocabulary.filter(v => v.status === 'in_progress').length,
    failed: vocabulary.filter(v => v.status === 'failed').length,
    not_practiced: vocabulary.filter(v => v.status === 'not_practiced').length
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return vocabulary.filter(item => {
      const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
      const matchesGroup = activeGroup === 'all' || (item.group || 'General') === activeGroup;
      const matchesSearch =
        item.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.spanish.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.group || 'General').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesGroup && matchesSearch;
    });
  }, [vocabulary, activeFilter, activeGroup, searchTerm]);

  // Handle Checklist selections
  const toggleSelectWord = (id: number) => {
    if (selectedWordIds.includes(id)) {
      setSelectedWordIds(selectedWordIds.filter(wId => wId !== id));
    } else {
      setSelectedWordIds([...selectedWordIds, id]);
    }
  };

  const selectAllFiltered = () => {
    const idsToAdd = new Set([...selectedWordIds, ...filteredList.map(item => item.id)]);
    setSelectedWordIds(Array.from(idsToAdd));
  };

  const deselectAllFiltered = () => {
    const filteredSet = new Set(filteredList.map(item => item.id));
    setSelectedWordIds(selectedWordIds.filter(id => !filteredSet.has(id)));
  };

  // Toggle selection for all words in a specific group / folder
  const toggleGroupSelectionInStudent = (grpName: string) => {
    const groupWordIds = vocabulary
      .filter(v => (v.group || 'General') === grpName)
      .map(v => v.id);
    const allInGroupSelected = groupWordIds.length > 0 && groupWordIds.every(id => selectedWordIds.includes(id));

    if (allInGroupSelected) {
      setSelectedWordIds(prev => prev.filter(id => !groupWordIds.includes(id)));
    } else {
      setSelectedWordIds(prev => Array.from(new Set([...prev, ...groupWordIds])));
    }
  };

  // Toggle selection for all words with a specific status
  const toggleStatusSelectionInStudent = (status: WordStatus) => {
    const statusWordIds = vocabulary
      .filter(v => v.status === status)
      .map(v => v.id);
    const allStatusSelected = statusWordIds.length > 0 && statusWordIds.every(id => selectedWordIds.includes(id));

    if (allStatusSelected) {
      setSelectedWordIds(prev => prev.filter(id => !statusWordIds.includes(id)));
    } else {
      setSelectedWordIds(prev => Array.from(new Set([...prev, ...statusWordIds])));
    }
  };

  // Move Modal handlers
  const openMoveModalForSingle = (item: VocabularyItem) => {
    setMoveItemsTarget([item]);
    const curGroup = item.group || 'General';
    setMoveTargetGroup(availableGroups.includes(curGroup) ? curGroup : 'General');
    setCustomMoveGroupInput('');
    setIsMoveModalOpen(true);
  };

  const openMoveModalForSelected = () => {
    const selectedItems = vocabulary.filter(v => selectedWordIds.includes(v.id));
    if (selectedItems.length === 0) return;
    setMoveItemsTarget(selectedItems);
    setMoveTargetGroup('General');
    setCustomMoveGroupInput('');
    setIsMoveModalOpen(true);
  };

  const handleConfirmMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (moveItemsTarget.length === 0) return;
    const finalGroup = (moveTargetGroup === '__custom__' ? customMoveGroupInput : moveTargetGroup).trim() || 'General';
    const ids = moveItemsTarget.map(item => item.id);
    if (onMoveWordsToGroup) {
      onMoveWordsToGroup(ids, finalGroup);
    }
    showToast(`¡Se ${ids.length === 1 ? 'movió 1 expresión' : `movieron ${ids.length} expresiones`} al grupo "${finalGroup}"!`);
    setIsMoveModalOpen(false);
    setMoveItemsTarget([]);
  };

  const handleStartQuickQuiz = () => {
    if (selectedWordIds.length === 0) return;
    const selectedCount = selectedWordIds.length;
    const perType = Math.max(1, Math.min(3, Math.floor(selectedCount / 4)));

    onStartQuizWithSelection({
      fillInBlankCount: perType,
      enToEsCount: perType,
      esToEnCount: perType,
      sentenceCount: perType,
      selectedStatuses: ['mastered', 'in_progress', 'failed', 'not_practiced'],
      selectedWordIds
    });
  };

  // Add Word Handler
  const openAddModal = () => {
    setNewEnglish('');
    setNewSpanish('');
    setNewGroup(activeGroup !== 'all' ? activeGroup : 'General');
    setCustomNewGroup('');
    setNewExample('');
    setNewStatus('not_practiced');
    setNewNotes('');
    setNewPresent('');
    setNewPast('');
    setNewPastParticiple('');
    setAddModalTab('single');
    setIsAddModalOpen(true);
  };

  const handleCompleteVerbNew = async () => {
    const inputVerb = newEnglish.trim() || newPresent.trim() || newPast.trim() || newPastParticiple.trim();
    if (!inputVerb) {
      showToast("Por favor escribe la expresión o algún tiempo verbal primero.");
      return;
    }
    setIsCompletingNewVerb(true);
    try {
      const res = await fetch('/api/complete-verb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verb: inputVerb,
          present: newPresent.trim(),
          past: newPast.trim(),
          pastParticiple: newPastParticiple.trim(),
          spanish: newSpanish.trim()
        })
      });
      const data = await res.json();
      if (data) {
        setNewIsVerb(data.isVerb);
        if (data.detectedTense === 'pastParticiple') {
          setNewPastParticiple(prev => prev || data.pastParticiple || inputVerb);
          setNewPresent(prev => prev || data.present || '');
          setNewPast(prev => prev || data.past || '');
        } else if (data.detectedTense === 'past') {
          setNewPast(prev => prev || data.past || inputVerb);
          setNewPresent(prev => prev || data.present || '');
          setNewPastParticiple(prev => prev || data.pastParticiple || '');
        } else {
          setNewPresent(prev => prev || data.present || inputVerb);
          setNewPast(prev => prev || data.past || '');
          setNewPastParticiple(prev => prev || data.pastParticiple || '');
        }

        if (!newSpanish.trim() && data.spanish) {
          setNewSpanish(data.spanish);
        }

        if (!newEnglish.trim()) {
          setNewEnglish(data.present || inputVerb);
        }

        if (data.isVerb === false) {
          showToast("⚠️ Nota: Esta palabra no ha sido reconocida como un verbo en inglés.");
        } else {
          showToast("¡Tiempos verbales autocompletados con éxito por la IA!");
        }
      }
    } catch (e) {
      console.error(e);
      showToast("Error al autocompletar verbo.");
    } finally {
      setIsCompletingNewVerb(false);
    }
  };

  const openBatchModal = () => {
    setBatchRawText('');
    setBatchParsedItems([]);
    setBatchTargetGroup(activeGroup !== 'all' ? activeGroup : 'General');
    setCustomBatchGroup('');
    setIsBatchModalOpen(true);
  };

  const handleProcessBatchText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lines = batchRawText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      showToast('Por favor ingresa o pega al menos una línea con palabras en inglés.');
      return;
    }

    const targetGrp = (batchTargetGroup === '__custom__' ? customBatchGroup : batchTargetGroup).trim() || 'General';

    // Parse initial raw lines
    const parsed = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      const english = parts[0] || '';
      const spanish = parts.length > 1 ? parts[1] : '';
      const exampleSentence = parts.length > 2 ? parts.slice(2).join(', ') : '';
      return {
        english,
        spanish,
        exampleSentence,
        group: targetGrp,
        selected: true
      };
    }).filter(item => item.english.length > 0);

    if (parsed.length === 0) {
      showToast('No se detectaron palabras válidas en el texto.');
      return;
    }

    setIsProcessingBatch(true);
    try {
      const res = await fetch('/api/batch-complete-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsed })
      });
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        const completedList = data.items.map((it: any, idx: number) => ({
          english: it.english || parsed[idx]?.english || '',
          spanish: it.spanish || parsed[idx]?.spanish || '',
          exampleSentence: it.exampleSentence || parsed[idx]?.exampleSentence || '',
          group: parsed[idx]?.group || targetGrp,
          selected: true
        }));
        setBatchParsedItems(completedList);
        showToast(`¡Completado con IA! Revisa y edita las ${completedList.length} tarjetas antes de guardar.`);
      } else {
        setBatchParsedItems(parsed);
      }
    } catch (err) {
      console.error('Error processing batch words:', err);
      setBatchParsedItems(parsed);
      showToast('Texto procesado. Puedes revisar los campos manualmente.');
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleSaveBatchItems = () => {
    const selectedItems = batchParsedItems.filter(item => item.selected && item.english.trim());
    if (selectedItems.length === 0) {
      showToast('Selecciona al menos una tarjeta válida para guardar.');
      return;
    }

    const payload = selectedItems.map(item => ({
      english: item.english.trim(),
      spanish: item.spanish.trim() || `Traducción de ${item.english.trim()}`,
      group: item.group.trim() || 'General',
      exampleSentence: item.exampleSentence.trim() || undefined,
      status: 'not_practiced' as WordStatus
    }));

    if (onAddBatchWords) {
      onAddBatchWords(payload);
    } else {
      payload.forEach(item => onAddWord(item));
    }

    showToast(`¡Se agregaron ${selectedItems.length} tarjetas exitosamente a tu vocabulario!`);
    setIsBatchModalOpen(false);
    setIsAddModalOpen(false);
    setBatchRawText('');
    setBatchParsedItems([]);
  };

  const handleCreateWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnglish.trim() || !newSpanish.trim()) return;

    const finalGroup = (newGroup === '__custom__' ? customNewGroup : newGroup).trim() || 'General';

    onAddWord({
      english: newEnglish,
      spanish: newSpanish,
      group: finalGroup,
      exampleSentence: newExample,
      status: newStatus,
      notes: newNotes.trim() || undefined,
      present: newPresent.trim() || undefined,
      past: newPast.trim() || undefined,
      pastParticiple: newPastParticiple.trim() || undefined,
      isVerb: newIsVerb
    });

    setNewEnglish('');
    setNewSpanish('');
    setNewGroup('General');
    setCustomNewGroup('');
    setNewExample('');
    setNewStatus('not_practiced');
    setNewNotes('');
    setNewPresent('');
    setNewPast('');
    setNewPastParticiple('');
    setNewIsVerb(undefined);
    setIsAddModalOpen(false);
    showToast('¡Nueva palabra agregada y guardada exitosamente!');
  };

  // Edit Word Handler
  const openEditModal = (item: VocabularyItem) => {
    setEditingItem(item);
    setEditEnglish(item.english);
    setEditSpanish(item.spanish);
    const itemGroup = item.group || 'General';
    setEditGroup(availableGroups.includes(itemGroup) ? itemGroup : '__custom__');
    setCustomEditGroup(availableGroups.includes(itemGroup) ? '' : itemGroup);
    setEditExample(item.exampleSentence || '');
    setEditStatus(item.status);
    setEditNotes(item.notes || '');
    setEditPresent(item.present || '');
    setEditPast(item.past || '');
    setEditPastParticiple(item.pastParticiple || '');
    setEditIsVerb(item.isVerb);
  };

  const handleCompleteVerbEdit = async () => {
    const inputVerb = editEnglish.trim() || editPresent.trim() || editPast.trim() || editPastParticiple.trim();
    if (!inputVerb) {
      showToast("Por favor escribe la expresión o algún tiempo verbal primero.");
      return;
    }
    setIsCompletingEditVerb(true);
    try {
      const res = await fetch('/api/complete-verb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verb: inputVerb,
          present: editPresent.trim(),
          past: editPast.trim(),
          pastParticiple: editPastParticiple.trim(),
          spanish: editSpanish.trim()
        })
      });
      const data = await res.json();
      if (data) {
        setEditIsVerb(data.isVerb);
        if (data.detectedTense === 'pastParticiple') {
          setEditPastParticiple(prev => prev || data.pastParticiple || inputVerb);
          setEditPresent(prev => prev || data.present || '');
          setEditPast(prev => prev || data.past || '');
        } else if (data.detectedTense === 'past') {
          setEditPast(prev => prev || data.past || inputVerb);
          setEditPresent(prev => prev || data.present || '');
          setEditPastParticiple(prev => prev || data.pastParticiple || '');
        } else {
          setEditPresent(prev => prev || data.present || inputVerb);
          setEditPast(prev => prev || data.past || '');
          setEditPastParticiple(prev => prev || data.pastParticiple || '');
        }

        if (!editSpanish.trim() && data.spanish) {
          setEditSpanish(data.spanish);
        }

        if (!editEnglish.trim()) {
          setEditEnglish(data.present || inputVerb);
        }

        if (data.isVerb === false) {
          showToast("⚠️ Nota: Esta palabra no ha sido reconocida como un verbo en inglés.");
        } else {
          showToast("¡Tiempos verbales autocompletados con éxito por la IA!");
        }
      }
    } catch (e) {
      console.error(e);
      showToast("Error al autocompletar verbo.");
    } finally {
      setIsCompletingEditVerb(false);
    }
  };

  const handleUpdateWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editEnglish.trim() || !editSpanish.trim()) return;

    const finalGroup = (editGroup === '__custom__' ? customEditGroup : editGroup).trim() || 'General';

    onEditWord({
      ...editingItem,
      english: editEnglish.trim(),
      spanish: editSpanish.trim(),
      group: finalGroup,
      exampleSentence: editExample.trim() || undefined,
      status: editStatus,
      notes: editNotes.trim() || undefined,
      present: editPresent.trim() || undefined,
      past: editPast.trim() || undefined,
      pastParticiple: editPastParticiple.trim() || undefined,
      isVerb: editIsVerb
    });

    setEditingItem(null);
    showToast('¡Expresión actualizada y guardada correctamente!');
  };

  // Delete Word Handler
  const confirmDeleteWord = () => {
    if (deletingItemId !== null) {
      onDeleteWord(deletingItemId);
      setSelectedWordIds(selectedWordIds.filter(id => id !== deletingItemId));
      setDeletingItemId(null);
      showToast('Tarjeta movida a la Papelera. Puedes restaurarla cuando desees.');
    }
  };

  // Trash filtering & operations
  const filteredTrash = useMemo(() => {
    if (!trashSearchTerm.trim()) return trash;
    const term = trashSearchTerm.toLowerCase().trim();
    return trash.filter(t =>
      t.english.toLowerCase().includes(term) ||
      t.spanish.toLowerCase().includes(term) ||
      (t.group && t.group.toLowerCase().includes(term))
    );
  }, [trash, trashSearchTerm]);

  const handleRestoreFromTrash = (wordId: number) => {
    if (onRestoreWord) {
      onRestoreWord(wordId);
      showToast('Tarjeta restaurada al vocabulario con éxito.');
    }
  };

  const handlePermanentDeleteFromTrash = (wordId: number, english: string) => {
    if (window.confirm(`¿Eliminar permanentemente "${english}"? Esta acción no se puede deshacer.`)) {
      if (onPermanentDeleteWord) {
        onPermanentDeleteWord(wordId);
        showToast(`"${english}" se eliminó definitivamente.`);
      }
    }
  };

  const handleEmptyTrashConfirm = () => {
    if (trash.length === 0) return;
    if (window.confirm(`¿Vaciar la papelera? Se eliminarán permanentemente las ${trash.length} tarjetas.`)) {
      if (onEmptyTrash) {
        onEmptyTrash();
        showToast('La papelera ha sido vaciada.');
      }
    }
  };

  const handleRestoreAllConfirm = () => {
    if (trash.length === 0) return;
    if (onRestoreAllTrash) {
      onRestoreAllTrash();
      showToast(`¡Se restauraron ${trash.length} tarjetas al vocabulario!`);
    }
  };

  // Save Progress Action
  const handleManualSave = () => {
    onSaveProgress();
    const timeStr = new Date().toLocaleTimeString();
    showToast(`¡Progreso y vocabulario guardados con éxito a las ${timeStr}!`);
  };

  // File Import Handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        onImportBackup(content);
        showToast('¡Copia de seguridad importada y restaurada exitosamente!');
        setIsBackupModalOpen(false);
      } catch (err) {
        alert('El archivo seleccionado no tiene un formato de respaldo JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-emerald-500/40 flex items-center space-x-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Main Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center tracking-tight">
            <BookOpen className="w-7 h-7 text-indigo-600 mr-3" />
            Palabras/Frases
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Gestiona, edita, agrega o elimina palabras de tu lista ({counts.all} expresiones), y guarda o descarga tu progreso.
          </p>
        </div>

        {/* Banner Buttons organized in 3 rows as requested */}
        <div className="flex flex-col gap-2.5">
          {/* Row 1: Agregar palabra, Guardar progreso, Papelera */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openAddModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-100 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Palabra</span>
            </button>

            <button
              onClick={handleManualSave}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Progreso</span>
            </button>

            <button
              onClick={() => setIsTrashModalOpen(true)}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 transition-all flex items-center space-x-1.5 cursor-pointer relative"
              title="Ver tarjetas eliminadas en la Papelera"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Papelera</span>
              {trash.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-rose-600 text-white font-bold text-[10px] rounded-full">
                  {trash.length}
                </span>
              )}
            </button>
          </div>

          {/* Row 2: Agregar en lote (IA), Respaldo JSON */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openBatchModal}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-100 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Agregar en Lote (IA)</span>
            </button>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Respaldo JSON</span>
            </button>
          </div>

          {/* Row 3: Evaluar, Administrar Grupos */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartQuickQuiz}
              disabled={selectedWordIds.length === 0}
              className="px-3.5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Evaluar ({selectedWordIds.length})</span>
            </button>

            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs rounded-xl border border-purple-200 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-purple-600" />
              <span>Administrar Grupos</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- MAIN LAYOUT: SIDEBAR (FOLDERS/GROUPS VERTICAL TABS) + CONTENT AREA --- */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* SIDEBAR: FOLDERS / GROUPS VERTICAL TABS */}
        <aside className="w-full lg:w-72 flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 lg:sticky lg:top-20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center">
              <Folder className="w-4 h-4 text-indigo-600 mr-2" />
              Carpetas / Grupos
            </span>
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(true)}
              className="px-2 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all flex items-center cursor-pointer"
              title="Crear un nuevo grupo / carpeta"
            >
              <Plus className="w-3.5 h-3.5 mr-0.5" />
              <span>Nuevo</span>
            </button>
          </div>

          {/* Vertical list of folder tabs */}
          <div className="space-y-1.5 max-h-[60vh] lg:max-h-[calc(100vh-220px)] overflow-y-auto pr-0.5">
            {/* "Todos los Grupos" tab */}
            <button
              onClick={() => setActiveGroup('all')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                activeGroup === 'all'
                  ? 'bg-slate-900 text-white border-slate-800 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center space-x-2 truncate">
                <span>📚 Todos los Grupos</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
                activeGroup === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600'
              }`}>
                {vocabulary.length}
              </span>
            </button>

            {/* Individual Group Tabs */}
            {availableGroups.map(grp => {
              const groupWords = vocabulary.filter(v => (v.group || 'General') === grp);
              const selectedCountInGroup = groupWords.filter(v => selectedWordIds.includes(v.id)).length;
              const isAllSelected = groupWords.length > 0 && selectedCountInGroup === groupWords.length;
              const isPartiallySelected = selectedCountInGroup > 0 && !isAllSelected;
              const isGroupActive = activeGroup === grp;

              return (
                <div
                  key={grp}
                  className={`flex items-center justify-between rounded-xl border text-xs font-bold transition-all overflow-hidden ${
                    isGroupActive
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <button
                    onClick={() => setActiveGroup(grp)}
                    className="flex-1 px-3 py-2 flex items-center space-x-2 text-left truncate cursor-pointer min-w-0"
                    title={`Ver tarjetas del grupo ${grp}`}
                  >
                    <span className="truncate">📁 {grp}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono flex-shrink-0 ${
                      isGroupActive ? 'bg-indigo-500/60 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {selectedCountInGroup}/{groupWords.length}
                    </span>
                  </button>

                  <div className="flex items-center flex-shrink-0">
                    <button
                      onClick={() => toggleGroupSelectionInStudent(grp)}
                      className={`p-1.5 border-l transition-colors flex items-center justify-center cursor-pointer ${
                        isGroupActive ? 'border-indigo-400' : 'border-slate-200'
                      } ${
                        isAllSelected
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : isPartiallySelected
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                      title={
                        isAllSelected
                          ? `Desmarcar todas las tarjetas de "${grp}"`
                          : `Marcar todas las tarjetas de "${grp}"`
                      }
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {grp !== 'General' && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = window.prompt(`Cambiar el nombre de la carpeta "${grp}":`, grp);
                            if (newName && newName.trim() && newName.trim() !== grp) {
                              const cleanName = newName.trim();
                              if (onRenameGroup) {
                                onRenameGroup(grp, cleanName);
                              }
                              if (activeGroup === grp) {
                                setActiveGroup(cleanName);
                              }
                              showToast(`La carpeta fue renombrada a "${cleanName}".`);
                            }
                          }}
                          className={`p-1.5 border-l transition-colors flex items-center justify-center cursor-pointer ${
                            isGroupActive
                              ? 'border-indigo-400 text-indigo-100 hover:text-white hover:bg-indigo-500'
                              : 'border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                          title={`Cambiar nombre de la carpeta "${grp}"`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `¿Deseas eliminar la carpeta "${grp}"?\n\nSi la carpeta contiene tarjetas, estas se moverán a "General".`
                              )
                            ) {
                              if (onDeleteGroup) {
                                onDeleteGroup(grp);
                              }
                              if (activeGroup === grp) {
                                setActiveGroup('all');
                              }
                              showToast(`La carpeta "${grp}" ha sido eliminada.`);
                            }
                          }}
                          className={`p-1.5 border-l transition-colors flex items-center justify-center cursor-pointer ${
                            isGroupActive
                              ? 'border-indigo-400 text-indigo-100 hover:text-white hover:bg-rose-600/80'
                              : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title={`Eliminar carpeta "${grp}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-purple-600" />
              <span>Administrar Grupos</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 w-full space-y-6 min-w-0">
          {/* Status Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeFilter === 'all'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todas las palabras/frases ({counts.all})
        </button>

        {/* Mastered */}
        <div className={`inline-flex items-center rounded-xl border text-xs font-semibold transition-all overflow-hidden ${
          activeFilter === 'mastered'
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          <button
            onClick={() => setActiveFilter('mastered')}
            className="px-3 py-2 flex items-center space-x-1.5 hover:bg-black/5"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Dominadas ({counts.mastered})</span>
          </button>
          <button
            onClick={() => toggleStatusSelectionInStudent('mastered')}
            className="px-2 py-2 border-l border-emerald-300/60 hover:bg-emerald-600 hover:text-white transition-colors"
            title="Marcar / Desmarcar todas las palabras Dominadas"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* In Progress */}
        <div className={`inline-flex items-center rounded-xl border text-xs font-semibold transition-all overflow-hidden ${
          activeFilter === 'in_progress'
            ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          <button
            onClick={() => setActiveFilter('in_progress')}
            className="px-3 py-2 flex items-center space-x-1.5 hover:bg-black/5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>En Progreso ({counts.in_progress})</span>
          </button>
          <button
            onClick={() => toggleStatusSelectionInStudent('in_progress')}
            className="px-2 py-2 border-l border-amber-300/60 hover:bg-amber-600 hover:text-white transition-colors"
            title="Marcar / Desmarcar todas las palabras En Progreso"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Failed */}
        <div className={`inline-flex items-center rounded-xl border text-xs font-semibold transition-all overflow-hidden ${
          activeFilter === 'failed'
            ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          <button
            onClick={() => setActiveFilter('failed')}
            className="px-3 py-2 flex items-center space-x-1.5 hover:bg-black/5"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Falladas ({counts.failed})</span>
          </button>
          <button
            onClick={() => toggleStatusSelectionInStudent('failed')}
            className="px-2 py-2 border-l border-rose-300/60 hover:bg-rose-600 hover:text-white transition-colors"
            title="Marcar / Desmarcar todas las palabras Falladas"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Not Practiced */}
        <div className={`inline-flex items-center rounded-xl border text-xs font-semibold transition-all overflow-hidden ${
          activeFilter === 'not_practiced'
            ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveFilter('not_practiced')}
            className="px-3 py-2 flex items-center space-x-1.5 hover:bg-black/5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Nuevas ({counts.not_practiced})</span>
          </button>
          <button
            onClick={() => toggleStatusSelectionInStudent('not_practiced')}
            className="px-2 py-2 border-l border-slate-300/60 hover:bg-slate-700 hover:text-white transition-colors"
            title="Marcar / Desmarcar todas las palabras Nuevas"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Group Info Banner (when filtering by a specific group) */}
      {activeGroup !== 'all' && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Carpeta Seleccionada: <span className="text-indigo-700 font-extrabold">{activeGroup}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Contiene {vocabulary.filter(v => (v.group || 'General') === activeGroup).length} tarjeta(s) de vocabulario
              </div>
            </div>
          </div>

          {activeGroup !== 'General' && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  const newName = window.prompt(`Cambiar el nombre de la carpeta "${activeGroup}":`, activeGroup);
                  if (newName && newName.trim() && newName.trim() !== activeGroup) {
                    const cleanName = newName.trim();
                    if (onRenameGroup) {
                      onRenameGroup(activeGroup, cleanName);
                    }
                    setActiveGroup(cleanName);
                    showToast(`La carpeta fue renombrada a "${cleanName}".`);
                  }
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                title="Cambiar nombre a esta carpeta"
              >
                <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                <span>Renombrar Carpeta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Deseas eliminar la carpeta "${activeGroup}"?\n\nLas tarjetas dentro de esta carpeta se moverán a "General".`
                    )
                  ) {
                    if (onDeleteGroup) {
                      onDeleteGroup(activeGroup);
                    }
                    setActiveGroup('all');
                    showToast(`La carpeta "${activeGroup}" ha sido eliminada.`);
                  }
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Eliminar esta carpeta"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Eliminar Carpeta</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Controls Bar: Search & Checkbox Select All */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        {/* Search box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar palabra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Selection toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={selectAllFiltered}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg border border-slate-200 transition-colors"
          >
            Seleccionar Visibles ({filteredList.length})
          </button>
          <button
            onClick={deselectAllFiltered}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg border border-slate-200 transition-colors"
          >
            Desmarcar Visibles
          </button>
          <button
            onClick={openMoveModalForSelected}
            disabled={selectedWordIds.length === 0}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-40 disabled:hover:bg-purple-600"
            title="Mover todas las expresiones seleccionadas a un grupo"
          >
            <FolderInput className="w-3.5 h-3.5" />
            <span>Mover Seleccionadas ({selectedWordIds.length}) a un Grupo...</span>
          </button>
        </div>
      </div>

      {/* Vocabulary Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.map((item) => {
          const isSelected = selectedWordIds.includes(item.id);
          const accuracy = item.attempts > 0 ? Math.round((item.correctCount / item.attempts) * 100) : 0;

          return (
            <div
              key={item.id}
              className={`bg-white border rounded-2xl p-5 space-y-3 transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-400 shadow-md shadow-indigo-100/50 ring-1 ring-indigo-400'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                {/* Card Top Header */}
                <div className="flex items-start justify-between">
                  <div
                    onClick={() => toggleSelectWord(item.id)}
                    className="flex items-center space-x-2.5 cursor-pointer select-none"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{item.id}
                    </span>
                  </div>

                  {/* Actions (Move, Edit & Delete) + Status Badge */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openMoveModalForSingle(item)}
                      title="Mover a otro Grupo"
                      className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <FolderInput className="w-3.5 h-3.5 text-purple-600" />
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      title="Editar Expresión"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingItemId(item.id)}
                      title="Eliminar Palabra"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full uppercase font-mono font-bold ${
                        item.status === 'mastered'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'in_progress'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : item.status === 'failed'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.status === 'mastered' && 'Dominada'}
                      {item.status === 'in_progress' && 'En Progreso'}
                      {item.status === 'failed' && 'Fallada'}
                      {item.status === 'not_practiced' && 'No Practicada'}
                    </span>
                  </div>
                </div>

                {/* Word Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-slate-800 font-sans">
                        {item.english}
                      </span>
                      <button
                        type="button"
                        onClick={() => playPronunciation(item.english)}
                        className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Escuchar pronunciación"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => openMoveModalForSingle(item)}
                      className="inline-flex items-center text-[10px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                      title="Cambiar grupo de esta expresión"
                    >
                      <FolderInput className="w-3 h-3 mr-1 text-purple-600" />
                      <span>{item.group || 'General'}</span>
                    </button>
                  </div>

                  <div className="text-sm text-indigo-600 italic font-sans font-medium">
                    "{item.spanish}"
                  </div>

                  {/* Non-verb warning if inside a verb group but isVerb === false */}
                  {((item.group || '').toLowerCase().includes('verb') || activeGroup.toLowerCase().includes('verb')) && item.isVerb === false && (
                    <div className="text-[11px] text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200 font-semibold flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                      <span>⚠️ Esta entrada no ha sido reconocida como un verbo en inglés.</span>
                    </div>
                  )}

                  {/* Verb forms display if available */}
                  {(item.present || item.past || item.pastParticiple || item.group?.toLowerCase().includes('verb')) && (
                    <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-lg text-[11px] font-mono font-medium text-slate-700 border border-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Presente</span>
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-700 truncate">{item.present || item.english}</span>
                          <button
                            type="button"
                            onClick={() => playPronunciation(item.present || item.english)}
                            className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded cursor-pointer flex-shrink-0"
                            title="Escuchar"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Pasado</span>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-800 truncate">{item.past || '-'}</span>
                          {item.past && (
                            <button
                              type="button"
                              onClick={() => playPronunciation(item.past!)}
                              className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded cursor-pointer flex-shrink-0"
                              title="Escuchar"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Participio</span>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-800 truncate">{item.pastParticiple || '-'}</span>
                          {item.pastParticiple && (
                            <button
                              type="button"
                              onClick={() => playPronunciation(item.pastParticiple!)}
                              className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded cursor-pointer flex-shrink-0"
                              title="Escuchar"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {item.exampleSentence && (
                    <div className="text-xs text-slate-500 font-sans italic border-l-2 border-indigo-200 pl-2 flex items-center justify-between">
                      <span>"{item.exampleSentence}"</span>
                      <button
                        type="button"
                        onClick={() => playPronunciation(item.exampleSentence || '')}
                        className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer flex-shrink-0 ml-1"
                        title="Escuchar oración de ejemplo"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Notes Field */}
                  {item.notes && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium flex items-start space-x-1.5">
                      <StickyNote className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[10px] text-amber-900 uppercase block">Nota:</span>
                        <span>{item.notes}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats & Manual Status Updater */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-2">
                <span>
                  Intentos: <strong className="text-slate-700">{item.attempts}</strong> ({accuracy}% éxito)
                </span>

                {/* Status Switch Dropdown */}
                <select
                  value={item.status}
                  onChange={(e) => onSetWordStatus(item.id, e.target.value as WordStatus)}
                  className="bg-slate-50 border border-slate-200 text-[11px] text-slate-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="not_practiced">No Practicada</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="failed">Fallada</option>
                  <option value="mastered">Dominada</option>
                </select>
              </div>
            </div>
          );
        })}

        {/* Quick Add Button at the end of card list */}
        {filteredList.length > 0 && (
          <div className="col-span-full pt-2">
            <button
              type="button"
              onClick={() => {
                setNewEnglish('');
                setNewSpanish('');
                setNewGroup(activeGroup !== 'all' ? activeGroup : 'General');
                setCustomNewGroup('');
                setNewExample('');
                setNewStatus('not_practiced');
                setIsAddModalOpen(true);
              }}
              className="w-full border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50 rounded-2xl p-4 sm:p-5 text-center transition-all group flex items-center justify-center space-x-2.5 cursor-pointer shadow-2xs"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-indigo-900 group-hover:text-indigo-700">
                + Agregar nueva tarjeta {activeGroup !== 'all' ? `a la carpeta "${activeGroup}"` : 'al vocabulario'}
              </span>
            </button>
          </div>
        )}

        {/* Empty Folder or No Results view */}
        {filteredList.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs my-4">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto border border-purple-100">
              <Folder className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {activeGroup !== 'all' ? `La carpeta "${activeGroup}" está vacía` : 'No hay expresiones en esta vista'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {activeGroup !== 'all'
                  ? `Esta carpeta aún no tiene tarjetas. Puedes agregar una tarjeta individualmente o importar varias en lote con IA.`
                  : `No se encontraron palabras con los filtros actuales.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNewEnglish('');
                  setNewSpanish('');
                  setNewGroup(activeGroup !== 'all' ? activeGroup : 'General');
                  setCustomNewGroup('');
                  setNewExample('');
                  setNewStatus('not_practiced');
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Tarjeta {activeGroup !== 'all' ? `a "${activeGroup}"` : ''}</span>
              </button>

              <button
                type="button"
                onClick={openBatchModal}
                className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 transition-all flex items-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Agregar en Lote (Pegar texto)</span>
              </button>

              {activeGroup !== 'all' && activeGroup !== 'General' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const newName = window.prompt(`Cambiar el nombre de la carpeta "${activeGroup}":`, activeGroup);
                      if (newName && newName.trim() && newName.trim() !== activeGroup) {
                        const cleanName = newName.trim();
                        if (onRenameGroup) {
                          onRenameGroup(activeGroup, cleanName);
                        }
                        setActiveGroup(cleanName);
                        showToast(`La carpeta fue renombrada a "${cleanName}".`);
                      }
                    }}
                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 text-indigo-600" />
                    <span>Renombrar esta Carpeta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(`¿Deseas eliminar la carpeta "${activeGroup}"?`)
                      ) {
                        if (onDeleteGroup) {
                          onDeleteGroup(activeGroup);
                        }
                        const deleted = activeGroup;
                        setActiveGroup('all');
                        showToast(`La carpeta "${deleted}" ha sido eliminada.`);
                      }
                    }}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Eliminar esta Carpeta</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        </div>
      </main>
      </div>

      {/* --- MODAL: AGREGAR NUEVA PALABRA --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Plus className="w-5 h-5 text-emerald-600 mr-2" />
                Agregar Nueva Palabra / Expresión
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Expresión en Inglés *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: hang out"
                  value={newEnglish}
                  onChange={(e) => setNewEnglish(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">
                    Traducción / Significado en Español *
                  </label>
                  <button
                    type="button"
                    onClick={handleCompleteVerbNew}
                    disabled={isCompletingNewVerb || (!newEnglish.trim() && !newPresent.trim())}
                    className="inline-flex items-center text-[10px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCompletingNewVerb ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin text-indigo-600" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                    )}
                    Completar traducción con IA
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ej: pasar el rato"
                  value={newSpanish}
                  onChange={(e) => setNewSpanish(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">
                    Tiempos Verbales (Opcional - para carpetas/verbos)
                  </label>
                  <button
                    type="button"
                    onClick={handleCompleteVerbNew}
                    disabled={isCompletingNewVerb || (!newPresent.trim() && !newEnglish.trim())}
                    className="inline-flex items-center text-[10px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCompletingNewVerb ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin text-indigo-600" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                    )}
                    Completar con IA
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Present (V1)"
                    value={newPresent}
                    onChange={(e) => setNewPresent(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Past (V2)"
                    value={newPast}
                    onChange={(e) => setNewPast(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Participle (V3)"
                    value={newPastParticiple}
                    onChange={(e) => setNewPastParticiple(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Grupo / Categoría
                </label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-1.5"
                >
                  {availableGroups.map(grp => (
                    <option key={grp} value={grp}>📁 {grp}</option>
                  ))}
                  <option value="__custom__">➕ Crear Nuevo Grupo personalizado...</option>
                </select>
                {newGroup === '__custom__' && (
                  <input
                    type="text"
                    required
                    placeholder="Nombre del nuevo grupo (Ej: Verbos, Frases comunes...)"
                    value={customNewGroup}
                    onChange={(e) => setCustomNewGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-purple-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Oración de Ejemplo con "____" (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Let's ____ this weekend."
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Notas / Reglas adicionales (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Escribe reglas gramaticales, notas de uso o trucos de memoria..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Estado Inicial
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as WordStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="not_practiced">No Practicada</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="failed">Fallada</option>
                  <option value="mastered">Dominada</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-100"
                >
                  Guardar Palabra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDITAR PALABRA --- */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Pencil className="w-5 h-5 text-indigo-600 mr-2" />
                Editar Palabra #{editingItem.id}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateWordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Expresión en Inglés
                </label>
                <input
                  type="text"
                  required
                  value={editEnglish}
                  onChange={(e) => setEditEnglish(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">
                    Traducción / Significado en Español
                  </label>
                  <button
                    type="button"
                    onClick={handleCompleteVerbEdit}
                    disabled={isCompletingEditVerb || (!editEnglish.trim() && !editPresent.trim())}
                    className="inline-flex items-center text-[10px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCompletingEditVerb ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin text-indigo-600" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                    )}
                    Completar traducción con IA
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editSpanish}
                  onChange={(e) => setEditSpanish(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">
                    Tiempos Verbales (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={handleCompleteVerbEdit}
                    disabled={isCompletingEditVerb || (!editPresent.trim() && !editEnglish.trim())}
                    className="inline-flex items-center text-[10px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCompletingEditVerb ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin text-indigo-600" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                    )}
                    Completar con IA
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Present (V1)"
                    value={editPresent}
                    onChange={(e) => setEditPresent(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Past (V2)"
                    value={editPast}
                    onChange={(e) => setEditPast(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Participle (V3)"
                    value={editPastParticiple}
                    onChange={(e) => setEditPastParticiple(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Grupo / Categoría
                </label>
                <select
                  value={editGroup}
                  onChange={(e) => setEditGroup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-1.5"
                >
                  {availableGroups.map(grp => (
                    <option key={grp} value={grp}>📁 {grp}</option>
                  ))}
                  <option value="__custom__">➕ Crear Nuevo Grupo personalizado...</option>
                </select>
                {editGroup === '__custom__' && (
                  <input
                    type="text"
                    required
                    placeholder="Nombre del grupo (Ej: Business, Idioms...)"
                    value={customEditGroup}
                    onChange={(e) => setCustomEditGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-purple-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Oración de Ejemplo (Opcional)
                </label>
                <input
                  type="text"
                  value={editExample}
                  onChange={(e) => setEditExample(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Notas / Reglas adicionales (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notas gramaticales o de uso..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Estado de Dominio
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as WordStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="not_practiced">No Practicada</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="failed">Fallada</option>
                  <option value="mastered">Dominada</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-100"
                >
                  Actualizar Expresión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIRMAR ELIMINACIÓN --- */}
      {deletingItemId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-6 text-center animate-fade-in">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                ¿Eliminar Palabra #{deletingItemId}?
              </h3>
              <p className="text-xs text-slate-500">
                Esta acción borrará la expresión de tu lista de vocabulario. ¿Deseas continuar?
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDeletingItemId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteWord}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-100"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ADMINISTRACIÓN DE GRUPOS --- */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <FolderPlus className="w-5 h-5 text-purple-600 mr-2" />
                Administrar Grupos / Categorías
              </h3>
              <button
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setEditingGroupName(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form: Crear Nuevo Grupo */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newGroupNameInput.trim()) return;
                const createdName = newGroupNameInput.trim();
                if (onAddCustomGroup) {
                  onAddCustomGroup(createdName);
                }
                setActiveGroup(createdName);
                setNewGroupNameInput('');
                setIsGroupModalOpen(false);
                showToast(`¡Carpeta "${createdName}" creada con éxito! Se puede mantener vacía o agregar tarjetas.`);
              }}
              className="space-y-2"
            >
              <label className="block text-xs font-bold text-slate-700">
                Crear un nuevo Grupo / Categoría
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Ej: Verbs, Common Phrases, Business..."
                  value={newGroupNameInput}
                  onChange={(e) => setNewGroupNameInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={!newGroupNameInput.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                >
                  Crear
                </button>
              </div>
            </form>

            {/* List of existing groups */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Grupos existentes ({availableGroups.length})
              </label>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {availableGroups.map((grp) => {
                  const isEditingThis = editingGroupName === grp;
                  const wordCount = vocabulary.filter(v => (v.group || 'General') === grp).length;
                  const isGeneral = grp === 'General';

                  return (
                    <div
                      key={grp}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      {isEditingThis ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="text"
                            value={renamedGroupInput}
                            onChange={(e) => setRenamedGroupInput(e.target.value)}
                            className="flex-1 bg-white border border-purple-400 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (renamedGroupInput.trim() && onRenameGroup) {
                                onRenameGroup(grp, renamedGroupInput.trim());
                                showToast(`Grupo renombrado a "${renamedGroupInput.trim()}"`);
                              }
                              setEditingGroupName(null);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingGroupName(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[11px]"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800">📁 {grp}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({wordCount} {wordCount === 1 ? 'palabra' : 'palabras'})
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            {!isGeneral && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingGroupName(grp);
                                    setRenamedGroupInput(grp);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 rounded transition-colors"
                                  title="Renombrar Grupo"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`¿Eliminar el grupo "${grp}"? Las palabras dentro de este grupo se moverán a "General".`) && onDeleteGroup) {
                                      onDeleteGroup(grp);
                                      if (activeGroup === grp) setActiveGroup('all');
                                      showToast(`Grupo "${grp}" eliminado. Las palabras pasaron a "General".`);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded transition-colors"
                                  title="Eliminar Grupo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: MOVER PALABRAS A UN GRUPO --- */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <FolderInput className="w-5 h-5 text-purple-600 mr-2" />
                Mover a un Grupo / Categoría
              </h3>
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-600">
                Seleccionadas: <strong className="text-purple-700 font-bold">{moveItemsTarget.length} expresión(es)</strong>
              </p>
              {moveItemsTarget.length > 0 && moveItemsTarget.length <= 4 && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium">
                  {moveItemsTarget.map(item => item.english).join(', ')}
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmMoveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Selecciona el grupo de destino:
                </label>
                <select
                  value={moveTargetGroup}
                  onChange={(e) => setMoveTargetGroup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                >
                  {availableGroups.map(grp => (
                    <option key={grp} value={grp}>📁 {grp}</option>
                  ))}
                  <option value="__custom__">➕ Crear Nuevo Grupo personalizado...</option>
                </select>

                {moveTargetGroup === '__custom__' && (
                  <input
                    type="text"
                    required
                    placeholder="Nombre del nuevo grupo (Ej: Verbos, Frases comunes...)"
                    value={customMoveGroupInput}
                    onChange={(e) => setCustomMoveGroupInput(e.target.value)}
                    className="w-full mt-2 bg-slate-50 border border-purple-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-100 flex items-center justify-center space-x-1.5"
                >
                  <FolderInput className="w-4 h-4" />
                  <span>Mover Expresión(es)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: RESPALDO Y COPIA DE SEGURIDAD --- */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <FileText className="w-5 h-5 text-indigo-600 mr-2" />
                Gestión de Copia de Seguridad
              </h3>
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Guarda un archivo de respaldo en tu dispositivo para conservar todo tu progreso, personalizaciones y evaluaciones históricas.
            </p>

            <div className="space-y-3">
              {/* Export Button */}
              <button
                onClick={() => {
                  onExportBackup();
                  showToast('Descargando archivo de respaldo JSON...');
                }}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-100 flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Copia de Seguridad (JSON)</span>
              </button>

              {/* Import Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 flex items-center justify-center space-x-2"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Restaurar Copia de Seguridad (JSON)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />

              {/* Reset options */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Opciones de Reinicio
                </div>

                {onResetProgressOnly && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Deseas reiniciar únicamente el progreso y el historial de evaluaciones?\n\n✔ Tus tarjetas de vocabulario agregadas y tus carpetas SE CONSERVARÁN intactas."
                        )
                      ) {
                        onResetProgressOnly();
                        setIsBackupModalOpen(false);
                        showToast("Progreso e historial reiniciados. Tus tarjetas y carpetas se conservaron.");
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Reiniciar Solo Progreso (Conservar tarjetas)</span>
                  </button>
                )}

                {onResetFactoryAll && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "⚠️ ¡ATENCIÓN!\n\nEsta acción eliminará PERMANENTEMENTE todas las tarjetas agregadas, las carpetas personalizadas e historial.\n\n¿Deseas restablecer la aplicación a su estado de fábrica?"
                        )
                      ) {
                        onResetFactoryAll();
                        setIsBackupModalOpen(false);
                        showToast("Aplicación restablecida a su estado inicial de fábrica.");
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Restablecer Todo (Fábrica)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: AGREGAR EN LOTE / PEGAR TEXTO --- */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 animate-fade-in my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                  Agregar Palabras / Frases en Grupo (Lote)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Copia y pega desde Word, Excel o notas. Si falta traducción o ejemplo, la IA los completará.
                </p>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Instructions Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
                <div className="font-bold text-slate-800 flex items-center text-[11px] uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
                  Ejemplos de formato por línea (separado por comas):
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1">
                  <div>play, jugar-reproducir, I play the guitar - I play the videocassette</div>
                  <div>jump</div>
                  <div>sing, cantar</div>
                  <div>head</div>
                </div>
                <p className="text-[11px] text-slate-500">
                  💡 <strong>Completado con IA:</strong> Si en una línea solo pones la palabra en inglés (ej: <code className="text-purple-700 font-bold">jump</code>) o solo la palabra y significado (ej: <code className="text-purple-700 font-bold font-mono">sing, cantar</code>), Gemini IA completará el significado o la oración de ejemplo para ti.
                </p>
              </div>

              {/* Target Group selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Carpeta / Grupo de destino para este lote:
                </label>
                <select
                  value={batchTargetGroup}
                  onChange={(e) => setBatchTargetGroup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {availableGroups.map(grp => (
                    <option key={grp} value={grp}>📁 {grp}</option>
                  ))}
                  <option value="__custom__">➕ Crear Nueva Carpeta / Grupo personalizado...</option>
                </select>

                {batchTargetGroup === '__custom__' && (
                  <input
                    type="text"
                    required
                    placeholder="Nombre del nuevo grupo (ej: Verbs, Common Phrases)..."
                    value={customBatchGroup}
                    onChange={(e) => setCustomBatchGroup(e.target.value)}
                    className="w-full mt-2 bg-purple-50/50 border border-purple-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                  />
                )}
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pega o escribe las palabras (una por línea):
                </label>
                <textarea
                  rows={6}
                  placeholder={`play, jugar-reproducir, I play the guitar\njump\nsing, cantar\nhead`}
                  value={batchRawText}
                  onChange={(e) => setBatchRawText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Process Button */}
              <button
                type="button"
                disabled={isProcessingBatch || !batchRawText.trim()}
                onClick={handleProcessBatchText}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analizando palabras y completando con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analizar y Completar con IA</span>
                  </>
                )}
              </button>

              {/* Preview Table if batchParsedItems exists */}
              {batchParsedItems.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" />
                      Previsualización ({batchParsedItems.length} tarjetas detectadas):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Puedes editar cualquier campo antes de guardar
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {batchParsedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all text-xs space-y-2 ${
                          item.selected
                            ? 'bg-purple-50/40 border-purple-200'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => {
                              const updated = [...batchParsedItems];
                              updated[idx].selected = e.target.checked;
                              setBatchParsedItems(updated);
                            }}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                          />
                          <span className="font-mono text-[11px] text-slate-400 font-bold">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={item.english}
                            onChange={(e) => {
                              const updated = [...batchParsedItems];
                              updated[idx].english = e.target.value;
                              setBatchParsedItems(updated);
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="Inglés..."
                          />
                          <input
                            type="text"
                            value={item.spanish}
                            onChange={(e) => {
                              const updated = [...batchParsedItems];
                              updated[idx].spanish = e.target.value;
                              setBatchParsedItems(updated);
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-indigo-700 italic font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="Español..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setBatchParsedItems(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Remover de la lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center space-x-2 pl-6">
                          <input
                            type="text"
                            value={item.exampleSentence}
                            onChange={(e) => {
                              const updated = [...batchParsedItems];
                              updated[idx].exampleSentence = e.target.value;
                              setBatchParsedItems(updated);
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-600 italic focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="Oración de ejemplo en inglés..."
                          />
                          <select
                            value={item.group}
                            onChange={(e) => {
                              const updated = [...batchParsedItems];
                              updated[idx].group = e.target.value;
                              setBatchParsedItems(updated);
                            }}
                            className="bg-white border border-slate-200 text-[10px] rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
                          >
                            {availableGroups.map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveBatchItems}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      Guardar {batchParsedItems.filter(i => i.selected && i.english.trim()).length} Palabras en la Lista
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: PAPELERA DE RECICLAJE --- */}
      {isTrashModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 animate-fade-in my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <Trash2 className="w-5 h-5 text-rose-600 mr-2" />
                  Papelera de Reciclaje ({trash.length} tarjetas)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Las tarjetas eliminadas se guardan aquí. Puedes restaurarlas a tu lista o eliminarlas definitivamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTrashModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trash Actions & Filter */}
            {trash.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar en la papelera..."
                    value={trashSearchTerm}
                    onChange={(e) => setTrashSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleRestoreAllConfirm}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Todas</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEmptyTrashConfirm}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar Papelera</span>
                  </button>
                </div>
              </div>
            )}

            {/* Trash List or Empty State */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[220px]">
              {trash.length === 0 ? (
                <div className="py-12 text-center space-y-3 my-auto">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">La papelera está vacía</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Las tarjetas que elimines de tu lista aparecerán aquí para que puedas recuperarlas si cambias de opinión.
                    </p>
                  </div>
                </div>
              ) : filteredTrash.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No se encontraron palabras en la papelera que coincidan con "{trashSearchTerm}".
                </div>
              ) : (
                filteredTrash.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-slate-800 text-sm">
                          {item.english}
                        </span>
                        <span className="text-indigo-600 italic text-xs font-semibold">
                          — {item.spanish}
                        </span>
                        {item.group && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-[10px] rounded-full">
                            📁 {item.group}
                          </span>
                        )}
                      </div>
                      {item.exampleSentence && (
                        <p className="text-[11px] text-slate-500 italic">
                          "{item.exampleSentence}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleRestoreFromTrash(item.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restaurar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePermanentDeleteFromTrash(item.id, item.english)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center space-x-1 cursor-pointer"
                        title="Borrar definitivamente"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Borrar Definitivo</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsTrashModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

