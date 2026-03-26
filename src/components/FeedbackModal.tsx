'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionDate?: string;
}

export default function FeedbackModal({ isOpen, onClose, sessionDate }: FeedbackModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    if (!content.trim()) {
      setError('Please share your thoughts');
      return;
    }
    if (!isAnonymous && !name.trim()) {
      setError('Please enter your name or choose to remain anonymous');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from('testimonials')
        .insert({
          user_id: user?.id || null,
          name: isAnonymous ? 'Anonymous' : name.trim(),
          content: content.trim(),
          rating,
          is_anonymous: isAnonymous,
          session_date: sessionDate || new Date().toISOString().split('T')[0],
          approved: false, // Requires admin approval
        });

      if (dbError) throw dbError;

      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <X size={20} />
            </button>

            {submitted ? (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center"
                >
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </motion.div>
                <h3 className="text-xl font-serif text-[var(--foreground)] mb-2">Thank You!</h3>
                <p className="text-[var(--text-muted)] text-sm">
                  Your feedback helps us improve our service.
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-serif text-[var(--foreground)] mb-2">
                    How was your session?
                  </h3>
                  <p className="text-[var(--text-muted)] text-sm">
                    Your feedback helps others find peace and clarity.
                  </p>
                </div>

                {/* Star Rating */}
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        className={`transition-colors ${
                          star <= displayRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Rating text */}
                <p className="text-center text-sm text-[var(--text-muted)] mb-6">
                  {displayRating === 0 && 'Tap a star to rate'}
                  {displayRating === 1 && 'Poor'}
                  {displayRating === 2 && 'Fair'}
                  {displayRating === 3 && 'Good'}
                  {displayRating === 4 && 'Very Good'}
                  {displayRating === 5 && 'Excellent!'}
                </p>

                {/* Content */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your experience... (this may be featured on our website)"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--glass-border)] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none h-24 mb-4"
                />

                {/* Anonymous toggle */}
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0 bg-transparent"
                  />
                  <span className="text-sm text-[var(--foreground)]">Keep me anonymous</span>
                </label>

                {/* Name input (if not anonymous) */}
                {!isAnonymous && (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name (as you'd like it displayed)"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--glass-border)] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors mb-4"
                  />
                )}

                {/* Error message */}
                {error && (
                  <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
                )}

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3 px-6 bg-[var(--accent)] text-white rounded-full font-medium hover:bg-[var(--accent-deep)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>

                {/* Skip */}
                <button
                  onClick={onClose}
                  className="w-full mt-3 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  Skip for now
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
