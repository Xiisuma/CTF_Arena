
import type { AchievementConditionType } from "../../types";

export const CONDITION_LABELS: Record<AchievementConditionType, string> = {
  flags_count:      "Nombre de flags total",
  points_total:     "Score total",
  category_flags:   "Flags dans une catégorie",
  first_blood:      "Premier flag du CTF",
  speed_runner:     "5 flags en moins de 30 minutes",
  category_perfect: "Tous les flags d'une catégorie",
  night_owl:        "Flag soumis entre 00h et 5h",
  all_categories:   "Au moins 1 flag dans chaque catégorie",
  top3:             "Top 3 du classement",
  all_challenges:   "Tous les challenges résolus",
  manual:           "Attribution manuelle",
};

export const CONDITION_ICONS: Record<AchievementConditionType, string> = {
  flags_count: "🏴", points_total: "⭐", category_flags: "🗂️",
  first_blood: "🩸", speed_runner: "⚡", category_perfect: "💎",
  night_owl: "🦉", all_categories: "🌐", top3: "🏆",
  all_challenges: "🎖️", manual: "👑",
};

export const NO_VALUE_CONDITIONS: AchievementConditionType[] = [
  "manual", "first_blood", "night_owl", "all_categories", "all_challenges", "category_perfect",
];

export const DEFAULT_ICONS = [
  "🏆","🥇","🔥","💎","⚡","🎯","🛡️","🗡️","🌟","👾",
  "🤖","🦾","🎖️","🧠","🔓","💀",
];

