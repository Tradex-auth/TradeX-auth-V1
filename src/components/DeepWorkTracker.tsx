import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { 
  Play, 
  Pause, 
  Square, 
  Brain, 
  History,
  TrendingUp,
  Target,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase, DeepWorkSession } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GoogleGenAI } from "@google/genai";

import { useData } from '../contexts/DataContext';

export default function DeepWorkTracker({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { deepWork: sessions, loading, refreshDeepWork } = useData();
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [label, setLabel] = useState('Trading Study');
  const [dailyTarget, setDailyTarget] = useState(4); // 4 hours goal
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Timer Persistence
  useEffect(() => {
    const savedTime = localStorage.getItem('deep_work_seconds');
    const savedIsActive = localStorage.getItem('deep_work_is_active') === 'true';
    const savedLabel = localStorage.getItem('deep_work_label');
    const lastTimestamp = localStorage.getItem('deep_work_timestamp');

    if (savedTime) setSeconds(parseInt(savedTime));
    if (savedIsActive) setIsActive(savedIsActive);
    if (savedLabel) setLabel(savedLabel);

    if (savedIsActive && lastTimestamp) {
      const diff = Math.floor((Date.now() - parseInt(lastTimestamp)) / 1000);
      setSeconds(prev => prev + diff);
    }
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => {
          const newS = s + 1;
          localStorage.setItem('deep_work_seconds', newS.toString());
          localStorage.setItem('deep_work_timestamp', Date.now().toString());
          return newS;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    localStorage.setItem('deep_work_is_active', isActive.toString());
    localStorage.setItem('deep_work_label', label);
    return () => clearInterval(interval);
  }, [isActive, label]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  async function handleStop() {
    if (seconds < 60) {
      if (!confirm('Session is less than 1 minute. Log it anyway?')) return;
    }

    const focusRating = parseInt(prompt('Rate your focus quality (1-5):', '5') || '5');
    const minutes = Math.floor(seconds / 60);
    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      const { error } = await supabase.from('deep_work_sessions').insert({
        user_id: user?.id,
        label: label,
        duration_minutes: minutes,
        focus_rating: focusRating,
        date: today
      });

      if (error) throw error;
      
      toast.success('Deep work session logged!');
      setIsActive(false);
      setSeconds(0);
      localStorage.removeItem('deep_work_seconds');
      localStorage.removeItem('deep_work_is_active');
      localStorage.removeItem('deep_work_timestamp');
      refreshDeepWork();
    } catch (err) {
      toast.error('Failed to log session');
    }
  }

  async function handleAiInsights() {
     if (!process.env.GEMINI_API_KEY || sessions.length === 0) return;
     setIsAiLoading(true);
     try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const last7DaysData = sessions.slice(0, 20).map(s => `- ${s.label}: ${s.duration_minutes}m, Focus: ${s.focus_rating}/5, Date: ${s.date}`).join('\n');
        
        const prompt = `
          Analyze this user's deep work session data from the last week:
          ${last7DaysData}
          
          Provide "Weekly Focus Insights":
          1. Peak focus time of day prediction (if data available, else hypothetical based on trends).
          2. Most productive topic based on duration/rating.
          3. 2 improvement suggestions for deepening focus.
          Keep it sharp and professional.
        `;

        const result = await ai.models.generateContent({
           model: "gemini-3-flash-preview",
           contents: prompt,
        });
        setAiInsights(result.text || 'No insights generated.');
        toast.success('AI focus report ready');
     } catch (err) {
        toast.error('AI error');
     } finally {
        setIsAiLoading(false);
     }
  }

  // Visualization Logic
  const todayTotalMinutes = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return sessions
      .filter(s => s.date === today)
      .reduce((acc, s) => acc + s.duration_minutes, 0);
  }, [sessions]);

  const chartData = useMemo(() => {
    const today = new Date();
    const interval = eachDayOfInterval({
      start: subDays(today, 6),
      end: today
    });

    return interval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayMins = sessions
        .filter(s => s.date === dateStr)
        .reduce((acc, s) => acc + s.duration_minutes, 0);
      return {
        name: format(date, 'EEE'),
        hours: dayMins / 60,
        targetMet: (dayMins / 60) >= dailyTarget
      };
    });
  }, [sessions, dailyTarget]);

  return (
    <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-2'} gap-8`}>
      <Card className="bg-card/40 border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <Brain className="h-24 w-24" />
        </div>
        <CardHeader>
           <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <Zap className="h-4 w-4 text-primary animate-pulse" />
                 Active Focus Session
              </CardTitle>
              <Badge variant="outline" className="font-black text-[10px]">IST</Badge>
           </div>
        </CardHeader>
        <CardContent className={`space-y-4 flex flex-col items-center ${compact ? 'py-4' : 'py-10'}`}>
           <div className={`${compact ? 'text-4xl' : 'text-7xl'} font-black tracking-tighter tabular-nums text-foreground drop-shadow-sm`}>
              {formatTime(seconds)}
           </div>
           
           <div className="w-full max-w-xs space-y-3">
              <div className="space-y-1">
                 <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Session Label</Label>
                 <Input 
                   value={label} 
                   onChange={e => setLabel(e.target.value)} 
                   className="font-bold text-center bg-background/50 border-primary/20 h-8 text-xs"
                   disabled={isActive}
                 />
              </div>
              
              <div className="flex gap-2">
                 {!isActive ? (
                   <Button onClick={() => setIsActive(true)} className="flex-1 font-black uppercase tracking-widest gap-2 h-10 text-[10px]">
                      <Play className="h-3 w-3 fill-current" />
                      Start
                   </Button>
                 ) : (
                   <Button onClick={() => setIsActive(false)} variant="secondary" className="flex-1 font-black uppercase tracking-widest gap-2 h-10 text-[10px]">
                      <Pause className="h-3 w-3 fill-current" />
                      Pause
                   </Button>
                 )}
                 <Button onClick={handleStop} variant="destructive" size="icon" className="h-10 w-10 shrink-0" disabled={seconds === 0}>
                    <Square className="h-3 w-3 fill-current" />
                 </Button>
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
         {/* Circular-esque Progress */}
         <Card className="bg-card/40">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Daily Progress ({dailyTarget}h Goal)
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex items-end justify-between mb-2">
                  <div className="text-3xl font-black">{(todayTotalMinutes / 60).toFixed(1)}<span className="text-sm text-muted-foreground ml-1">hrs</span></div>
                  <div className="text-xs font-bold text-muted-foreground">
                    {Math.min(100, Math.floor((todayTotalMinutes / (dailyTarget * 60)) * 100))}% Complete
                  </div>
               </div>
               <Progress value={(todayTotalMinutes / (dailyTarget * 60)) * 100} className="h-3 bg-muted" />
               <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                    <Clock className="h-3 w-3" />
                    Today's Deep Work
                  </div>
                  {todayTotalMinutes >= dailyTarget * 60 ? (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30 font-black h-5 text-[9px] uppercase">Goal Hit</Badge>
                  ) : (
                    <span className="text-[10px] font-bold text-primary">{(dailyTarget * 60 - todayTotalMinutes)}m remaining</span>
                  )}
               </div>
            </CardContent>
         </Card>

         {/* Weekly Breakdown Chart */}
         <Card className="bg-card/40">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
               <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <BarChart className="h-4 w-4" />
                  Weekly Performance
               </CardTitle>
               <Button variant="ghost" size="sm" onClick={handleAiInsights} disabled={isAiLoading} className="h-7 text-[9px] font-black uppercase tracking-widest text-primary gap-1">
                 {isAiLoading ? 'Analyzing...' : <>AI Insights <Brain className="h-3 w-3" /></>}
               </Button>
            </CardHeader>
            <CardContent>
               {aiInsights ? (
                  <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-500 relative">
                     <p className="text-[11px] leading-relaxed italic text-muted-foreground pr-8">
                       "{aiInsights}"
                     </p>
                     <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-2 right-2 text-muted-foreground hover:text-primary" onClick={() => setAiInsights(null)}>
                        &times;
                     </Button>
                  </div>
               ) : null}
               <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', fontSize: '10px' }}
                        formatter={(val: number) => [`${val.toFixed(1)}h`, 'Work']}
                      />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell 
                             key={`cell-${index}`} 
                             fill={entry.targetMet ? 'var(--primary)' : 'var(--muted-foreground)'} 
                             fillOpacity={entry.targetMet ? 1 : 0.3} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
