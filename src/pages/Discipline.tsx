import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, subMonths } from 'date-fns';
import { 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Brain,
  Trash2,
  Trophy,
  History,
  AlertOctagon,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import { supabase, TradingRule, RuleViolation } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";

import { useData } from '../contexts/DataContext';

const CATEGORIES = ['self', 'learning', 'routine', 'entry', 'exit', 'risk', 'mindset'];
const TRADING_CATEGORIES = ['entry', 'exit', 'risk'];

export default function Discipline() {
  const { user } = useAuth();
  const { rules, violations, loading, refreshRules, refreshViolations } = useData();
  const [newRule, setNewRule] = useState({ title: '', description: '', category: 'self' as any });
  const [editingRule, setEditingRule] = useState<TradingRule | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});

  const unlockDate = useMemo(() => {
    const d = new Date('2026-04-17T08:58:47'); // Mocking "today" from metadata
    d.setDate(d.getDate() + 30);
    return d;
  }, []);

  const daysToUnlock = useMemo(() => {
    const now = new Date();
    const diff = unlockDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [unlockDate]);

  async function handleAddRule() {
    if (!newRule.title || !user) return;
    try {
      if (editingRule) {
        const { error } = await supabase
          .from('trading_rules')
          .update({
            title: newRule.title,
            description: newRule.description,
            category: newRule.category
          })
          .eq('id', editingRule.id);
        if (error) throw error;
        toast.success('Rule updated');
      } else {
        const { error } = await supabase
          .from('trading_rules')
          .insert({ user_id: user.id, ...newRule });
        
        if (error) throw error;
        toast.success('Rule added');
      }
      
      setNewRule({ title: '', description: '', category: 'self' });
      setEditingRule(null);
      setIsRuleDialogOpen(false);
      refreshRules();
    } catch (err) {
      toast.error(editingRule ? 'Failed to update rule' : 'Failed to add rule');
    }
  }

  function openEditRule(rule: TradingRule) {
    setEditingRule(rule);
    setNewRule({
      title: rule.title,
      description: rule.description || '',
      category: rule.category as any
    });
    setIsRuleDialogOpen(true);
  }

  async function handleToggleRule(ruleId: string) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = violations.find(v => v.rule_id === ruleId && v.date === today);
    
    try {
      if (existing) {
        // Toggle
        const { error } = await supabase
          .from('rule_violations')
          .update({ was_followed: !existing.was_followed })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('rule_violations')
          .insert({
            user_id: user?.id,
            rule_id: ruleId,
            date: today,
            was_followed: true
          });
        if (error) throw error;
      }
      refreshViolations();
      toast.success('Discipline logged');
    } catch (err) {
      toast.error('Log failed');
    }
  }

  async function handleRuleAnalysis(rule: TradingRule) {
    if (!process.env.GEMINI_API_KEY) return;
    
    toast.info(`Gemini is analyzing violations for: ${rule.title}`);
    try {
      const ruleViolations = violations.filter(v => v.rule_id === rule.id && !v.was_followed);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        As a trading psychologist, analyze why I keep breaking this rule: "${rule.title}" (${rule.description}).
        Recent violation dates: ${ruleViolations.map(v => v.date).join(', ')}.
        
        Provide a behavioral analysis and 3 specific actionable fixes to stop this violation loop. (Max 150 words)
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAiAnalysis(prev => ({ ...prev, [rule.id]: result.text || '' }));
      toast.success('Analysis complete');
    } catch (err) {
      toast.error('AI analysis failed');
    }
  }

  // Heatmap Data
  const heatmapData = useMemo(() => {
    const today = new Date();
    const interval = eachDayOfInterval({
      start: subMonths(startOfMonth(today), 2),
      end: today
    });

    return interval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayViolations = violations.filter(v => v.date === dateStr);
      if (dayViolations.length === 0) return { date: dateStr, score: -1 }; // No data
      const followed = dayViolations.filter(v => v.was_followed).length;
      const score = followed / dayViolations.length;
      return { date: dateStr, score };
    });
  }, [violations]);

  const streak = useMemo(() => {
    let count = 0;
    const sortedDates = [...new Set(violations.map(v => v.date))].sort((a, b) => (b as string).localeCompare(a as string));
    
    for (const date of sortedDates) {
      const dayViolations = violations.filter(v => v.date === date);
      const hasViolation = dayViolations.some(v => !v.was_followed);
      if (hasViolation) break;
      count++;
    }
    return count;
  }, [violations]);

  const leaderboard = useMemo(() => {
    const counts: Record<string, { title: string, count: number }> = {};
    violations.filter(v => !v.was_followed).forEach(v => {
      const rule = rules.find(r => r.id === v.rule_id);
      if (rule) {
        counts[rule.id] = { title: rule.title, count: (counts[rule.id]?.count || 0) + 1 };
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [violations, rules]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Discipline Tracker
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Define your trading rules and track your adherence streak.</p>
        </div>
        
        <div className="flex items-center gap-4 px-6 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-primary/70">Discipline Streak</div>
            <div className="text-2xl font-black leading-none">{streak} Days</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card/50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest">
                    {editingRule ? 'Update Rule' : 'Setup Trading Rules'}
                  </CardTitle>
                  <CardDescription className="text-[10px]">Define the guardrails for your execution.</CardDescription>
                </div>
                {editingRule && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingRule(null);
                    setNewRule({ title: '', description: '', category: 'self' });
                  }} className="text-[9px] font-black uppercase">
                    Cancel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Rule Title</Label>
                <Input placeholder="E.g. Wake up at 6 AM" value={newRule.title} onChange={e => setNewRule({...newRule, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newRule.category} onValueChange={v => {
                  if (TRADING_CATEGORIES.includes(v as any) && daysToUnlock > 0) {
                    toast.error(`Trading rules unlocked in ${daysToUnlock} days.`);
                    return;
                  }
                  setNewRule({...newRule, category: v as any});
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => {
                      const isLocked = TRADING_CATEGORIES.includes(c) && daysToUnlock > 0;
                      return (
                        <SelectItem key={c} value={c} disabled={isLocked} className="uppercase font-bold text-xs flex items-center justify-between">
                          {c} {isLocked && "🔒"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="Detailed reasoning..." value={newRule.description} onChange={e => setNewRule({...newRule, description: e.target.value})} />
              </div>
              <Button onClick={handleAddRule} className="w-full font-bold uppercase tracking-widest text-xs h-10">
                {editingRule ? <FileCheck className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {editingRule ? 'Update Rule' : 'Add Rule'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20 overflow-hidden relative">
            {daysToUnlock > 0 && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                 <ShieldAlert className="h-8 w-8 text-muted-foreground mb-2" />
                 <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Trading Discipline Locked</h4>
                 <p className="text-[9px] text-muted-foreground font-bold leading-tight">Master self-discipline for 30 days first.</p>
                 <Badge variant="outline" className="mt-2 font-black text-[10px]">{daysToUnlock}D LEFT</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-destructive" />
                Violation Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
               {leaderboard.length === 0 ? (
                 <p className="text-[10px] text-muted-foreground italic">No violations yet. Perfect discipline!</p>
               ) : leaderboard.map((item, i) => (
                 <div key={i} className="flex justify-between items-center p-2 rounded bg-background/50 border border-border/50">
                   <span className="text-xs font-bold truncate max-w-[150px]">{item.title}</span>
                   <Badge variant="destructive" className="h-5 px-2 font-black leading-none">
                     {item.count}X
                   </Badge>
                 </div>
               ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Heatmap */}
          <Card className="bg-card/50">
             <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                   <History className="h-4 w-4" />
                   Monthly Discipline Heatmap
                </CardTitle>
             </CardHeader>
             <CardContent>
                <div className="flex flex-wrap gap-1 px-1">
                   {heatmapData.map((day, i) => {
                     const color = day.score === -1 ? 'bg-muted/30' : 
                                   day.score === 1 ? 'bg-primary' : 
                                   day.score > 0.5 ? 'bg-primary/60' : 
                                   day.score > 0 ? 'bg-primary/30' : 'bg-destructive/50';
                     return (
                        <div 
                          key={i} 
                          title={`${day.date}: ${day.score === -1 ? 'No task logged' : `${(day.score * 100).toFixed(0)}% adherence`}`}
                          className={`w-[12px] h-[12px] rounded-sm ${color} cursor-help transition-all hover:scale-125`} 
                        />
                     );
                   })}
                </div>
                <div className="flex justify-between mt-4 text-[8px] font-bold uppercase text-muted-foreground tracking-widest">
                   <span>{format(subMonths(new Date(), 2), 'MMMM')}</span>
                   <span>Last 90 Days Discipline</span>
                   <span>Today</span>
                </div>
             </CardContent>
          </Card>

          {/* Checklist */}
          <Card className="bg-card border-primary/20 shadow-xl shadow-primary/5">
             <CardHeader className="bg-muted/10">
                <div className="flex justify-between items-center">
                   <div>
                      <CardTitle className="text-base font-black uppercase tracking-tight">Today's Discipline Checklist</CardTitle>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do')}</p>
                   </div>
                   <FileCheck className="h-6 w-6 text-primary" />
                </div>
             </CardHeader>
             <CardContent className="divide-y divide-border/40">
                {rules.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground italic text-xs">Define your rules on the left to start tracking.</div>
                ) : rules.map((rule) => {
                  const todayViolation = violations.find(v => v.rule_id === rule.id && v.date === format(new Date(), 'yyyy-MM-dd'));
                  const isFollowed = todayViolation?.was_followed || false;
                  
                  return (
                    <div key={rule.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                      <div className="flex items-start gap-4">
                        <Checkbox 
                          id={rule.id} 
                          checked={isFollowed} 
                          onCheckedChange={() => handleToggleRule(rule.id)}
                          className="mt-1 h-5 w-5"
                        />
                        <div>
                          <Label htmlFor={rule.id} className="text-sm font-bold uppercase cursor-pointer hover:text-primary transition-colors">
                            {rule.title}
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{rule.description}</p>
                          <Badge variant="outline" className="mt-2 text-[9px] uppercase font-black bg-muted/30">
                            {rule.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                           onClick={() => openEditRule(rule)}
                         >
                            <ChevronRight className="h-4 w-4" />
                         </Button>
                         {aiAnalysis[rule.id] ? (
                           <div className="max-w-[300px] p-3 rounded-lg bg-primary/5 border border-primary/10 animate-in fade-in duration-500">
                             <p className="text-[10px] italic leading-relaxed text-muted-foreground">
                               {aiAnalysis[rule.id]}
                             </p>
                           </div>
                         ) : (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="text-[10px] font-bold uppercase tracking-widest gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                             onClick={() => handleRuleAnalysis(rule)}
                           >
                             <Brain className="h-3 w-3" />
                             Analyze Loop
                           </Button>
                         )}
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={async () => {
                           if(confirm('Delete rule?')) {
                             await supabase.from('trading_rules').delete().eq('id', rule.id);
                             refreshRules();
                           }
                         }}>
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                  );
                })}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
