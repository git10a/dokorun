/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CalendarDays, Globe, Users } from "lucide-react";
import { SocialLinks } from "@/components/social-links";

export type SpotCommunity = {
  id: string;
  name: string;
  description: string;
  schedule: string | null;
  instagram: string | null;
  xHandle: string | null;
  strava: string | null;
  website: string | null;
  logoUrl: string | null;
};

export function SpotCommunities({ communities }: { communities: SpotCommunity[] }) {
  if (communities.length === 0) return null;

  return (
    <section>
      <div className="mb-5 border-l-4 border-brand pl-3">
        <h2 className="text-xl font-bold sm:text-2xl">ここで走ってるコミュニティ</h2>
        <p className="mt-1 text-sm text-sub">この場所を拠点に活動しているランニングコミュニティ</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {communities.map((community) => (
          <article key={community.id} className="flex flex-col rounded-xl border border-line bg-paper p-5">
            <div className="flex items-start gap-3">
              {community.logoUrl
                ? <img src={community.logoUrl} alt={`${community.name}のロゴ`} width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-full border border-line object-cover" />
                : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand"><Users size={18} aria-hidden="true" /></span>}
              <div className="min-w-0">
                <h3 className="text-lg font-bold leading-snug">{community.name}</h3>
                {community.schedule && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-accent">
                    <CalendarDays size={14} aria-hidden="true" />
                    {community.schedule}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm leading-7 text-sub">{community.description}</p>
            {(community.instagram || community.xHandle || community.strava || community.website) && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <SocialLinks links={{ instagram: community.instagram, xHandle: community.xHandle, stravaClub: community.strava }} />
                {community.website && (
                  <a href={community.website} target="_blank" rel="noopener noreferrer" title="Webサイト" className="grid size-10 place-items-center rounded-full border border-line bg-paper text-ink transition-colors hover:bg-brand">
                    <Globe size={16} aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-sub">
        この場所で活動しているコミュニティを運営していますか？{" "}
        <Link href="/contact" className="font-bold text-accent underline underline-offset-4">掲載を申請する</Link>
      </p>
    </section>
  );
}
