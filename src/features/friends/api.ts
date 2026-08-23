
import { apiFetch } from "../../infrastructure/api/client";
import { getPlayersWithPoints } from "../ranking/api";
import { FriendRequestSchema, UserSearchResultSchema, validate, toRawArray } from "../../infrastructure/api/schemas";
import type { FriendRequest, User, UserSearchResult } from "../../types";

function normalizeFriendRequest(raw: Record<string, unknown>): FriendRequest {
  const result: FriendRequest = {
    id: String(raw.id),
    fromUserId: String(raw.from_user_id ?? raw.fromUserId),
    toUserId: String(raw.to_user_id ?? raw.toUserId),
    status: (raw.status ?? "pending") as FriendRequest["status"],
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
  };
  return validate(FriendRequestSchema, result, "FriendRequest");
}

export async function sendFriendRequest(_fromUserId: string, toUserId: string): Promise<boolean> {
  const data = await apiFetch("send_friend_request", { method: "POST", body: JSON.stringify({ toUserId }) });
  return Boolean(data.ok);
}

export async function acceptFriendRequest(requestId: string, _toUserId: string): Promise<boolean> {
  const data = await apiFetch("accept_friend_request", { method: "POST", body: JSON.stringify({ requestId }) });
  return Boolean(data.ok);
}

export async function rejectFriendRequest(requestId: string, _toUserId: string): Promise<boolean> {
  const data = await apiFetch("reject_friend_request", { method: "POST", body: JSON.stringify({ requestId }) });
  return Boolean(data.ok);
}

export async function cancelFriendRequest(requestId: string, _fromUserId: string): Promise<boolean> {
  const data = await apiFetch("cancel_friend_request", { method: "POST", body: JSON.stringify({ requestId }) });
  return Boolean(data.ok);
}

export async function removeFriend(_userId: string, friendId: string): Promise<boolean> {
  const data = await apiFetch("remove_friend", { method: "POST", body: JSON.stringify({ friendId }) });
  return Boolean(data.ok);
}

export async function getFriends(userId?: string): Promise<FriendRequest[]> {
  const data = await apiFetch("get_friends", { method: "GET" });
  if (!data.ok || !Array.isArray(data.friends)) return [];
  const all = toRawArray(data.friends).map(normalizeFriendRequest);
  if (!userId) return all;
  return all.filter((f) => f.fromUserId === userId || f.toUserId === userId);
}

export async function getFriendIds(userId?: string): Promise<string[]> {
  const friends = await getFriends(userId);
  return friends.map((f) => (f.fromUserId === (userId ?? "") ? f.toUserId : f.fromUserId));
}

export async function areFriends(userId: string, otherId: string): Promise<boolean> {
  const friends = await getFriends(userId);
  return friends.some(
    (f) =>
      (f.fromUserId === userId && f.toUserId === otherId) ||
      (f.fromUserId === otherId && f.toUserId === userId)
  );
}

export async function hasPendingRequest(fromUserId: string, toUserId: string): Promise<boolean> {
  const sent = await getPendingRequestsSent(fromUserId);
  return sent.some((r) => r.toUserId === toUserId);
}

export async function getPendingRequestsReceived(_userId?: string): Promise<FriendRequest[]> {
  const data = await apiFetch("get_pending_received", { method: "GET" });
  if (!data.ok || !Array.isArray(data.requests)) return [];
  return toRawArray(data.requests).map(normalizeFriendRequest);
}

export async function getPendingRequestsSent(_userId?: string): Promise<FriendRequest[]> {
  const data = await apiFetch("get_pending_sent", { method: "GET" });
  if (!data.ok || !Array.isArray(data.requests)) return [];
  return toRawArray(data.requests).map(normalizeFriendRequest);
}

export async function searchUsers(
  query: string,
  _currentUserId?: string
): Promise<UserSearchResult[]> {
  if (query.trim().length < 2) return [];
  const data = await apiFetch("search_users", { method: "GET" }, { q: query });
  if (!data.ok || !Array.isArray(data.users)) return [];
  return toRawArray(data.users).map((u): UserSearchResult => {
    const result: UserSearchResult = { id: String(u.id), username: String(u.username) };
    return validate(UserSearchResultSchema, result, "UserSearchResult");
  });
}

export async function getUserById(id: string): Promise<User | null> {
  const players = await getPlayersWithPoints();
  const p = players.find((pl) => pl.id === id);
  if (!p) return null;
  return { id: p.id, username: p.username, isAdmin: p.isAdmin, createdAt: "", playMode: "solo" as const };
}

