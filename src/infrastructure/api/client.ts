
// ─── Client HTTP partagé ──────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? "/api.php";

let _csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  _csrfToken = token;
}
export function getCsrfToken(): string | null {
  return _csrfToken;
}

export async function apiFetch(
  action: string,
  options: RequestInit = {},
  extraParams: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ action, ...extraParams });
  const url = `${API_BASE}?${params}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (_csrfToken) headers["X-CSRF-Token"] = _csrfToken;

  try {
    const res = await fetch(url, { ...options, headers, credentials: "include" });
    const data = await res.json();
    if (data.csrf) setCsrfToken(data.csrf as string);
    return data;
  } catch (e) {
    console.error("[CTF Arena] Erreur réseau :", e);
    return { ok: false, error: "Erreur réseau" };
  }
}

