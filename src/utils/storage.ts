import { VocabularyItem, QuizHistory, WordStatus } from '../types';
import { INITIAL_VOCABULARY } from '../data/vocabulary';

const STORAGE_KEY_VOCAB = 'vocab_eval_items_v1';
const STORAGE_KEY_HISTORY = 'vocab_eval_history_v1';
const STORAGE_KEY_CUSTOM_GROUPS = 'vocab_eval_custom_groups_v1';
const STORAGE_KEY_TRASH = 'vocab_eval_trash_v1';

export function getStoredTrash(): VocabularyItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_TRASH);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredTrash(trash: VocabularyItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TRASH, JSON.stringify(trash));
  } catch (e) {
    console.error('Error saving trash:', e);
  }
}

export function getStoredCustomGroups(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_CUSTOM_GROUPS);
    if (!data) {
      const vocab = getStoredVocabulary();
      const initialGroups: string[] = [];
      vocab.forEach(item => {
        if (item.group && item.group.trim() && item.group.trim() !== 'General' && !initialGroups.includes(item.group.trim())) {
          initialGroups.push(item.group.trim());
        }
      });
      saveStoredCustomGroups(initialGroups);
      return initialGroups;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredCustomGroups(groups: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_GROUPS, JSON.stringify(groups));
  } catch (e) {
    console.error('Error saving custom groups:', e);
  }
}

export function addCustomGroup(groupName: string): string[] {
  const clean = groupName.trim();
  if (!clean || clean === 'General') return getStoredGroups();
  const currentCustom = getStoredCustomGroups();
  if (!currentCustom.includes(clean)) {
    const updated = [...currentCustom, clean];
    saveStoredCustomGroups(updated);
  }
  return getStoredGroups();
}

export function addBatchVocabularyWords(newWords: Array<{
  english: string;
  spanish: string;
  group?: string;
  exampleSentence?: string;
  status?: WordStatus;
  notes?: string;
  present?: string;
  past?: string;
  pastParticiple?: string;
  isVerb?: boolean;
}>): VocabularyItem[] {
  const current = getStoredVocabulary();
  let maxId = current.reduce((max, item) => (item.id > max ? item.id : max), 0);

  const newItems: VocabularyItem[] = newWords.map(w => {
    maxId += 1;
    const groupName = w.group?.trim() || 'General';
    if (groupName !== 'General') {
      addCustomGroup(groupName);
    }
    return {
      id: maxId,
      english: w.english.trim(),
      spanish: w.spanish.trim(),
      group: groupName,
      exampleSentence: w.exampleSentence?.trim() || undefined,
      notes: w.notes?.trim() || undefined,
      present: w.present?.trim() || undefined,
      past: w.past?.trim() || undefined,
      pastParticiple: w.pastParticiple?.trim() || undefined,
      isVerb: w.isVerb,
      status: w.status || 'not_practiced',
      attempts: 0,
      correctCount: 0,
      lastPracticed: new Date().toISOString()
    };
  });

  const updated = [...newItems, ...current];
  saveVocabulary(updated);
  return updated;
}

export function getStoredVocabulary(): VocabularyItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_VOCAB);
    if (data === null) {
      localStorage.setItem(STORAGE_KEY_VOCAB, JSON.stringify(INITIAL_VOCABULARY));
      return INITIAL_VOCABULARY;
    }
    const parsed: VocabularyItem[] = JSON.parse(data);
    return parsed;
  } catch (e) {
    console.error('Error loading stored vocabulary:', e);
    return INITIAL_VOCABULARY;
  }
}

export function saveVocabulary(items: VocabularyItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOCAB, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving vocabulary:', e);
  }
}

export function addVocabularyWord(newWord: {
  english: string;
  spanish: string;
  group?: string;
  exampleSentence?: string;
  status?: WordStatus;
  notes?: string;
  present?: string;
  past?: string;
  pastParticiple?: string;
  isVerb?: boolean;
}): VocabularyItem[] {
  const current = getStoredVocabulary();
  const maxId = current.reduce((max, item) => (item.id > max ? item.id : max), 0);
  const groupName = newWord.group?.trim() || 'General';
  if (groupName !== 'General') {
    addCustomGroup(groupName);
  }
  const created: VocabularyItem = {
    id: maxId + 1,
    english: newWord.english.trim(),
    spanish: newWord.spanish.trim(),
    group: groupName,
    exampleSentence: newWord.exampleSentence?.trim() || undefined,
    notes: newWord.notes?.trim() || undefined,
    present: newWord.present?.trim() || undefined,
    past: newWord.past?.trim() || undefined,
    pastParticiple: newWord.pastParticiple?.trim() || undefined,
    isVerb: newWord.isVerb,
    status: newWord.status || 'not_practiced',
    attempts: 0,
    correctCount: 0,
    lastPracticed: new Date().toISOString()
  };
  const updated = [created, ...current];
  saveVocabulary(updated);
  return updated;
}

export function editVocabularyWord(updatedItem: VocabularyItem): VocabularyItem[] {
  const current = getStoredVocabulary();
  const groupName = updatedItem.group?.trim() || 'General';
  if (groupName !== 'General') {
    addCustomGroup(groupName);
  }
  const updated = current.map(item => (item.id === updatedItem.id ? {
    ...updatedItem,
    group: groupName
  } : item));
  saveVocabulary(updated);
  return updated;
}

export function getStoredGroups(): string[] {
  const vocab = getStoredVocabulary();
  const custom = getStoredCustomGroups();
  const groupSet = new Set<string>();
  groupSet.add('General');
  custom.forEach(g => {
    if (g && g.trim()) groupSet.add(g.trim());
  });
  vocab.forEach(item => {
    if (item.group && item.group.trim()) {
      groupSet.add(item.group.trim());
    }
  });
  return Array.from(groupSet);
}

export function renameGroup(oldName: string, newName: string): VocabularyItem[] {
  const cleanOld = oldName.trim();
  const cleanNew = newName.trim();
  if (!cleanOld || !cleanNew || cleanOld === cleanNew) return getStoredVocabulary();

  const custom = getStoredCustomGroups();
  const updatedCustom = custom.map(g => (g === cleanOld ? cleanNew : g));
  saveStoredCustomGroups(updatedCustom);

  const current = getStoredVocabulary();
  const updated = current.map(item => {
    const itemGroup = item.group || 'General';
    if (itemGroup === cleanOld) {
      return { ...item, group: cleanNew };
    }
    return item;
  });
  saveVocabulary(updated);
  return updated;
}

export function deleteGroup(groupName: string): VocabularyItem[] {
  const cleanName = groupName.trim();
  if (!cleanName || cleanName === 'General') return getStoredVocabulary();

  const custom = getStoredCustomGroups();
  const updatedCustom = custom.filter(g => g !== cleanName);
  saveStoredCustomGroups(updatedCustom);

  const current = getStoredVocabulary();
  const updated = current.map(item => {
    if ((item.group || 'General') === cleanName) {
      return { ...item, group: 'General' };
    }
    return item;
  });
  saveVocabulary(updated);
  return updated;
}

export function deleteVocabularyWord(wordId: number): VocabularyItem[] {
  const current = getStoredVocabulary();
  const itemToDelete = current.find(item => item.id === wordId);
  if (itemToDelete) {
    const currentTrash = getStoredTrash();
    const updatedTrash = [itemToDelete, ...currentTrash.filter(t => t.id !== wordId)];
    saveStoredTrash(updatedTrash);
  }
  const updated = current.filter(item => item.id !== wordId);
  saveVocabulary(updated);
  return updated;
}

export function restoreFromTrash(wordId: number): { vocabulary: VocabularyItem[]; trash: VocabularyItem[] } {
  const trash = getStoredTrash();
  const itemToRestore = trash.find(t => t.id === wordId);
  const updatedTrash = trash.filter(t => t.id !== wordId);
  saveStoredTrash(updatedTrash);

  if (itemToRestore) {
    const currentVocab = getStoredVocabulary();
    if (itemToRestore.group && itemToRestore.group !== 'General') {
      addCustomGroup(itemToRestore.group);
    }
    const updatedVocab = [itemToRestore, ...currentVocab.filter(v => v.id !== wordId)];
    saveVocabulary(updatedVocab);
    return { vocabulary: updatedVocab, trash: updatedTrash };
  }

  return { vocabulary: getStoredVocabulary(), trash: updatedTrash };
}

export function permanentlyDeleteFromTrash(wordId: number): VocabularyItem[] {
  const trash = getStoredTrash();
  const updatedTrash = trash.filter(t => t.id !== wordId);
  saveStoredTrash(updatedTrash);
  return updatedTrash;
}

export function emptyTrash(): VocabularyItem[] {
  saveStoredTrash([]);
  return [];
}

export function restoreAllFromTrash(): { vocabulary: VocabularyItem[]; trash: VocabularyItem[] } {
  const trash = getStoredTrash();
  if (trash.length === 0) return { vocabulary: getStoredVocabulary(), trash: [] };

  const currentVocab = getStoredVocabulary();
  trash.forEach(item => {
    if (item.group && item.group !== 'General') {
      addCustomGroup(item.group);
    }
  });
  const updatedVocab = [...trash, ...currentVocab];
  saveVocabulary(updatedVocab);
  saveStoredTrash([]);
  return { vocabulary: updatedVocab, trash: [] };
}

export function moveWordsToGroup(wordIds: number[], targetGroup: string): VocabularyItem[] {
  const cleanTarget = targetGroup.trim() || 'General';
  if (cleanTarget !== 'General') {
    addCustomGroup(cleanTarget);
  }
  const idSet = new Set(wordIds);
  const current = getStoredVocabulary();
  const updated = current.map(item => {
    if (idSet.has(item.id)) {
      return { ...item, group: cleanTarget };
    }
    return item;
  });
  saveVocabulary(updated);
  return updated;
}

export function updateWordStatus(
  wordId: number, 
  isCorrect: boolean
): VocabularyItem[] {
  const current = getStoredVocabulary();
  const updated = current.map(item => {
    if (item.id === wordId) {
      const newAttempts = item.attempts + 1;
      const newCorrect = item.correctCount + (isCorrect ? 1 : 0);
      
      let newStatus: WordStatus = item.status;
      const accuracy = newCorrect / newAttempts;

      if (isCorrect) {
        if (newCorrect >= 3 && accuracy >= 0.8) {
          newStatus = 'mastered';
        } else {
          newStatus = 'in_progress';
        }
      } else {
        newStatus = 'failed';
      }

      return {
        ...item,
        attempts: newAttempts,
        correctCount: newCorrect,
        status: newStatus,
        lastPracticed: new Date().toISOString()
      };
    }
    return item;
  });

  saveVocabulary(updated);
  return updated;
}

export function setExplicitWordStatus(wordId: number, status: WordStatus): VocabularyItem[] {
  const current = getStoredVocabulary();
  const updated = current.map(item => {
    if (item.id === wordId) {
      return { ...item, status, lastPracticed: new Date().toISOString() };
    }
    return item;
  });
  saveVocabulary(updated);
  return updated;
}

export function getQuizHistory(): QuizHistory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading quiz history:', e);
    return [];
  }
}

export function saveQuizHistory(session: QuizHistory): QuizHistory[] {
  const history = getQuizHistory();
  const updated = [session, ...history];
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving quiz history:', e);
  }
  return updated;
}

export function exportBackupJSON(): void {
  const vocab = getStoredVocabulary();
  const history = getQuizHistory();
  const trash = getStoredTrash();
  const backupObj = {
    appName: 'VocEnglish',
    exportedAt: new Date().toISOString(),
    vocabulary: vocab,
    history: history,
    trash: trash
  };
  const jsonStr = JSON.stringify(backupObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `VocEnglish_Progreso_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackupJSON(jsonStr: string): { vocab: VocabularyItem[]; history: QuizHistory[]; trash: VocabularyItem[] } {
  const data = JSON.parse(jsonStr);
  if (Array.isArray(data.vocabulary)) {
    saveVocabulary(data.vocabulary);
  }
  if (Array.isArray(data.history)) {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(data.history));
  }
  if (Array.isArray(data.trash)) {
    saveStoredTrash(data.trash);
  }
  return {
    vocab: getStoredVocabulary(),
    history: getQuizHistory(),
    trash: getStoredTrash()
  };
}

export function resetProgressOnly(): VocabularyItem[] {
  const current = getStoredVocabulary();
  const resetVocab = current.map(item => ({
    ...item,
    attempts: 0,
    correctCount: 0,
    status: 'not_practiced' as WordStatus,
    lastPracticed: undefined
  }));
  saveVocabulary(resetVocab);
  localStorage.removeItem(STORAGE_KEY_HISTORY);
  return resetVocab;
}

export function resetFactoryAllData(): VocabularyItem[] {
  localStorage.removeItem(STORAGE_KEY_VOCAB);
  localStorage.removeItem(STORAGE_KEY_HISTORY);
  localStorage.removeItem(STORAGE_KEY_CUSTOM_GROUPS);
  localStorage.removeItem(STORAGE_KEY_TRASH);
  localStorage.setItem(STORAGE_KEY_VOCAB, JSON.stringify(INITIAL_VOCABULARY));
  return INITIAL_VOCABULARY;
}

export function resetAllData(): void {
  resetFactoryAllData();
}

