import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';

import { AVATAR_URL, GITHUB_URL, LINKEDIN_URL } from '../data/constants';
import { locales } from '../data/locales';
import type { Locale } from '../data/locales';
import { CONTACT_TURNSTILE_ACTION } from '../lib/contactSecurity';
import FabMenu from './FabMenu';
import Footer from './Footer';
import InfoDialog from './InfoDialog';
import PortfolioSection from './PortfolioSection';
import ScrollToTop from './ScrollToTop';
import Toast from './Toast';
import type { ToastState } from './Toast';

const TerrainBackground = lazy(() => import('./TerrainBackground'));
const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';
const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_TIMEOUT_MS = 20_000;

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  appearance: 'interaction-only';
  execution: 'execute';
  theme: 'auto';
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
  'timeout-callback': () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileLoadPromise: Promise<TurnstileApi> | undefined;

const getTurnstileSiteKey = () => {
  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined;
  return siteKey?.trim() || undefined;
};

const loadTurnstile = () => {
  if (globalThis.window === undefined) {
    return Promise.reject(new Error('Turnstile is only available in the browser'));
  }

  if (globalThis.window.turnstile) return Promise.resolve(globalThis.window.turnstile);
  if (turnstileLoadPromise) return turnstileLoadPromise;

  turnstileLoadPromise = new Promise((resolve, reject) => {
    const handleLoad = () => {
      if (globalThis.window.turnstile) {
        resolve(globalThis.window.turnstile);
        return;
      }

      reject(new Error('Turnstile failed to initialize'));
    };

    const handleError = () => reject(new Error('Turnstile failed to load'));
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.append(script);
  });

  return turnstileLoadPromise;
};

interface HomeExperienceProps {
  locale: Locale;
}

const commandUrlMap = {
  github: GITHUB_URL,
  linkedin: LINKEDIN_URL,
} as const;

const getYearsOfExperience = () => {
  const startWorkDate = new Date('2020-11-09T00:00:00');
  const diffMs = Date.now() - startWorkDate.getTime();
  const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);

  return years.toFixed(1);
};

const isTextEntryTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tagName) || target.isContentEditable) return true;

  return Boolean(target.closest('[contenteditable="true"]'));
};

const TerrainFallback = ({ label }: { label: string }) => (
  <section
    className="pointer-events-none fixed inset-0 z-0 h-dvh w-dvw bg-black"
    aria-label={label}
    aria-hidden="true"
  />
);

const HomeExperience = ({ locale }: HomeExperienceProps) => {
  const copy = locales[locale];
  const [isTerrainLoaded, setIsTerrainLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openAboutDialog, setOpenAboutDialog] = useState(false);
  const [openHintDialog, setOpenHintDialog] = useState(false);
  const [typedWord, setTypedWord] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const typedWordRef = useRef('');
  const typedTextRef = useRef<HTMLDivElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const portfolioSectionRef = useRef<HTMLDivElement>(null);
  const isSubmittingMessageRef = useRef(false);

  const showToast = useCallback((message: string, variant: ToastState['variant'] = 'success') => {
    setToast({ id: Date.now(), message, variant });
  }, []);

  const closeAboutDialog = useCallback(() => {
    setOpenAboutDialog(false);
  }, []);

  const closeHintDialog = useCallback(() => {
    setOpenHintDialog(false);
  }, []);

  const resetTypedWord = useCallback(() => {
    typedWordRef.current = '';
    setTypedWord('');
  }, []);

  const showAboutDialog = useCallback(() => {
    resetTypedWord();
    setOpenAboutDialog(true);
  }, [resetTypedWord]);

  const showHintDialog = useCallback(() => {
    resetTypedWord();
    setOpenHintDialog(true);
  }, [resetTypedWord]);

  const getMessageVerificationToken = useCallback(async () => {
    const siteKey = getTurnstileSiteKey();
    if (!siteKey) return undefined;

    const container = turnstileContainerRef.current;
    if (!container) throw new Error('Turnstile container is not ready');

    const turnstile = await loadTurnstile();
    if (turnstileWidgetIdRef.current) {
      turnstile.remove(turnstileWidgetIdRef.current);
      turnstileWidgetIdRef.current = null;
    }

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const settle = (token?: string, error?: Error) => {
        if (settled) return;

        settled = true;
        globalThis.clearTimeout(timeoutId);
        if (error) {
          reject(error);
          return;
        }

        resolve(token || '');
      };

      const timeoutId = globalThis.setTimeout(() => {
        settle(undefined, new Error('Turnstile verification timed out'));
      }, TURNSTILE_TIMEOUT_MS);

      const widgetId = turnstile.render(container, {
        sitekey: siteKey,
        action: CONTACT_TURNSTILE_ACTION,
        appearance: 'interaction-only',
        execution: 'execute',
        theme: 'auto',
        callback: (token) => settle(token),
        'error-callback': () => settle(undefined, new Error('Turnstile verification failed')),
        'expired-callback': () => settle(undefined, new Error('Turnstile verification expired')),
        'timeout-callback': () => settle(undefined, new Error('Turnstile verification timed out')),
      });

      turnstileWidgetIdRef.current = widgetId;
      turnstile.execute(widgetId);
    });
  }, []);

  const submitTypedMessage = useCallback(
    async (message: string) => {
      if (isSubmittingMessageRef.current) {
        showToast(copy.alert.messageSending, 'info');
        return;
      }

      isSubmittingMessageRef.current = true;
      showToast(copy.alert.messageSending, 'info');

      try {
        const turnstileToken = await getMessageVerificationToken();
        const response = await fetch('/api/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, turnstileToken }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            showToast(copy.alert.messageRateLimited, 'error');
            return;
          }

          if (response.status === 503) {
            showToast(copy.alert.messageTemporarilyUnavailable, 'error');
            return;
          }

          throw new Error(`Message request failed with ${response.status}`);
        }

        const data = (await response.json()) as { deliveryStatus?: 'delivered' | 'logged' };
        showToast(
          data.deliveryStatus === 'logged' ? copy.alert.messageReceived : copy.alert.messageSent,
          'success',
        );
      } catch {
        showToast(copy.alert.messageFailed, 'error');
      } finally {
        isSubmittingMessageRef.current = false;
      }
    },
    [
      copy.alert.messageFailed,
      copy.alert.messageReceived,
      copy.alert.messageRateLimited,
      copy.alert.messageSending,
      copy.alert.messageSent,
      copy.alert.messageTemporarilyUnavailable,
      getMessageVerificationToken,
      showToast,
    ],
  );

  useEffect(() => {
    return () => {
      if (!turnstileWidgetIdRef.current || !globalThis.window.turnstile) return;

      globalThis.window.turnstile.remove(turnstileWidgetIdRef.current);
      turnstileWidgetIdRef.current = null;
    };
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
      element.style.transform = 'none';
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openAboutDialog || openHintDialog || settingsOpen || isTextEntryTarget(event.target))
        return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key.length === 1) {
        event.preventDefault();
        typedWordRef.current += event.key;
        setTypedWord(typedWordRef.current);
        return;
      }

      if (event.key === 'Backspace') {
        if (typedWordRef.current.length === 0) return;
        event.preventDefault();
        typedWordRef.current = typedWordRef.current.slice(0, -1);
        setTypedWord(typedWordRef.current);
        return;
      }

      if (event.key === 'Escape' && typedWordRef.current.length > 0) {
        resetTypedWord();
        return;
      }

      if (event.key !== 'Enter' || typedWordRef.current.length === 0) return;
      event.preventDefault();

      const typedMessage = typedWordRef.current.trim();
      if (typedMessage.length === 0) {
        resetTypedWord();
        return;
      }

      const typedCommand = typedMessage.toLowerCase();
      const url = commandUrlMap[typedCommand as keyof typeof commandUrlMap];
      resetTypedWord();

      if (url) {
        globalThis.open(url, '_blank', 'noopener,noreferrer')?.focus();
        return;
      }

      void submitTypedMessage(typedMessage);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openAboutDialog, openHintDialog, resetTypedWord, settingsOpen, submitTypedMessage]);

  const yearsOfExperience = getYearsOfExperience();
  const contentParagraphs = copy.about.content
    .replaceAll('{years}', yearsOfExperience)
    .split('\n\n');
  const hintContentParagraphs = copy.hint.content.split('\n\n');

  const skipToContent = () => {
    portfolioSectionRef.current?.focus();
    portfolioSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {isTerrainLoaded ? null : (
        <progress
          className="fixed top-0 left-0 z-9999 h-1 w-full appearance-none bg-transparent [&::-moz-progress-bar]:bg-[#304FFE] [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-[#304FFE]"
          aria-label={copy.terrain.loading}
          value={loadingProgress}
          max={100}
        />
      )}

      <a
        href="#portfolio-section"
        className="absolute -top-14 left-0 z-1000 bg-[#304FFE] px-4 py-2 text-white no-underline focus:top-0"
        onClick={(event) => {
          event.preventDefault();
          skipToContent();
        }}
      >
        {copy.home.skipToContent}
      </a>

      <InfoDialog
        open={openAboutDialog}
        dialogId="about-dialog"
        title={copy.about.title}
        contentParagraphs={contentParagraphs}
        closeLabel={copy.about.closeLabel}
        onClose={closeAboutDialog}
      />

      <InfoDialog
        open={openHintDialog}
        dialogId="hint-dialog"
        title={copy.hint.title}
        contentParagraphs={hintContentParagraphs}
        closeLabel={copy.hint.closeLabel}
        onClose={closeHintDialog}
      />

      <Suspense fallback={<TerrainFallback label={copy.terrain.loadingBackground} />}>
        <TerrainBackground
          onLoad={() => setIsTerrainLoaded(true)}
          settingsOpen={settingsOpen}
          onSettingsOpenChange={setSettingsOpen}
          onToast={showToast}
          copy={copy.terrain}
          aria-label={copy.terrain.backgroundLabel}
          aria-hidden={!isTerrainLoaded}
        />
      </Suspense>

      <main className="relative z-10">
        <ScrollToTop />
        <div
          ref={typedTextRef}
          className={`fixed z-99 whitespace-nowrap text-red-600 ${typedWord.length > 0 ? 'block' : 'hidden'}`}
          role="status"
          aria-live="polite"
        >
          {typedWord.length > 0 ? `${copy.home.you}${typedWord}` : ''}
        </div>

        <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
          <div
            className="pointer-events-none absolute top-4 right-4 z-20 flex items-center rounded bg-black/50 px-2 py-1 text-sm font-medium text-white"
            data-nosnippet
          >
            {copy.terrain.badge}
          </div>

          <button
            className="absolute top-4 left-4 z-20 rounded-full bg-black/50 p-3 text-white transition hover:bg-black/70"
            type="button"
            aria-label={copy.terrain.openSettingsLabel}
            aria-expanded={settingsOpen}
            aria-controls="terrain-settings-panel"
            id="terrain-settings-button"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
          </button>

          <p className="sr-only">{copy.terrain.pageDescription}</p>

          <div className="group relative z-10 flex flex-col items-center">
            <button
              className="relative overflow-hidden rounded-full p-0"
              type="button"
              aria-label={copy.home.aboutLabel}
              aria-haspopup="dialog"
              aria-expanded={openAboutDialog}
              onClick={showAboutDialog}
            >
              <span className="invisible absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-xl text-white transition group-hover:visible group-focus-within:visible">
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
            <h1 className="mt-4 mb-2 text-[2rem] font-medium tracking-[0.5px] text-white sm:text-4xl">
              <button
                className="rounded bg-transparent p-0 text-inherit transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                type="button"
                aria-label={copy.home.aboutLabel}
                aria-haspopup="dialog"
                aria-expanded={openAboutDialog}
                onClick={showAboutDialog}
              >
                {copy.home.displayName}
              </button>
            </h1>
          </div>
        </section>

        <FabMenu
          locale={locale}
          hintLabel={copy.hint.triggerLabel}
          hintOpen={openHintDialog}
          onHintClick={showHintDialog}
        />
        <div id="portfolio-section" ref={portfolioSectionRef} tabIndex={-1}>
          <PortfolioSection locale={locale} />
        </div>
      </main>
      <Footer locale={locale} onSubmitMessage={submitTypedMessage} />
      <div
        ref={turnstileContainerRef}
        className="fixed right-4 bottom-4 z-1000"
        aria-label="Message verification"
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default HomeExperience;
