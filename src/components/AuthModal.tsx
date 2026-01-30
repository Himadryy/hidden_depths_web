'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: AuthMode;
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose(); // Close modal on successful sign in
      }
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[var(--background)] border border-glass w-full max-w-md p-8 rounded-2xl shadow-2xl pointer-events-auto relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)] opacity-50" />
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted hover:text-theme transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-8 text-center">
                    <h2 className="font-serif text-3xl text-theme mb-2">
                        {mode === 'signin' ? 'Welcome Back' : 'Join the Sanctuary'}
                    </h2>
                    <p className="text-sm text-muted">
                        {mode === 'signin' 
                            ? 'Enter your credentials to access your space.' 
                            : 'Create an account to begin your journey.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs text-muted uppercase tracking-widest font-bold ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-[var(--background)] border border-glass rounded-xl py-3 pl-12 pr-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all placeholder:text-muted/50"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-muted uppercase tracking-widest font-bold ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-[var(--background)] border border-glass rounded-xl py-3 pl-12 pr-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all placeholder:text-muted/50"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {message && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{message}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--foreground)] text-[var(--background)] font-serif tracking-widest text-sm py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setMode(mode === 'signin' ? 'signup' : 'signin');
                            setError(null);
                            setMessage(null);
                        }}
                        className="text-sm text-muted hover:text-[var(--accent)] transition-colors underline decoration-dotted underline-offset-4"
                    >
                        {mode === 'signin' 
                            ? "Don't have an account? Sign up" 
                            : "Already have an account? Sign in"}
                    </button>
                </div>

                <div className="mt-8 text-[10px] text-center text-muted/40 max-w-xs mx-auto">
                    By continuing, you agree to our Terms of Service. Your data is encrypted and securely stored.
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
