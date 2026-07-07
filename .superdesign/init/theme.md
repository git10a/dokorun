# Theme

Tailwind CSS v4 with custom components; no external component library.

## `src/app/globals.css`

```css
@import "tailwindcss";
@import "maplibre-gl/dist/maplibre-gl.css";
@theme inline {
  --color-brand: #ffd900;
  --color-brand-dark: #e8c500;
  --color-ink: #1a1a1a;
  --color-sub: #6b7280;
  --color-paper: #ffffff;
  --color-cream: #f7f5ef;
  --color-line: #e5e2d9;
  --color-accent: #1a7dc4;
  --color-danger: #d64545;
  --font-sans: var(--font-noto-sans-jp), sans-serif;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--color-paper); color: var(--color-ink); font-family: var(--font-noto-sans-jp), sans-serif; }
button, input, select, textarea { font: inherit; }
a { color: inherit; text-decoration: none; }
.maplibregl-popup-content { border-radius: 12px; padding: 12px 14px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; } }
```

Noto Sans JP, mobile-first, desktop breakpoint 768px. Cards use line borders, 12px radius and restrained shadows. Buttons use 8px radius and bold labels.
