import Link from "next/link";

// 画面上のパンくず。最後の項目は現在地なのでリンクにしない
export function Breadcrumb({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="パンくず" className="mb-4 text-sm text-sub">
      {items.map((item, index) => (
        <span key={`${index}-${item.name}`}>
          {index > 0 && " / "}
          {item.href && index < items.length - 1 ? <Link href={item.href} className="hover:underline">{item.name}</Link> : item.name}
        </span>
      ))}
    </nav>
  );
}
