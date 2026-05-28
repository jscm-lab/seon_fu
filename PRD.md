# 미래사업팀 주간업무 대시보드 — MVP PRD

> **Version:** 0.2 (양식 반영) · **Date:** 2026-05-28 · **Owner:** 미래사업팀
> **참조 양식:** `D:\ax\practice.hwpx` (1 페이지, 2 표 + 1 명단 섹션)

---

## 1. 배경 & 문제

미래사업팀은 매주 진행 중인 용역 프로젝트 현황을 **HWPX(한컴 오피스) 문서**로 작성·공유 중. 양식은 1 페이지에 다음 3 섹션으로 고정.

1. **수행 Project (공동수행)** — 진행 중인 용역 표 (개찰 대기 + 진행중)
2. **발주예상 Project (공동예정)** — 발주 예상 용역 표
3. **교육참가자(OSG팀)** — 책임기술자 + 분야별 기술자 명단

현재 문제:
- 한컴 오피스 표 수기 편집 → 데이터 누락·서식 오류
- 매주 새 파일을 다른 이름으로 저장 → **버전 관리 부재**
- 포트폴리오 합계·상태 전환·인력 명단을 **한눈에 볼 수 있는 뷰 없음**
- 단장(책임기술자) 명단과 분야별 기술자 명단을 **표에서 매번 손으로 정리**

## 2. 목표 (MVP)

> **한 페이지 웹앱**에서 주차별 프로젝트를 입력하면, 카드·표·차트로 즉시 현황을 보고 **practice.hwpx와 동일한 양식의 HWPX 파일을 다운로드**한다.

- 주간 보고서 작성 시간 **60분 → 10분 이내**
- 수기 오류 **0건** (입력 단계 검증)
- 비개발자 포함 팀 내 **100% 사용**

## 3. 범위

| 포함 (In Scope) | 미포함 (Out of Scope) |
|---|---|
| 주차(week) 단위 보고서 CRUD | 로그인 / 권한 관리 |
| 수행 Project / 발주예상 Project 각각 행 추가·편집·삭제 | 첨부파일 |
| 교육참가자 명단 **자동 집계** (단장 + 멤버) | 변경 이력 |
| KPI 4종 + 차트 1종 | 모바일 전용 레이아웃 |
| `practice.hwpx`와 동일 양식의 HWPX 출력 | 다국어 |

## 4. 데이터 모델 (Supabase Postgres)

> 양식이 **주차 단위**로 작성되므로 보고서를 부모, 행을 자식으로 분리.

### 4.1 `weekly_reports`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid (pk, default `gen_random_uuid()`) | |
| `week_start` | date, not null, unique | 월요일 (e.g. 2026-02-23) |
| `week_end` | date, not null | 금요일 (e.g. 2026-02-27) |
| `created_at` / `updated_at` | timestamptz | |

### 4.2 `project_items` — 수행 Project (표1, 9컬럼)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid pk | |
| `report_id` | uuid fk → `weekly_reports.id` (cascade) | |
| `status` | text, check in (`bidding`,`in_progress`) | 개찰 / 진행중 |
| `seq` | int | 양식의 연번 (구분 그룹 내 순번이 아니라 전체 1부터) |
| `name` | text, not null | 용역명 |
| `pm_name` | text, not null | 단장 |
| `submitted_at` | date | 제출일 (e.g. 2/2) |
| `presentation_at` | text | 발표/면접 (날짜 또는 "추후") |
| `bid_opening_at` | text | 개찰일 (날짜 또는 "추후") |
| `contract_value_eok` | numeric(6,1) | 용역비 (억원, 예 23.6) |

> 날짜 컬럼 일부가 `text`인 이유: 양식에 `"추후"` 같은 비정형 값이 사용됨. 입력 UI는 날짜 picker + "미정" 토글로 처리하고 저장 시 직렬화.

### 4.3 `project_members` — 표1 "내용" 컬럼 구조화
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid pk | |
| `project_item_id` | uuid fk → `project_items.id` (cascade) | |
| `field` | text, check in (`건축`,`토목`,`안전`,`기계`,`전기`,`통신`,`기타`) | 분야 |
| `name` | text | 멤버 이름 (예: 김영국) |
| `org_tag` | text, nullable | 소속 표기 (예: `ITM`, `KD`) — 명단 섹션에서 `김영국(ITM)`처럼 표시 |

### 4.4 `prospect_items` — 발주예상 Project (표2, 8컬럼)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid pk | |
| `report_id` | uuid fk → `weekly_reports.id` (cascade) | |
| `seq` | int | 연번 |
| `name` | text | Project (용역명) |
| `client` | text | 발주청 |
| `pm_name` | text | 단장 |
| `business_value_eok` | numeric(6,1) | 사업비 (억) |
| `order_month` | text | 발주 (월) — 예: "3월", "추후" |
| `contract_value_eok` | numeric(6,1) | 용역비 (억) |
| `description` | text | 내용 |

### 4.5 교육참가자(OSG팀) — **테이블 없음, derived view**

쿼리로 자동 생성:
- **책임기술자** = `project_items.pm_name` distinct (해당 report_id 내 등장 순서)
- **분야별 기술자** = `project_members` 를 `field` 별로 그룹화, distinct(name + org_tag)

### 4.6 RLS

MVP는 `anon` role에 전체 CRUD 허용. v1.1 매직링크 도입 시 강화.

## 5. 단일 페이지 UI (Linear / Notion 톤)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 미래사업팀 주간업무 대시보드   [주차 ◀ 2026.2.23~2.27 ▶]  [⬇ HWPX] │
├─────────────────────────────────────────────────────────────────────┤
│ ┌KPI──────┐ ┌KPI──────┐ ┌KPI──────┐ ┌KPI──────┐                    │
│ │총 용역비 │ │진행중    │ │개찰 대기 │ │이번 주 개찰│                    │
│ │ 322.0억 │ │ 5건     │ │ 3건     │ │ 2건      │                    │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                    │
├─────────────────────────────────────────────────────────────────────┤
│ [상태별 도넛]              [필터: 단장 ▼  검색 🔍]                   │
├─────────────────────────────────────────────────────────────────────┤
│ 1) 수행 Project                                       [+ 행 추가]   │
│  구분 │ 연번 │ 용역명           │ 단장 │ 제출 │ 면접 │ 개찰 │ 억원│… │
│  개찰 │ 1    │ 154kV 상운S/S    │ 추영욱│2/2  │2/10 │3/9  │23.6│⋯ │
│  ⋮                                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ 2) 발주예상 Project                                   [+ 행 추가]   │
│  연번 │ Project │ 발주청 │ 단장 │ 사업비 │ 발주월 │ 용역비 │ 내용│⋯ │
├─────────────────────────────────────────────────────────────────────┤
│ 3) 교육참가자(OSG팀) — 자동 집계                                     │
│   • 책임기술자(7): 추영욱, 김기욱, …                                 │
│   • 건축(4): 윤권수, 모길주(KD), …                                  │
│   • 토목(2): 장정환(ITM), 오인환                                    │
│   ⋮                                                                │
└─────────────────────────────────────────────────────────────────────┘
```

- 표 행 클릭 → 우측 슬라이드 패널(Sheet)로 인라인 편집, blur 시 자동 저장
- 상태 칩: 개찰=amber, 진행중=blue
- 컴포넌트: **shadcn/ui** (Sheet, Table, Card, Badge, Button, Select)
- 글꼴: **Pretendard**, 액센트 컬러 1종 (`#3B82F6`)

## 6. 주요 사용자 흐름

1. **주차 전환**: 헤더 주차 셀렉터 → 다른 보고서 로드. 신규 주차면 빈 상태 + "이전 주에서 복제" 버튼 노출
2. **수행/발주예상 행 추가**: `+ 행 추가` → 슬라이드 패널 → 폼 검증(zod) → 저장 → 표·KPI·교육참가자 섹션 모두 즉시 갱신
3. **편집**: 행 클릭 → 슬라이드 패널 → 자동 저장
4. **삭제**: 행 액션 메뉴(⋯) → 확인 모달
5. **HWPX 다운로드**: 헤더 버튼 → `/api/export-hwpx?week=YYYY-MM-DD` → 파일 응답

## 7. HWPX 자동 생성 전략

> **양식의 표 구조가 동적 행 수에 대응해야 함** — `practice.hwpx`는 11행/9컬럼이지만 실 데이터는 행 수가 변함. `<hp:tbl rowCnt="N">` 속성과 `rowSpan`(구분 컬럼)을 코드로 재계산해야 함.

### 7.1 권장 방식: **마스터 + 노드 복제 + 셀 치환**

1. 관리자가 데이터가 비어 있는 **빈 마스터 HWPX** (`practice.hwpx`의 헤더만 남긴 버전)을 Supabase Storage(`templates/weekly_master.hwpx`)에 업로드
2. `/api/export-hwpx` (Next.js Node runtime) 처리:
   1. Storage에서 마스터 다운로드
   2. **JSZip**으로 압축 해제 → `Contents/section0.xml` 추출
   3. **fast-xml-parser**로 파싱
   4. **표1 처리:**
      - 상태별 행 수 계산: N개찰, M진행중
      - 데이터 행 템플릿(`<hp:tr>`)을 N+M번 복제
      - 첫 개찰 행의 `구분` 셀에 `<hp:cellSpan colSpan="1" rowSpan="N"/>`, 나머지 N-1행의 구분 셀은 제거
      - 동일 패턴으로 진행중 그룹 처리
      - `<hp:tbl rowCnt="...">` 속성을 `2 + N + M`으로 갱신
      - 각 셀의 텍스트(`<hp:t>`)를 데이터로 치환 (XML escape 처리)
   5. **표2 처리:** prospect_items 행 수만큼 동일 패턴
   6. **명단 섹션:** 책임기술자/분야별 문단(`<hp:p>`)의 텍스트만 치환
   7. 직렬화 → ZIP 재압축 → `Content-Disposition: attachment; filename="미래사업팀_주간업무_YYYYMMDD.hwpx"` 응답

### 7.2 라이브러리
- `jszip` — HWPX(ZIP) 처리
- `fast-xml-parser` — XML 파싱·재직렬화 (네임스페이스 보존 옵션 필요)
- `date-fns` — 주차 계산 (월요일 시작)

### 7.3 단순화 옵션 (Plan B)
표 구조 조작이 부담스러우면, 마스터 HWPX에 **최대 행 수만큼 사전 행을 만들고 빈 셀은 공백으로 치환**. 단점: 빈 행이 출력될 수 있음 → 양식 품질 저하. **권장 안 함**.

## 8. 기술 스택

| 영역 | 선택 |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · shadcn/ui · recharts |
| Backend | Next.js API Routes (Node runtime — HWPX 생성용, `export const runtime = 'nodejs'`) |
| DB | Supabase Postgres (`@supabase/ssr`) |
| Storage | Supabase Storage (`templates/` 버킷) |
| 배포 | Vercel (HWPX 생성은 Vercel Functions Node 런타임에서 동작 확인 필요) |
| 핵심 라이브러리 | `jszip`, `fast-xml-parser`, `date-fns`, `zod`, `lucide-react` |

## 9. 마일스톤

| 주 | 산출물 | 기간 |
|---|---|---|
| W1 | Supabase 스키마 (4 테이블) + 시드 (`practice.hwpx` 데이터) + 주차 셀렉터 + 빈 표 렌더링 | 3일 |
| W2 | 수행 / 발주예상 CRUD + 슬라이드 패널 + KPI · 차트 + 교육참가자 자동 섹션 | 4일 |
| W3 | HWPX 마스터 제작 + 표1/표2 동적 행 + 명단 치환 + 다운로드 | 5일 |
| W4 | 디자인 폴리시 + `practice.hwpx`와 1:1 비교 QA + 실사용 피드백 반영 | 3일 |

## 10. 오픈 이슈 / 가정

- [ ] `practice.hwpx`의 **`내용` 컬럼 표기 규칙**: "`-안전 김영국`" 같이 `-{분야} {이름}` 패턴이 표준인지 확인 필요. 표준이면 입력 UI에서 멤버 칩으로 받고 출력 시 자동 포맷팅
- [ ] **분야 종류**: 건축, 토목, 안전, 기계 외 추가가 있는지 (전기·통신·조경 등) 팀에서 확인
- [ ] **소속 표기**: `(ITM)`, `(KD)` 같은 외부 컨소시엄 표기 규칙 확인 — `org_tag` 필드 운영 합의 필요
- [ ] **주차 정의**: 월~금 vs 월~일 — 현재 양식은 월~금. 다음 주 자동 생성 기준 합의
- [ ] **이전 주에서 복제** 기능 — 진행중 프로젝트는 그대로 가져오고, 개찰은 결과에 따라 진행중/완료/탈락 전환. (MVP에서 단순 복제만, 전환 로직은 v1.1)
- [ ] **빈 마스터 HWPX 제작** — `practice.hwpx`에서 데이터 행을 제거한 헤더-only 버전이 별도 필요 (또는 코드로 행 삭제 후 사용)
- [ ] 동시 편집 충돌은 미처리 (last-write-wins, 사용자 ~5명 가정)
