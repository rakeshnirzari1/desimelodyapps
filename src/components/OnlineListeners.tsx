import { useEffect, useState } from "react";
import { Users } from "lucide-react";

export const OnlineListeners = () => {
  const [listeners, setListeners] = useState(0);

  useEffect(() => {
    // Simulate online listeners count (1000-5000 range)
    const baseCount = 1200 + Math.floor(Math.random() * 3800);
    setListeners(baseCount);

    // Update count every 30 seconds with small variations
    const interval = setInterval(() => {
      setListeners(prev => {
        const change = Math.floor(Math.random() * 20) - 10;
        return Math.max(1000, prev + change);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
      <Users className="w-4 h-4 animate-pulse" />
      <span className="font-semibold">{listeners.toLocaleString()}</span>
      <span className="text-sm">listening now</span>
    </div>
  );
};
