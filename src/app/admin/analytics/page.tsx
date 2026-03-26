'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Calendar,
  Users,
  IndianRupee,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  bookingsByDay: { date: string; count: number }[];
  bookingsByTime: { time: string; count: number }[];
  recentBookings: { date: string; time: string; status: string }[];
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('date, time, payment_status, created_at')
        .eq('payment_status', 'confirmed')
        .gte('date', startDateStr);

      if (bookingsError) throw bookingsError;

      // Fetch user count
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Process bookings by day
      const byDay: Record<string, number> = {};
      const byTime: Record<string, number> = {};
      
      bookings?.forEach(booking => {
        // By day
        byDay[booking.date] = (byDay[booking.date] || 0) + 1;
        
        // By time slot
        byTime[booking.time] = (byTime[booking.time] || 0) + 1;
      });

      const bookingsByDay = Object.entries(byDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const bookingsByTime = Object.entries(byTime)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => a.time.localeCompare(b.time));

      setData({
        totalBookings: bookings?.length || 0,
        totalRevenue: (bookings?.length || 0) * 99,
        totalUsers: userCount || 0,
        bookingsByDay,
        bookingsByTime,
        recentBookings: (bookings || []).slice(0, 5).map(b => ({
          date: b.date,
          time: b.time,
          status: b.payment_status
        }))
      });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const maxBookingsPerDay = data?.bookingsByDay.reduce((max, d) => Math.max(max, d.count), 0) || 1;
  const maxBookingsPerTime = data?.bookingsByTime.reduce((max, d) => Math.max(max, d.count), 0) || 1;

  return (
    <div className="min-h-screen bg-[var(--background)] text-theme pt-24 px-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-2 text-sm text-muted hover:text-[var(--accent)] mb-4 transition-colors"
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-2">
              <BarChart3 size={14} />
              Analytics
            </div>
            <h1 className="font-serif text-3xl">Performance Overview</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-glass rounded-lg p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    timeRange === range 
                      ? 'bg-[var(--accent)] text-[var(--background)]' 
                      : 'text-muted hover:text-theme'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
            <button
              onClick={fetchAnalytics}
              className="p-2 border border-glass rounded-lg hover:border-[var(--accent)] transition-all"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : data && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-glass border border-glass p-6 rounded-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Sessions</span>
                </div>
                <p className="text-3xl font-serif">{data.totalBookings}</p>
                <p className="text-xs text-muted mt-1">in last {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-glass border border-glass p-6 rounded-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <IndianRupee className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Revenue</span>
                </div>
                <p className="text-3xl font-serif">₹{data.totalRevenue.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted mt-1">@ ₹99 per session</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-glass border border-glass p-6 rounded-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[var(--accent)]/10">
                    <Users className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Users</span>
                </div>
                <p className="text-3xl font-serif">{data.totalUsers}</p>
                <p className="text-xs text-muted mt-1">registered accounts</p>
              </motion.div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Bookings by Day */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-glass border border-glass p-6 rounded-2xl"
              >
                <h3 className="font-serif text-xl mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
                  Sessions Over Time
                </h3>
                {data.bookingsByDay.length === 0 ? (
                  <p className="text-muted text-center py-8">No bookings in this period</p>
                ) : (
                  <div className="space-y-3">
                    {data.bookingsByDay.slice(-10).map((day, i) => (
                      <div key={day.date} className="flex items-center gap-4">
                        <span className="text-xs text-muted w-20 flex-shrink-0">
                          {new Date(day.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 h-6 bg-[var(--background)] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(day.count / maxBookingsPerDay) * 100}%` }}
                            transition={{ delay: 0.4 + i * 0.05, duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-deep)] rounded-full"
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{day.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Bookings by Time */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-glass border border-glass p-6 rounded-2xl"
              >
                <h3 className="font-serif text-xl mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[var(--accent)]" />
                  Popular Time Slots
                </h3>
                {data.bookingsByTime.length === 0 ? (
                  <p className="text-muted text-center py-8">No bookings in this period</p>
                ) : (
                  <div className="space-y-3">
                    {data.bookingsByTime.slice(0, 8).map((slot, i) => (
                      <div key={slot.time} className="flex items-center gap-4">
                        <span className="text-xs text-muted w-16 flex-shrink-0">{slot.time}</span>
                        <div className="flex-1 h-6 bg-[var(--background)] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(slot.count / maxBookingsPerTime) * 100}%` }}
                            transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{slot.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
