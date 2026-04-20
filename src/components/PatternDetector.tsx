import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brain, Ghost, Lightbulb, Zap, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase, AIPatternInsight } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { detectPatterns } from '@/lib/ai-service';

export default function PatternDetector() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AIPatternInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisCost, setAnalysisCost] = useState('0.00');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchInsights();
  }, [user]);

  async function fetchInsights() {
    try {
      const { data } = await supabase
        .from('ai_pattern_insights')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      setInsights(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunAnalysis() {
    if (!user || isAnalyzing) return;
    
    setIsAnalyzing(true);
    toast.info('Scanning the last 30 days of data for patterns...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateStr);

      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateStr);

      const simplifiedLogs = logs?.map(l => ({ 
        date: l.date, 
        mood: l.mood_score, 
        energy: l.energy_score, 
        note: l.gratitude_note,
        mindset: l.mindset_note 
      }));
      const simplifiedTrades = trades?.map(t => ({ date: t.date, pnl: t.pnl, setup: t.setup_type }));

      const res = await detectPatterns(simplifiedLogs || [], simplifiedTrades || []);
      
      if (res.data && Array.isArray(res.data)) {
        const { data, error } = await supabase
          .from('ai_pattern_insights')
          .insert(res.data.map(p => ({
            user_id: user.id,
            ...p
          })))
          .select();
        
        if (error) throw error;
        setInsights([...(data || []), ...insights]);
        setAnalysisCost(res.cost);
        toast.success(`New patterns detected via ${res.provider}!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Pattern detection failed.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <Zap className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Ghost className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          AI Pattern Detector
        </h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRunAnalysis} 
          disabled={isAnalyzing}
          className="border-primary text-primary hover:bg-primary/10 gap-2 font-bold uppercase tracking-widest text-[9px] h-8"
        >
          {isAnalyzing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Scan for Patterns
          {analysisCost !== '0.00' && <span className="ml-1 text-[8px] opacity-70 font-mono">${analysisCost}</span>}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.slice(0, 6).map((insight, i) => (
          <Card key={insight.id} className="bg-card/50 border-border/50 hover:border-primary/20 transition-all">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-1">
                 {getTypeIcon(insight.type)}
                 <Badge variant="outline" className="text-[8px] uppercase font-black">{insight.type}</Badge>
              </div>
              <CardTitle className="text-sm font-black uppercase tracking-tight">{insight.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">The Pattern</div>
                  <p className="text-xs font-semibold leading-relaxed">{insight.pattern}</p>
               </div>
               
               <div className="space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">The Trigger</div>
                  <p className="text-xs text-muted-foreground">{insight.trigger}</p>
               </div>

               <div className="pt-2 border-t border-border/20">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-1">
                     <Lightbulb className="h-3 w-3" />
                     Recommendation
                  </div>
                  <p className="text-xs italic text-foreground/80 leading-relaxed mb-4">
                    "{insight.recommendation}"
                  </p>
                  <Button variant="secondary" className="w-full text-[9px] font-bold uppercase tracking-tighter h-7 group">
                    Build Habit <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
               </div>
            </CardContent>
          </Card>
        ))}

        {insights.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-border/40 rounded-xl space-y-3">
             <Ghost className="h-10 w-10 text-muted-foreground mx-auto opacity-20" />
             <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.2em]">No patterns detected yet.</p>
             <p className="text-[10px] text-muted-foreground max-w-xs mx-auto italic">Keep logging data for 7+ days to allow the AI to find meaningful behavioral loops.</p>
          </div>
        )}
      </div>
    </div>
  );
}
