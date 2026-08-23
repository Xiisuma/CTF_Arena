
/**
 * EmptyState — état "liste vide" partagé entre toutes les pages.
 * Couvre le 4ème état du cycle loading/error/empty/success.
 */
export function EmptyState({
  icon = "📭",
  message,
  hint,
}: {
  icon?: string;
  message: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-primary bg-card px-6 py-14 text-center shadow-theme">
      <span className="mb-3 text-4xl">{icon}</span>
      <p className="text-sm font-semibold text-secondary">{message}</p>
      {hint && <p className="mt-1 text-xs text-tertiary">{hint}</p>}
    </div>
  );
}

