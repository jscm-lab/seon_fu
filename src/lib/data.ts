import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { todayWeek } from "@/lib/format";
import type {
  ProjectItem,
  ProjectMember,
  ProspectItem,
  ReportPayload,
  WeeklyReport,
} from "@/lib/types";

export const listReportWeeks = cache(async (): Promise<WeeklyReport[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("weekly_reports")
    .select("id, week_start, week_end")
    .order("week_start", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WeeklyReport[];
});

export async function ensureReport(weekStart?: string): Promise<WeeklyReport> {
  const sb = supabaseServer();
  if (weekStart) {
    const { data } = await sb
      .from("weekly_reports")
      .select("id, week_start, week_end")
      .eq("week_start", weekStart)
      .maybeSingle();
    if (data) return data as WeeklyReport;
  }
  // Pick most recent if none specified
  const list = await listReportWeeks();
  if (list.length > 0) return list[0];
  // Create one for current week
  const cur = todayWeek();
  const { data, error } = await sb
    .from("weekly_reports")
    .insert(cur)
    .select("id, week_start, week_end")
    .single();
  if (error) throw error;
  return data as WeeklyReport;
}

export async function loadReport(weekStart?: string): Promise<ReportPayload> {
  const report = await ensureReport(weekStart);
  const sb = supabaseServer();
  const [{ data: projects }, { data: members }, { data: prospects }] =
    await Promise.all([
      sb
        .from("project_items")
        .select("*")
        .eq("report_id", report.id)
        .order("seq", { ascending: true }),
      sb
        .from("project_members")
        .select("*")
        .order("position", { ascending: true }),
      sb
        .from("prospect_items")
        .select("*")
        .eq("report_id", report.id)
        .order("seq", { ascending: true }),
    ]);
  const membersByProject = new Map<string, ProjectMember[]>();
  (members ?? []).forEach((m: ProjectMember) => {
    const arr = membersByProject.get(m.project_item_id) ?? [];
    arr.push(m);
    membersByProject.set(m.project_item_id, arr);
  });
  return {
    report,
    projects: (projects ?? []).map((p) => ({
      ...p,
      contract_value_eok: Number(p.contract_value_eok),
      score: p.score == null ? null : Number(p.score),
      members: membersByProject.get(p.id) ?? [],
    })) as ProjectItem[],
    prospects: (prospects ?? []).map((p) => ({
      ...p,
      business_value_eok:
        p.business_value_eok == null ? null : Number(p.business_value_eok),
      contract_value_eok:
        p.contract_value_eok == null ? null : Number(p.contract_value_eok),
    })) as ProspectItem[],
  };
}
