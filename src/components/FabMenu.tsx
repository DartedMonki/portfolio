import { GITHUB_URL, LINKEDIN_URL } from '../data/constants';
import type { Locale } from '../data/locales';

interface FabMenuProps {
  locale: Locale;
}

const fabClass =
  'fixed bottom-[50px] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black';

const FabMenu = ({ locale }: FabMenuProps) => {
  const nextLocalePath = locale === 'en' ? '/id/' : '/';

  return (
    <>
      <a className={`${fabClass} right-[180px] sm:right-[240px]`} href={nextLocalePath} aria-label="language">
        {locale}
      </a>
      <a
        className={`${fabClass} right-[110px] sm:right-[170px]`}
        href={LINKEDIN_URL}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="linkedIn"
      >
        <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3A2 2 0 0 1 21 5v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 18.34V9.75H5.67v8.59h2.67ZM7 8.58A1.55 1.55 0 1 0 7 5.5a1.55 1.55 0 0 0 0 3.08Zm11.33 9.76v-4.7c0-2.3-1.23-3.36-2.86-3.36a2.47 2.47 0 0 0-2.25 1.23h-.04V9.75h-2.56v8.59h2.67v-4.25c0-1.12.21-2.2 1.6-2.2 1.36 0 1.38 1.28 1.38 2.27v4.18h2.06Z" />
        </svg>
      </a>
      <a
        className={`${fabClass} right-10 sm:right-[100px]`}
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="github"
      >
        <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.6-3.37-1.34-3.37-1.34a2.65 2.65 0 0 0-1.11-1.46c-.91-.62.07-.61.07-.61a2.1 2.1 0 0 1 1.53 1.03 2.13 2.13 0 0 0 2.91.83 2.14 2.14 0 0 1 .63-1.34c-2.22-.25-4.56-1.11-4.56-4.94a3.87 3.87 0 0 1 1.03-2.68 3.6 3.6 0 0 1 .1-2.64s.84-.27 2.75 1.03a9.46 9.46 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.37.85.41 1.82.1 2.64a3.86 3.86 0 0 1 1.03 2.68c0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
        </svg>
      </a>
    </>
  );
};

export default FabMenu;
