"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatEok } from "@/lib/format";
import type { ProjectItem } from "@/lib/types";

export function ProjectTable({
  projects,
  onEdit,
  onDelete,
}: {
  projects: ProjectItem[];
  onEdit: (p: ProjectItem | null) => void;
  onDelete: (p: ProjectItem) => void;
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
        등록된 프로젝트가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[860px] table-fixed text-sm">
        <colgroup>
          <col className="w-[64px]" />
          <col className="w-[48px]" />
          <col />
          <col className="w-[80px]" />
          <col className="w-[80px]" />
          <col className="w-[80px]" />
          <col className="w-[80px]" />
          <col className="w-[96px]" />
          <col className="w-[64px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs text-zinc-600">
            <th className="px-3 py-2.5">구분</th>
            <th className="px-2 py-2.5">연번</th>
            <th className="px-3 py-2.5">용역명</th>
            <th className="px-2 py-2.5">단장</th>
            <th className="px-2 py-2.5">제출일</th>
            <th className="px-2 py-2.5">발표/면접</th>
            <th className="px-2 py-2.5">개찰일</th>
            <th className="px-3 py-2.5 text-right">용역비</th>
            <th className="px-2 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr
              key={p.id}
              className="cursor-pointer border-b border-zinc-50 transition-colors hover:bg-zinc-50/60"
              onClick={() => onEdit(p)}
            >
              <td className="px-3 py-2.5">
                {p.status === "bidding" ? (
                  <Badge tone="amber">개찰</Badge>
                ) : (
                  <Badge tone="blue">진행중</Badge>
                )}
              </td>
              <td className="px-2 py-2.5 tabular text-zinc-500">{p.seq}</td>
              <td className="px-3 py-2.5">
                <div className="font-medium text-zinc-900">{p.name}</div>
                {p.members.length > 0 && (
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {p.members
                      .map(
                        (m) =>
                          `${m.field} ${m.name}${m.org_tag ? `(${m.org_tag})` : ""}`,
                      )
                      .join(" · ")}
                  </div>
                )}
              </td>
              <td className="px-2 py-2.5 text-zinc-700">{p.pm_name}</td>
              <td className="px-2 py-2.5 tabular text-zinc-700">
                {p.submitted_at ?? "—"}
              </td>
              <td className="px-2 py-2.5 tabular text-zinc-700">
                {p.presentation_at ?? "—"}
              </td>
              <td className="px-2 py-2.5 tabular text-zinc-700">
                {p.bid_opening_at ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-right font-medium tabular">
                {formatEok(p.contract_value_eok)}
              </td>
              <td
                className="px-2 py-2.5 text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 hover:text-red-600"
                  onClick={() => {
                    if (confirm(`'${p.name}'을(를) 삭제하시겠습니까?`)) onDelete(p);
                  }}
                >
                  삭제
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
