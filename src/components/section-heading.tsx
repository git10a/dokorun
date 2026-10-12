// ページ内の節見出し(左に黄色の線)。余白は置き場所ごとに className で足す
export function SectionHeading({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <h2 id={id} className={`border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl ${className}`.trim()}>{children}</h2>;
}
