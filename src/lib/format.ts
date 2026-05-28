export function formatEok(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return n.toFixed(1).replace(/\.0$/, "") + " 억";
}

export function sumEok(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (v == null ? 0 : Number(v)), 0);
}

export function formatWeekRange(start: string, end: string): string {
  // YYYY-MM-DD → YYYY.M.D.
  const f = (s: string) => {
    const [y, m, d] = s.split("-");
    return `${y}.${Number(m)}.${Number(d)}.`;
  };
  return `${f(start)} ~ ${f(end)}`;
}

export function formatMembers(
  members: Array<{ field: string; name: string; org_tag?: string | null }>,
): string {
  return members
    .map((m) => `-${m.field} ${m.name}${m.org_tag ? `(${m.org_tag})` : ""}`)
    .join(" ");
}

export function todayWeek(): { week_start: string; week_end: string } {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { week_start: fmt(mon), week_end: fmt(fri) };
}

export function parseMembersText(
  text: string,
): Array<{ field: string; name: string; org_tag: string | null }> {
  // "건축 박재흥, 토목 오인환(ITM)" → 멤버 배열
  if (!text.trim()) return [];
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim().replace(/^-/, "").trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(\S+)\s+([^\s(]+)(?:\(([^)]+)\))?$/);
      if (!m) return { field: "기타", name: chunk, org_tag: null };
      return { field: m[1], name: m[2], org_tag: m[3] ?? null };
    });
}
