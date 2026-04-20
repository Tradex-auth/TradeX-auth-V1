import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  Link, 
  useLocation,
  Outlet
} from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  BarChart3, 
  Database, 
  ShieldCheck, 
  Sun, 
  Moon,
  LogOut,
  Menu,
  X,
  History,
  TrendingUp,
  LineChart,
  Target,
  FileCheck
} from 'lucide-react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { supabase } from '@/lib/supabase';

// Pages
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Repository from './pages/Repository';
import Admin from './pages/Admin';
import Login from './pages/Login';
import TradeJournal from './pages/TradeJournal';
import MarketWatch from './pages/MarketWatch';
import Discipline from './pages/Discipline';
import Goals from './pages/Goals';
import Reviews from './pages/Reviews';
import Backtesting from './pages/Backtesting';
import AgenticTrading from './pages/AgenticTrading';

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={() => setIsDark(!isDark)}
      className="rounded-full"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

function Navbar({ role }: { role: string | null }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut, user } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Trade Journal', path: '/trade-journal', icon: History },
    { name: 'Market', path: '/market', icon: LineChart },
    { name: 'Discipline', path: '/discipline', icon: FileCheck },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Reviews', path: '/reviews', icon: TrendingUp },
    { name: 'Backtesting', path: '/backtesting', icon: BarChart3 },
    { name: 'Agentic', path: '/agentic-trading', icon: ShieldCheck },
    { name: 'Repository', path: '/repository', icon: Database },
  ];

  if (role === 'admin') {
    navItems.push({ name: 'Admin', path: '/admin', icon: ShieldCheck });
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-6 mx-auto">
        <div className="flex items-center gap-10">
          <Link to="/dashboard" className="flex items-center gap-3 font-extrabold text-xl tracking-tighter uppercase">
            <div className="w-8 h-8 rounded bg-primary overflow-hidden flex items-center justify-center">
              <span className="text-black text-xs font-black">TX</span>
            </div>
            <span>Trade<span className="text-primary">X</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-semibold tracking-wide transition-colors hover:text-primary ${
                  location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="font-bold text-[10px] uppercase tracking-widest gap-2">
               <LogOut className="h-4 w-4" />
               Sign Out
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-card animate-in slide-in-from-top-2 duration-200">
          <div className="container px-6 py-6 space-y-4 mx-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors ${
                  location.pathname === item.path ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
            <div className="pt-4 border-t flex items-center justify-between">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={signOut} className="font-bold text-[10px] uppercase tracking-widest gap-2">
                 <LogOut className="h-4 w-4" />
                 Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function AuthWrapper() {
  const { user, profile, loading, forceSkipLoading } = useAuth();
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(false);

  useEffect(() => {
    let slowTimer: NodeJS.Timeout;
    let skipTimer: NodeJS.Timeout;
    if (loading) {
      slowTimer = setTimeout(() => {
        setShowSlowLoadMessage(true);
      }, 5000);
      skipTimer = setTimeout(() => {
        setShowSkipButton(true);
      }, 12000);
    }
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(skipTimer);
    };
  }, [loading]);
  
  if (loading) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center gap-6 p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-center space-y-1">
            <span className="text-sm text-muted-foreground font-bold tracking-widest uppercase">Syncing profile...</span>
            {showSlowLoadMessage && (
              <p className="text-[10px] text-primary animate-pulse font-medium max-w-xs mx-auto">
                Note: The database might be waking up or having connectivity issues.
              </p>
            )}
          </div>
        </div>

        {showSkipButton && (
          <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={forceSkipLoading}
               className="text-[10px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 h-8 px-6"
             >
               Skip & Enter Anyway
             </Button>
             <p className="text-[9px] text-muted-foreground italic text-center max-w-[200px]">
               Data may not be fully synced, but you can access the app.
             </p>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar role={profile?.role || null} />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<AuthWrapper />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/analytics" element={<Analytics />} />
          <Route path="/trade-journal" element={<TradeJournal />} />
          <Route path="/market" element={<MarketWatch />} />
          <Route path="/discipline" element={<Discipline />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/backtesting" element={<Backtesting />} />
          <Route path="/agentic-trading" element={<AgenticTrading />} />
          <Route path="/repository" element={<Repository />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </Router>
  );
}
