import { memo, useEffect, useMemo, useState } from 'react';

import type { ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  alt: string;
  fill?: boolean;
  src: string;
}

const OptimizedImage = ({
  alt,
  fill = false,
  onError,
  sizes,
  src,
  srcSet,
  style,
  width,
  ...props
}: OptimizedImageProps) => {
  const optimizedImage = useMemo(() => {
    if (src.startsWith('http')) return { src, srcSet: undefined };

    const pathMatch = /^\/images\/(.+)\.(png|jpe?g|gif|webp)$/i.exec(src);
    if (!pathMatch) return { src, srcSet: undefined };

    const [, imageName] = pathMatch;
    const numericWidth = Number(width ?? 0);
    const optimizedSources = {
      sm: `/images/optimized/${imageName}-sm.avif`,
      md: `/images/optimized/${imageName}-md.avif`,
      lg: `/images/optimized/${imageName}-lg.avif`,
    };
    let size = 'lg';

    if (numericWidth <= 256) {
      size = 'sm';
    } else if (numericWidth <= 480) {
      size = 'md';
    }

    return {
      src: optimizedSources[size as keyof typeof optimizedSources],
      srcSet: `${optimizedSources.sm} 256w, ${optimizedSources.md} 480w, ${optimizedSources.lg} 640w`,
    };
  }, [src, width]);
  const [currentSrc, setCurrentSrc] = useState(optimizedImage.src);

  useEffect(() => {
    setCurrentSrc(optimizedImage.src);
  }, [optimizedImage.src]);

  const handleError: NonNullable<ImgHTMLAttributes<HTMLImageElement>['onError']> = (event) => {
    if (currentSrc !== src) setCurrentSrc(src);
    onError?.(event);
  };

  const isUsingOptimizedSource = currentSrc === optimizedImage.src;

  return (
    <img
      {...props}
      alt={alt}
      src={currentSrc}
      srcSet={isUsingOptimizedSource ? (srcSet ?? optimizedImage.srcSet) : undefined}
      sizes={isUsingOptimizedSource ? sizes : undefined}
      onError={handleError}
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
