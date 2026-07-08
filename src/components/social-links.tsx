import { socialUrl } from "@/lib/social";

type Links = { instagram?: string | null; xHandle?: string | null; strava?: string | null };

const icons = {
  instagram: "M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8zm4.2 3.2A4.8 4.8 0 1 1 12 16.8a4.8 4.8 0 0 1 0-9.6zm0 2A2.8 2.8 0 1 0 12 14.8a2.8 2.8 0 0 0 0-5.6zm5.1-2.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z",
  x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  strava: "M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066zM10.463 0 3.462 13.828h4.169l2.832-5.599 2.836 5.599h4.172z",
};

function Icon({ path }: { path: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current"><path d={path} /></svg>;
}

export function SocialLinks({ links }: { links: Links }) {
  const items = [
    links.instagram && { label: "Instagram", href: socialUrl("instagram", links.instagram), path: icons.instagram },
    links.xHandle && { label: "X", href: socialUrl("x", links.xHandle), path: icons.x },
    links.strava && { label: "Strava", href: socialUrl("strava", links.strava), path: icons.strava },
  ].filter(Boolean) as { label: string; href: string; path: string }[];
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2" aria-label="SNSリンク">
      {items.map((item) => (
        <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" title={item.label} className="grid size-10 place-items-center rounded-full border border-line bg-paper text-ink transition-colors hover:bg-brand">
          <Icon path={item.path} />
        </a>
      ))}
    </div>
  );
}
