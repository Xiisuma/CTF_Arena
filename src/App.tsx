
/**
 * App.tsx v4.3
 * - React.lazy + Suspense pour le code splitting des routes
 * - ErrorBoundary racine + par route
 * - CTFStateProvider : état CTF partagé via context (fix bug refresh isolé)
 * - loadCategories() au montage pour initialiser le store dynamique
 */

import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from "react";
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

const CHUNK_RELOAD_KEY = "ctf-chunk-reload";

/**
 * Charge une page en différé, avec un filet de sécurité au déploiement.
 *
 * Les bundles Vite portent un hash dans leur nom : après une mise à jour, un
 * onglet ouvert (ou un index.html encore en cache) demande des fichiers qui
 * n'existent plus. Plutôt qu'un écran d'erreur, on recharge une seule fois pour
 * récupérer la nouvelle version. Si l'échec persiste, l'erreur est propagée à
 * l'ErrorBoundary : inutile de boucler sur des rechargements.
 */
function lazyPage<P>(factory: () => Promise<{ default: ComponentType<P> }>) {
  return lazy(() =>
    factory().catch((error: unknown) => {
      let alreadyReloaded = true;
      try {
        alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
        if (!alreadyReloaded) sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      } catch {
        // Stockage indisponible : on ne recharge pas, pour éviter une boucle
      }
      if (alreadyReloaded) throw error;
      window.location.reload();
      // Le rechargement est en cours : on laisse le spinner affiché
      return new Promise<{ default: ComponentType<P> }>(() => {});
    })
  );
}

const LoginPage         = lazyPage(() => import("./pages/LoginPage"));
const HomePage          = lazyPage(() => import("./pages/HomePage"));
const RankingPage       = lazyPage(() => import("./pages/RankingPage"));
const GuidePage         = lazyPage(() => import("./pages/GuidePage"));
const ProfilePage       = lazyPage(() => import("./pages/ProfilePage"));
const AchievementsPage  = lazyPage(() => import("./pages/AchievementsPage"));
const SettingsPage      = lazyPage(() => import("./pages/SettingsPage"));
const NotificationsPage = lazyPage(() => import("./pages/NotificationsPage"));
const PodiumPage        = lazyPage(() => import("./pages/PodiumPage"));
const PublicProfilePage = lazyPage(() => import("./pages/PublicProfilePage"));

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
    // L'application a démarré : le filet anti-chunk-manquant est réarmé pour
    // le prochain déploiement.
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    } catch {
      // Stockage indisponible : rien à nettoyer
    }
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

