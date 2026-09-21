
export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface User {
  id: string;
  username: string;
  // password n'est jamais renvoyé par l'API — ne pas l'exposer côté client
  isAdmin: boolean;
  createdAt: string;
  avatarEmoji?: string;
  bio?: string;
}

export type CategoryType = string; // Dynamique depuis l'API

export type DifficultyType = "easy" | "medium" | "hard";
export type DifficultyModeType = "auto" | "easy" | "medium" | "hard";

export interface ChallengeFile {
  id: string;
  name: string;
  url: string;
}

export interface Challenge {
  id: string;
  title: string;
  category: CategoryType;
  /** Valeur de départ, celle que l'admin saisit. */
  points: number;
  /** Valeur que rapporte le challenge au prochain joueur qui le résout. */
  currentPoints: number;
  /** Nombre de joueurs l'ayant déjà résolu. */
  solves: number;
  /** L'utilisateur courant peut-il modifier ce challenge ? (calculé par le serveur) */
  canEdit: boolean;
  /** L'utilisateur courant est-il l'auteur de ce challenge ? */
  mine: boolean;
  description: string;
  files: ChallengeFile[];
  // flag_encrypted n'est jamais renvoyé par l'API — le flag est saisi séparément par l'admin
  difficulty?: DifficultyType;
  difficultyMode?: DifficultyModeType;
  createdAt: string;
}

export interface FlagSubmission {
  id: string;
  userId: string;
  username: string;
  challengeId: string;
  challengeTitle: string;
  category: CategoryType;
  points: number;
  submittedAt: string;
  solveTimeMs?: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  descriptionMd: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export type AchievementConditionType =
  | "flags_count"
  | "points_total"
  | "category_flags"
  | "first_blood"
  | "speed_runner"
  | "category_perfect"
  | "night_owl"
  | "all_categories"
  | "top3"
  | "all_challenges"
  | "manual";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: AchievementConditionType;
  conditionValue: number;
  conditionCategory?: string;
  createdAt: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: string;
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

export interface RankingRow {
  username: string;
  points: number;
  solved: number;
}

export interface PlayerWithPoints {
  id: string;
  username: string;
  isAdmin: boolean;
  isAuthor: boolean;
  points: number;
  solved: number;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface UserSearchResult {
  id: string;
  username: string;
}

// ─── Essais de flags ──────────────────────────────────────────────────────────

export interface FlagAttempt {
  id: string;
  flag: string;
  submittedAt: string;
}

export interface FlagAttemptGroup {
  challengeId: string;
  challengeTitle: string;
  category: CategoryType;
  attempts: FlagAttempt[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotifType =
  | "friend_flag"
  | "friend_achievement"
  | "friend_request"
  | "rank1";

export type NotifBox = "perso" | "amis";

export interface AppNotification {
  id: string;
  type: NotifType;
  message: string;
  icon: string;
  timestamp: number;
  read: boolean;
  actorUsername?: string;
  targetName?: string;
  friendRequestId?: string;
}

// ─── CTF State ────────────────────────────────────────────────────────────────

export interface CTFState {
  gameStarted: boolean;
  scrambleStartedAt: string; // ISO datetime string ou '' si pas encore déclenché
  podiumVisible: boolean;
  podiumRevealed: number;   // 0-4 : nombre de gagnants révélés sur le podium
  eventTheme: string;       // '' | 'halloween' | 'noel' | 'paques'
}

export type CTFPhase =
  | 'not_started' // game_started = false
  | 'running'     // game_started, pas de brouillage
  | 'scramble'    // brouillage en cours (< 15 min depuis scramble_started_at)
  | 'grace'       // 15–18 min après scramble_started_at (3 min de grâce)
  | 'ended';      // > 18 min après scramble_started_at

