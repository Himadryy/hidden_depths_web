'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  IndianRupee, 
  Loader2, 
  TrendingUp, 
  Clock,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Stats {
  total_bookings: number;
  upcoming_bookings: number;
  estimated_revenue: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

        if (!apiUrl || !token) {
          throw new Error('API Configuration missing');
        }

        const res = await fetch(`${apiUrl}/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.status === 403) {
          setError('Access Denied: You are not authorized as an admin.');
          return;
        }

        if (!res.ok) throw new Error('Failed to fetch stats');

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Admin API error:', err);
        setError('Failed to connect to the backend server.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-theme p-6">
        <h1 className="text-2xl font-serif mb-4">Restricted Area</h1>
        <p className="text-muted mb-8 text-center max-w-md">{error}</p>
        <button 
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-[var(--accent)] text-[var(--background)] rounded-full text-xs font-bold uppercase tracking-widest"
        >
          Return to Sanctuary
        </button>
      </div>
    );
  }

  const statCards = [
    { 
      label: 'Total Sessions', 
      value: stats?.total_bookings || 0, 
      icon: Users, 
      color: 'text-blue-400' 
    },
    { 
      label: 'Upcoming', 
      value: stats?.upcoming_bookings || 0, 
      icon: Calendar, 
      color: 'text-green-400' 
    },
    { 
      label: 'Est. Revenue', 
      value: `₹${stats?.estimated_revenue || 0}`, 
      icon: IndianRupee, 
      color: 'text-[var(--accent)]' 
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-theme pt-32 px-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-2">
              <LayoutDashboard size={14} />
              Admin Portal
            </div>
            <h1 className="font-serif text-4xl">Dashboard Overview</h1>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="self-start px-6 py-3 border border-glass rounded-full text-xs font-bold uppercase tracking-widest hover:border-[var(--accent)] transition-all flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Exit Admin
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-glass border border-glass p-8 rounded-3xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <card.icon size={64} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted mb-4">{card.label}</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-serif ${card.color}`}>{card.value}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Secondary Info Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-glass border border-glass p-8 rounded-3xl space-y-6">
            <h3 className="font-serif text-2xl flex items-center gap-3">
              <TrendingUp className="text-[var(--accent)]" size={20} />
              Quick Actions
            </h3>
            <div className="space-y-4">
              <button 
                onClick={() => router.push('/admin/insights')}
                className="w-full flex items-center justify-between p-4 bg-[var(--background)] rounded-2xl border border-glass hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={18} className="text-[var(--accent)]" />
                  <span className="text-sm">Manage Insights CMS</span>
                </div>
                <ArrowLeft size={16} className="rotate-180" />
              </button>
              <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-2xl border border-glass">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-muted" />
                  <span className="text-sm">Peak Booking Time</span>
                </div>
                <span className="text-sm font-bold">08:00 PM</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-2xl border border-glass">
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-muted" />
                  <span className="text-sm">New Users (Last 7 Days)</span>
                </div>
                <span className="text-sm font-bold">...</span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-glass border border-glass p-8 rounded-3xl space-y-6">
            <h3 className="font-serif text-2xl">System Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20">
                <p className="text-[10px] uppercase font-bold text-green-500 mb-1">Go Backend</p>
                <p className="text-lg font-serif">Online</p>
              </div>
              <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20">
                <p className="text-[10px] uppercase font-bold text-green-500 mb-1">Database</p>
                <p className="text-lg font-serif">Connected</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
