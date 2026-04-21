import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Construction, FlaskConical, Calculator, Crosshair, CheckCircle2, Bot, TrendingUp, TrendingDown, Percent, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Simulations() {
  const [activeTab, setActiveTab] = useState<'backtesting' | 'forward'>('forward');
  const [simulatedTrades, setSimulatedTrades] = useState<any[]>([]);
  const [newTrade, setNewTrade] = useState({ symbol: '', entry: '', dir: 'long' });

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
            Backtesting
          </button>
          <button 
            className={`px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'forward' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('forward')}
          >
            Forward Testing (Paper)
          </button>
        </div>
      </div>

      {activeTab === 'backtesting' && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
           <Construction className="h-16 w-16 text-primary/50 animate-pulse" />
           <h2 className="text-2xl font-black tracking-tight">Backtesting Engine in Development</h2>
           <p className="text-muted-foreground max-w-lg">
             We are building a robust Monte Carlo and Tick-Level replay system. This engine will allow your future AI Agent to prove its profitability across 10,000 historical market iterations.
           </p>
           <Badge variant="outline" className="mt-4 border-primary/30 text-primary bg-primary/10 tracking-widest uppercase">
             Coming Soon
           </Badge>
        </div>
      )}

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
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Symbol</Label>
                  <Input 
                    placeholder="XAUUSD" 
                    className="font-bold uppercase" 
                    value={newTrade.symbol}
                    onChange={e => setNewTrade({...newTrade, symbol: e.target.value})}
                  />
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
    </div>
  );
}
