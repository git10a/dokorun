// 投稿テキストの簡易NGワード判定(ランログのひとこと・スポット情報の修正で共通)
const blockedWords = ["死ね", "殺す", "消えろ", "ばか"];

export function containsBlockedWord(...texts: string[]) {
  return texts.some((text) => blockedWords.some((word) => text.includes(word)));
}
