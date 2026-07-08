"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function getClientId() {
  const key = "dokorun:client-id";
  let value = localStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
  return value;
}

export function HashiritaiRemoveButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return <button type="button" disabled={pending} onClick={async () => { setPending(true); const response = await fetch("/api/hashiritai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, clientId: getClientId(), on: false }) }); if (response.ok) router.refresh(); else setPending(false); }} className="rounded-lg border border-line px-4 py-2 text-sm font-bold disabled:opacity-60">{pending ? "解除中…" : "解除する"}</button>;
}

