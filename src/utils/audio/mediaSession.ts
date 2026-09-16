/**
 * Web Media Session & Background Playback Coordinator
 * Integrates directly with navigator.mediaSession to provide Chrome/browser-level
 * global playback notification bar, OS media center, lock screen controls, and hardware media keys.
 */

interface MediaSessionParams {
  title: string;
  artist?: string;
  album?: string;
  artwork?: { src: string; sizes?: string; type?: string }[];
  duration?: number;
  currentTime?: number;
  playbackRate?: number;
  isPlaying: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeek?: (time: number) => void;
  onSeekBackward?: (offsetSec?: number) => void;
  onSeekForward?: (offsetSec?: number) => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
}

class MediaSessionManager {
  private silentAudio: HTMLAudioElement | null = null;
  private currentParams: MediaSessionParams | null = null;
  private isSilentAudioPlaying: boolean = false;

  constructor() {
    this.initSilentAudio();
  }

  /**
   * Initializes a minimal 1-second silent WAV loop in an HTMLAudioElement.
   * Chrome and Chromium browsers only activate the OS / notification media playback
   * widget if an HTMLMediaElement is actively playing or associated with audio output.
   */
  private initSilentAudio() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    try {
      // 1 second base64-encoded valid silent WAV audio
      const silentWavBase64 =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      const audio = new Audio(silentWavBase64);
      audio.loop = true;
      audio.volume = 0.001; // Inaudible silent carrier
      audio.preload = 'auto';
      this.silentAudio = audio;
    } catch {
      // Audio element not supported in this environment
    }
  }

  /**
   * Updates or activates the browser media session metadata & controls
   */
  public update(params: MediaSessionParams) {
    this.currentParams = params;

    if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    try {
      // Set metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: params.title || 'Audify Audio',
        artist: params.artist || 'Audify Studio',
        album: params.album || 'Audify Audio Workstation',
        artwork: params.artwork || [
          {
            src: '/favicon.svg',
            sizes: '96x96',
            type: 'image/svg+xml',
          },
          {
            src: '/logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
        ],
      });

      // Update playback state
      navigator.mediaSession.playbackState = params.isPlaying ? 'playing' : 'paused';

      // Keep silent HTMLAudio playing when Web Audio is playing so Chrome's media widget remains active
      if (this.silentAudio) {
        if (params.isPlaying && !this.isSilentAudioPlaying) {
          this.silentAudio
            .play()
            .then(() => {
              this.isSilentAudioPlaying = true;
            })
            .catch(() => {
              // Auto-play restrictions or user interaction pending
            });
        } else if (!params.isPlaying && this.isSilentAudioPlaying) {
          this.silentAudio.pause();
          this.isSilentAudioPlaying = false;
        }
      }

      // Update position state if duration is available
      if (
        params.duration !== undefined &&
        params.duration > 0 &&
        'setPositionState' in navigator.mediaSession
      ) {
        try {
          const validCurrentTime = Math.max(
            0,
            Math.min(params.currentTime || 0, params.duration)
          );
          navigator.mediaSession.setPositionState({
            duration: params.duration,
            playbackRate: params.playbackRate || 1.0,
            position: validCurrentTime,
          });
        } catch {
          // Some browsers throw if position > duration
        }
      }

      // Register action handlers
      this.bindActionHandlers(params);
    } catch (err) {
      console.warn('Failed to update MediaSession:', err);
    }
  }

  private bindActionHandlers(params: MediaSessionParams) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const actionMap: [MediaSessionAction, ((details: MediaSessionActionDetails) => void) | null][] = [
      [
        'play',
        params.onPlay
          ? () => {
              params.onPlay?.();
            }
          : null,
      ],
      [
        'pause',
        params.onPause
          ? () => {
              params.onPause?.();
            }
          : null,
      ],
      [
        'stop',
        params.onStop
          ? () => {
              params.onStop?.();
            }
          : null,
      ],
      [
        'seekbackward',
        params.onSeekBackward
          ? (details) => {
              params.onSeekBackward?.(details.seekOffset || 10);
            }
          : null,
      ],
      [
        'seekforward',
        params.onSeekForward
          ? (details) => {
              params.onSeekForward?.(details.seekOffset || 10);
            }
          : null,
      ],
      [
        'seekto',
        params.onSeek
          ? (details) => {
              if (details.seekTime !== undefined) {
                params.onSeek?.(details.seekTime);
              }
            }
          : null,
      ],
      [
        'previoustrack',
        params.onPreviousTrack
          ? () => {
              params.onPreviousTrack?.();
            }
          : null,
      ],
      [
        'nexttrack',
        params.onNextTrack
          ? () => {
              params.onNextTrack?.();
            }
          : null,
      ],
    ];

    for (const [action, handler] of actionMap) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Specific action might not be supported on this platform
      }
    }
  }

  /**
   * Cleans up media session and releases background carrier
   */
  public destroy() {
    if (this.silentAudio) {
      try {
        this.silentAudio.pause();
        this.silentAudio.src = '';
      } catch {
        // ignore
      }
      this.isSilentAudioPlaying = false;
    }

    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
      if (navigator.mediaSession.metadata) {
        navigator.mediaSession.metadata = null;
      }
    }
  }
}

export const mediaSessionManager = new MediaSessionManager();
