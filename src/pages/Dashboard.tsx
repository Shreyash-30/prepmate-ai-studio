import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dashboardService } from '@/services/api';
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Flame,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { PageTitle, SectionTitle, CardTitle, BodyText, MutedText } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as any } },
};

function StatCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; trend?: string;
}) {
  return (
    <motion.div variants={item} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-premium hover:-translate-y-1">
      <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl shadow-inner", color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <MutedText className="text-xs uppercase tracking-wider">{label}</MutedText>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-foreground">{value}</h3>
            {trend && <span className="text-xs font-bold text-success">{trend}</span>}
          </div>
        </div>
      </div>
      {sub && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-success" />
            {sub}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function PanelCard({ title, children, icon: Icon, className }: { title: string; children: React.ReactNode; icon?: React.ElementType; className?: string }) {
  return (
    <motion.div variants={item} className={cn("rounded-2xl border border-border bg-card shadow-soft p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <SectionTitle className="text-lg">{title}</SectionTitle>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [readinessScores, setReadinessScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          statsResp,
          heatmapResp,
          weakTopicsResp,
          tasksResp,
          trendResp,
          readinessResp
        ] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getMasteryHeatmap(),
          dashboardService.getWeakTopics(),
          dashboardService.getTodayTasks(),
          dashboardService.getPerformanceTrend(),
          dashboardService.getReadinessScore()
        ]);

        setStats(statsResp.data.data);
        setHeatmapData(heatmapResp.data.data);
        setWeakTopics(weakTopicsResp.data.data);
        setTodayTasks(tasksResp.data.data);
        setTrendData(trendResp.data.data);
        setReadinessScores(readinessResp.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary border-t-transparent shadow-glow" />
        <MutedText className="animate-pulse">Loading personalized insights...</MutedText>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <PageTitle>Personal Workspace</PageTitle>
          <BodyText className="mt-1">Analyze your progress and focus on high-impact areas.</BodyText>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
          <Zap className="h-3 w-3 text-warning" />
          ADAPTIVE SYSTEM ACTIVE
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          icon={CheckCircle2} 
          label="Average Mastery" 
          value={`${stats?.averageMastery || 0}%`} 
          sub={stats?.recentSolved ? `${stats.recentSolved} solved recently` : "Steady improvement"} 
          color="bg-emerald-500/10 text-emerald-500" 
        />
        <StatCard 
          icon={Target} 
          label="Overall Readiness" 
          value={`${stats?.readinessScore || 0}%`} 
          sub={stats?.problemsSolved ? `${stats.problemsSolved} Total Problems Solved` : "Targeting top-tier"} 
          color="bg-indigo-500/10 text-indigo-500" 
        />
        <StatCard 
          icon={Flame} 
          label="Focus Streak" 
          value={`${stats?.streak || 0} Days`} 
          sub="Consistency is key" 
          color="bg-amber-500/10 text-amber-500" 
        />
        <StatCard 
          icon={BarChart3} 
          label="Platform sync" 
          value={`${stats?.platformsSynced || 0}/8`} 
          sub="Platform integrations" 
          color="bg-cyan-500/10 text-cyan-500" 
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Mastery Heatmap */}
        <PanelCard title="Topic Mastery" className="lg:col-span-1">
          <div className="space-y-4">
            {heatmapData.length > 0 ? heatmapData.map((t) => (
              <div key={t.topic} className="group relative">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="capitalize text-xs font-bold text-foreground/80">{t.topic}</CardTitle>
                  <span className="text-[10px] font-bold text-muted-foreground">{t.level}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${t.level}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full transition-all",
                      t.level >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 
                      t.level >= 60 ? 'bg-indigo-500' : 
                      t.level >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                    )}
                  />
                </div>
              </div>
            )) : (
              <div className="py-12 text-center">
                <MutedText>No mastery data detected yet.</MutedText>
              </div>
            )}
          </div>
        </PanelCard>

        {/* Weak Topics */}
        <PanelCard title="High Risk Alerts" className="lg:col-span-1 border-rose-500/20 bg-rose-500/[0.02]">
          <div className="space-y-4">
            {weakTopics.length > 0 ? weakTopics.map((w) => (
              <div key={w.topic} className="group flex items-start gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-rose-500/30 hover:shadow-md">
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  w.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                )}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="capitalize text-sm">{w.topic}</CardTitle>
                  <BodyText className="text-xs mt-0.5 leading-snug">{w.reason}</BodyText>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center text-emerald-500">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <MutedText className="text-emerald-500/80">No risks identified. Excellent!</MutedText>
              </div>
            )}
          </div>
        </PanelCard>

        {/* Today's Tasks */}
        <PanelCard title="Daily Focus" className="lg:col-span-1">
          <div className="space-y-1">
            {todayTasks.length > 0 ? todayTasks.map((t, i) => (
              <label key={i} className="group flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-all cursor-pointer border border-transparent hover:border-border/50">
                <div className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all duration-300",
                  t.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-background'
                )}>
                  {t.done && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <span className={cn(
                  "text-sm font-medium transition-all",
                  t.done ? 'text-muted-foreground line-through opacity-60' : 'text-foreground hover:translate-x-1'
                )}>
                  {t.label}
                </span>
              </label>
            )) : (
              <div className="py-12 text-center">
                <MutedText>Relax! No scheduled tasks.</MutedText>
              </div>
            )}
          </div>
        </PanelCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Performance Trend */}
        <PanelCard title="Growth Evolution" className="lg:col-span-2">
          <div className="flex items-end gap-3 h-48 mt-4">
            {trendData.length > 0 ? trendData.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-3 group">
                <div className="relative w-full h-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${d.score}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="w-full rounded-t-xl bg-gradient-to-t from-primary/80 to-primary shadow-glow group-hover:from-primary group-hover:to-primary transition-all"
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <span className="text-[10px] font-bold bg-foreground text-background px-1.5 py-0.5 rounded">{d.score}%</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{d.week}</span>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center py-20">
                <MutedText>Insufficient telemetry for trend mapping.</MutedText>
              </div>
            )}
          </div>
        </PanelCard>

        {/* Readiness per company */}
        <PanelCard title="Target Pipeline" className="lg:col-span-1">
          <div className="space-y-5">
            {readinessScores.length > 0 ? readinessScores.map((c) => (
              <div key={c.company} className="group flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">{c.company}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Tier 1 Alpha</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.score}%` }}
                      transition={{ duration: 1 }}
                      className={cn(
                        "h-full rounded-full transition-all",
                        c.score >= 75 ? 'bg-emerald-500' : 'bg-indigo-500'
                      )}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm",
                    c.score >= 75 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                    c.score >= 50 ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 
                    'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  )}>
                    {c.score}%
                  </span>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center">
                <MutedText>Connect platforms to sync readiness.</MutedText>
              </div>
            )}
          </div>
        </PanelCard>
      </div>
    </motion.div>
  );
}
