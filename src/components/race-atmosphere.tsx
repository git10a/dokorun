import { ExternalLink } from "lucide-react";
import { SpotImage } from "@/components/spot-image";
import type { RaceAtmosphereScene as Scene } from "@/lib/race-atmosphere";

export function RaceAtmosphereScene({
  scene,
  heading = scene.title,
  description = scene.description,
}: {
  scene: Scene;
  heading?: string;
  description?: string;
}) {
  return (
    <figure className="grid min-w-0 gap-4 lg:grid-cols-2 lg:gap-6">
      <div className="self-start">
        <SpotImage
          src={scene.imageSrc}
          alt={`${scene.title}・${scene.viewLabel}（AI生成の参考イメージ）`}
          width={1280}
          height={720}
          unoptimized
          className="aspect-video w-full rounded-xl object-cover"
        />
        <div className="mt-1 flex justify-end">
          <a
            href={scene.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${scene.title}の実際の景色を見る（Googleマップ、新しいタブ）`}
            className="inline-flex items-center gap-1 py-1 text-[11px] text-sub underline underline-offset-4 transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            実際の景色を見る
            <ExternalLink size={11} aria-hidden="true" />
          </a>
        </div>
      </div>
      <figcaption>
        <h3 className="text-base font-bold leading-6 sm:text-lg sm:leading-7">{heading}</h3>
        <p className="mt-2 text-sm leading-6">{description}</p>
      </figcaption>
    </figure>
  );
}
