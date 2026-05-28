import { formatWeekRange, formatEok } from "@/lib/format";
import { FIELD_OPTIONS } from "@/lib/types";
import type { ProjectItem, ProspectItem, ReportPayload } from "@/lib/types";

// =====================================================================
// HWPX section0.xml mutation utilities.
//
// Strategy:
//   1. Replace the date-range text in the title paragraph.
//   2. Rebuild table 1 (수행 Project) data rows from project items.
//   3. Rebuild table 2 (발주예상 Project) data rows from prospect items.
//   4. Replace OSG paragraph texts with auto-aggregated roster.
// =====================================================================

const XML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};
function xmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => XML_ESCAPE[c]);
}

// ─── Find table boundaries by sequence index ─────────────────────────
function tableRange(xml: string, tableIndex: number): { start: number; end: number } {
  let cursor = 0;
  for (let i = 0; i <= tableIndex; i++) {
    const tagOpen = xml.indexOf("<hp:tbl", cursor);
    if (tagOpen === -1) throw new Error(`table ${tableIndex} not found`);
    if (i < tableIndex) {
      cursor = xml.indexOf("</hp:tbl>", tagOpen) + "</hp:tbl>".length;
    } else {
      const close = xml.indexOf("</hp:tbl>", tagOpen) + "</hp:tbl>".length;
      return { start: tagOpen, end: close };
    }
  }
  throw new Error("unreachable");
}

// ─── Extract individual <hp:tr>…</hp:tr> blocks from a table block ───
function splitRows(tableXml: string): { header: string; rows: string[]; tail: string } {
  // Header: <hp:tbl …attrs…> + leading children before first <hp:tr>
  const firstTr = tableXml.indexOf("<hp:tr>");
  const lastTr = tableXml.lastIndexOf("</hp:tr>") + "</hp:tr>".length;
  const header = tableXml.slice(0, firstTr);
  const tail = tableXml.slice(lastTr);
  const rowsXml = tableXml.slice(firstTr, lastTr);
  const rows: string[] = [];
  const re = /<hp:tr>[\s\S]*?<\/hp:tr>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rowsXml)) !== null) rows.push(m[0]);
  return { header, rows, tail };
}

// ─── Re-emit <hp:tbl …> with new rowCnt ──────────────────────────────
function setRowCnt(tableHeader: string, newRowCnt: number): string {
  return tableHeader.replace(/rowCnt="\d+"/, `rowCnt="${newRowCnt}"`);
}

// ─── Split a row into its <hp:tc>…</hp:tc> cell blocks ──────────────
function splitCells(rowXml: string): { open: string; cells: string[]; close: string } {
  const startTag = "<hp:tr>";
  const endTag = "</hp:tr>";
  const open = startTag;
  const close = endTag;
  const inner = rowXml.slice(startTag.length, rowXml.length - endTag.length);
  const cells: string[] = [];
  const re = /<hp:tc [\s\S]*?<\/hp:tc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) cells.push(m[0]);
  return { open, cells, close };
}
function joinCells(open: string, cells: string[], close: string): string {
  return open + cells.join("") + close;
}

// ─── Update cellAddr.rowAddr on every cell in a row ─────────────────
function setRowAddr(cellXml: string, rowAddr: number): string {
  return cellXml.replace(
    /<hp:cellAddr colAddr="(\d+)" rowAddr="\d+"\/>/,
    `<hp:cellAddr colAddr="$1" rowAddr="${rowAddr}"/>`,
  );
}

// ─── Update cellSpan.rowSpan ────────────────────────────────────────
function setRowSpan(cellXml: string, rowSpan: number): string {
  return cellXml.replace(
    /<hp:cellSpan colSpan="(\d+)" rowSpan="\d+"\/>/,
    `<hp:cellSpan colSpan="$1" rowSpan="${rowSpan}"/>`,
  );
}

// ─── Replace text contents of a cell ────────────────────────────────
// Strategy: keep the first <hp:p>…</hp:p> as the structural shell.
// Replace inside it: one <hp:run …><hp:t>NEW</hp:t></hp:run>, then a
// fresh <hp:linesegarray> with a placeholder lineseg (Hancom re-flows
// the lineseg geometry on open, so any non-empty values are fine).
function setCellText(cellXml: string, text: string): string {
  const safe = xmlEscape(text ?? "");
  const subListMatch = cellXml.match(/<hp:subList\b[\s\S]*?<\/hp:subList>/);
  if (!subListMatch) return cellXml;
  const subList = subListMatch[0];
  const firstParaMatch = subList.match(/<hp:p\b[^>]*>/);
  if (!firstParaMatch) return cellXml;
  // Find the <hp:p …> open tag and its attributes (paraPrIDRef, styleIDRef).
  const paraOpen = firstParaMatch[0];
  // Pull the charPrIDRef from any existing <hp:run …>.
  const charPrMatch = subList.match(/charPrIDRef="(\d+)"/);
  const charPrIDRef = charPrMatch?.[1] ?? "0";
  // Re-build subList with a single paragraph holding the new text.
  const subListOpenMatch = subList.match(/<hp:subList\b[^>]*>/);
  const subListOpen = subListOpenMatch![0];
  const newPara =
    paraOpen +
    `<hp:run charPrIDRef="${charPrIDRef}"><hp:t>${safe}</hp:t></hp:run>` +
    `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1100" textheight="1100" baseline="935" spacing="332" horzpos="0" horzsize="2000" flags="393216"/></hp:linesegarray>` +
    `</hp:p>`;
  const newSubList = subListOpen + newPara + "</hp:subList>";
  return cellXml.replace(subList, newSubList);
}

// =====================================================================
// Table 1: 수행 Project
//   - Column index map (data row, 9 cells): 0=구분 1=연번 2=용역명 3=단장
//     4=제출일 5=발표/면접 6=개찰일 7=용역비 8=내용
// =====================================================================
function buildTable1(tableXml: string, projects: ProjectItem[]): string {
  const { header: tblHeader, rows: allRows, tail } = splitRows(tableXml);
  if (allRows.length < 3) return tableXml; // safety

  const headerRow = allRows[0]; // row 0 (header) - kept as-is
  const firstDataRow = allRows[1]; // row 1 (with 구분 cell) - template A
  const subsequentRow = allRows[2]; // row 2 (no 구분 cell) - template B

  // Split projects by status preserving the bidding-first / in_progress-second order.
  const bidding = projects
    .filter((p) => p.status === "bidding")
    .sort((a, b) => a.seq - b.seq);
  const inProgress = projects
    .filter((p) => p.status === "in_progress")
    .sort((a, b) => a.seq - b.seq);

  const groups: Array<{ label: string; items: ProjectItem[] }> = [];
  if (bidding.length > 0) groups.push({ label: "개찰", items: bidding });
  if (inProgress.length > 0) groups.push({ label: "진행중", items: inProgress });

  const newRows: string[] = [headerRow];
  let runningRowAddr = 1;

  for (const grp of groups) {
    grp.items.forEach((item, idx) => {
      const isFirstInGroup = idx === 0;
      let row = isFirstInGroup ? firstDataRow : subsequentRow;
      const split = splitCells(row);
      let cells = [...split.cells];

      if (isFirstInGroup) {
        // 9-cell template: index 0 == 구분 cell with rowSpan
        cells[0] = setRowSpan(cells[0], grp.items.length);
        cells[0] = setCellText(cells[0], grp.label);
        // cells 1..8 = data
        cells[1] = setCellText(cells[1], String(item.seq));
        cells[2] = setCellText(cells[2], item.name);
        cells[3] = setCellText(cells[3], item.pm_name);
        cells[4] = setCellText(cells[4], item.submitted_at ?? "");
        cells[5] = setCellText(cells[5], item.presentation_at ?? "");
        cells[6] = setCellText(cells[6], item.bid_opening_at ?? "");
        cells[7] = setCellText(cells[7], formatContractCell(item.contract_value_eok));
        cells[8] = setCellText(cells[8], formatMembersForCell(item));
      } else {
        // 8-cell template (no 구분 cell): cells[0..7] = data starting from 연번
        cells[0] = setCellText(cells[0], String(item.seq));
        cells[1] = setCellText(cells[1], item.name);
        cells[2] = setCellText(cells[2], item.pm_name);
        cells[3] = setCellText(cells[3], item.submitted_at ?? "");
        cells[4] = setCellText(cells[4], item.presentation_at ?? "");
        cells[5] = setCellText(cells[5], item.bid_opening_at ?? "");
        cells[6] = setCellText(cells[6], formatContractCell(item.contract_value_eok));
        cells[7] = setCellText(cells[7], formatMembersForCell(item));
      }
      // Update cellAddr.rowAddr on every cell
      cells = cells.map((c) => setRowAddr(c, runningRowAddr));
      const rebuilt = joinCells(split.open, cells, split.close);
      newRows.push(rebuilt);
      runningRowAddr++;
    });
  }

  // If no project, keep at least one empty data row to preserve template shape.
  if (groups.length === 0) {
    const emptyRow = subsequentRow.replace(
      /<hp:t>[^<]*<\/hp:t>/g,
      "<hp:t></hp:t>",
    );
    newRows.push(setRowAddrOnAllCells(emptyRow, 1));
    runningRowAddr = 2;
  }

  const newRowCnt = newRows.length;
  return setRowCnt(tblHeader, newRowCnt) + newRows.join("") + tail;
}

function setRowAddrOnAllCells(rowXml: string, rowAddr: number): string {
  return rowXml.replace(
    /<hp:cellAddr colAddr="(\d+)" rowAddr="\d+"\/>/g,
    `<hp:cellAddr colAddr="$1" rowAddr="${rowAddr}"/>`,
  );
}

function formatContractCell(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatMembersForCell(item: ProjectItem): string {
  if (item.members.length === 0) return "";
  return item.members
    .map((m) => `-${m.field} ${m.name}${m.org_tag ? `(${m.org_tag})` : ""}`)
    .join(" ");
}

// =====================================================================
// Table 2: 발주예상 Project
//   8 columns: 0=연번 1=Project 2=발주청 3=단장 4=사업비 5=발주(월)
//             6=용역비 7=내용
// =====================================================================
function buildTable2(tableXml: string, prospects: ProspectItem[]): string {
  const { header: tblHeader, rows: allRows, tail } = splitRows(tableXml);
  if (allRows.length < 2) return tableXml;
  const headerRow = allRows[0];
  const templateRow = allRows[1];

  // Use existing prospects, but always show at least 2 empty rows (양식 호환)
  const items: (ProspectItem | null)[] =
    prospects.length === 0 ? [null, null] : prospects.slice();

  const newRows: string[] = [headerRow];
  items.forEach((p, idx) => {
    const rowAddr = idx + 1;
    const split = splitCells(templateRow);
    let cells = [...split.cells];
    const data = p
      ? [
          String(p.seq),
          p.name ?? "",
          p.client ?? "",
          p.pm_name ?? "",
          p.business_value_eok != null ? formatContractCell(p.business_value_eok) : "",
          p.order_month ?? "",
          p.contract_value_eok != null ? formatContractCell(p.contract_value_eok) : "",
          p.description ?? "",
        ]
      : ["", "", "", "", "", "", "", ""];
    cells = cells.map((c, i) => setCellText(c, data[i] ?? ""));
    cells = cells.map((c) => setRowAddr(c, rowAddr));
    newRows.push(joinCells(split.open, cells, split.close));
  });

  return setRowCnt(tblHeader, newRows.length) + newRows.join("") + tail;
}

// =====================================================================
// OSG team section — replace the four roster paragraphs.
// =====================================================================
function buildOsgLines(projects: ProjectItem[]): string[] {
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

  const lines: string[] = [];
  lines.push(
    `- 책  임 기술자 : ${pmNames.join(", ")}${pmNames.length ? ` - ${pmNames.length}명` : ""}`,
  );
  for (const field of FIELD_OPTIONS) {
    if (!byField.has(field)) continue;
    const members = byField.get(field)!;
    const txt = members
      .map((m) => `${m.name}${m.org_tag ? `(${m.org_tag})` : ""}`)
      .join(", ");
    lines.push(`- 분야별 기술자 : ${txt} – ${field} ${members.length}명`);
  }
  return lines;
}

// Replace existing OSG paragraphs that start with "- 책  임 기술자" or "- 분야별 기술자".
// They appear after the 2nd table in the source XML.
function replaceOsgParagraphs(xml: string, lines: string[]): string {
  // Each OSG paragraph is one <hp:p …>…</hp:p> with text matching the pattern.
  const paraRe = /<hp:p\b[^>]*>([\s\S]*?)<\/hp:p>/g;
  const matches: { start: number; end: number; index: number }[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = paraRe.exec(xml)) !== null) {
    const text = extractParagraphText(m[0]);
    if (/^\s*-\s*(책\s*임|분야별)/.test(text)) {
      matches.push({ start: m.index, end: paraRe.lastIndex, index: i });
    }
    i++;
  }
  if (matches.length === 0) return xml;

  // Build replacement paragraphs by taking the FIRST OSG paragraph as a template
  // and substituting its text. Other OSG paragraphs are deleted (we re-emit
  // lines.length paragraphs from scratch).
  const templateXml = xml.slice(matches[0].start, matches[0].end);
  const replacementParas = lines.map((line) => substituteParagraphText(templateXml, line)).join("");

  // Remove all matched paragraphs except in the first slot, then put replacement.
  let result = xml;
  // remove from last to first to preserve indices
  for (let k = matches.length - 1; k >= 0; k--) {
    const { start, end } = matches[k];
    if (k === 0) {
      result = result.slice(0, start) + replacementParas + result.slice(end);
    } else {
      result = result.slice(0, start) + result.slice(end);
    }
  }
  return result;
}

function extractParagraphText(paraXml: string): string {
  const texts = paraXml.match(/<hp:t>([^<]*)<\/hp:t>/g) ?? [];
  return texts.map((t) => t.replace(/<\/?hp:t>/g, "")).join("");
}

function substituteParagraphText(paraXml: string, text: string): string {
  const safe = xmlEscape(text);
  // Keep the first <hp:run …> open tag, replace its <hp:t>…</hp:t>, remove
  // additional runs in the paragraph (we only need one).
  const openMatch = paraXml.match(/<hp:p\b[^>]*>/);
  const closeTag = "</hp:p>";
  if (!openMatch) return paraXml;
  const charPrMatch = paraXml.match(/charPrIDRef="(\d+)"/);
  const charPr = charPrMatch?.[1] ?? "0";
  return (
    openMatch[0] +
    `<hp:run charPrIDRef="${charPr}"><hp:t>${safe}</hp:t></hp:run>` +
    `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="300" horzpos="0" horzsize="40000" flags="393216"/></hp:linesegarray>` +
    closeTag
  );
}

// =====================================================================
// Title date range — find the existing "(YYYY.M.D. ~ YYYY.M.D.)" text.
// =====================================================================
function replaceDateRange(xml: string, payload: ReportPayload): string {
  const newRange = `(${formatWeekRange(payload.report.week_start, payload.report.week_end)})`;
  // The original text contains "(2026.2.23. ~ 2026.2.27.)" inside an <hp:t>.
  // Use a tolerant pattern that matches any "(YYYY.M.D. ~ YYYY.M.D.)" inside <hp:t>.
  return xml.replace(
    /<hp:t>\(\s*\d{4}\.\d{1,2}\.\d{1,2}\.\s*~\s*\d{4}\.\d{1,2}\.\d{1,2}\.\s*\)<\/hp:t>/,
    `<hp:t>${xmlEscape(newRange)}</hp:t>`,
  );
}

// =====================================================================
// Entry: generate full new section0.xml from payload
// =====================================================================
export function generateSection(sourceXml: string, payload: ReportPayload): string {
  let xml = sourceXml;
  xml = replaceDateRange(xml, payload);

  // Process table 2 FIRST so the table 1 range stays stable for the next step.
  // Actually we need to be careful: any mutation invalidates earlier offsets.
  // So compute and apply table 2 first using its own range.
  const t2Range = tableRange(xml, 1);
  const t2Xml = xml.slice(t2Range.start, t2Range.end);
  const newT2 = buildTable2(t2Xml, payload.prospects);
  xml = xml.slice(0, t2Range.start) + newT2 + xml.slice(t2Range.end);

  // Now table 1
  const t1Range = tableRange(xml, 0);
  const t1Xml = xml.slice(t1Range.start, t1Range.end);
  const newT1 = buildTable1(t1Xml, payload.projects);
  xml = xml.slice(0, t1Range.start) + newT1 + xml.slice(t1Range.end);

  // OSG paragraphs
  const osgLines = buildOsgLines(payload.projects);
  xml = replaceOsgParagraphs(xml, osgLines);

  return xml;
}

// Convenience: also export utils for tests
export { xmlEscape, splitRows, splitCells };

// Avoid unused import warning when consumers don't import format helpers
void formatEok;
