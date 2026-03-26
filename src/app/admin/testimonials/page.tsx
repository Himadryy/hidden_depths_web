'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Check, 
  X, 
  Star,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Testimonial {
  id: string;
  user_id: string | null;
  name: string;
  content: string;
  rating: number;
  is_anonymous: boolean;
  approved: boolean;
  featured: boolean;
  created_at: string;
}

export default function AdminTestimonialsPage() {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('approved', false);
      } else if (filter === 'approved') {
        query = query.eq('approved', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTestimonials(data || []);
    } catch (err) {
      console.error('Failed to fetch testimonials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, [filter]);

  const updateTestimonial = async (id: string, updates: Partial<Testimonial>) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from('testimonials')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setTestimonials(prev => 
        prev.map(t => t.id === id ? { ...t, ...updates } : t)
      );
    } catch (err) {
      console.error('Failed to update testimonial:', err);
    } finally {
      setUpdating(null);
    }
  };

  const deleteTestimonial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;
    
    setUpdating(id);
    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTestimonials(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete testimonial:', err);
    } finally {
      setUpdating(null);
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        size={14} 
        className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'} 
      />
    ));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-theme pt-24 px-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        
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
              <MessageSquare size={14} />
              Testimonial Management
            </div>
            <h1 className="font-serif text-3xl">Testimonials</h1>
          </div>
          
          <button
            onClick={fetchTestimonials}
            className="self-start px-4 py-2 border border-glass rounded-lg text-sm hover:border-[var(--accent)] transition-all flex items-center gap-2"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f 
                  ? 'bg-[var(--accent)] text-[var(--background)]' 
                  : 'bg-glass border border-glass hover:border-[var(--accent)]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted" />
            <p className="text-muted">No testimonials found</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-glass border rounded-2xl p-6 ${
                  testimonial.approved 
                    ? 'border-green-500/30' 
                    : 'border-yellow-500/30'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="flex">{renderStars(testimonial.rating)}</div>
                      {testimonial.featured && (
                        <span className="px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] text-xs rounded-full flex items-center gap-1">
                          <Sparkles size={12} /> Featured
                        </span>
                      )}
                      {!testimonial.approved && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
                          Pending Review
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm leading-relaxed">&ldquo;{testimonial.content}&rdquo;</p>

                    {/* Author */}
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <span className="font-medium text-theme">
                        {testimonial.is_anonymous ? 'Anonymous' : testimonial.name}
                      </span>
                      <span>•</span>
                      <span>{new Date(testimonial.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {updating === testimonial.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {!testimonial.approved ? (
                          <button
                            onClick={() => updateTestimonial(testimonial.id, { approved: true })}
                            className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                            title="Approve"
                          >
                            <Check size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateTestimonial(testimonial.id, { approved: false })}
                            className="p-2 rounded-lg bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 transition-colors"
                            title="Unapprove"
                          >
                            <EyeOff size={18} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => updateTestimonial(testimonial.id, { featured: !testimonial.featured })}
                          className={`p-2 rounded-lg transition-colors ${
                            testimonial.featured 
                              ? 'bg-[var(--accent)]/20 text-[var(--accent)]' 
                              : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                          }`}
                          title={testimonial.featured ? 'Unfeature' : 'Feature'}
                        >
                          <Sparkles size={18} />
                        </button>
                        
                        <button
                          onClick={() => deleteTestimonial(testimonial.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                          title="Delete"
                        >
                          <X size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
