
export interface RankInfo {
  id: string;
  label: string;
  icon: string;
  minFlags: number;
  maxFlags: number | null; // null = pas de limite
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export const RANKS: RankInfo[] = [
  {
    id: "starter",
    label: "Starter",
    icon: "🔰",
    minFlags: 0,
    maxFlags: 2,
    color: "#6B7280",
    textColor: "text-gray-400",
    bgColor: "bg-gray-500/20",
    borderColor: "border-gray-500/30",
  },
  {
    id: "beginner",
    label: "Beginner",
    icon: "🥉",
    minFlags: 3,
    maxFlags: 5,
    color: "#CD7F32",
    textColor: "text-amber-600",
    bgColor: "bg-amber-700/20",
    borderColor: "border-amber-700/30",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    icon: "🥈",
    minFlags: 6,
    maxFlags: 10,
    color: "#9CA3AF",
    textColor: "text-slate-300",
    bgColor: "bg-slate-400/20",
    borderColor: "border-slate-400/30",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: "🥇",
    minFlags: 11,
    maxFlags: 20,
    color: "#FBBF24",
    textColor: "text-yellow-300",
    bgColor: "bg-yellow-400/20",
    borderColor: "border-yellow-400/30",
  },
  {
    id: "expert",
    label: "Expert",
    icon: "💎",
    minFlags: 21,
    maxFlags: 30,
    color: "#38BDF8",
    textColor: "text-sky-300",
    bgColor: "bg-sky-400/20",
    borderColor: "border-sky-400/30",
  },
  {
    id: "master",
    label: "Master",
    icon: "👑",
    minFlags: 31,
    maxFlags: 50,
    color: "#A78BFA",
    textColor: "text-violet-300",
    bgColor: "bg-violet-400/20",
    borderColor: "border-violet-400/30",
  },
  {
    id: "terminator",
    label: "Terminator",
    icon: "💀",
    minFlags: 51,
    maxFlags: null,
    color: "#F87171",
    textColor: "text-rose-400",
    bgColor: "bg-rose-500/20",
    borderColor: "border-rose-500/30",
  },
];

export function getRankFromFlags(flagCount: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (flagCount >= RANKS[i].minFlags) return RANKS[i];
  }
  return RANKS[0];
}

export function getNextRank(current: RankInfo): RankInfo | null {
  const idx = RANKS.findIndex((r) => r.id === current.id);
  if (idx === -1 || idx === RANKS.length - 1) return null;
  return RANKS[idx + 1];
}

export function getRankProgress(flagCount: number): {
  current: RankInfo;
  next: RankInfo | null;
  progress: number; // 0–100
  flagsInRank: number;
  flagsNeeded: number;
} {
  const current = getRankFromFlags(flagCount);
  const next = getNextRank(current);

  if (!next) {
    return { current, next: null, progress: 100, flagsInRank: 0, flagsNeeded: 0 };
  }

  const flagsInRank = flagCount - current.minFlags;
  const rankSpan = next.minFlags - current.minFlags;
  const progress = Math.min(100, Math.round((flagsInRank / rankSpan) * 100));
  const flagsNeeded = next.minFlags - flagCount;

  return { current, next, progress, flagsInRank, flagsNeeded };
}
