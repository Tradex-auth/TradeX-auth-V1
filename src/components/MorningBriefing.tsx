import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays } from 'date-fns';
import { Brain, Sparkles, RefreshCw, AlertCircle, Quote } from 'lucide-react';
import { supabase, MorningBriefing as MorningBriefingType } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateMorningBriefing } from '@/lib/ai-service';

export function MorningBriefing() {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState<MorningBriefingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefingCost, setBriefingCost] = useState('0.00');
  const [provider, setProvider] = useState('AI');

  useEffect(() => {
    if (user) fetchBriefing();
  }, [user]);

  async function fetchBriefing() {
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      const { data } = await supabase
        .from('morning_briefings')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', today)
        .single();
      
      if (data) {
        setBriefing(data);
      } else {
        // Auto-generate if before 12 PM IST
        const now = new Date();
        const istHour = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"})).getHours();
        if (istHour < 12) {
          handleGenerate();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!user || isGenerating) return;

    setIsGenerating(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    try {
      // Gather data
      const { data: yestLog } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', yesterday)
        .single();

      const { data: violations } = await supabase
        .from('rule_violations')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', yesterday)
        .eq('was_followed', false);

      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .gte('target_date', today);

      const res = await generateMorningBriefing({
        yesterday: yestLog,
        violationsCount: violations?.length || 0,
        goals: goals || []
      });

      const { data: newBriefing, error } = await supabase
        .from('morning_briefings')
        .upsert({
          user_id: user.id,
          date: today,
          content: res.text
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;
      setBriefing(newBriefing);
      setBriefingCost(res.cost);
      setProvider(res.provider);
      toast.success(`Morning briefing updated via ${res.provider}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate briefing');
    } finally {
      setIsGenerating(false);
    }
  }

  if (loading && !briefing) return null;

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-background to-background border-primary/20 overflow-hidden relative group">
       <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
          <Brain className="h-24 w-24" />
       </div>
       <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
             <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
                   <Sparkles className="h-3 w-3" />
                   TradeX: Real-Talk Morning Briefing
                   {briefingCost !== '0.00' && <span className="ml-2 text-[8px] opacity-70 font-mono">Est: ${briefingCost}</span>}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                   {format(new Date(), 'EEEE, MMMM do')}
                </div>
             </div>
          </div>
          
          <div className="relative">
             <Quote className="h-8 w-8 text-primary/10 absolute -top-2 -left-2" />
             {isGenerating ? (
                <div className="space-y-2 py-4">
                   <div className="h-3 w-full bg-muted animate-pulse rounded" />
                   <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                   <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                </div>
             ) : briefing ? (
                <p className="text-sm leading-relaxed text-foreground/90 font-medium italic pl-4 border-l-2 border-primary/30">
                   {briefing.content}
                </p>
             ) : (
                <div className="py-6 text-center space-y-3 border-l-2 border-primary/10 pl-4">
                   <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto opacity-20" />
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Briefing Scheduled for 12:01 AM</p>
                </div>
             )}
          </div>
       </CardContent>
    </Card>
  );
}
