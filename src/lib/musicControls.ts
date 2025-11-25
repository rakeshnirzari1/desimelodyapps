export interface MusicControlsOptions {
  track: string;
  artist: string;
  album?: string;
  cover?: string;
  isPlaying: boolean;
  dismissable?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
  hasClose?: boolean;
  ticker?: string;
  playIcon?: string;
  pauseIcon?: string;
  prevIcon?: string;
  nextIcon?: string;
  closeIcon?: string;
  notificationIcon?: string;
}

export interface MusicControlsCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onClose?: () => void;
}

let musicControlsListenersAdded = false;

export const initializeMusicControls = async (
  options: MusicControlsOptions,
  callbacks: MusicControlsCallbacks
) => {
  try {
    // Check if running in native app
    if (!(window as any).MusicControls) {
      console.log('Music controls not available - using Media Session API');
      return false;
    }

    // Create music controls
    await (window as any).MusicControls.create({
      track: options.track,
      artist: options.artist,
      album: options.album || 'DesiMelody',
      cover: options.cover || '',
      isPlaying: options.isPlaying,
      dismissable: options.dismissable ?? true,
      hasPrev: options.hasPrev ?? true,
      hasNext: options.hasNext ?? true,
      hasClose: options.hasClose ?? true,
      ticker: options.ticker || `${options.track} - ${options.artist}`,
      playIcon: 'media_play',
      pauseIcon: 'media_pause',
      prevIcon: 'media_prev',
      nextIcon: 'media_next',
      closeIcon: 'media_close',
      notificationIcon: 'notification'
    });

    // Subscribe to events only once
    if (!musicControlsListenersAdded) {
      (window as any).MusicControls.subscribe((action: string) => {
        console.log('Music controls action:', action);
        
        switch (action) {
          case 'music-controls-play':
            callbacks.onPlay?.();
            break;
          case 'music-controls-pause':
            callbacks.onPause?.();
            break;
          case 'music-controls-next':
            callbacks.onNext?.();
            break;
          case 'music-controls-previous':
            callbacks.onPrev?.();
            break;
          case 'music-controls-destroy':
            callbacks.onClose?.();
            break;
        }
      });

      musicControlsListenersAdded = true;
    }

    // Listen to headphone/Bluetooth events
    (window as any).MusicControls.listen();

    return true;
  } catch (error) {
    console.error('Failed to initialize music controls:', error);
    return false;
  }
};

export const updateMusicControls = async (options: Partial<MusicControlsOptions>) => {
  try {
    if ((window as any).MusicControls) {
      await (window as any).MusicControls.updateIsPlaying(options.isPlaying ?? false);
      
      if (options.track || options.artist || options.cover) {
        await (window as any).MusicControls.create({
          track: options.track,
          artist: options.artist,
          album: options.album || 'DesiMelody',
          cover: options.cover,
          isPlaying: options.isPlaying ?? false,
          dismissable: true,
          hasPrev: true,
          hasNext: true,
          hasClose: true,
        });
      }
    }
  } catch (error) {
    console.error('Failed to update music controls:', error);
  }
};

export const destroyMusicControls = async () => {
  try {
    if ((window as any).MusicControls) {
      await (window as any).MusicControls.destroy();
    }
  } catch (error) {
    console.error('Failed to destroy music controls:', error);
  }
};
