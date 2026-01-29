
import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (aiInstance) return aiInstance;

  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.API_KEY || "";
  if (!apiKey) {
    console.warn("Gemini API key is not set. AI features will be unavailable.");
  }

  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
};

export const fetchVerseData = async (query: string, version: string = "King James Version") => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Retrieve the text for the verse: "${query}" using the "${version}" translation. Return the reference and the full text as JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reference: { type: Type.STRING },
          text: { type: Type.STRING }
        },
        required: ["reference", "text"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const suggestVerses = async () => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Suggest 5 short and impactful Bible verses for memorization. Return as a JSON list of objects with reference and text.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            reference: { type: Type.STRING },
            text: { type: Type.STRING }
          },
          required: ["reference", "text"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};
