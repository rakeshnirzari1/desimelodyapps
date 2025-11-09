import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AudioProvider } from "@/contexts/AudioContext";
import { useEffect } from "react";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import About from "./pages/About";
import StationDetail from "./pages/StationDetail";
import TagFilter from "./pages/TagFilter";
import AdminRefresh from "./pages/AdminRefresh";
import AdminAds from "./pages/AdminAds";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import Advertise from "./pages/Advertise";
import India from "./pages/India";

const queryClient = new QueryClient();

// Scroll to top on route change
const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AudioProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/india" element={<India />} />
            <Route path="/advertise" element={<Advertise />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/tag/:tag" element={<TagFilter />} />
            <Route path="/admin-refresh-stations" element={<AdminRefresh />} />
            <Route path="/admin/ads" element={<AdminAds />} />
            <Route path="/:slug" element={<StationDetail />} />
            <Route path="/about" element={<About />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AudioProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
