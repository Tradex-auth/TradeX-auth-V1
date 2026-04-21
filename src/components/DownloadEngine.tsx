import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Monitor, Code2, ShieldCheck, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function DownloadEngine() {
  const downloadMac = () => {
    window.location.href = "/TradeX-Engine.zip";
  };

  const downloadWindows = () => {
    window.location.href = "/TradeX-Engine.zip";
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-950/40 via-background to-background border-emerald-500/20 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Monitor className="h-5 w-5 text-emerald-400" />
          </div>
          <CardTitle className="text-lg font-black uppercase tracking-widest text-emerald-50">TradeX Desktop Engine</CardTitle>
          <Badge variant="outline" className="ml-auto bg-emerald-500/10 text-[10px] uppercase font-bold tracking-widest text-emerald-400 border-emerald-500/30">
            Local Execution Hook
          </Badge>
        </div>
        <CardDescription className="text-emerald-100/60 mt-2 font-medium max-w-3xl leading-relaxed">
          Offload heavy VectorBT processing directly to your machine. Run millions of rows of algorithmic backtesting in milliseconds with massive RAM allocation and zero cloud bottlenecks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative z-10">
          <div className="flex flex-col gap-2 p-5 bg-[#0a0a0a]/80 backdrop-blur-sm rounded-xl border border-emerald-500/20 shadow-inner">
            <div className="flex items-center gap-3 mb-1">
               <Zap className="h-5 w-5 text-yellow-400" />
               <span className="font-black uppercase tracking-widest text-[11px] text-white">Zero Latency Processing</span>
            </div>
            <span className="text-xs text-neutral-400 font-medium leading-relaxed">
              Uses your device's native RAM for instant Pandas Array compilation. 50x faster than cloud execution constraints.
            </span>
          </div>
          <div className="flex flex-col gap-2 p-5 bg-[#0a0a0a]/80 backdrop-blur-sm rounded-xl border border-blue-500/20 shadow-inner">
            <div className="flex items-center gap-3 mb-1">
               <ShieldCheck className="h-5 w-5 text-blue-400" />
               <span className="font-black uppercase tracking-widest text-[11px] text-white">Maximum Security</span>
            </div>
            <span className="text-xs text-neutral-400 font-medium leading-relaxed">
              No API keys required. Execution happens entirely offline on your end. Sensitive strategy data never leaves.
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <Button onClick={downloadMac} className="flex-1 font-black tracking-widest uppercase gap-2 bg-emerald-500 text-black hover:bg-emerald-400 h-12">
            <Download className="h-4 w-4 shrink-0" />
            Download for Mac
          </Button>
          <Button onClick={downloadWindows} className="flex-1 font-black tracking-widest uppercase gap-2 h-12 bg-white/5 hover:bg-white/10 text-white border-white/20" variant="outline">
            <Code2 className="h-4 w-4 shrink-0" />
            Download for Windows
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
