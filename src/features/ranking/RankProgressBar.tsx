
import type { getRankProgress } from "./ranks";

type RankProgressData = ReturnType<typeof getRankProgress>;

export function RankProgressBar({
  rankData,
  solvedCount,
}: {
  rankData: RankProgressData;
  solvedCount: number;
}) {
  return (
    <div className="rounded-2xl border border-primary bg-card px-5 py-4 shadow-theme">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${rankData.current.textColor}`}>
            {rankData.current.icon} {rankData.current.label}
          </span>
          <span className="text-xs text-tertiary">
            · {solvedCount} flag{solvedCount > 1 ? "s" : ""} validé
            {solvedCount > 1 ? "s" : ""}
          </span>
        </div>
        {rankData.next ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-tertiary hidden sm:block">
              {rankData.flagsNeeded} flag{rankData.flagsNeeded > 1 ? "s" : ""} pour
            </span>
            <span className={`text-sm font-bold ${rankData.next.textColor}`}>
              {rankData.next.icon} {rankData.next.label}
            </span>
          </div>
        ) : (
          <span className={`text-xs font-bold ${rankData.current.textColor}`}>
            🎉 Rang maximum atteint !
          </span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-input">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${rankData.progress}%`,
            background: rankData.next
              ? `linear-gradient(90deg, ${rankData.current.color}, ${rankData.next.color})`
              : rankData.current.color,
          }}
        />
      </div>
      {rankData.next && (
        <p className="mt-1 text-right text-[11px] text-tertiary">{rankData.progress}%</p>
      )}
    </div>
  );
}

