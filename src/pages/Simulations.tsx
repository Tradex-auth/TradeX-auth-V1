import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FlaskConical, Crosshair, Bot, TrendingUp, Percent, Settings2, Play, Code2, Plus, Calendar as CalendarIcon, Trash2, Power, DownloadCloud, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { autoFixPythonCode } from '@/lib/ai-service';
import { DownloadEngine } from '../components/DownloadEngine';
interface Strategy {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

const POPULAR_SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'SPX', 'NDX', 'USOIL', 'NVDA', 'TSLA'];

export default function Simulations() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'backtesting' | 'forward'>('forward');
  
  // Forward Testing State
  const [simulatedTrades, setSimulatedTrades] = useState<any[]>([]);
  const [newTrade, setNewTrade] = useState({ symbol: '', entry: '', dir: 'long' });

  // Backtesting State
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    const fetchCloudStrategies = async () => {
      if (!user) return;
      const { data, error } = await supabase.from('user_strategies').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        setStrategies(data.map(d => ({
          id: d.id,
          name: d.name,
          code: d.code,
          isActive: d.is_active
        })));
      } else if (strategies.length === 0) {
        // Fallback default if empty DB
        setStrategies([
          { id: Date.now().toString(), name: 'SMA Crossover VectorBT', code: 'import vectorbt as vbt\nimport numpy as np\nimport ta\n\nfast_ma = vbt.MA.run(close, 10)\nslow_ma = vbt.MA.run(close, 50)\n\nentries = fast_ma.ma_crossed_above(slow_ma)\nexits = fast_ma.ma_crossed_below(slow_ma)\n', isActive: false }
        ]);
      }
    };
    fetchCloudStrategies();
  }, [user]);

  const syncToCloud = async () => {
    if (!user) return toast.error("Must be logged in to sync to cloud.");
    setIsSyncing(true);
    try {
      await supabase.from('user_strategies').delete().eq('user_id', user.id);
      
      if (strategies.length > 0) {
        const inserts = strategies.map(s => ({
          user_id: user.id,
          name: s.name,
          code: s.code,
          is_active: s.isActive
        }));
        const { error } = await supabase.from('user_strategies').insert(inserts);
        if (error) throw error;
      }
      toast.success("Successfully Synced Strategies to Supabase Cloud!");
      
      // Reload strategies to get accurate DB UUIDs
      const { data } = await supabase.from('user_strategies').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (data) {
        setStrategies(data.map(d => ({
          id: d.id, name: d.name, code: d.code, isActive: d.is_active
        })));
      }
    } catch (err) {
      toast.error("Failed to sync to Supabase.");
    } finally {
      setIsSyncing(false);
    }
  };

  const [dateRange, setDateRange] = useState('1Y');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [backtestSymbol, setBacktestSymbol] = useState('BTC-USD');
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResults, setBacktestResults] = useState<any[]>([]);

  const handleOpenSimulatedTrade = () => {
    if (!newTrade.symbol || !newTrade.entry) return toast.error("Enter symbol and entry price.");
    setSimulatedTrades([
      { id: Date.now(), symbol: newTrade.symbol.toUpperCase(), entry: parseFloat(newTrade.entry), dir: newTrade.dir, pnl: (Math.random() * 50 - 20).toFixed(2), time: new Date() },
      ...simulatedTrades
    ]);
    toast.success(`Simulated Trade Opened: ${newTrade.symbol.toUpperCase()}`);
    setNewTrade({ symbol: '', entry: '', dir: 'long' });
  };

  const closeTrade = (id: number) => {
    setSimulatedTrades(simulatedTrades.filter(t => t.id !== id));
    toast.success("Simulated Trade Closed");
  };

  // Backtesting Handlers
  const toggleAllStrategies = (active: boolean) => {
    setStrategies(strategies.map(s => ({ ...s, isActive: active })));
    toast.info(`All strategies toggled ${active ? 'ON' : 'OFF'}`);
  };

  const updateStrategy = (id: string, key: keyof Strategy, value: any) => {
    setStrategies(strategies.map(s => s.id === id ? { ...s, [key]: value } : s));
  };

  const deleteStrategy = (id: string) => {
    setStrategies(strategies.filter(s => s.id !== id));
  };

  const addStrategy = () => {
    setStrategies([...strategies, { 
      id: Date.now().toString(), 
      name: `Strategy ${strategies.length + 1}`, 
      code: 'import vectorbt as vbt\nimport numpy as np\n\nfast_ma = vbt.MA.run(close, 10)\nslow_ma = vbt.MA.run(close, 50)\n\nentries = fast_ma.ma_crossed_above(slow_ma)\nexits = fast_ma.ma_crossed_below(slow_ma)\n', 
      isActive: false 
    }]);
  };

  const runBacktest = async () => {
    const activeStrategies = strategies.filter(s => s.isActive);
    if (activeStrategies.length === 0) return toast.error('No strategies toggled ON for backtesting.');
    if (!backtestSymbol) return toast.error('Please enter a valid Yahoo Finance Symbol (e.g. BTC-USD)');
    
    let start_date = customStart;
    let end_date = customEnd;
    
    const d = new Date();
    if (dateRange !== 'CUSTOM') {
      end_date = d.toISOString().split('T')[0];
      if (dateRange === '1Y') d.setFullYear(d.getFullYear() - 1);
      if (dateRange === '2Y') d.setFullYear(d.getFullYear() - 2);
      if (dateRange === '5Y') d.setFullYear(d.getFullYear() - 5);
      start_date = d.toISOString().split('T')[0];
    }

    if (!start_date || !end_date) return toast.error('Check your date range parameters.');

    setIsBacktesting(true);
    setBacktestResults([]);
    toast.success(`Starting VectorBT engine for ${activeStrategies.length} strategies...`);
    
    try {
      const results = [];
      const envUrl = import.meta.env.VITE_PYTHON_ENGINE_URL || "http://127.0.0.1:8000";
      const engineUrl = envUrl.replace(/\/$/, ""); 
      
      for (const strat of activeStrategies) {
        try {
          // 120 Second Hard Timeout for the Engine
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000);

          const res = await fetch(`${engineUrl}/run-backtest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              code: strat.code,
              symbol: backtestSymbol,
              start_date,
              end_date
            })
          });
          
          clearTimeout(timeoutId);
          
          if (!res.ok) {
            let detail = "Server error";
            try {
              const errData = await res.json();
              detail = errData.detail || detail;
            } catch (e) {}
            throw new Error(detail);
          }
          
          const data = await res.json();
          results.push({
            id: strat.id,
            name: strat.name,
            winRate: data.winRate,
            totalReturn: data.totalReturn,
            maxDrawdown: data.maxDrawdown,
            tradesCount: data.tradesCount
          });
          
        } catch (innerError: any) {
          if (innerError.name === 'AbortError') {
             toast.error(`Error in ${strat.name}: Engine took longer than 120s or crashed (Render OOM).`);
          } else if (innerError.message === 'Failed to fetch' || innerError.message.includes('NetworkError') || innerError.message.includes('Failed to connect')) {
             toast.error(`⚠️ Desktop Engine Offline`, {
               description: "Please launch the TradeX Desktop Engine app on your computer. If it's already running, ensure port 8000 is open.",
               duration: 8000
             });
          } else {
             toast.error(`Syntax Error in ${strat.name}`, {
               description: innerError.message,
               duration: 10000,
               action: {
                 label: 'Auto-Fix',
                 onClick: async () => {
                   toast.loading("AI is analyzing and rewriting your algorithmic code...", { id: "autofix" });
                   const fixedCode = await autoFixPythonCode(strat.code, innerError.message);
                   updateStrategy(strat.id, 'code', fixedCode);
                   toast.dismiss("autofix");
                   toast.success("Code successfully rewritten! Try running the backtest again.");
                 }
               }
             });
          }
        }
      }
      
      setBacktestResults(results);
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError') || err.message.includes('Failed to connect')) {
        toast.error(`⚠️ Desktop Engine Offline: To run backtests, please launch the TradeX Desktop Engine app on your computer first!`);
      } else {
        toast.error(err.message || 'Failed connecting to Python Engine');
      }
    } finally {
      setIsBacktesting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <FlaskConical className="h-8 w-8 text-primary" />
            Testing & Simulations
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Verify your edge in the lab before deploying real capital.</p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-lg">
          <button 
            className={`px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'backtesting' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('backtesting')}
          >
            VectorBT Backtesting
          </button>
          <button 
            className={`px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'forward' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('forward')}
          >
            Forward Testing (Paper)
          </button>
        </div>
      </div>

      {activeTab === 'forward' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Percent className="h-3 w-3" />
                  Simulated Account Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black font-mono">$100,000.00</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Active PnL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black font-mono text-green-500">+$0.00</div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  <Bot className="h-3 w-3" />
                  Agent Execution Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black tracking-tight uppercase text-primary">Standby Mode</div>
                <p className="text-xs text-muted-foreground mt-1">Manual Forward Testing Active</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 bg-card/50 border-border/50 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 uppercase tracking-tight">
                  <Crosshair className="h-5 w-5 text-primary" />
                  New Paper Trade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Asset Symbol</Label>
                  <Select value={newTrade.symbol} onValueChange={v => setNewTrade({...newTrade, symbol: v})}>
                    <SelectTrigger className="font-bold uppercase">
                      <SelectValue placeholder="Select Asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {POPULAR_SYMBOLS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action</Label>
                    <Select value={newTrade.dir} onValueChange={v => setNewTrade({...newTrade, dir: v})}>
                      <SelectTrigger className="font-bold uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long" className="font-bold text-green-500 uppercase">Long</SelectItem>
                        <SelectItem value="short" className="font-bold text-red-500 uppercase">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entry Price</Label>
                    <Input 
                      placeholder="e.g. 2350.50" 
                      type="number"
                      value={newTrade.entry}
                      onChange={e => setNewTrade({...newTrade, entry: e.target.value})}
                    />
                  </div>
                </div>
                <Button className="w-full font-black uppercase tracking-widest mt-4" onClick={handleOpenSimulatedTrade}>
                  Open Synthetic Position
                </Button>
                <p className="text-[10px] text-muted-foreground text-center italic mt-4">
                  These trades will eventually be managed by the AI Agent autonomously based on market bias confluence.
                </p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="uppercase tracking-tight flex items-center justify-between">
                  <span>Open Positions</span>
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {simulatedTrades.length === 0 ? (
                  <div className="py-12 text-center">
                     <p className="text-muted-foreground font-medium text-sm">No active paper trades.</p>
                     <p className="text-xs text-muted-foreground mt-2">Open a synthetic position to test your edge.</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-border/50 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground font-black">
                        <tr>
                          <th className="p-3 text-left">Asset</th>
                          <th className="p-3 text-left">Dir</th>
                          <th className="p-3 text-right">Entry</th>
                          <th className="p-3 text-right">Running PnL</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {simulatedTrades.map((t) => (
                          <tr key={t.id} className="bg-card hover:bg-muted/20 transition-colors">
                            <td className="p-3 font-black">{t.symbol}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={t.dir === 'long' ? 'border-green-500/50 text-green-500' : 'border-red-500/50 text-red-500'}>
                                {t.dir.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-3 text-right font-mono">{t.entry}</td>
                            <td className={`p-3 text-right font-mono font-bold ${Number(t.pnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {Number(t.pnl) >= 0 ? '+' : ''}${t.pnl}
                            </td>
                            <td className="p-3 text-right">
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => closeTrade(t.id)}>Close</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'backtesting' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
          <DownloadEngine />
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/20">
              <div>
                <CardTitle className="uppercase tracking-tight flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" />
                  VectorBT Python Engine
                </CardTitle>
                <CardDescription className="text-xs max-w-lg mt-1">
                  Write VectorBT Python strategies. Toggle specific strategies to test them concurrently against historical datasets.
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={syncToCloud} disabled={isSyncing} className="hidden lg:flex font-bold uppercase tracking-widest text-[10px] text-muted-foreground hover:text-primary gap-2">
                  <CloudUpload className="h-4 w-4" />
                  {isSyncing ? "Syncing..." : "Sync to Cloud"}
                </Button>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg border border-border/50">
                  <Power className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs font-bold uppercase tracking-widest cursor-pointer whitespace-nowrap">Toggle All</Label>
                  <Switch 
                    checked={strategies.every(s => s.isActive) && strategies.length > 0}
                    onCheckedChange={toggleAllStrategies} 
                  />
                </div>
                <Button onClick={runBacktest} disabled={isBacktesting} className="font-black uppercase tracking-widest gap-2">
                  {isBacktesting ? (
                    <><span className="animate-pulse flex items-center gap-2"><Play className="h-4 w-4" /> Running...</span></>
                  ) : (
                    <><Play className="h-4 w-4" /> Run Backtest</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/20 p-4 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 border-r border-border/50 pr-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Asset Symbol</span>
                  <Input 
                    value={backtestSymbol} 
                    onChange={e => setBacktestSymbol(e.target.value.toUpperCase())}
                    className="w-28 h-8 bg-background font-bold tracking-widest text-primary uppercase" 
                    placeholder="BTC-USD"
                    list="yfinance-symbols"
                  />
                  <datalist id="yfinance-symbols">
                    <option value="BTC-USD" />
                    <option value="ETH-USD" />
                    <option value="SOL-USD" />
                    <option value="GC=F" />
                    <option value="EURUSD=X" />
                    <option value="AAPL" />
                    <option value="NVDA" />
                    <option value="TSLA" />
                    <option value="SPY" />
                    <option value="QQQ" />
                  </datalist>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Historical Range</span>
                </div>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[180px] bg-background">
                    <SelectValue placeholder="Select Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1Y">Last 1 Year</SelectItem>
                    <SelectItem value="2Y">Last 2 Years</SelectItem>
                    <SelectItem value="5Y">Last 5 Years</SelectItem>
                    <SelectItem value="CUSTOM">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                
                {dateRange === 'CUSTOM' && (
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-background" />
                    <span className="text-muted-foreground px-2">to</span>
                    <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-background" />
                  </div>
                )}
              </div>

              {backtestResults.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-top-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <DownloadCloud className="h-4 w-4" />
                    VectorBT Results
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {backtestResults.map(res => (
                      <Card key={res.id} className="bg-primary/5 border-primary/20">
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm font-black text-primary">{res.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 pb-4">
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Win Rate</p>
                            <p className="text-lg font-mono font-bold text-green-500">{res.winRate}%</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Total Return</p>
                            <p className={`text-lg font-mono font-bold ${Number(res.totalReturn) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {Number(res.totalReturn) >= 0 ? '+' : ''}{res.totalReturn}%
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Max Drawdown</p>
                            <p className="text-lg font-mono font-bold text-red-500">-{res.maxDrawdown}%</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Trades Taken</p>
                            <p className="text-lg font-mono font-bold">{res.tradesCount}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {strategies.map((strategy, index) => (
                  <Card key={strategy.id} className={`border ${strategy.isActive ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-card/40'} transition-all`}>
                    <CardHeader className="py-3 flex flex-row items-center justify-between border-b border-border/10">
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={strategy.isActive} 
                          onCheckedChange={(checked) => updateStrategy(strategy.id, 'isActive', checked)}
                        />
                        <Input 
                          value={strategy.name}
                          onChange={(e) => updateStrategy(strategy.id, 'name', e.target.value)}
                          className="h-7 text-sm font-bold bg-transparent border-none px-1 py-0 shadow-none focus-visible:ring-1 w-[150px]"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-50 hover:opacity-100" onClick={() => deleteStrategy(strategy.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Textarea 
                        value={strategy.code}
                        onChange={(e) => updateStrategy(strategy.id, 'code', e.target.value)}
                        className="min-h-[250px] font-mono text-xs bg-black/50 border-0 rounded-none focus-visible:ring-0 p-4 text-green-400 placeholder:text-muted-foreground/30 resize-y"
                        spellCheck={false}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button variant="outline" onClick={addStrategy} className="w-full border-dashed border-2 py-8 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 font-bold uppercase tracking-widest gap-2">
                <Plus className="h-4 w-4" />
                Add Python Strategy
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
