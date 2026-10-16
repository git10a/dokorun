import additionalAtmospheres from "./spot-atmosphere-catalog.json";

export type CourseAtmosphereScene = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  referenceUrl: string;
  coursePoint?: { distanceM: number; lat: number; lng: number };
};

export type CourseAtmosphere = {
  direction?: "counterclockwise";
  scenes: CourseAtmosphereScene[];
};

const mapPoint = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;

// Hand-reviewed illustrations. Source panoramas, observation dates and prompts
// live in output/course-atmosphere; these are separate from verified photographs.
export const courseAtmospheres: Record<string, CourseAtmosphere> = {
  "meiji-jingu-gaien-loop": {
    scenes: [
      {
        id: "east",
        title: "外苑の並木に沿う歩道",
        description: "車道と木々の間に続く舗装の歩道。大きな常緑樹や落葉樹が、走る道のすぐそばに並ぶ。",
        imageSrc: "/course-atmosphere/gaien-east.webp",
        coursePoint: { distanceM: 273.08, lat: 35.67822, lng: 139.719293 },
        referenceUrl: mapPoint(35.67822, 139.719293),
      },
      {
        id: "south",
        title: "生垣沿いにたどる周回路",
        description: "南側は生垣と低い建物に沿って進む。並木の間から空が見え、外苑の周回路のカーブへつながっていく。",
        imageSrc: "/course-atmosphere/gaien-south.webp",
        coursePoint: { distanceM: 1085.26, lat: 35.675597, lng: 139.717813 },
        referenceUrl: mapPoint(35.675597, 139.717813),
      },
    ],
  },
  "toyosu-gururi-park": {
    scenes: [
      {
        id: "bridge",
        title: "レインボーブリッジを望む水辺",
        description: "赤茶色の園路の先にレインボーブリッジ。水面と広い空が見渡せる、豊洲ふ頭の海側の景色。",
        imageSrc: "/course-atmosphere/toyosu-bridge.webp",
        coursePoint: { distanceM: 1901.7, lat: 35.64305156906878, lng: 139.77717532194316 },
        referenceUrl: mapPoint(35.643052, 139.777175),
      },
      {
        id: "canal",
        title: "運河に沿って続く園路",
        description: "東側は運河と対岸の緑、遠くの街並みを眺める区間。水辺に沿って、見通しのよい道が続く。",
        imageSrc: "/course-atmosphere/toyosu-canal.webp",
        coursePoint: { distanceM: 3834.85, lat: 35.64580825756951, lng: 139.7919291578405 },
        referenceUrl: mapPoint(35.645808, 139.791929),
      },
    ],
  },
  "mizumoto-park": {
    scenes: [
      {
        id: "meadow",
        title: "広場の脇をゆるく曲がる園路",
        description: "広い草地と木々に挟まれた舗装路。視界が開け、園路のカーブと緑の広がりを見渡せる。",
        imageSrc: "/course-atmosphere/mizumoto-meadow.webp",
        coursePoint: { distanceM: 304.78, lat: 35.793634, lng: 139.873759 },
        referenceUrl: mapPoint(35.793634, 139.873759),
      },
      {
        id: "grove",
        title: "背の高い木々と明るい木陰",
        description: "西側の園路の脇には、すっと伸びた木々と草地が広がる。葉の間から差す光で、道の表情が変わる。",
        imageSrc: "/course-atmosphere/mizumoto-grove.webp",
        coursePoint: { distanceM: 896.6, lat: 35.794515, lng: 139.868338 },
        referenceUrl: mapPoint(35.794515, 139.868338),
      },
    ],
  },
  "nagai-park": {
    scenes: [
      {
        id: "east",
        title: "並木に沿う東側の走路",
        description: "幅のある灰色の走路に、歩道が並行して続く。落葉樹と常緑樹が混ざる木立のそばを進む区間。",
        imageSrc: "/course-atmosphere/nagai-east.webp",
        coursePoint: { distanceM: 1702.53, lat: 34.611671, lng: 135.526535 },
        referenceUrl: mapPoint(34.611671, 135.526535),
      },
      {
        id: "north",
        title: "大きな木々が並ぶ北側の直線",
        description: "枝を広げた木々の向こうに住宅が見える北側。園内の緑と街の近さを感じながら、広い舗装路を走る。",
        imageSrc: "/course-atmosphere/nagai-north.webp",
        coursePoint: { distanceM: 2272.77, lat: 34.615079, lng: 135.52395 },
        referenceUrl: mapPoint(34.615079, 135.52395),
      },
    ],
  },
  oohori: {
    scenes: [
      {
        id: "willows",
        title: "柳の向こうに広がる池",
        description: "北側の園路から望む大きな池。水際には柳とベンチが並び、対岸まで開けた景色を楽しめる。",
        imageSrc: "/course-atmosphere/oohori-willows.webp",
        coursePoint: { distanceM: 394.78, lat: 33.588723, lng: 130.377403 },
        referenceUrl: mapPoint(33.588723, 130.377403),
      },
      {
        id: "south",
        title: "池を左に、南側の周回路へ",
        description: "南側を東へ進むと、左に池と水際の散策路。淡い色の走路と緑の区切り線が、池のカーブに沿って続く。",
        imageSrc: "/course-atmosphere/oohori-south.webp",
        coursePoint: { distanceM: 1573.78, lat: 33.5829, lng: 130.376913 },
        referenceUrl: mapPoint(33.5829, 130.376913),
      },
    ],
  },
  yoyogi: {
    scenes: [
      {
        id: "woodland",
        title: "木々の間を抜ける園路",
        description: "大きな木々に囲まれ、舗装された園路がゆるく曲がっていく。足元と木陰の雰囲気をイメージできる区間。",
        imageSrc: "/course-atmosphere/yoyogi-woodland.webp",
        coursePoint: { distanceM: 379.82, lat: 35.671747, lng: 139.696522 },
        referenceUrl: mapPoint(35.671747, 139.696522),
      },
      {
        id: "clearing",
        title: "林の向こうにひらける緑",
        description: "園路の脇には土と芝の広がる木立。見通しが開ける場所では、公園らしいゆったりした景色が続く。",
        imageSrc: "/course-atmosphere/yoyogi-clearing.webp",
        coursePoint: { distanceM: 0, lat: 35.669524, lng: 139.699632 },
        referenceUrl: mapPoint(35.669524, 139.699632),
      },
    ],
  },
  kokyo: {
    direction: "counterclockwise",
    scenes: [
      {
        id: "east-ccw",
        title: "大手門側から竹橋へ",
        description: "反時計回りに北へ。お堀と石垣を左に、大手町の街並みを右に見ながら進む区間。",
        imageSrc: "/course-atmosphere/kokyo-east-ccw.webp",
        coursePoint: { distanceM: 1004.05, lat: 35.685891, lng: 139.761055 },
        referenceUrl: mapPoint(35.685891, 139.761055),
      },
      {
        id: "moat-ccw",
        title: "お堀沿いを桜田門へ",
        description: "反時計回りに南へ戻る西側。お堀を左に見ながら、並木と車道に沿った歩道を進む。",
        imageSrc: "/course-atmosphere/kokyo-moat-ccw.webp",
        coursePoint: { distanceM: 4001.53, lat: 35.679536, lng: 139.74731 },
        referenceUrl: mapPoint(35.679536, 139.74731),
      },
    ],
  },
  komazawa: {
    scenes: [
      {
        id: "north",
        title: "並木の下を走る北側の園路",
        description: "舗装された園路の両側に大きな木々が並ぶ。冬には枝の間から日が差し、路面に長い影が落ちる。",
        imageSrc: "/course-atmosphere/komazawa-north.webp",
        coursePoint: { distanceM: 422.85, lat: 35.627654, lng: 139.662207 },
        referenceUrl: mapPoint(35.627654, 139.662207),
      },
      {
        id: "west",
        title: "木漏れ日の広がる西側の園路",
        description: "園路の脇に木立が広がり、ゆるく曲がる道の先まで見通せる。並木の影を感じながら走る区間。",
        imageSrc: "/course-atmosphere/komazawa-west.webp",
        coursePoint: { distanceM: 858.08, lat: 35.626187, lng: 139.65887 },
        referenceUrl: mapPoint(35.626187, 139.65887),
      },
    ],
  },
  ...additionalAtmospheres,
};
