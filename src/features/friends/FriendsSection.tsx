
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { useConfirm } from "../../shared/hooks/useConfirm";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getFriends,
  getPendingRequestsReceived,
  getPendingRequestsSent,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from "./api";
import { getRanking } from "../ranking/api";
import type { FriendRequest, UserSearchResult } from "../../types";

type FriendSubTab = "list" | "received" | "sent";

export function FriendsSection({ userId }: { userId: string }) {
  const [subTab, setSubTab] = useState<FriendSubTab>("list");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendRequest[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const { pendingConfirm, requestConfirm, closeConfirm } = useConfirm();

  useEffect(() => {
    if (window.location.hash === "#friend-requests") {
      setSubTab("received");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const forceRefresh = () => setRefresh((x) => x + 1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [fr, pr, ps] = await Promise.all([
        getFriends(userId),
        getPendingRequestsReceived(userId),
        getPendingRequestsSent(userId),
        getRanking(),
      ]);
      setFriends(fr);
      setPendingReceived(pr);
      setPendingSent(ps);
      setLoading(false);
    };
    load();
  }, [userId, refresh]);

  // Polling toutes les 15s — actualise les demandes d'amis en temps réel
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    pollRef.current = setInterval(() => forceRefresh(), 300000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length >= 2) {
      const results = await searchUsers(q, userId);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const friendIds = useMemo(() =>
    friends.map((f) => f.fromUserId === userId ? f.toUserId : f.fromUserId),
    [friends, userId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Recherche */}
      <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
        <h3 className="mb-3 text-sm font-bold text-primary">🔍 Ajouter un ami</h3>
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Rechercher un joueur (min. 2 caractères)…"
          className="w-full rounded-xl border border-secondary bg-input px-4 py-2.5 text-sm text-primary outline-none transition focus:ring-2 focus:ring-accent-primary/40"
        />
        {searchResults.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-xl border border-primary bg-input">
            {searchResults.map((result) => (
              <div key={result.id} className="flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-card">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-white">
                    {result.username.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-primary">{result.username}</span>
                </div>
                {friendIds.includes(result.id) ? (
                  <span className="text-xs text-emerald-400 font-semibold">✅ Déjà ami</span>
                ) : (
                  <button
                    onClick={async () => {
                      await sendFriendRequest(userId, result.id);
                      setSearch(""); setSearchResults([]); forceRefresh();
                    }}
                    className="rounded-lg bg-accent-primary px-3 py-1 text-xs font-semibold text-white transition hover:bg-accent-secondary"
                  >
                    + Demande
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sous-onglets */}
      <div className="flex rounded-xl bg-input p-1 w-fit gap-1 flex-wrap">
        {([
          { key: "list" as FriendSubTab, label: "👥 Mes amis", count: friends.length },
          { key: "received" as FriendSubTab, label: "📥 Reçues", count: pendingReceived.length },
          { key: "sent" as FriendSubTab, label: "📤 Envoyées", count: pendingSent.length },
        ]).map((cfg) => (
          <button
            key={cfg.key}
            onClick={() => setSubTab(cfg.key)}
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              subTab === cfg.key ? "bg-accent-primary text-white shadow-md" : "text-tertiary hover:text-secondary"
            }`}
          >
            {cfg.label}
            {cfg.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                subTab === cfg.key ? "bg-white/20 text-white" : "bg-accent-primary/20 text-accent-primary"
              }`}>
                {cfg.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste amis */}
      {subTab === "list" && (
        friends.length === 0 ? (
          <div className="rounded-2xl border border-primary bg-card p-10 text-center">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm text-tertiary">Vous n'avez pas encore d'amis.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((fr) => {
              const friendId = fr.fromUserId === userId ? fr.toUserId : fr.fromUserId;
              return (
                <div key={fr.id} className="flex items-center gap-4 rounded-2xl border border-primary bg-card px-5 py-4 shadow-theme">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-primary text-base font-bold text-white">
                    {friendId.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-primary truncate">Ami #{friendId.slice(0, 8)}</p>
                    <p className="text-xs text-tertiary">Depuis {new Date(fr.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <button
                    onClick={async () => {
                      requestConfirm({
                        title: "Retirer cet ami",
                        message: "Retirer cet ami de votre liste ?",
                        confirmLabel: "Retirer",
                        danger: true,
                        onConfirm: async () => { closeConfirm(); await removeFriend(userId, friendId); forceRefresh(); },
                      });
                    }}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20"
                  >
                    Retirer
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Demandes reçues */}
      {subTab === "received" && (
        pendingReceived.length === 0 ? (
          <div className="rounded-2xl border border-primary bg-card p-10 text-center">
            <p className="text-3xl mb-2">📥</p>
            <p className="text-sm text-tertiary">Aucune demande reçue.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingReceived.map((req) => (
              <div key={req.id} className="flex items-center gap-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 px-5 py-4 shadow-theme">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-primary text-base font-bold text-white">
                  {req.fromUserId.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-primary">Utilisateur #{req.fromUserId.slice(0, 8)}</p>
                  <p className="text-xs text-tertiary">{new Date(req.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={async () => { await acceptFriendRequest(req.id, userId); forceRefresh(); }}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    ✓ Accepter
                  </button>
                  <button
                    onClick={async () => { await rejectFriendRequest(req.id, userId); forceRefresh(); }}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20"
                  >
                    ✕ Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Demandes envoyées */}
      {subTab === "sent" && (
        pendingSent.length === 0 ? (
          <div className="rounded-2xl border border-primary bg-card p-10 text-center">
            <p className="text-3xl mb-2">📤</p>
            <p className="text-sm text-tertiary">Aucune demande envoyée en attente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSent.map((req) => (
              <div key={req.id} className="flex items-center gap-4 rounded-2xl border border-primary bg-card px-5 py-4 shadow-theme">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-primary text-base font-bold text-white">
                  {req.toUserId.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-primary">Utilisateur #{req.toUserId.slice(0, 8)}</p>
                  <p className="text-xs text-amber-300 font-semibold">⏳ En attente</p>
                </div>
                <button
                  onClick={async () => { await cancelFriendRequest(req.id, userId); forceRefresh(); }}
                  className="shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20"
                >
                  Annuler
                </button>
              </div>
            ))}
          </div>
        )
      )}
      {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={closeConfirm} />}
    </div>
  );
}

