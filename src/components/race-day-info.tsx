import { raceDayInfo } from "@/lib/race-day-info";

export function RaceDayInfoBox({ slug }: { slug: string }) {
  const info = raceDayInfo[slug];
  if (!info) return null;
  return (
    <section
      aria-labelledby="race-day-info-heading"
      className="mt-6 max-w-3xl rounded-xl border border-line bg-cream p-4 sm:p-6"
    >
      <h2 id="race-day-info-heading" className="text-lg font-bold">
        大会当日の実務情報
      </h2>
      <p className="mt-2 text-sm font-bold">{info.edition}</p>
      <p className="mt-1 text-sm leading-7 text-sub">
        {info.notice}{" "}
        <a href={info.noticeSource.url} className="text-accent underline underline-offset-4">
          {info.noticeSource.label}
        </a>
      </p>
      <dl className="mt-4 divide-y divide-line">
        {info.items.map((item) => (
          <div key={item.label} className="py-3 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[6rem_1fr] sm:gap-4">
            <dt className="text-sm font-bold">{item.label}</dt>
            <dd className="mt-1 text-sm leading-7 sm:mt-0">
              <p>{item.body}</p>
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-6">
                {item.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} className="text-accent underline underline-offset-4">
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-6 text-sub">
        公式情報の確認日：<time dateTime={info.checkedAt}>{info.checkedAt}</time>
      </p>
    </section>
  );
}
