'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthProvider';
import FeedbackModal from '@/components/FeedbackModal';

// Dynamic import to avoid SSR issues with Jitsi
const JitsiMeeting = dynamic(() => import('@/components/JitsiMeeting'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[var(--background)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4" />
        <p className="text-[var(--text-muted)]">Loading session room...</p>
      </div>
    </div>
  ),
});

function SessionContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  // Get room ID from query param: /session?room=abc123
  const roomId = searchParams.get('room') || '';
  
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Check if this is the mentor (you) - customize this logic
  const isMentor = user?.email === 'hiddendepthsss@gmail.com';

  useEffect(() => {
    // Pre-fill name if user is logged in
    if (user?.email) {
      setDisplayName(user.email.split('@')[0]);
    }
  }, [user]);

  const handleJoinSession = () => {
    if (!displayName.trim()) return;
    setIsJoining(true);
    setTimeout(() => {
      setHasJoined(true);
      setIsJoining(false);
    }, 500);
  };

  const handleSessionEnd = () => {
    setSessionEnded(true);
    setHasJoined(false);
    // Show feedback modal for non-mentors after session ends
    if (!isMentor) {
      setShowFeedback(true);
    }
  };

  // No room ID provided
  if (!roomId && !authLoading) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif text-[var(--foreground)] mb-2">Invalid Session Link</h1>
          <p className="text-[var(--text-muted)] mb-6">
            This session link appears to be invalid or expired. Please check your booking confirmation email for the correct link.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 px-6 bg-[var(--accent)] text-white rounded-full hover:bg-[var(--accent-deep)] transition-colors"
          >
            Return Home
          </Link>
        </div>
      </main>
    );
  }

  // Loading state
  if (authLoading) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </main>
    );
  }

  // Session ended state
  if (sessionEnded) {
    return (
      <>
        <FeedbackModal 
          isOpen={showFeedback} 
          onClose={() => setShowFeedback(false)}
        />
        <main className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif text-[var(--foreground)] mb-2">Session Complete</h1>
            <p className="text-[var(--text-muted)] mb-6">
              Thank you for your session with Hidden Depths. We hope you found it helpful.
            </p>
            
            {isRecording && (
              <p className="text-sm text-[var(--accent)] mb-4">
                📹 Your session was recorded and will be available for review.
              </p>
            )}
            
            <div className="space-y-3">
              {!isMentor && (
                <button
                  onClick={() => setShowFeedback(true)}
                  className="block w-full py-3 px-6 bg-[var(--accent)] text-white rounded-full hover:bg-[var(--accent-deep)] transition-colors"
                >
                  Share Your Feedback
                </button>
              )}
              <Link
                href="/"
                className={`block w-full py-3 px-6 rounded-full transition-colors ${
                  isMentor 
                    ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]' 
                    : 'border border-[var(--glass-border)] text-[var(--foreground)] hover:border-[var(--accent)]'
                }`}
              >
                Return Home
              </Link>
              <Link
                href="/booking"
                className="block w-full py-3 px-6 border border-[var(--glass-border)] text-[var(--foreground)] rounded-full hover:border-[var(--accent)] transition-colors"
              >
                Book Another Session
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Pre-join lobby
  if (!hasJoined) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>

          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-serif text-[var(--foreground)] mb-2">Join Your Session</h1>
              <p className="text-[var(--text-muted)] text-sm">
                Room: <span className="font-mono text-[var(--foreground)]">{roomId.slice(0, 8)}...</span>
              </p>
            </div>

            {/* Name input */}
            <div className="mb-6">
              <label htmlFor="displayName" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Your Display Name
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter a name or pseudonym"
                className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--glass-border)] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
              />
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                You can use a pseudonym for privacy. This is how you&apos;ll appear in the session.
              </p>
            </div>

            {/* Info cards */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--glass-panel)]">
                <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Secure & Private</p>
                  <p className="text-xs text-[var(--text-muted)]">End-to-end encrypted video session</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--glass-panel)]">
                <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Camera Optional</p>
                  <p className="text-xs text-[var(--text-muted)]">Share your video only if you feel comfortable</p>
                </div>
              </div>
            </div>

            {/* Join button */}
            <button
              onClick={handleJoinSession}
              disabled={!displayName.trim() || isJoining}
              className="w-full py-4 px-6 bg-[var(--accent)] text-white rounded-full font-medium hover:bg-[var(--accent-deep)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Join Session
                </>
              )}
            </button>

            {/* Help text */}
            <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
              Having trouble?{' '}
              <a href="mailto:hiddendepthsss@gmail.com" className="text-[var(--accent)] hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Active session with Jitsi
  return (
    <main className="h-screen w-screen bg-[var(--background)] overflow-hidden">
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-red-500/90 text-white text-sm rounded-full">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Recording
        </div>
      )}
      
      {/* Jitsi Meeting */}
      <JitsiMeeting
        roomName={roomId}
        displayName={displayName}
        email={user?.email}
        isMentor={isMentor}
        onClose={handleSessionEnd}
        onRecordingStatusChanged={setIsRecording}
      />
    </main>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </main>
    }>
      <SessionContent />
    </Suspense>
  );
}
