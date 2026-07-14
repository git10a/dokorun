"use client";

import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { track } from "@/lib/track";

type Props = {
  href: string;
  callbackURL: string;
  slug: string;
  children: ReactNode;
  className: string;
  fileName?: string;
  meta?: Record<string, string>;
};

export function MemberGpxLink({ href, callbackURL, slug, children, className, fileName, meta }: Props) {
  const { data: session, isPending } = authClient.useSession();
  const loginHref = `/login?callbackURL=${encodeURIComponent(callbackURL)}`;
  const loggedIn = Boolean(session?.user);

  return (
    <a
      href={loggedIn ? href : loginHref}
      download={loggedIn ? fileName ?? true : undefined}
      aria-disabled={isPending || undefined}
      title={loggedIn ? undefined : "会員登録・ログインするとダウンロードできます"}
      onClick={(event) => {
        if (isPending) {
          event.preventDefault();
          return;
        }
        if (loggedIn) track("gpx_download", { slug, ...meta });
      }}
      className={`${className} ${isPending ? "pointer-events-none opacity-60" : ""}`}
    >
      {children}
    </a>
  );
}
