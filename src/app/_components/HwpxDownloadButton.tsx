"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function HwpxDownloadButton({ weekStart }: { weekStart: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function download() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/export-hwpx?week=${weekStart}`);
      if (!r.ok) throw new Error(await r.text());
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fileDate = weekStart.replace(/-/g, "");
      a.href = url;
      a.download = `미래사업팀_주간업무_${fileDate}.hwpx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "다운로드 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {err && <span className="text-xs text-red-600">{err}</span>}
      <Button onClick={download} disabled={loading}>
        {loading ? "생성 중…" : "⬇ HWPX 다운로드"}
      </Button>
    </div>
  );
}
