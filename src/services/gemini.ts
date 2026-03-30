import { GoogleGenAI, Type } from "@google/genai";
import { Feedback, ChatMessage } from "../types";
import { handleError, ErrorType } from "../lib/error-handler";

const GEMINI_API_KEY = "";
const OPENROUTER_API_KEY = "";
const GROQ_API_KEY = "";

const OPENROUTER_MODEL = "openrouter/auto";
const GROQ_MODEL = "llama-3.1-8b-instant";
const SYSTEM_PROMPT =
  "You are BolDost, a friendly English tutor for Indian students. Speak naturally in clear English, be encouraging, and keep responses concise, supportive, and practical. If the user makes a grammar mistake, gently point it out and provide the corrected version.";

const ai = null; // All AI calls go through server-side proxy

function buildChatMessages(history: ChatMessage[], message: string) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    })),
    { role: "user", content: message },
  ];
}

async function readJsonSafely(res: Response) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function getProviderError(provider: string, status: number, body: any) {
  const message = body?.error?.message || body?.error || body?.message || body?.raw || `${provider} request failed with status ${status}`;
  return new Error(`${provider} error ${status}: ${message}`);
}

async function postProxy<T>(action: string, body: unknown) {
  const response = await fetch(`/api/ai/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await readJsonSafely(response);
  if (!response.ok) throw getProviderError("Proxy", response.status, data);
  return data as T;
}

async function getChatViaOpenRouter(history: ChatMessage[], message: string): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OpenRouter is not configured.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "BolDost",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: buildChatMessages(history, message),
    }),
  });

  const data = await readJsonSafely(res);
  if (!res.ok) throw getProviderError("OpenRouter", res.status, data);
  return data?.choices?.[0]?.message?.content || "I am sorry, I could not understand that.";
}

async function getChatViaGroq(history: ChatMessage[], message: string): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("Groq is not configured.");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: buildChatMessages(history, message),
      temperature: 0.6,
    }),
  });

  const data = await readJsonSafely(res);
  if (!res.ok) throw getProviderError("Groq", res.status, data);
  return data?.choices?.[0]?.message?.content || "I am sorry, I could not understand that.";
}

async function getJsonViaGroq(prompt: string) {
  if (!GROQ_API_KEY) throw new Error("Groq is not configured.");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: "Return only valid JSON with no markdown fences or extra commentary." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await readJsonSafely(res);
  if (!res.ok) throw getProviderError("Groq", res.status, data);

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty response.");
  return JSON.parse(content);
}

function buildGeminiChatPayload(history: ChatMessage[], message: string) {
  return {
    model: "gemini-2.0-flash",
    contents: [
      ...history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ],
    config: { systemInstruction: SYSTEM_PROMPT },
  };
}

export const getChatResponse = async (history: ChatMessage[], message: string): Promise<string> => {
  try {
    const proxyResponse = await postProxy<{ text: string }>("chat", {
      origin: window.location.origin,
      geminiPayload: buildGeminiChatPayload(history, message),
      openRouterPayload: {
        model: OPENROUTER_MODEL,
        messages: buildChatMessages(history, message),
      },
      groqPayload: {
        model: GROQ_MODEL,
        messages: buildChatMessages(history, message),
        temperature: 0.6,
      },
    });

    if (proxyResponse.text) return proxyResponse.text;
  } catch (proxyError) {
    console.warn("[BolDost] Proxy chat failed, falling back to client providers...", proxyError);
  }

  if (ai) {
    try {
      const response = await ai.models.generateContent(buildGeminiChatPayload(history, message));
      return response.text || "I am sorry, I could not understand that.";
    } catch (geminiError) {
      console.warn("[BolDost] Gemini failed, trying fallback providers...", geminiError);
    }
  }

  try {
    return await getChatViaOpenRouter(history, message);
  } catch (openRouterError) {
    console.warn("[BolDost] OpenRouter failed, trying Groq...", openRouterError);
  }

  try {
    return await getChatViaGroq(history, message);
  } catch (groqError) {
    console.error("[BolDost] All providers failed.", groqError);
    const appError = handleError(groqError, ErrorType.GEMINI);
    return appError.userFeedback;
  }
};

export const analyzeSpeaking = async (transcript: string, topic: string): Promise<Feedback> => {
  const prompt = `Analyze this English speaking transcript for the topic "${topic}": "${transcript}".
Provide feedback in JSON format with:
- original: the input transcript
- corrected: a more natural, grammatically correct version
- explanation: a simple explanation of mistakes (friendly tone)
- fluencyScore: 0-100
- confidenceScore: 0-100
- grammarScore: 0-100`;

  const payload = {
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          corrected: { type: Type.STRING },
          explanation: { type: Type.STRING },
          fluencyScore: { type: Type.NUMBER },
          confidenceScore: { type: Type.NUMBER },
          grammarScore: { type: Type.NUMBER },
        },
        required: ["original", "corrected", "explanation", "fluencyScore", "confidenceScore", "grammarScore"],
      },
    },
  };

  try {
    const proxyResponse = await postProxy<{ text: string }>("analyze", { payload });
    return JSON.parse(proxyResponse.text || "{}");
  } catch (proxyError) {
    console.warn("[BolDost] Proxy speaking analysis failed, trying client fallback...", proxyError);
  }

  if (ai) {
    try {
      const response = await ai.models.generateContent(payload);
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.warn("[BolDost] Gemini speaking analysis failed, trying Groq...", error);
    }
  }

  try {
    return await getJsonViaGroq(
      `Analyze this English transcript for topic "${topic}": "${transcript}".
Return JSON with exactly these keys:
{"original":"...","corrected":"...","explanation":"...","fluencyScore":0,"confidenceScore":0,"grammarScore":0}`
    );
  } catch {
    return {
      original: transcript,
      corrected: transcript,
      explanation: "Could not analyze right now.",
      fluencyScore: 0,
      confidenceScore: 0,
      grammarScore: 0,
    };
  }
};

export const translateToEnglish = async (
  text: string,
  sourceLang: "Marathi" | "Hindi"
): Promise<{ english: string; explanation: string }> => {
  const payload = {
    model: "gemini-2.0-flash",
    contents: `Translate this ${sourceLang} text to natural, spoken English: "${text}".
Provide the translation and a brief explanation of the English structure used.
JSON format: { "english": "...", "explanation": "..." }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          english: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["english", "explanation"],
      },
    },
  };

  try {
    const proxyResponse = await postProxy<{ text: string }>("translate", { payload });
    return JSON.parse(proxyResponse.text || "{}");
  } catch (proxyError) {
    console.warn("[BolDost] Proxy translation failed, trying client fallback...", proxyError);
  }

  if (ai) {
    try {
      const response = await ai.models.generateContent(payload);
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.warn("[BolDost] Gemini translation failed, trying Groq...", error);
    }
  }

  try {
    return await getJsonViaGroq(
      `Translate this ${sourceLang} sentence into natural English: "${text}".
Return JSON with exactly these keys:
{"english":"...","explanation":"..."}`
    );
  } catch {
    return { english: text, explanation: "Translation unavailable right now." };
  }
};
