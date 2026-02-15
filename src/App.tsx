import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AppLayout from '@/components/layout/AppLayout';
import { ProtectedRoute, PublicRoute } from '@/components/ProtectedRoute';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Practice = lazy(() => import('./pages/Practice'));
const Revision = lazy(() => import('./pages/Revision'));
const MockInterview = lazy(() => import('./pages/MockInterview'));
const Planner = lazy(() => import('./pages/Planner'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

const App = () => (
  <ThemeProvider>
    <Toaster />
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<PublicRoute element={<Login />} />} />
          <Route path="/signup" element={<PublicRoute element={<Signup />} />} />
          <Route path="/forgot-password" element={<PublicRoute element={<ForgotPassword />} />} />

          {/* Protected app routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
            <Route path="/practice" element={<ProtectedRoute element={<Practice />} />} />
            <Route path="/revision" element={<ProtectedRoute element={<Revision />} />} />
            <Route path="/mock-interview" element={<ProtectedRoute element={<MockInterview />} />} />
            <Route path="/planner" element={<ProtectedRoute element={<Planner />} />} />
            <Route path="/integrations" element={<ProtectedRoute element={<Integrations />} />} />
            <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
            <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
