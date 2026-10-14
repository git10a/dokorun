import racePreparation from "./race-preparation.json";

/** Source-backed course information. Keep dates tied to a substantive source check. */
export type CourseEditorial = {
  checkedAt: string;
  intro: string;
  title?: string;
  points: { heading: string; body: string; source: { label: string; url: string } }[];
  notice?: { title: string; body: string; url: string; linkLabel: string };
  hideUnverifiedPhotos?: boolean;
};

const checkedAt = "2026-10-14";

export const spotEditorial: Record<string, CourseEditorial | undefined> = {
  "nagai-park": {
    checkedAt,
    title: "長居公園のランニングコース｜一周2.8km・地図とアクセス",
    intro:
      "長居公園の公式案内では、長距離走路は一周2.8km。周回数を決めて走りたいときの候補です。このページでは走り始める場所とルートを地図で確認できます。",
    hideUnverifiedPhotos: true,
    points: [
      {
        heading: "長居公園は一周何キロ？",
        body: "公式の長距離走路は2.8kmです。2周なら5.6km、3周なら8.4kmが目安。このページの掲載ルートの距離は地図データから算出しているため、公式の周回距離とは差があります。",
        source: { label: "長居公園公式・ひとりで楽しむ", url: "https://nagaipark.com/howtoenjoy/alone/" },
      },
      {
        heading: "着替えやシャワーを使いたいとき",
        body: "公園公式サイトでランニングステーションを案内しています。施設を使う日は、利用時間や料金を確認してから出かけてください。",
        source: { label: "長居公園公式・ランニングの案内", url: "https://nagaipark.com/howtoenjoy/alone/" },
      },
    ],
  },
  "nijo-castle-loop": {
    checkedAt,
    title: "二条城のランニングコース｜外周の距離・ルートマップ",
    intro:
      "二条城の外周は公式案内で約2km。このページに掲載している約3.8kmのルートは、城の外周一周と同じ距離ではありません。走る範囲を地図で確かめてから出発してください。",
    points: [
      {
        heading: "外周約2kmと掲載ルートの違い",
        body: "二条城は東西約600m、南北約400m、外周約2kmです。掲載ルートの約3.8kmを「二条城一周の距離」として練習の周回計算に使わないようにしてください。",
        source: {
          label: "元離宮二条城公式・二条城の概要",
          url: "https://nijo-jocastle.city.kyoto.lg.jp/introduction/highlights/overview/",
        },
      },
      {
        heading: "城内の観覧と城外のランニング",
        body: "このページで紹介するのは城の外側のルートです。二の丸御殿などの観覧とは分けて計画し、城内へ入る場合は公式の公開時間・入城案内を確認してください。",
        source: { label: "元離宮二条城公式", url: "https://nijo-jocastle.city.kyoto.lg.jp/" },
      },
    ],
  },
  "showa-kinen-park": {
    checkedAt,
    title: "昭和記念公園のランニングコース｜地図・園内の走り方",
    intro:
      "昭和記念公園の掲載ルートは約5km。公式の園内マップと照らし合わせて、入口から走り始める場所まで確認できます。入園料や開園時間も含めて予定を立てましょう。",
    points: [
      {
        heading: "サイクリングコースは走れる？",
        body: "園内のサイクリングコースは自転車専用で、歩行やランニングはできません。ランニングでは園路を使い、公式の案内図と現地の表示に従ってください。",
        source: {
          label: "昭和記念公園公式・サイクリングコース",
          url: "https://www.showakinen-koen.jp/facility/facility-726/",
        },
      },
      {
        heading: "出発前に確認するもの",
        body: "広い公園なので、利用する入口と園内ルートを先に決めておくと移動を見積もれます。公式サイトには各種マップとパンフレットがあります。",
        source: { label: "昭和記念公園公式・各種マップ", url: "https://www.showakinen-koen.jp/pamphlets/" },
      },
    ],
  },
  "hikarigaoka-park": {
    checkedAt,
    title: "光が丘公園のランニングコース｜約3kmの地図・駅からのアクセス",
    intro:
      "光が丘公園を走る約3kmの掲載ルートです。光が丘駅からのアクセスと、園内で走り始める場所を地図で確認できます。",
    points: [
      {
        heading: "どの駅から行ける？",
        body: "公園公式の案内は、都営大江戸線・光が丘駅から徒歩8分、成増駅・地下鉄成増駅から徒歩15分です。到着する入口によって、ルートまでの移動は変わります。",
        source: { label: "東京都公園協会・光が丘公園", url: "https://www.tokyo-park.or.jp/park/hikarigaoka/" },
      },
      {
        heading: "開園時間と入園料",
        body: "公園は常時開園で、入園は無料です。一部の施設には料金や利用時間があるため、公園が開いている時間と施設が使える時間を分けて確認してください。",
        source: { label: "光が丘公園・基本情報", url: "https://www.tokyo-park.or.jp/park/hikarigaoka/" },
      },
    ],
  },
  "shin-yokohama-park": {
    checkedAt,
    title: "新横浜公園のランニングコース｜地図・シャワーとロッカー",
    intro:
      "新横浜公園の約1.7kmの掲載ルートです。走る場所に加えて、荷物を預けるレストハウスや走った後のシャワーも確認しておくと予定を立てやすくなります。",
    points: [
      {
        heading: "シャワーはどこにある？",
        body: "公式Q&Aでは第2・第3レストハウスにシャワーが案内されています。有料で、冬季は利用時間が短くなります。休場日や点検日もあるため、利用前に最新の案内を確認してください。",
        source: { label: "新横浜公園公式・よくある質問", url: "https://www.nissan-stadium.jp/shinyoko-park/qa.php" },
      },
      {
        heading: "荷物用ロッカーと貴重品用ロッカー",
        body: "荷物用のロッカーは第3レストハウス、第2レストハウスには貴重品用の小型ロッカーがあります。預けたい荷物の大きさに合わせて利用する場所を選びましょう。",
        source: { label: "新横浜公園公式・ロッカーの案内", url: "https://www.nissan-stadium.jp/shinyoko-park/qa.php" },
      },
    ],
  },
  "meiji-jingu-gaien-loop": {
    checkedAt,
    title: "明治神宮外苑のランニングコース｜約1.4kmの地図・通行の確認",
    intro:
      "明治神宮外苑周辺の掲載ルートは約1.4km。周辺道路の交通規制や現地の案内を確認し、歩行者の通行を妨げないペースで走りましょう。",
    points: [
      {
        heading: "日曜なら車道を走れる？",
        body: "警視庁のサイクリング道路案内には、神宮外苑コースは長期休止中で、実施の有無は四谷警察署へ確認するよう記載されています。日曜・祝日でも歩行者専用の道路になっていると決めつけず、現地の規制を確認してください。",
        source: {
          label: "警視庁・サイクリング道路の交通規制",
          url: "https://www.keishicho.metro.tokyo.lg.jp/kotsu/doro/cycle.html",
        },
      },
      {
        heading: "地図と現地の通行案内を確認",
        body: "神宮外苑地区では道路の付替えを含むまちづくりが計画されています。掲載ルートは参考として使い、工事や通行規制がある区間は現地の案内に従ってください。",
        source: {
          label: "新宿区・神宮外苑地区の道路について",
          url: "https://www.city.shinjuku.lg.jp/anzen/seibi01_000001_00037.html",
        },
      },
    ],
  },
  "kiba-park": {
    checkedAt,
    title: "木場公園のランニングコース｜約3.5kmの地図・駅からのアクセス",
    intro:
      "木場公園を走る約3.5kmの掲載ルートです。木場駅のほか、清澄白河駅や菊川駅からもアクセスできます。到着する側に合わせてスタート地点を選びましょう。",
    points: [
      {
        heading: "木場駅・清澄白河駅からのアクセス",
        body: "公園公式では木場駅から徒歩10分、清澄白河駅と菊川駅から徒歩15分と案内しています。園内のどこから走り始めるか、駅からの移動と合わせて地図で確認できます。",
        source: { label: "東京都公園協会・木場公園", url: "https://www.tokyo-park.or.jp/park/kiba/index.html" },
      },
      {
        heading: "公園と施設の利用時間",
        body: "公園は常時開園で入園無料ですが、一部の施設は有料です。施設を利用する場合は休業日・営業時間を別途確認してください。",
        source: { label: "木場公園・基本情報", url: "https://www.tokyo-park.or.jp/park/kiba/index.html" },
      },
    ],
  },
  "kinuta-park-cross-country": {
    checkedAt,
    title: "砧公園のクロカン・ランニングコース｜地図と立入制限の確認",
    intro:
      "砧公園の掲載ルートは約1.7km。園内では一部エリアの立入制限が続いています。地図どおりに一周できるとは限らないため、出発前に公園公式の規制図を確認してください。",
    notice: {
      title: "砧公園の一部エリアに立入制限があります",
      body: "2026年9月16日更新の公園公式案内で、立入制限の継続を確認しています。掲載ルートの全区間が通行できることは確認できていません。最新の規制図と現地の案内を優先してください。",
      url: "https://www.tokyo-park.or.jp/park/kinuta/",
      linkLabel: "砧公園公式・最新のお知らせ",
    },
    points: [
      {
        heading: "現在、コースは一周できる？",
        body: "公園公式は樹木点検に伴う立入制限を案内しています。掲載GPXは通行可能な区間だけに更新したルートではありません。制限区域へ入らず、当日の規制に合わせて走る範囲を決めてください。",
        source: {
          label: "砧公園・立入制限（2026年9月16日更新）",
          url: "https://www.tokyo-park.or.jp/park/kinuta/news/2026/2026_9_16.html",
        },
      },
      {
        heading: "用賀駅からのアクセス",
        body: "公園公式では用賀駅から徒歩20分。または美術館行きの東急コーチバスで「美術館」下車と案内しています。",
        source: { label: "東京都公園協会・砧公園", url: "https://www.tokyo-park.or.jp/park/kinuta/" },
      },
    ],
  },
  "nakanoshima-loop": {
    checkedAt,
    title: "中之島のランニングコース｜約6.8kmの地図・公園へのアクセス",
    intro:
      "中之島周辺を走る約6.8kmの掲載ルートです。中之島公園の園内一周の距離ではありません。橋や周辺道路を含む走行範囲を地図で確認してください。",
    points: [
      {
        heading: "中之島公園へのアクセス",
        body: "公園の公式案内では、淀屋橋駅・北浜駅・なにわ橋駅が最寄り駅です。約6.8kmのルートをすべて走るか、公園周辺だけにするかで、使う駅とスタート地点を選べます。",
        source: {
          label: "大阪市・中之島公園",
          url: "https://parksgreenery.city.osaka.lg.jp/article/parks-nakanoshima/",
        },
      },
      {
        heading: "公園と周辺の街並みを分けて考える",
        body: "中之島公園は堂島川と土佐堀川に囲まれ、周辺に中央公会堂や中之島図書館があります。掲載ルートの距離は公園の大きさを示すものではないため、短く走りたい日は園内マップも確認しましょう。",
        source: {
          label: "大阪市北区・中之島公園の案内",
          url: "https://www.city.osaka.lg.jp/kita/page/0000002170.html",
        },
      },
    ],
  },
  "saiko-doman-green-park": {
    checkedAt,
    title: "彩湖・道満グリーンパークのランニングコース｜地図・開園時間",
    intro:
      "彩湖周辺を走る約5.1kmの掲載ルートです。彩湖・道満グリーンパークは季節で閉園時刻が変わるため、走る時間と帰りの移動を合わせて計画しましょう。",
    points: [
      {
        heading: "早朝・夕方は何時まで使える？",
        body: "公園の利用時間は7時30分から18時30分、11〜3月は17時30分までです。入園は無料。周回を追加するときも、閉園までに戻れる時間を見込んでください。",
        source: { label: "戸田市水と緑の公社・利用案内", url: "https://www.toda-kousha.com/park/saikodoman/" },
      },
      {
        heading: "武蔵浦和駅からバスで行くには",
        body: "公式案内は武蔵浦和駅東口から下笹目行きの武浦01系統で約10分。「彩湖・道満グリーンパーク入口」下車後、徒歩5分です。",
        source: {
          label: "彩湖・道満グリーンパーク・交通アクセス",
          url: "https://www.toda-kousha.com/park/saikodoman/",
        },
      },
    ],
  },
};

/** Race-specific preparation, with the referenced edition shown alongside the heading. */
export type RaceEditorial = {
  checkedAt: string;
  courseYear?: number;
  referenceLabel: string;
  sourceNote: string;
  intro: string;
  points: { distance: string; distanceUnit: string; heading: string; body: string; sceneId?: string }[];
  sources: { label: string; url: string; kind?: string; year?: number }[];
};

export const raceEditorial: Record<string, RaceEditorial | undefined> = racePreparation;

export function editorialLastModified(entry: Pick<CourseEditorial, "checkedAt"> | undefined, previous?: string | Date) {
  if (!entry) return previous;
  const checked = new Date(`${entry.checkedAt}T00:00:00+09:00`);
  return previous && new Date(previous) > checked ? previous : checked;
}

export const stationEditorial: Record<
  string,
  { checkedAt: string; intro: string; spots: { slug: string; reason: string }[] } | undefined
> = {
  sendai: {
    checkedAt,
    intro:
      "仙台駅からの移動と、公園に着いてから走る距離を分けて選ぶと計画しやすくなります。駅から近い順では榴岡公園、西公園の2候補です。",
    spots: [
      {
        slug: "tsutsujigaoka-park",
        reason: "駅からの移動を短くしたいときの候補。園内ルートの距離と入口を確認できます。",
      },
      {
        slug: "sendai-nishi-park-running-course",
        reason: "西公園を目的地にして走りたいときの候補。公園までの移動距離も走行予定に含めて考えましょう。",
      },
    ],
  },
  "shin-yokohama": {
    checkedAt,
    intro:
      "新横浜駅から公園へ向かうか、電車で移動して川沿いを走るかで候補を選べます。公園で着替えたい場合は、レストハウスの場所と利用時間も先に確認しましょう。",
    spots: [
      {
        slug: "shin-yokohama-park",
        reason: "新横浜駅から向かう公園の候補。コース地図とシャワー・ロッカーの案内を確認できます。",
      },
      {
        slug: "tsurumigawa-tsunashima",
        reason: "綱島方面へ移動して川沿いを走りたいときの候補。駅からの移動と掲載ルートを確認できます。",
      },
    ],
  },
  "nagai-osaka": {
    checkedAt,
    intro:
      "長居駅からは長居公園が近くの候補です。公式の長距離走路は一周2.8kmなので、走りたい距離に合わせて周回数を決めておくと準備しやすくなります。",
    spots: [{ slug: "nagai-park", reason: "一周の距離と走り始める場所、ランニングステーションの案内を確認できます。" }],
  },
};
