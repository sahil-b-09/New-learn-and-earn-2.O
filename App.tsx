
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEffect, useState } from "react";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import MyCourses from "./pages/MyCourses";
import CourseDetail from "./pages/CourseDetail";
import CourseContent from "./pages/CourseContent";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import Referrals from "./pages/Referrals";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import Policies from "./pages/Policies";
import Feedback from "./pages/Feedback";
import AdminPanel from "./pages/AdminPanel";
import { initializeAppData } from "./utils/autoSetupCourses";
import { useLoginLogger } from "./hooks/useLoginLogger";
import { useSessionManager } from "./hooks/useSessionManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 minutes cache to reduce requests
      meta: {
        errorHandler: (error: Error) => {
          console.error("Query error:", error);
        }
      }
    },
  },
});

// AppInitializer component to handle initialization after auth is loaded
const AppInitializer = () => {
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);
  
  // Use session manager to prevent auto-reload issues
  useSessionManager();

  useEffect(() => {
    // Only initialize once per session and prevent multiple calls
    if (initialized || !user) return;
    
    const initialize = async () => {
      try {
        await initializeAppData();
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setInitialized(true);
      }
    };
    
    // Initialize immediately since the function is lightweight
    initialize();
  }, [user, initialized]);

  return null;
};

// Main App component wrapped with AuthProvider
const AppWithAuth = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { logLogin } = useLoginLogger();

  useEffect(() => {
    // Log login when user becomes authenticated
    if (user?.id) {
      logLogin(user.id);
    }
  }, [user?.id, logLogin]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppInitializer />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/policies" element={<Policies />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-courses" element={<MyCourses />} />
          <Route path="/course/:courseId" element={<CourseDetail />} />
          <Route path="/course/:courseId/content" element={<CourseContent />} />
          <Route path="/payment/:courseId" element={<Payment />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/feedback" element={<Feedback />} />
        </Route>
        
        {/* Admin routes */}
        <Route element={<ProtectedRoute requireAdmin={true} />}>
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppWithAuth />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
