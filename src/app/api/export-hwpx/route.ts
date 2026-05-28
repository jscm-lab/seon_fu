import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { loadReport } from "@/lib/data";
import { generateSection } from "@/lib/hwpx/generate";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const week = url.searchParams.get("week") ?? undefined;

  try {
    const payload = await loadReport(week);

    // Master HWPX kept at project root (practice.hwpx). For prod/Vercel
    // deployments we'd move this to Supabase Storage.
    const masterPath = path.join(process.cwd(), "practice.hwpx");
    const masterBytes = await fs.readFile(masterPath);

    const zip = await JSZip.loadAsync(masterBytes);
    const sectionFile = zip.file("Contents/section0.xml");
    if (!sectionFile) throw new Error("Master HWPX is missing Contents/section0.xml");
    const sourceXml = await sectionFile.async("string");

    const newXml = generateSection(sourceXml, payload);
    zip.file("Contents/section0.xml", newXml);

    const outBuf = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      mimeType: "application/hwp+zip",
    });

    const fileDate = payload.report.week_start.replace(/-/g, "");
    const fileName = `미래사업팀_주간업무_${fileDate}.hwpx`;
    const asciiFallback = `weekly_${fileDate}.hwpx`;

    return new NextResponse(outBuf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/hwp+zip",
        "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export-hwpx]", err);
    const msg = err instanceof Error ? err.message : "internal error";
    return new NextResponse(msg, { status: 500 });
  }
}
