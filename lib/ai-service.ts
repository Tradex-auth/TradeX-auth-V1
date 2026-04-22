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
  GEMINI_FLASH: { input: 0.000075 / 1000, output: 0.0003 / 1000 }, // per token approx
  GPT_4O: { input: 5.0 / 1000000, output: 15.0 / 1000000 },
  GPT_35_TURBO: { input: 0.5 / 1000000, output: 1.5 / 1000000 }
};

// Simple character-to-token estimation (approx 4 chars per token)
export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function estimateCost(inputTokens: number, outputTokens: number, model: 'gemini' | 'gpt-4o' | 'gpt-3.5') {
  if (model === 'gemini') return (inputTokens * COSTS.GEMINI_FLASH.input + outputTokens * COSTS.GEMINI_FLASH.output).toFixed(6);
  if (model === 'gpt-4o') return (inputTokens * COSTS.GPT_4O.input + outputTokens * COSTS.GPT_4O.output).toFixed(6);
  return (inputTokens * COSTS.GPT_35_TURBO.input + outputTokens * COSTS.GPT_35_TURBO.output).toFixed(6);
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

  try {
    if (openai) {
      const prompt = "Generate a raw, blunt, Hinglish motivation quote (mix of Hindi/English) about trading, aukaat, discipline, and building wealth. Max 15 words. Be informal and direct.";
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50
      });
      const text = response.choices[0].message.content?.replace(/"/g, '') || "";
      const cost = estimateCost(estimateTokens(prompt), response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    }

    if (genAI) {
      const model = "gemini-1.5-flash"; // Fixed valid model name
      const prompt = "Generate a raw, blunt, Hinglish motivation quote (mix of Hindi/English) about trading, aukaat, discipline, and building wealth. Max 15 words. Be informal and direct.";
      const response = await genAI.models.generateContent({ model, contents: prompt });
      return { text: response.text || randomFallback, cost: "0.000000", provider: 'Gemini' };
    }

    return { text: randomFallback, cost: "0.000000", provider: 'Local (No API Key)' };
  } catch (error) {
    console.error("AI Error:", error);
    return { text: randomFallback, cost: "0.000000", provider: 'Local (Fallback)' };
  }
}

export async function generateReflection(data: any): Promise<{ text: string; cost: string; provider: string }> {
  const prompt = `
    As a supportive life coach, analyze these daily journal entries and metrics to provide a short, 
    uplifting reflection (max 3 sentences) for the user.
    
    Data: ${JSON.stringify(data)}
    
    Provide advice on how to improve tomorrow or celebrate today's wins.
  `;

  try {
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150
      });
      const text = response.choices[0].message.content || "";
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    }

    if (genAI) {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text || "";
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { text, cost, provider: 'Gemini' };
    }
    throw new Error("No AI provider available");
  } catch (error) {
    console.error("Reflection Error:", error);
    return { text: "Great effort today. Focus on consistency.", cost: "0.000000", provider: 'Fallback' };
  }
}

export async function optimizePlans(plans: string[]): Promise<{ text: string; cost: string; provider: string }> {
  const prompt = `
    Review these plans for tomorrow and make them more "SMART" (Specific, Measurable, Achievable, Relevant, Time-bound).
    Only return the optimized list items, one per line. Keep it concise.
    
    Current Plans:
    ${plans.join('\n')}
  `;

  try {
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      });
      const text = response.choices[0].message.content || "";
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    }

    if (genAI) {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text || "";
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { text, cost, provider: 'Gemini' };
    }
    throw new Error("No AI provider available");
  } catch (error) {
    console.error("Plan Optimization Error:", error);
    return { text: plans.join('\n'), cost: "0.000000", provider: 'Fallback' };
  }
}

export async function detectPatterns(logs: any[], trades: any[]): Promise<{ data: any[]; cost: string; provider: string }> {
  const prompt = `
    You are a trading behavior analyst. Analyze the following 30-day data of trading logs and personal journal metrics.
    Identify the top 3 patterns in behavior, psychology, or performance.
    
    Data:
    Logs: ${JSON.stringify(logs)}
    Trades: ${JSON.stringify(trades)}

    Task:
    Focus specifically on the relationship between "mindset" (psychological state) and trading results (pnl).
    Look for loops like "high energy but bad mindset leads to over-trading".

    Return a JSON array of 3 objects with these keys: 
    "title" (short category), 
    "pattern" (the observation), 
    "trigger" (potential cause), 
    "recommendation" (habit-building action), 
    "type" ("success" | "warning" | "mindset").
    ONLY return the JSON array.
  `;

  try {
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      const text = response.choices[0].message.content || "[]";
      // OpenAI JSON mode might return { "patterns": [...] } or just [...] if it's a smart prompt
      // But let's assume it follows instructions
      const parsed = JSON.parse(text);
      const data = Array.isArray(parsed) ? parsed : (parsed.patterns || []);
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { data, cost, provider: 'OpenAI' };
    }

    if (genAI) {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text || "[]";
      const cleaned = text.replace(/```json|```/g, '').trim();
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { data: JSON.parse(cleaned), cost, provider: 'Gemini' };
    }
    throw new Error("No AI provider available");
  } catch (error) {
    console.error("Pattern Detect Error:", error);
    return { data: [], cost: "0.000000", provider: 'Fallback' };
  }
}

export async function generateMarketAnalysis(symbol: string, bias: string): Promise<{ text: string; cost: string; provider: string }> {
  const prompt = `
    You are a clinical market analyst. Analyze the symbol "${symbol}".
    Current User Bias: ${bias}
    
    Task: 
    1. Provide a sharp, 1-sentence technical sentiment based on general characteristics.
    2. Identify a major technical target level.
    3. Give a final "Sentiment Recommendation".
    
    Format in 30 words max. Be direct.
  `;

  try {
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100
      });
      const text = response.choices[0].message.content || "";
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    }

    if (genAI) {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text || "";
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { text, cost, provider: 'Gemini' };
    }
    throw new Error("No AI provider available");
  } catch (error) {
    console.error("Market Analysis AI Error:", error);
    return { text: "Neutral sentiment observed.", cost: "0.000000", provider: 'Fallback' };
  }
}

export async function generateMorningBriefing(data: { yesterday: any; violationsCount: number; goals: any[] }): Promise<{ text: string; cost: string; provider: string }> {
  const prompt = `
    You are a raw, blunt, "life-hitting" performance coach. Speak in Hinglish (a mix of Hindi and English). 
    Your tone should be informal, tough, and direct—like an elder brother or a strict mentor giving a reality check.
    
    Provide a concise morning briefing (max 100 words).
    (a) # REALITY CHECK: One sharp, blunt observation about yesterday's discipline (mentioning violations if any).
    (b) # TODAY'S JUNG: One clear, actionable priority for today to win.
    (c) # MISSION 2026: One punchy, life-hitting line tied to the Nov 8 2026 deadline.
    
    Avoid formal English. Use words like "bhai", "aukaat", "sapne", "discipline", "mehnat".
    Use bold headers. No fluff.

    Yesterday's Data:
    - Mood: ${data.yesterday?.mood_score || 'N/A'}/10, Energy: ${data.yesterday?.energy_score || 'N/A'}/10
    - Rule Violations: ${data.violationsCount} recorded.
    Upcoming Goals: ${data.goals?.map((g: any) => g.title).join(', ') || 'None'}
  `;

  try {
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400
      });
      const text = response.choices[0].message.content || "";
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    }

    if (genAI) {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text || "";
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { text, cost, provider: 'Gemini' };
    }
    throw new Error("No AI provider available");
  } catch (error) {
    console.error("Morning Briefing Error:", error);
    return { text: "# MISSION 2026: Bhai, discipline hi rasta hai. Aaj focus kar aur win kar. Nov 8 2026 dur nahi hai.", cost: "0.000000", provider: 'Fallback' };
  }
}

export async function generateMarketBriefing(marketData: string): Promise<{ text: string; cost: string; provider: string }> {
  const prompt = `
    You are a market analyst explaining things in very easy, simple language (max 100 words).
    Based on this watchlist: ${marketData}
    
    1. What is the current vibe of the top assets? (Very simple terms, like "Strong", "Messy", "Waiting")
    2. Is the user's plan smart or risky right now?
    3. What is the single most important thing to watch today?
    Use bullet points. No complex jargon.
  `;

  try {
    if (genAI) {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text || "";
      const cost = estimateCost(estimateTokens(prompt), estimateTokens(text), 'gemini');
      return { text, cost, provider: 'Gemini' };
    }

    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400
      });
      const text = response.choices[0].message.content || "";
      const cost = estimateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o');
      return { text, cost, provider: 'OpenAI' };
    }
    throw new Error("No AI provider available");
  } catch (error) {
    console.error("Market Briefing AI Error:", error);
    return { text: "Market briefing currently unavailable.", cost: "0.000000", provider: 'Fallback' };
  }
}

export async function generateLearningReminder(): Promise<string> {
  const prompt = `
    Generate a very short, crisp, and motivating email body to remind a trader to start their daily learning session.
    Themes: Growth, mastery, long-term wealth, the Nov 8 2026 deadline.
    Max 50 words. Be direct and punchy. No generic "Dear user" or "Best regards".
  `;

  try {
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100
      });
      return response.choices[0].message.content || "Time to master the charts. Every hour spent learning is a step closer to freedom.";
    }

    if (genAI) {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      return response.text || "Time to master the charts. Every hour spent learning is a step closer to freedom.";
    }

    return "Time to master the charts. Your future self is counting on your discipline today.";
  } catch (error) {
    return "Start your learning session now. Discipline equals freedom.";
  }
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
  const prompt = `
    Summarize my productivity for the week based on these achievements and calendar events.
    
    Achievements:
    ${formattedAchievements.join('\n\n')}
    
    Calendar Events:
    ${calendarEvents.join('\n')}
    
    Provide a concise summary (3-4 sentences) and one actionable tip for next week.
  `;

  try {
    if (genAI) {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      return response.text || "Great work this week!";
    }
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }]
      });
      return response.choices[0].message.content || "Great work this week!";
    }
    return "AI services unavailable.";
  } catch (error) {
    console.error("Summary Error:", error);
    return "Could not generate summary.";
  }
}

export async function scoreProductivity(plan: string, achieved: string) {
  const formattedPlan = formatLogContent(plan);
  const formattedAchieved = formatLogContent(achieved);
  const prompt = `
    Rate the productivity on a scale of 0 to 100 by comparing the planned tasks for today and the tasks actually achieved.
    
    Planned Tasks (from yesterday):
    ${formattedPlan || "No specific plan recorded."}
    
    Achieved Tasks (from today):
    ${formattedAchieved || "No achievements recorded."}
    
    Factors for scoring:
    - Completion rate of planned tasks.
    - Quality of achievements.
    - If no plan was set, score based on volume of achievements (max 60%).
    
    Return ONLY a single number representing the score. No explanation.
  `;

  try {
    if (genAI) {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const score = parseInt(response.text?.trim() || "0");
      return isNaN(score) ? 0 : score;
    }
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      });
      const score = parseInt(response.choices[0].message.content?.trim() || "0");
      return isNaN(score) ? 0 : score;
    }
    return 0;
  } catch (error) {
    console.error("Score Error:", error);
    return 0;
  }
}

export async function autoFixPythonCode(code: string, errorMessage: string): Promise<string> {
  const prompt = `
    You are an expert Python Quantitative Developer specializing in the VectorBT library.
    The user wrote this strategy code for an algorithmic backtest engine, but it threw an error.
    
    Original Code:
    ${code}
    
    Python Error Output:
    ${errorMessage}
    
    INSTRUCTIONS:
    1. Fix the error. 
    2. Crucially, the user MUST define 'entries' and 'exits' lists/arrays/series as their output variables. 
    3. They do NOT need to fetch yfinance data if they are trying to fetch it themselves; the engine natively provides the variable 'close' (Pandas Series) for them based on their UI selection. Warn them via python comment not to download yfinance manually and to just use 'close' directly if that caused the shape mismatch.
    4. Provide ONLY the raw, corrected valid Python code. No markdown formatting (\`\`\`python), no explanations. Just raw code.
  `;

  try {
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500
      });
      let text = response.choices[0].message.content || code;
      return text.replace(/```python\n?/g, '').replace(/```/g, '').trim();
    }
    return code;
  } catch (error) {
    console.error("AutoFix Error:", error);
    return code;
  }
}
