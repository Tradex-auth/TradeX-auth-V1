import React, { useState, useEffect, useMemo } from 'react';
import { supabase, UserProfile, DailyLog, TradingRule, RuleViolation } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Search, 
  BarChart3, 
  Brain, 
  Activity, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Filter,
  RefreshCw,
  Zap,
  LayoutGrid,
  List
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'sonner';

export default function Admin() {
  const { user, profile } = useAuth();
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [rules, setRules] = useState<TradingRule[]>([]);
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [watchlistLogs, setWatchlistLogs] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [teamAnalysis, setTeamAnalysis] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchTeam();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserData(selectedUserId);
    }
  }, [selectedUserId]);

  async function fetchTeam() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTeamProfiles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserData(uid: string) {
    try {
      const { data: logsData } = await supabase.from('daily_logs').select('*').eq('user_id', uid);
      const { data: rulesData } = await supabase.from('trading_rules').select('*').eq('user_id', uid);
      const { data: violationsData } = await supabase.from('rule_violations').select('*').eq('user_id', uid);
      const { data: wlData } = await supabase.from('watchlists').select('*').eq('user_id', uid);
      const { data: wlLogData } = await supabase.from('watchlist_logs').select('*').in('watchlist_item_id', wlData?.map(w => w.id) || []);
      
      setLogs(logsData || []);
      setRules(rulesData || []);
      setViolations(violationsData || []);
      setWatchlists(wlData || []);
      setWatchlistLogs(wlLogData || []);
    } catch (err) {
      console.error(err);
    }
  }

  const selectedProfile = teamProfiles.find(p => p.id === selectedUserId);

  const teamStats = useMemo(() => {
    const totalUsers = teamProfiles.length;
    const avgMood = logs.length > 0 ? logs.reduce((acc, l) => acc + (l.mood_score || 0), 0) / logs.length : 0;
    const totalSteps = logs.reduce((acc, l) => acc + (l.steps_count || 0), 0);
    return { totalUsers, avgMood, totalSteps };
  }, [teamProfiles, logs]);

  async function generateTeamReport() {
    if (!process.env.GEMINI_API_KEY) {
      toast.error("Gemini API key missing");
      return;
    }
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        You are a Team Performance Architect & Trading Psychologist. 
        Analyze the overall health and discipline of the ${teamProfiles.length} member team.
        
        Data Points:
        - Team Mood Average (Recent): ${teamStats.avgMood.toFixed(1)}/10
        - Total Steps Logged: ${teamStats.totalSteps}
        - Total Active Rules: ${rules.length}
        - Recent Violations: ${violations.length}
        
        Task: 
        1. Identify the collective psychological "Leak".
        2. Evaluate overall team discipline.
        3. Provide 3 high-impact recommendations for the Admin to improve group execution.
        
        Be analytical, blunt, and data-driven. (Max 300 words)
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setTeamAnalysis(result.text || "Failed to generate audit.");
      toast.success("Team AI Audit Complete");
    } catch (err) {
      toast.error("AI report failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-8">
        <div className="text-center space-y-4">
          <ShieldCheck className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Access Denied</h1>
          <p className="text-muted-foreground font-medium">This terminal is restricted to authorized administrative personnel.</p>
          <Button variant="outline" className="font-bold uppercase tracking-widest text-[10px]" onClick={() => window.location.href = '/'}>
             Return to Base
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 selection:bg-primary selection:text-black">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <ShieldCheck className="text-black h-5 w-5" />
             </div>
             <h1 className="text-3xl font-black uppercase tracking-tighter italic">Command Center</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest opacity-60">Admin Portal v2.0 • Data Isolation Active</p>
        </div>

        <div className="flex items-center gap-3">
           <Button 
             variant="outline"
             className="font-black uppercase tracking-widest text-[10px] gap-2 h-10 px-6 border-blue-500/30 text-blue-500"
             onClick={async () => {
               const promise = fetch('/api/admin/broadcast-learning', { method: 'POST' });
               toast.promise(promise, {
                 loading: 'Sending broadcast...',
                 success: 'Personalized emails dispatched!',
                 error: 'Broadcast failed'
               });
             }}
           >
              <Zap className="h-4 w-4" />
              Manual Learning Pulse
           </Button>
           <Button 
             variant="outline" 
             onClick={generateTeamReport} 
             disabled={isAnalyzing}
             className="font-black uppercase tracking-widest text-[10px] gap-2 h-10 px-6 border-primary/30 text-primary hover:bg-primary hover:text-black transition-all"
           >
              {isAnalyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              Generate Team AI Audit
           </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Members', val: teamProfiles.length, icon: Users, color: 'text-primary' },
          { label: 'Group Morale', val: `${teamStats.avgMood.toFixed(1)}/10`, icon: Zap, color: 'text-orange-500' },
          { label: 'Total Activity', val: teamStats.totalSteps.toLocaleString(), icon: Activity, color: 'text-green-500' },
        ].map((s, i) => (
          <Card key={i} className="bg-card/40 border-border/50">
             <CardContent className="p-6 flex items-center justify-between">
                <div>
                   <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{s.label}</div>
                   <div className="text-3xl font-black italic">{s.val}</div>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-20`} />
             </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
        {/* User Sidebar */}
        <div className="space-y-6">
           <Card className="bg-card/40 border-border/50">
              <CardHeader className="border-b border-border/50">
                 <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Team Directory
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                 <div className="space-y-1">
                    {teamProfiles.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedUserId(p.id)}
                        className={`w-full text-left p-4 rounded-lg flex items-center justify-between transition-all group ${selectedUserId === p.id ? 'bg-primary text-black' : 'hover:bg-white/5'}`}
                      >
                         <div className="min-w-0">
                            <div className="text-sm font-black uppercase tracking-tight truncate">{p.name || p.email}</div>
                            <div className={`text-[10px] font-bold truncate opacity-60 ${selectedUserId === p.id ? '' : 'text-muted-foreground'}`}>{p.email}</div>
                         </div>
                         <ArrowRight className={`h-4 w-4 transition-transform ${selectedUserId === p.id ? '' : 'group-hover:translate-x-1 opacity-0 group-hover:opacity-100'}`} />
                      </button>
                    ))}
                 </div>
              </CardContent>
           </Card>

           {teamAnalysis && (
              <Card className="bg-primary/5 border-primary/20">
                 <CardHeader>
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                       <Brain className="h-4 w-4 text-primary" />
                       Team AI Audit
                    </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="text-[11px] leading-relaxed text-foreground/90 italic font-medium whitespace-pre-wrap border-l-2 border-primary/30 pl-4">
                       {teamAnalysis}
                    </div>
                 </CardContent>
              </Card>
           )}
        </div>

        {/* User Intelligence Pane */}
        <div className="space-y-8">
           {selectedUserId ? (
              <>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Psychological Health Card */}
                    <Card className="bg-card/40 border-border/50">
                       <CardHeader>
                          <CardTitle className="text-xs font-black uppercase tracking-widest">Psychological Trajectory • {selectedProfile?.name}</CardTitle>
                       </CardHeader>
                       <CardContent>
                           <div className="h-[250px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={logs.slice(-7)}>
                                    <defs>
                                       <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                       </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis hide domain={[0, 10]} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', fontSize: '10px' }} />
                                    <Area type="monotone" dataKey="mood_score" stroke="var(--primary)" fillOpacity={1} fill="url(#colorMood)" strokeWidth={3} />
                                    <Area type="monotone" dataKey="energy_score" stroke="#3b82f6" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                                 </AreaChart>
                              </ResponsiveContainer>
                           </div>
                       </CardContent>
                    </Card>

                    {/* Discipline Stats */}
                    <Card className="bg-card/40 border-border/50">
                       <CardHeader>
                          <CardTitle className="text-xs font-black uppercase tracking-widest">Discipline Audit</CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-6">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-lg bg-background/40 border border-border/50">
                                 <div className="text-[9px] font-black text-muted-foreground uppercase mb-1">Total Rules</div>
                                 <div className="text-2xl font-black">{rules.length}</div>
                              </div>
                              <div className="p-4 rounded-lg bg-background/40 border border-border/50">
                                 <div className="text-[9px] font-black text-muted-foreground uppercase mb-1">Violations</div>
                                 <div className="text-2xl font-black text-destructive">{violations.filter(v => !v.was_followed).length}</div>
                              </div>
                           </div>
                           <div className="space-y-2">
                              {rules.slice(0, 3).map(r => (
                                <div key={r.id} className="flex justify-between items-center text-[10px] font-bold border-b border-border/20 pb-2 italic">
                                   <span className="truncate max-w-[200px]">{r.title}</span>
                                   <Badge variant="outline" className="text-[8px] uppercase">{r.category}</Badge>
                                </div>
                              ))}
                           </div>
                       </CardContent>
                    </Card>
                 </div>

                 {/* Market Sentiment Audit */}
                 <Card className="bg-card/40 border-border/50">
                    <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
                       <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Active Market Biases
                       </CardTitle>
                       <Badge variant="outline">{watchlists.length} Focus Symbols</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                       <Table>
                          <thead className="bg-muted/30">
                             <tr>
                                <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Symbol</th>
                                <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Current Bias</th>
                                <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Recent Note</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-border/10">
                             {watchlists.map(w => {
                                const latestLog = watchlistLogs
                                  .filter(l => l.watchlist_item_id === w.id)
                                  .sort((a, b) => b.date.localeCompare(a.date))[0];
                                return (
                                   <tr key={w.id} className="hover:bg-white/5 transition-colors">
                                      <td className="px-6 py-4 font-black italic text-sm">{w.symbol}</td>
                                      <td className="px-6 py-4">
                                         <Badge variant={w.bias === 'bullish' ? 'default' : w.bias === 'bearish' ? 'destructive' : 'outline'} className="uppercase">
                                            {w.bias}
                                         </Badge>
                                      </td>
                                      <td className="px-6 py-4 text-[10px] text-muted-foreground italic max-w-xs truncate">
                                         {latestLog?.note || 'No recent notes recorded.'}
                                      </td>
                                   </tr>
                                );
                             })}
                             {watchlists.length === 0 && (
                                <tr>
                                   <td colSpan={3} className="px-6 py-10 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50 italic">
                                      No active watchlist for this user.
                                   </td>
                                </tr>
                             )}
                          </tbody>
                       </Table>
                    </CardContent>
                 </Card>

                 {/* Detailed Daily Logs Feed */}
                 <Card className="bg-card/40 border-border/50">
                    <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
                       <CardTitle className="text-xs font-black uppercase tracking-widest">Raw Execution History</CardTitle>
                       <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <Table>
                       <thead className="bg-muted/30">
                          <tr>
                             <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground font-serif italic">Date</th>
                             <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground font-serif italic">Mood</th>
                             <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground font-serif italic">Energy</th>
                             <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground font-serif italic">Achievements Summary</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border/20">
                          {logs.sort((a,b) => b.date.localeCompare(a.date)).map(l => (
                            <tr key={l.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                               <td className="px-6 py-4 text-[11px] font-mono whitespace-nowrap">{format(new Date(l.date), 'yyyy-MM-dd')}</td>
                               <td className="px-6 py-4">
                                  <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black inline-block">{l.mood_score}/10</div>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-black inline-block">{l.energy_score}/10</div>
                               </td>
                               <td className="px-6 py-4 text-[11px] font-medium text-muted-foreground max-w-sm truncate group-hover:text-foreground transition-colors italic">
                                  {parseAchievementsSummary(l.achievements)}
                               </td>
                             </tr>
                           ))}
                        </tbody>
                     </Table>
                  </Card>
               </>
            ) : (
               <div className="h-[500px] flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-border/50 rounded-2xl opacity-50">
                  <LayoutGrid className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                     <p className="text-xs font-black uppercase tracking-widest">No Intelligence Unit Selected</p>
                     <p className="text-[10px] font-medium text-muted-foreground">Select a team member from the directory to start execution audit.</p>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}

function parseAchievementsSummary(json: string) {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return 'N/A';
    return arr.map((a: any) => a.text).join(', ').slice(0, 100) + (arr.length > 3 ? '...' : '');
  } catch {
    return json?.slice(0, 100) || 'N/A';
  }
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: 'default' | 'outline' | 'destructive' }) {
   const variants = {
      default: 'bg-primary text-black',
      outline: 'border border-border/50 text-muted-foreground',
      destructive: 'bg-destructive text-destructive-foreground'
   };
   return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

function Table({ children }: { children: React.ReactNode }) {
   return (
      <div className="overflow-x-auto w-full">
         <table className="w-full border-collapse">
            {children}
         </table>
      </div>
   );
}
