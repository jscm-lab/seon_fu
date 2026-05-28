export type ProjectStatus = "bidding" | "in_progress";

export const FIELD_OPTIONS = [
  "건축",
  "토목",
  "안전",
  "기계",
  "전기",
  "통신",
  "조경",
  "기타",
] as const;

export type ProjectField = (typeof FIELD_OPTIONS)[number];

export type WeeklyReport = {
  id: string;
  week_start: string;
  week_end: string;
};

export type ProjectMember = {
  id: string;
  project_item_id: string;
  field: ProjectField;
  name: string;
  org_tag: string | null;
  position: number;
};

export type ProjectItem = {
  id: string;
  report_id: string;
  status: ProjectStatus;
  seq: number;
  name: string;
  pm_name: string;
  submitted_at: string | null;
  presentation_at: string | null;
  bid_opening_at: string | null;
  contract_value_eok: number;
  score: number | null;
  members: ProjectMember[];
};

export type ProspectItem = {
  id: string;
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

export type ReportPayload = {
  report: WeeklyReport;
  projects: ProjectItem[];
  prospects: ProspectItem[];
};
