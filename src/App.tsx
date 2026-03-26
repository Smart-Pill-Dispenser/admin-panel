import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Devices from "@/pages/Devices";
import DeviceDetail from "@/pages/DeviceDetail";
import Caregivers from "@/pages/Caregivers";
import CaregiversList from "@/pages/CaregiversList";
import CaregiverDetail from "@/pages/CaregiverDetail";
import PharmacyList from "@/pages/PharmacyList";
import PharmacyDetail from "@/pages/PharmacyDetail";
import HelpSupport from "@/pages/HelpSupport";
import LogsAnalytics from "@/pages/LogsAnalytics";
import SystemConfig from "@/pages/SystemConfig";
import NotFound from "@/pages/NotFound";

const LAST_ROUTE_KEY = "admin_last_route";
const PUBLIC_PATHS = ["/login", "/reset-password"];

function RouteRestorer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Save current protected route synchronously during render.
  // This is important because the initial protected-route redirect to `/login`
  // can happen before `useEffect` runs on refresh.
  try {
    if (!PUBLIC_PATHS.includes(location.pathname)) {
      // Important: don't overwrite an already-saved non-root route when the
      // current pathname is `/`, otherwise refresh will "lose" the original
      // deep link and fall back to the dashboard.
      const existing = sessionStorage.getItem(LAST_ROUTE_KEY);
      const next = location.pathname + location.search;

      if (location.pathname === "/") {
        if (existing === null || existing === "/") {
          sessionStorage.setItem(LAST_ROUTE_KEY, next);
        }
      } else {
        sessionStorage.setItem(LAST_ROUTE_KEY, next);
      }
    }
  } catch {
    // Non-fatal (storage might be blocked)
  }

  // On first authenticated mount, restore saved route
  useEffect(() => {
    if (!isAuthenticated) return;
    const saved = sessionStorage.getItem(LAST_ROUTE_KEY);
    if (saved && saved !== "/" && location.pathname === "/") {
      navigate(saved, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <>
  <RouteRestorer />
  <Routes>
    <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route index element={<Dashboard />} />
      <Route path="devices" element={<Devices />} />
      <Route path="devices/:id" element={<DeviceDetail />} />
      <Route path="caregivers" element={<Caregivers />} />
      <Route path="user-management" element={<Navigate to="/user-management/caregivers" replace />} />
      <Route path="user-management/caregivers" element={<CaregiversList />} />
      <Route path="user-management/caregivers/:id" element={<CaregiverDetail />} />
      <Route path="user-management/pharmacy" element={<PharmacyList />} />
      <Route path="user-management/pharmacy/:id" element={<PharmacyDetail />} />
      <Route path="help-support" element={<HelpSupport />} />
      <Route path="logs" element={<LogsAnalytics />} />
      <Route path="system-config" element={<SystemConfig />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
      <AuthProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
      </AuthProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
