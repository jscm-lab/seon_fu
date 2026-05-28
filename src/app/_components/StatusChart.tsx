"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ProjectItem } from "@/lib/types";

export function StatusChart({ projects }: { projects: ProjectItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = [
    {
      name: "진행중",
      value: projects.filter((p) => p.status === "in_progress").length,
      color: "#3B82F6",
    },
    {
      name: "개찰 대기",
      value: projects.filter((p) => p.status === "bidding").length,
      color: "#F59E0B",
    },
  ];
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="h-[140px] w-[140px]">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={40}
                outerRadius={60}
                strokeWidth={0}
                paddingAngle={2}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-full bg-zinc-50" />
        )}
      </div>
      <div className="space-y-2 text-sm">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: d.color }}
            />
            <span className="w-16 text-zinc-600">{d.name}</span>
            <span className="font-medium tabular text-zinc-900">{d.value}건</span>
          </div>
        ))}
        <div className="pt-1 text-xs text-zinc-500">전체 {total}건</div>
      </div>
    </div>
  );
}
