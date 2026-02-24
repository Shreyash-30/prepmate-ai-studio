import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, User, Settings, LogOut, ChevronDown, Search } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/api';
import { cn } from '@/lib/utils';

export default function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      toast({
        title: 'Logged out successfully',
        description: 'See you again soon!',
      });
      navigate('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-background/60 backdrop-blur-md px-6 md:px-8">
      <div className="flex items-center gap-6">
        <div className="hidden md:flex relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input 
            type="text" 
            placeholder="Search problems or skills..." 
            className="h-10 w-64 rounded-xl border border-border bg-muted/50 pl-10 pr-4 text-sm outline-none ring-primary/20 transition-all focus:ring-4 focus:bg-background focus:border-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-300 shadow-sm"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-300 shadow-sm">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
        </button>

        <div className="h-8 w-px bg-border mx-1" />

        {/* Avatar dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 rounded-xl p-1.5 pl-2 hover:bg-muted transition-all duration-300 shadow-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold shadow-inner">
              S
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-foreground">Shreyash</p>
              <p className="text-[10px] text-muted-foreground font-medium">Pro Member</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", dropdownOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-border bg-popover/90 backdrop-blur-sm p-1.5 shadow-premium"
              >
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Account</p>
                </div>
                <button
                  onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <User className="h-4 w-4 transition-transform group-hover:scale-110" /> Profile
                </button>
                <button
                  onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <Settings className="h-4 w-4 transition-transform group-hover:rotate-45" /> Settings
                </button>
                <div className="my-1.5 h-px bg-border/50 mx-1" />
                <button
                  onClick={() => { setDropdownOpen(false); handleLogout(); }}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-all group disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 transition-transform group-hover:translate-x-1" /> {loggingOut ? 'Logging out...' : 'Log out'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
