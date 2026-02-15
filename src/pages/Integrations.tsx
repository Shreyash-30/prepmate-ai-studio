import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertCircle, LogOut, Loader } from 'lucide-react';
import { integrationsService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
}

const platformConfigs: Record<Platform, PlatformConfig> = {
  leetcode: {
    name: 'LeetCode',
    icon: '🟡',
    description: 'Sync your LeetCode problems and progress',
  },
  codeforces: {
    name: 'Codeforces',
    icon: '🔵',
    description: 'Sync your Codeforces submissions and rating',
  },
};

export default function Integrations() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [usernames, setUsernames] = useState<Record<Platform, string>>({ leetcode: '', codeforces: '' });

  // Fetch integration status on component mount
  useEffect(() => {
    fetchIntegrations();
  }, []);

  // Auto-refresh integrations while any are syncing
  useEffect(() => {
    const hasSyncing = integrations.some((i) => i.bootstrapStatus === 'running' || i.bootstrapStatus === 'pending');
    
    if (!hasSyncing) return;

    const interval = setInterval(() => {
      fetchIntegrations();
    }, 1500); // Poll every 1.5 seconds

    return () => clearInterval(interval);
  }, [integrations]);

  const fetchIntegrations = async () => {
    try {
      console.log('[Frontend] Fetching integrations status...');
      if (!loading) setLoading(true);
      
      const response = await integrationsService.getStatus();
      console.log('[Frontend] Integration status response:', response.data);
      
      if (response.data?.success) {
        const data = response.data.data || [];
        console.log(`[Frontend] Integrations updated: ${data.length} items`);
        setIntegrations(data);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch status');
      }
    } catch (error: any) {
      console.error('[Frontend] Failed to fetch integrations:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch status';
      // Only show error toast if not initial load
      if (integrations.length > 0 || error.response?.status !== 401) {
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: Platform) => {
    const username = usernames[platform].trim();

    if (!username) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a username',
        variant: 'destructive',
      });
      return;
    }

    try {
      setConnecting(platform);
      console.log(`[Frontend] Attempting to connect ${platform} with username: ${username}`);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      console.log(`[Frontend] Using token: ${token.substring(0, 20)}...`);
      
      const response = await integrationsService.connect(platform, username);
      console.log(`[Frontend] Connect response:`, response);

      if (response.data?.success) {
        console.log(`[Frontend] Connection initiated successfully`);
        toast({
          title: 'Success',
          description: response.data.message,
        });
        setUsernames((prev) => ({ ...prev, [platform]: '' }));
        // Fetch updated integrations after a short delay
        setTimeout(fetchIntegrations, 1500);
      } else {
        throw new Error(response.data?.message || 'Unknown error');
      }
    } catch (error: any) {
      console.error('[Frontend] Connection failed:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to connect platform';
      toast({
        title: 'Connection Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleResync = async (platform: Platform) => {
    try {
      const response = await integrationsService.resync(platform);

      if (response.data?.success) {
        toast({
          title: 'Resync Started',
          description: response.data.message,
        });
        // Fetch updated integrations after a delay
        setTimeout(fetchIntegrations, 1500);
      }
    } catch (error: any) {
      console.error('Resync failed:', error);
      toast({
        title: 'Resync Failed',
        description: error.response?.data?.message || 'Failed to resync',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async (platform: Platform) => {
    if (!window.confirm(`Are you sure you want to disconnect from ${platformConfigs[platform].name}?`)) {
      return;
    }

    try {
      const response = await integrationsService.disconnect(platform);

      if (response.data?.success) {
        toast({
          title: 'Disconnected',
          description: response.data.message,
        });
        fetchIntegrations();
      }
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      toast({
        title: 'Disconnect Failed',
        description: error.response?.data?.message || 'Failed to disconnect',
        variant: 'destructive',
      });
    }
  };

  const getIntegration = (platform: Platform) => {
    return integrations.find((i) => i.platform === platform);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-96 items-center justify-center"
      >
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground">Connect and manage your coding platform accounts</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {(Object.keys(platformConfigs) as Platform[]).map((platform) => {
          const integration = getIntegration(platform);
          const config = platformConfigs[platform];
          const isConnected = integration?.connectionStatus === 'connected';
          const isSyncing = integration?.bootstrapStatus === 'running';
          const hasFailed = integration?.connectionStatus === 'failed';

          return (
            <motion.div
              key={platform}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{config.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{config.name}</h3>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                </div>
              </div>

              {isConnected ? (
                <div className="space-y-4">
                  {/* Connected Status */}
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Connected</p>
                      <p className="text-xs text-muted-foreground">@{integration.username}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  {integration.profile && (
                    <div className="rounded-lg bg-sidebar py-3 px-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Problems Solved:</span>
                        <span className="font-medium text-foreground">{integration.profile.totalSolved}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Last Synced:</span>
                        <span className="font-medium text-foreground">{formatDate(integration.lastSyncAt)}</span>
                      </div>
                    </div>
                  )}

                  {/* Sync Status */}
                  {isSyncing && (
                    <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 py-2 px-3">
                      <Loader className="h-4 w-4 animate-spin text-blue-500" />
                      <p className="text-xs font-medium text-blue-500">Syncing in progress...</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleResync(platform)}
                      disabled={isSyncing}
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Resync
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => handleDisconnect(platform)}
                    >
                      <LogOut className="h-3 w-3 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Disconnected Status */}
                  <div className="flex items-center gap-2">
                    {hasFailed ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className="text-sm font-medium text-muted-foreground">
                      {hasFailed ? 'Connection Failed' : 'Not Connected'}
                    </p>
                  </div>

                  {/* Error Message */}
                  {hasFailed && integration.errorMessage && (
                    <div className="rounded-lg bg-red-500/10 py-2 px-3">
                      <p className="text-xs text-red-600">{integration.errorMessage}</p>
                    </div>
                  )}

                  {/* Username Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Username</label>
                    <Input
                      placeholder={`Enter ${config.name} username`}
                      value={usernames[platform]}
                      onChange={(e) =>
                        setUsernames((prev) => ({
                          ...prev,
                          [platform]: e.target.value,
                        }))
                      }
                      disabled={connecting === platform}
                    />
                  </div>

                  {/* Connect Button */}
                  <Button
                    className="w-full"
                    onClick={() => handleConnect(platform)}
                    disabled={connecting === platform}
                  >
                    {connecting === platform ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Account'
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
