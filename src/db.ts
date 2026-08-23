
/**
 * db.ts — barrel re-export (v4.0)
 * All logic lives in src/api/*. This file exists for backward compatibility.
 */

export * from "./infrastructure/api/client";
export * from "./features/categories/api";
export * from "./features/challenges/api";
export * from "./features/ranking/api";
export * from "./features/achievements/api";
export * from "./features/friends/api";
export * from "./features/teams/api";
export * from "./infrastructure/api/utils";

