# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # http://localhost:3000
npm run build    # production build (Turbopack)
npm run lint     # eslint
```

No test runner is configured. TypeScript checking runs as part of `next build`.

Deploy: `vercel deploy --prod --scope jscm-labs-projects`

## Architecture

Single-page Next.js 16 app (App Router). The page is server-rendered; all data mutations go through **Server Actions** (`src/lib/actions.ts`). There is no API layer except for the HWPX file download.

```
page.tsx (Server Component)
  └─ Dashboard.tsx (Client, orchestrator)
       ├─ KpiCards / StatusChart / BiddingScoreChart  ← read-only, derive from props
       ├─ ProjectTable / ProspectTable                ← row click → Sheet
       ├─ OsgSection                                  ← auto-aggregated from projects
       ├─ ProjectFormSheet / ProspectFormSheet         ← call Server Actions directly
       └─ WeekSelector / HwpxDownloadButton
```

**Data flow:** `page.tsx` calls `loadReport(week?)` which returns `ReportPayload` (report + projects + prospects). `Dashboard` receives this as a prop and passes slices down. Mutations call `revalidatePath("/")` so the server re-fetches on next render.

## Key files

| File | Role |
|---|---|
| `src/lib/types.ts` | All shared types. `ProjectItem`, `ProspectItem`, `ReportPayload`. |
| `src/lib/data.ts` | `loadReport` — joins `project_items` + `project_members` + `prospect_items` for one week. `listReportWeeks` is React-cached. |
| `src/lib/actions.ts` | `saveProject`, `deleteProject`, `saveProspect`, `deleteProspect`, `createNewWeek`. All upsert via Supabase anon client. |
| `src/lib/format.ts` | `parseMembersText` parses `-건축 이름(소속)` syntax into member rows. `todayWeek` returns current Mon–Fri range. |
| `src/lib/hwpx/generate.ts` | Generates `Contents/section0.xml` from `ReportPayload`. See below. |
| `src/app/api/export-hwpx/route.ts` | Node runtime. Reads `practice.hwpx` from `process.cwd()`, patches XML, returns ZIP. |
| `practice.hwpx` | Master HWPX template (must stay at project root — included in Vercel output via `outputFileTracingIncludes`). |

## Supabase

- Project: `deuqdabpajgwbpogtpjy` (ap-southeast-2)
- Client: anon, no auth (MVP). `src/lib/supabase/server.ts` creates the client.
- Tables: `weekly_reports` → `project_items` + `project_members` + `prospect_items`
- All tables have anon full-CRUD RLS policies.
- `project_members` is denormalized per-save: deleted and re-inserted on every `saveProject`.

## UI primitives

No shadcn CLI — all primitives are hand-written with `cva` in `src/components/ui/`. TailwindCSS 4 is imported via `@import "tailwindcss"` in `globals.css` (no `tailwind.config.*`). Recharts charts need an `mounted` state guard to suppress SSR width=-1 warnings.

## HWPX generation (`src/lib/hwpx/generate.ts`)

`generateSection(sourceXml, payload)` mutates `Contents/section0.xml` in place:

1. **Date range** — regex-replaces `(YYYY.M.D. ~ YYYY.M.D.)` in the title paragraph.
2. **Table 2 first** (발주예상) — patching table 2 before table 1 keeps string offsets stable.
3. **Table 1** (수행 Project) — groups projects by status (`개찰` → `진행중`). The first row of each group clones `row[1]` (9 cells, includes 구분 cell with `rowSpan=N`); subsequent rows clone `row[2]` (8 cells, no 구분 cell). `cellAddr.rowAddr` and `rowCnt` are recalculated.
4. **OSG paragraphs** — regex-finds paragraphs beginning with `- 책  임 기술자` or `- 분야별 기술자`, replaces them with auto-aggregated PM names and members grouped by `FIELD_OPTIONS` order.
5. `setCellText` rebuilds each cell's `<hp:subList>` with a single paragraph + placeholder `<hp:linesegarray>` (Hancom Office recalculates geometry on open).

When adding new columns or changing field order, update both the column-index comments at the top of `buildTable1`/`buildTable2` and the cell assignment arrays.

## Member text format

Members are stored in `project_members` but entered/displayed as a single text string: `-건축 박재흥 -토목 오인환(ITM)`. `parseMembersText` parses this; `formatMembers` serializes it. The `members_text` field in form submissions drives this round-trip.

## Adding a schema column

1. `mcp__b8e56f61…__apply_migration` with `ALTER TABLE … ADD COLUMN`.
2. Add the field to the type in `src/lib/types.ts`.
3. Add numeric conversion in `loadReport` if the column is `numeric`.
4. Add to `ProjectInput` / `ProspectInput` in `actions.ts` and include in the `payload` object.
5. Add the form field in the relevant `*FormSheet.tsx`.
