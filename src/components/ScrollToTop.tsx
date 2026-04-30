import { useEffect, useState } from 'react';

const ScrollToTop = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(globalThis.scrollY > 50);

    handleScroll();
    globalThis.addEventListener('scroll', handleScroll, { passive: true });
    return () => globalThis.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-8 left-8 z-30 transition duration-200 ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <button
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-[20px_20px_60px_#949494,-20px_-20px_60px_#ffffff] transition hover:bg-white"
        type="button"
        aria-label="scroll-to-top"
        onClick={() => globalThis.scrollTo({ top: 0 })}
      >
        <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
          <path d="m6 15 6-6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
};

export default ScrollToTop;
