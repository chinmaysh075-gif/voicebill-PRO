// src/lib/voice/intents.ts
export type VoiceIntent =
  | "ADD_ITEM"
  | "REMOVE_LAST"
  | "CLEAR_CART"
  | "DELETE_ITEM"
  | "UNKNOWN";

export function detectIntent(transcript: string, lang: string): { intent: VoiceIntent; payload?: any } {
  const t = transcript.trim().toLowerCase();

  const base = (lang || "en").split("-")[0];

  // Simple multilingual patterns; you can refine with better NLP/regex later
  const patterns: Record<string, Record<VoiceIntent, (string | RegExp)[]>> = {
    en: {
      ADD_ITEM: [/(\badd\b|\bbuy\b|\border\b)/],
      REMOVE_LAST: ["remove last item"],
      CLEAR_CART: ["clear cart", "empty cart"],
      DELETE_ITEM: [/(^delete | remove )(.+)/],
      UNKNOWN: [],
    },
    hi: {
      ADD_ITEM: ["जोड़ो", "खरीदो", "ऑर्डर"],
      REMOVE_LAST: ["आखिरी आइटम हटाओ", "आखिरी हटाओ"],
      CLEAR_CART: ["कार्ट साफ करो", "कार्ट खाली करो"],
      DELETE_ITEM: [/^(हटा|डिलीट)\s+(.+)/],
      UNKNOWN: [],
    },
    kn: {
      ADD_ITEM: ["ಸೇರಿಸು", "ಕೊಳ್ಳಿ", "ಆರ್ಡರ್"],
      REMOVE_LAST: ["ಕೊನೆಯ ಐಟಂ ತೆಗೆಯಿ", "ಕೊನೆಯದು ತೆಗೆಯಿ"],
      CLEAR_CART: ["ಕಾರ್ಟ್ ಕ್ಲೀನ್ ಮಾಡಿ", "ಕಾರ್ಟ್ ಖಾಲಿ ಮಾಡಿ"],
      DELETE_ITEM: [/^(ಅಳಿಸು|ತೆಗೆಯಿ)\\s+(.+)/],
      UNKNOWN: [],
    },
    ml: {
      ADD_ITEM: ["ചേർക്കുക", "വാങ്ങുക", "ഓർഡർ"],
      REMOVE_LAST: ["അവസാന ഇനം നീക്കം ചെയ്യുക"],
      CLEAR_CART: ["കാർട്ട് ശൂന്യമാക്കുക"],
      DELETE_ITEM: [/^(നീക്കുക|ഡിലീറ്റ്)\\s+(.+)/],
      UNKNOWN: [],
    },
    ta: {
      ADD_ITEM: ["சேர்க்க", "வாங்க", "ஆர்டர்"],
      REMOVE_LAST: ["கடைசி பொருளை நீக்கு"],
      CLEAR_CART: ["வண்டியை காலி செய்", "வண்டியை சுத்தம் செய்"],
      DELETE_ITEM: [/^(அழி|நீக்கு)\\s+(.+)/],
      UNKNOWN: [],
    },
  };

  const rules = patterns[base] ?? patterns.en;

  const match = (list: (string | RegExp)[]) =>
    list.some((p) => (typeof p === "string" ? t.includes(p) : p.test(t)));

  if (match(rules.CLEAR_CART)) return { intent: "CLEAR_CART" };
  if (match(rules.REMOVE_LAST)) return { intent: "REMOVE_LAST" };
  if (match(rules.ADD_ITEM)) return { intent: "ADD_ITEM" };

  // DELETE_ITEM with name payload
  for (const p of rules.DELETE_ITEM) {
    if (typeof p !== "string") {
      const m = t.match(p);
      if (m && m[2]) return { intent: "DELETE_ITEM", payload: { name: m[2].trim() } };
    } else if (t.startsWith(p)) {
      const rest = t.slice(p.length).trim();
      if (rest) return { intent: "DELETE_ITEM", payload: { name: rest } };
    }
  }

  return { intent: "UNKNOWN" };
}