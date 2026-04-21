import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Maximize, Play, Pause, Brain } from 'lucide-react';

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
            onClick={() => setIsAgentActive(!isAgentActive)}
            className={`font-black tracking-widest uppercase gap-2 shadow-lg transition-all ${
              isAgentActive 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
            }`}
          >
            <Brain className="h-4 w-4" />
            Agent
            {isAgentActive ? <Pause className="h-4 w-4 ml-1" /> : <Play className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
      <div className="flex-1 w-full h-full relative">
        <iframe
          src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_7623a_full&symbol=${tvSymbol}&interval=D&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&theme=dark&style=1&timezone=exchange&withdateranges=1&showpopupbutton=0&locale=en`}
          style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', inset: 0 }}
          title={`Full TradingView Chart for ${symbol}`}
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
