import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Building2, Calendar, Save, Link as LinkIcon } from 'lucide-react';

export default function Profile() {
  const [name, setName] = useState('Alex Johnson');
  const [email] = useState('alex@example.com');
  const [companies, setCompanies] = useState('Google, Amazon, Meta');
  const [timeline, setTimeline] = useState('3 months');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account information</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
            AJ
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground"><User className="h-3.5 w-3.5" /> Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground"><Mail className="h-3.5 w-3.5" /> Email</label>
            <input value={email} readOnly className="mt-1.5 w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground"><Building2 className="h-3.5 w-3.5" /> Target Companies</label>
            <input value={companies} onChange={(e) => setCompanies(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground"><Calendar className="h-3.5 w-3.5" /> Preparation Timeline</label>
            <input value={timeline} onChange={(e) => setTimeline(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        {/* Linked platforms */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground mb-3"><LinkIcon className="h-3.5 w-3.5" /> Linked Platforms</h3>
          <div className="flex flex-wrap gap-2">
            {['LeetCode', 'Codeforces', 'GeeksforGeeks'].map((p) => (
              <span key={p} className="rounded-full bg-accent px-3 py-1 text-xs text-foreground">{p}</span>
            ))}
          </div>
        </div>

        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Save className="h-4 w-4" /> Save Changes
        </button>
      </div>
    </motion.div>
  );
}
