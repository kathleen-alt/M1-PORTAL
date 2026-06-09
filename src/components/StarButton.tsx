"use client";

import { useState } from "react";

/** A toggle star for flagging priority leads. Persists via the star API. */
export default function StarButton({
  leadId,
  initial,
}: {
  leadId: string;
  initial?: boolean;
}) {
  const [starred, setStarred] = useState(!!initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const next = !starred;
    setStarred(next);
    try {
      await fetch(`/api/leads/${leadId}/star`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: next }),
      });
    } catch {
      setStarred(!next); // revert
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={starred ? "Unstar" : "Star as a priority lead"}
      className={`text-lg leading-none ${starred ? "text-amber-400" : "text-orca-600 hover:text-amber-300"}`}
      aria-pressed={starred}
    >
      {starred ? "★" : "☆"}
    </button>
  );
}
