"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { parseMembersText, todayWeek } from "@/lib/format";
import { FIELD_OPTIONS } from "@/lib/types";

export type ProjectInput = {
  id?: string;
  report_id: string;
  status: "bidding" | "in_progress";
  seq: number;
  name: string;
  pm_name: string;
  submitted_at: string | null;
  presentation_at: string | null;
  bid_opening_at: string | null;
  contract_value_eok: number;
  score: number | null;
  members_text: string;
};

export async function saveProject(input: ProjectInput) {
  const sb = supabaseServer();
  const payload = {
    report_id: input.report_id,
    status: input.status,
    seq: input.seq,
    name: input.name.trim(),
    pm_name: input.pm_name.trim(),
    submitted_at: input.submitted_at,
    presentation_at: input.presentation_at,
    bid_opening_at: input.bid_opening_at,
    contract_value_eok: input.contract_value_eok,
    score: input.score,
  };
  let itemId = input.id;
  if (itemId) {
    const { error } = await sb
      .from("project_items")
      .update(payload)
      .eq("id", itemId);
    if (error) throw new Error(error.message);
    await sb.from("project_members").delete().eq("project_item_id", itemId);
  } else {
    const { data, error } = await sb
      .from("project_items")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    itemId = data!.id;
  }
  const parsed = parseMembersText(input.members_text);
  if (parsed.length > 0) {
    const rows = parsed.map((m, i) => ({
      project_item_id: itemId!,
      field: (FIELD_OPTIONS as readonly string[]).includes(m.field)
        ? m.field
        : "기타",
      name: m.name,
      org_tag: m.org_tag,
      position: i,
    }));
    const { error } = await sb.from("project_members").insert(rows);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/");
}

export async function deleteProject(id: string) {
  const sb = supabaseServer();
  const { error } = await sb.from("project_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export type ProspectInput = {
  id?: string;
  report_id: string;
  seq: number;
  name: string | null;
  client: string | null;
  pm_name: string | null;
  business_value_eok: number | null;
  order_month: string | null;
  contract_value_eok: number | null;
  description: string | null;
};

export async function saveProspect(input: ProspectInput) {
  const sb = supabaseServer();
  const payload = {
    report_id: input.report_id,
    seq: input.seq,
    name: input.name,
    client: input.client,
    pm_name: input.pm_name,
    business_value_eok: input.business_value_eok,
    order_month: input.order_month,
    contract_value_eok: input.contract_value_eok,
    description: input.description,
  };
  if (input.id) {
    const { error } = await sb
      .from("prospect_items")
      .update(payload)
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("prospect_items").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/");
}

export async function deleteProspect(id: string) {
  const sb = supabaseServer();
  const { error } = await sb.from("prospect_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function createNewWeek(): Promise<string> {
  const sb = supabaseServer();
  const w = todayWeek();
  // If exists, return it
  const { data: existing } = await sb
    .from("weekly_reports")
    .select("week_start")
    .eq("week_start", w.week_start)
    .maybeSingle();
  if (existing) {
    revalidatePath("/");
    return existing.week_start;
  }
  const { data, error } = await sb
    .from("weekly_reports")
    .insert(w)
    .select("week_start")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data.week_start;
}
