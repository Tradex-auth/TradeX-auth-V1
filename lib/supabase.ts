import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env-config';

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// Admin client for backend operations
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || supabaseAnonKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Auth Helpers
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) return null;
  return data;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  return profile?.role === 'admin';
}

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  is_approved: boolean;
  google_doc_url?: string;
  google_connected?: boolean;
  google_refresh_token?: string;
  created_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  day_of_week: string;
  achievements: string;
  plans_for_tomorrow: string;
  motivation_score?: number;
  mood_score?: number;
  happiness_score?: number;
  energy_score?: number;
  sleep_hours?: number;
  steps_count?: number;
  workout_hours?: number;
  gratitude_note?: string;
  mindset_note?: string;
  ai_reflection?: string;
  created_at: string;
  updated_at: string;
}

export interface RepositoryLink {
  id: string;
  user_id: string;
  title: string;
  url: string;
  note: string;
  tags: string[];
  created_at: string;
  user_name?: string;
}

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  quantity: number;
  date: string;
  setup_type: string;
  screenshot_url?: string;
  notes?: string;
  pnl: number;
  r_multiple: number;
  is_win: boolean;
  ai_critique?: string;
  setup_quality_score?: number;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  bias: 'bullish' | 'neutral' | 'bearish';
  created_at: string;
}

export interface WatchlistLog {
  id: string;
  watchlist_item_id: string;
  date: string;
  bias: 'bullish' | 'neutral' | 'bearish';
  note?: string;
  created_at: string;
}

export interface TradingRule {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'entry' | 'exit' | 'risk' | 'mindset';
  created_at: string;
}

export interface RuleViolation {
  id: string;
  user_id: string;
  rule_id: string;
  date: string;
  was_followed: boolean;
  created_at: string;
}

export interface DeepWorkSession {
  id: string;
  user_id: string;
  label: string;
  duration_minutes: number;
  focus_rating: number; // 1-5
  date: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'trading' | 'health' | 'learning' | 'finance' | 'other';
  target_date: string;
  is_pinned?: boolean;
  created_at: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface MorningBriefing {
  id: string;
  user_id: string;
  date: string;
  content: string;
  created_at: string;
}

export interface DailySystemContent {
  id: string;
  date: string;
  quote: string;
  created_at: string;
}

export interface AIPatternInsight {
  id: string;
  user_id: string;
  high_performance_pattern: string;
  low_discipline_trigger: string;
  behavioral_loop: string;
  top_recommendation: string;
  is_read: boolean;
  created_at: string;
}
