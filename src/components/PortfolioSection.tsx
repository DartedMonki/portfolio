import 'swiper/css';
import 'swiper/css/effect-cards';

import { memo, useEffect, useState } from 'react';
import { EffectCards, Virtual } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import { portfolioProjects } from '../data/projects';
import type { Project, ProjectLink as ProjectLinkData } from '../data/projects';
import BlackBorderButtonLink from './BlackBorderButtonLink';
import OptimizedImage from './OptimizedImage';

type ProjectWithDarkMode = Project & { isDark: boolean };

interface AspectRatioStyle {
  width: string;
  height: string;
}

const getImageDimensions = (src: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const img = globalThis.document.createElement('img');
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 640, height: 360 });
    img.src = src;
  });

const calculateAspectRatioStyle = (
  width: number,
  height: number,
  isMobile: boolean
): AspectRatioStyle => {
  const aspectRatio = width / height;
  const isSquarish = Math.abs(aspectRatio - 1) < 0.1;

  if (isMobile) {
    if (isSquarish) return { width: '256px', height: '256px' };
    return { width: '256px', height: `${Math.round(256 / aspectRatio)}px` };
  }

  if (isSquarish) return { width: '480px', height: '480px' };
  if (aspectRatio > 1) return { width: '640px', height: `${Math.round(640 / aspectRatio)}px` };
  return { width: `${Math.round(640 * aspectRatio)}px`, height: '640px' };
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia('(max-width: 767px)');
    const updateValue = () => setIsMobile(mediaQuery.matches);

    updateValue();
    mediaQuery.addEventListener('change', updateValue);
    return () => mediaQuery.removeEventListener('change', updateValue);
  }, []);

  return isMobile;
};

const LinkIcon = ({ type }: { type: ProjectLinkData['type'] }) => {
  if (type === 'github') {
    return (
      <svg aria-hidden="true" className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.6-3.37-1.34-3.37-1.34a2.65 2.65 0 0 0-1.11-1.46c-.91-.62.07-.61.07-.61a2.1 2.1 0 0 1 1.53 1.03 2.13 2.13 0 0 0 2.91.83 2.14 2.14 0 0 1 .63-1.34c-2.22-.25-4.56-1.11-4.56-4.94a3.87 3.87 0 0 1 1.03-2.68 3.6 3.6 0 0 1 .1-2.64s.84-.27 2.75 1.03a9.46 9.46 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.37.85.41 1.82.1 2.64a3.86 3.86 0 0 1 1.03 2.68c0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8M12 3c2.25 2.47 3.38 5.47 3.38 9S14.25 18.53 12 21M12 3C9.75 5.47 8.62 8.47 8.62 12S9.75 18.53 12 21"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
};

const ProjectHeader = memo(
  ({ isDark, technologies, title }: { isDark: boolean; technologies: string[]; title: string }) => (
    <header className="my-6 flex flex-col items-center px-4 text-center">
      <h2 className={`m-0 text-3xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>{title}</h2>
      <p className={`mt-2 mb-0 text-base ${isDark ? 'text-white/70' : 'text-neutral-600'}`}>
        {technologies.join(' • ')}
      </p>
    </header>
  )
);

ProjectHeader.displayName = 'ProjectHeader';

const ProjectAction = memo(
  ({ isDark, link, title }: { isDark: boolean; link?: ProjectLinkData; title: string }) => (
    <div className="my-6 flex justify-center px-4">
      {link ? (
        <BlackBorderButtonLink href={link.href} invert={isDark} aria-label={`Visit ${title} ${link.text}`}>
          <LinkIcon type={link.type} />
          {link.text}
        </BlackBorderButtonLink>
      ) : null}
    </div>
  )
);

ProjectAction.displayName = 'ProjectAction';

const LoadingProjectCard = memo(
  ({ isMobile, project }: { isMobile: boolean; project: ProjectWithDarkMode }) => (
    <section
      className={`flex min-h-screen flex-col items-center justify-center ${
        project.isDark ? 'bg-black' : 'bg-white'
      }`}
    >
      <ProjectHeader title={project.title} technologies={project.technologies} isDark={project.isDark} />
      <div
        className="flex items-center justify-center rounded-[20px] bg-white shadow-[12px_18px_34px_-16px_rgba(66,68,90,1)]"
        style={{ width: isMobile ? '256px' : '640px', height: isMobile ? '144px' : '360px' }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
      <ProjectAction link={project.link} isDark={project.isDark} title={project.title} />
    </section>
  )
);

LoadingProjectCard.displayName = 'LoadingProjectCard';

const ProjectSlides = memo(
  ({ dimensions, isMobile, project }: { dimensions: AspectRatioStyle; isMobile: boolean; project: ProjectWithDarkMode }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return (
      <Swiper
        effect="cards"
        grabCursor={true}
        modules={[EffectCards, Virtual]}
        className="swiper"
        style={{ ...dimensions, marginLeft: 'auto', marginRight: 'auto', willChange: 'transform' }}
        watchSlidesProgress={true}
        speed={600}
        resistance={true}
        resistanceRatio={0.85}
      >
        {project.images.map((image, index) => (
          <SwiperSlide key={image.src}>
            <figure
              className="relative h-full w-full translate-z-0 overflow-hidden bg-white"
              aria-label={`Slide ${index + 1} of ${project.images.length}`}
            >
              <OptimizedImage
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 1024px) 480px, 640px"
                style={{ objectFit: 'contain' }}
                width={isMobile ? 480 : 640}
                loading={index === 0 || image.priority ? 'eager' : 'lazy'}
              />
            </figure>
          </SwiperSlide>
        ))}
      </Swiper>
    );
  }
);

ProjectSlides.displayName = 'ProjectSlides';

const ProjectCard = memo(({ project }: { project: ProjectWithDarkMode }) => {
  const isMobile = useIsMobile();
  const [dimensions, setDimensions] = useState<AspectRatioStyle | null>(null);

  useEffect(() => {
    let mounted = true;

    const calculateDimensions = async () => {
      const firstImage = project.images[0];
      if (!firstImage) return;

      const { width, height } = await getImageDimensions(firstImage.src);
      if (mounted) {
        setDimensions(calculateAspectRatioStyle(width, height, isMobile));
      }
    };

    void calculateDimensions();
    return () => {
      mounted = false;
    };
  }, [isMobile, project.images]);

  if (!dimensions) {
    return <LoadingProjectCard project={project} isMobile={isMobile} />;
  }

  return (
    <section
      className={`flex min-h-screen max-w-[100vw] flex-col justify-center overflow-x-hidden ${
        project.isDark ? 'bg-black' : 'bg-white'
      }`}
      aria-labelledby={`project-${project.title}`}
    >
      <ProjectHeader title={project.title} technologies={project.technologies} isDark={project.isDark} />
      <ProjectSlides project={project} dimensions={dimensions} isMobile={isMobile} />
      <ProjectAction link={project.link} isDark={project.isDark} title={project.title} />
    </section>
  );
});

ProjectCard.displayName = 'ProjectCard';

const PortfolioSection = memo(() => (
  <div>
    {portfolioProjects.map((project) => (
      <ProjectCard key={project.title} project={project} />
    ))}
  </div>
));

PortfolioSection.displayName = 'PortfolioSection';

export default PortfolioSection;
