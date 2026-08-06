import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const getGeminiAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API Endpoint 1: Evaluate Sentence Construction (Type D)
app.post("/api/evaluate-sentence", async (req, res) => {
  try {
    const { wordEnglish, wordSpanish, userSentence } = req.body;

    if (!wordEnglish || !userSentence) {
      return res.status(400).json({ error: "Faltan parámetros requeridos." });
    }

    const ai = getGeminiAi();

    // Smart heuristic fallback if AI unavailable
    if (!ai) {
      const lowerSentence = userSentence.trim().toLowerCase();
      const lowerWord = wordEnglish.trim().toLowerCase();
      // basic clean word comparison
      const containsWord = lowerSentence.includes(lowerWord) || lowerSentence.includes(lowerWord.replace(/[^\w\s]/gi, ''));
      const wordCount = lowerSentence.split(/\s+/).filter(Boolean).length;

      if (containsWord && wordCount >= 3) {
        return res.json({
          isCorrect: true,
          feedback: "¡Excelente oración! Usaste la expresión correctamente.",
          spanishTranslation: `Traducción aproximada: "${userSentence}"`
        });
      } else {
        return res.json({
          isCorrect: false,
          feedback: containsWord 
            ? "Tu oración es muy corta. Por favor escribe una oración completa y coherente." 
            : `Debes incluir exactamente la expresión o palabra "${wordEnglish}" en tu oración.`,
          spanishTranslation: null
        });
      }
    }

    const prompt = `
    Eres un profesor de inglés evaluando el ejercicio de un estudiante.
    Palabra u expresión requerida de vocabulario: "${wordEnglish}" (Significado en español: "${wordSpanish}")
    Oración escrita por el estudiante: "${userSentence}"

    Evalúa lo siguiente:
    1. ¿La oración incluye la palabra/expresión requerida "${wordEnglish}" o su forma gramatical adecuada?
    2. ¿Es una oración gramaticalmente correcta y con sentido coherente en inglés?
    3. Si la respuesta a ambas es SÍ, marca isCorrect como true, da un feedback elogioso breve en español, y provee la traducción completa de la oración del estudiante al español.
    4. Si hay errores gramaticales o no usó la palabra adecuadamente, marca isCorrect como false, y explica amablemente el error en español para que vuelva a intentarlo.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING, description: "Explicación breve en español" },
            spanishTranslation: { type: Type.STRING, description: "Traducción al español de la oración si es correcta, o cadena vacía si no" }
          },
          required: ["isCorrect", "feedback"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return res.json(result);

  } catch (error: any) {
    console.error("Error evaluating sentence:", error);
    return res.status(500).json({ error: "Error en el servidor al evaluar la oración." });
  }
});

// API Endpoint 2: Check Translation Flexibly (Type B & C)
app.post("/api/check-translation", async (req, res) => {
  try {
    const { sourceText, targetText, direction, expectedText } = req.body;
    
    // Quick string normalization comparison first
    const normalize = (str: string) => 
      str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, "").trim() : "";
    
    const normUser = normalize(targetText);
    const normExpected = normalize(expectedText);

    if (normUser === normExpected) {
      return res.json({
        isCorrect: true,
        feedback: "¡Traducción exacta!",
        correctVersion: expectedText
      });
    }

    // Try AI for synonym / phrase variation / lenient evaluation if available
    const ai = getGeminiAi();
    if (!ai) {
      // Fallback: check inclusion or close similarity ignoring accents/case
      const isClose = normUser.length > 0 && (normExpected.includes(normUser) || normUser.includes(normExpected));
      return res.json({
        isCorrect: isClose,
        feedback: isClose ? "¡Traducción válida!" : `La respuesta esperada es: "${expectedText}"`,
        correctVersion: expectedText
      });
    }

    const prompt = `
    Eres un profesor de idiomas y evaluador de traducciones altamente comprensivo y flexible.
    Evalúa si la respuesta entregada por el estudiante es una traducción válida, cercana o esencialmente correcta en significado respecto a la oración de referencia.

    REGLAS DE EVALUACIÓN (CRÍTICO):
    1. NO TOMES EN CUENTA ERRORES DE TILDES/ACENTOS EN ESPAÑOL (por ejemplo: "esta" por "está", "cancion" por "canción", "el" por "él", "jugo" por "jugó", "asi" por "así", "tambien" por "también"). SI LA PALABRA SÓLO OMITE LA TILDE O TIENE UN ACENTO DIFERENTE, CONSIDÉRALA CORRECTA (isCorrect: true).
    2. NO TOMES EN CUENTA MINÚSCULAS Y MAYÚSCULAS ni signos de puntuación final.
    3. IGNORA la presencia u omisión de pronombres sujeto opcionales en español o inglés (ejemplo: "Yo trabajo" vs "Trabajo", "Ella comió" vs "Comió", "He jugado" vs "Yo he jugado").
    4. ACEPTA sinónimos cotidianos y variaciones naturales de redacción si la idea o significado principal es equivalente y se entiende correctamente en el contexto.
    5. Si la traducción está cercana en esencia a la traducción correcta, DEBES marcar "isCorrect: true".

    DATOS:
    - Dirección: ${direction === "en_to_es" ? "Inglés a Español" : "Español a Inglés"}
    - Texto original a traducir: "${sourceText}"
    - Traducción de referencia ideal: "${expectedText}"
    - Respuesta escrita por el estudiante: "${targetText}"

    Devuelve un objeto JSON con:
    - isCorrect (boolean): true si es esencialmente correcta o cercana en significado (ignorando tildes, mayúsculas y variaciones menores).
    - feedback (string): Un comentario breve y amigable en español. Si la respuesta es correcta pero faltó una tilde, puedes indicárselo de forma educada confirmando que está correcta.
    - correctVersion (string): La traducción de referencia ideal.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
            correctVersion: { type: Type.STRING }
          },
          required: ["isCorrect", "feedback", "correctVersion"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return res.json(result);

  } catch (error: any) {
    console.error("Error checking translation:", error);
    const { targetText, expectedText } = req.body;
    const normalize = (str: string) => 
      str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, "").trim() : "";
    const isClose = normalize(targetText) === normalize(expectedText) || normalize(expectedText).includes(normalize(targetText));
    return res.json({
      isCorrect: isClose,
      feedback: isClose ? "¡Traducción cercana y válida!" : `La respuesta esperada es: "${expectedText}"`,
      correctVersion: expectedText
    });
  }
});

// API Endpoint 3: Generate Dynamic Fill in the Blank Sentence (AI Powered)
app.post("/api/generate-fill-blank", async (req, res) => {
  try {
    const { wordEnglish, wordSpanish, currentSentence } = req.body;

    if (!wordEnglish) {
      return res.status(400).json({ error: "El parámetro wordEnglish es requerido." });
    }

    const ai = getGeminiAi();
    const words = wordEnglish.trim().split(/\s+/).filter(Boolean);
    const blankPlaceholder = words.map(() => "____").join(" ");

    const fallbackTemplates = [
      `In everyday conversation, people often say: "${blankPlaceholder}".`,
      `She was trying to ${blankPlaceholder} during the meeting.`,
      `It is common for students to ${blankPlaceholder} when practicing English.`,
      `They decided to ${blankPlaceholder} after finishing their work.`,
      `Could you please ${blankPlaceholder} when you have a moment?`,
      `Last weekend, we had the opportunity to ${blankPlaceholder}.`
    ];

    if (!ai) {
      const filtered = fallbackTemplates.filter(t => t !== currentSentence);
      const chosen = filtered[Math.floor(Math.random() * filtered.length)] || fallbackTemplates[0];
      return res.json({
        sentence: chosen,
        wordCount: words.length
      });
    }

    const prompt = `
    Eres un profesor de inglés creando ejercicios de completar espacios en blanco ("Fill in the blank").
    Palabra u expresión objetivo: "${wordEnglish}" (Significado en español: "${wordSpanish || ''}").
    ${currentSentence ? `Evita repetir esta oración previa: "${currentSentence}"` : ''}

    Instrucciones:
    1. Crea una oración corta, natural y realista en inglés donde la expresión "${wordEnglish}" sea la pieza faltante.
    2. En lugar de escribir la expresión "${wordEnglish}", REEMPLÁZALA EXACTAMENTE por el marcador de espacio en blanco "${blankPlaceholder}".
    3. Devuelve un JSON objeto con la clave "sentence".
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentence: {
              type: Type.STRING,
              description: `Oración en inglés que contiene '${blankPlaceholder}' en lugar de la palabra objetivo`
            }
          },
          required: ["sentence"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    let generatedSentence = result.sentence || "";

    if (!generatedSentence.includes("____")) {
      const regex = new RegExp(wordEnglish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(generatedSentence)) {
        generatedSentence = generatedSentence.replace(regex, blankPlaceholder);
      } else {
        generatedSentence = `In a practical situation: "${blankPlaceholder}".`;
      }
    }

    return res.json({
      sentence: generatedSentence,
      wordCount: words.length
    });

  } catch (error: any) {
    console.error("Error generating fill in the blank sentence:", error);
    const words = (req.body.wordEnglish || "").trim().split(/\s+/).filter(Boolean);
    const blankPlaceholder = words.map(() => "____").join(" ");
    return res.json({
      sentence: `It is important to ${blankPlaceholder} in daily life.`,
      wordCount: words.length
    });
  }
});

// API Endpoint 4: Generate 2 Extra Sentence Examples (AI Powered)
app.post("/api/generate-extra-examples", async (req, res) => {
  try {
    const { wordEnglish, wordSpanish } = req.body;

    if (!wordEnglish) {
      return res.status(400).json({ error: "El parámetro wordEnglish es requerido." });
    }

    const ai = getGeminiAi();

    if (!ai) {
      return res.json({
        examples: [
          {
            english: `I always try to use "${wordEnglish}" in practical situations.`,
            spanish: `Siempre intento usar "${wordSpanish || wordEnglish}" en situaciones prácticas.`
          },
          {
            english: `Learning how to say "${wordEnglish}" helped me communicate better.`,
            spanish: `Aprender a decir "${wordSpanish || wordEnglish}" me ayudó a comunicarme mejor.`
          }
        ]
      });
    }

    const prompt = `
    Eres un profesor de inglés interactivo.
    Palabra u expresión de vocabulario: "${wordEnglish}" (Significado en español: "${wordSpanish || ''}").

    Crea exactamente 2 oraciones de ejemplo breves, naturales y cotidianas en inglés que utilicen correctamente la expresión "${wordEnglish}".
    Para cada oración, incluye su traducción precisa al español.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            examples: {
              type: Type.ARRAY,
              description: "Lista con exactamente 2 ejemplos de oraciones en inglés y su traducción al español",
              items: {
                type: Type.OBJECT,
                properties: {
                  english: { type: Type.STRING, description: "Oración de ejemplo en inglés" },
                  spanish: { type: Type.STRING, description: "Traducción al español" }
                },
                required: ["english", "spanish"]
              }
            }
          },
          required: ["examples"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    const examples = result.examples && Array.isArray(result.examples) ? result.examples : [];

    return res.json({ examples });

  } catch (error: any) {
    console.error("Error generating extra examples:", error);
    return res.json({
      examples: [
        {
          english: `Here is a natural sentence using "${req.body.wordEnglish}".`,
          spanish: `Aquí hay una oración natural usando "${req.body.wordSpanish || req.body.wordEnglish}".`
        },
        {
          english: `Practice saying "${req.body.wordEnglish}" aloud every day.`,
          spanish: `Practica decir "${req.body.wordSpanish || req.body.wordEnglish}" en voz alta todos los días.`
        }
      ]
    });
  }
});

// API Endpoint: Batch Complete Vocabulary Items with Gemini AI
app.post("/api/batch-complete-words", async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron elementos para procesar." });
    }

    const ai = getGeminiAi();

    // Smart heuristic fallback if AI is unavailable or unconfigured
    if (!ai) {
      const completedItems = items.map((item: any) => ({
        english: item.english ? String(item.english).trim() : "",
        spanish: item.spanish && String(item.spanish).trim()
          ? String(item.spanish).trim()
          : `Significado de ${item.english}`,
        exampleSentence: item.exampleSentence && String(item.exampleSentence).trim()
          ? String(item.exampleSentence).trim()
          : `Example sentence using ${item.english}.`
      }));
      return res.json({ items: completedItems });
    }

    const prompt = `
    Eres un profesor de inglés y diccionario bilingüe experto.
    Procesa la siguiente lista de palabras o expresiones en inglés ingresadas en lote:

    LISTA DE ENTRADA:
    ${JSON.stringify(items, null, 2)}

    REGLAS DE PROCESAMIENTO:
    1. Procesa CADA elemento en el mismo orden.
    2. "english": Conserva la palabra/frase exacta en inglés.
    3. "spanish": Si el elemento ya incluye un significado en español en "spanish", consérvalo o refínalo de forma breve y concisa. Si está vacío o falta, genera el significado/traducción al español más preciso y común.
    4. "exampleSentence": Si el elemento ya incluye una oración en "exampleSentence", consérvala. Si falta o está vacía, genera una oración de ejemplo natural, práctica y breve en inglés que use esa palabra.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  english: { type: Type.STRING },
                  spanish: { type: Type.STRING },
                  exampleSentence: { type: Type.STRING }
                },
                required: ["english", "spanish", "exampleSentence"]
              }
            }
          },
          required: ["items"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    const completedItems = result.items && Array.isArray(result.items) ? result.items : items;

    return res.json({ items: completedItems });

  } catch (error: any) {
    console.error("Error in batch completing words:", error);
    const fallbackItems = (req.body.items || []).map((item: any) => ({
      english: item.english ? String(item.english).trim() : "",
      spanish: item.spanish && String(item.spanish).trim() ? String(item.spanish).trim() : `Traducción de ${item.english}`,
      exampleSentence: item.exampleSentence && String(item.exampleSentence).trim() ? String(item.exampleSentence).trim() : `Example with ${item.english}.`
    }));
    return res.json({ items: fallbackItems });
  }
});

// Comprehensive dictionary of English irregular verbs for fast and accurate conjugations
const IRREGULAR_VERBS_DICT: Record<string, { present: string; past: string; pastParticiple: string; spanish: string; detectedTense: string }> = {
  drink: { present: 'drink', past: 'drank', pastParticiple: 'drunk', spanish: 'beber / tomar', detectedTense: 'present' },
  drank: { present: 'drink', past: 'drank', pastParticiple: 'drunk', spanish: 'beber / tomar', detectedTense: 'past' },
  drunk: { present: 'drink', past: 'drank', pastParticiple: 'drunk', spanish: 'beber / tomar', detectedTense: 'pastParticiple' },
  go: { present: 'go', past: 'went', pastParticiple: 'gone', spanish: 'ir', detectedTense: 'present' },
  went: { present: 'go', past: 'went', pastParticiple: 'gone', spanish: 'ir', detectedTense: 'past' },
  gone: { present: 'go', past: 'went', pastParticiple: 'gone', spanish: 'ir', detectedTense: 'pastParticiple' },
  eat: { present: 'eat', past: 'ate', pastParticiple: 'eaten', spanish: 'comer', detectedTense: 'present' },
  ate: { present: 'eat', past: 'ate', pastParticiple: 'eaten', spanish: 'comer', detectedTense: 'past' },
  eaten: { present: 'eat', past: 'ate', pastParticiple: 'eaten', spanish: 'comer', detectedTense: 'pastParticiple' },
  write: { present: 'write', past: 'wrote', pastParticiple: 'written', spanish: 'escribir', detectedTense: 'present' },
  wrote: { present: 'write', past: 'wrote', pastParticiple: 'written', spanish: 'escribir', detectedTense: 'past' },
  written: { present: 'write', past: 'wrote', pastParticiple: 'written', spanish: 'escribir', detectedTense: 'pastParticiple' },
  speak: { present: 'speak', past: 'spoke', pastParticiple: 'spoken', spanish: 'hablar', detectedTense: 'present' },
  spoke: { present: 'speak', past: 'spoke', pastParticiple: 'spoken', spanish: 'hablar', detectedTense: 'past' },
  spoken: { present: 'speak', past: 'spoke', pastParticiple: 'spoken', spanish: 'hablar', detectedTense: 'pastParticiple' },
  run: { present: 'run', past: 'ran', pastParticiple: 'run', spanish: 'correr', detectedTense: 'present' },
  ran: { present: 'run', past: 'ran', pastParticiple: 'run', spanish: 'correr', detectedTense: 'past' },
  sing: { present: 'sing', past: 'sang', pastParticiple: 'sung', spanish: 'cantar', detectedTense: 'present' },
  sang: { present: 'sing', past: 'sang', pastParticiple: 'sung', spanish: 'cantar', detectedTense: 'past' },
  sung: { present: 'sing', past: 'sang', pastParticiple: 'sung', spanish: 'cantar', detectedTense: 'pastParticiple' },
  swim: { present: 'swim', past: 'swam', pastParticiple: 'swum', spanish: 'nadar', detectedTense: 'present' },
  swam: { present: 'swim', past: 'swam', pastParticiple: 'swum', spanish: 'nadar', detectedTense: 'past' },
  swum: { present: 'swim', past: 'swam', pastParticiple: 'swum', spanish: 'nadar', detectedTense: 'pastParticiple' },
  see: { present: 'see', past: 'saw', pastParticiple: 'seen', spanish: 'ver', detectedTense: 'present' },
  saw: { present: 'see', past: 'saw', pastParticiple: 'seen', spanish: 'ver', detectedTense: 'past' },
  seen: { present: 'see', past: 'saw', pastParticiple: 'seen', spanish: 'ver', detectedTense: 'pastParticiple' },
  take: { present: 'take', past: 'took', pastParticiple: 'taken', spanish: 'tomar / llevar', detectedTense: 'present' },
  took: { present: 'take', past: 'took', pastParticiple: 'taken', spanish: 'tomar / llevar', detectedTense: 'past' },
  taken: { present: 'take', past: 'took', pastParticiple: 'taken', spanish: 'tomar / llevar', detectedTense: 'pastParticiple' },
  fly: { present: 'fly', past: 'flew', pastParticiple: 'flown', spanish: 'volar', detectedTense: 'present' },
  flew: { present: 'fly', past: 'flew', pastParticiple: 'flown', spanish: 'volar', detectedTense: 'past' },
  flown: { present: 'fly', past: 'flew', pastParticiple: 'flown', spanish: 'volar', detectedTense: 'pastParticiple' },
  break: { present: 'break', past: 'broke', pastParticiple: 'broken', spanish: 'romper', detectedTense: 'present' },
  broke: { present: 'break', past: 'broke', pastParticiple: 'broken', spanish: 'romper', detectedTense: 'past' },
  broken: { present: 'break', past: 'broke', pastParticiple: 'broken', spanish: 'romper', detectedTense: 'pastParticiple' },
  drive: { present: 'drive', past: 'drove', pastParticiple: 'driven', spanish: 'conducir / manejar', detectedTense: 'present' },
  drove: { present: 'drive', past: 'drove', pastParticiple: 'driven', spanish: 'conducir / manejar', detectedTense: 'past' },
  driven: { present: 'drive', past: 'drove', pastParticiple: 'driven', spanish: 'conducir / manejar', detectedTense: 'pastParticiple' },
  buy: { present: 'buy', past: 'bought', pastParticiple: 'bought', spanish: 'comprar', detectedTense: 'present' },
  bought: { present: 'buy', past: 'bought', pastParticiple: 'bought', spanish: 'comprar', detectedTense: 'past' },
  do: { present: 'do', past: 'did', pastParticiple: 'done', spanish: 'hacer', detectedTense: 'present' },
  did: { present: 'do', past: 'did', pastParticiple: 'done', spanish: 'hacer', detectedTense: 'past' },
  done: { present: 'do', past: 'did', pastParticiple: 'done', spanish: 'hacer', detectedTense: 'pastParticiple' }
};

// API Endpoint: Autocomplete Verb Forms (Present, Past, Past Participle, Spanish, isVerb, detectedTense)
app.post("/api/complete-verb", async (req, res) => {
  try {
    const { verb, present, past, pastParticiple, spanish } = req.body;
    const baseVerb = (verb || present || past || pastParticiple || spanish || "").trim().toLowerCase();

    if (!baseVerb) {
      return res.status(400).json({ error: "Ingresa al menos un campo del verbo." });
    }

    // Direct check in local irregular dictionary
    if (IRREGULAR_VERBS_DICT[baseVerb]) {
      const match = IRREGULAR_VERBS_DICT[baseVerb];
      return res.json({
        present: present || match.present,
        past: past || match.past,
        pastParticiple: pastParticiple || match.pastParticiple,
        spanish: spanish || match.spanish,
        detectedTense: match.detectedTense,
        isVerb: true
      });
    }

    const ai = getGeminiAi();

    if (!ai) {
      const base = baseVerb;
      return res.json({
        present: present || base,
        past: past || `${base}ed`,
        pastParticiple: pastParticiple || `${base}ed`,
        spanish: spanish || `Significado de ${base}`,
        detectedTense: 'present',
        isVerb: true
      });
    }

    const prompt = `
    Eres un lingüista y diccionario experto de verbos en inglés y español.
    Evalúa si la siguiente palabra/entrada es un VERBO en inglés o no:
    - Entrada: "${baseVerb}"
    - Presente proporcionado: "${present || ''}"
    - Pasado proporcionado: "${past || ''}"
    - Participio proporcionado: "${pastParticiple || ''}"

    REGLAS IMPORTANTES:
    1. Determina "isVerb": booleano (true si es un verbo en inglés, false si es sustantivo/adjetivo/otra palabra no verbo como "apple", "happy", "car", "table").
    2. Si es verbo, identifica "detectedTense": uno de ["present", "past", "pastParticiple"]. Por ejemplo "drunk" se ingresó en participio ("pastParticiple"), "went" en pasado ("past"), "drink" en presente ("present").
    3. Para verbos IRREGULARES en inglés, NUNCA agregues "-ed" erróneamente. Da la conjugación exacta e impecable (ej: drink -> drank -> drunk, go -> went -> gone, eat -> ate -> eaten).
    4. Proporciona las 4 formas del verbo:
       - "present": V1 en inglés (ej: "drink", "play", "write")
       - "past": V2 en inglés (ej: "drank", "played", "wrote")
       - "pastParticiple": V3 en inglés (ej: "drunk", "played", "written")
       - "spanish": significado principal en español en infinitivo (ej: "beber", "jugar", "escribir")
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isVerb: { type: Type.BOOLEAN, description: "True si es un verbo válido en inglés" },
            detectedTense: { type: Type.STRING, description: "present, past, o pastParticiple" },
            present: { type: Type.STRING },
            past: { type: Type.STRING },
            pastParticiple: { type: Type.STRING },
            spanish: { type: Type.STRING }
          },
          required: ["isVerb", "present", "past", "pastParticiple", "spanish"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return res.json({
      isVerb: result.isVerb !== undefined ? result.isVerb : true,
      detectedTense: result.detectedTense || "present",
      present: result.present || present || baseVerb || "",
      past: result.past || past || "",
      pastParticiple: result.pastParticiple || pastParticiple || "",
      spanish: result.spanish || spanish || ""
    });

  } catch (error: any) {
    console.error("Error completing verb:", error);
    const { verb, present, past, pastParticiple, spanish } = req.body;
    const base = (verb || present || past || pastParticiple || spanish || "").toLowerCase();
    return res.json({
      isVerb: true,
      detectedTense: "present",
      present: present || base || "",
      past: past || (base ? `${base}ed` : ""),
      pastParticiple: pastParticiple || (base ? `${base}ed` : ""),
      spanish: spanish || (base ? `Significado de ${base}` : "")
    });
  }
});

// API Endpoint: Generate 3 verb sentences (Present, Past, Past Participle)
app.post("/api/generate-verb-examples", async (req, res) => {
  try {
    const { present, past, pastParticiple, spanish } = req.body;
    const ai = getGeminiAi();

    const v1 = (present || "work").trim();
    const v2 = (past || `${v1}ed`).trim();
    const v3 = (pastParticiple || `${v1}ed`).trim();
    const es = (spanish || "trabajar").trim();

    if (!ai) {
      return res.json({
        examples: [
          { tense: "Present Simple", sentence: `I ${v1} every day.`, translation: `Yo ${es} todos los días.` },
          { tense: "Past Simple", sentence: `Yesterday I ${v2}.`, translation: `Ayer ${es}.` },
          { tense: "Present Perfect", sentence: `I have ${v3} many times.`, translation: `He ${es} muchas veces.` }
        ]
      });
    }

    const prompt = `
    Eres un lingüista y profesor de inglés nativo experto.
    Proporciona oraciones de ejemplo cotidianas, con sentido completo y gramaticalmente impecables para el verbo en sus 3 tiempos principales:
    - Presente (V1): "${v1}"
    - Pasado (V2): "${v2}"
    - Participio Pasado (V3): "${v3}"
    - Significado en Español: "${es}"

    Instrucciones:
    1. Si Pasado (V2) o Participio (V3) no fueron especificados con precisión o difieren de la regla estándar, deduce e infiere la conjugación gramatical correcta en inglés para "${v1}".
    2. Genera 3 oraciones cotidianas y naturales en inglés con su traducción exacta al español:
       - 1 en Present Simple
       - 1 en Past Simple
       - 1 en Present Perfect
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            presentSentence: {
              type: Type.OBJECT,
              properties: { english: { type: Type.STRING }, spanish: { type: Type.STRING } },
              required: ["english", "spanish"]
            },
            pastSentence: {
              type: Type.OBJECT,
              properties: { english: { type: Type.STRING }, spanish: { type: Type.STRING } },
              required: ["english", "spanish"]
            },
            perfectSentence: {
              type: Type.OBJECT,
              properties: { english: { type: Type.STRING }, spanish: { type: Type.STRING } },
              required: ["english", "spanish"]
            }
          },
          required: ["presentSentence", "pastSentence", "perfectSentence"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    const examples = [
      {
        tense: "Present Simple",
        sentence: result.presentSentence?.english || `I ${v1} every day.`,
        translation: result.presentSentence?.spanish || `Yo ${es} todos los días.`
      },
      {
        tense: "Past Simple",
        sentence: result.pastSentence?.english || `Yesterday I ${v2}.`,
        translation: result.pastSentence?.spanish || `Ayer ${es}.`
      },
      {
        tense: "Present Perfect",
        sentence: result.perfectSentence?.english || `I have ${v3} many times.`,
        translation: result.perfectSentence?.spanish || `He ${es} muchas veces.`
      }
    ];

    return res.json({ ...result, examples });

  } catch (error: any) {
    console.error("Error generating verb sentences:", error);
    const { present, past, pastParticiple, spanish } = req.body;
    const v1 = (present || "work").trim();
    const v2 = (past || `${v1}ed`).trim();
    const v3 = (pastParticiple || `${v1}ed`).trim();
    const es = (spanish || "trabajar").trim();
    return res.json({
      examples: [
        { tense: "Present Simple", sentence: `I ${v1} every day.`, translation: `Yo ${es} todos los días.` },
        { tense: "Past Simple", sentence: `Yesterday I ${v2}.`, translation: `Ayer ${es}.` },
        { tense: "Present Perfect", sentence: `I have ${v3} many times.`, translation: `He ${es} muchas veces.` }
      ]
    });
  }
});

// API Endpoint: Generate Verb Tense Exercise Sentence
app.post("/api/generate-verb-tense-sentence", async (req, res) => {
  try {
    const { verb, tenseName } = req.body;
    const ai = getGeminiAi();

    const verbStr = verb?.present || verb?.english || "play";
    const pastStr = verb?.past || "";
    const participleStr = verb?.pastParticiple || "";
    const spanishStr = verb?.spanish || "jugar";

    if (!ai) {
      return res.json({
        englishSentence: `They were playing soccer in the stadium.`,
        spanishSentence: `Ellos estaban jugando al fútbol en el estadio.`,
        tenseName: tenseName || "Past Continuous"
      });
    }

    const prompt = `
    Eres un lingüista y profesor de inglés nativo experto.
    Tu objetivo es crear una oración en inglés extremadamente natural, práctica, con sentido completo y gramaticalmente perfecta para estudiar tiempos verbales y condicionales.

    Verbo / Expresión principal: "${verbStr}"
    - Pasado (V2): "${pastStr}"
    - Participio (V3): "${participleStr}"
    - Significado principal en español: "${spanishStr}"
    
    Tiempo verbal o Condicional requerido: "${tenseName}"

    INSTRUCCIONES CLAVE DE GENERACIÓN:
    1. Genera una oración completa en inglés que utilice el verbo/expresión "${verbStr}" perfectamente conjugado en el tiempo verbal o condicional "${tenseName}".
    2. La oración DEBE tener un sentido claro en la vida real (contexto realista) y sonar 100% natural para un hablante nativo. No uses plantillas rígidas ni oraciones repetitivas.
    3. Si se trata de un condicional (Zero, First, Second, Third, Mixed) o tiempo compuesto (Present Perfect Continuous, Past Perfect, Future Perfect, etc.), asegúrate de que la estructura completa de la cláusula sea gramaticalmente impecable y tenga coherencia lógica (por ejemplo, condicionales con 'if', conectores temporales adecuados).
    4. Proporciona la traducción equivalente en español de forma fluida, natural y precisa.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            englishSentence: { type: Type.STRING, description: "Oración en inglés con el verbo correctamente conjugado" },
            spanishSentence: { type: Type.STRING, description: "Traducción al español" }
          },
          required: ["englishSentence", "spanishSentence"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return res.json({
      englishSentence: result.englishSentence,
      spanishSentence: result.spanishSentence,
      tenseName: tenseName
    });

  } catch (error: any) {
    console.error("Error generating verb tense sentence:", error);
    const verbStr = req.body.verb?.english || "work";
    const spanishStr = req.body.verb?.spanish || "trabajar";
    return res.json({
      englishSentence: `She is ${verbStr}ing hard today.`,
      spanishSentence: `Ella está trabajando duro hoy.`,
      tenseName: req.body.tenseName || "Present Continuous"
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de Evaluación de Vocabulario corriendo en http://localhost:${PORT}`);
  });
}

startServer();
