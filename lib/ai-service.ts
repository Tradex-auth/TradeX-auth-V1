import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { getEnv } from "./env-config";

const geminiKey = getEnv('GEMINI_API_KEY') || getEnv('VITE_GEMINI_API_KEY');
const openaiKey = getEnv('OPENAI_API_KEY') || getEnv('VITE_OPENAI_API_KEY');

if (!geminiKey) console.warn("AI Service: GEMINI_API_KEY is missing. Gemini features will be disabled.");
if (!openaiKey) console.warn("AI Service: OPENAI_API_KEY is missing. OpenAI features will be disabled.");

export const genAI = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;
export const openai = openaiKey ? new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true }) : null;

export const COSTS = {
  GEMINI_FLASH: { input: 0.000075 / 1000, output: 0.0003 / 1000 },
  GPT_4O: { input: 5.0 / 1000000, output: 15.0 / 1000000 },
  GPT_35_TURBO: { input: 0.5 / 1000000, output: 1.5 / 1000000 }
};

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function estimateCost(inputTokens: number, outputTokens: number, model: 'gemini' | 'gpt-4o' | 'gpt-3.5') {
  if (model === 'gemini') return (inputTokens * COSTS.GEMINI_FLASH.input + outputTokens * COSTS.GEMINI_FLASH.output).toFixed(6);
  if (model === 'gpt-4o') return (inputTokens * COSTS.GPT_4O.input + outputTokens * COSTS.GPT_4O.output).toFixed(6);
  return (inputTokens * COSTS.GPT_35_TURBO.input + outputTokens * COSTS.GPT_35_TURBO.output).toFixed(6);
}

// Universal AI Runner prioritizing Gemini -> OpenAI -> Fallback
async function executeAI<T>(
  name: string,
  geminiFn: () => Promise<T>,
  openaiFn: () => Promise<T>,
  fallbackFn: () => T
): Promise<T> {
  if (genAI) {
    try {
      return await geminiFn();
    } catch (e) {
      console.warn(`[AI Service] ${name} Gemini failed, falling back to OpenAI or Local...`);
    }
  }

  if (openai) {
    try {
      return await openaiFn();
    } catch (e) {
      console.warn(`[AI Service] ${name} OpenAI failed, falling back to Local...`);
    }
  }

  try {
    return fallbackFn();
  } catch (fallbackError) {
    console.error(`[AI Service] ${name} Absolute Failure in fallback:`, fallbackError);
    return fallbackFn(); // Return anyway just in case the error was transient
  }
}

export async function getMotivationQuote() {
  const fallbacks = [
    "The market rewards discipline. Stay focused.",
    "Bhai, discipline hi asli wealth hai. Baaki sab moh maya hai.",
    "Aukaat actions se banti hai, baaton se nahi. Execute the plan.",
    "Boredom is the price of profitable trading.",
    "Don't trade your PnL, trade the system. Stick to the rules."
  ];
  const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  const prompt = "Generate a raw, blunt, Hinglish motivation quote (mix of Hindi/English) about trading, aukaat, discipline, and building wealth. Max 15 words. Be informal and direct.";

  return executeAI(
    "MotivationQuote",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      const text = response.text || randomFallback;
      return { text, cost: "0.000000", provider: 'Gemini' };
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50
      });
      const text = response.choices[0].message.content?.replace(/"/g, '') || randomFallback;
      const cost = estimateCost(estimateTokens(prompt), response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    },
    () => ({ text: randomFallback, cost: "0.000000", provider: 'Local (Fallback)' })
  );
}

export async function generateReflection(data: any) {
  const prompt = `As a supportive life coach, analyze these journal entries and metrics to provide a short, uplifting reflection (max 3 sentences).\nData: ${JSON.stringify(data)}`;

  return executeAI(
    "Reflection",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      const text = response.text || "Great effort today. Focus on consistency.";
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { text, cost, provider: 'Gemini' };
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150
      });
      const text = response.choices[0].message.content || "Great effort today. Focus on consistency.";
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    },
    () => ({ text: "Great effort today. Focus on consistency.", cost: "0.000000", provider: 'Fallback' })
  );
}

export async function optimizePlans(plans: string[]) {
  const prompt = `Review these plans for tomorrow and make them more "SMART" (Specific, Measurable, Achievable, Relevant, Time-bound). Only return the optimized list items, one per line.\nCurrent Plans:\n${plans.join('\n')}`;

  return executeAI(
    "OptimizePlans",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      const text = response.text || plans.join('\n');
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { text, cost, provider: 'Gemini' };
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      });
      const text = response.choices[0].message.content || plans.join('\n');
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    },
    () => ({ text: plans.join('\n'), cost: "0.000000", provider: 'Fallback' })
  );
}

export async function detectPatterns(logs: any[], trades: any[]) {
  const prompt = `You are a trading behavior analyst. Analyze this 30-day data of trading logs and personal journal metrics. Focus specifically on the relationship between "mindset" (psychological state) and trading results (pnl). Return a JSON array of up to 3 objects with keys: "title", "pattern", "trigger", "recommendation", "type" ("success" | "warning" | "mindset"). ONLY return the JSON array.\nLogs: ${JSON.stringify(logs)}\nTrades: ${JSON.stringify(trades)}`;

  return executeAI(
    "DetectPatterns",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      const text = response.text || "[]";
      const cleaned = text.replace(/```json|```/g, '').trim();
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { data: JSON.parse(cleaned), cost, provider: 'Gemini' };
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      const text = response.choices[0].message.content || "[]";
      const parsed = JSON.parse(text);
      const data = Array.isArray(parsed) ? parsed : (parsed.patterns || []);
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { data, cost, provider: 'OpenAI' };
    },
    () => ({ data: [], cost: "0.000000", provider: 'Fallback' })
  );
}

export async function generateMarketAnalysis(symbol: string, bias: string) {
  const prompt = `You are a clinical market analyst. Analyze the symbol "${symbol}". Current bias: ${bias}. Provide a sharp, 1-sentence technical sentiment. Identify a target level. Give a final "Sentiment Recommendation". Format in 30 words max. Be direct.`;

  return executeAI(
    "MarketAnalysis",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      const text = response.text || "Neutral sentiment observed.";
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { text, cost, provider: 'Gemini' };
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100
      });
      const text = response.choices[0].message.content || "Neutral sentiment observed.";
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    },
    () => ({ text: "Neutral sentiment observed.", cost: "0.000000", provider: 'Fallback' })
  );
}

export async function generateMorningBriefing(data: { yesterday: any; violationsCount: number; goals: any[] }) {
  const prompt = `You are a raw, blunt, "life-hitting" performance coach. Speak in Hinglish (a mix of Hindi and English). Your tone should be informal, tough, and direct. Provide a concise morning briefing (max 100 words).\n(a) # REALITY CHECK: One sharp observation about yesterday's discipline.\n(b) # TODAY'S JUNG: One priority for today to win.\n(c) # MISSION 2026: One punchy line tied to the Nov 8 2026 deadline.\n\nYesterday's Data:\n- Mood: ${data.yesterday?.mood_score || 'N/A'}/10, Energy: ${data.yesterday?.energy_score || 'N/A'}/10\n- Rule Violations: ${data.violationsCount} recorded.\nUpcoming Goals: ${data.goals?.map((g: any) => g.title).join(', ') || 'None'}`;
  const defaultFallback = "# MISSION 2026: Bhai, discipline hi rasta hai. Aaj focus kar aur win kar. Nov 8 2026 dur nahi hai.";

  return executeAI(
    "MorningBriefing",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      const text = response.text || defaultFallback;
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { text, cost, provider: 'Gemini' };
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400
      });
      const text = response.choices[0].message.content || defaultFallback;
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    },
    () => ({ text: defaultFallback, cost: "0.000000", provider: 'Fallback' })
  );
}

export async function generateMarketBriefing(marketData: string) {
  const prompt = `You are a market analyst explaining things in very easy language (max 100 words). Based on this watchlist: ${marketData}\n1. What is the current vibe of the top assets?\n2. Is the user's plan smart or risky right now?\n3. What is the single most important thing to watch today?\nUse bullet points. No complex jargon.`;

  return executeAI(
    "MarketBriefing",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      const text = response.text || "Market briefing unavailable.";
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { text, cost, provider: 'Gemini' };
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400
      });
      const text = response.choices[0].message.content || "Market briefing unavailable.";
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    },
    () => ({ text: "Market briefing currently unavailable.", cost: "0.000000", provider: 'Fallback' })
  );
}

export async function generateLearningReminder(): Promise<string> {
  const prompt = `Generate a very short, crisp, and motivating email body to remind a trader to start their daily learning session. Themes: Growth, mastery, long-term wealth, the Nov 8 2026 deadline. Max 50 words. Be direct and punchy. No generic "Dear user" or "Best regards".`;
  const defaultFallback = "Time to master the charts. Your future self is counting on your discipline today.";

  return executeAI(
    "LearningReminder",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      return response.text || defaultFallback;
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100
      });
      return response.choices[0].message.content || defaultFallback;
    },
    () => defaultFallback
  );
}

function formatLogContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => `- [${item.completed ? 'x' : ' '}] ${item.text}`).join('\n');
    }
    return content;
  } catch {
    return content;
  }
}

export async function summarizeWeek(achievements: string[], calendarEvents: string[]) {
  const formattedAchievements = achievements.map(formatLogContent);
  const prompt = `Summarize my productivity for the week based on these achievements and calendar events.\nAchievements:\n${formattedAchievements.join('\n\n')}\nCalendar Events:\n${calendarEvents.join('\n')}\nProvide a concise summary (3-4 sentences).`;
  
  return executeAI(
    "SummarizeWeek",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      return response.text || "Great work this week!";
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }]
      });
      return response.choices[0].message.content || "Great work this week!";
    },
    () => "Great work this week!"
  );
}

export async function scoreProductivity(plan: string, achieved: string) {
  const prompt = `Rate productivity (0 to 100) by comparing planned vs achieved tasks.\nPlanned:\n${formatLogContent(plan)}\nAchieved:\n${formatLogContent(achieved)}\nReturn ONLY a single number.`;

  return executeAI(
    "ScoreProductivity",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      const score = parseInt(response.text?.trim() || "0");
      return isNaN(score) ? 0 : score;
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      });
      const score = parseInt(response.choices[0].message.content?.trim() || "0");
      return isNaN(score) ? 0 : score;
    },
    () => 0
  );
}

export async function autoFixPythonCode(code: string, errorMessage: string): Promise<string> {
  const prompt = `You are a Python Quant Dev. Fix this code that threw an error.\nOriginal:\n${code}\nError:\n${errorMessage}\nReturn ONLY raw code. Provide 'entries' and 'exits'. Use defined 'close'.`;

  return executeAI(
    "AutoFixCode",
    async () => {
      const response = await genAI!.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      let text = response.text || code;
      return text.replace(/```python\n?/g, '').replace(/```/g, '').trim();
    },
    async () => {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500
      });
      let text = response.choices[0].message.content || code;
      return text.replace(/```python\n?/g, '').replace(/```/g, '').trim();
    },
    () => code
  );
}
