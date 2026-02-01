'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Image as ImageIcon, 
  Video, 
  GripVertical,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface Insight {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: string;
  order: number;
}

export default function InsightsCMS() {
  const { user } = useAuth();
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Insight>>({
    title: '',
    description: '',
    mediaUrl: '',
    mediaType: 'image',
    order: 0
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchInsights = async () => {
    try {
      const res = await fetch(`${apiUrl}/insights`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data || []);
      }
    } catch (err) {
      console.error('Error fetching insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchInsights();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${apiUrl}/admin/insights/${editingId}` : `${apiUrl}/admin/insights`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ title: '', description: '', mediaUrl: '', mediaType: 'image', order: insights.length });
        await fetchInsights();
      }
    } catch (err) {
      console.error('Error saving insight:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this insight?')) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const res = await fetch(`${apiUrl}/admin/insights/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        await fetchInsights();
      }
    } catch (err) {
      console.error('Error deleting insight:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--background)] text-theme pt-32 px-6 pb-20">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="font-serif text-4xl text-[var(--accent)] mb-2">Content Management</h1>
            <p className="text-muted text-sm">Manage the insights displayed in the main carousel.</p>
          </div>
          <div className="flex gap-4">
            <button 
                onClick={() => router.push('/admin/dashboard')}
                className="px-6 py-3 border border-glass rounded-full text-xs font-bold uppercase tracking-widest hover:border-theme transition-all flex items-center gap-2"
            >
                <ArrowLeft size={14} /> Dashboard
            </button>
            <button 
                onClick={() => {
                    setIsAdding(true);
                    setEditingId(null);
                    setFormData({ title: '', description: '', mediaUrl: '', mediaType: 'image', order: insights.length });
                }}
                className="px-6 py-3 bg-[var(--accent)] text-[var(--background)] rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
            >
                <Plus size={16} /> Add Insight
            </button>
          </div>
        </div>

        {/* Insight List */}
        <div className="space-y-4">
            {insights.map((insight) => (
                <motion.div 
                    key={insight.id}
                    layout
                    className="bg-glass border border-glass p-6 rounded-2xl flex items-center gap-6 group"
                >
                    <div className="text-muted opacity-20 group-hover:opacity-100 transition-opacity cursor-grab">
                        <GripVertical size={20} />
                    </div>

                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-black/20 shrink-0 border border-glass">
                        {insight.mediaType === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Video size={32} className="text-muted" />
                            </div>
                        ) : (
                            <Image src={insight.mediaUrl} alt={insight.title} fill className="object-cover" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-xl mb-1 truncate">{insight.title}</h3>
                        <p className="text-sm text-muted line-clamp-2 italic">{insight.description}</p>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                setEditingId(insight.id);
                                setFormData(insight);
                                setIsAdding(true);
                            }}
                            className="p-3 hover:bg-[var(--accent)]/10 text-muted hover:text-[var(--accent)] rounded-full transition-all"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            onClick={() => handleDelete(insight.id)}
                            className="p-3 hover:bg-red-500/10 text-muted hover:text-red-500 rounded-full transition-all"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>

        {/* Add/Edit Modal */}
        <AnimatePresence>
            {isAdding && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsAdding(false)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-[110] p-6 pointer-events-none"
                    >
                        <form 
                            onSubmit={handleSave}
                            className="bg-[var(--background)] border border-glass w-full max-w-2xl p-10 rounded-3xl shadow-2xl pointer-events-auto overflow-y-auto max-h-[90vh]"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="font-serif text-3xl">{editingId ? 'Edit Insight' : 'New Insight'}</h2>
                                <button type="button" onClick={() => setIsAdding(false)} className="text-muted hover:text-theme">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Title</label>
                                    <input 
                                        type="text" required
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full bg-glass border border-glass rounded-xl p-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all"
                                        placeholder="Enter title"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Description</label>
                                    <textarea 
                                        required rows={4}
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        className="w-full bg-glass border border-glass rounded-xl p-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all resize-none"
                                        placeholder="Enter description"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Media Type</label>
                                        <div className="flex gap-2">
                                            {['image', 'video'].map(type => (
                                                <button
                                                    key={type} type="button"
                                                    onClick={() => setFormData({...formData, mediaType: type})}
                                                    className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                                                        formData.mediaType === type 
                                                        ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--background)]' 
                                                        : 'border-glass text-muted hover:border-theme'
                                                    }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Sort Order</label>
                                        <input 
                                            type="number"
                                            value={formData.order}
                                            onChange={e => setFormData({...formData, order: parseInt(e.target.value)})}
                                            className="w-full bg-glass border border-glass rounded-xl p-3 text-theme focus:outline-none focus:border-[var(--accent)] transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Media URL (Path or External)</label>
                                    <div className="flex gap-4">
                                        <div className="relative flex-1">
                                            {formData.mediaType === 'image' ? <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} /> : <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />}
                                            <input 
                                                type="text" required
                                                value={formData.mediaUrl}
                                                onChange={e => setFormData({...formData, mediaUrl: e.target.value})}
                                                className="w-full bg-glass border border-glass rounded-xl py-4 pl-12 pr-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all"
                                                placeholder="/assets/filename.jpg"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted/50 italic">Tip: Use /assets/filename.jpg for local files.</p>
                                </div>

                                <button 
                                    type="submit" disabled={loading}
                                    className="w-full bg-[var(--foreground)] text-[var(--background)] py-5 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {editingId ? 'Update Insight' : 'Publish Insight'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
}
