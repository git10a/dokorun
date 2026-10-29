type Source = { label: string; url: string };
export type RaceDayInfo = {
  edition: string;
  notice: string;
  noticeSource: Source;
  checkedAt: string;
  items: { label: string; body: string; sources: Source[] }[];
};

const mitoAccess: Source = {
  label: "水戸市公式：コース・アクセス",
  url: "https://www.city.mito.lg.jp/site/mitokomon-manyu-marathon/136978.html",
};
const suwakoFaq: Source = { label: "大会公式：よくある質問", url: "https://suwako.marathon.fm/faq/" };

// Only researched editions are shown; other races get no inferred logistics.
export const raceDayInfo: Partial<Record<string, RaceDayInfo>> = {
  "mito-komon-marathon": {
    edition: "2026年大会の情報",
    notice: "2026年10月25日開催済みの大会情報です。次回大会の案内ではありません。",
    noticeSource: {
      label: "水戸市公式：大会終了のお知らせ",
      url: "https://www.city.mito.lg.jp/site/mitokomon-manyu-marathon/137060.html",
    },
    checkedAt: "2026-10-30",
    items: [
      { label: "アクセス", body: "JR水戸駅からメイン会場まで徒歩約5分。", sources: [mitoAccess] },
      {
        label: "駐車場",
        body: "公式は水戸駅南口周辺の有料駐車場を案内。北口方面は交通規制に注意が必要です。",
        sources: [mitoAccess],
      },
      {
        label: "関門",
        body: "閉鎖時刻は9.5km＝10:40、19.7km＝12:10、29.2km＝13:30、33.4km＝14:00、38.5km＝14:30。",
        sources: [
          {
            label: "水戸市公式：2026年交通規制図（PDF）",
            url: "https://www.city.mito.lg.jp/uploaded/attachment/70002.pdf",
          },
        ],
      },
      {
        label: "エイド",
        body: "5.1kmで水・アクエリアス、12.0kmでカットバナナなどを提供。給食品は準備状況等により変更される場合があります。全地点・品目は公式一覧へ。",
        sources: [
          {
            label: "水戸市公式：公設の給水・給食",
            url: "https://www.city.mito.lg.jp/site/mitokomon-manyu-marathon/136977.html",
          },
        ],
      },
      {
        label: "荷物預け",
        body: "無料、7:00〜16:00、45L袋。男子は三の丸小学校グラウンド、女子はビブスで指定された水戸三の丸ホテルまたは三の丸市民センター。返却時は本人のビブスと手荷物用紙の番号を照合します。",
        sources: [
          {
            label: "水戸市公式：手荷物の預かり",
            url: "https://www.city.mito.lg.jp/site/mitokomon-manyu-marathon/137010.html",
          },
        ],
      },
    ],
  },
  "suwako-marathon": {
    edition: "2026年大会の情報",
    notice: "2026年10月25日開催の大会情報です。次回大会の案内ではありません。",
    noticeSource: { label: "大会公式：2026年開催要項", url: "https://suwako.marathon.fm/gaiyou/" },
    checkedAt: "2026-10-30",
    items: [
      {
        label: "アクセス",
        body: "メイン会場は諏訪湖イベントひろば（諏訪市湖岸通り5丁目11）。公式は乗り合い・公共交通機関の利用を呼びかけています。",
        sources: [{ label: "大会公式：アクセス", url: "https://suwako.marathon.fm/access/" }],
      },
      {
        label: "駐車場",
        body: "臨時駐車場はエントリー時の先着指定制。2026年は会場変更に伴い駐車可能台数が減少しています。",
        sources: [suwakoFaq],
      },
      {
        label: "関門",
        body: "制限時間は3時間、関門は5か所。規定時刻を過ぎた場合はビブスを外し、審判員の指示に従います。各関門の時刻は参加案内をご確認ください。",
        sources: [{ label: "大会公式：開催要項", url: "https://suwako.marathon.fm/gaiyou/" }, suwakoFaq],
      },
      {
        label: "エイド",
        body: "公式FAQではコース上の給水所を6または7か所設置予定と案内しています。",
        sources: [suwakoFaq],
      },
      {
        label: "荷物預け",
        body: "事前送付物に同封の専用荷物袋を使用します。専用袋以外は預けられません。",
        sources: [suwakoFaq],
      },
    ],
  },
};
