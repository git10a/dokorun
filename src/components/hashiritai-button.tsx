"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

export function HashiritaiButton({ count }: { count: number }) {
  const [message, setMessage] = useState(false);
  return <div className="relative"><button type="button" onClick={() => { setMessage(true); window.setTimeout(() => setMessage(false), 2200); }} className="flex items-center gap-2 rounded-lg border-2 border-brand bg-paper px-4 py-2.5 font-bold"><Heart size={18} />ハシリタイ {count}</button>{message && <div role="status" className="absolute left-0 top-full z-10 mt-2 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg">ログイン機能は準備中です</div>}</div>;
}
