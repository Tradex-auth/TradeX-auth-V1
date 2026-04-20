/**
 * This utility handles environment variable access.
 */

export const getEnv = (key: string): string => {
  // 1. Try Vite's standard environment access (for VITE_ prefixed keys)
  try {
    // @ts-ignore
    if (import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}

  // 2. Try the defined process.env variables (from vite.config.ts define block)
  try {
    if (typeof process !== 'undefined' && process.env) {
      const val = (process.env as any)[key];
      if (val) return val;
    }
  } catch (e) {}

  // 3. Last resort - check global window for any injected vars
  try {
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
  } catch (e) {}
  
  return '';
};
