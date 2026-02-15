import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

const platforms = [
  { id: 'leetcode', name: 'LeetCode', connected: true, lastSync: '2 hours ago', solved: 185, icon: '🟡' },
  { id: 'codeforces', name: 'Codeforces', connected: true, lastSync: '1 day ago', solved: 42, icon: '🔵' },
  { id: 'hackerrank', name: 'HackerRank', connected: false, lastSync: null, solved: 0, icon: '🟢' },
  { id: 'gfg', name: 'GeeksforGeeks', connected: true, lastSync: '3 hours ago', solved: 20, icon: '🟤' },
];

export default function Integrations() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground">Connect your coding platforms</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {platforms.map((p) => (
          <div key={p.id} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {p.connected ? (
                      <CheckCircle2 className="h-3 w-3 text-success" />
                    ) : (
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">{p.connected ? 'Connected' : 'Not connected'}</span>
                  </div>
                </div>
              </div>
            </div>

            {p.connected ? (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Last synced: {p.lastSync}</span>
                  <span>{p.solved} problems</span>
                </div>
                <button className="w-full flex items-center justify-center gap-2 rounded-md border border-border py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors">
                  <RefreshCw className="h-3 w-3" /> Sync Now
                </button>
              </div>
            ) : (
              <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <ExternalLink className="h-3 w-3" /> Connect
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
