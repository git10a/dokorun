// スポットスタンプ画像をマスクPNG(黒+アルファ)に変換して public/stamps/ に置く
//
// 使い方: node scripts/make-stamp-mask.mjs <生成画像.png> <slug> [size=640]
//   → public/stamps/<slug>.png を出力
//
// 入力は「朱色単色インク+白背景」のスタンプ画像(AI生成)。インク濃度をアルファに
// 変換するので、表示側は CSS mask-image + background-color で任意のインク色を付けられる
// (走った回数によるティア色替えは src/lib/stamps.ts 参照)。
//
// 生成プロンプトのテンプレ(nano_banana_pro等。{名前}と{モチーフ}だけ差し替える):
//   日本の駅スタンプ(スタンプラリー)風の円形ゴム印デザイン。朱色(vermilion red)の
//   単色インクのみ、白背景。内側の円形の枠で風景を囲む構図。中央に{モチーフ}、
//   その手前を走るランナーのシルエットを線画で描く。外周に太い二重の円形枠。
//   枠の上部に沿って「{名前}」と太いゴシック体の日本語で大きく入れる。下部に沿って
//   小さく「DOKORUN」とローマ字。インクがわずかにかすれたスタンプ特有の質感。
//   フラットなベクター風イラスト、写実的にしない、余計な文字を入れない。
//   Japanese eki-stamp rubber stamp style, single vermilion ink color on white
//   background, flat line art, circular border, text {名前} at top and DOKORUN at
//   bottom, slightly distressed ink texture.
import path from 'node:path';
import sharp from 'sharp';

const [, , input, slug, sizeArg] = process.argv;
if (!input || !slug) {
  console.error('usage: node scripts/make-stamp-mask.mjs <input.png> <slug> [size=640]');
  process.exit(1);
}
const size = Number(sizeArg) || 640;
const output = path.join(import.meta.dirname, '..', 'public', 'stamps', `${slug}.png`);

// 1) 白背景基準で余白トリム → 正方形にパディング → リサイズ。
//    sharpは同一パイプライン内だと呼び出し順でなく内部固定順(resize→extend)で適用され
//    出力サイズが狂うため、extendとresizeは必ず別パイプラインに分ける
const trimmed = await sharp(input).trim({ background: '#ffffff', threshold: 40 }).toBuffer();
const meta = await sharp(trimmed).metadata();
const side = Math.max(meta.width, meta.height);
const padded = await sharp(trimmed)
  .extend({
    top: Math.floor((side - meta.height) / 2),
    bottom: Math.ceil((side - meta.height) / 2),
    left: Math.floor((side - meta.width) / 2),
    right: Math.ceil((side - meta.width) / 2),
    background: '#ffffff',
  })
  .toBuffer();
const squared = await sharp(padded).resize(size, size).toBuffer();
const squaredMeta = await sharp(squared).metadata();
if (squaredMeta.width !== size || squaredMeta.height !== size) {
  throw new Error(`unexpected size ${squaredMeta.width}x${squaredMeta.height} (expected ${size}x${size})`);
}

// 2) インク濃度をアルファに変換(白=透明、インク=不透明)。normaliseで濃部を255に張り付かせる
const alpha = await sharp(squared)
  .greyscale()
  .negate()
  .normalise({ lower: 1, upper: 95 })
  .toColourspace('b-w')
  .raw()
  .toBuffer();

// 3) 真っ黒RGB + アルファを合成したマスクPNGを出力
const black = Buffer.alloc(size * size * 3, 0);
await sharp(black, { raw: { width: size, height: size, channels: 3 } })
  .joinChannel(alpha, { raw: { width: size, height: size, channels: 1 } })
  .png({ compressionLevel: 9 })
  .toFile(output);
console.log(`OK ${output}`);
