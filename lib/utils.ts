import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper to get the current date in IST (UTC+5:30)
 */
export function getNowIST() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

export function parseChecklist(data: string): any[] {
  try {
    if (!data) return [];
    // Try parsing as JSON array
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed;
    // Fallback: treat as lines if it's not JSON
    return data.split('\n').filter(Boolean).map(line => ({
      id: crypto.randomUUID(),
      text: line.trim(),
      completed: false
    }));
  } catch {
    // If JSON parse fails, it's probably just text
    return data.split('\n').filter(Boolean).map(line => ({
      id: crypto.randomUUID(),
      text: line.trim(),
      completed: false
    }));
  }
}
