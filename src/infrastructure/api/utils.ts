
export function validateUsername(username: string): string | null {
  if (username.trim().length < 3) return "Le nom d'utilisateur doit contenir au moins 3 caractères";
  if (username.trim().length > 30) return "Le nom d'utilisateur ne peut pas dépasser 30 caractères";
  if (!/^[a-zA-Z0-9_\-]+$/.test(username.trim()))
    return "Seuls les lettres, chiffres, _ et - sont autorisés";
  return null;
}

export function saveSession(_userId: string): void {}
export function loadSession(): string | null { return null; }
export function clearSession(): void {}

