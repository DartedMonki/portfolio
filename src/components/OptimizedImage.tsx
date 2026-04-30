import { memo, useMemo } from 'react';

import type { ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  alt: string;
  fill?: boolean;
  src: string;
}

const OptimizedImage = ({ alt, fill = false, src, style, width, ...props }: OptimizedImageProps) => {
  const optimizedSrc = useMemo(() => {
    if (src.startsWith('http')) return src;

    const pathMatch = /^\/images\/(.+)\.(png|jpe?g|gif|webp)$/i.exec(src);
    if (!pathMatch) return src;

    const [, imageName] = pathMatch;
    const numericWidth = Number(width ?? 0);
    let size = 'lg';

    if (numericWidth <= 256) {
      size = 'sm';
    } else if (numericWidth <= 480) {
      size = 'md';
    }

    return `/images/optimized/${imageName}-${size}.avif`;
  }, [src, width]);

  return (
    <img
      {...props}
      alt={alt}
      src={optimizedSrc}
      style={{
        ...(fill
          ? {
              height: '100%',
              inset: 0,
              position: 'absolute',
              width: '100%',
            }
          : undefined),
        ...style,
      }}
      width={fill ? undefined : width}
    />
  );
};

export default memo(OptimizedImage);
