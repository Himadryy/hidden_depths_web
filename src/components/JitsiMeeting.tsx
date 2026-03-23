'use client';

import { useEffect, useRef, useState } from 'react';

interface JitsiMeetingProps {
  roomName: string;
  displayName: string;
  email?: string;
  onClose?: () => void;
  onRecordingStatusChanged?: (isRecording: boolean) => void;
  isMentor?: boolean;
}

interface JitsiMeetExternalAPI {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  addListener: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: JitsiOptions) => JitsiMeetExternalAPI;
  }
}

interface JitsiOptions {
  roomName: string;
  parentNode: HTMLElement;
  width: string;
  height: string;
  configOverwrite: Record<string, unknown>;
  interfaceConfigOverwrite: Record<string, unknown>;
  userInfo: {
    displayName: string;
    email?: string;
  };
}

export default function JitsiMeeting({
  roomName,
  displayName,
  email,
  onClose,
  onRecordingStatusChanged,
  isMentor = false,
}: JitsiMeetingProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiMeetExternalAPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Jitsi external API script
    const loadJitsiScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Jitsi API'));
        document.body.appendChild(script);
      });
    };

    const initJitsi = async () => {
      try {
        await loadJitsiScript();

        if (!jitsiContainerRef.current) return;

        // Configuration optimized for mental health sessions
        const options: JitsiOptions = {
          roomName: `HiddenDepths-${roomName}`,
          parentNode: jitsiContainerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            // General settings
            startWithAudioMuted: !isMentor, // Mentor starts unmuted
            startWithVideoMuted: isMentor,  // Mentor starts without video (will share screen)
            prejoinPageEnabled: true,        // Waiting room
            disableDeepLinking: true,
            
            // Privacy & Security
            enableClosePage: true,
            enableWelcomePage: false,
            enableNoisyMicDetection: true,
            
            // Recording (Dropbox integration)
            fileRecordingsEnabled: true,
            localRecording: {
              enabled: true,
              format: 'webm',
            },
            
            // Audio settings for therapy
            disableAudioLevels: false,
            enableNoAudioDetection: true,
            
            // Lobby/waiting room for security
            lobby: {
              autoKnock: true,
              enableChat: true,
            },
            
            // Meeting settings
            requireDisplayName: true,
            defaultLanguage: 'en',
            
            // Disable unnecessary features
            enableCalendarIntegration: false,
            enableLayerSuspension: true,
            
            // Quality settings
            resolution: 720,
            constraints: {
              video: {
                height: { ideal: 720, max: 720, min: 180 },
                width: { ideal: 1280, max: 1280, min: 320 },
              },
            },
            
            // Security
            e2eping: { enabled: true },
          },
          interfaceConfigOverwrite: {
            // Branding
            APP_NAME: 'Hidden Depths Session',
            BRAND_WATERMARK_LINK: 'https://hidden-depths-web.pages.dev',
            DEFAULT_BACKGROUND: '#0A0A0F',
            
            // UI customization
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            DISABLE_PRESENCE_STATUS: false,
            DISABLE_TRANSCRIPTION_SUBTITLES: false,
            
            // Toolbar buttons
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'desktop',      // Screen share (for calming video)
              'chat',
              'recording',    // Enable recording
              'raisehand',
              'tileview',
              'settings',
              'hangup',
              ...(isMentor ? ['mute-everyone', 'security'] : []),
            ],
            
            // Show participant controls
            SETTINGS_SECTIONS: ['devices', 'moderator', 'profile'],
            
            // Video layout
            VERTICAL_FILMSTRIP: true,
            FILM_STRIP_MAX_HEIGHT: 120,
            
            // Hide some UI elements for cleaner look
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            
            // Mobile settings
            MOBILE_APP_PROMO: false,
          },
          userInfo: {
            displayName: displayName,
            email: email,
          },
        };

        const api = new window.JitsiMeetExternalAPI('meet.jit.si', options);
        apiRef.current = api;

        // Event listeners
        api.addListener('videoConferenceJoined', () => {
          setIsLoading(false);
          
          // If mentor, prompt to share screen for calming video
          if (isMentor) {
            setTimeout(() => {
              api.executeCommand('toggleShareScreen');
            }, 2000);
          }
        });

        api.addListener('videoConferenceLeft', () => {
          onClose?.();
        });

        api.addListener('recordingStatusChanged', (status: unknown) => {
          const recordingStatus = status as { on: boolean };
          onRecordingStatusChanged?.(recordingStatus.on);
        });

        api.addListener('readyToClose', () => {
          onClose?.();
        });

        api.addListener('errorOccurred', (error: unknown) => {
          const err = error as { message: string };
          console.error('Jitsi error:', err);
          setError(err.message);
        });

      } catch (err) {
        console.error('Failed to initialize Jitsi:', err);
        setError('Failed to load video session. Please refresh the page.');
        setIsLoading(false);
      }
    };

    initJitsi();

    // Cleanup on unmount
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, displayName, email, isMentor, onClose, onRecordingStatusChanged]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--background)] text-[var(--foreground)] p-8">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-serif mb-2">Connection Error</h2>
        <p className="text-[var(--text-muted)] text-center mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-[var(--accent)] text-white rounded-full hover:bg-[var(--accent-deep)] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--background)] z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mb-4" />
          <p className="text-[var(--text-muted)]">Connecting to your session...</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Please allow camera & microphone access</p>
        </div>
      )}
      <div
        ref={jitsiContainerRef}
        className="w-full h-full"
        style={{ minHeight: '500px' }}
      />
    </div>
  );
}
