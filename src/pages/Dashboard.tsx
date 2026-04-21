import React, { useState, useEffect } from 'react';
import { getNowIST, parseChecklist } from '@/lib/utils';
import { 
  getMotivationQuote, 
  generateReflection, 
  optimizePlans 
} from '@/lib/ai-service';
import { DailyChecklist, ChecklistItem } from '../components/DailyChecklist';
import { CountdownHeader } from '../components/CountdownHeader';
import DeepWorkTracker from '../components/DeepWorkTracker';
import { MorningBriefing } from '../components/MorningBriefing';
import PatternDetector from '../components/PatternDetector';
import { DownloadEngine } from '../components/DownloadEngine';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { DataProvider, useData } from '../contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { format, subDays, addDays } from 'date-fns';
import { toast } from 'sonner';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Target, 
  ShieldCheck, 
  Flag, 
  ArrowRight,
  TrendingUp,
  BarChart3,
  DollarSign,
  Info,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Brain,
  Zap,
  Smile,
  Heart,
  Sparkles,
  Moon as MoonIcon,
  Footprints,
  Dumbbell,
  Save
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { Badge } from '@/components/ui/badge';

const MOCK_CHART_DATA = [
  { day: 'Mon', profit: 400 },
  { day: 'Tue', profit: 150 },
  { day: 'Wed', profit: 600 },
  { day: 'Thu', profit: -200 },
  { day: 'Fri', profit: 800 },
  { day: 'Sat', profit: 300 },
  { day: 'Sun', profit: 900 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { logs, rules, violations, goals, deepWork, refreshAll, refreshLogs, refreshViolations } = useData();
  const [selectedDate, setSelectedDate] = useState(getNowIST());
  const [achievements, setAchievements] = useState<ChecklistItem[]>([]);
  const [plans, setPlans] = useState<ChecklistItem[]>([]);
  const [motivation, setMotivation] = useState(5);
  const [mood, setMood] = useState(5);
  const [happiness, setHappiness] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [sleep, setSleep] = useState(0);
  const [steps, setSteps] = useState(0);
  const [workout, setWorkout] = useState(0);
  const [gratitude, setGratitude] = useState('');
  const [mindset, setMindset] = useState('');
  const [reflection, setReflection] = useState('');
  const [reflectionCost, setReflectionCost] = useState('0.00');
  const [plansCost, setPlansCost] = useState('0.00');
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [isOptimizingPlans, setIsOptimizingPlans] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [quote, setQuote] = useState('');
  const [quoteCost, setQuoteCost] = useState('0.00');

  const nowIST = getNowIST();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const nowISTStr = format(nowIST, 'yyyy-MM-dd');
  const isToday = dateStr === nowISTStr;

  // Derived Data from DataContext
  const log = React.useMemo(() => logs.find(l => l.date === dateStr), [logs, dateStr]);
  const yesterdayLog = React.useMemo(() => {
    const yestStr = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
    return logs.find(l => l.date === yestStr);
  }, [logs, selectedDate]);
  
  const recentLogs = React.useMemo(() => logs.slice(0, 7), [logs]);
  
  const todayRules = React.useMemo(() => {
    return rules.map(r => ({
      ...r,
      followed: violations.find(v => v.rule_id === r.id && v.date === dateStr)?.was_followed ?? false
    }));
  }, [rules, violations, dateStr]);

  const activeGoals = React.useMemo(() => goals, [goals]);

  const deepWorkHours = React.useMemo(() => {
    const sessions = deepWork.filter(s => s.date === dateStr);
    const totalMins = sessions.reduce((acc, s) => acc + s.duration_minutes, 0) || 0;
    return totalMins / 60;
  }, [deepWork, dateStr]);

  useEffect(() => {
    fetchQuote();
  }, [selectedDate, user]);

  useEffect(() => {
    if (log) {
      setAchievements(parseChecklist(log.achievements || ''));
      setPlans(parseChecklist(log.plans_for_tomorrow || ''));
      setGratitude(log.gratitude_note || '');
      setMindset(log.mindset_note || '');
      setReflection(log.ai_reflection || '');
      setMotivation(log.motivation_score ?? 5);
      setMood(log.mood_score ?? 5);
      setHappiness(log.happiness_score ?? 5);
      setEnergy(log.energy_score ?? 5);
      setSleep(log.sleep_hours ?? 0);
      setSteps(log.steps_count ?? 0);
      setWorkout(log.workout_hours ?? 0);
      if (log.updated_at) setLastSaved(new Date(log.updated_at));
    } else {
      setAchievements([]);
      setPlans([]);
      setGratitude('');
      setMindset('');
      setReflection('');
      setMotivation(5);
      setMood(5);
      setHappiness(5);
      setEnergy(5);
      setSleep(0);
      setSteps(0);
      setWorkout(0);
      setLastSaved(null);
    }
  }, [log]);

  async function handleToggleRule(ruleId: string, followed: boolean) {
    if (!user || !isToday) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      const { data: existing } = await supabase
        .from('rule_violations')
        .select('*')
        .eq('rule_id', ruleId)
        .eq('date', today)
        .single();

      if (existing) {
        await supabase.from('rule_violations').update({ was_followed: !followed }).eq('id', existing.id);
      } else {
        await supabase.from('rule_violations').insert({
          user_id: user.id,
          rule_id: ruleId,
          date: today,
          was_followed: !followed
        });
      }
      refreshViolations();
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchQuote() {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data: dailyContent } = await supabase
        .from('daily_system_content')
        .select('*')
        .eq('date', today)
        .single();
      
      if (dailyContent) {
        setQuote(dailyContent.quote);
        return;
      }

      const res = await getMotivationQuote();
      setQuote(res.text);
      setQuoteCost(res.cost);

      await supabase.from('daily_system_content').upsert({
        date: today,
        quote: res.text
      });
    } catch (err) {
      console.error('Quote fetch error:', err);
    }
  }

  // Handle individual metric updates with immediate sync to state and eventual DB save
  const updateMetric = async (key: string, value: number) => {
    if (!user || !isToday) return;
    
    // Update local state first for immediate snappy UI
    if (key === 'motivation') setMotivation(value);
    if (key === 'mood') setMood(value);
    if (key === 'happiness') setHappiness(value);
    if (key === 'energy') setEnergy(value);
    if (key === 'sleep') setSleep(value);
    if (key === 'steps') setSteps(value);
    if (key === 'workout') setWorkout(value);

    // Save to Supabase (upsert)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const dbKey = ['sleep', 'steps', 'workout'].includes(key) ? `${key}_hours` : (key === 'steps' ? 'steps_count' : `${key}_score`);
      // Fix key mapping for steps
      const finalKey = key === 'steps' ? 'steps_count' : (['sleep', 'workout'].includes(key) ? `${key}_hours` : `${key}_score`);

      const upsertData: any = {
        user_id: user.id,
        date: dateStr,
        day_of_week: format(selectedDate, 'EEEE'),
        [finalKey]: value,
        updated_at: new Date().toISOString()
      };

      if (log?.id) {
        await supabase.from('daily_logs').update({ [finalKey]: value, updated_at: new Date().toISOString() }).eq('id', log.id);
      } else {
        await supabase.from('daily_logs').insert(upsertData);
      }
      refreshLogs();
    } catch (err) {
      console.error(`Failed to sync ${key}:`, err);
    }
  };

  async function handleGenerateReflection() {
    if (!user || isGeneratingReflection) return;
    setIsGeneratingReflection(true);
    
    try {
      const data = {
        date: format(selectedDate, 'PPP'),
        achievements: achievements.map(a => a.text),
        motivation, mood, energy,
        sleep, steps, workout,
        gratitude,
        mindset,
        plans: plans.map(p => p.text)
      };

      const res = await generateReflection(data);
      setReflection(res.text);
      setReflectionCost(res.cost);
      toast.success(`${res.provider} reflection generated!`);
    } catch (err) {
      console.error('Reflection error:', err);
      toast.error('Failed to generate AI reflection');
    } finally {
      setIsGeneratingReflection(false);
    }
  }

  async function handleOptimizePlans() {
    if (!user || isOptimizingPlans || plans.length === 0) return;
    setIsOptimizingPlans(true);
    
    try {
      const res = await optimizePlans(plans.map(p => p.text));
      const text = res.text || '';
      const lines = text.split('\n').filter(l => l.trim().length > 0).map(line => ({
        id: crypto.randomUUID(),
        text: line.replace(/^[*-]\s*/, '').trim(),
        completed: false
      }));
      
      if (lines.length > 0) {
        setPlans(lines);
        setPlansCost(res.cost);
        toast.success(`Plans optimized via ${res.provider}!`);
      }
    } catch (err) {
      console.error('Plan optimization error:', err);
      toast.error('Failed to optimize plans');
    } finally {
      setIsOptimizingPlans(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayOfWeek = format(selectedDate, 'EEEE');

  const achievementsStr = JSON.stringify(achievements);
  // FEATURE 4: Auto-fill deep work into achievements if not present
  const finalAchievements = [...achievements];
  if (deepWorkHours > 0) {
    const dwText = `Completed ${deepWorkHours.toFixed(1)}h of Deep Work`;
    if (!achievements.some(a => a.text.includes('Deep Work'))) {
      finalAchievements.push({ id: crypto.randomUUID(), text: dwText, completed: true });
    }
  }
  const plansStr = JSON.stringify(plans);

  try {
    if (log) {
      const { data } = await supabase
        .from('daily_logs')
        .update({
          achievements: JSON.stringify(finalAchievements),
            plans_for_tomorrow: plansStr,
            motivation_score: motivation,
            mood_score: mood,
            happiness_score: happiness,
            energy_score: energy,
            sleep_hours: sleep,
            steps_count: steps,
            workout_hours: workout,
            gratitude_note: gratitude,
            mindset_note: mindset,
            ai_reflection: reflection,
            updated_at: new Date().toISOString()
          })
          .eq('id', log.id)
          .select()
          .single();
        if (data) {
          // No need for setLog as it is derived from context
          refreshLogs();
        }
      } else {
        const { data } = await supabase
          .from('daily_logs')
          .insert({
            user_id: user.id,
            date: dateStr,
            day_of_week: dayOfWeek,
            achievements: achievementsStr,
            plans_for_tomorrow: plansStr,
            motivation_score: motivation,
            mood_score: mood,
            happiness_score: happiness,
            energy_score: energy,
            sleep_hours: sleep,
            steps_count: steps,
            workout_hours: workout,
            gratitude_note: gratitude,
            mindset_note: mindset,
            ai_reflection: reflection
          })
          .select()
          .single();
        if (data) {
          refreshLogs();
        }
      }
      setLastSaved(new Date());
      toast.success('Log synced successfully');
    } catch (error) {
      toast.error('Failed to save log');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {isToday && quote && (
          <div className="bg-[#062e1c]/80 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden group shadow-2xl shadow-emerald-950/20">
            <div className="relative z-10 flex items-start gap-4">
              <Sparkles className="h-6 w-6 text-emerald-400 mt-1 shrink-0 animate-pulse" />
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/70 mb-1">
                   TradeX: Real-Talk Motivation
                </div>
                <p className="text-xl font-black text-emerald-50 italic leading-tight tracking-tight uppercase">
                  "{quote}"
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-[8px] opacity-30 font-mono text-emerald-400">SESSION: {format(new Date(), 'yyyyMMdd')}</span>
                </div>
              </div>
            </div>
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-emerald-950/20 to-emerald-950/40 pointer-events-none" />
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Main Content Pane */}
        <div className="space-y-8">
          <CountdownHeader />
          
          <MorningBriefing />

        <div className="flex items-baseline gap-4">
          <h1 className="text-4xl font-black tracking-tighter">
            {format(selectedDate, 'do MMMM')}
          </h1>
          <p className="text-xl font-medium text-muted-foreground">
            {format(selectedDate, 'EEEE')}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(getNowIST())} className="h-8 text-[10px] uppercase font-bold tracking-widest">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))} disabled={isToday || selectedDate > nowIST} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Planned Tasks from Yesterday */}
        {yesterdayLog?.plans_for_tomorrow && (
          <Card className="bg-card/50 border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                Yesterday's Planned Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-background/40 border border-dashed rounded-lg p-4">
                <DailyChecklist 
                  items={parseChecklist(yesterdayLog.plans_for_tomorrow)} 
                  onChange={() => {}} 
                  readOnly={true} 
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Inputs */}
        <div className="grid gap-6">
          <Card className="flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                <span className="text-primary">✅</span>
                What I achieved today
              </CardTitle>
              {lastSaved && (
                <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Last saved {format(lastSaved, 'h:mm a')}
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-8 pb-4">
              <div className="space-y-4">
                <DailyChecklist
                  items={achievements}
                  onChange={setAchievements}
                  placeholder="Record what you won today..."
                  readOnly={!isToday}
                />
              </div>
              
              <div className="space-y-4">
                <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-primary">🚀</span>
                    Plans for tomorrow
                  </div>
                  {isToday && plans.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] opacity-70 font-mono text-primary">Est: ${plansCost}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleOptimizePlans}
                        disabled={isOptimizingPlans}
                        className="h-6 text-[9px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5 border border-primary/20"
                      >
                        {isOptimizingPlans ? 'Refining...' : '✨ AI Refine'}
                      </Button>
                    </div>
                  )}
                </CardTitle>
                <DailyChecklist
                  items={plans}
                  onChange={setPlans}
                  placeholder="What are your goals for tomorrow?"
                  readOnly={!isToday}
                />
              </div>
            </CardContent>
            {isToday && (
              <div className="p-6 pt-0 hidden">
                 {/* Internal save moved to comprehensive button */}
              </div>
            )}
          </Card>

          {/* Daily Reflection & Journal Section */}
          <Card className="bg-background/40">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                <Brain className="h-3 w-3 text-primary" />
                Daily Reflection & Journal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-8 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sliders Grid */}
                <div className="space-y-6">
                  {/* Rating Sections */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-muted/20 px-3 py-2 rounded-lg">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        Motivation Level
                      </Label>
                      <span className="text-sm font-black text-primary">{motivation}/10</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          disabled={!isToday}
                          onClick={() => updateMetric('motivation', num)}
                          className={`w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                            motivation === num 
                              ? 'bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/20' 
                              : 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/50'
                          } ${!isToday ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-muted/20 px-3 py-2 rounded-lg">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Smile className="h-3 w-3 text-blue-500" />
                        Current Mood
                      </Label>
                      <span className="text-sm font-black text-primary">{mood}/10</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          disabled={!isToday}
                          onClick={() => updateMetric('mood', num)}
                          className={`w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                            mood === num 
                              ? 'bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/20' 
                              : 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/50'
                          } ${!isToday ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-muted/20 px-3 py-2 rounded-lg">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Heart className="h-3 w-3 text-red-500" />
                        General Happiness
                      </Label>
                      <span className="text-sm font-black text-primary">{happiness}/10</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          disabled={!isToday}
                          onClick={() => updateMetric('happiness', num)}
                          className={`w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                            happiness === num 
                              ? 'bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/20' 
                              : 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/50'
                          } ${!isToday ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-muted/20 px-3 py-2 rounded-lg">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-orange-500" />
                        Energy Levels
                      </Label>
                      <span className="text-sm font-black text-primary">{energy}/10</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          disabled={!isToday}
                          onClick={() => updateMetric('energy', num)}
                          className={`w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                            energy === num 
                              ? 'bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/20' 
                              : 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/50'
                          } ${!isToday ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Health Section */}
                  <div className="pt-6 border-t border-border/40 space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      <ShieldCheck className="h-3 w-3" />
                      Vitality Logs
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <MoonIcon className="h-3 w-3 text-indigo-400" />
                            Sleep Duration
                          </Label>
                          <span className="text-[10px] font-black text-primary">{sleep}h</span>
                        </div>
                        <Input 
                          type="number" 
                          step="0.5"
                          disabled={!isToday}
                          value={sleep || ''} 
                          onChange={(e) => updateMetric('sleep', parseFloat(e.target.value) || 0)} 
                          className="h-9 bg-background/40 border-border/40 text-center font-black"
                          placeholder="Hours"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Footprints className="h-3 w-3 text-emerald-400" />
                            Daily Steps
                          </Label>
                          <span className="text-[10px] font-black text-primary">{steps.toLocaleString()}</span>
                        </div>
                        <Input 
                          type="number" 
                          disabled={!isToday}
                          value={steps || ''} 
                          onChange={(e) => updateMetric('steps', parseInt(e.target.value) || 0)} 
                          className="h-9 bg-background/40 border-border/40 text-center font-black"
                          placeholder="Steps"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Dumbbell className="h-3 w-3 text-red-400" />
                            Workout Time
                          </Label>
                          <span className="text-[10px] font-black text-primary">{workout}h</span>
                        </div>
                        <Input 
                          type="number" 
                          step="0.5"
                          disabled={!isToday}
                          value={workout || ''} 
                          onChange={(e) => updateMetric('workout', parseFloat(e.target.value) || 0)} 
                          className="h-9 bg-background/40 border-border/40 text-center font-black"
                          placeholder="Hours"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Journal Textarea */}
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      🙏 Daily Gratitude Note
                    </Label>
                    <Textarea 
                      disabled={!isToday}
                      value={gratitude}
                      onChange={(e) => setGratitude(e.target.value)}
                      placeholder="Write down one thing you are grateful for today..."
                      className="min-h-[100px] bg-background/20 border-border/40 resize-none text-sm leading-relaxed"
                    />

                    <div className="pt-4 space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        🧠 What was your mindset today?
                      </Label>
                      <Textarea 
                        disabled={!isToday}
                        value={mindset}
                        onChange={(e) => setMindset(e.target.value)}
                        placeholder="Describe your mental state, emotional control, and focus levels..."
                        className="min-h-[100px] bg-background/20 border-border/40 resize-none text-sm leading-relaxed"
                      />
                    </div>

                  {/* AI Reflection Box */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        ✨ AI Reflection & Advice
                      </Label>
                      {isToday && (
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] opacity-70 font-mono text-primary">Est: ${reflectionCost}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleGenerateReflection}
                            disabled={isGeneratingReflection}
                            className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary hover:bg-primary/10 border border-primary/20"
                          >
                            {isGeneratingReflection ? 'Analyzing...' : 'Generate New'}
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 relative overflow-hidden group min-h-[100px]">
                      {reflection ? (
                        <p className="text-xs leading-relaxed italic text-foreground/90">
                          "{reflection}"
                        </p>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-center opacity-50">
                          <Brain className="h-5 w-5 animate-pulse text-primary" />
                          <p className="text-[10px] font-medium uppercase tracking-widest">
                            No reflection generated yet
                          </p>
                        </div>
                      )}
                      
                      {/* Decorative gradient mask */}
                      <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-transparent opacity-30 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            
            {/* COMPREHENSIVE SAVE BUTTON */}
            {isToday && (
              <div className="p-6 border-t border-border/40 bg-muted/10 flex flex-col items-center gap-4">
                <div className="flex items-center gap-8 w-full justify-center text-muted-foreground">
                   <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${achievements.length > 0 ? 'text-green-500' : 'text-muted-foreground opacity-30'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Achievements</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${plans.length > 0 ? 'text-yellow-500' : 'text-muted-foreground opacity-30'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Plans</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <Smile className={`h-4 w-4 ${gratitude ? 'text-blue-500' : 'text-muted-foreground opacity-30'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Reflection</span>
                   </div>
                </div>
                
                <Button 
                  size="lg" 
                  onClick={handleSave} 
                  disabled={saving} 
                  className="w-full max-w-md font-black uppercase tracking-[0.2em] text-sm py-8 shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all group"
                >
                  {saving ? (
                    <span className="flex items-center gap-3">
                       <Zap className="h-5 w-5 animate-spin" />
                       Synchronizing Data...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                       <Save className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                       Finalize & Save Daily Entry
                    </span>
                  )}
                </Button>
                
                {lastSaved && (
                   <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <ShieldCheck className="h-3 w-3 text-green-500" />
                      Last synced to cloud at {format(lastSaved, 'h:mm:ss a')}
                   </span>
                )}
              </div>
            )}
          </Card>

          {/* Performance Outlook (Mock) */}
        <Card className="bg-card/40 border-primary/10 overflow-hidden">
          <CardHeader className="pb-3 bg-muted/10 border-b border-border/40">
             <div className="flex justify-between items-center">
                <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                   <BarChart3 className="h-3 w-3 text-primary" />
                   Performance Matrix (Mock)
                </CardTitle>
                <div className="flex items-center gap-2">
                   <TrendingUp className="h-3 w-3 text-green-500" />
                   <span className="text-[10px] font-black text-green-500 uppercase">+12.4% Est.</span>
                </div>
             </div>
          </CardHeader>
          <CardContent className="pt-6">
             <div className="text-[10px] text-muted-foreground font-medium mb-4 flex items-center gap-2">
                <Info className="h-3 w-3" />
                This chart simulates your projected monthly profit curve based on current trading velocity.
             </div>
             <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_CHART_DATA}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#666', fontWeight: 'bold' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#666', fontWeight: 'bold' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', fontSize: 10, borderRadius: 8 }}
                      itemStyle={{ color: '#22c55e' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorProfit)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>

        {/* Recent History List */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground px-1">
              📅 Recent History
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentLogs.filter(rl => rl.date !== format(selectedDate, 'yyyy-MM-dd')).slice(0, 4).map((rl) => (
                <Card 
                  key={rl.date} 
                  className="cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
                  onClick={() => setSelectedDate(new Date(rl.date))}
                >
                  <CardContent className="p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      {format(new Date(rl.date), 'EEE, MMM do')}
                    </div>
                    <div className="text-xs font-medium truncate">
                      {parseChecklist(rl.achievements).length} achievements
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border/40">
           <PatternDetector />
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-8">
        {/* Deep Work Tracker Module */}
        <DeepWorkTracker compact={true} />

        {/* Plans Comparison Chart */}
        <Card className="bg-card/40 border-primary/10 overflow-hidden">
          <CardHeader className="pb-3 bg-muted/10 border-b border-border/40">
             <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                <Flag className="h-3 w-3 text-primary" />
                Plans Velocity Comparison
             </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
             <div className="text-[10px] text-muted-foreground font-medium mb-4 flex items-center gap-2">
                <Info className="h-3 w-3" />
                Comparing the number of planned tasks between yesterday and today.
             </div>
             <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Yesterday', count: yesterdayLog ? parseChecklist(yesterdayLog.plans_for_tomorrow).length : 0 },
                    { name: 'Today', count: plans.length }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#666', fontWeight: 'bold' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#666', fontWeight: 'bold' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', fontSize: 10, borderRadius: 8 }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>

        {/* Today's Focused Plan (from yesterday) */}
        <Card className="bg-card/40 border-primary/20">
           <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex justify-between items-center">
                 <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                    <Flag className="h-3 w-3 text-primary" />
                    Today's Plan
                 </CardTitle>
                 <Badge variant="outline" className="text-[8px] h-4 font-black">YESTERDAY'S VISION</Badge>
              </div>
           </CardHeader>
           <CardContent className="pt-4 space-y-3">
              {!yesterdayLog?.plans_for_tomorrow ? (
                <div className="py-2 text-[10px] text-muted-foreground italic leading-relaxed">
                   No specific plan was set yesterday for today. Use the morning briefing to structure your day.
                </div>
              ) : (
                <DailyChecklist 
                  items={parseChecklist(yesterdayLog.plans_for_tomorrow)} 
                  onChange={() => {}} 
                  readOnly={true} 
                  compact={true}
                />
              )}
           </CardContent>
        </Card>

        {/* Focused Rules Checklist */}
        <Card className="bg-card/40 border-primary/20">
           <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex justify-between items-center">
                 <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    Today's Rules
                 </CardTitle>
                 <Link to="/discipline" className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline">
                    Manage
                 </Link>
              </div>
           </CardHeader>
           <CardContent className="pt-4 space-y-3">
              {todayRules.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground italic">No rules defined.</div>
              ) : todayRules.slice(0, 5).map(rule => (
                <div key={rule.id} className="flex items-center gap-3">
                   <Checkbox 
                     checked={rule.followed} 
                     disabled={!isToday}
                     onCheckedChange={() => handleToggleRule(rule.id, rule.followed)} 
                   />
                   <span className={`text-[11px] font-bold uppercase truncate ${rule.followed ? 'line-through opacity-50' : ''}`}>
                      {rule.title}
                   </span>
                </div>
              ))}
           </CardContent>
        </Card>

        {/* Active Goals Tracker */}
        <Card className="bg-card/40">
           <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex justify-between items-center">
                 <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                    <Target className="h-3 w-3 text-primary" />
                    Top Goals
                 </CardTitle>
                 <Link to="/goals" className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline">
                    View All
                 </Link>
              </div>
           </CardHeader>
           <CardContent className="pt-4 space-y-4">
              {activeGoals.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground italic">No goals set.</div>
              ) : activeGoals.slice(0, 3).map(goal => {
                const total = goal.milestones?.length || 0;
                const completed = goal.milestones?.filter((m: any) => m.completed).length || 0;
                const progress = total > 0 ? (completed / total) * 100 : 0;
                
                return (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-tight">
                       <span className="truncate max-w-[150px]">{goal.title}</span>
                       <span className="text-primary">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                );
              })}
           </CardContent>
        </Card>
      </div>
      </div>
      
      <div className="mt-8 border-t border-border/40 pt-8">
        <DownloadEngine />
      </div>
    </div>
  );
}
