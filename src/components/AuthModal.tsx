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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/`,
            },
        });
        if (error) throw error;
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any).message);
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
                        <label htmlFor="auth-email" className="text-xs text-muted uppercase tracking-widest font-bold ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                            <input
                                id="auth-email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-[var(--background)] border border-glass rounded-xl py-3 pl-12 pr-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all placeholder:text-muted/50"
                                placeholder="name@example.com"
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="auth-password" className="text-xs text-muted uppercase tracking-widest font-bold ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                            <input
                                id="auth-password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-[var(--background)] border border-glass rounded-xl py-3 pl-12 pr-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all placeholder:text-muted/50"
                                placeholder="••••••••"
                                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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

                <div className="my-6 flex items-center gap-4 opacity-50">
                    <div className="h-px bg-current flex-1" />
                    <span className="text-xs uppercase tracking-widest text-muted">Or</span>
                    <div className="h-px bg-current flex-1" />
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white text-black font-sans font-medium text-sm py-3 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-sm border border-gray-200"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </button>

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
