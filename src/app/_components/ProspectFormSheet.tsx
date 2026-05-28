"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { saveProspect } from "@/lib/actions";
import type { ProspectItem } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  reportId: string;
  prospect: ProspectItem | null;
  nextSeq: number;
}

export function ProspectFormSheet({
  open,
  onClose,
  reportId,
  prospect,
  nextSeq,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      id: prospect?.id,
      report_id: reportId,
      seq: Number(fd.get("seq")),
      name: nullable(fd.get("name")),
      client: nullable(fd.get("client")),
      pm_name: nullable(fd.get("pm_name")),
      business_value_eok: numNullable(fd.get("business_value_eok")),
      order_month: nullable(fd.get("order_month")),
      contract_value_eok: numNullable(fd.get("contract_value_eok")),
      description: nullable(fd.get("description")),
    };
    setError(null);
    startTransition(async () => {
      try {
        await saveProspect(input);
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
      title={prospect ? "발주예상 편집" : "발주예상 추가"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="연번">
            <Input
              name="seq"
              type="number"
              min={1}
              defaultValue={prospect?.seq ?? nextSeq}
            />
          </Field>
          <Field label="발주(월)">
            <Input
              name="order_month"
              placeholder="3월 또는 추후"
              defaultValue={prospect?.order_month ?? ""}
            />
          </Field>
        </div>
        <Field label="Project">
          <Input name="name" defaultValue={prospect?.name ?? ""} />
        </Field>
        <Field label="발주청">
          <Input name="client" defaultValue={prospect?.client ?? ""} />
        </Field>
        <Field label="단장">
          <Input name="pm_name" defaultValue={prospect?.pm_name ?? ""} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="사업비 (억)">
            <Input
              name="business_value_eok"
              type="number"
              step="0.1"
              defaultValue={prospect?.business_value_eok ?? ""}
            />
          </Field>
          <Field label="용역비 (억)">
            <Input
              name="contract_value_eok"
              type="number"
              step="0.1"
              defaultValue={prospect?.contract_value_eok ?? ""}
            />
          </Field>
        </div>
        <Field label="내용">
          <Textarea name="description" defaultValue={prospect?.description ?? ""} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s || null;
}

function numNullable(v: FormDataEntryValue | null): number | null {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
