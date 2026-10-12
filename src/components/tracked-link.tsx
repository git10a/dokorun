"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ComponentProps } from "react";
import { track } from "@/lib/track";

// サーバーコンポーネントから使える、クリックを計測する外部リンク
export function TrackedLink({ event, meta, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { event: string; meta?: Record<string, unknown> }) {
  return <a {...props} onClick={(clickEvent) => { track(event, meta); props.onClick?.(clickEvent); }} />;
}

// サイト内リンク版。クライアント遷移を保ったままクリックを計測する
export function TrackedNextLink({ event, meta, ...props }: ComponentProps<typeof Link> & { event: string; meta?: Record<string, unknown> }) {
  return <Link {...props} onClick={(clickEvent) => { track(event, meta); props.onClick?.(clickEvent); }} />;
}
