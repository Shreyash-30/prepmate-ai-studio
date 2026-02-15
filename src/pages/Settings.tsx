import { motion } from 'framer-motion';
import { Moon, Sun, Bell, Shield, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Customize your experience</p>
      </div>

      {/* Theme */}
      <div className="glass-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Appearance
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            className={`flex-1 rounded-lg border p-4 text-center text-sm transition-colors ${theme === 'light' ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/50'}`}
          >
            <Sun className="mx-auto h-5 w-5 mb-1" /> Light
          </button>
          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            className={`flex-1 rounded-lg border p-4 text-center text-sm transition-colors ${theme === 'dark' ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/50'}`}
          >
            <Moon className="mx-auto h-5 w-5 mb-1" /> Dark
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4"><Bell className="h-4 w-4" /> Notifications</h3>
        <div className="space-y-3">
          {['Daily task reminders', 'Revision due alerts', 'Weekly progress report'].map((n) => (
            <label key={n} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{n}</span>
              <div className="relative h-5 w-9 rounded-full bg-primary/20 cursor-pointer">
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-primary transition-transform translate-x-4" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="glass-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4"><Shield className="h-4 w-4" /> Account</h3>
        <div className="space-y-3">
          <button className="text-sm text-foreground hover:text-primary transition-colors">Change password</button>
          <div className="h-px bg-border" />
          <button className="flex items-center gap-2 text-sm text-destructive hover:underline">
            <Trash2 className="h-3.5 w-3.5" /> Delete account
          </button>
        </div>
      </div>
    </motion.div>
  );
}
