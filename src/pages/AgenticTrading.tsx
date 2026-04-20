import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Cpu, 
  Network, 
  Zap, 
  GitBranch, 
  Terminal, 
  LineChart, 
  ShieldCheck, 
  BarChart3, 
  History, 
  Database 
} from 'lucide-react';
import { motion } from 'motion/react';

export default function AgenticTrading() {
  return (
    <div className="p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="max-w-5xl mx-auto text-center space-y-8 pt-16">
        
        {/* Abstract 3D Agent Representation */}
        <div className="flex justify-center relative py-12 h-64">
            {/* Background Glows */}
            <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full scale-150 animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[80px] rounded-full"></div>

            <div className="relative z-10 perspective-1000">
               <motion.div 
                 animate={{ rotateY: 360, rotateX: [0, 10, 0] }}
                 transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                 className="w-48 h-48 preserve-3d"
               >
                  {/* Outer Rings */}
                  <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-spin-slow" />
                  <div className="absolute inset-4 border border-blue-500/20 rounded-full animate-reverse-spin-slow" />
                  
                  {/* The Core Agent */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative group">
                       <div className="absolute -inset-4 bg-primary/20 blur-xl group-hover:bg-primary/40 transition-all rounded-full" />
                       <Bot className="h-24 w-24 text-primary relative z-10 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                    </div>
                  </div>

                  {/* Floating Logic Nodes */}
                  {[0, 90, 180, 270].map((angle, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-4 h-4 bg-primary rounded-full"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: `rotate(${angle}deg) translate(100px) rotate(-${angle}deg)`
                      }}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.5
                      }}
                    />
                  ))}
               </motion.div>
            </div>
        </div>

        <div className="space-y-4">
          <Badge variant="outline" className="px-6 py-1.5 text-sm font-black tracking-tighter border-primary/50 text-primary bg-primary/10 uppercase italic">
            Autonomous Logic
          </Badge>
          
          <h1 className="text-7xl font-black tracking-tighter italic uppercase leading-none">
            Agentic <span className="text-primary tracking-widest not-italic">Trading</span>
          </h1>
          
          <p className="text-2xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
            Neural network architectures designed for autonomous execution and self-correcting logic loops. 
            The age of manual execution is reaching its terminal phase.
          </p>
        </div>

        {/* Pipeline Components */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
           <div className="p-8 rounded-3xl bg-emerald-950/20 border border-emerald-500/20 space-y-4 hover:border-emerald-500/40 transition-all group">
              <Network className="h-10 w-10 text-emerald-500 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold uppercase tracking-widest italic">Swarm Intelligence</h3>
              <p className="text-sm text-muted-foreground">Multiple AI agents coordinating across different timeframes to confirm bias.</p>
           </div>
           
           <div className="p-8 rounded-3xl bg-primary/10 border border-primary/20 space-y-4 hover:border-primary/40 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                 <Zap className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <GitBranch className="h-10 w-10 text-primary group-hover:rotate-90 transition-transform" />
              <h3 className="text-xl font-bold uppercase tracking-widest italic">Execution Pipeline</h3>
              <p className="text-sm text-muted-foreground">Automated logic flows from data extraction to order placement with 0ms lag.</p>
           </div>

           <div className="p-8 rounded-3xl bg-blue-950/20 border border-blue-500/20 space-y-4 hover:border-blue-500/40 transition-all group">
              <Terminal className="h-10 w-10 text-blue-500 group-hover:translate-x-1 transition-transform" />
              <h3 className="text-xl font-bold uppercase tracking-widest italic">Self-Optimization</h3>
              <p className="text-sm text-muted-foreground">Agents that learn from their own losses and adjust parameters autonomously.</p>
           </div>
        </div>

        <div className="pt-20">
          <div className="inline-block p-1 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-blue-500 animate-gradient">
             <div className="px-12 py-4 rounded-full bg-black flex items-center gap-4">
                <Cpu className="h-6 w-6 text-primary animate-pulse" />
                <span className="text-xl font-black uppercase tracking-[0.2em]">Coming Soon!</span>
             </div>
          </div>
        </div>

        {/* Architecture Section */}
        <div className="pt-24 max-w-4xl mx-auto space-y-12">
           <div className="space-y-4">
              <h2 className="text-3xl font-black uppercase tracking-tighter italic">System Architecture</h2>
              <p className="text-muted-foreground font-medium">The blueprint for the autonomous trading intelligence layer.</p>
           </div>

           {/* Architecture Diagram */}
           <div className="rounded-3xl border border-border/50 bg-card/30 overflow-hidden shadow-2xl relative">
              <div className="p-8 md:p-12 space-y-12">
                <div className="flex flex-col gap-8">
                  {/* Row 1: Browser */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <div className="w-full md:w-48 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
                       <LineChart className="h-5 w-5 text-emerald-500 mx-auto" />
                       <div className="text-[11px] font-black uppercase text-emerald-500">TradingView</div>
                       <div className="text-[9px] text-muted-foreground">Chart Widget</div>
                    </div>
                    <div className="hidden md:block w-8 border-t border-dashed border-border" />
                    <div className="w-full md:w-48 p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-center space-y-2">
                       <Cpu className="h-5 w-5 text-blue-500 mx-auto" />
                       <div className="text-[11px] font-black uppercase text-blue-500">Content Script</div>
                       <div className="text-[9px] text-muted-foreground">Capture + Overlay</div>
                    </div>
                    <div className="hidden md:block w-8 border-t border-dashed border-border" />
                    <div className="w-full md:w-48 p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-center space-y-2">
                       <Zap className="h-5 w-5 text-purple-500 mx-auto" />
                       <div className="text-[11px] font-black uppercase text-purple-500">Popup UI</div>
                       <div className="text-[9px] text-muted-foreground">Settings + Status</div>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="flex justify-center">
                    <div className="h-8 w-px bg-gradient-to-b from-primary/50 to-primary/0" />
                  </div>

                  {/* Row 2: AI Router */}
                  <div className="flex justify-center">
                    <div className="w-full md:w-64 p-6 rounded-2xl bg-primary/10 border-2 border-primary/30 text-center space-y-2 relative group shadow-lg shadow-primary/5">
                       <Network className="h-6 w-6 text-primary mx-auto mb-1 animate-pulse" />
                       <div className="text-xs font-black uppercase tracking-widest text-primary italic">AI Router Intelligence</div>
                       <div className="text-[9px] text-muted-foreground font-bold italic">Claude • OpenAI • Gemini</div>
                    </div>
                  </div>

                  {/* Connector Grid */}
                  <div className="hidden md:grid grid-cols-4 gap-4 px-12">
                    <div className="h-8 w-px bg-border justify-self-center" />
                    <div className="h-8 w-px bg-border justify-self-center" />
                    <div className="h-8 w-px bg-border justify-self-center" />
                    <div className="h-8 w-px bg-border justify-self-center" />
                  </div>

                  {/* Row 3: Backend */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { title: 'Auth', desc: 'JWT • Sessions', icon: ShieldCheck },
                      { title: 'Usage Metrics', desc: 'Tokens • Cost/Model', icon: BarChart3 },
                      { title: 'API Security', desc: 'Encrypted Vault', icon: Database },
                      { title: 'Analysis Log', desc: 'SMC/Chart History', icon: History }
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-background/40 border border-border/50 text-center space-y-1">
                        <item.icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                        <div className="text-[10px] font-black uppercase tracking-tight">{item.title}</div>
                        <div className="text-[8px] text-muted-foreground font-mono">{item.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* Final Output Row */}
                  <div className="pt-8 space-y-4">
                    <div className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-primary/50">Execution Layer</div>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                      <div className="px-6 py-3 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">SVG Chart Overlay</div>
                      <div className="px-6 py-3 rounded-full bg-blue-500/5 border border-blue-500/20 text-[10px] font-bold text-blue-500 uppercase tracking-widest">SMC Logic Side Panel</div>
                      <div className="px-6 py-3 rounded-full bg-purple-500/5 border border-purple-500/20 text-[10px] font-bold text-purple-500 uppercase tracking-widest">Global Usage Dashboard</div>
                    </div>
                  </div>
                </div>

                {/* SMC Knowledge Base - Grounding */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="relative z-10 space-y-3">
                      <div className="text-xs font-black uppercase tracking-[0.4em] text-foreground italic">SMC Knowledge Base (System Prompt)</div>
                      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-medium text-muted-foreground">
                        <span>BOS Rules</span>
                        <span className="opacity-30">•</span>
                        <span>CHoCH Rules</span>
                        <span className="opacity-30">•</span>
                        <span>IDM Logic</span>
                        <span className="opacity-30">•</span>
                        <span>Golden Candlestick</span>
                        <span className="opacity-30">•</span>
                        <span>Valid Swings</span>
                      </div>
                      <div className="text-[9px] text-primary/60 font-bold uppercase tracking-widest">Version-Controlled Injection into every AI call</div>
                   </div>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="space-y-3">
                 <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Brief Flow Outline</h4>
                 <ul className="space-y-4">
                    <li className="flex gap-4">
                       <span className="flex-none w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">01</span>
                       <p className="text-sm text-foreground/80 font-medium">Capture data via TradingView widgets and custom content scripts for real-time analysis.</p>
                    </li>
                    <li className="flex gap-4">
                       <span className="flex-none w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">02</span>
                       <p className="text-sm text-foreground/80 font-medium">AI Router dynamically switches between Claude, OpenAI, and Gemini models based on task context.</p>
                    </li>
                    <li className="flex gap-4">
                       <span className="flex-none w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">03</span>
                       <p className="text-sm text-foreground/80 font-medium">Supabase manages secure Auth, encrypted API Vaults, and historical SMC analysis logging.</p>
                    </li>
                 </ul>
              </div>
              <div className="space-y-3">
                 <h4 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">Intelligent Output</h4>
                 <ul className="space-y-4">
                    <li className="flex gap-4">
                       <span className="flex-none w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-500">04</span>
                       <p className="text-sm text-foreground/80 font-medium">System Prompts inject SMC rules (BOS, CHoCH, IDM) directly into the AI analysis loop.</p>
                    </li>
                    <li className="flex gap-4">
                       <span className="flex-none w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-500">05</span>
                       <p className="text-sm text-foreground/80 font-medium">Final results are visualized as SVG overlays and side panels on the browser chart layer.</p>
                    </li>
                 </ul>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
