import { useEffect, useState } from 'react';
import { Badge } from './ui/badge';

interface AdOverlayProps {
  isVisible: boolean;
  duration: number;
  onSkip?: () => void;
}

export const AdOverlay = ({ isVisible, duration, onSkip }: AdOverlayProps) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setTimeRemaining(duration);
      setCanSkip(false);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Allow skip after 3 seconds
    const skipTimer = setTimeout(() => {
      setCanSkip(true);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(skipTimer);
    };
  }, [isVisible, duration]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm z-20 flex items-center justify-center">
      <div className="text-center space-y-3 px-4">
        <Badge variant="secondary" className="text-sm font-semibold px-4 py-1.5">
          🎵 Commercial Break
        </Badge>
        
        <div className="text-lg font-medium text-foreground">
          Ad playing • {timeRemaining}s remaining
        </div>
        
        {canSkip && onSkip && (
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Skip ad
          </button>
        )}
        
        <p className="text-xs text-muted-foreground max-w-xs">
          Ads help us keep Desi Melody free and support our radio partners
        </p>
      </div>
    </div>
  );
};
