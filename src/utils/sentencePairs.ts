import { VocabularyItem } from '../types';

export interface SentencePair {
  englishSentence: string;
  spanishSentence: string;
}

// Map of translations for standard example sentences
const KNOWN_PAIRS: Record<number, SentencePair> = {
  1: {
    englishSentence: "There is nothing quite like a hot cup of coffee on a cold winter morning.",
    spanishSentence: "No hay nada como una taza de café caliente en una fría mañana de invierno."
  },
  2: {
    englishSentence: "Hey Mark! How you doing over there?",
    spanishSentence: "¡Hola Mark! ¿Cómo te va por ahí?"
  },
  3: {
    englishSentence: "Everything is fine and dandy after the fix.",
    spanishSentence: "Todo está bien y excelente después de la reparación."
  },
  4: {
    englishSentence: "If we make a mistake, we will have to start all over.",
    spanishSentence: "Si cometemos un error, tendremos que empezar de nuevo."
  },
  5: {
    englishSentence: "I tend to sleep late on weekends.",
    spanishSentence: "Suelo tender a dormir hasta tarde los fines de semana."
  },
  6: {
    englishSentence: "Why, thank you! That is very kind of you to say.",
    spanishSentence: "¡Vaya, gracias! Es muy amable de tu parte decir eso."
  },
  7: {
    englishSentence: "I paid for your lunch yesterday and you paid today, so now we're even.",
    spanishSentence: "Pagué tu almuerzo ayer y tú pagaste hoy, así que ahora estamos a mano."
  },
  8: {
    englishSentence: "If you don't want my advice, have it your way.",
    spanishSentence: "Si no quieres mi consejo, hazlo a tu manera."
  },
  9: {
    englishSentence: "I gotta go to the store before it closes.",
    spanishSentence: "Tengo que ir a la tienda antes de que cierre."
  },
  10: {
    englishSentence: "I hereby declare the meeting open.",
    spanishSentence: "Por la presente declaro abierta la reunión."
  },
  11: {
    englishSentence: "Look at those beautiful trees over there.",
    spanishSentence: "Mira esos árboles hermosos de allí."
  },
  12: {
    englishSentence: "If you keep disrespecting the rules, I'll show you what for!",
    spanishSentence: "¡Si sigues sin respetar las reglas, te daré una lección!"
  },
  13: {
    englishSentence: "Congratulations on winning! You've done it again.",
    spanishSentence: "¡Felicitaciones por ganar! Lo has vuelto a hacer."
  },
  14: {
    englishSentence: "Behold, the magnificent crown of the king!",
    spanishSentence: "Contempla, ¡la magnífica corona del rey!"
  },
  15: {
    englishSentence: "Look out! A car is coming fast!",
    spanishSentence: "¡Cuidado! ¡Un coche viene rápido!"
  },
  16: {
    englishSentence: "The sound of rain is very soothing.",
    spanishSentence: "El sonido de la lluvia es muy relajante."
  },
  17: {
    englishSentence: "Let's start you off with a simple quiz today.",
    spanishSentence: "Comencemos con un cuestionario sencillo hoy."
  },
  18: {
    englishSentence: "The old basement smelled very musty.",
    spanishSentence: "El sótano viejo olía muy húmedo y mohoso."
  },
  19: {
    englishSentence: "The project plan failed, so we are back to square one again.",
    spanishSentence: "El plan del proyecto falló, así que nos toca volver al punto de partida."
  },
  20: {
    englishSentence: "Please take down these notes during the presentation.",
    spanishSentence: "Por favor anota estas notas durante la presentación."
  },
  21: {
    englishSentence: "I am ready for the challenge, bring it on!",
    spanishSentence: "¡Estoy listo para el desafío, adelante!"
  },
  22: {
    englishSentence: "The new agreement brought peace to the region.",
    spanishSentence: "El nuevo acuerdo trajo paz a la región."
  },
  23: {
    englishSentence: "You say you won the lottery? Oh, is that so?",
    spanishSentence: "¿Dices que ganaste la lotería? ¿Ah, sí?"
  },
  24: {
    englishSentence: "Please make sure to lock the door when you leave.",
    spanishSentence: "Por favor asegúrate de cerrar la puerta con llave al salir."
  },
  25: {
    englishSentence: "The business made a huge profit this quarter.",
    spanishSentence: "La empresa obtuvo un enorme beneficio este trimestre."
  },
  26: {
    englishSentence: "I am kind of tired after running five miles.",
    spanishSentence: "Estoy algo cansado después de correr cinco millas."
  },
  27: {
    englishSentence: "He looked very dashing in his tuxedo.",
    spanishSentence: "Lucía muy elegante con su esmoquin."
  },
  28: {
    englishSentence: "We need to figure out how to solve this issue.",
    spanishSentence: "Necesitamos resolver cómo solucionar este problema."
  }
};

export function getSentencePairForWord(word: VocabularyItem): SentencePair {
  // Check known map first
  if (KNOWN_PAIRS[word.id]) {
    return KNOWN_PAIRS[word.id];
  }

  // Fallback pair if no exampleSentence is defined
  return {
    englishSentence: `I try to ${word.english} in daily conversations.`,
    spanishSentence: `Intento ${word.spanish} en conversaciones diarias.`
  };
}

export async function fetchFlashcardSentencePair(
  wordEnglish: string,
  wordSpanish: string,
  cardFrontLanguage: 'en' | 'es',
  previousSentence?: string
): Promise<{ frontSentence: string; backSentence: string }> {
  try {
    const res = await fetch('/api/generate-flashcard-sentence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wordEnglish,
        wordSpanish,
        cardFrontLanguage,
        previousSentence
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.frontSentence && data.backSentence) {
        return {
          frontSentence: data.frontSentence,
          backSentence: data.backSentence
        };
      }
    }
  } catch (err) {
    console.error('Error fetching AI flashcard sentence:', err);
  }

  // Fallback if network or endpoint fails
  if (cardFrontLanguage === 'en') {
    return {
      frontSentence: `The company wants to ${wordEnglish} its best strategy.`,
      backSentence: `La compañía desea ${wordSpanish} su mejor estrategia.`
    };
  } else {
    return {
      frontSentence: `Es importante ${wordSpanish} en situaciones cotidianas.`,
      backSentence: `It is important to ${wordEnglish} in everyday situations.`
    };
  }
}
