import type { ProjectImage } from '../data/projects';

function responsiveSources(base: string, format: 'avif' | 'webp') {
  return `${base}-sm.${format} 256w, ${base}-md.${format} 480w, ${base}-lg.${format} 640w`;
}

export default function OptimizedImage({ src, alt, sizes }: ProjectImage & { sizes: string }) {
  const imageName = /^\/images\/(.+)\.(?:png|jpe?g|gif|webp)$/i.exec(src)?.[1];
  const base = imageName && `/images/optimized/${imageName}`;

  return (
    <picture className="block h-full w-full">
      {base && <source type="image/avif" srcSet={responsiveSources(base, 'avif')} sizes={sizes} />}
      {base && <source type="image/webp" srcSet={responsiveSources(base, 'webp')} sizes={sizes} />}
      <img
        className="block h-full w-full object-contain"
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
