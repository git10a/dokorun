export type StorySection = {
  id: string;
  title: string;
  paragraphs: string[];
  question?: string;
  quote?: { text: string; speaker: string };
};

/** Public article content only. Never put paid chapter bodies or private interview notes here. */
export type RaceStory = {
  slug: string;
  raceSlug: string;
  raceName: string;
  year: number;
  status: "draft" | "published";
  isSample: boolean;
  title: string;
  description: string;
  intro: string;
  author: string;
  publishedAt?: string;
  interviewee?: { name: string; role: string };
  sections: StorySection[];
  sources: { label: string; href: string }[];
  guide: {
    title: string;
    description: string;
    chapters: { title: string; description: string }[];
  };
};

export const raceStories: RaceStory[] = [{
  slug: "yokohama-2026",
  raceSlug: "yokohama-marathon",
  raceName: "横浜マラソン",
  year: 2026,
  status: "draft",
  isSample: true,
  title: "港の景色も、走り方も。\n横浜マラソンをもっと知る。",
  description: "大会をつくる人の思いから、コースの特徴、自分のレース計画まで。大会インタビューと攻略ガイドのサンプルです。",
  intro: "せっかく走るなら、その大会をもっと知ってスタートラインへ。大会をつくる人の思いと、コースに隠れた特徴をたどりながら、自分の42.195kmを考える読み物を準備しています。",
  author: "どこラン編集部",
  sections: [
    {
      id: "story",
      title: "この街を走る、ということ。",
      paragraphs: [
        "横浜ランドマークタワー前から、赤レンガ倉庫や山下公園へ。公式のコース紹介には、横浜の街を象徴する場所が並びます。いつもなら立ち止まって眺める景色を、一本のコースとして走る大会です。",
        "その道を選んだ理由や、ランナーに見てほしい風景。大会をつくる人の言葉を聞くことで、コースマップの一本の線にも、違った表情が見えてくるはずです。",
      ],
      question: "このコースを通して、ランナーにどんな横浜を感じてほしいですか？",
    },
    {
      id: "course",
      title: "地図の先にある、コースの話。",
      paragraphs: [
        "横浜マラソンのフルマラソンには、首都高速湾岸線を走る区間があります。街なかとは違う場所を走れることも、この大会の特徴の一つです。",
        "実際の道幅や路面、見通しはどうなのか。今年のコースで変わったところはあるのか。取材では公式のコース図を一緒に見ながら、初めて走る人が事前に知っておきたいことを、場所と結び付けて伺います。",
      ],
      question: "初参加のランナーが、実際に走ってみて驚くのはどんな区間でしょうか？",
    },
    {
      id: "preparation",
      title: "知ったことを、自分の準備に。",
      paragraphs: [
        "気になる区間を知ったら、次は自分の目標と照らし合わせる番です。どこで余裕を残したいか、予定どおりに進まなかったときはどうするか。コースを思い浮かべながら、当日の判断を先に考えておきます。",
        "攻略編では、運営者が教えてくれたコースの事実と、実際に走った人の経験を整理し、ペース計画や当日見返すメモへつなげる構成を考えています。",
      ],
      question: "スタート前に一つだけ知っておいてもらうなら、何を伝えますか？",
    },
  ],
  sources: [{ label: "横浜マラソン2026 公式コース紹介", href: "https://expo2026.yokohamamarathon.jp/course/" }],
  guide: {
    title: "知ったコースを、\n自分のレース計画に。",
    description: "どこで余裕を残すか。予定と違ったらどうするか。取材と実走経験をもとに、本番の走り方を考えるための攻略編です。",
    chapters: [
      { title: "区間ごとのポイント", description: "気をつけたい場所と、その理由。地図と一緒に、コースの特徴をつかむ。" },
      { title: "ペース計画への落とし込み", description: "目標タイムと区間の特徴を照らし合わせ、自分の走り方を考える。" },
      { title: "当日、見返すメモ", description: "覚えておきたいことを絞って、スタート前に読み返せる形に。" },
    ],
  },
}];

export function isPublishedStory(story: RaceStory) {
  return story.status === "published" && !story.isSample && Boolean(story.publishedAt);
}

export function getPublishedStories(raceSlug?: string) {
  return raceStories.filter((story) => isPublishedStory(story) && (!raceSlug || story.raceSlug === raceSlug));
}

export function getPublishedStory(slug: string) {
  return getPublishedStories().find((story) => story.slug === slug);
}
