'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { Loader2, ShieldX } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/admin/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-theme p-6">
        <ShieldX className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-serif mb-4">Access Denied</h1>
        <p className="text-muted mb-8 text-center max-w-md">
          You don&apos;t have permission to access this area. This page is restricted to administrators only.
        </p>
        <button 
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-[var(--accent)] text-[var(--background)] rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
