// ブラウザ専用: 匿名の「走りたい」を端末ごとに束ねる clientId と、その登録API呼び出し
export const CLIENT_ID_KEY = "dokorun:client-id";

export function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

// 成功時は最新の件数を返す。通信失敗・エラー応答は例外にする
export async function setHashiritai(slug: string, on: boolean): Promise<number> {
  const response = await fetch("/api/hashiritai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, clientId: getClientId(), on }),
  });
  if (!response.ok) throw new Error("request failed");
  return ((await response.json()) as { count: number }).count;
}
