import { motion } from 'framer-motion';
import { Moon, Sun, Bell, Shield, Trash2, User, Globe, Cpu, Smartphone, Zap, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { PageTitle, SectionTitle, CardTitle, BodyText, MutedText } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl space-y-10 pb-20">
      <motion.div variants={item}>
        <PageTitle>System Calibration</PageTitle>
        <BodyText className="mt-1 text-muted-foreground/80">Configure your neural interface and platform preferences.</BodyText>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Navigation Sidebar (Local to settings) */}
        <motion.div variants={item} className="space-y-2">
           {[
             { label: 'Surface Interface', icon: Sun, active: true },
             { label: 'Neural Sync', icon: Bell, active: false },
             { label: 'Security Protocols', icon: Shield, active: false },
             { label: 'System Telemetry', icon: Cpu, active: false },
           ].map((nav, i) => (
             <button 
               key={i}
               className={cn(
                 "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all",
                 nav.active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-muted hover:text-foreground"
               )}
             >
               <nav.icon className="h-4 w-4" />
               {nav.label}
             </button>
           ))}
        </motion.div>

        {/* Settings Content */}
        <div className="md:col-span-2 space-y-8">
          {/* Theme */}
          <motion.div variants={item} className="glass-card p-8 bg-card border-border/60 shadow-premium">
            <div className="flex items-center gap-3 mb-6">
               <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                 <Sparkles className="h-5 w-5" />
               </div>
               <div>
                  <SectionTitle className="text-lg">Surface Interface</SectionTitle>
                  <MutedText className="text-[10px] uppercase font-bold tracking-widest">Visual Modulation</MutedText>
               </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => theme !== 'light' && toggleTheme()}
                className={cn(
                  "flex-1 group relative overflow-hidden rounded-2xl border p-6 text-center transition-all duration-300",
                  theme === 'light' ? "border-primary bg-primary/[0.03] shadow-premium" : "border-border bg-muted/20 hover:border-primary/40"
                )}
              >
                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-5 transition-opacity bg-primary")} />
                <Sun className={cn("mx-auto h-8 w-8 mb-3 transition-transform group-hover:scale-110", theme === 'light' ? "text-primary fill-primary/10" : "text-muted-foreground/40")} />
                <h4 className={cn("text-xs font-bold uppercase tracking-widest", theme === 'light' ? "text-foreground" : "text-muted-foreground")}>Solar Protocol</h4>
                <p className="text-[10px] mt-1 text-muted-foreground/60">High contrast day-mode</p>
              </button>

              <button
                onClick={() => theme !== 'dark' && toggleTheme()}
                className={cn(
                  "flex-1 group relative overflow-hidden rounded-2xl border p-6 text-center transition-all duration-300",
                  theme === 'dark' ? "border-primary bg-primary/[0.03] shadow-premium" : "border-border bg-muted/20 hover:border-primary/40"
                )}
              >
                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-primary")} />
                <Moon className={cn("mx-auto h-8 w-8 mb-3 transition-transform group-hover:scale-110", theme === 'dark' ? "text-primary fill-primary/10" : "text-muted-foreground/40")} />
                <h4 className={cn("text-xs font-bold uppercase tracking-widest", theme === 'dark' ? "text-foreground" : "text-muted-foreground")}>Lunar Protocol</h4>
                <p className="text-[10px] mt-1 text-muted-foreground/60">Optimized night-vision</p>
              </button>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div variants={item} className="glass-card p-8 bg-card border-border/60 shadow-premium">
            <div className="flex items-center gap-3 mb-8">
               <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                 <Bell className="h-5 w-5" />
               </div>
               <div>
                  <SectionTitle className="text-lg">Neural Sync</SectionTitle>
                  <MutedText className="text-[10px] uppercase font-bold tracking-widest">Feedback Channels</MutedText>
               </div>
            </div>

            <div className="space-y-6">
              {[
                { title: 'Evolution Reminders', desc: 'Alerts for scheduled mission starts', icon: Zap },
                { title: 'Retention Alerts', desc: 'Critical notifications for decaying knowledge nodes', icon: History },
                { title: 'Telemetry Reports', desc: 'Weekly deep-dive performance analysis', icon: Globe }
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                     <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <n.icon className="h-4 w-4" />
                     </div>
                     <div>
                       <h5 className="text-sm font-bold text-foreground">{n.title}</h5>
                       <p className="text-[10px] text-muted-foreground font-medium leading-none mt-1">{n.desc}</p>
                     </div>
                  </div>
                  <Switch defaultChecked={i < 2} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Critical Systems */}
          <motion.div variants={item} className="glass-card p-8 bg-card border-border/60 shadow-premium">
            <div className="flex items-center gap-3 mb-8">
               <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                 <Shield className="h-5 w-5" />
               </div>
               <div>
                  <SectionTitle className="text-lg text-rose-500/90">Identity Encryption</SectionTitle>
                  <MutedText className="text-[10px] uppercase font-bold tracking-widest text-rose-500/40">Destructive Actions</MutedText>
               </div>
            </div>

            <div className="space-y-4">
              <Button variant="outline" className="w-full h-12 rounded-xl justify-between px-6 border-border hover:bg-muted text-xs font-bold uppercase tracking-widest group">
                Rotate Secret Key
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 group-hover:animate-pulse" />
              </Button>
              <Button variant="ghost" className="w-full h-12 rounded-xl justify-between px-6 text-rose-500 hover:bg-rose-500/5 hover:text-rose-600 text-[10px] font-extrabold uppercase tracking-[0.2em]">
                <div className="flex items-center gap-2">
                   <Trash2 className="h-4 w-4" /> Purge System Identity
                </div>
                <div className="text-[9px] font-mono opacity-40">IRREVERSIBLE</div>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
