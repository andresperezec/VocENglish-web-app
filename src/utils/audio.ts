export function playPronunciation(text: string, lang = 'en-US'): void {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Slightly clearer pace for study
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Error playing speech synth:', e);
  }
}
