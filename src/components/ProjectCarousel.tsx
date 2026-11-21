import 'swiper/css';
import 'swiper/css/effect-cards';

import { useEffect, useState } from 'react';
import { A11y, EffectCards, Keyboard } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import type { Project } from '../data/projects';
import OptimizedImage from './OptimizedImage';

interface ProjectCarouselProps {
  title: string;
  images: Project['images'];
  coverSize: Project['coverSize'];
  desktopWidth: number;
}

export default function ProjectCarousel({
  title,
  images,
  coverSize,
  desktopWidth,
}: ProjectCarouselProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const sizes = `(max-width: 767px) 256px, ${desktopWidth}px`;
  const [width, height] = images[activeIndex]?.size ?? coverSize;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative" style={{ aspectRatio: `${width} / ${height}` }}>
      <div className="absolute inset-0">
        {isMounted ? (
          <Swiper
            effect="cards"
            grabCursor
            modules={[A11y, EffectCards, Keyboard]}
            keyboard={{ enabled: true, onlyInViewport: true, pageUpDown: false }}
            role="group"
            aria-label={title}
            tabIndex={0}
            className="swiper h-full w-full focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-blue-600"
            watchSlidesProgress
            speed={600}
            resistance
            resistanceRatio={0.85}
            onSlideChange={(slider) => setActiveIndex(slider.activeIndex)}
          >
            {images.map((image, index) => (
              <SwiperSlide key={image.src}>
                <figure
                  className="h-full w-full overflow-hidden bg-white"
                  aria-label={`Slide ${index + 1} of ${images.length}`}
                >
                  <OptimizedImage {...image} sizes={sizes} />
                </figure>
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <figure className="project-cover h-full w-full overflow-hidden bg-white">
            <OptimizedImage {...images[0]} sizes={sizes} />
          </figure>
        )}
      </div>
    </div>
  );
}
