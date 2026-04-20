import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subDays, 
  subWeeks, 
  subMonths,
  eachDayOfInterval,
  isWithinInterval
} from 'date-fns';
import { 
  TrendingUp, 
  Brain,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Activity,
  Zap,
  Smile,
  LineChart as LineChartIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

export default function Reviews() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [viewDate, setViewDate] = useState(new Date());
  const [logs, setLogs] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualNotes, setManualNotes] = useState('');

  const interval = useMemo(() => {
    if (period === 'weekly') {
      return { start: startOfWeek(viewDate), end: endOfWeek(viewDate) };
    }
    return { start: startOfMonth(viewDate), end: endOfMonth(viewDate) };
  }, [viewDate, period]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, interval]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: logsData } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', format(interval.start, 'yyyy-MM-dd'))
        .lte('date', format(interval.end, 'yyyy-MM-dd'));

      const { data: tradesData } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', format(interval.start, 'yyyy-MM-dd'))
        .lte('date', format(interval.end, 'yyyy-MM-dd'));

      setLogs(logsData || []);
      setTrades(tradesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    const days = eachDayOfInterval(interval);
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const log = logs.find(l => l.date === dateStr);
      const dayTrades = trades.filter(t => t.date === dateStr);
      const dayPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
      
      return {
        name: format(day, period === 'weekly' ? 'EEE' : 'MMM d'),
        date: dateStr,
        motivation: log?.motivation_score || 0,
        mood: log?.mood_score || 0,
        energy: log?.energy_score || 0,
        pnl: dayPnL,
        trades: dayTrades.length
      };
    });
  }, [logs, trades, interval]);

  const stats = useMemo(() => {
    const totalPnL = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const winRate = trades.length > 0 ? (trades.filter(t => (t.pnl || 0) > 0).length / trades.length) * 100 : 0;
    const avgMood = logs.length > 0 ? logs.reduce((acc, l) => acc + (l.mood_score || 0), 0) / logs.length : 0;
    
    return { totalPnL, winRate, avgMood, tradeCount: trades.length };
  }, [trades, logs]);

  async function handleGenerateReport() {
    if (!process.env.GEMINI_API_KEY) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const summaryData = `
        Period: ${format(interval.start, 'PPP')} to ${format(interval.end, 'PPP')}
        Trading Performance: $${stats.totalPnL.toFixed(2)} Total P&L, ${stats.tradeCount} trades, ${stats.winRate.toFixed(1)}% win rate.
        Psychological Trends: Avg Mood ${stats.avgMood.toFixed(1)}/10.
        Daily Logs: ${logs.map(l => `- ${l.date}: Motivation ${l.motivation_score}/10, Note: ${l.gratitude_note}`).join('\n')}
      `;

      const prompt = `
        You are an elite trading performance auditor. Analyze this ${period} data for the user. 
        Provide a structured review covering:
        1. Performance Summary (P&L vs Psychological state)
        2. Main behavioral leak detected
        3. Strategic focus for next ${period === 'weekly' ? 'week' : 'month'}
        Be blunt, data-driven, and supportive. (Max 250 words)
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setReport(result.text || 'Failed to generate review.');
      toast.success('Performance review generated!');
    } catch (err) {
      toast.error('AI error');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleExport() {
     const dataStr = JSON.stringify({ interval, stats, logs, trades }, null, 2);
     const blob = new Blob([dataStr], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `TradeX_Review_${format(interval.start, 'yyyy-MM-dd')}.json`;
     a.click();
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Performance Reviews
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Aggregate your trading and psychological data for deep insights.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-muted/30 p-1 rounded-lg border border-border/50">
           <Button 
             variant={period === 'weekly' ? 'default' : 'ghost'} 
             size="sm" 
             onClick={() => setPeriod('weekly')}
             className="text-[10px] font-black uppercase"
           >Weekly</Button>
           <Button 
             variant={period === 'monthly' ? 'default' : 'ghost'} 
             size="sm" 
             onClick={() => setPeriod('monthly')}
             className="text-[10px] font-black uppercase"
           >Monthly</Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
         <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setViewDate(period === 'weekly' ? subWeeks(viewDate, 1) : subMonths(viewDate, 1))}>
               <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-6 py-2 bg-card border border-border/50 rounded-lg">
               <Calendar className="h-4 w-4 text-primary" />
               <span className="text-sm font-black uppercase tracking-tight">
                  {format(interval.start, 'MMM d')} — {format(interval.end, 'MMM d, yyyy')}
               </span>
            </div>
            <Button variant="outline" size="icon" onClick={() => setViewDate(period === 'weekly' ? subWeeks(viewDate, -1) : subMonths(viewDate, -1))}>
               <ChevronRight className="h-4 w-4" />
            </Button>
         </div>

         <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="font-bold uppercase tracking-widest text-[10px] h-9 gap-2">
               <Download className="h-4 w-4" />
               Export Data
            </Button>
            <Button onClick={handleGenerateReport} disabled={isGenerating || logs.length === 0} className="font-bold uppercase tracking-widest text-[10px] h-9 gap-2">
               {isGenerating ? 'Analyzing...' : <><Brain className="h-4 w-4" /> Generate AI Review</>}
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: 'Total P&L', val: `$${stats.totalPnL.toFixed(2)}`, icon: TrendingUp, color: stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500' },
           { label: 'Avg Win Rate', val: `${stats.winRate.toFixed(1)}%`, icon: Zap, color: 'text-primary' },
           { label: 'Avg Mood', val: `${stats.avgMood.toFixed(1)}/10`, icon: Smile, color: 'text-blue-500' },
           { label: 'Total Trades', val: stats.tradeCount, icon: LineChartIcon, color: 'text-orange-500' },
         ].map((stat, i) => (
           <Card key={i} className="bg-card/50">
             <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                   <stat.icon className={`h-5 w-5 ${stat.color}`} />
                   <Badge variant="outline" className="text-[8px] uppercase font-black">Period Stat</Badge>
                </div>
                <div className="text-2xl font-black">{stat.val}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
             </CardContent>
           </Card>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card className="bg-card/50">
            <CardHeader>
               <CardTitle className="text-xs font-black uppercase tracking-widest">Psychological Trend</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                        <defs>
                           <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis hide domain={[0, 10]} />
                        <Tooltip 
                           contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="mood" stroke="var(--primary)" fillOpacity={1} fill="url(#colorMood)" strokeWidth={3} />
                        <Area type="monotone" dataKey="energy" stroke="#3b82f6" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>

         <Card className="bg-card/50">
            <CardHeader>
               <CardTitle className="text-xs font-black uppercase tracking-widest">P&L Performance</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip 
                           contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', fontSize: '12px', fontWeight: 'bold' }}
                           formatter={(val: number) => [`$${val.toFixed(2)}`, 'PnL']}
                        />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                           {chartData.map((entry, index) => (
                              <rect key={`rect-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card className="bg-primary/5 border-primary/20 h-fit">
            <CardHeader>
               <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI Performance Audit
               </CardTitle>
            </CardHeader>
            <CardContent>
               {report ? (
                  <div className="prose prose-invert prose-sm max-w-none italic leading-relaxed text-foreground/90 whitespace-pre-wrap pr-4 border-l-2 border-primary/30 pl-4">
                     {report}
                  </div>
               ) : (
                  <div className="py-12 text-center space-y-4 opacity-50">
                     <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
                     <p className="text-xs font-bold uppercase tracking-widest">Aggregate data first to generate AI review.</p>
                  </div>
               )}
            </CardContent>
         </Card>

         <Card className="bg-card/40 h-fit">
            <CardHeader>
               <CardTitle className="text-xs font-black uppercase tracking-widest">Manual Review Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <Textarea 
                 placeholder="What did you learn about yourself this period? (Mistakes, wins, mindset shifts)" 
                 className="min-h-[250px] bg-background/50 border-border/50 text-sm leading-relaxed"
                 value={manualNotes}
                 onChange={e => setManualNotes(e.target.value)}
               />
               <Button className="w-full font-bold uppercase tracking-widest text-[10px]" variant="secondary">
                 Save Review Notes
               </Button>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
