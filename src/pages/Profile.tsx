import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Building2, Calendar, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/api';

interface PlatformProfile {
  connected: boolean;
  username: string | null;
  totalSolved: number;
  acceptanceRate?: number;
  ranking: number;
  badges: string[];
  lastSyncedAt: string | null;
  contestRating?: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  targetCompanies: string;
  preparationTimeline: string;
  role: string;
  totalProblemsCount: number;
  platformProfiles: {
    leetcode: PlatformProfile;
    codeforces: PlatformProfile;
  };
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companies, setCompanies] = useState('');
  const [timeline, setTimeline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load user profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr) as UserProfile;
        setName(user.name);
        setEmail(user.email);
        setCompanies(user.targetCompanies || '');
        setTimeline(user.preparationTimeline || '');
      }

      const response = await authService.getProfile();
      const userData = response.data.user as UserProfile;
      setProfile(userData);
      setName(userData.name);
      setEmail(userData.email);
      setCompanies(userData.targetCompanies || '');
      setTimeline(userData.preparationTimeline || '');
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await authService.updateProfile({
        name,
        targetCompanies: companies,
        preparationTimeline: timeline,
      });

      const updatedUser = response.data.user as UserProfile;
      setProfile(prev => prev ? { ...prev, ...updatedUser } : null);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-6">
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Failed to load profile</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account information and view coding statistics</p>
      </div>

      {/* Main Profile Card */}
      <div className="glass-card p-6 space-y-6">
        {/* Avatar and Basic Info */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
            {getInitials(name)}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        {/* Profile Fields */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-3.5 w-3.5" /> Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="h-3.5 w-3.5" /> Email
            </label>
            <input
              value={email}
              readOnly
              className="mt-1.5 w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Building2 className="h-3.5 w-3.5" /> Target Companies
            </label>
            <input
              value={companies}
              onChange={(e) => setCompanies(e.target.value)}
              disabled={saving}
              placeholder="e.g., Google, Amazon, Meta"
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="h-3.5 w-3.5" /> Preparation Timeline
            </label>
            <input
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              disabled={saving}
              placeholder="e.g., 3 months"
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Coding Statistics & Platform Status */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Coding Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-accent/50">
            <p className="text-xs text-muted-foreground mb-1">Total Problems Solved</p>
            <p className="text-2xl font-bold text-primary">{profile.totalProblemsCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-accent/50">
            <p className="text-xs text-muted-foreground mb-1">LeetCode</p>
            <p className="text-2xl font-bold text-primary">{profile.platformProfiles.leetcode.totalSolved}</p>
            <p className="text-xs text-muted-foreground mt-1">{profile.platformProfiles.leetcode.connected ? '✓ Connected' : '○ Not connected'}</p>
          </div>
          <div className="p-4 rounded-lg bg-accent/50">
            <p className="text-xs text-muted-foreground mb-1">Codeforces</p>
            <p className="text-2xl font-bold text-primary">{profile.platformProfiles.codeforces.totalSolved}</p>
            <p className="text-xs text-muted-foreground mt-1">{profile.platformProfiles.codeforces.connected ? '✓ Connected' : '○ Not connected'}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          📌 To connect platforms or update your account settings, visit the <a href="/integrations" className="text-primary hover:underline">Integrations</a> page.
        </p>
      </div>
    </motion.div>
  );
}
