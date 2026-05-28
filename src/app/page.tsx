import { Dashboard } from "./_components/Dashboard";
import { listReportWeeks, loadReport } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const [payload, weeks] = await Promise.all([
    loadReport(week),
    listReportWeeks(),
  ]);
  return <Dashboard payload={payload} weeks={weeks} />;
}
