import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Brain,
  Search,
  RefreshCw,
  Clock,
  Trash2,
  LineChart as LineChartIcon,
  Pin,
  PinOff,
  Maximize2,
  ShieldCheck
} from 'lucide-react';
import { supabase, WatchlistItem, WatchlistLog } from '@/lib/supabase';
import { getEnv } from '@/lib/env-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { 
  generateMarketAnalysis, 
  generateMarketBriefing 
} from '@/lib/ai-service';
import axios from 'axios';

interface MarketItemCardProps {
  item: WatchlistItem;
  todayLog: WatchlistLog | undefined;
  logs: WatchlistLog[];
  isPinned: boolean;
  isChartActive: boolean;
  isUpdatingIndividual: boolean;
  onTogglePin: (symbol: string) => void;
  onToggleChart: (symbol: string) => void;
  onUpdateBias: (id: string, bias: 'bullish' | 'neutral' | 'bearish') => Promise<void>;
  onAddNote: (id: string, note: string) => Promise<void>;
  onAnalyze: (item: WatchlistItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  getTVSymbol: (symbol: string) => string;
}

const MarketItemCard: React.FC<MarketItemCardProps> = ({ 
  item, todayLog, logs, isPinned, isChartActive, isUpdatingIndividual,
  onTogglePin, onToggleChart, onUpdateBias, onAddNote, onAnalyze, onDelete, getTVSymbol 
}) => {
  
  const getSparklineData = (itemId: string) => {
    const itemLogs = logs.filter(l => l.watchlist_item_id === itemId).slice(-7);
    if (itemLogs.length > 3) {
      return itemLogs.map(l => ({ val: l.bias === 'bullish' ? 1 : l.bias === 'bearish' ? -1 : 0 }));
    }
    return Array.from({ length: 7 }, () => ({ val: Math.random() * 2 - 1 }));
  };

  return (
    <Card className="bg-card/40 border-border/50 hover:border-primary/20 transition-all group relative overflow-hidden backdrop-blur-sm">
      {isPinned && <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 flex items-center justify-center rounded-bl-lg"><Pin className="h-3 w-3 text-primary fill-current" /></div>}
      <CardContent className="p-0 space-y-0">
        <div className="p-6 pb-2 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black tracking-tighter">{item.symbol}</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" onClick={() => onTogglePin(item.symbol)}>
                  {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </Button>
              </div>
              
              <div className="h-[60px] w-full mt-2 -ml-1 overflow-hidden rounded-md border border-border/30">
                <iframe
                  src={`https://s.tradingview.com/embed-widget/single-ticker/?locale=en&symbol=${getTVSymbol(item.symbol)}&theme=dark`}
                  style={{ width: '120%', height: '100%', border: 'none', marginLeft: '-10%' }}
                  title={`TV Ticker for ${item.symbol}`}
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            
            <div className="h-12 w-24">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getSparklineData(item.id)}>
                     <YAxis hide domain={[-1, 1]} />
                     <Line 
                        type="monotone" 
                        dataKey="val" 
                        stroke={item.bias === 'bullish' ? '#22c55e' : item.bias === 'bearish' ? '#ef4444' : '#64748b'} 
                        strokeWidth={2} 
                        dot={false} 
                      />
                  </LineChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Personal Bias</span>
              <Badge variant="outline" className={`h-4 text-[8px] uppercase ${
                item.bias === 'bullish' ? 'border-green-500 text-green-500' : 
                item.bias === 'bearish' ? 'border-red-500 text-red-500' : ''
              }`}>
                {item.bias}
              </Badge>
            </div>
            
            <div className="flex gap-1">
              {[
                { val: 'bullish', icon: TrendingUp, color: 'hover:bg-green-500/20 hover:text-green-500' },
                { val: 'neutral', icon: Minus, color: 'hover:bg-slate-500/20 hover:text-slate-500' },
                { val: 'bearish', icon: TrendingDown, color: 'hover:bg-red-500/20 hover:text-red-500' },
              ].map((b) => (
                <Button
                  key={b.val}
                  variant={item.bias === b.val ? 'default' : 'secondary'}
                  size="sm"
                  className={`flex-1 h-8 ${item.bias !== b.val ? b.color : ''}`}
                  onClick={() => onUpdateBias(item.id, b.val as any)}
                >
                  <b.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today's Sentiment Note</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={isUpdatingIndividual}
                className="h-5 text-[8px] gap-1 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => onAnalyze(item)}
              >
                {isUpdatingIndividual ? <RefreshCw className="h-2 w-2 animate-spin" /> : <Brain className="h-2 w-2" />}
                AI Analyze
              </Button>
            </div>
            <Textarea 
               placeholder="Why this bias today?" 
               className="text-xs min-h-[60px] bg-background/50 border-border/50 resize-none font-medium"
               defaultValue={todayLog?.note || ''}
               onBlur={(e) => {
                 if (e.target.value !== (todayLog?.note || '')) {
                   onAddNote(item.id, e.target.value);
                 }
               }}
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex gap-2">
              <Button 
                variant={isChartActive ? "secondary" : "default"}
                size="sm" 
                onClick={() => onToggleChart(item.symbol)}
                className="flex-1 font-black tracking-widest uppercase gap-2 py-5 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-95"
              >
                {isChartActive ? <LineChartIcon className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {isChartActive ? 'Collapse' : 'Chart'}
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => window.open(`/market/chart/${item.symbol}`, '_blank')}
                className="font-black tracking-widest uppercase gap-2 py-5 border-primary/50 hover:bg-primary/10 transition-all hover:scale-[1.02] active:scale-95"
                title="Open Full Screen Pro Chart"
              >
                Open Pro
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                <Clock className="h-3 w-3" />
                Updated: {todayLog ? format(new Date(todayLog.created_at), 'HH:mm') : 'None'}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-50 hover:opacity-100 transition-opacity" onClick={() => onDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {isChartActive && (
          <div className="p-4 pt-0 animate-in zoom-in-95 duration-300">
            <div className="aspect-[16/10] w-full rounded-lg overflow-hidden border border-primary/20 bg-black shadow-2xl">
              <iframe
                src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_7623a&symbol=${getTVSymbol(item.symbol)}&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&theme=dark&style=1&timezone=exchange&withdateranges=1&showpopupbutton=1&popupwidth=1000&popupheight=650&locale=en`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={`TradingView Chart for ${item.symbol}`}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mt-2 text-[9px] text-primary font-black uppercase tracking-widest text-center">
              ✨ Live TradingView Analysis Active
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MarketWatch() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [logs, setLogs] = useState<WatchlistLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [hasAttemptedSeed, setHasAttemptedSeed] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [isUpdatingIndividual, setIsUpdatingIndividual] = useState<string | null>(null);
  const [marketBriefing, setMarketBriefing] = useState<string | null>(null);
  const [briefingCost, setBriefingCost] = useState('0.00');
  const [analysisCosts, setAnalysisCosts] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCharts, setActiveCharts] = useState<string[]>([]);
  const [pinnedSymbols, setPinnedSymbols] = useState<string[]>([]);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);

  useEffect(() => {
    const supabaseUrl = getEnv('VITE_SUPABASE_URL');
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      setIsSupabaseConfigured(false);
    }
  }, []);

  // Default charts to expand on load
  useEffect(() => {
    if (items.length > 0 && activeCharts.length === 0) {
      const topSymbols = items.slice(0, 1).map(i => i.symbol);
      setActiveCharts(topSymbols);
    }
  }, [items.length]);

  const POPULAR_SYMBOLS = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'AMD', 'MSFT', 'META', 'GOOGL', 'BTCUSD', 'XAUUSD', 'GC=F'];
  
  const SYMBOL_MAP = {
    'BTC': { tv: 'BINANCE:BTCUSDT' },
    'BTCUSD': { tv: 'BINANCE:BTCUSDT' },
    'XAU': { tv: 'OANDA:XAUUSD' },
    'XAUUSD': { tv: 'OANDA:XAUUSD' },
    'XAUUUSD': { tv: 'OANDA:XAUUSD' },
    'GOLD': { tv: 'COMEX:GC1!' },
    'SPX': { tv: 'SP:SPX' },
    'NDX': { tv: 'NASDAQ:NDX' },
    'DXY': { tv: 'CAPITALCOM:DXY' },
  };

  const getTVSymbol = (symbol: string) => {
    const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return SYMBOL_MAP[s as keyof typeof SYMBOL_MAP]?.tv || s;
  };

  useEffect(() => {
    const savedPins = localStorage.getItem('tradex_pinned_symbols');
    if (savedPins) setPinnedSymbols(JSON.parse(savedPins));
  }, []);

  const togglePin = (symbol: string) => {
    const newPins = pinnedSymbols.includes(symbol) 
      ? pinnedSymbols.filter(s => s !== symbol)
      : [...pinnedSymbols, symbol];
    setPinnedSymbols(newPins);
    localStorage.setItem('tradex_pinned_symbols', JSON.stringify(newPins));
    toast.success(pinnedSymbols.includes(symbol) ? `${symbol} unpinned` : `${symbol} pinned to top`);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Seeding default symbols for a better first-run experience
  useEffect(() => {
    if (user && !loading && !isInitialSync && items.length === 0 && !hasAttemptedSeed) {
      setHasAttemptedSeed(true);
      seedWatchlist();
    }
  }, [user, loading, isInitialSync, items.length, hasAttemptedSeed]);

  async function seedWatchlist() {
    const defaults = ['XAUUSD', 'BTCUSD'];
    try {
      console.log('Seeding default watchlist items...');
      const inserts = defaults.map(symbol => ({
        user_id: user?.id,
        symbol: symbol,
        bias: 'neutral'
      }));

      const { error } = await supabase
        .from('watchlists')
        .insert(inserts);
      
      if (error) {
        console.error('Seeding error:', error);
        toast.error('Failed to seed default market data');
      }
      
      await fetchData();
    } catch (err) {
      console.error('Seeding error exception:', err);
    }
  }

  async function fetchData() {
    if (!user) {
      setLoading(false);
      setIsInitialSync(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching market watch data for:', user.id);
      
      const { data: itemsData, error: itemsError } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      if (itemsData && itemsData.length > 0) {
        const { data: logsData, error: logsError } = await supabase
          .from('watchlist_logs')
          .select('*')
          .in('watchlist_item_id', itemsData.map(i => i.id))
          .order('date', { ascending: true });

        if (logsError) throw logsError;
        setLogs(logsData || []);
      } else {
        setLogs([]);
      }

      setItems(itemsData || []);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Could not load market data');
    } finally {
      setLoading(false);
      setIsInitialSync(false);
    }
  }

  async function handleIndividualAIReport(item: WatchlistItem) {
    setIsUpdatingIndividual(item.symbol);
    try {
      const res = await generateMarketAnalysis(item.symbol, item.bias);
      const sentiment = res.text || 'Neutral outlook.';
      
      setAnalysisCosts(prev => ({ ...prev, [item.symbol]: res.cost }));
      await handleAddNote(item.id, sentiment);
      toast.success(`${item.symbol} sentiment updated via ${res.provider}!`);
    } catch (err) {
      console.error('AI individual error:', err);
      toast.error(`Failed to analyze ${item.symbol}`);
    } finally {
      setIsUpdatingIndividual(null);
    }
  }

   async function handleAddItem() {
    if (!newSymbol || !user) return;
    try {
      let symbol = newSymbol.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
      
      if (items.find(i => i.symbol === symbol)) {
        toast.error(`${symbol} already in watchlist`);
        return;
      }
      
      const { data, error } = await supabase
        .from('watchlists')
        .insert({
          user_id: user.id,
          symbol: symbol,
          bias: 'neutral'
        })
        .select()
        .single();
      
      if (error) throw error;
      setItems([...items, data]);
      setNewSymbol('');
      toast.success(`${data.symbol} added to watchlist`);
    } catch (err) {
      toast.error('Failed to add symbol');
    }
  }

  async function handleUpdateBias(id: string, bias: 'bullish' | 'neutral' | 'bearish') {
    try {
      const { error } = await supabase
        .from('watchlists')
        .update({ bias })
        .eq('id', id);
      
      if (error) throw error;
      setItems(items.map(item => item.id === id ? { ...item, bias } : item));
      
      // Also log today's bias
      const today = format(new Date(), 'yyyy-MM-dd');
      const existingTodayLog = logs.find(l => l.watchlist_item_id === id && l.date === today);
      
      const { data: newLog, error: logError } = await supabase
        .from('watchlist_logs')
        .upsert({
          watchlist_item_id: id,
          date: today,
          bias: bias,
          note: existingTodayLog?.note || null
        }, { onConflict: 'watchlist_item_id,date' })
        .select()
        .single();
      
      if (logError) console.error('Log error:', logError);
      if (newLog) {
        setLogs(prev => {
          const filtered = prev.filter(l => !(l.watchlist_item_id === id && l.date === today));
          return [...filtered, newLog];
        });
      }
      
      toast.success('Bias updated');
    } catch (err) {
      toast.error('Failed to update bias');
    }
  }

  async function handleAddNote(id: string, note: string) {
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      const item = items.find(i => i.id === id);
      if (!item) return;

      const existingTodayLog = logs.find(l => l.watchlist_item_id === id && l.date === today);

      const { data: newLog, error } = await supabase
        .from('watchlist_logs')
        .upsert({
          watchlist_item_id: id,
          date: today,
          bias: item.bias,
          note: note
        }, { onConflict: 'watchlist_item_id,date' })
        .select()
        .single();
      
      if (error) throw error;
      
      if (newLog) {
        setLogs(prev => {
          const filtered = prev.filter(l => !(l.watchlist_item_id === id && l.date === today));
          return [...filtered, newLog];
        });
      }
      
      toast.success('Note saved');
    } catch (err) {
      toast.error('Failed to save note');
    }
  }

  async function handleAIReport() {
    setIsBriefingLoading(true);
    try {
      const marketData = items.map(item => {
        const todayLog = logs.find(l => l.watchlist_item_id === item.id && l.date === format(new Date(), 'yyyy-MM-dd'));
        return `- ${item.symbol}: ${item.bias} Bias. Today's Note: ${todayLog?.note || 'None'}`;
      }).join('\n');

      const res = await generateMarketBriefing(marketData);
      setMarketBriefing(res.text || 'Failed to generate briefing.');
      setBriefingCost(res.cost);
      toast.success(`AI Market Briefing ready via ${res.provider}!`);
    } catch (err) {
      console.error('AI error:', err);
      toast.error('Failed to generate AI report');
    } finally {
      setIsBriefingLoading(false);
    }
  }

  async function handleDeleteItem(id: string) {
    try {
      await supabase.from('watchlists').delete().eq('id', id);
      setItems(items.filter(i => i.id !== id));
      toast.success('Item removed');
    } catch (err) {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                <LineChartIcon className="h-8 w-8 text-primary" />
                Watchlist & Sentiment
              </h1>
              <p className="text-muted-foreground text-sm font-medium">Track your focus symbols and record your market bias.</p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button variant="ghost" size="icon" onClick={fetchData} className="h-10 w-10 text-muted-foreground hover:text-primary shrink-0" title="Refresh Data">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Select onValueChange={(val) => setNewSymbol(val)}>
                <SelectTrigger className="w-[180px] font-bold uppercase tracking-wide">
                  <SelectValue placeholder="Top Assets" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Forex</div>
                  {['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2 border-t border-border/50">Crypto</div>
                  {['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'DOTUSD', 'DOGEUSD', 'MATICUSD', 'LINKUSD', 'BNBUSD'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2 border-t border-border/50">Commodities & Indices</div>
                  {['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'NGAS', 'COPPER', 'SPX', 'NDX', 'DXY', 'NVDA', 'TSLA'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="relative flex-1 md:w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-9 font-bold uppercase transition-all focus:ring-2 focus:ring-primary/50" 
              value={newSymbol}
              onChange={e => {
                const val = e.target.value.toUpperCase();
                setNewSymbol(val);
                if (val.length > 0) {
                  setSuggestions(POPULAR_SYMBOLS.filter(s => s.includes(val)));
                  setShowSuggestions(true);
                } else {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => { if (newSymbol.length > 0) setShowSuggestions(true); }}
              onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddItem();
                  setShowSuggestions(false);
                }
              }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-1.5 bg-muted/50 text-[9px] font-black uppercase tracking-widest border-b border-border/50 text-muted-foreground">Market Suggestions</div>
                {suggestions.map(s => (
                  <button 
                    key={s} 
                    className="w-full text-left px-4 py-2 text-xs font-bold uppercase hover:bg-primary/10 transition-colors border-b border-border/50 last:border-0"
                    onClick={() => {
                      setNewSymbol(s);
                      setShowSuggestions(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleAddItem} className="font-bold">Add</Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={handleAIReport} 
          disabled={isBriefingLoading || items.length === 0}
          className="border-primary text-primary hover:bg-primary/10 gap-2 font-bold uppercase tracking-widest text-xs h-10"
        >
          {isBriefingLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
          AI Market Briefing
          {briefingCost !== '0.00' && <span className="ml-1 text-[8px] opacity-70 font-mono">${briefingCost}</span>}
        </Button>
      </div>

      {!isSupabaseConfigured && (
        <Card className="bg-destructive/5 border-destructive/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-destructive flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Supabase Configuration Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] font-medium text-muted-foreground">
              Your Supabase credentials are not configured. Market watch data storage and profile sync will not work. 
              Please add <code className="bg-muted px-1 rounded text-primary">VITE_SUPABASE_URL</code> and 
              <code className="bg-muted px-1 rounded text-primary">VITE_SUPABASE_ANON_KEY</code> to your project secrets.
            </p>
          </CardContent>
        </Card>
      )}

      {marketBriefing && (
        <Card className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
              <Brain className="h-4 w-4" />
              150-Word AI Market Outlook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90 italic">
              {marketBriefing}
            </p>
          </CardContent>
        </Card>
      )}

      {loading && isInitialSync ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <RefreshCw className="h-10 w-10 text-primary animate-spin" />
           <div className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Initializing Market Data...</div>
        </div>
      ) : (
        <>
          {pinnedSymbols.length > 0 && (
             <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-1">
                   <Pin className="h-3 w-3 fill-current" />
                   Pinned Highlights
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {items.filter(item => pinnedSymbols.includes(item.symbol)).map(item => (
              <MarketItemCard 
                key={item.id}
                item={item}
                todayLog={logs.find(l => l.watchlist_item_id === item.id && l.date === format(new Date(), 'yyyy-MM-dd'))}
                logs={logs}
                isPinned={true}
                isChartActive={activeCharts.includes(item.symbol)}
                isUpdatingIndividual={isUpdatingIndividual === item.symbol}
                onTogglePin={togglePin}
                onToggleChart={(s) => setActiveCharts(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                onUpdateBias={handleUpdateBias}
                onAddNote={handleAddNote}
                onAnalyze={handleIndividualAIReport}
                onDelete={handleDeleteItem}
                getTVSymbol={getTVSymbol}
              />
            ))}
          </div>
          <div className="border-b border-border/50 my-8" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.filter(item => !pinnedSymbols.includes(item.symbol)).map((item) => (
          <MarketItemCard 
            key={item.id}
            item={item}
            todayLog={logs.find(l => l.watchlist_item_id === item.id && l.date === format(new Date(), 'yyyy-MM-dd'))}
            logs={logs}
            isPinned={false}
            isChartActive={activeCharts.includes(item.symbol)}
            isUpdatingIndividual={isUpdatingIndividual === item.symbol}
            onTogglePin={togglePin}
            onToggleChart={(s) => setActiveCharts(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
            onUpdateBias={handleUpdateBias}
            onAddNote={handleAddNote}
            onAnalyze={handleIndividualAIReport}
            onDelete={handleDeleteItem}
            getTVSymbol={getTVSymbol}
          />
        ))}

            {items.length === 0 && !loading && (
              <div className="col-span-full py-20 text-center space-y-4">
                 <LineChartIcon className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                 <div className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Your watchlist is empty.</div>
                 <p className="text-[10px] text-muted-foreground max-w-xs mx-auto italic">"Successful traders watch the same assets for years, learning their personality inside out."</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
