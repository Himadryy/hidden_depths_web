'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import AuthModal from '@/components/AuthModal';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <AuthModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          if (user) router.push('/');
        }}
        defaultMode="signin"
      />
    </div>
  );
}
