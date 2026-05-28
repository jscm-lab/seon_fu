"use client";

import type { ProjectItem } from "@/lib/types";

const SCORE_COLOR = (score: number) => {
  if (score >= 90) return { bar: "#22C55E", text: "#16A34A" }; // green
  if (score >= 80) return { bar: "#3B82F6", text: "#1D4ED8" }; // blue
  if (score >= 70) return { bar: "#F59E0B", text: "#B45309" }; // amber
  return { bar: "#EF4444", text: "#B91C1C" };                   // red
};

export function BiddingScoreChart({ projects }: { projects: ProjectItem[] }) {
  const bidding = projects.filter(
    (p) => p.status === "bidding" && p.score != null,
  );

  if (bidding.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
        개찰 예정 항목에 평가점수를 입력하면 표시됩니다
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {bidding.map((p) => {
        const score = p.score!;
        const pct = Math.min(100, Math.max(0, score));
        const { bar, text } = SCORE_COLOR(score);
        return (
          <div key={p.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span
                className="max-w-[200px] truncate text-xs text-zinc-700"
                title={p.name}
              >
                {p.name}
              </span>
              <span
                className="shrink-0 text-xs font-semibold tabular-nums"
                style={{ color: text }}
              >
                {score.toFixed(1)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: bar }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
