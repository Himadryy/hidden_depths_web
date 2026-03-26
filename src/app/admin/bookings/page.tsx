'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Search, 
  Filter, 
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { getApiUrl, fetchWithTimeout } from '@/lib/api';

interface Booking {
  id: string;
  user_id: string;
  user_email: string;
  date: string;
  time: string;
  payment_status: string;
  razorpay_payment_id: string | null;
  created_at: string;
}

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'failed';

export default function AdminBookingsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 20;

  const fetchBookings = async () => {
    if (!session?.access_token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = getApiUrl();
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(search && { search }),
      });

      const res = await fetchWithTimeout(`${apiUrl}/admin/bookings?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await res.json();
      setBookings(data.data?.bookings || []);
      setTotalPages(Math.ceil((data.data?.total || 0) / perPage));
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('Failed to load bookings. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [session, page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1";
    switch (status) {
      case 'confirmed':
        return `${baseClasses} bg-green-500/10 text-green-500`;
      case 'pending':
        return `${baseClasses} bg-yellow-500/10 text-yellow-500`;
      case 'failed':
        return `${baseClasses} bg-red-500/10 text-red-500`;
      default:
        return `${baseClasses} bg-gray-500/10 text-gray-500`;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
              <Calendar size={14} />
              Booking Management
            </div>
            <h1 className="font-serif text-3xl">All Bookings</h1>
          </div>
          
          <button
            onClick={fetchBookings}
            className="self-start px-4 py-2 border border-glass rounded-lg text-sm hover:border-[var(--accent)] transition-all flex items-center gap-2"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-glass border border-glass rounded-xl text-sm focus:border-[var(--accent)] focus:outline-none transition-colors"
              />
            </div>
          </form>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="px-4 py-3 bg-glass border border-glass rounded-xl text-sm focus:border-[var(--accent)] focus:outline-none transition-colors"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchBookings}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--background)] rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted" />
            <p className="text-muted">No bookings found</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-glass border border-glass rounded-2xl overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-glass">
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Date</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Time</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">User</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Status</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Payment ID</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking, index) => (
                      <motion.tr
                        key={booking.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b border-glass last:border-b-0 hover:bg-[var(--accent)]/5 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium">{formatDate(booking.date)}</td>
                        <td className="px-6 py-4 text-sm">{booking.time}</td>
                        <td className="px-6 py-4 text-sm text-muted">{booking.user_email}</td>
                        <td className="px-6 py-4">
                          <span className={getStatusBadge(booking.payment_status)}>
                            {getStatusIcon(booking.payment_status)}
                            {booking.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted font-mono">
                          {booking.razorpay_payment_id || '-'}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted">
                          {new Date(booking.created_at).toLocaleString('en-IN')}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-glass hover:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-glass hover:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
