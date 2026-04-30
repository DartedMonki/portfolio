import { useCallback, useEffect, useRef, useState } from 'react';

import { AVATAR_URL, GITHUB_URL, LINKEDIN_URL } from '../data/constants';
import { locales } from '../data/locales';
import type { Locale } from '../data/locales';
import AboutDialog from './AboutDialog';
import FabMenu from './FabMenu';
import PortfolioSection from './PortfolioSection';
import ScrollToTop from './ScrollToTop';
import TerrainBackground from './TerrainBackground';
import Toast from './Toast';
import type { ToastState } from './Toast';

interface HomeExperienceProps {
  locale: Locale;
}

const commandUrlMap = {
  github: GITHUB_URL,
  linkedin: LINKEDIN_URL,
} as const;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const getYearsOfExperience = () => {
  const startWorkDate = new Date('2020-11-09T00:00:00');
  const diffMs = Date.now() - startWorkDate.getTime();
  const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);

  return years.toFixed(1);
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return ['input', 'textarea', 'select'].includes(tagName) || target.isContentEditable;
};

const getLocalIpFallback = () => (LOCAL_HOSTS.has(globalThis.location.hostname) ? 'localhost' : 'unknown');

const getVisitorIpAddress = async () => {
  try {
    const response = await fetch('/api/ip');

    if (response.ok) {
      const data = (await response.json()) as { ipAddress?: string };
      const ipAddress = data.ipAddress;

      if (ipAddress === 'unknown') return getLocalIpFallback();
      if (ipAddress) return ipAddress;
    }

    return getLocalIpFallback();
  } catch {
    return getLocalIpFallback();
  }
};

const HomeExperience = ({ locale }: HomeExperienceProps) => {
  const copy = locales[locale];
  const [isTerrainLoaded, setIsTerrainLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openAboutDialog, setOpenAboutDialog] = useState(false);
  const [typedWord, setTypedWord] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const typedWordRef = useRef('');
  const typedTextRef = useRef<HTMLDivElement>(null);
  const portfolioSectionRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string, variant: ToastState['variant'] = 'success') => {
    setToast({ id: Date.now(), message, variant });
  }, []);

  const closeAboutDialog = useCallback(() => {
    setOpenAboutDialog(false);
  }, []);

  const resetTypedWord = useCallback(() => {
    typedWordRef.current = '';
    setTypedWord('');
  }, []);

  useEffect(() => {
    if (isTerrainLoaded) {
      setLoadingProgress(100);
      return undefined;
    }

    const progressInterval = globalThis.setInterval(() => {
      setLoadingProgress((previousValue) => {
        const remaining = 90 - previousValue;
        const increment = Math.max(0.5, remaining * 0.1);
        return Math.min(previousValue + increment, 90);
      });
    }, 100);

    return () => globalThis.clearInterval(progressInterval);
  }, [isTerrainLoaded]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const element = typedTextRef.current;
      if (!element) return;

      element.style.left = `${event.clientX + 15}px`;
      element.style.top = `${event.clientY + 15}px`;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === ' ') {
        event.preventDefault();
        typedWordRef.current += ' ';
        setTypedWord(typedWordRef.current);
        return;
      }

      if (/^[a-z]$/i.test(event.key)) {
        typedWordRef.current += event.key.toLowerCase();
        setTypedWord(typedWordRef.current);
        return;
      }

      if (event.key === 'Backspace') {
        typedWordRef.current = typedWordRef.current.slice(0, -1);
        setTypedWord(typedWordRef.current);
        return;
      }

      if (event.key !== 'Enter' || typedWordRef.current.length === 0) return;

      const typedCommand = typedWordRef.current;
      const url = commandUrlMap[typedCommand as keyof typeof commandUrlMap];
      resetTypedWord();

      if (url) {
        globalThis.open(url, '_blank', 'noopener,noreferrer')?.focus();
        return;
      }

      getVisitorIpAddress().then((ipAddress) => {
        showToast(copy.alert.mouseMessage.replace('{ipAddress}', ipAddress), 'success');
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [copy.alert.mouseMessage, resetTypedWord, showToast]);

  const yearsOfExperience = getYearsOfExperience();
  const contentParagraphs = copy.about.content.replace('{years}', yearsOfExperience).split('\n\n');

  const skipToContent = () => {
    portfolioSectionRef.current?.focus();
    portfolioSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {isTerrainLoaded ? null : (
        <progress
          className="fixed top-0 left-0 z-[9999] h-1 w-full appearance-none bg-transparent [&::-moz-progress-bar]:bg-[#304FFE] [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-[#304FFE]"
          aria-label="Loading terrain"
          value={loadingProgress}
          max={100}
        />
      )}

      <a
        href="#portfolio-section"
        className="absolute -top-14 left-0 z-[1000] bg-[#304FFE] px-4 py-2 text-white no-underline focus:top-0"
        onClick={(event) => {
          event.preventDefault();
          skipToContent();
        }}
      >
        Skip to main content
      </a>

      <AboutDialog
        open={openAboutDialog}
        title={copy.about.title}
        contentParagraphs={contentParagraphs}
        onClose={closeAboutDialog}
      />

      <main>
        <ScrollToTop />
        <div
          ref={typedTextRef}
          className={`fixed z-[99] whitespace-nowrap text-red-600 ${typedWord.length > 0 ? 'block' : 'hidden'}`}
          role="status"
          aria-live="polite"
        >
          {typedWord.length > 0 ? `${copy.home.you}${typedWord}` : ''}
        </div>

        <section className="relative z-0 flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black">
          <div className="pointer-events-none absolute top-4 right-4 z-20 flex items-center rounded bg-black/50 px-2 py-1 text-sm font-medium text-white">
            Built with Three.js
          </div>

          <button
            className="absolute top-4 left-4 z-20 rounded-full bg-black/50 p-3 text-white transition hover:bg-black/70"
            type="button"
            aria-label="Open terrain settings"
            aria-expanded={settingsOpen}
            aria-controls="terrain-settings-panel"
            id="terrain-settings-button"
            onClick={() => setSettingsOpen(true)}
          >
            <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm8.94 3.06-1.83-.31a7.78 7.78 0 0 0-.74-1.79l1.08-1.51-2.9-2.9-1.51 1.08c-.56-.31-1.16-.56-1.79-.74L12.94 3h-4l-.31 1.89c-.63.18-1.23.43-1.79.74L5.33 4.55l-2.9 2.9 1.08 1.51c-.31.56-.56 1.16-.74 1.79l-1.83.31v4l1.83.31c.18.63.43 1.23.74 1.79l-1.08 1.51 2.9 2.9 1.51-1.08c.56.31 1.16.56 1.79.74l.31 1.83h4l.31-1.83c.63-.18 1.23-.43 1.79-.74l1.51 1.08 2.9-2.9-1.08-1.51c.31-.56.56-1.16.74-1.79l1.83-.31v-4Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </button>

          <TerrainBackground
            onLoad={() => setIsTerrainLoaded(true)}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
            onToast={showToast}
            aria-label="Interactive 3D terrain background"
            aria-hidden={!isTerrainLoaded}
          />

          <p className="sr-only">
            This page features an interactive 3D wireframe terrain background created with Three.js. The content below is the
            main portfolio information.
          </p>

          <button
            className="group relative z-10 overflow-hidden rounded-full p-0"
            type="button"
            aria-label="Open about me dialog"
            aria-haspopup="dialog"
            aria-expanded={openAboutDialog}
            onClick={() => setOpenAboutDialog(true)}
          >
            <span className="invisible absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-xl text-white transition group-hover:visible">
              {copy.about.avatar}
            </span>
            <img
              src={AVATAR_URL}
              width="200"
              height="200"
              alt="Afriyadi Y. R."
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </button>
          <h1 className="relative z-10 mt-4 mb-2 text-[2rem] font-medium tracking-[0.5px] text-white sm:text-4xl">
            afriyadi y. r.
          </h1>
        </section>

        <FabMenu locale={locale} />
        <div id="portfolio-section" ref={portfolioSectionRef} tabIndex={-1}>
          <PortfolioSection />
        </div>
      </main>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default HomeExperience;
