"use client";
import { useState } from "react";
import { deleteRow } from "@/app/admin-actions";

/** Two-click delete so nothing goes by accident. */
export function DeleteButton({ kind, id, label = "Delete" }: { kind: string; id: string; label?: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <form action={deleteRow} onSubmit={(e) => { if (!armed) { e.preventDefault(); setArmed(true); } }}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button className="btn danger">{armed ? "Click again to delete" : label}</button>
    </form>
  );
}
