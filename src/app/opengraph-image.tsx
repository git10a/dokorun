import { ImageResponse } from "next/og";

export const alt = "ドコラン";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FFD900", color: "#1A1A1A", fontWeight: 800 }}><div style={{ fontSize: 76 }}>今日、どこ走る？</div><div style={{ marginTop: 28, fontSize: 34 }}>ドコラン</div></div>, size);
}
