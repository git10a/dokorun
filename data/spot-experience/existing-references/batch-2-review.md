# 第2組：5コース・10枚

2026-10-14、ユーザーが承認した制作方法で次の5コースを追加。既存分と合わせて8コース16枚。

| コース | 画像ID |
| --- | --- |
| 神宮外苑 | gaien-east / gaien-south |
| 豊洲ぐるり公園 | toyosu-bridge / toyosu-canal |
| 水元公園 | mizumoto-meadow / mizumoto-grove |
| 長居公園 | nagai-east / nagai-north |
| 大濠公園 | oohori-willows / oohori-south |

## 制作・参照

- 掲載ガイドのルート座標からGoogleマップを開き、実際のストリートビューの画像・地点・撮影時期を確認した。
- 内蔵 `image_gen` を使用。参照写真を添付入力にするのではなく、目視した内容をプロンプトへ記述して生成した。
- 参照地点・パノラマID・撮影日・観察内容・全プロンプトは `batch-2-sources-and-prompts.json`。
- 生成後、10枚を目視して路面・植栽・水面の位置を照合。建物の意匠、幅や距離、現在の状態の再現を保証する画像ではない。
- Googleマップがルートから離れた車道を返した長居公園section-2、大濠公園section-3は不採用。ルート沿いの別地点を使った。
- 元PNGはこのフォルダーに保存し、幅1280px・WebP quality84へ変換した配信用ファイルを `public/course-atmosphere/` に保存。意味内容の画像加工は行っていない。

## 実装・確認

- `src/lib/course-atmosphere.ts` へ追加し、既存のAI参考画像コンポーネントで表示。各画像のそばのAI表記と参考地点リンクを維持。
- 5ページのデスクトップ表示を目視確認し、10枚とも画像の読み込み成功（naturalWidth 1280）を確認。
- 豊洲・大濠の390px幅スマホ表示を目視確認。文書幅も390pxで横はみ出しなし。
- 5ページのデスクトップ表示、豊洲・大濠のスマホ表示を `*-page-desktop.jpg` / `*-page-mobile.jpg` に保存。
- 関連テスト28件、TypeScript、対象ESLint、diffの空白チェックが成功。
- ローカルプレビュー：`http://localhost:3027/spots/{slug}#highlights`。本番公開は未実施。
