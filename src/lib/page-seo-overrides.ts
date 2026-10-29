export type PageSeoOverride = Readonly<{ title: string; description: string }>;

// Exact paths keep editorial search copy local to the selected pages.
export const pageSeoOverrides: Readonly<Partial<Record<string, PageSeoOverride>>> = {
  "/races/mito-komon-marathon": {
    title: "水戸黄門漫遊マラソンのコースマップ・高低図｜最後の坂と関門",
    description:
      "水戸黄門漫遊マラソンのコースを地図と高低図で確認。千波湖・梅香トンネル・最後の坂の予習とペース表作成に。2026年大会（10月25日開催済み）のアクセス、駐車場、関門、エイド、荷物預けを公式出典付きで紹介。",
  },
  "/races/suwako-marathon": {
    title: "諏訪湖マラソンのコースマップ・高低図｜ハーフの関門とアクセス",
    description:
      "諏訪湖マラソンのハーフコースを地図と高低図で確認し、目標タイムに合わせたペース表を作成。2026年大会（10月25日開催済み）の会場、駐車場、関門、給水、荷物預けを公式案内へのリンク付きでまとめました。",
  },
  "/spots/nagai-park": {
    title: "長居公園ランニングコース｜一周2.8kmの地図・アクセス",
    description:
      "長居公園は一周何キロ？公式の長距離走路は2.8km。コースの地図、走り始める場所、駅からのアクセスを確認できます。周回距離の目安と、着替え・シャワーに使うランニングステーションの公式案内も紹介。",
  },
  "/spots/nijo-castle-loop": {
    title: "二条城ランニングコース｜外周一周約2km・地図とアクセス",
    description:
      "二条城の外周は公式案内で約2km。城外を走るルートを地図で確認し、駅からのアクセスもチェックできます。掲載ルートと外周一周の距離の違い、城内観覧とランニングを分けて計画する際の注意点を紹介。",
  },
  "/spots/hikarigaoka-park": {
    title: "光が丘公園ランニングコース｜約3kmの地図・駅からのアクセス",
    description:
      "光が丘公園を走る約3kmの掲載ルートを地図で確認。光が丘駅から徒歩8分、成増・地下鉄成増駅から徒歩15分という公式のアクセス案内と、園内で走り始める場所を紹介します。常時開園・入園無料（一部有料施設あり）。",
  },
};

export function getPageSeoOverride(path: string): PageSeoOverride | undefined {
  return Object.hasOwn(pageSeoOverrides, path) ? pageSeoOverrides[path] : undefined;
}
