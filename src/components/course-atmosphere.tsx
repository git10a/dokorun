import { ExternalLink, MapPin } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SpotImage } from "@/components/spot-image";
import type { CourseAtmosphere as Atmosphere } from "@/lib/course-atmosphere";

export function CourseAtmosphere({
  atmosphere,
  onSelectPoint,
}: {
  atmosphere: Atmosphere;
  onSelectPoint?: (distanceM: number) => void;
}) {
  return (
    <section id="highlights" className="scroll-mt-40 space-y-5">
      <div>
        <SectionHeading>コースの雰囲気</SectionHeading>
        <p className="mt-2 text-sm leading-6 text-sub">
          現地のストリートビューを参考にしたAI生成イメージです。季節や現在の景観とは異なる場合があります。
        </p>
        {atmosphere.direction === "counterclockwise" && (
          <p className="mt-2 text-sm font-bold">皇居を反時計回りに走る視点</p>
        )}
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {atmosphere.scenes.map((scene) => (
          <figure key={scene.id} className="min-w-0">
            <SpotImage
              src={scene.imageSrc}
              alt={`${scene.title}（AI生成の参考イメージ）`}
              width={1280}
              height={720}
              unoptimized
              className="aspect-video w-full rounded-xl object-cover"
            />
            <figcaption className="pt-3">
              <p className="mb-2 text-[11px] font-medium text-sub">AI生成の参考イメージ</p>
              {scene.coursePoint && onSelectPoint && (
                <button
                  type="button"
                  onClick={() => onSelectPoint(scene.coursePoint!.distanceM)}
                  aria-label={`約${(scene.coursePoint.distanceM / 1000).toFixed(1)}kmの地点をコース地図で見る：${scene.title}`}
                  className="mb-2 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-brand/60 bg-cream px-3 py-2 text-sm font-bold shadow-[0_3px_0] shadow-brand/35 hover:bg-brand/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  <MapPin size={15} aria-hidden="true" />約{(scene.coursePoint.distanceM / 1000).toFixed(1)}km ·
                  コース上で見る
                </button>
              )}
              <h3 className="mt-1 text-lg font-bold">{scene.title}</h3>
              <p className="mt-2 text-sm leading-6 text-sub">{scene.description}</p>
              <a
                href={scene.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent underline underline-offset-4"
              >
                参考地点を地図で見る
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
