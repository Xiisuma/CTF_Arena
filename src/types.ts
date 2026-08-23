
export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface User {
  id: string;
  username: string;
  // password n'est jamais renvoyé par l'API — ne pas l'exposer côté client
  isAdmin: boolean;
  createdAt: string;
  playMode: 'solo' | 'multiplayer';
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
  points: number;
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

export type TeamRole = "owner" | "admin" | "member";
export type TeamVisibility = "public" | "private";

export interface Team {
  id: string;
  name: string;
  description: string;
  emoji: string;
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamBan {
  id: string;
  teamId: string;
  userId: string;
  bannedAt: string;
}
// ─── Ranking ──────────────────────────────────────────────────────────────────

export interface RankingRow {
  username: string;
  points: number;
  solved: number;
}

export interface TeamRankingRow {
  team: Team;
  points: number;
  solved: number;
  memberCount: number;
}

export interface PlayerWithPoints {
  id: string;
  username: string;
  isAdmin: boolean;
  points: number;
  solved: number;
}

// ─── Teams (enriched) ─────────────────────────────────────────────────────────

export interface TeamMemberWithStats {
  id: string;
  username: string;
  role: TeamRole;
  points: number;
  solved: number;
  joinedAt: string;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface UserSearchResult {
  id: string;
  username: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotifType =
  | "friend_flag"
  | "friend_achievement"
  | "friend_request"
  | "team_flag"
  | "team_achievement"
  | "rank1"
  | "team_join"
  | "team_role_change";

export type NotifBox = "perso" | "amis" | "team";

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
  podiumRevealed: number;   // 0-5 : nombre de gagnants révélés sur le podium
  eventTheme: string;       // '' | 'halloween' | 'noel' | 'paques'
}

export type CTFPhase =
  | 'not_started' // game_started = false
  | 'running'     // game_started, pas de brouillage
  | 'scramble'    // brouillage en cours (< 15 min depuis scramble_started_at)
  | 'grace'       // 15–18 min après scramble_started_at (3 min de grâce)
  | 'ended';      // > 18 min après scramble_started_at

