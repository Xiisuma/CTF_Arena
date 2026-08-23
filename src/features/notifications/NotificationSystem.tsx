
/**
 * NotificationSystem.tsx v6.0
 *
 * Fournit le contexte de notifications (provider, hook useNotifications).
 * - Types : src/types.ts (NotifType, NotifBox, AppNotification)
 * - Popup UI : src/components/NotificationPopup.tsx
 * - Bell UI  : src/components/NotificationBell.tsx
 * - Helpers  : src/lib/notifUtils.ts
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getAllFlags,
  getAllUserAchievements,
  getAchievements,
  getFriends,
  getTeamMembers,
  getUserById,
  getPendingRequestsReceived,
  getUserTeam,
} from "../../db";
import { getUserTeamRole } from "../teams/api";
import { useAuth } from "../auth/AuthContext";
import { useChronoContext } from "../../shared/hooks/ChronoContext";
import type { AppNotification, NotifBox, NotifType } from "../../types";
import { NotificationPopupContainer } from "./NotificationPopup";
import { useWebSocket } from "../../shared/hooks/useWebSocket";

// ─── Box mapping ───────────────────────────────────────────────────────────────

export const NOTIF_BOX_MAP: Record<NotifType, NotifBox> = {
  rank1:              "perso",
  friend_flag:        "amis",
  friend_achievement: "amis",
  friend_request:     "amis",
  team_flag:          "team",
  team_achievement:   "team",
  team_join:          "team",
  team_role_change:   "team",
};

// ─── Context ───────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  unreadPerBox: Record<NotifBox, number>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  markBoxRead: (box: NotifBox) => void;
  deleteNotification: (id: string) => void;
  restoreNotification: (notif: AppNotification) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isChronoRunning } = useChronoContext();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [popupQueue, setPopupQueue] = useState<AppNotification[]>([]);
  const [visiblePopups, setVisiblePopups] = useState<AppNotification[]>([]);

  const seenFlagIds = useRef<Set<string>>(new Set());
  const seenAchievementIds = useRef<Set<string>>(new Set());
  const seenRank1UserId = useRef<string>("");
  const seenJoinKeys = useRef<Set<string>>(new Set());
  const seenFriendRequestIds = useRef<Set<string>>(new Set());
  const prevRoleRef = useRef<string | null>(null);
  const initialized = useRef(false);
  const prevChronoRunning = useRef(isChronoRunning);

  // ── Unread per box ──────────────────────────────────────────────────────────

  const unreadPerBox: Record<NotifBox, number> = {
    perso: notifications.filter((n) => !n.read && NOTIF_BOX_MAP[n.type] === "perso").length,
    amis:  notifications.filter((n) => !n.read && NOTIF_BOX_MAP[n.type] === "amis").length,
    team:  notifications.filter((n) => !n.read && NOTIF_BOX_MAP[n.type] === "team").length,
  };

  // ── Popup management ────────────────────────────────────────────────────────

  const showPopup = useCallback((notif: AppNotification) => {
    setVisiblePopups((prev) => [notif, ...prev].slice(0, 3));
    setTimeout(() => {
      setVisiblePopups((prev) => prev.filter((p) => p.id !== notif.id));
    }, 5000);
  }, []);

  const dismissPopup = useCallback((id: string) => {
    setVisiblePopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    const wasRunning = prevChronoRunning.current;
    prevChronoRunning.current = isChronoRunning;
    if (wasRunning && !isChronoRunning && popupQueue.length > 0) {
      popupQueue.forEach((notif, i) => {
        setTimeout(() => showPopup(notif), i * 700);
      });
      setPopupQueue([]);
    }
  }, [isChronoRunning, popupQueue, showPopup]);

  // ── Add notification ────────────────────────────────────────────────────────

  const addNotif = useCallback(
    (notif: Omit<AppNotification, "id" | "timestamp" | "read">) => {
      const newNotif: AppNotification = {
        ...notif,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 200));
      if (isChronoRunning) {
        setPopupQueue((prev) => [...prev, newNotif]);
      } else {
        showPopup(newNotif);
      }
    },
    [isChronoRunning, showPopup]
  );

  // ── Polling ─────────────────────────────────────────────────────────────────

  const checkForNewEvents = useCallback(async () => {
    if (!user) return;
    const isAdmin = user.isAdmin;

    try {
      const [allFlags, allUserAchievements, achievements] = await Promise.all([
        getAllFlags(),
        getAllUserAchievements(),
        getAchievements(),
      ]);

      const friendRequests = isAdmin ? [] : await getPendingRequestsReceived(user.id);
      const friends = isAdmin ? [] : await getFriends(user.id);
      const myTeam = isAdmin ? null : await getUserTeam(user.id);

      const friendIds = new Set(
        friends.map((f) =>
          f.fromUserId === user.id ? f.toUserId : f.fromUserId
        )
      );

      const teamMemberIds: Set<string> = new Set();
      if (myTeam) {
        const members = await getTeamMembers(myTeam.id);
        for (const m of members) {
          if (m.id !== user.id) teamMemberIds.add(m.id);
        }
      }

      // ── Flags ──
      for (const flag of allFlags) {
        if (flag.userId === user.id) continue;
        if (seenFlagIds.current.has(flag.id)) continue;
        seenFlagIds.current.add(flag.id);
        if (!initialized.current) continue;

        const isFriend = friendIds.has(flag.userId);
        const isTeamMember = teamMemberIds.has(flag.userId);
        if (!isAdmin && !isFriend && !isTeamMember) continue;

        const flagUser = await getUserById(flag.userId);
        const username = flagUser?.username ?? flag.username;
        const type: NotifType =
          isAdmin
            ? isTeamMember ? "team_flag" : "friend_flag"
            : isFriend ? "friend_flag" : "team_flag";

        addNotif({
          type,
          icon: type === "team_flag" ? "🛡️" : "🏴",
          message: `${username} a complété l'énigme "${flag.challengeTitle}"`,
          actorUsername: username,
          targetName: flag.challengeTitle,
        });
      }

      // ── Achievements ──
      for (const ua of allUserAchievements) {
        if (ua.userId === user.id) continue;
        if (seenAchievementIds.current.has(ua.id)) continue;
        seenAchievementIds.current.add(ua.id);
        if (!initialized.current) continue;

        const isFriend = friendIds.has(ua.userId);
        const isTeamMember = teamMemberIds.has(ua.userId);
        if (!isAdmin && !isFriend && !isTeamMember) continue;

        const achUser = await getUserById(ua.userId);
        const username = achUser?.username ?? ua.userId;
        const achievement = achievements.find((a) => a.id === ua.achievementId);
        if (!achievement) continue;

        const type: NotifType =
          isAdmin
            ? isTeamMember ? "team_achievement" : "friend_achievement"
            : isFriend ? "friend_achievement" : "team_achievement";

        addNotif({
          type,
          icon: achievement.icon,
          message: `${username} a débloqué le succès "${achievement.title}"`,
          actorUsername: username,
          targetName: achievement.title,
        });
      }

      if (!initialized.current) return;

      // ── Demandes d'amis reçues ──
      if (!isAdmin) {
        for (const req of friendRequests) {
          if (seenFriendRequestIds.current.has(req.id)) continue;
          seenFriendRequestIds.current.add(req.id);
          const fromUser = await getUserById(req.fromUserId);
          if (!fromUser) continue;
          addNotif({
            type: "friend_request",
            icon: "👤",
            message: `${fromUser.username} vous a envoyé une demande d'ami`,
            actorUsername: fromUser.username,
            friendRequestId: req.id,
          });
        }
      }

      // ── Nouveaux membres de la team ──
      if (myTeam && !isAdmin) {
        const members = await getTeamMembers(myTeam.id);
        for (const member of members) {
          if (member.id === user.id) continue;
          const joinKey = `${myTeam.id}:${member.id}`;
          if (seenJoinKeys.current.has(joinKey)) continue;
          seenJoinKeys.current.add(joinKey);
          addNotif({
            type: "team_join",
            icon: "👋",
            message: `${member.username} a rejoint votre team "${myTeam.name}"`,
            actorUsername: member.username,
            targetName: myTeam.name,
          });
        }
      }

      // ── Changement de rôle ──
      if (myTeam && !isAdmin) {
        const currentRole = await getUserTeamRole(user.id, myTeam.id);
        if (currentRole !== null) {
          const prevRole = prevRoleRef.current;
          if (prevRole !== null && prevRole !== currentRole) {
            addNotif({
              type: "team_role_change",
              icon: currentRole === "admin" ? "⭐" : "👤",
              message: `Votre rôle dans "${myTeam.name}" est maintenant : ${currentRole}`,
              actorUsername: user.username,
              targetName: myTeam.name,
            });
          }
          prevRoleRef.current = currentRole;
        }
      }
    } catch (e) {
      console.error("[NotifSystem] Erreur polling :", e);
    }
  }, [user, addNotif]);

  // ── Initialisation ──────────────────────────────────────────────────────────

  const initialize = useCallback(async () => {
    if (!user) return;
    try {
      const [allFlags, allUserAchievements] = await Promise.all([
        getAllFlags(),
        getAllUserAchievements(),
      ]);
      for (const flag of allFlags) seenFlagIds.current.add(flag.id);
      for (const ua of allUserAchievements) seenAchievementIds.current.add(ua.id);

      if (!user.isAdmin) {
        const myTeam = await getUserTeam(user.id);
        if (myTeam) {
          const members = await getTeamMembers(myTeam.id);
          for (const member of members) {
            seenJoinKeys.current.add(`${myTeam.id}:${member.id}`);
          }
        }
        const pending = await getPendingRequestsReceived(user.id);
        for (const req of pending) seenFriendRequestIds.current.add(req.id);
      }
    } catch {
      /* silencieux */
    }
    initialized.current = true;
  }, [user]);

  // Trigger instantané via WebSocket ciblé quand quelqu'un envoie une demande d'ami
  useWebSocket((msg) => {
    if (msg.type === "friend_request") {
      checkForNewEvents();
    }
  }, user?.id);

  useEffect(() => {
    if (!user) return;
    initialized.current = false;
    seenFlagIds.current = new Set();
    seenAchievementIds.current = new Set();
    seenJoinKeys.current = new Set();
    seenFriendRequestIds.current = new Set();
    seenRank1UserId.current = "";
    prevRoleRef.current = null;

    const t = setTimeout(initialize, 1000);
    const interval = setInterval(checkForNewEvents, 300000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [user, initialize, checkForNewEvents]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markBoxRead = useCallback((box: NotifBox) => {
    setNotifications((prev) =>
      prev.map((n) =>
        NOTIF_BOX_MAP[n.type] === box ? { ...n, read: true } : n
      )
    );
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const restoreNotification = useCallback((notif: AppNotification) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notif.id)) return prev;
      return [notif, ...prev].sort((a, b) => b.timestamp - a.timestamp);
    });
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadPerBox,
        markRead,
        markAllRead,
        markBoxRead,
        deleteNotification,
        restoreNotification,
        clearAll,
      }}
    >
      {children}
      <NotificationPopupContainer
        popups={visiblePopups}
        onDismiss={dismissPopup}
        pendingCount={popupQueue.length}
        isChronoRunning={isChronoRunning}
      />
    </NotificationContext.Provider>
  );
}

