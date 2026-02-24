import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertCircle, LogOut, Loader, Globe, Zap, Link2, ShieldCheck, Database, Layout } from 'lucide-react';
import { integrationsService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTitle, SectionTitle, CardTitle, BodyText, MutedText } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';

type Platform = 'leetcode' | 'codeforces';

interface Integration {
  platform: Platform;
  username: string;
  connectionStatus: 'pending' | 'connected' | 'failed';
  bootstrapStatus: 'pending' | 'running' | 'completed' | 'failed';
  lastSyncAt: string | null;
  errorMessage: string | null;
  profile?: {
    totalSolved: number;
    acceptanceRate: number;
    lastFetchedAt: string;
  };
}

interface PlatformConfig {
  name: string;
  icon: string;
  description: string;
  color: string;
  glyph: any;
}

const platformConfigs: Record<Platform, PlatformConfig> = {
  leetcode: {
    name: 'LeetCode',
    icon: '🟡',
    description: 'Sync your algorithmic problem solving history and technical proficiency.',
    color: 'text-amber-500',
    glyph: Layout
  },
  codeforces: {
    name: 'Codeforces',
    icon: '🔵',
    description: 'Sync your competitive programming rank and submission telemetry.',
    color: 'text-indigo-500',
    glyph: Zap
  },
};

export default function Integrations() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [usernames, setUsernames] = useState<Record<Platform, string>>({ leetcode: '', codeforces: '' });

  useEffect(() => {
    fetchIntegrations();
  }, []);

  useEffect(() => {
    const hasSyncing = integrations.some((i) => i.bootstrapStatus === 'running' || i.bootstrapStatus === 'pending');
    if (!hasSyncing) return;
    const interval = setInterval(() => fetchIntegrations(), 2000);
    return () => clearInterval(interval);
  }, [integrations]);

  const fetchIntegrations = async () => {
    try {
      const response = await integrationsService.getStatus();
      if (response.data?.success) {
        setIntegrations(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: Platform) => {
    const username = usernames[platform].trim();
    if (!username) return;
    try {
      setConnecting(platform);
      const response = await integrationsService.connect(platform, username);
      if (response.data?.success) {
        toast({ title: 'Connection Initiated', description: response.data.message });
        setUsernames((prev) => ({ ...prev, [platform]: '' }));
        setTimeout(fetchIntegrations, 1500);
      }
    } catch (error: any) {
      toast({ title: 'Connection Failed', description: error.response?.data?.message || 'Failed to connect platform', variant: 'destructive' });
    } finally {
      setConnecting(null);
    }
  };

  const handleResync = async (platform: Platform) => {
    try {
      const response = await integrationsService.resync(platform);
      if (response.data?.success) {
        toast({ title: 'Resync Triggered', description: 'Re-evaluating problem set telemetry.' });
        setTimeout(fetchIntegrations, 1000);
      }
    } catch (error: any) {
      toast({ title: 'Resync Failed', description: 'Failed to initiate sync.', variant: 'destructive' });
    }
  };

  const handleDisconnect = async (platform: Platform) => {
    if (!window.confirm(`Terminate link with ${platformConfigs[platform].name}?`)) return;
    try {
      const response = await integrationsService.disconnect(platform);
      if (response.data?.success) {
        toast({ title: 'Link Terminated', description: 'External telemetry sync disabled.' });
        fetchIntegrations();
      }
    } catch (error: any) {
      toast({ title: 'Action Failed', description: 'Failed to disconnect.', variant: 'destructive' });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'NEVER';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' TODAY';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent shadow-glow" />
        <MutedText className="animate-pulse">Fetching bridge status...</MutedText>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-20 max-w-5xl">
      <motion.div variants={item}>
        <PageTitle>Data Bridges</PageTitle>
        <BodyText className="mt-1">Connect external platforms to feed your AI growth engine with real-world performance data.</BodyText>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {(Object.keys(platformConfigs) as Platform[]).map((platform) => {
          const integration = integrations.find((i) => i.platform === platform);
          const config = platformConfigs[platform];
          const isConnected = integration?.connectionStatus === 'connected';
          const isSyncing = integration?.bootstrapStatus === 'running';
          const hasFailed = integration?.connectionStatus === 'failed';

          return (
            <motion.div
              key={platform}
              variants={item}
              className="glass-card relative overflow-hidden p-8 bg-card border-border/60 shadow-premium transition-all hover:border-primary/20 group"
            >
              <div className={cn("absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110", config.color)}>
                 <config.glyph className="h-40 w-40" />
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner bg-muted/20 border border-border/40")}>
                       {config.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground tracking-tight">{config.name}</h3>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">Node Vector</p>
                    </div>
                  </div>
                  {isConnected && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-soft">
                       <ShieldCheck className="h-3 w-3 text-emerald-500" />
                       <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Linked</span>
                    </div>
                  )}
                </div>

                <BodyText className="text-sm opacity-70 mb-8 leading-relaxed font-medium">
                  {config.description}
                </BodyText>

                <div className="flex-1">
                  {isConnected ? (
                    <div className="space-y-6">
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                         <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-60">
                            <span>Identity</span>
                            <span className="text-foreground">@{integration.username}</span>
                         </div>
                         <div className="h-px bg-border/40" />
                         <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-60">
                            <span>Mastery Sync</span>
                            <span className="text-foreground">{formatDate(integration.lastSyncAt)}</span>
                         </div>
                      </div>

                      {integration.profile && (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 rounded-xl bg-primary/[0.02] border border-primary/10 text-center">
                              <p className="text-xl font-bold text-primary">{integration.profile.totalSolved}</p>
                              <p className="text-[9px] font-extrabold uppercase text-muted-foreground mt-1">Problems Indexed</p>
                           </div>
                           <div className="p-4 rounded-xl bg-primary/[0.02] border border-primary/10 text-center">
                              <p className="text-xl font-bold text-primary">{Math.round(integration.profile.acceptanceRate * 100)}%</p>
                              <p className="text-[9px] font-extrabold uppercase text-muted-foreground mt-1">Acceptance Rate</p>
                           </div>
                        </div>
                      )}

                      <AnimatePresence>
                        {isSyncing && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <Loader className="h-4 w-4 animate-spin text-indigo-500" />
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Active ingestion in progress...</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-3 pt-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest border-border hover:bg-muted"
                          onClick={() => handleResync(platform)}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={cn("h-3 w-3 mr-2", isSyncing && "animate-spin")} />
                          Refresh Bridge
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="flex-1 rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/5"
                          onClick={() => handleDisconnect(platform)}
                        >
                          <LogOut className="h-3 w-3 mr-2" />
                          Terminate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground/40">
                           <Globe className="h-4 w-4" />
                        </div>
                        <Input
                          placeholder={`ENTER ${config.name.toUpperCase()} HANDLE`}
                          className="h-14 pl-12 rounded-2xl bg-muted/30 border-border/40 text-xs font-bold uppercase tracking-widest focus-visible:ring-primary/20 placeholder:opacity-30"
                          value={usernames[platform]}
                          onChange={(e) => setUsernames({ ...prev => ({ ...prev, [platform]: e.target.value }) })}
                          disabled={!!connecting}
                        />
                      </div>

                      {hasFailed && (
                        <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-start gap-3">
                           <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                           <p className="text-[10px] font-bold text-rose-500/80 leading-relaxed uppercase">{integration.errorMessage || 'IDENTIFICATION FAILURE'}</p>
                        </div>
                      )}

                      <Button
                        className="w-full h-14 rounded-2xl bg-primary font-extrabold text-[10px] tracking-[0.2em] shadow-glow hover:shadow-primary/40 active:scale-95 transition-all"
                        onClick={() => handleConnect(platform)}
                        disabled={connecting === platform || !usernames[platform]}
                      >
                        {connecting === platform ? (
                          <><Loader className="h-4 w-4 mr-3 animate-spin" /> ESTABLISHING LINK...</>
                        ) : (
                          <><Link2 className="h-4 w-4 mr-3" /> ESTABLISH BRIDGE</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={item} className="p-8 rounded-3xl bg-muted/30 border border-border/50 relative overflow-hidden mt-12">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
           <Database className="h-32 w-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
           <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <Zap className="h-7 w-7 fill-current" />
           </div>
           <div>
              <SectionTitle className="text-xl">Unified Intelligence</SectionTitle>
              <BodyText className="mt-1 opacity-70">Linking your accounts allows the <span className="text-primary font-bold">PrepMate Core</span> to build a longitudinal study of your technical evolution. We use this to skip concepts you've already mastered and zero-in on your current bottleneck.</BodyText>
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
