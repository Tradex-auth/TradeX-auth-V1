import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  ArrowRight, 
  Brain, 
  LineChart, 
  Zap, 
  Sparkles,
  Lock,
  Mail
} from 'lucide-react';
import { DownloadEngine } from '../components/DownloadEngine';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Check your email for confirmation!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Please check your inbox and confirm your email before logging in. (Tip: You can disable "Email Confirmation" in Supabase -> Authentication -> Settings for instant access).');
          }
          throw error;
        }
        toast.success('System Access Granted');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Brain,
      title: "AI Analysis",
      desc: "Behavioral audit of your trading habits using Gemini AI.",
      color: "text-primary"
    },
    {
      icon: LineChart,
      title: "Global Watchlist",
      desc: "Track everything from Crypto to Gold with technical bias.",
      color: "text-blue-500"
    },
    {
      icon: ShieldCheck,
      title: "Discipline Tracker",
      desc: "Stop the recursive leak of bad habits with habit heatmaps.",
      color: "text-green-500"
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col lg:grid lg:grid-cols-2 overflow-hidden selection:bg-primary selection:text-black">
      {/* Left Pane - Branding & Snapshots */}
      <div className="relative p-8 lg:p-16 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 relative z-10"
        >
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-black h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Trade-X</h1>
        </motion.div>

        <div className="relative z-10 space-y-12">
          <div>
            <motion.h2 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85]"
            >
              Elite <br />
              <span className="text-primary italic">Execution</span> <br />
              System.
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-primary/50 transition-all hover:translate-y-[-4px]"
              >
                <f.icon className={`h-8 w-8 ${f.color} mb-4`} />
                <h3 className="font-black uppercase tracking-widest text-xs mb-2">{f.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
            
            {/* Snapshot Card (3D Effect) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="aspect-video relative rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 border border-white/20 p-2 overflow-hidden hidden md:block"
              style={{ perspective: "1000px" }}
            >
              <div className="absolute inset-4 rounded-lg bg-black/40 backdrop-blur-xl border border-white/10 p-4 shadow-2xl">
                 <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-1">
                       <div className="w-2 h-2 rounded-full bg-red-500" />
                       <div className="w-2 h-2 rounded-full bg-yellow-500" />
                       <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                    <Badge className="bg-primary/20 text-primary text-[8px] px-1 pointer-events-none">LIVE ANALYTICS</Badge>
                 </div>
                 <div className="space-y-2">
                    <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse delay-75" />
                    <div className="h-4 w-5/6 bg-white/5 rounded animate-pulse delay-150" />
                 </div>
                 <div className="mt-8 flex gap-2">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                       <Zap className="h-6 w-6 text-primary animate-bounce" />
                    </div>
                    <div className="flex-1 space-y-2">
                       <div className="h-4 w-full bg-primary/10 rounded" />
                       <div className="h-4 w-1/2 bg-blue-500/10 rounded" />
                    </div>
                 </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/40 blur-[60px]" />
            </motion.div>
            
            <div className="md:col-span-2 mt-4 hidden lg:block">
              <DownloadEngine />
            </div>
          </div>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="text-[10px] font-bold uppercase tracking-[0.2em]"
        >
          Built for the 1% of disciplined professionals.
        </motion.p>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="p-8 lg:p-16 flex flex-col justify-center items-center relative">
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="w-full max-w-md space-y-8"
        >
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-black uppercase tracking-tighter">
              {isSignUp ? "Join the Team" : "Welcome Back"}
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              {isSignUp ? "Create your institutional observer account." : "Access your execution dashboard."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest opacity-50">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="bg-white/5 border-white/10 pl-10 h-12 text-sm focus:border-primary/50 transition-all font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest opacity-50">Private Key (Password)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-white/5 border-white/10 pl-10 h-12 text-sm focus:border-primary/50 transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-black uppercase tracking-widest text-xs gap-2 group"
              disabled={loading}
            >
              {loading ? (
                <Sparkles className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Initialize Account" : "Access Terminal"}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp ? "Already have access? Login" : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="pt-12 grid grid-cols-2 gap-4">
             <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[9px] font-black text-muted-foreground uppercase mb-1">Status</div>
                <div className="flex items-center gap-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                   <span className="text-[10px] font-black">SYSTEM LIVE</span>
                </div>
             </div>
             <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[9px] font-black text-muted-foreground uppercase mb-1">Region</div>
                <div className="text-[10px] font-black tracking-widest uppercase">Global-1</div>
             </div>
          </div>
        </motion.div>

        {/* Ambient Glows */}
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );
}
