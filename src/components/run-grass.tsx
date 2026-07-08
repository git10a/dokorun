import type { RunActivityDay } from "@/db/data";
import { jstDateString } from "@/lib/jst";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function lastGridDays(weeks: number) {
  const today = new Date(`${jstDateString()}T00:00:00Z`);
  const end = addDays(today, 6 - today.getUTCDay());
  const start = addDays(end, -(weeks * 7 - 1));
  return Array.from({ length: weeks * 7 }, (_, index) => addDays(start, index));
}

function metrics(days: RunActivityDay[]) {
  const set = new Set(days.map((day) => day.day));
  const today = new Date(`${jstDateString()}T00:00:00Z`);
  let streak = 0;
  for (let offset = 0; offset < 400; offset += 1) {
    if (!set.has(jstDateString(addDays(today, -offset)))) break;
    streak += 1;
  }
  let recent30 = 0;
  for (let offset = 0; offset < 30; offset += 1) if (set.has(jstDateString(addDays(today, -offset)))) recent30 += 1;
  return { streak, recent30 };
}

function GrassGrid({ activity, weeks }: { activity: RunActivityDay[]; weeks: number }) {
  const map = new Map(activity.map((day) => [day.day, day]));
  const days = lastGridDays(weeks);
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
      {days.map((date) => {
        const day = jstDateString(date);
        const active = map.get(day);
        return <div key={day} title={`${day}: ${active ? `${active.count}件` : "未記録"}`} className={`aspect-square min-w-0 rounded-[2px] ${active ? "bg-brand" : "bg-cream"}`} />;
      })}
    </div>
  );
}

export function RunGrass({ activity }: { activity: RunActivityDay[] }) {
  const { streak, recent30 } = metrics(activity);
  return (
    <section className="rounded-xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h3 className="font-bold">走った日カレンダー</h3><p className="mt-1 text-sm text-sub">ドコログとチェックインから集計</p></div>
        <div className="flex gap-3 text-sm font-bold"><span>連続 {streak}日</span><span>30日 {recent30}日</span></div>
      </div>
      <div className="mt-5 hidden sm:block"><GrassGrid activity={activity} weeks={53} /></div>
      <div className="mt-5 sm:hidden"><GrassGrid activity={activity} weeks={26} /></div>
      <div className="mt-3 flex items-center gap-2 text-xs text-sub"><span>少</span><span className="size-3 rounded-[2px] bg-cream" /><span className="size-3 rounded-[2px] bg-brand" /><span>走った日</span></div>
    </section>
  );
}
