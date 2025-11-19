import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AudioProvider } from "@/contexts/AudioContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Favorites from "./pages/premium/Favorites";
import History from "./pages/premium/History";
import Folders from "./pages/premium/Folders";
import Browse from "./pages/Browse";
import About from "./pages/About";
import StationDetail from "./pages/StationDetail";
import TagFilter from "./pages/TagFilter";
import AdminRefresh from "./pages/AdminRefresh";
import AdminCache from "./pages/AdminCache";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import India from "./pages/India";
import Mobile from "./pages/Mobile";
import CarPlayer from "./pages/CarPlayer";
import IOSPlayer from "./pages/ios";
import IOSTagIndex from "./pages/ios/IOSTagIndex";
import IOSLanguageIndex from "./pages/ios/IOSLanguageIndex";
import IOSTagPlayer from "./pages/ios/IOSTagPlayer";
import IOSBrowse from "./pages/ios/IOSBrowse";
import MobileTagIndex from "./pages/mobile/MobileTagIndex";
import MobileLanguageIndex from "./pages/mobile/MobileLanguageIndex";
import MobileTagPlayer from "./pages/mobile/MobileTagPlayer";
import MobileBrowse from "./pages/mobile/MobileBrowse";
import MobileFavorites from "./pages/mobile/MobileFavorites";
import MobileHistory from "./pages/mobile/MobileHistory";
import MobileFolders from "./pages/mobile/MobileFolders";
import IOSFavorites from "./pages/ios/IOSFavorites";
import IOSHistory from "./pages/ios/IOSHistory";
import IOSFolders from "./pages/ios/IOSFolders";

const queryClient = new QueryClient();

// Detect iOS device
const isIOSDevice = () => {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

// Detect mobile device (non-iOS)
const isMobileDevice = () => {
  return /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Scroll to top on route change
const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
};

// Mobile redirect component for home page
const HomeWithMobileRedirect = () => {
  if (isIOSDevice()) {
    return <Navigate to="/ios" replace />;
  }
  if (isMobileDevice()) {
    return <Navigate to="/m" replace />;
  }
  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AudioProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<HomeWithMobileRedirect />} />
            <Route path="/ios" element={<IOSPlayer />} />
            <Route path="/ios/tags" element={<IOSTagIndex />} />
            <Route path="/ios/languages" element={<IOSLanguageIndex />} />
            <Route path="/ios/tag/:tag" element={<IOSTagPlayer />} />
            <Route path="/ios/browse" element={<IOSBrowse />} />
            <Route path="/ios/premium/favorites" element={<IOSFavorites />} />
            <Route path="/ios/premium/history" element={<IOSHistory />} />
            <Route path="/ios/premium/folders" element={<IOSFolders />} />
            <Route path="/m" element={<CarPlayer />} />
            <Route path="/m/tags" element={<MobileTagIndex />} />
            <Route path="/m/languages" element={<MobileLanguageIndex />} />
            <Route path="/m/tag/:tag" element={<MobileTagPlayer />} />
            <Route path="/m/browse" element={<MobileBrowse />} />
            <Route path="/m/premium/favorites" element={<MobileFavorites />} />
            <Route path="/m/premium/history" element={<MobileHistory />} />
            <Route path="/m/premium/folders" element={<MobileFolders />} />
            <Route path="/mobile" element={<Mobile />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/india" element={<India />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/premium/favorites" element={<Favorites />} />
            <Route path="/premium/history" element={<History />} />
            <Route path="/premium/folders" element={<Folders />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/tag/:tag" element={<TagFilter />} />
            <Route path="/admin-refresh-stations" element={<AdminRefresh />} />
            <Route path="/admin/cache" element={<AdminCache />} />
            <Route path="/:slug" element={<StationDetail />} />
            <Route path="/about" element={<About />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </AudioProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
