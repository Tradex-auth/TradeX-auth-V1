import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Monitor, Code2, ShieldCheck, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function DownloadEngine() {
  const downloadMac = () => {
    alert("Mac deployment pipeline compiling. (This will trigger the .app download)");
  };

  const downloadWindows = () => {
    alert("Windows deployment pipeline compiling. (This will trigger the .exe download)");
  };

  return (
    <Card className="bg-primary/5 border-primary/20 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      <CardHeader>
        <div className="flex items-center gap-3">
          <Monitor className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl font-black uppercase tracking-tight">TradeX Desktop Engine</CardTitle>
          <Badge variant="outline" className="ml-auto bg-background text-[10px] uppercase font-bold tracking-widest text-green-500 border-green-500/50">
            Secure Endpoint
          </Badge>
        </div>
        <CardDescription className="text-muted-foreground mt-2">
          Offload heavy VectorBT processing directly to your machine. Run millions of rows of algorithmic backtesting in milliseconds with zero cloud bottlenecks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col gap-2 p-4 bg-background/50 rounded-lg border border-border/50">
            <Zap className="h-5 w-5 text-yellow-500 mb-1" />
            <span className="font-bold uppercase tracking-widest text-xs">Zero Latency</span>
            <span className="text-xs text-muted-foreground">Uses your device's native RAM for instant compilation. No freezing.</span>
          </div>
          <div className="flex flex-col gap-2 p-4 bg-background/50 rounded-lg border border-border/50">
            <ShieldCheck className="h-5 w-5 text-blue-500 mb-1" />
            <span className="font-bold uppercase tracking-widest text-xs">Maximum Security</span>
            <span className="text-xs text-muted-foreground">No API keys required. Execution happens entirely offline on your end.</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={downloadMac} className="flex-1 font-black tracking-widest uppercase gap-2 bg-white text-black hover:bg-neutral-200">
            <Download className="h-4 w-4" />
            Download for Mac
          </Button>
          <Button onClick={downloadWindows} className="flex-1 font-black tracking-widest uppercase gap-2" variant="outline">
            <Code2 className="h-4 w-4" />
            Download for Windows
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
