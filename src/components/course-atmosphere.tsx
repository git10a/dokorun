import { ExternalLink } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SpotImage } from "@/components/spot-image";
import type { CourseAtmosphere as Atmosphere } from "@/lib/course-atmosphere";

export function CourseAtmosphere({ atmosphere }: { atmosphere: Atmosphere }) {
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
              <p className="text-[11px] font-medium text-sub">AI生成の参考イメージ</p>
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
