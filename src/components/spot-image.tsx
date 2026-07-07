/* eslint-disable @next/next/no-img-element */

const candidateWidths = [320, 640, 960, 1280];

export function imageTransformUrl(src: string, width: number) {
  if (process.env.NEXT_PUBLIC_IMAGE_TRANSFORM === "off") return src;
  const source = src.startsWith("http://") || src.startsWith("https://") ? src : `https://dokorun.com${src.startsWith("/") ? "" : "/"}${src}`;
  return `https://dokorun.com/cdn-cgi/image/format=auto,quality=78,width=${width}/${source}`;
}

export function SpotImage({ src, alt, width, height, sizes, priority = false, className }: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const widths = candidateWidths.filter((candidate) => candidate <= width);
  const effectiveWidths = widths.length ? widths : [width];
  const largestWidth = effectiveWidths.at(-1)!;
  return (
    <img
      src={imageTransformUrl(src, largestWidth)}
      srcSet={effectiveWidths.map((candidate) => `${imageTransformUrl(src, candidate)} ${candidate}w`).join(", ")}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={priority ? undefined : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      className={className}
    />
  );
}
