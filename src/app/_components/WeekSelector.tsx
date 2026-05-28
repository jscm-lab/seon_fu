"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createNewWeek } from "@/lib/actions";
import { formatWeekRange } from "@/lib/format";
import type { WeeklyReport } from "@/lib/types";

export function WeekSelector({
  weeks,
  current,
}: {
  weeks: WeeklyReport[];
  current: WeeklyReport;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={current.week_start}
        onChange={(e) => router.push(`/?week=${e.target.value}`)}
        className="w-[240px]"
      >
        {weeks.map((w) => (
          <option key={w.id} value={w.week_start}>
            {formatWeekRange(w.week_start, w.week_end)}
          </option>
        ))}
      </Select>
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const ws = await createNewWeek();
            router.push(`/?week=${ws}`);
          })
        }
      >
        + 이번 주 새 보고서
      </Button>
    </div>
  );
}
