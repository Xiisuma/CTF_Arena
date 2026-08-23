
interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="text-4xl">⚠️</span>
      <p className="text-sm font-semibold text-rose-300">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-xl border border-primary bg-input px-5 py-2 text-sm font-semibold text-secondary transition hover:bg-card"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

