import { Card } from "@/components/ui/Card";
import { formatEok, sumEok } from "@/lib/format";
import type { ProjectItem } from "@/lib/types";

export function KpiCards({ projects }: { projects: ProjectItem[] }) {
  const total = sumEok(projects.map((p) => p.contract_value_eok));
  const bidding = projects.filter((p) => p.status === "bidding");
  const inProgress = projects.filter((p) => p.status === "in_progress");

  const kpis = [
    { label: "총 용역비", value: formatEok(total), accent: "text-zinc-900" },
    { label: "진행중", value: `${inProgress.length}건`, accent: "text-blue-700" },
    { label: "개찰 대기", value: `${bidding.length}건`, accent: "text-amber-700" },
    {
      label: "개찰 합계",
      value: formatEok(sumEok(bidding.map((p) => p.contract_value_eok))),
      accent: "text-zinc-900",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpis.map((k) => (
        <Card key={k.label} className="px-5 py-4">
          <div className="text-xs text-zinc-500">{k.label}</div>
          <div className={`mt-1 text-2xl font-semibold tabular ${k.accent}`}>
            {k.value}
          </div>
        </Card>
      ))}
    </div>
  );
}
