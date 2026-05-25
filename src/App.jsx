import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import NotificationBell from './components/NotificationBell';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tokens = lazy(() => import('./pages/Tokens'));
const Packages = lazy(() => import('./pages/Packages'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Topup = lazy(() => import('./pages/Topup'));
const Logs = lazy(() => import('./pages/Logs'));
const Tasks = lazy(() => import('./pages/Tasks'));
const SubDistributor = lazy(() => import('./pages/SubDistributor'));

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--page-bg)' }}>
    <div className="w-8 h-8 rounded-full animate-spin"
      style={{ border: '2px solid var(--page-spinner-track)', borderTopColor: 'var(--page-spinner)' }} />
  </div>
);

function ThemedRoutes() {
  const { Home, Layout } = useTheme();

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public pages with themed layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/sub-site" element={<SubDistributor />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected pages */}
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tokens" element={<Tokens />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/topup" element={<Topup />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotificationBell />
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemedRoutes />
    </ThemeProvider>
  );
}
