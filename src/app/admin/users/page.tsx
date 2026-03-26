'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, 
  Search, 
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Mail,
  Calendar,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  booking_count: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 20;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Query user_profiles with booking count
      let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      if (error) throw error;

      // Get booking counts for these users
      const userIds = data?.map(u => u.id) || [];
      
      let usersWithCounts: UserProfile[] = [];
      
      if (userIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('user_id')
          .in('user_id', userIds)
          .eq('payment_status', 'confirmed');

        const bookingCounts: Record<string, number> = {};
        bookings?.forEach(b => {
          bookingCounts[b.user_id] = (bookingCounts[b.user_id] || 0) + 1;
        });

        usersWithCounts = (data || []).map(user => ({
          ...user,
          booking_count: bookingCounts[user.id] || 0
        }));
      }

      setUsers(usersWithCounts);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const totalPages = Math.ceil(totalCount / perPage);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
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
              <Users size={14} />
              User Management
            </div>
            <h1 className="font-serif text-3xl">Registered Users</h1>
            <p className="text-muted text-sm mt-1">{totalCount} total users</p>
          </div>
          
          <button
            onClick={fetchUsers}
            className="self-start px-4 py-2 border border-glass rounded-lg text-sm hover:border-[var(--accent)] transition-all flex items-center gap-2"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch}>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-glass border border-glass rounded-xl text-sm focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
          </div>
        </form>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted" />
            <p className="text-muted">No users found</p>
          </div>
        ) : (
          <>
            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-glass border border-glass rounded-2xl p-5 hover:border-[var(--accent)]/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-deep)] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold">
                        {(user.full_name || user.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Name */}
                      <p className="font-medium text-[var(--foreground)] truncate">
                        {user.full_name || 'Anonymous User'}
                      </p>
                      
                      {/* Email */}
                      <div className="flex items-center gap-1 text-sm text-muted mt-1">
                        <Mail size={12} />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="mt-4 pt-4 border-t border-glass grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-serif text-[var(--accent)]">{user.booking_count}</p>
                      <p className="text-xs text-muted">Sessions</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted flex items-center justify-center gap-1">
                        <Calendar size={10} />
                        Joined
                      </p>
                      <p className="text-xs">{formatDate(user.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted flex items-center justify-center gap-1">
                        <Clock size={10} />
                        Last seen
                      </p>
                      <p className="text-xs">{getTimeAgo(user.last_sign_in_at)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

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
