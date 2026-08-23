
/**
 * App.tsx v4.3
 * - React.lazy + Suspense pour le code splitting des routes
 * - ErrorBoundary racine + par route
 * - CTFStateProvider : état CTF partagé via context (fix bug refresh isolé)
 * - loadCategories() au montage pour initialiser le store dynamique
 */

import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./shared/ui/Layout";
import { ErrorBoundary } from "./shared/ui/ErrorBoundary";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { ChronoProvider } from "./shared/hooks/ChronoContext";
import { ThemeProvider } from "./shared/ui/ThemeContext";
import { NotificationProvider } from "./features/notifications/NotificationSystem";
import { loadCategories } from "./features/categories/store";
import { CTFStateProvider, useCTFState } from "./features/ctf/CTFStateContext";

// ─── Lazy page imports (code splitting par route) ─────────────────────────────

const LoginPage         = lazy(() => import("./pages/LoginPage"));
const HomePage          = lazy(() => import("./pages/HomePage"));
const RankingPage       = lazy(() => import("./pages/RankingPage"));
const GuidePage         = lazy(() => import("./pages/GuidePage"));
const ProfilePage       = lazy(() => import("./pages/ProfilePage"));
const AchievementsPage  = lazy(() => import("./pages/AchievementsPage"));
const SettingsPage      = lazy(() => import("./pages/SettingsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const PodiumPage        = lazy(() => import("./pages/PodiumPage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));

// ─── Spinner partagé (fallback Suspense et auth loading) ─────────────────────

function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary">
      <span className="text-2xl animate-spin">⚙️</span>
    </div>
  );
}

// ─── Chargement initial des catégories ───────────────────────────────────────

function EventThemeApplier() {
  const { ctfState } = useCTFState();
  useEffect(() => {
    const root = document.documentElement;
    if (ctfState.eventTheme) {
      root.setAttribute('data-event', ctfState.eventTheme);
    } else {
      root.removeAttribute('data-event');
    }
  }, [ctfState.eventTheme]);
  return null;
}

function CategoriesLoader() {
  useEffect(() => {
    loadCategories().catch(() => {});
  }, []);
  return null;
}

// ─── Route protégée ───────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { user, loading } = useAuth();
  const { ctfState } = useCTFState();

  if (loading) return <PageSpinner />;

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/login"         element={user ? <Navigate to="/" replace /> : <ErrorBoundary><LoginPage /></ErrorBoundary>} />
        <Route path="/"              element={<ProtectedRoute><ErrorBoundary>{ctfState.podiumVisible ? <PodiumPage /> : <HomePage />}</ErrorBoundary></ProtectedRoute>} />
        <Route path="/ranking"       element={<ProtectedRoute><ErrorBoundary><RankingPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/guide"         element={<ProtectedRoute><ErrorBoundary><GuidePage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/profile"       element={<ProtectedRoute><ErrorBoundary><ProfilePage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/achievements"  element={<ProtectedRoute><ErrorBoundary><AchievementsPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/settings"      element={<ProtectedRoute><ErrorBoundary><SettingsPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><ErrorBoundary><NotificationsPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/profile/:username" element={<ProtectedRoute><ErrorBoundary><PublicProfilePage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// ─── Racine ───────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <CTFStateProvider>
              <ChronoProvider>
                <NotificationProvider>
                  <CategoriesLoader />
                  <EventThemeApplier />
                  <AppRoutes />
                </NotificationProvider>
              </ChronoProvider>
            </CTFStateProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

