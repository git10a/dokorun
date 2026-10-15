import type { RaceEditorial } from "@/lib/course-editorial";
import type { RaceAtmosphere, RaceAtmosphereScene as Scene } from "@/lib/race-atmosphere";
import { SectionHeading } from "@/components/section-heading";
import { RaceAtmosphereScene } from "@/components/race-atmosphere";
import { Flag, Footprints, MapPin } from "lucide-react";

type CourseItem = {
  key: string;
  distanceKm: number;
  distance: string | null;
  distanceUnit: string;
  heading: string;
  body: string;
  scene?: Scene;
};

function CourseDistanceBadge({ item, onSelectPoint }: { item: CourseItem; onSelectPoint?: (km: number) => void }) {
  const coursePoint = item.scene?.coursePoint;
  const selectable = Boolean(coursePoint && onSelectPoint);
  const className =
    "relative flex min-h-16 w-full max-w-24 flex-col items-center justify-center rounded-2xl border-2 border-brand/60 bg-cream px-1 py-2 shadow-[0_3px_0] shadow-brand/35 sm:min-h-18 sm:rounded-3xl";
  const label = item.distance ? (
    <>
      <span className="block text-lg font-bold leading-7 tabular-nums sm:text-xl">{item.distance}</span>
      <span className="flex items-center gap-1 text-[10px] font-medium text-sub sm:text-xs">
        {selectable && <MapPin size={12} aria-hidden="true" />}
        {item.distanceUnit}
      </span>
    </>
  ) : (
    <>
      <Flag size={17} strokeWidth={1.8} aria-hidden="true" className="mb-1" />
      <span className="text-xs font-bold">ゴール</span>
    </>
  );
  return coursePoint && onSelectPoint ? (
    <button
      type="button"
      onClick={() => onSelectPoint(coursePoint.distanceM / 1000)}
      title="コース上で見る"
      aria-label={`${item.distance}${item.distanceUnit}の地点をコース地図で見る：${item.heading}`}
      className={`${className} cursor-pointer transition hover:border-brand hover:bg-brand/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent`}
    >
      {label}
    </button>
  ) : (
    <p className={className}>{label}</p>
  );
}

export function RaceCoursePoints({
  entry,
  atmosphere,
  onSelectPoint,
}: {
  entry?: RaceEditorial;
  atmosphere?: RaceAtmosphere;
  onSelectPoint?: (km: number) => void;
}) {
  if (!entry && !atmosphere) return null;

  // Pair images explicitly: proximity alone cannot identify the right stretch
  // or direction on an out-and-back course. Keep editorial range labels intact.
  const pairedSceneIds = new Set(entry?.points.map((point) => point.sceneId).filter(Boolean));
  const items: CourseItem[] = [
    ...(entry?.points.map((point) => ({
      key: `${point.distance}-${point.heading}`,
      distanceKm: Number.parseFloat(point.distance),
      distance: point.distance,
      distanceUnit: point.distanceUnit,
      heading: point.heading,
      body: point.body,
      scene: atmosphere?.scenes.find((scene) => scene.id === point.sceneId),
    })) ?? []),
    ...(atmosphere?.scenes
      .filter((scene) => !pairedSceneIds.has(scene.id))
      .map((scene) => ({
        key: scene.id,
        distanceKm: scene.coursePoint ? scene.coursePoint.distanceM / 1000 : Infinity,
        distance: scene.coursePoint ? `約${(scene.coursePoint.distanceM / 1000).toFixed(1)}` : null,
        distanceUnit: "km付近",
        heading: scene.title,
        body: scene.description,
        scene,
      })) ?? []),
  ];
  items.sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <section
      id="course-points"
      className="mt-10 max-w-3xl scroll-mt-24 lg:max-w-4xl"
      aria-labelledby="course-points-heading"
    >
      <SectionHeading id="course-points-heading">コースの予習ポイント</SectionHeading>
      {entry && <p className="mt-4 text-pretty text-base font-bold leading-8 sm:max-w-3xl sm:text-lg">{entry.intro}</p>}
      <div className="mt-3 space-y-1 text-xs leading-5 text-sub">
        {entry && <p>{entry.referenceLabel}</p>}
        {atmosphere && (
          <p>画像は{atmosphere.courseYear ? `${atmosphere.courseYear}年コース` : "掲載コース"}の景色。現地の写真を参考にしたAI生成イメージです。</p>
        )}
      </div>
      <ol className="mt-7">
        {items.map((item, index) => (
          <li
            key={item.key}
            className="group grid grid-cols-[5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6"
          >
            <div className="relative flex flex-col items-center text-center">
              {index < items.length - 1 && (
                <div aria-hidden="true" className="absolute bottom-0 left-1/2 top-14 w-10 -translate-x-1/2 sm:w-12">
                  <svg
                    viewBox="0 0 48 200"
                    preserveAspectRatio="none"
                    className="h-full w-full overflow-visible text-brand-dark"
                  >
                    <path
                      d="M24 0 C4 42 44 74 24 106 S4 164 24 200"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeDasharray="2 8"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span className="absolute left-1/2 top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 -rotate-12 place-items-center rounded-full bg-paper text-brand-dark">
                    <Footprints size={19} strokeWidth={1.8} />
                  </span>
                </div>
              )}
              <CourseDistanceBadge item={item} onSelectPoint={onSelectPoint} />
            </div>
            <div className="min-w-0 pb-10 group-last:pb-0 sm:pb-12">
              {item.scene ? (
                <RaceAtmosphereScene scene={item.scene} heading={item.heading} description={item.body} />
              ) : (
                <div>
                  <h3 className="text-base font-bold leading-6 sm:text-lg sm:leading-7">{item.heading}</h3>
                  <p className="mt-2 text-sm leading-6">{item.body}</p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <details className="mt-5 text-xs leading-6 text-sub">
        <summary className="w-fit cursor-pointer underline decoration-line underline-offset-4 hover:text-ink">
          出典・距離の目安
        </summary>
        {entry && (
          <>
            <p className="mt-2">{entry.sourceNote}</p>
            <ul className="flex flex-wrap gap-x-4">
              {entry.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-4"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
            <p>
              確認日：<time dateTime={entry.checkedAt}>{entry.checkedAt.replaceAll("-", "/")}</time>
            </p>
          </>
        )}
        {atmosphere && (
          <p className="mt-2">
            画像の地点の距離は掲載ルートから算出した目安で、公式の距離表示とは異なる場合があります。景観・建物の細部・季節や大会当日の様子を正確に再現したものではありません。
            <a
              href={atmosphere.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-accent underline underline-offset-4"
            >
              {atmosphere.courseYear ? `${atmosphere.courseYear}年コースの参照元` : "掲載コースの参照元"}
            </a>
          </p>
        )}
      </details>
    </section>
  );
}
