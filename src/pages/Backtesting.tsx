import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Construction, FlaskConical, Calculator } from 'lucide-react';

export default function Backtesting() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-4xl mx-auto text-center space-y-4 pt-12">
        <div className="flex justify-center mb-6">
          <div className="relative">
             <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
             <FlaskConical className="h-24 w-24 text-primary relative z-10 animate-bounce" />
          </div>
        </div>
        
        <Badge variant="outline" className="px-4 py-1 text-xs border-primary/30 text-primary bg-primary/5">
          MODULE: 05
        </Badge>
        
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-primary/80 to-muted-foreground bg-clip-text text-transparent">
          Advanced Backtesting Engine
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
           We are engineering a proprietary data replay and strategy optimization engine. 
           Quantitative edge is built in the lab, not on the live charts.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-8">
           <Card className="bg-emerald-950/20 border-emerald-500/10 w-64 text-left">
              <CardHeader className="pb-2">
                 <Calculator className="h-5 w-5 text-emerald-500 mb-2" />
                 <CardTitle className="text-sm">Monte Carlo Simulations</CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                    Stressing your edge against 10,000 randomized market iterations.
                 </p>
              </CardContent>
           </Card>

           <Card className="bg-blue-950/20 border-blue-500/10 w-64 text-left">
              <CardHeader className="pb-2">
                 <Construction className="h-5 w-5 text-blue-500 mb-2" />
                 <CardTitle className="text-sm">Tick-Level Replay</CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                    Precision testing on raw L2 data for Institutional accuracy.
                 </p>
              </CardContent>
           </Card>
        </div>

        <div className="pt-12">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
             <span className="text-sm font-bold tracking-widest uppercase text-primary">Under Development</span>
          </div>
        </div>
      </div>
    </div>
  );
}
