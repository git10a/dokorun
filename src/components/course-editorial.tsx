import type { CourseEditorial as Editorial } from "@/lib/course-editorial";
import { SectionHeading } from "@/components/section-heading";

export function CourseEditorial({ entry }: { entry: Editorial }) {
  return (
    <section className="space-y-5" aria-label="走る前に知っておきたいこと">
      <SectionHeading>走る前に知っておきたいこと</SectionHeading>
      <div className="max-w-3xl space-y-6">
        {entry.points.map((point) => (
          <div key={point.heading} className="space-y-2">
            <h3 className="text-base font-bold sm:text-lg">{point.heading}</h3>
            <p className="text-sm leading-7">{point.body}</p>
            <a
              href={point.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs leading-6 text-accent underline underline-offset-4"
            >
              {point.source.label}
            </a>
          </div>
        ))}
      </div>
      <p className="text-xs text-sub">
        公式情報の確認日：<time dateTime={entry.checkedAt}>{entry.checkedAt.replaceAll("-", "/")}</time>
      </p>
    </section>
  );
}
