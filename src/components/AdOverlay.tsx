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
    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 backdrop-blur-md z-20 flex items-center justify-center">
      <div className="text-center space-y-4 px-6 py-8 rounded-xl bg-background/40 backdrop-blur-sm border border-border/50 shadow-xl max-w-sm mx-4">
        <Badge variant="secondary" className="text-base font-bold px-6 py-2 shadow-lg">
          🎵 Commercial Break
        </Badge>
        
        <div className="text-xl font-semibold text-foreground">
          Ad playing • {timeRemaining}s remaining
        </div>
        
        {canSkip && onSkip && (
          <button
            onClick={onSkip}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors underline underline-offset-2 mt-2"
          >
            Skip ad →
          </button>
        )}
        
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed pt-2">
          Ads help us keep Desi Melody free and support our radio partners
        </p>
      </div>
    </div>
  );
};
