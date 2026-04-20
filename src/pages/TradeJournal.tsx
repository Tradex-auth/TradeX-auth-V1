import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks, isSameDay, startOfDay } from 'date-fns';
import { 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  Trash2, 
  ExternalLink,
  Brain,
  ChevronDown,
  ArrowUpDown,
  BarChart2
} from 'lucide-react';
import { supabase, Trade } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

import { useData } from '../contexts/DataContext';

const SETUP_TYPES = ['Breakout', 'Pullback', 'Reversal', 'Other'];

export default function TradeJournal() {
  const { user } = useAuth();
  const { trades, rules, loading, refreshTrades, refreshViolations } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [riskPercent, setRiskPercent] = useState(1); // Default 1% risk for R-multiple calc
  const [followedRuleIds, setFollowedRuleIds] = useState<Set<string>>(new Set());

  // Form State
  const [formData, setFormData] = useState({
    symbol: '',
    direction: 'long' as 'long' | 'short',
    entry_price: '',
    exit_price: '',
    quantity: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    setup_type: 'Breakout',
    screenshot_url: '',
    notes: ''
  });

  // Toggle rule
  const toggleRule = (id: string) => {
    const next = new Set(followedRuleIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFollowedRuleIds(next);
  };

  // Table State
  const [sortField, setSortField] = useState<keyof Trade>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterType, setFilterType] = useState('all');

  async function handleSaveTrade() {
    if (!user) return;
    
    // Check if at least one rule status is confirmed
    if (rules.length > 0 && followedRuleIds.size === 0) {
       // Optional: could warn, but user said "tick ONLY the ones we followed"
       // I'll allow it, but maybe verify if they really didn't follow ANY rule
    }

    const entry = parseFloat(formData.entry_price);
    const exit = parseFloat(formData.exit_price);
    const qty = parseFloat(formData.quantity);
    
    if (isNaN(entry) || isNaN(exit) || isNaN(qty)) {
      toast.error('Please enter valid numbers');
      return;
    }

    const pnl = formData.direction === 'long' 
      ? (exit - entry) * qty 
      : (entry - exit) * qty;
    
    // R-multiple = PnL / Initial Risk
    // Simplistic risk calc: entry - (entry * 0.99) for 1% stop loss simulation if stop not provided
    const riskAmount = (entry * (riskPercent / 100)) * qty;
    const rMultiple = pnl / riskAmount;

    try {
      // 1. Save Trade
      const { error: tradeError } = await supabase.from('trades').insert({
        user_id: user.id,
        symbol: formData.symbol.toUpperCase(),
        direction: formData.direction,
        entry_price: entry,
        exit_price: exit,
        quantity: qty,
        date: formData.date,
        setup_type: formData.setup_type,
        screenshot_url: formData.screenshot_url,
        notes: formData.notes,
        pnl: pnl,
        r_multiple: rMultiple,
        is_win: pnl > 0
      });

      if (tradeError) throw tradeError;

      // 2. Save Rule Tracking (Upsert for the day)
      if (rules.length > 0) {
        const violationsData = rules.map(rule => ({
          user_id: user.id,
          rule_id: rule.id,
          date: formData.date,
          was_followed: followedRuleIds.has(rule.id)
        }));

        const { error: ruleError } = await supabase
          .from('rule_violations')
          .upsert(violationsData, { onConflict: 'user_id, rule_id, date' });
        
        if (ruleError) {
          console.error('Rule tracking error:', ruleError);
          toast.warning('Trade saved, but rule tracking failed');
        }
      }
      
      toast.success('Trade and rules logged successfully');
      setIsDialogOpen(false);
      setFollowedRuleIds(new Set());
      setFormData({
        symbol: '',
        direction: 'long',
        entry_price: '',
        exit_price: '',
        quantity: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        setup_type: 'Breakout',
        screenshot_url: '',
        notes: ''
      });
      refreshTrades();
      refreshViolations();
    } catch (err) {
      console.error('Save trade error:', err);
      toast.error('Failed to save trade');
    }
  }

  async function handleDeleteTrade(id: string) {
    if (!confirm('Are you sure you want to delete this trade?')) return;
    try {
      const { error } = await supabase.from('trades').delete().eq('id', id);
      if (error) throw error;
      toast.success('Trade deleted');
      refreshTrades();
    } catch (err) {
      console.error('Delete trade error:', err);
      toast.error('Failed to delete trade');
    }
  }

  async function handleAIReview(trade: Trade) {
    if (!process.env.GEMINI_API_KEY) {
      toast.error('Gemini API key is missing');
      return;
    }

    toast.info('Gemini is analyzing your trade...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        You are an expert trading mentor. Critique this trade and provide a setup quality score (1-10).
        
        Trade Details:
        - Symbol: ${trade.symbol}
        - Direction: ${trade.direction}
        - Setup: ${trade.setup_type}
        - Entry: ${trade.entry_price}
        - Exit: ${trade.exit_price}
        - PnL: $${trade.pnl.toFixed(2)} (${trade.is_win ? 'Win' : 'Loss'})
        - Notes: ${trade.notes || 'None provided'}
        
        Format your response exactly like this:
        - Critique: [2-3 sentences max]
        - Score: [Number 1-10]
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // Use flash for speed
        contents: prompt,
      });

      const responseText = result.text || '';
      const scoreMatch = responseText.match(/Score:\s*(\d+)/i);
      const critiqueMatch = responseText.match(/Critique:\s*(.*)/i);
      
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
      const critique = critiqueMatch ? critiqueMatch[1].trim() : responseText;

      const { error } = await supabase
        .from('trades')
        .update({ 
          ai_critique: critique,
          setup_quality_score: score 
        })
        .eq('id', trade.id);

      if (error) throw error;
      refreshTrades();
      toast.success('AI Review added!');
    } catch (err) {
      console.error('AI Review error:', err);
      toast.error('Failed to generate AI review');
    }
  }

  // Stats Calculations
  const stats = useMemo(() => {
    if (trades.length === 0) return null;
    
    const wins = trades.filter(t => t.is_win);
    const losses = trades.filter(t => !t.is_win);
    const winRate = (wins.length / trades.length) * 100;
    const avgR = trades.reduce((acc, t) => acc + t.r_multiple, 0) / trades.length;
    
    const pnlByDay: Record<string, number> = {};
    trades.forEach(t => {
      pnlByDay[t.date] = (pnlByDay[t.date] || 0) + t.pnl;
    });
    
    const dayEntries = Object.entries(pnlByDay);
    const bestDay = dayEntries.reduce((a, b) => a[1] > b[1] ? a : b);
    const worstDay = dayEntries.reduce((a, b) => a[1] < b[1] ? a : b);
    
    const totalProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;

    return { winRate, avgR, bestDay, worstDay, profitFactor, totalTrades: trades.length };
  }, [trades]);

  // Chart Data
  const chartData = useMemo(() => {
    const today = new Date();
    const last7Days = eachDayOfInterval({
      start: subWeeks(today, 1),
      end: today
    });

    return last7Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayPnL = trades
        .filter(t => t.date === dateStr)
        .reduce((sum, t) => sum + t.pnl, 0);
      return {
        date: format(date, 'MMM dd'),
        pnl: dayPnL
      };
    });
  }, [trades]);

  // Sorting & Filtering
  const filteredTrades = useMemo(() => {
    return trades
      .filter(t => {
        const symbolMatch = t.symbol.toLowerCase().includes(filterSymbol.toLowerCase());
        const typeMatch = filterType === 'all' || t.setup_type === filterType;
        return symbolMatch && typeMatch;
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? '';
        const valB = b[sortField] ?? '';
        if (sortOrder === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });
  }, [trades, filterSymbol, filterType, sortField, sortOrder]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Trade Journal
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Log your trades, track your P&L, and gain AI-driven insights.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="font-bold uppercase tracking-widest gap-2" />}>
            <Plus className="h-4 w-4" />
            Log New Trade
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="uppercase font-black">Record Trade Entry</DialogTitle>
              <DialogDescription>Enter the details of your latest execution.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input placeholder="BTC/USD" value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Select value={formData.direction} onValueChange={v => setFormData({...formData, direction: v as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Entry Price</Label>
                  <Input type="number" step="any" value={formData.entry_price} onChange={e => setFormData({...formData, entry_price: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Exit Price</Label>
                  <Input type="number" step="any" value={formData.exit_price} onChange={e => setFormData({...formData, exit_price: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" step="any" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Risk Configuration</span>
                    <span>{riskPercent}% Stop Loss</span>
                 </div>
                 <Input type="number" step="0.1" value={riskPercent} onChange={e => setRiskPercent(parseFloat(e.target.value))} className="h-8" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Setup Type</Label>
                  <Select value={formData.setup_type} onValueChange={v => setFormData({...formData, setup_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SETUP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Screenshot URL</Label>
                <Input placeholder="https://tradingview.com/..." value={formData.screenshot_url} onChange={e => setFormData({...formData, screenshot_url: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Execution Notes</Label>
                <Textarea placeholder="Why did you take this trade?" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>

              {rules.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Rules Followed Today</Label>
                    <Badge variant="outline" className="text-[9px] font-black">{followedRuleIds.size}/{rules.length}</Badge>
                  </div>
                  <div className="grid gap-3 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                    {rules.map(rule => (
                      <div key={rule.id} className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 transition-colors hover:bg-primary/10">
                        <Checkbox 
                          checked={followedRuleIds.has(rule.id)}
                          onCheckedChange={() => toggleRule(rule.id)}
                          className="mt-0.5"
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-bold leading-none">{rule.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{rule.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTrade} className="font-bold">Save Trade</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Trades', value: stats?.totalTrades || 0, icon: BarChart2 },
          { label: 'Win Rate', value: `${stats?.winRate?.toFixed(1) || 0}%`, icon: TrendingUp },
          { label: 'Avg R-Multiple', value: stats?.avgR?.toFixed(2) || 0, icon: Info },
          { label: 'Profit Factor', value: stats?.profitFactor?.toFixed(2) || 0, icon: ExternalLink },
          { label: 'Best Day', value: `$${stats?.bestDay?.[1]?.toFixed(2) || 0}`, icon: TrendingUp, color: 'text-green-500' },
          { label: 'Worst Day', value: `$${stats?.worstDay?.[1]?.toFixed(2) || 0}`, icon: TrendingDown, color: 'text-red-500' },
        ].map((stat, i) => (
          <Card key={i} className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
              </div>
              <div className={`text-xl font-black ${stat.color || ''}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* P&L Chart */}
        <Card className="lg:col-span-1 bg-card/50 border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Weekly P&L Sparkline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', fontSize: '12px' }}
                    formatter={(val: number) => [`$${val.toFixed(2)}`, 'PnL']}
                  />
                  <Area type="monotone" dataKey="pnl" stroke="var(--primary)" fillOpacity={1} fill="url(#colorPnl)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Filters & Log */}
        <Card className="lg:col-span-2 bg-card/50 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/30">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Trade Log</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input 
                  placeholder="Filter Symbol..." 
                  className="pl-7 h-8 text-xs w-[120px] bg-background/50" 
                  value={filterSymbol}
                  onChange={e => setFilterSymbol(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs w-[100px] bg-background/50 uppercase font-black">
                  <SelectValue placeholder="Setup" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {SETUP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest cursor-pointer" onClick={() => { setSortField('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Date {sortField === 'date' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest cursor-pointer" onClick={() => { setSortField('symbol'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Symbol {sortField === 'symbol' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Type</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right cursor-pointer" onClick={() => { setSortField('pnl'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  PnL {sortField === 'pnl' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-center">Score</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading logs...</TableCell></TableRow>
              ) : filteredTrades.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">No trades recorded yet</TableCell></TableRow>
              ) : filteredTrades.map((t) => (
                <TableRow key={t.id} className="group transition-colors hover:bg-muted/30">
                  <TableCell className="text-[11px] font-medium text-muted-foreground">{format(new Date(t.date), 'MMM dd, yy')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-black tracking-tight">{t.symbol}</span>
                      <Badge variant={t.direction === 'long' ? 'default' : 'destructive'} className="text-[9px] h-4 uppercase px-1">
                        {t.direction}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] uppercase font-bold text-muted-foreground">{t.setup_type}</TableCell>
                  <TableCell className={`text-right font-black ${t.is_win ? 'text-green-500' : 'text-red-500'}`}>
                    ${Math.abs(t.pnl).toFixed(2)}
                    <span className="block text-[9px] text-muted-foreground font-medium">R:{t.r_multiple.toFixed(1)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {t.setup_quality_score ? (
                      <Badge variant="outline" className="font-black text-primary border-primary/30">
                        {t.setup_quality_score}/10
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleAIReview(t)}>
                        <Brain className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTrade(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* AI Critique Drawer / Modal Placeholder */}
      {trades.some(t => t.ai_critique) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Latest AI Critiques
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trades.filter(t => t.ai_critique).slice(0, 4).map(t => (
              <div key={t.id} className="p-3 rounded-lg border bg-card/80 space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-xs uppercase">{t.symbol} • {t.setup_type}</span>
                  <Badge className="text-[10px] font-black">{t.setup_quality_score}/10</Badge>
                </div>
                <p className="text-[11px] leading-relaxed italic text-muted-foreground">"{t.ai_critique}"</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
