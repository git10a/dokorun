// 記事エディタ(管理画面の本文欄)の編集操作。入力欄に依存しない形で書き、テストできるようにしている。
// 各関数は「どの範囲を何に置き換え、その後どこを選択するか」を返す

export type TextEdit = { from: number; to: number; text: string; select: [number, number] };

function lineRange(body: string, position: number) {
  const start = body.lastIndexOf("\n", position - 1) + 1;
  const end = body.indexOf("\n", position);
  return { start, end: end < 0 ? body.length : end };
}

/** カーソルのある行の次に、独立した1行として差し込む(空行にいるときはその行に入れる) */
export function insertLineEdit(body: string, position: number, line: string): TextEdit {
  const { start, end } = lineRange(body, position);
  const blank = body.slice(start, end).trim() === "";
  const from = blank ? start : end;
  const text = `${blank ? "" : "\n"}${line}${body.startsWith("\n", end) ? "" : "\n"}`;
  const caret = from + (blank ? 0 : 1) + line.length;
  return { from, to: end, text, select: [caret, caret] };
}

/** カーソルのある行の先頭に記号を付ける。同じ記号が付いていれば外す */
export function toggleLinePrefixEdit(body: string, position: number, prefix: string): TextEdit {
  const { start, end } = lineRange(body, position);
  const line = body.slice(start, end);
  const stripped = line.replace(/^(#{2,3}|>|-)\s+/, "");
  const next = line.startsWith(prefix) ? stripped : `${prefix}${stripped}`;
  return { from: start, to: end, text: next, select: [start + next.length, start + next.length] };
}

/**
 * 選択範囲を太字(**…**)にする。すでに太字なら外す。
 * 太字は行をまたげないので、複数行を選んだときは行ごとに付ける。前後の空白は太字の外に出す
 */
export function toggleBoldEdit(body: string, start: number, end: number): TextEdit {
  const selected = body.slice(start, end);
  if (!selected) {
    // 選択なし: 記号だけ入れて、間にカーソルを置く
    return { from: start, to: end, text: "****", select: [start + 2, start + 2] };
  }
  const wrapped = /^\*\*([^\n]+?)\*\*$/.exec(selected);
  if (wrapped) return { from: start, to: end, text: wrapped[1], select: [start, start + wrapped[1].length] };
  if (!selected.includes("\n") && body.slice(start - 2, start) === "**" && body.slice(end, end + 2) === "**") {
    return { from: start - 2, to: end + 2, text: selected, select: [start - 2, start - 2 + selected.length] };
  }
  const lines = selected.split("\n").map((line) => {
    const core = line.trim();
    if (!core) return line;
    const lead = line.slice(0, line.indexOf(core));
    return `${lead}**${core}**${line.slice(lead.length + core.length)}`;
  });
  const text = lines.join("\n");
  if (lines.length === 1) {
    // 1行のときは中身だけを選択し直す(続けて同じ操作をすると外れる)
    const lead = selected.length - selected.trimStart().length;
    const inner = selected.trim().length;
    return { from: start, to: end, text, select: [start + lead + 2, start + lead + 2 + inner] };
  }
  return { from: start, to: end, text, select: [start, start + text.length] };
}

/**
 * 貼り付けの中身が「画像」かどうかを決める。画像なら、その画像ファイルを返す。
 * WordやExcelは文字をコピーしても画像(見た目の写し)を一緒に入れてくるので、その場合は文字の貼り付けとして扱う
 */
export function pastedImageFiles(clipboard: { types: readonly string[]; text: string; files: File[] }): File[] {
  const images = clipboard.files.filter((file) => file.type.startsWith("image/"));
  if (!images.length || clipboard.types.includes("text/rtf")) return [];
  // 画像だけのコピーでも、ファイル名やURLが文字として付くことがある。文章(空白や改行を含む)なら文字を優先する
  return /\s/.test(clipboard.text.trim()) ? [] : images;
}
