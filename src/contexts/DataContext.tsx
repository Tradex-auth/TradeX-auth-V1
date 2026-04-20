import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, DailyLog, RepositoryLink, Trade, TradingRule, RuleViolation, Goal, Milestone, DeepWorkSession } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface DataContextType {
  logs: DailyLog[];
  links: RepositoryLink[];
  trades: Trade[];
  rules: TradingRule[];
  violations: RuleViolation[];
  goals: Goal[];
  milestones: Milestone[];
  deepWork: DeepWorkSession[];
  loading: boolean;
  refreshAll: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  refreshLinks: () => Promise<void>;
  refreshTrades: () => Promise<void>;
  refreshRules: () => Promise<void>;
  refreshViolations: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshMilestones: () => Promise<void>;
  refreshDeepWork: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [links, setLinks] = useState<RepositoryLink[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rules, setRules] = useState<TradingRule[]>([]);
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deepWork, setDeepWork] = useState<DeepWorkSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetchedInitial, setHasFetchedInitial] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (!error && data) setLogs(data);
  }, [user]);

  const fetchLinks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('repository_links')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false });
    
    if (error) {
       const { data: simpleData } = await supabase
        .from('repository_links')
        .select('*')
        .order('created_at', { ascending: false });
       if (simpleData) setLinks(simpleData);
    } else if (data) {
      setLinks(data as any);
    }
  }, [user]);

  const fetchTrades = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (!error && data) setTrades(data);
  }, [user]);

  const fetchRules = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('trading_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error && data) setRules(data);
  }, [user]);

  const fetchViolations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('rule_violations')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (!error && data) setViolations(data);
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    
    // Check for the ultimate goal
    const { data: existingGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id);
    
    const pinnedGoal = existingGoals?.find(g => g.is_pinned);
    
    if (!pinnedGoal) {
      await supabase.from('goals').insert({
        user_id: user.id,
        title: 'THE ULTIMATE MISSION: NOV 8, 2026',
        description: 'The definitive target for complete trade excellence and lifestyle freedom.',
        category: 'trading',
        target_date: '2026-11-08',
        is_pinned: true
      });
      // Re-fetch handled below or by next select
    }

    const { data, error } = await supabase
      .from('goals')
      .select('*, milestones(completed)')
      .eq('user_id', user.id)
      .order('is_pinned', { ascending: false });
    if (!error && data) setGoals(data);
  }, [user]);

  const fetchMilestones = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setMilestones(data);
  }, [user]);

  const fetchDeepWork = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('deep_work_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (!error && data) setDeepWork(data);
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchLogs(),
        fetchLinks(),
        fetchTrades(),
        fetchRules(),
        fetchViolations(),
        fetchGoals(),
        fetchMilestones(),
        fetchDeepWork()
      ]);
      setHasFetchedInitial(true);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to sync data with cloud');
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs, fetchLinks, fetchTrades, fetchRules, fetchViolations, fetchGoals, fetchDeepWork]);

  // Initial fetch on login
  useEffect(() => {
    if (user && !hasFetchedInitial) {
      fetchAll();
    } else if (!user) {
      // Clear data on logout
      setLogs([]);
      setLinks([]);
      setTrades([]);
      setRules([]);
      setViolations([]);
      setGoals([]);
      setMilestones([]);
      setDeepWork([]);
      setHasFetchedInitial(false);
    }
  }, [user, hasFetchedInitial, fetchAll]);

  return (
    <DataContext.Provider value={{
      logs,
      links,
      trades,
      rules,
      violations,
      goals,
      milestones,
      deepWork,
      loading,
      refreshAll: fetchAll,
      refreshLogs: fetchLogs,
      refreshLinks: fetchLinks,
      refreshTrades: fetchTrades,
      refreshRules: fetchRules,
      refreshViolations: fetchViolations,
      refreshGoals: fetchGoals,
      refreshMilestones: fetchMilestones,
      refreshDeepWork: fetchDeepWork
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
