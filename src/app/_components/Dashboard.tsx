"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { KpiCards } from "./KpiCards";
import { StatusChart } from "./StatusChart";
import { ProjectTable } from "./ProjectTable";
import { ProspectTable } from "./ProspectTable";
import { OsgSection } from "./OsgSection";
import { WeekSelector } from "./WeekSelector";
import { HwpxDownloadButton } from "./HwpxDownloadButton";
import { BiddingScoreChart } from "./BiddingScoreChart";
import { ProjectFormSheet } from "./ProjectFormSheet";
import { ProspectFormSheet } from "./ProspectFormSheet";
import { deleteProject, deleteProspect } from "@/lib/actions";
import { formatWeekRange } from "@/lib/format";
import type {
  ProjectItem,
  ProspectItem,
  ReportPayload,
  WeeklyReport,
} from "@/lib/types";

export function Dashboard({
  payload,
  weeks,
}: {
  payload: ReportPayload;
  weeks: WeeklyReport[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [projectSheet, setProjectSheet] = useState<{
    open: boolean;
    item: ProjectItem | null;
  }>({ open: false, item: null });
  const [prospectSheet, setProspectSheet] = useState<{
    open: boolean;
    item: ProspectItem | null;
  }>({ open: false, item: null });

  const { report, projects, prospects } = payload;
  const nextProjectSeq =
    (projects.reduce((m, p) => Math.max(m, p.seq), 0) || 0) + 1;
  const nextProspectSeq =
    (prospects.reduce((m, p) => Math.max(m, p.seq), 0) || 0) + 1;

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            미래사업팀
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            주간업무 대시보드{" "}
            <span className="text-zinc-400">
              ({formatWeekRange(report.week_start, report.week_end)})
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <WeekSelector weeks={weeks} current={report} />
          <HwpxDownloadButton weekStart={report.week_start} />
        </div>
      </header>

      <section className="mb-5">
        <KpiCards projects={projects} />
      </section>

      <section className="mb-6">
        <Card className="px-5 py-4">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="shrink-0">
              <div className="mb-3 text-sm font-semibold text-zinc-900">
                상태별 분포
              </div>
              <StatusChart projects={projects} />
            </div>
            <div className="hidden sm:block w-px self-stretch bg-zinc-100" />
            <div className="min-w-0 flex-1">
              <div className="mb-3 text-sm font-semibold text-zinc-900">
                개찰 예정 평가점수
              </div>
              <BiddingScoreChart projects={projects} />
            </div>
          </div>
        </Card>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">
            1) 수행 Project{" "}
            <span className="ml-1 text-zinc-400">({projects.length})</span>
          </h2>
          <Button
            size="sm"
            onClick={() => setProjectSheet({ open: true, item: null })}
          >
            + 행 추가
          </Button>
        </div>
        <ProjectTable
          projects={projects}
          onEdit={(p) => setProjectSheet({ open: true, item: p })}
          onDelete={(p) =>
            startTransition(async () => {
              await deleteProject(p.id);
              router.refresh();
            })
          }
        />
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">
            2) 발주예상 Project{" "}
            <span className="ml-1 text-zinc-400">({prospects.length})</span>
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setProspectSheet({ open: true, item: null })}
          >
            + 행 추가
          </Button>
        </div>
        <ProspectTable
          prospects={prospects}
          onEdit={(p) => setProspectSheet({ open: true, item: p })}
          onDelete={(p) =>
            startTransition(async () => {
              await deleteProspect(p.id);
              router.refresh();
            })
          }
        />
      </section>

      <section>
        <OsgSection projects={projects} />
      </section>

      <ProjectFormSheet
        open={projectSheet.open}
        onClose={() => setProjectSheet({ open: false, item: null })}
        reportId={report.id}
        project={projectSheet.item}
        nextSeq={nextProjectSeq}
      />
      <ProspectFormSheet
        open={prospectSheet.open}
        onClose={() => setProspectSheet({ open: false, item: null })}
        reportId={report.id}
        prospect={prospectSheet.item}
        nextSeq={nextProspectSeq}
      />
    </div>
  );
}
