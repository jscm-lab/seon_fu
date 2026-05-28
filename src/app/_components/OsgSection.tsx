import { Card } from "@/components/ui/Card";
import { FIELD_OPTIONS } from "@/lib/types";
import type { ProjectItem } from "@/lib/types";

export function OsgSection({ projects }: { projects: ProjectItem[] }) {
  const pmNames: string[] = [];
  const seenPm = new Set<string>();
  projects.forEach((p) => {
    if (p.pm_name && !seenPm.has(p.pm_name)) {
      seenPm.add(p.pm_name);
      pmNames.push(p.pm_name);
    }
  });

  const byField = new Map<string, { name: string; org_tag: string | null }[]>();
  const seenMember = new Set<string>();
  projects.forEach((p) =>
    p.members.forEach((m) => {
      const key = `${m.field}|${m.name}|${m.org_tag ?? ""}`;
      if (seenMember.has(key)) return;
      seenMember.add(key);
      const arr = byField.get(m.field) ?? [];
      arr.push({ name: m.name, org_tag: m.org_tag });
      byField.set(m.field, arr);
    }),
  );

  const fieldsInOrder = FIELD_OPTIONS.filter((f) => byField.has(f));

  return (
    <Card className="px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">
          3) 교육참가자(OSG팀)
        </h3>
        <span className="text-xs text-zinc-400">자동 집계</span>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="mr-2 text-zinc-500">• 책임기술자</span>
          <span className="text-xs text-zinc-400">({pmNames.length}명)</span>
          <span className="ml-2 text-zinc-800">
            {pmNames.length ? pmNames.join(", ") : "—"}
          </span>
        </div>
        {fieldsInOrder.map((field) => {
          const members = byField.get(field)!;
          return (
            <div key={field}>
              <span className="mr-2 text-zinc-500">• {field}</span>
              <span className="text-xs text-zinc-400">({members.length}명)</span>
              <span className="ml-2 text-zinc-800">
                {members
                  .map(
                    (m) => `${m.name}${m.org_tag ? `(${m.org_tag})` : ""}`,
                  )
                  .join(", ")}
              </span>
            </div>
          );
        })}
        {pmNames.length === 0 && fieldsInOrder.length === 0 && (
          <div className="text-zinc-500">등록된 인력이 없습니다.</div>
        )}
      </div>
    </Card>
  );
}
