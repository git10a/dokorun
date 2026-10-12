"use client";

import type { AnchorHTMLAttributes } from "react";
import { track } from "@/lib/track";

// サーバーコンポーネントから使える、クリックを計測する外部リンク
export function TrackedLink({ event, meta, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { event: string; meta?: Record<string, unknown> }) {
  return <a {...props} onClick={(clickEvent) => { track(event, meta); props.onClick?.(clickEvent); }} />;
}
