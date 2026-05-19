import { useId, useState } from 'react';
import type * as React from 'react';

import { GITHUB_URL, LINKEDIN_URL } from '../data/constants';
import { locales } from '../data/locales';
import type { Locale } from '../data/locales';

interface FooterProps {
  locale: Locale;
  onSubmitMessage: (message: string) => Promise<void> | void;
}

const cornerBaseClass = 'pointer-events-none absolute h-3 w-3 border-white/70';

const Footer = ({ locale, onSubmitMessage }: FooterProps) => {
  const copy = locales[locale].footer;
  const [message, setMessage] = useState('');
  const inputId = useId();
  const year = new Date().getFullYear();

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length === 0) return;

    setMessage('');
    void onSubmitMessage(trimmed);
  };

  return (
    <footer className="relative z-10 w-full bg-black text-white">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-6 pt-20 pb-10 lg:grid-cols-[1.4fr_1fr] lg:gap-20 lg:px-10 lg:pt-28">
        <div className="flex flex-col justify-between gap-12">
          <div className="flex items-end gap-5 sm:gap-8">
            <span className="text-[clamp(4.5rem,12vw,9rem)] leading-[0.85] font-medium tracking-tight lowercase">
              ayr
            </span>
            <span className="flex flex-col pb-3 text-[0.65rem] tracking-[0.18em] text-white/80 uppercase sm:text-xs">
              {copy.brandSubtitle.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-white/60 sm:text-base">
            {copy.description}
          </p>
        </div>

        <div className="flex flex-col gap-10">
          <form
            className="relative w-full max-w-md"
            aria-label={copy.messageLabel}
            onSubmit={handleSubmit}
          >
            <span
              aria-hidden="true"
              className={`${cornerBaseClass} top-0 left-0 border-t border-l`}
            />
            <span
              aria-hidden="true"
              className={`${cornerBaseClass} top-0 right-0 border-t border-r`}
            />
            <span
              aria-hidden="true"
              className={`${cornerBaseClass} bottom-0 left-0 border-b border-l`}
            />
            <span
              aria-hidden="true"
              className={`${cornerBaseClass} right-0 bottom-0 border-r border-b`}
            />
            <div className="flex items-end gap-3 px-6 py-5">
              <div className="flex flex-1 flex-col gap-2">
                <label
                  htmlFor={inputId}
                  className="text-[0.65rem] tracking-[0.18em] text-white/80 uppercase sm:text-xs"
                >
                  {copy.messageLabel}
                </label>
                <input
                  id={inputId}
                  type="text"
                  name="message"
                  value={message}
                  placeholder={copy.messagePlaceholder}
                  className="w-full appearance-none border-0 bg-transparent text-sm tracking-[0.12em] text-white uppercase outline-none placeholder:text-white/40 sm:text-base"
                  autoComplete="off"
                  enterKeyHint="send"
                  maxLength={500}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
              <button
                type="submit"
                aria-label={copy.messageSubmit}
                className="shrink-0 self-center text-white/70 transition hover:text-white disabled:opacity-40"
                disabled={message.trim().length === 0}
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </div>
          </form>

          <div>
            <h2 className="mb-3 text-[0.65rem] tracking-[0.18em] text-white/80 uppercase sm:text-xs">
              {copy.socialLabel}
            </h2>
            <ul className="space-y-1.5 text-sm sm:text-base">
              <li>
                <a
                  className="text-white/80 transition hover:text-white"
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="me noreferrer noopener"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  className="text-white/80 transition hover:text-white"
                  href={GITHUB_URL}
                  target="_blank"
                  rel="me noreferrer noopener"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 px-6 pb-10 text-[0.65rem] tracking-[0.18em] text-white/60 uppercase sm:flex-row sm:items-center sm:text-xs lg:px-10">
        <span>© {year} afriyadi y. r.</span>
        <span>{copy.builtWith}</span>
      </div>
    </footer>
  );
};

export default Footer;
