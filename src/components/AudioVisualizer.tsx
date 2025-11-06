import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
}

export const AudioVisualizer = ({ audioRef, isPlaying }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();

  useEffect(() => {
    if (!audioRef.current || !canvasRef.current) return;

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes("Mac") && "ontouchend" in document);

    const setupAudio = () => {
      if (!audioRef.current || audioContextRef.current) return;

      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);

        // Connect to both analyser (for visualization) and destination (for audio output)
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
        analyserRef.current.fftSize = 128;
      } catch (error) {
        console.error("Error setting up audio context:", error);
      }
    };

    const cleanupAudio = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      try { sourceRef.current?.disconnect(); } catch {}
      try { analyserRef.current?.disconnect(); } catch {}
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = undefined;
      }
      sourceRef.current = undefined;
      analyserRef.current = undefined;
    };

    const draw = () => {
      if (!analyserRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        // Create gradient colors
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        cleanupAudio();
      } else {
        if (isPlaying && !isIOS) {
          setupAudio();
          draw();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    if (isPlaying && !isIOS && document.visibilityState === 'visible') {
      setupAudio();
      draw();
    } else {
      cleanupAudio();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      cleanupAudio();
    };
  }, [isPlaying, audioRef]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={100}
      className="w-full h-20 opacity-30"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none' }}
    />
  );
};
