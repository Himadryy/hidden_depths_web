'use client';

import { useState } from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import AuthModal from './AuthModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // If user is logged in, show their email prefix or a generic name
  const displayName = user?.email?.split('@')[0] || 'Traveler';

  return (
    <>
        <div className="relative">
            {/* Main Trigger Button */}
            <button
                onClick={() => user ? setIsMenuOpen(!isMenuOpen) : setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--background)]/80 backdrop-blur-md border border-glass rounded-full text-theme hover:border-[var(--accent)] transition-all shadow-lg group"
            >
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--background)] transition-colors">
                    <User size={16} />
                </div>
                <span className="text-sm font-medium hidden sm:block">
                    {user ? displayName : 'Sign In'}
                </span>
            </button>

            {/* Dropdown Menu (Only for logged in users) */}
            <AnimatePresence>
                {user && isMenuOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsMenuOpen(false)} 
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-48 py-2 bg-[var(--background)] border border-glass rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                            <div className="px-4 py-3 border-b border-glass mb-1">
                                <p className="text-xs text-muted uppercase tracking-widest font-bold">Signed in as</p>
                                <p className="text-sm text-theme truncate">{user.email}</p>
                            </div>
                            
                            <button
                                onClick={() => {
                                    signOut();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/5 hover:text-red-500 transition-colors flex items-center gap-2"
                            >
                                <LogOut size={14} />
                                Sign Out
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>

        <AuthModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
        />
    </>
  );
}
