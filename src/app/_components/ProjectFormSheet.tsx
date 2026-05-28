"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { saveProject } from "@/lib/actions";
import type { ProjectItem } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  reportId: string;
  project: ProjectItem | null;
  nextSeq: number;
}

export function ProjectFormSheet({
  open,
  onClose,
  reportId,
  project,
  nextSeq,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialMembers = project
    ? project.members
        .map(
          (m) =>
            `-${m.field} ${m.name}${m.org_tag ? `(${m.org_tag})` : ""}`,
        )
        .join(" ")
    : "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rawScore = fd.get("score")?.toString().trim();
    const input = {
      id: project?.id,
      report_id: reportId,
      status: fd.get("status") as "bidding" | "in_progress",
      seq: Number(fd.get("seq")),
      name: String(fd.get("name") ?? ""),
      pm_name: String(fd.get("pm_name") ?? ""),
      submitted_at: nullable(fd.get("submitted_at")),
      presentation_at: nullable(fd.get("presentation_at")),
      bid_opening_at: nullable(fd.get("bid_opening_at")),
      contract_value_eok: Number(fd.get("contract_value_eok") ?? 0),
      score: rawScore ? Number(rawScore) : null,
      members_text: String(fd.get("members_text") ?? ""),
    };
    if (!input.name || !input.pm_name) {
      setError("용역명·단장은 필수입니다.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await saveProject(input);
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={project ? "수행 Project 편집" : "수행 Project 추가"}
    >
      <form id="project-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="구분" htmlFor="status">
            <Select id="status" name="status" defaultValue={project?.status ?? "bidding"}>
              <option value="bidding">개찰</option>
              <option value="in_progress">진행중</option>
            </Select>
          </Field>
          <Field label="연번" htmlFor="seq">
            <Input
              id="seq"
              name="seq"
              type="number"
              min={1}
              defaultValue={project?.seq ?? nextSeq}
            />
          </Field>
        </div>
        <Field label="용역명" htmlFor="name">
          <Input
            id="name"
            name="name"
            defaultValue={project?.name ?? ""}
            placeholder="예) 154kV 상운S/S"
          />
        </Field>
        <Field label="단장" htmlFor="pm_name">
          <Input id="pm_name" name="pm_name" defaultValue={project?.pm_name ?? ""} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="제출일" htmlFor="submitted_at">
            <Input
              id="submitted_at"
              name="submitted_at"
              placeholder="2/2 또는 추후"
              defaultValue={project?.submitted_at ?? ""}
            />
          </Field>
          <Field label="발표/면접" htmlFor="presentation_at">
            <Input
              id="presentation_at"
              name="presentation_at"
              placeholder="2/10"
              defaultValue={project?.presentation_at ?? ""}
            />
          </Field>
          <Field label="개찰일" htmlFor="bid_opening_at">
            <Input
              id="bid_opening_at"
              name="bid_opening_at"
              placeholder="3/9"
              defaultValue={project?.bid_opening_at ?? ""}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="용역비 (억원)" htmlFor="contract_value_eok">
            <Input
              id="contract_value_eok"
              name="contract_value_eok"
              type="number"
              step="0.1"
              defaultValue={project?.contract_value_eok ?? ""}
            />
          </Field>
          <Field label="평가점수 (0–100)" htmlFor="score">
            <Input
              id="score"
              name="score"
              type="number"
              step="0.1"
              min={0}
              max={100}
              defaultValue={project?.score ?? ""}
              placeholder="예) 87.5"
            />
          </Field>
        </div>
        <Field label="내용 (멤버)" htmlFor="members_text">
          <Textarea
            id="members_text"
            name="members_text"
            defaultValue={initialMembers}
            placeholder="-건축 박재흥, -토목 오인환(ITM)"
          />
          <p className="mt-1 text-xs text-zinc-500">
            예시 형식: <code>-건축 박재흥, -토목 오인환(ITM)</code>
          </p>
        </Field>
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s || null;
}
