
/**
 * Layout.tsx v3.0 — async API, zéro localStorage
 */

import { type ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useTheme } from "./ThemeContext";
import { useCurrentUserRank } from "../../features/ranking/useCurrentUserRank";
import { NotificationBell } from "../../features/notifications/NotificationBell";

const navItems = [
  { to: "/", label: "Enigmes", icon: "🏴", adminOnly: false },
  { to: "/ranking", label: "Classement", icon: "🏆", adminOnly: false },
  { to: "/achievements", label: "Succès", icon: "🎖️", adminOnly: false },
  { to: "/guide", label: "Règles", icon: "📜", adminOnly: false },
  { to: "/settings", label: "Parametres", icon: "⚙️", adminOnly: true },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const rank = useCurrentUserRank(user);

  if (!user) return <>{children}</>;

  const isProfilePage = location.pathname === "/profile";

  return (
    <div className="min-h-screen bg-primary text-primary">
      {resolvedTheme === "violet" && (
        <div className="pointer-events-none fixed left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full glow-theme blur-[120px]" />
      )}

      <nav className="sticky top-0 z-40 border-b border-primary bg-secondary/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-5">
            <Link to="/" className="text-lg font-extrabold accent-primary">
              🏴 CTF Arena
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              {navItems
                .filter((item) => !item.adminOnly || user.isAdmin)
                .map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`rounded-xl px-3 py-2 text-sm transition ${
                        active
                          ? "bg-accent-primary/30 text-primary shadow-inner"
                          : "text-tertiary hover:bg-card hover:text-secondary"
                      }`}
                    >
                      {item.icon} {item.label}
                    </Link>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sélecteur de thème */}
            <ThemeToggle />

            {/* Cloche notifications */}
            {!user.isAdmin && (
              <NotificationBell
                onOpenPage={() => navigate("/notifications")}
              />
            )}

            {/* Avatar + pseudo + rank */}
            <Link
              to="/profile"
              className={`flex items-center gap-2 rounded-lg px-2 py-1 transition border ${
                isProfilePage
                  ? "border-accent-primary/50 bg-accent-primary/10"
                  : "border-transparent hover:border-accent-primary/30 hover:bg-card"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/20 text-lg ring-2 ring-accent-primary/30 border border-primary">
                {user.avatarEmoji ?? user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:flex sm:flex-col sm:items-start">
                <span className="text-sm leading-tight text-secondary font-semibold">
                  {user.username}
                </span>
                {rank && (
                  <span
                    className={`text-[11px] font-semibold leading-tight ${rank.textColor}`}
                  >
                    {rank.icon} {rank.label}
                  </span>
                )}
              </div>
              <span className="hidden sm:block text-[10px] text-tertiary ml-0.5">
                ›
              </span>
            </Link>

            {user.isAdmin && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Admin
              </span>
            )}

            {isProfilePage && (
              <button
                onClick={logout}
                className="rounded-lg px-2 py-1 text-xs text-tertiary transition hover:bg-card hover:text-secondary"
              >
                Déconnexion
              </button>
            )}
          </div>
        </div>

        {/* Nav mobile */}
        <div className="mx-auto flex max-w-7xl gap-2 px-4 pb-3 sm:hidden sm:px-6">
          {navItems
            .filter((item) => !item.adminOnly || user.isAdmin)
            .map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-lg px-2 py-1 text-xs ${
                    active
                      ? "bg-accent-primary/30 text-primary"
                      : "text-tertiary"
                  }`}
                >
                  {item.icon}
                </Link>
              );
            })}
        </div>
      </nav>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
