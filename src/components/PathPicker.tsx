"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPath } from "@/app/actions";

export function PathPicker({ paths, current }: { paths: { id: string; name: string }[]; current: string | null }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="chips">
      {paths.map((p) => (
        <button key={p.id} className="chip" aria-pressed={current === p.id} disabled={pending}
          onClick={() => start(async () => { await setPath(p.id); router.push("/"); router.refresh(); })}>
          {p.name}
        </button>
      ))}
    </div>
  );
}
