# どこラン Design System

## Product

「次はどこでランする？」に答える日本全国のランニングスポット検索。スポットと構造化された代表コース情報が主役。写真がない状態でも、比較と場所選びが速くできることを優先する。

## Foundation

- Font: Noto Sans JP only.
- Brand: `#FFD900`; brand dark: `#E8C500`.
- Ink: `#1A1A1A`; secondary text: `#6B7280`.
- Paper: `#FFFFFF`; cream: `#F7F5EF`; line: `#E5E2D9`.
- Accent links: `#1A7DC4`; danger: `#D64545`.
- Do not introduce colors outside this palette. Tints and alpha variants of these tokens are allowed.
- Mobile-first; standard desktop breakpoint at 768px.

## Components and patterns

- Cards: 1px line border, 12px radius, white background, restrained hover lift and shadow.
- Buttons: 8px radius, bold label; primary uses brand with ink text.
- Chips: full radius, cream or brand background.
- Section headings: bold Japanese type, often a 4px brand left border.
- Imagery: 16:9. Missing-photo visuals must be deterministic CSS/SVG, readable as course information, and must not resemble stock photography.
- Motion: subtle 150–300ms transforms only and respect reduced motion.
- Accessibility: useful text contrast, visible semantics, SVG decorative parts hidden when appropriate.
