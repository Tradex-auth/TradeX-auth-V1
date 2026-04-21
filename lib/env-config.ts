/**
 * This utility handles environment variable access.
 */

export const getEnv = (key: string): string => {
  // Hardcoded map to ensure Vite's static "define" replacement works during build
  const staticEnvMap: Record<string, string | undefined> = {
    'VITE_SUPABASE_URL': typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined,
    'VITE_SUPABASE_ANON_KEY': typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined,
    'SUPABASE_SERVICE_ROLE_KEY': typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined,
    'GEMINI_API_KEY': typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined,
    'OPENAI_API_KEY': typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined,
    'APP_URL': typeof process !== 'undefined' ? process.env.APP_URL : undefined,
  };

  if (staticEnvMap[key]) {
    return staticEnvMap[key] as string;
  }

  // 1. Try Vite's standard environment access (for VITE_ prefixed keys)
  try {
    // @ts-ignore
    if (import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}

  // 2. Try the defined process.env variables fallback
  try {
    if (typeof process !== 'undefined' && process.env) {
      const val = (process.env as any)[key];
      if (val) return val;
    }
  } catch (e) {}

  return '';
};
