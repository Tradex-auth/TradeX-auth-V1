import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Maximize, Play, Pause, Brain, Power } from 'lucide-react';

const SYMBOL_MAP: Record<string, string> = {
  'BTC': 'BINANCE:BTCUSDT',
  'BTCUSD': 'BINANCE:BTCUSDT',
  'XAU': 'OANDA:XAUUSD',
  'XAUUSD': 'OANDA:XAUUSD',
  'XAUUUSD': 'OANDA:XAUUSD',
  'GOLD': 'COMEX:GC1!',
  'SPX': 'SP:SPX',
  'NDX': 'NASDAQ:NDX',
  'DXY': 'CAPITALCOM:DXY',
};

export default function FullChart() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  if (!symbol) return null;

  const getTVSymbol = (s: string) => {
    const raw = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return SYMBOL_MAP[raw] || raw;
  };

  const tvSymbol = getTVSymbol(symbol);

  return (
    <div className="w-screen h-screen bg-black flex flex-col absolute inset-0 z-50">
      <div className="h-14 border-b border-border/20 bg-card/80 backdrop-blur flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-primary/20 hover:text-primary">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Maximize className="h-4 w-4 text-primary" />
            <span className="font-black tracking-widest uppercase text-lg">{symbol}</span>
            <span className="text-muted-foreground text-xs font-bold ml-2">PRO CHART</span>
          </div>
        </div>
        
        <div>
          <Button 
            variant="default"
            size="sm"
            onClick={() => {
              if (isAgentActive) {
                setShowConfirm(true);
              } else {
                setIsAgentActive(true);
              }
            }}
            className={`font-black tracking-widest uppercase gap-2 shadow-lg transition-all ${
              isAgentActive 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
            }`}
          >
            <Brain className="h-4 w-4" />
            {isAgentActive ? 'Agent Active' : 'Agent'}
            {isAgentActive ? <Pause className="h-4 w-4 ml-1" /> : <Play className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
      
      {showConfirm && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
           <div className="bg-card border border-border/50 p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
             <div>
               <h3 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                 <Power className="h-5 w-5 text-destructive" />
                 Terminate Agent?
               </h3>
               <p className="text-sm text-muted-foreground mt-2 font-medium">
                 Are you sure you want to stop the autonomous agent for this chart? It will stop monitoring {symbol}.
               </p>
             </div>
             <div className="flex justify-end gap-3">
               <Button variant="ghost" onClick={() => setShowConfirm(false)} className="font-bold uppercase tracking-widest text-xs">Cancel</Button>
               <Button variant="destructive" onClick={() => { setIsAgentActive(false); setShowConfirm(false); }} className="font-black uppercase tracking-widest text-xs">Terminate</Button>
             </div>
           </div>
        </div>
      )}
      <div className="flex-1 w-full h-full relative">
        <iframe
          src={`https://www.tradingview.com/widgetembed/?symbol=${tvSymbol}&interval=D&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&theme=dark&style=1&timezone=exchange&withdateranges=1&showpopupbutton=0&locale=en`}
          style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', inset: 0 }}
          title={`Full TradingView Chart for ${symbol}`}
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
