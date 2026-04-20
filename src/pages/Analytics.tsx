import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenAI } from "@google/genai";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  RefreshCw, 
  Sparkles, 
  Clock, 
  ExternalLink,
  Brain,
  Zap,
  Activity,
  ArrowUpRight,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import { summarizeWeek, scoreProductivity } from '@/lib/ai-service';
import { supabase } from '../../lib/supabase';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns';

import { useData } from '../contexts/DataContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analytics() {
  const { user } = useAuth();
  const { logs, violations, loading, refreshLogs, refreshViolations } = useData();
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);

  // Group violations by date
  const rulesTrajectoryData = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({
      start: subDays(today, 14),
      end: today
    });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayViolations = violations.filter(v => v.date === dateStr);
      const followedCount = dayViolations.filter(v => v.was_followed).length;
      
      return {
        date: format(day, 'MMM dd'),
        followed: followedCount,
        total: dayViolations.length
      };
    }).filter(d => d.total > 0); // Only show days where rules were tracked
  }, [violations]);

  async function handleSummarize() {
    if (!process.env.GEMINI_API_KEY) {
      toast.error('API key missing');
      return;
    }
    setSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const context = logs.map(l => ({
        date: l.date,
        metrics: { motivation: l.motivation_score, mood: l.mood_score, energy: l.energy_score },
        health: { sleep: l.sleep_hours, steps: l.steps_count, workout: l.workout_hours },
        highlights: l.achievements
      }));

      const prompt = `
        You are a high-performance optimization AI. Analyze the user's last 14 days of data:
        ${JSON.stringify(context)}
        
        Task:
        1. Identify the correlation between Sleep/Workout and Energy/Productivity levels.
        2. Give 3 specific "High-Alpha" recommendations to boost performance.
        3. Rate their current trajectory (Ascending, Plateaued, or Volatile).
        
        Provide a 200-word sharp report. Use professional, analytical language.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setSummary(result.text || 'Analysis failed.');
      toast.success('Performance report ready!');
    } catch (error) {
      console.error(error);
      toast.error('AI summary failed');
    } finally {
      setSummarizing(false);
    }
  }

  // Calculate stats for charts
  const chartData = logs.slice().reverse().map(l => ({
    name: format(new Date(l.date), 'EEE'),
    energy: l.energy_score || 0,
    motivation: l.motivation_score || 0,
    steps: (l.steps_count || 0) / 1000, // scaled for chart
    sleep: l.sleep_hours || 0
  }));

  const avgSleep = logs.length ? (logs.reduce((acc, curr) => acc + (curr.sleep_hours || 0), 0) / logs.length).toFixed(1) : 0;
  const avgSteps = logs.length ? Math.round(logs.reduce((acc, curr) => acc + (curr.steps_count || 0), 0) / logs.length) : 0;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-baseline gap-4">
        <div className="flex items-baseline gap-4">
          <h1 className="text-4xl font-black tracking-tighter uppercase">AI Performance Analytics</h1>
          <p className="text-xl font-medium text-muted-foreground hidden sm:block">Behavioral Patterns & Health Impact</p>
        </div>
        <div className="md:ml-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshLogs} 
            disabled={loading} 
            className="h-8 text-[10px] uppercase font-bold tracking-widest border-primary/20"
          >
            <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/40 border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                  <span>🚀 Productivity Correlation</span>
                  <Zap className="h-3 w-3 text-yellow-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="energy" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Energy (1-10)" />
                    <Bar dataKey="motivation" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Motivation (1-10)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center justify-between">
                  <span>📈 Rules Trajectory</span>
                  <Target className="h-3 w-3 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rulesTrajectoryData}>
                    <defs>
                      <linearGradient id="colorRules" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="followed" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorRules)" 
                      name="Rules Followed" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                  <span>💤 Vitality Recovery</span>
                  <Activity className="h-3 w-3 text-red-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="sleep" fill="#6366f1" radius={[4, 4, 0, 0]} name="Sleep (Hours)" />
                    <Bar dataKey="steps" fill="#10b981" radius={[4, 4, 0, 0]} name="Steps (k)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* AI Behavioral Audit */}
          <Card className="bg-linear-to-br from-primary/10 via-card to-card border-primary/20 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Brain className="h-32 w-32" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between relative z-10">
              <div className="space-y-1">
                <CardTitle className="text-[12px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Deep Performance Audit
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground">Correlating Health Metrics with Trading Discipline</CardDescription>
              </div>
              <Button 
                onClick={handleSummarize} 
                disabled={summarizing}
                className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-9 px-6 shadow-lg shadow-primary/20"
              >
                {summarizing ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <Brain className="h-3 w-3 mr-2" />}
                Run Full Audit
              </Button>
            </CardHeader>
            <CardContent className="relative z-10 min-h-[300px]">
              {summary ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <div className="bg-background/20 rounded-xl p-6 border border-primary/10 backdrop-blur-sm whitespace-pre-wrap text-foreground/90 leading-relaxed font-medium">
                    {summary}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
                  <Brain className="h-12 w-12 text-primary animate-pulse" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-widest">Audit Engine Standby</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase max-w-xs">AI is ready to analyze the last 14 days of your health and productivity data.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Quick Vitals */}
        <div className="space-y-6">
          <Card className="bg-card/40 border-primary/10 overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Biometric Averages (14d)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Avg Sleep</span>
                  <div className="text-xl font-black">{avgSleep}h</div>
                </div>
                <div className="h-10 w-10 rounded bg-indigo-500/10 flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4 text-indigo-400" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Avg Activity</span>
                  <div className="text-xl font-black">{avgSteps.toLocaleString()} <span className="text-[10px] text-muted-foreground">Steps</span></div>
                </div>
                <div className="h-10 w-10 rounded bg-emerald-500/10 flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-primary/10">
            <CardHeader>
               <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Recent Log Status</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-3">
                  {logs.slice(0, 5).map((l, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/50">
                       <span className="text-[10px] font-black uppercase tracking-tight">{format(new Date(l.date), 'EEE, MMM do')}</span>
                       <div className="flex items-center gap-2">
                          {l.achievements && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          {l.sleep_hours > 0 && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                       </div>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
