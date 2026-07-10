// 大会試走ページ(/races/{slug})の定義。
// 掲載スポットは spots.slug で紐付け、表示時に getSpotSummariesBySlugs で解決する。
// 開催日は毎年変わるため「毎年◯月ごろ」の粒度に留め、年次更新の保守を不要にする
export type RaceSpotLink = {
  slug: string;
  // そのスポットが試走・前日ラン・当日アップにどう役立つか(カード上部に表示)
  reason: string;
};

export type RaceDef = {
  slug: string;
  name: string;
  timing: string; // 例: "毎年3月上旬"
  monthIndex: number; // 開催月(1-12)。一覧のカレンダー順ソートに使う
  prefecture: string;
  startFinish: string;
  distanceLabel: string;
  description: string; // meta description
  lead: string;
  spots: RaceSpotLink[];
};

export const races: RaceDef[] = [
  {
    slug: "beppu-oita-marathon",
    name: "別府大分毎日マラソン",
    timing: "毎年2月上旬",
    monthIndex: 2,
    prefecture: "大分県",
    startFinish: "高崎山うみたまご前スタート、別大国道を経て大分市営陸上競技場フィニッシュ",
    distanceLabel: "フルマラソン",
    description: "別府大分毎日マラソン(別大)の試走・前日ランにおすすめのコースまとめ。勝負どころの別大国道をはじめ、遠征前後に走れるスポットをコース地図つきで紹介します。",
    lead: "「別大」の代名詞である別大国道は、事前に一度走っておくと単調な海岸線への心構えがまったく変わります。別府・大分どちらに泊まっても走れるスポットを集めました。",
    spots: [
      { slug: "betsudai-kokudo-oita", reason: "勝負どころの別大国道がコースそのもの。海沿いの単調な直線の感覚を、試走で事前に掴んでおけます。" },
      { slug: "beppu-kaigan-kamegawa", reason: "別府側の海岸沿い。温泉泊なら宿から出てすぐ、前日の軽いジョグにちょうどいい距離感です。" },
      { slug: "oita-sports-park-happy-road", reason: "大分市内泊の前日刺激に。クッション性のあるジョギングコースで脚に優しく調整できます。" },
    ],
  },
  {
    slug: "kyoto-marathon",
    name: "京都マラソン",
    timing: "毎年2月中旬",
    monthIndex: 2,
    prefecture: "京都府",
    startFinish: "たけびしスタジアム京都(西京極)スタート、平安神宮前フィニッシュ",
    distanceLabel: "フルマラソン",
    description: "京都マラソンの試走・前日ランにおすすめのコースまとめ。終盤に走る鴨川沿いや前日刺激に使える京都御苑など、遠征ランナー向けにコース地図つきで紹介します。",
    lead: "終盤の鴨川河川敷など、コースと重なる区間を事前に踏んでおけるのが京都遠征の強み。観光と両立しやすい市中心部のスポットを集めました。",
    spots: [
      { slug: "kamogawa-sanjo-demachiyanagi", reason: "終盤に走る鴨川沿いと重なるエリア。残り数kmの景色を頭に入れておくと本番で粘れます。" },
      { slug: "kyoto-gyoen", reason: "フィニッシュの平安神宮からも近い砂利の周回路。脚に優しく、前日の刺激入れに最適です。" },
      { slug: "takaragaike-park", reason: "コース中盤で通過する宝が池エリア。折返し前後のアップダウンの下見を兼ねた試走に。" },
    ],
  },
  {
    slug: "osaka-marathon",
    name: "大阪マラソン",
    timing: "毎年2月下旬",
    monthIndex: 2,
    prefecture: "大阪府",
    startFinish: "大阪府庁前スタート、大阪城公園フィニッシュ",
    distanceLabel: "フルマラソン",
    description: "大阪マラソンの試走・前日ランにおすすめのコースまとめ。発着の大阪城公園や刺激入れ定番の長居公園など、遠征ランナー向けにコース地図つきで紹介します。",
    lead: "発着エリアの大阪城公園を前日に走っておけば、当日の動線も雰囲気も一度に掴めます。市内泊で使いやすいスポットを集めました。",
    spots: [
      { slug: "osakajo", reason: "スタート・フィニッシュエリアそのもの。前日受付のあとに発着周辺の下見ジョグができます。" },
      { slug: "nagai-park", reason: "1周約2.8kmの周回は刺激入れの定番。地下鉄一本でアクセスでき、前日調整に使いやすい公園です。" },
      { slug: "yodogawa-nishinakajima", reason: "広くフラットな河川敷。大会数週間前の30km走など、最終ロング調整の場所としても使えます。" },
    ],
  },
  {
    slug: "tokyo-marathon",
    name: "東京マラソン",
    timing: "毎年3月上旬",
    monthIndex: 3,
    prefecture: "東京都",
    startFinish: "東京都庁前スタート、丸の内・行幸通りフィニッシュ",
    distanceLabel: "フルマラソン",
    description: "東京マラソンの試走・前日ランにおすすめのコースまとめ。フィニッシュに重なる皇居やスタート至近の新宿中央公園など、遠征ランナー向けにコース地図つきで紹介します。",
    lead: "世界中から遠征ランナーが集まる大会。スタートの新宿とフィニッシュの丸の内、どちらに泊まっても歩いて行けるスポットがあります。",
    spots: [
      { slug: "kokyo", reason: "フィニッシュ直前に走る内堀通り・丸の内エリアと重なる1周5kmの周回。前日刺激の大定番です。" },
      { slug: "shinjuku-central-park", reason: "スタートの都庁の目の前。前日の軽いジョグでスタート地点の下見まで済ませられます。" },
      { slug: "meiji-jingu-gaien-loop", reason: "小さめの周回で、短時間でスピード刺激だけ入れたい前日にちょうどいいサイズです。" },
      { slug: "sumidagawa-terrace-sumida", reason: "浅草・蔵前の折返しエリアに近い川沿い。下町区間の下見を兼ねたジョグにどうぞ。" },
    ],
  },
  {
    slug: "nagoya-womens-marathon",
    name: "名古屋ウィメンズマラソン",
    timing: "毎年3月上旬",
    monthIndex: 3,
    prefecture: "愛知県",
    startFinish: "バンテリンドーム ナゴヤ発着",
    distanceLabel: "フルマラソン",
    description: "名古屋ウィメンズマラソンの試走・前日ランにおすすめのコースまとめ。発着のドームに近い名城公園など、遠征ランナー向けにコース地図つきで紹介します。",
    lead: "発着のバンテリンドームから近い名城公園を押さえておけば、前日刺激も当日朝のアップも迷いません。市内で調整しやすいスポットを集めました。",
    spots: [
      { slug: "meijo", reason: "コースでも走る名古屋城周辺に隣接する周回コース。発着のドームからも近く、前日刺激の定番です。" },
      { slug: "tsurumai-park", reason: "市内中心部からアクセスしやすい周回。前日に短いスピード刺激を入れるのに手頃です。" },
      { slug: "yamazaki-river-kawanabashi-ishikawabashi", reason: "静かな川沿いの遊歩道。人混みを避けてリズムだけ確認したい前日ランに向いています。" },
    ],
  },
  {
    slug: "itabashi-city-marathon",
    name: "板橋Cityマラソン",
    timing: "毎年3月中旬",
    monthIndex: 3,
    prefecture: "東京都",
    startFinish: "荒川河川敷(板橋・浮間エリア)発着",
    distanceLabel: "フルマラソン",
    description: "板橋Cityマラソンの試走・前日ランにおすすめのコースまとめ。大会の舞台である荒川河川敷など、初フル・記録狙いのランナー向けにコース地図つきで紹介します。",
    lead: "フラットな荒川河川敷を走る、初フルマラソンや記録狙いの定番大会。コースの大半が普段から走れる河川敷なので、試走のしやすさは全国屈指です。",
    spots: [
      { slug: "arakawa", reason: "大会の舞台そのものの荒川河川敷(赤羽エリア)。本番と同じフラットな路面と、遮るもののない風を事前に体感できます。" },
      { slug: "ukima-park", reason: "会場の浮間エリアにある公園。前日に会場の下見とセットで軽くジョグするのにちょうどいい周回です。" },
    ],
  },
  {
    slug: "hokkaido-marathon",
    name: "北海道マラソン",
    timing: "毎年8月下旬",
    monthIndex: 8,
    prefecture: "北海道",
    startFinish: "札幌・大通公園発着",
    distanceLabel: "フルマラソン",
    description: "北海道マラソンの試走・前日ランにおすすめのコースまとめ。コース序盤に通る中島公園など、夏マラソン遠征のランナー向けにコース地図つきで紹介します。",
    lead: "真夏のフルマラソンだからこそ、前日は木陰のあるコースで軽く済ませたいところ。札幌中心部からアクセスしやすいスポットを集めました。",
    spots: [
      { slug: "nakajima-park", reason: "コース序盤に通過する公園。すすきの・中島公園エリア泊なら宿からそのまま前日ジョグできます。" },
      { slug: "makomanai-park", reason: "木陰が多く夏でも走りやすい園内周回。起伏で脚を確かめる最終刺激に向いています。" },
    ],
  },
  {
    slug: "tazawako-marathon",
    name: "田沢湖マラソン",
    timing: "毎年9月中旬",
    monthIndex: 9,
    prefecture: "秋田県",
    startFinish: "田沢湖畔発着",
    distanceLabel: "フルマラソン・20km・10km",
    description: "田沢湖マラソンの試走におすすめのコースまとめ。フルで走る田沢湖一周そのものをコース地図つきで紹介。アップダウンの位置を事前に確認できます。",
    lead: "フルの舞台である田沢湖一周は、どこで登りが来るかを知っているかどうかでレース運びが変わります。試走を兼ねた湖畔ランにどうぞ。",
    spots: [
      { slug: "tazawako-loop", reason: "大会でそのまま走る田沢湖一周。アップダウンの位置と景色を、試走で丸ごと頭に入れられます。" },
    ],
  },
  {
    slug: "yokohama-marathon",
    name: "横浜マラソン",
    timing: "毎年10月下旬",
    monthIndex: 10,
    prefecture: "神奈川県",
    startFinish: "みなとみらい発着",
    distanceLabel: "フルマラソン",
    description: "横浜マラソンの試走・前日ランにおすすめのコースまとめ。発着のみなとみらいに面した臨港パークなど、遠征ランナー向けにコース地図つきで紹介します。",
    lead: "発着エリアのみなとみらいは、前日受付とセットで下見ジョグがしやすい立地。海沿いと高台、性格の違うスポットを集めました。",
    spots: [
      { slug: "rinko-park", reason: "発着のパシフィコ横浜の目の前。前日受付のついでに海沿いをひと回りして雰囲気を掴めます。" },
      { slug: "negishi-forest-park", reason: "コース中盤の根岸エリアにある起伏の公園。アップダウンで脚を確かめる前日調整に。" },
      { slug: "mitsuzawa-park", reason: "横浜市内の刺激入れ定番。クロカン気分で走れる園内で、脚に優しく最終刺激を入れられます。" },
    ],
  },
  {
    slug: "kanazawa-marathon",
    name: "金沢マラソン",
    timing: "毎年10月下旬",
    monthIndex: 10,
    prefecture: "石川県",
    startFinish: "しいのき迎賓館前スタート、石川県西部緑地公園フィニッシュ",
    distanceLabel: "フルマラソン",
    description: "金沢マラソンの試走・前日ランにおすすめのコースまとめ。スタート地点の目の前にある金沢城公園外周など、遠征ランナー向けにコース地図つきで紹介します。",
    lead: "スタートは金沢城のすぐそば。前日に城周りを一周すれば、観光とスタート地点の下見とアップの下調べが一度に済みます。",
    spots: [
      { slug: "kanazawa-castle-loop", reason: "スタートのしいのき迎賓館は金沢城の目の前。前日受付後の下見ジョグにそのまま使えます。" },
      { slug: "saigawa-kasenjiki", reason: "市街地から続くフラットな犀川沿い。人混みを避けてリズムを確認する前日ランに向いています。" },
    ],
  },
  {
    slug: "suwako-marathon",
    name: "諏訪湖マラソン",
    timing: "毎年10月下旬",
    monthIndex: 10,
    prefecture: "長野県",
    startFinish: "諏訪湖畔発着",
    distanceLabel: "ハーフマラソン",
    description: "諏訪湖マラソンの試走におすすめのコースまとめ。大会の舞台である諏訪湖一周をコース地図つきで紹介。ハーフの距離感をそのまま確かめられます。",
    lead: "諏訪湖一周はほぼハーフの距離感そのもの。本番ペースの通し試走から前日の軽いジョグまで、一つの湖で完結します。",
    spots: [
      { slug: "suwako-loop", reason: "大会の舞台そのものの湖畔一周。フラットな周回で、本番を想定したペース走にも使えます。" },
    ],
  },
  {
    slug: "fukuoka-marathon",
    name: "福岡マラソン",
    timing: "毎年11月上旬",
    monthIndex: 11,
    prefecture: "福岡県",
    startFinish: "天神スタート、糸島市フィニッシュ",
    distanceLabel: "フルマラソン",
    description: "福岡マラソンの試走・前日ランにおすすめのコースまとめ。スタートの天神に近い大濠公園や序盤に走る百道浜など、遠征ランナー向けにコース地図つきで紹介します。",
    lead: "スタートの天神から大濠公園までは約2km。前日刺激の場所には困らない街です。序盤の海沿い区間の下見もあわせてどうぞ。",
    spots: [
      { slug: "oohori", reason: "スタートの天神から約2km、1周2kmの周回は前日刺激の聖地。当日朝のアップにも使えます。" },
      { slug: "seaside-momochi", reason: "コース序盤に走る百道浜エリアの海沿い。序盤の景色と海風を試走で掴んでおけます。" },
    ],
  },
  {
    slug: "shimonoseki-kaikyo-marathon",
    name: "下関海響マラソン",
    timing: "毎年11月上旬",
    monthIndex: 11,
    prefecture: "山口県",
    startFinish: "海峡メッセ下関周辺発着",
    distanceLabel: "フルマラソン",
    description: "下関海響マラソンの試走・前日ランにおすすめのコースまとめ。大会の舞台である関門海峡沿いをコース地図つきで紹介。名物の起伏と海風を事前に体感できます。",
    lead: "「海響」の名のとおり、関門海峡沿いの景色とアップダウンがこの大会の顔。前日に海峡沿いを軽く走っておくと本番の景色が一段と楽しめます。",
    spots: [
      { slug: "kanmon-kaikyo-crossing", reason: "大会の舞台と同じ関門海峡沿いを走るコース。海沿いの風と起伏の感覚を前日に下見できます。" },
    ],
  },
  {
    slug: "ibigawa-marathon",
    name: "いびがわマラソン",
    timing: "毎年11月上旬",
    monthIndex: 11,
    prefecture: "岐阜県",
    startFinish: "揖斐川町中心部発着",
    distanceLabel: "フルマラソン・ハーフ",
    description: "いびがわマラソンの試走におすすめのコースまとめ。大会と同じ揖斐川沿いの区間をコース地図つきで紹介。名物のアップダウンを事前に確認できます。",
    lead: "「日本一きつくて日本一あたたかい」と言われる起伏の大会。揖斐川沿いのアップダウンを一度踏んでおくと、ペース配分の解像度が上がります。",
    spots: [
      { slug: "ibigawa-long", reason: "大会と同じ揖斐川沿いを走るロングコース。名物のアップダウンと川沿いの景色を試走で体感できます。" },
    ],
  },
  {
    slug: "kobe-marathon",
    name: "神戸マラソン",
    timing: "毎年11月中旬",
    monthIndex: 11,
    prefecture: "兵庫県",
    startFinish: "三宮・神戸市役所前スタート、ポートアイランドフィニッシュ",
    distanceLabel: "フルマラソン",
    description: "神戸マラソンの試走・前日ランにおすすめのコースまとめ。スタートの三宮から徒歩圏のみなとのもり公園など、遠征ランナー向けにコース地図つきで紹介します。",
    lead: "スタートの三宮周辺に泊まれば、前日刺激は徒歩圏で完結します。海沿いの遊歩道で本番の海風も感じておきましょう。",
    spots: [
      { slug: "minato-no-mori-park", reason: "スタートの三宮から徒歩圏にある周回コース。前日刺激にも当日朝のアップにも使えます。" },
      { slug: "hat-kobe-nagisa-park", reason: "海沿いのフラットな遊歩道。本番でも付き合うことになる海風の感覚を前日に掴めます。" },
    ],
  },
  {
    slug: "fujisan-marathon",
    name: "富士山マラソン",
    timing: "毎年11月下旬",
    monthIndex: 11,
    prefecture: "山梨県",
    startFinish: "河口湖畔発着(河口湖・西湖をめぐる)",
    distanceLabel: "フルマラソン",
    description: "富士山マラソンの試走におすすめのコースまとめ。レース後半の勝負どころである西湖一周をコース地図つきで紹介。登り区間を事前に確認できます。",
    lead: "レース後半の西湖エリアは、コースへの登りが最大の勝負どころ。事前に一周しておくと、どこで我慢するかが明確になります。",
    spots: [
      { slug: "saiko-loop", reason: "レース後半で走る西湖はコースそのもの。勝負どころの登りと湖畔区間を試走で確認できます。" },
      { slug: "lake-yamanaka-loop", reason: "同じ富士五湖エリアの周回コース。直前合宿や大会前週のロング調整に使いやすい一周です。" },
    ],
  },
  {
    slug: "aoshima-taiheiyo-marathon",
    name: "青島太平洋マラソン",
    timing: "毎年12月上旬",
    monthIndex: 12,
    prefecture: "宮崎県",
    startFinish: "宮崎県総合運動公園発着",
    distanceLabel: "フルマラソン・10km",
    description: "青島太平洋マラソンの試走・前日ランにおすすめのコースまとめ。名物のトロピカルロード・青島エリアなど、遠征ランナー向けにコース地図つきで紹介します。",
    lead: "名物のトロピカルロードと青島の景色はこの大会のハイライト。前日に軽く走っておけば、本番では景色を楽しむ余裕が生まれます。",
    spots: [
      { slug: "aoshima-kisakihama", reason: "名物のトロピカルロード・青島エリアはコースそのもの。松林の日差しや路面を事前に体感できます。" },
      { slug: "miyazaki-night-run", reason: "宮崎市中心部泊の前日ジョグに。大淀川沿いまで含めて距離を調整しやすい市街地コースです。" },
    ],
  },
];

export const raceBySlug = new Map(races.map((race) => [race.slug, race]));

// カレンダー順(1月→12月)で並べた一覧。年をまたぐ概念はないため単純ソートでよい
export const racesByCalendar = [...races].sort((a, b) => a.monthIndex - b.monthIndex);
