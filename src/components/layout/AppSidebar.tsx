import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Code2,
  RotateCcw,
  Mic,
  CalendarCheck,
  Plug,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Practice', path: '/practice', icon: Code2 },
  { title: 'Revision', path: '/revision', icon: RotateCcw },
  { title: 'Mock Interview', path: '/mock-interview', icon: Mic },
  { title: 'Planner', path: '/planner', icon: CalendarCheck },
  { title: 'Integrations', path: '/integrations', icon: Plug },
  { title: 'Settings', path: '/settings', icon: Settings },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex h-screen flex-col border-r border-border bg-sidebar z-20"
    >
      {/* Logo */}
      <div className="flex h-20 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-lg font-bold text-foreground tracking-tight whitespace-nowrap"
              >
                PrepMate <span className="text-primary italic">AI</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1.5 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm shadow-sm"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-all duration-300 z-10',
                  isActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap overflow-hidden z-10"
                  >
                    {item.title}
                  </motion.span>
                )}
              </AnimatePresence>

              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-[-24px] h-6 w-1 rounded-r-full bg-primary shadow-[0_0_15px_rgba(79,70,229,0.5)] z-10"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-4 border-t border-border mt-auto">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-300 shadow-sm"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </motion.aside>
  );
}
