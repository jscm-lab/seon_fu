# 미래사업팀 주간업무 대시보드

`practice.hwpx` 양식을 그대로 출력하는 주간 보고서 단일 페이지 웹앱.

## 스택
- Next.js 16 (App Router, React 19, TypeScript)
- TailwindCSS 4
- Supabase (Postgres + RLS, anon 전체 허용 — MVP)
- recharts · jszip · fast-xml-parser · zod · date-fns
- 글꼴: Pretendard Variable

## 디렉터리

```
src/
  app/
    page.tsx                         # 서버 컴포넌트, 주차 쿼리에서 데이터 로드
    layout.tsx
    globals.css
    _components/
      Dashboard.tsx                  # 클라이언트 오케스트레이터 (시트 상태)
      KpiCards.tsx
      StatusChart.tsx
      ProjectTable.tsx               # 1) 수행 Project
      ProspectTable.tsx              # 2) 발주예상 Project
      OsgSection.tsx                 # 3) 교육참가자 — 자동 집계
      ProjectFormSheet.tsx
      ProspectFormSheet.tsx
      WeekSelector.tsx
      HwpxDownloadButton.tsx
    api/
      export-hwpx/route.ts           # 양식 호환 HWPX 생성 엔드포인트
  components/ui/                     # 경량 UI 프리미티브 (cva 기반)
  lib/
    actions.ts                       # 서버 액션 (CRUD)
    data.ts                          # 서버 데이터 페처
    format.ts                        # 억원 포매팅, 주차 계산, 멤버 파싱
    supabase/server.ts               # 서버 클라이언트
    types.ts
    hwpx/generate.ts                 # section0.xml 변환 핵심
practice.hwpx                        # 마스터 양식
PRD.md                               # 제품 요구사항 문서 v0.2
```

## 데이터 모델 (Supabase)

| 테이블 | 핵심 |
|---|---|
| `weekly_reports` | 주차 단위 부모 (week_start unique) |
| `project_items` | 수행 Project 9컬럼 |
| `project_members` | 표1 "내용" 멤버 (분야·이름·소속) |
| `prospect_items` | 발주예상 Project 8컬럼 |

RLS: 전 테이블 anon 전체 CRUD 허용 (MVP).

## HWPX 생성 전략

`src/lib/hwpx/generate.ts`:

1. `practice.hwpx`를 마스터로 로드 → `Contents/section0.xml` 추출
2. 헤더 paragraph 의 `(YYYY.M.D. ~ YYYY.M.D.)` 문자열을 주차로 치환
3. 표1 (수행 Project) 재구성
   - row[0] (헤더), row[1] (구분 셀 포함 풀 행), row[2] (구분 셀 없는 행)을 템플릿으로 추출
   - 개찰·진행중 그룹별로 첫 행은 row[1] 클론 + `rowSpan` 동적 갱신, 후속 행은 row[2] 클론
   - 모든 셀의 `<hp:cellAddr rowAddr>` 와 표 `rowCnt` 재계산
4. 표2 (발주예상 Project) — row[1] 템플릿 클론 후 데이터 행 N개 생성 (없으면 빈 행 2개 유지)
5. OSG 명단 paragraph — `책임 기술자`·`분야별 기술자` 패턴 매칭 후 자동 집계 결과로 치환
6. ZIP 재압축 → `Content-Disposition` 으로 응답

## 실행

```powershell
# Supabase env 는 .env.local 에 있음 (publishable key)
npm run dev
# http://localhost:3000  → 시드 데이터(2026-02-23 주차) 로드
```

HWPX 다운로드: 우상단 버튼 또는 `GET /api/export-hwpx?week=YYYY-MM-DD`

## 알려진 제한 (MVP)
- 로그인 없음. 누구나 데이터 변경 가능
- 표1 본문 `<hp:linesegarray>` 의 가로폭을 고정값으로 재생성 → 한컴 오피스가 열 때 재계산하지만, 일부 환경에서 줄바꿈이 어색할 수 있음
- 같은 멤버가 분야 안에서 중복되면 1번만 표시 (`OsgSection` distinct)
- 동시 편집 충돌 미처리 (last-write-wins)
- HWPX 마스터 (`practice.hwpx`) 가 프로젝트 루트에 있어야 함 — Vercel 배포 시 `next.config.ts` 의 `outputFileTracingIncludes` 설정 필요
