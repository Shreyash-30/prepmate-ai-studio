import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dashboardService } from '@/services/api';
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Clock,
  Flame,
  Zap,
  ArrowUpRight,
} from 'lucide-react';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <motion.div variants={item} className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-4 text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 text-xs text-success">{sub}</p>}
    </motion.div>
  );
}

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={item} className="glass-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </motion.div>
  );
}

function getLevelColor(level: number) {
  if (level >= 80) return 'bg-success/20 text-success';
  if (level >= 60) return 'bg-primary/20 text-primary';
  if (level >= 40) return 'bg-warning/20 text-warning';
  return 'bg-destructive/20 text-destructive';
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
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your preparation overview at a glance</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          icon={CheckCircle2} 
          label="Problems Solved" 
          value={stats?.problemsSolved || 0} 
          sub={stats?.recentSolved ? `+${stats.recentSolved} this week` : undefined} 
          color="bg-success/10 text-success" 
        />
        <StatCard 
          icon={Target} 
          label="Readiness Score" 
          value={`${stats?.readinessScore || 0}%`} 
          sub={stats?.readinessDelta ? `${stats.readinessDelta >= 0 ? '+' : ''}${stats.readinessDelta}% from last week` : undefined} 
          color="bg-primary/10 text-primary" 
        />
        <StatCard 
          icon={Flame} 
          label="Practice Streak" 
          value={`${stats?.streak || 0} days`} 
          color="bg-warning/10 text-warning" 
        />
        <StatCard 
          icon={BarChart3} 
          label="Platforms Synced" 
          value={`${stats?.platformsSynced || 0}/${stats?.platformsTotal || 2}`} 
          color="bg-chart-4/10 text-chart-4" 
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Mastery Heatmap */}
        <PanelCard title="Topic Mastery">
          <div className="space-y-2.5">
            {heatmapData.length > 0 ? heatmapData.map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="w-24 text-xs text-muted-foreground truncate capitalize">{t.topic}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${t.level}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className={`h-full rounded-full ${t.level >= 80 ? 'bg-success' : t.level >= 60 ? 'bg-primary' : t.level >= 40 ? 'bg-warning' : 'bg-destructive'}`}
                  />
                </div>
                <span className="w-10 text-right text-xs font-medium text-foreground">{t.level}%</span>
              </div>
            )) : (
              <div className="py-8 text-center text-xs text-muted-foreground">No mastery data yet. Start practicing!</div>
            )}
          </div>
        </PanelCard>

        {/* Weak Topics */}
        <PanelCard title="Weak Topic Alerts">
          <div className="space-y-3">
            {weakTopics.length > 0 ? weakTopics.map((w) => (
              <div key={w.topic} className="flex items-start gap-3 rounded-md bg-accent/50 p-3">
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${w.priority === 'high' ? 'text-destructive' : w.priority === 'medium' ? 'text-warning' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{w.topic}</p>
                  <p className="text-xs text-muted-foreground">{w.reason}</p>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-xs text-muted-foreground">No weak topics identified. Keep it up!</div>
            )}
          </div>
        </PanelCard>

        {/* Today's Tasks */}
        <PanelCard title="Today's Tasks">
          <div className="space-y-2">
            {todayTasks.length > 0 ? todayTasks.map((t, i) => (
              <label key={i} className="flex items-center gap-3 rounded-md p-2 hover:bg-accent/50 transition-colors cursor-pointer">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${t.done ? 'border-success bg-success/10' : 'border-border'}`}>
                  {t.done && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                </div>
                <span className={`text-sm ${t.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{t.label}</span>
              </label>
            )) : (
              <div className="py-8 text-center text-xs text-muted-foreground">No tasks scheduled for today.</div>
            )}
          </div>
        </PanelCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Performance Trend */}
        <PanelCard title="Readiness Evolution">
          <div className="flex items-end gap-3 h-32">
            {trendData.length > 0 ? trendData.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${d.score}%` }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="w-full rounded-t-sm bg-primary/80"
                />
                <span className="text-[10px] text-muted-foreground">{d.week}</span>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Insufficient data for trend.</div>
            )}
          </div>
        </PanelCard>

        {/* Readiness per company */}
        <PanelCard title="Company Readiness">
          <div className="space-y-3">
            {readinessScores.length > 0 ? readinessScores.map((c) => (
              <div key={c.company} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{c.company}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.score}%` }}
                      transition={{ duration: 0.6 }}
                      className={`h-full rounded-full ${c.score >= 75 ? 'bg-success' : c.score >= 50 ? 'bg-primary' : 'bg-warning'}`}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${getLevelColor(c.score)} px-2 py-0.5 rounded`}>{c.score}%</span>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-xs text-muted-foreground">Target companies not set or no data.</div>
            )}
          </div>
        </PanelCard>
      </div>
    </motion.div>
  );
}
